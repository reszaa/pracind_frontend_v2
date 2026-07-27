"""
produksi/urls.py
=================
Daftarkan di pracindodb/urls.py (BELUM terdaftar — ini yang membuat seluruh
endpoint produksi 404 walau view & service-nya sudah lengkap):

    path("api/produksi/", include("produksi.urls")),

Endpoint yang dihasilkan:
    # master (sementara, sampai master_stock)
    *    /api/produksi/produk/                CRUD produk (GET/POST/PATCH)  role PRODUKSI
    *    /api/produksi/formula/               list + POST versi baru        role PRODUKSI
                                              (POST menonaktifkan versi lama otomatis)

    # sesi = jantung alur kerja
    GET  /api/produksi/sesi/                  list (?status=DIBUKA|DITUTUP)
    GET  /api/produksi/sesi/{id}/             detail: setoran + hasil_packaging +
                                              alokasi_produk + rekonsiliasi
    POST /api/produksi/sesi/buka/             {catatan?}                    role PRODUKSI
    POST /api/produksi/sesi/{id}/setor/       {akun, nama_bahan, qty, dari_tanki?}
    POST /api/produksi/sesi/{id}/packaging/   {produk, qty_unit, no_batch_fg?, dari_tanki?}
    GET  /api/produksi/sesi/{id}/kapasitas/   ?produk=  -> Q_max = min(T_m/beta_m)
    POST /api/produksi/sesi/{id}/tutup/       {tanki_sisa?}  -> rekonsiliasi Share + kunci

CATATAN: `produksi/tanki/` yang dipanggil FE TIDAK ada di app ini — tangki
tinggal di app `inventory` (routed di /api/inventory/). Monitor tangki harus
diarahkan ke sana, bukan ke produksi.
"""

from rest_framework.routers import DefaultRouter

from .views import (
    FormulaProdukViewSet,
    ProdukRingkasViewSet,
    SesiProduksiViewSet,
)

router = DefaultRouter()
router.register("produk", ProdukRingkasViewSet, basename="produk-ringkas")
router.register("formula", FormulaProdukViewSet, basename="formula-produk")
router.register("sesi", SesiProduksiViewSet, basename="sesi-produksi")

urlpatterns = router.urls