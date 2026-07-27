"""
produksi/views.py
==================
Semua aksi produksi digate role PRODUKSI (Supervisor otomatis lolos lewat
has_role). Baca terbuka untuk semua staf login — angka produksi dibutuhkan
gudang & sales juga.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from entitas.models import Akun
from staff_user.models import ProfilStaff
from staff_user.permissions import IsAuthenticatedStaff, has_role

from . import services
from .models import ProdukRingkas, SesiProduksi
from .serializers import (
    FormulaProdukSerializer,
    ProdukRingkasSerializer,
    SesiProduksiSerializer,
)

ROLE_PRODUKSI = [IsAuthenticatedStaff, has_role(ProfilStaff.Role.PRODUKSI)]


class ProdukRingkasViewSet(viewsets.ModelViewSet):
    """CRUD produk (sementara, sampai master_stock). Role PRODUKSI/Supervisor."""

    queryset = ProdukRingkas.objects.prefetch_related("formula__komposisi")
    serializer_class = ProdukRingkasSerializer
    permission_classes = ROLE_PRODUKSI
    http_method_names = ["get", "post", "patch", "head", "options"]


class FormulaProdukViewSet(viewsets.ModelViewSet):
    """POST = buat VERSI BARU (versi lama auto-nonaktif). Tidak ada edit/hapus
    — formula lama dirujuk rekonsiliasi terdahulu."""

    queryset = FormulaProdukSerializer.Meta.model.objects.select_related("produk").prefetch_related("komposisi")
    serializer_class = FormulaProdukSerializer
    permission_classes = ROLE_PRODUKSI
    http_method_names = ["get", "post", "head", "options"]


class SesiProduksiViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/produksi/sesi/                     list (?status=DIBUKA)
    GET  /api/produksi/sesi/{id}/                detail lengkap (setoran+hasil+rekonsiliasi)
    POST /api/produksi/sesi/buka/                {catatan?}
    POST /api/produksi/sesi/{id}/setor/          {akun, nama_bahan, qty}
    POST /api/produksi/sesi/{id}/packaging/      {akun, produk, qty_unit, no_batch_fg?}
    POST /api/produksi/sesi/{id}/tutup/          rekonsiliasi + kunci
    """

    queryset = SesiProduksi.objects.prefetch_related(
        "setoran__akun", "hasil_packaging__akun", "hasil_packaging__produk", "rekonsiliasi__akun"
    )
    serializer_class = SesiProduksiSerializer
    permission_classes = [IsAuthenticatedStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        return qs

    @action(detail=False, methods=["post"], permission_classes=ROLE_PRODUKSI)
    def buka(self, request):
        sesi = services.buka_sesi(request.user, catatan=request.data.get("catatan", ""))
        return Response(SesiProduksiSerializer(sesi).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=ROLE_PRODUKSI)
    def setor(self, request, pk=None):
        try:
            akun = Akun.objects.get(pk=request.data.get("akun"))
            _, status_alert = services.catat_setoran(
                self.get_object(), akun=akun,
                nama_bahan=request.data.get("nama_bahan", "").strip(),
                qty=request.data.get("qty"), user=request.user,
                dari_tanki=request.data.get("dari_tanki"),
            )
        except Akun.DoesNotExist:
            return Response({"detail": "Akun tidak ditemukan."}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        data = SesiProduksiSerializer(self.get_object()).data
        data["alert_stok"] = {"status": status_alert[0], "total_fisik": str(status_alert[1])}
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=ROLE_PRODUKSI)
    def packaging(self, request, pk=None):
        """TANPA akun — kepemilikan dihitung otomatis (Share) saat tutup."""
        try:
            services.catat_packaging(
                self.get_object(),
                produk=int(request.data.get("produk")),
                qty_unit=request.data.get("qty_unit"), user=request.user,
                no_batch_fg=request.data.get("no_batch_fg", ""),
                dari_tanki=request.data.get("dari_tanki"),
            )
        except ProdukRingkas.DoesNotExist:
            return Response({"detail": "Produk tidak ditemukan."}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SesiProduksiSerializer(self.get_object()).data)

    @action(detail=True, methods=["get"])
    def kapasitas(self, request, pk=None):
        """GET ?produk= — Q_max = min(T_m/beta_m) dari setoran sesi ini."""
        try:
            hasil = services.hitung_kapasitas(self.get_object(), int(request.query_params.get("produk")))
        except (ProdukRingkas.DoesNotExist, TypeError, ValueError) as e:
            return Response({"detail": f"Parameter produk wajib & valid. {e}"},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(hasil)

    @action(detail=True, methods=["post"], permission_classes=ROLE_PRODUKSI)
    def tutup(self, request, pk=None):
        try:
            sesi = services.tutup_sesi(
                self.get_object(), request.user,
                tanki_sisa=request.data.get("tanki_sisa"),
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SesiProduksiSerializer(sesi).data)