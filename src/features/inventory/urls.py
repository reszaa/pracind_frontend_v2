"""
inventory/urls.py
==================
Daftarkan: path("api/inventory/", include("inventory.urls"))

Endpoint:
    GET  /api/inventory/dashboard/               per varian: total, per pemilik, status restock
    GET  /api/inventory/pivot/                   pivot nama x kemasan (?pemilik=)
    GET  /api/inventory/barang-jadi/             batch FG (?produk=&pemilik=&tersisa=true)
    POST /api/inventory/barang-jadi/{id}/koreksi/ opname (GUDANG/Supervisor)
    GET  /api/inventory/mutasi/                  ledger barang jadi
    *    /api/inventory/alat/                    CRUD tools (GUDANG/Supervisor)
    *    /api/inventory/tanki/                   master tanki + isinya (GUDANG/PRODUKSI)
    GET  /api/inventory/isi-tanki/               lapis WIP setara-bahan (?tanki=&nama_bahan=)
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AlatViewSet,
    BatchBarangJadiViewSet,
    DashboardBarangJadiView,
    IsiTankiViewSet,
    MutasiBarangJadiViewSet,
    PivotBarangJadiView,
    TankiViewSet,
)

router = DefaultRouter()
router.register("barang-jadi", BatchBarangJadiViewSet, basename="barang-jadi")
router.register("mutasi", MutasiBarangJadiViewSet, basename="mutasi-fg")
router.register("alat", AlatViewSet, basename="alat")
router.register("tanki", TankiViewSet, basename="tanki")
router.register("isi-tanki", IsiTankiViewSet, basename="isi-tanki")

urlpatterns = [
    path("dashboard/", DashboardBarangJadiView.as_view(), name="dashboard-fg"),
    path("pivot/", PivotBarangJadiView.as_view(), name="pivot-fg"),
] + router.urls