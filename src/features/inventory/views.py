"""
inventory/views.py
===================
Baca terbuka untuk semua staf login. Koreksi opname & CRUD alat digate
GUDANG/Supervisor. Barang jadi TIDAK punya endpoint tulis langsung —
masuk cuma dari tutup sesi produksi, keluar nanti dari sales_order.
"""

from django.db.models import Sum

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from staff_user.models import ProfilStaff
from staff_user.permissions import IsAuthenticatedStaff, has_role

from . import services
from .models import Alat, BatchBarangJadi, MutasiBarangJadi
from .serializers import AlatSerializer, BatchBarangJadiSerializer, MutasiBarangJadiSerializer

ROLE_GUDANG = [IsAuthenticatedStaff, has_role(ProfilStaff.Role.GUDANG)]


class DashboardBarangJadiView(APIView):
    """GET /api/inventory/dashboard/ — per produk (varian kemasan): total,
    rincian per pemilik, dan status restock (AMAN/MENIPIS/HABIS) berdasarkan
    stok_minimum produk — logika badge yang sama dengan layar stok lama."""

    permission_classes = [IsAuthenticatedStaff]

    def get(self, request):
        agregat = (
            BatchBarangJadi.objects.values(
                "produk", "produk__kode", "produk__nama", "produk__kemasan",
                "produk__uom", "produk__stok_minimum", "pemilik__kode",
            )
            .annotate(total=Sum("qty_unit"))
            .order_by("produk__nama", "produk__kemasan", "pemilik__kode")
        )
        per_produk = {}
        for a in agregat:
            p = per_produk.setdefault(a["produk"], {
                "produk_id": a["produk"],
                "kode": a["produk__kode"],
                "nama": a["produk__nama"],
                "kemasan": a["produk__kemasan"],
                "uom": a["produk__uom"],
                "stok_minimum": a["produk__stok_minimum"],
                "total": 0,
                "per_pemilik": [],
            })
            p["per_pemilik"].append({"akun": a["pemilik__kode"], "qty": str(a["total"])})
            p["total"] += a["total"]

        hasil = []
        for p in per_produk.values():
            if p["total"] <= 0:
                p["status"] = "HABIS"
            elif p["total"] <= p["stok_minimum"]:
                p["status"] = "MENIPIS"
            else:
                p["status"] = "AMAN"
            p["total"] = str(p["total"])
            p["stok_minimum"] = str(p["stok_minimum"])
            hasil.append(p)
        return Response({"data": hasil})


class PivotBarangJadiView(APIView):
    """GET /api/inventory/pivot/?pemilik={akun_id}
    Rekap pivot ala sistem lama: baris = nama produk, kolom = kemasan,
    nilai = total qty. Kolom DINAMIS mengikuti kemasan yang benar-benar ada
    (bukan daftar hardcode + bucket 'KEMASAN_LAIN'), pemilik opsional
    (tanpa filter = gabungan semua entitas)."""

    permission_classes = [IsAuthenticatedStaff]

    def get(self, request):
        qs = BatchBarangJadi.objects.filter(qty_unit__gt=0)
        if request.query_params.get("pemilik"):
            qs = qs.filter(pemilik_id=request.query_params["pemilik"])

        agregat = (
            qs.values("produk__nama", "produk__kemasan")
            .annotate(total=Sum("qty_unit"))
            .order_by("produk__nama")
        )

        kolom_kemasan = sorted({a["produk__kemasan"] for a in agregat})
        baris = {}
        for a in agregat:
            b = baris.setdefault(a["produk__nama"], {"nama": a["produk__nama"], "kemasan": {}, "total": 0})
            b["kemasan"][a["produk__kemasan"]] = str(a["total"])
            b["total"] += a["total"]

        hasil = sorted(baris.values(), key=lambda x: x["nama"])
        for b in hasil:
            b["total"] = str(b["total"])
        return Response({"kolom_kemasan": kolom_kemasan, "data": hasil})


class BatchBarangJadiViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/inventory/barang-jadi/ — ?produk=&pemilik=&no_batch=&tersisa=true
    POST /api/inventory/barang-jadi/{id}/koreksi/ (GUDANG/Supervisor)"""

    queryset = BatchBarangJadi.objects.select_related("produk", "pemilik", "sesi_asal")
    serializer_class = BatchBarangJadiSerializer
    permission_classes = [IsAuthenticatedStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("produk"):
            qs = qs.filter(produk_id=p["produk"])
        if p.get("pemilik"):
            qs = qs.filter(pemilik_id=p["pemilik"])
        if p.get("no_batch"):
            qs = qs.filter(no_batch__icontains=p["no_batch"])
        if p.get("tersisa", "").lower() in ("1", "true", "ya"):
            qs = qs.filter(qty_unit__gt=0)
        return qs

    @action(detail=True, methods=["post"], permission_classes=ROLE_GUDANG)
    def koreksi(self, request, pk=None):
        try:
            batch = services.koreksi_batch_fg(
                batch=self.get_object(),
                qty_benar=request.data.get("qty_benar"),
                alasan=request.data.get("alasan", ""),
                user=request.user,
            )
        except (ValueError, TypeError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BatchBarangJadiSerializer(batch).data)


class MutasiBarangJadiViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/inventory/mutasi/ — ?produk=&akun=&jenis=&no_batch="""

    queryset = MutasiBarangJadi.objects.select_related("produk", "akun", "dicatat_oleh")
    serializer_class = MutasiBarangJadiSerializer
    permission_classes = [IsAuthenticatedStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("produk"):
            qs = qs.filter(produk_id=p["produk"])
        if p.get("akun"):
            qs = qs.filter(akun_id=p["akun"])
        if p.get("jenis"):
            qs = qs.filter(jenis=p["jenis"])
        if p.get("no_batch"):
            qs = qs.filter(no_batch=p["no_batch"])
        return qs


class AlatViewSet(viewsets.ModelViewSet):
    """CRUD tools — GUDANG/Supervisor. DELETE = soft (aktif=False)."""

    queryset = Alat.objects.all()
    serializer_class = AlatSerializer
    permission_classes = ROLE_GUDANG

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("aktif") is not None:
            qs = qs.filter(aktif=p["aktif"].lower() in ("1", "true", "ya"))
        if p.get("kondisi"):
            qs = qs.filter(kondisi=p["kondisi"])
        if p.get("q"):
            qs = qs.filter(nama__icontains=p["q"])
        return qs

    def destroy(self, request, *args, **kwargs):
        alat = self.get_object()
        alat.aktif = False
        alat.save(update_fields=["aktif"])
        return Response(AlatSerializer(alat).data)


class TankiViewSet(viewsets.ModelViewSet):
    """CRUD master tanki + lihat isinya (nested). Kelola = GUDANG/PRODUKSI/
    Supervisor; baca terbuka semua staf. Isi tanki TIDAK bisa diedit dari
    sini — hanya bergerak lewat sesi produksi (tutup sesi masuk, setoran
    dari_tanki keluar)."""

    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        from .models import Tanki

        return Tanki.objects.prefetch_related("isi")

    def get_serializer_class(self):
        from .serializers import TankiSerializer

        return TankiSerializer

    def get_permissions(self):
        from staff_user.permissions import IsAuthenticatedStaff, has_role

        if self.action in ("list", "retrieve"):
            return [IsAuthenticatedStaff()]
        return [
            IsAuthenticatedStaff(),
            has_role(ProfilStaff.Role.GUDANG, ProfilStaff.Role.PRODUKSI)(),
        ]


class IsiTankiViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/inventory/isi-tanki/ — ?tanki=&nama_bahan= (lapis WIP)."""

    permission_classes = [IsAuthenticatedStaff]

    def get_queryset(self):
        from .models import IsiTanki

        qs = IsiTanki.objects.select_related("tanki", "sesi_asal")
        p = self.request.query_params
        if p.get("tanki"):
            qs = qs.filter(tanki_id=p["tanki"])
        if p.get("nama_bahan"):
            qs = qs.filter(nama_bahan__icontains=p["nama_bahan"])
        return qs

    def get_serializer_class(self):
        from .serializers import IsiTankiSerializer

        return IsiTankiSerializer