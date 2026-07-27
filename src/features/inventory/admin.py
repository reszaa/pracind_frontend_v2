"""
inventory/admin.py
===================
Barang jadi & mutasi read-only (masuk cuma dari produksi, koreksi lewat
endpoint opname). Alat boleh dikelola langsung.
"""

from django.contrib import admin

from .models import Alat, BatchBarangJadi, MutasiBarangJadi


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BatchBarangJadi)
class BatchBarangJadiAdmin(ReadOnlyAdmin):
    list_display = ["produk", "no_batch", "pemilik", "qty_unit", "sesi_asal", "dibuat_pada"]
    search_fields = ["no_batch", "produk__nama"]
    list_filter = ["pemilik", "produk"]


@admin.register(MutasiBarangJadi)
class MutasiBarangJadiAdmin(ReadOnlyAdmin):
    list_display = ["dicatat_pada", "jenis", "produk", "no_batch", "akun", "qty_unit", "referensi"]
    search_fields = ["no_batch", "referensi", "produk__nama"]
    list_filter = ["jenis", "akun"]


@admin.register(Alat)
class AlatAdmin(admin.ModelAdmin):
    list_display = ["kode", "nama", "qty", "kondisi", "lokasi", "aktif"]
    search_fields = ["kode", "nama"]
    list_filter = ["kondisi", "aktif"]


from .models import IsiTanki, Tanki


class IsiTankiInline(admin.TabularInline):
    model = IsiTanki
    extra = 0
    readonly_fields = ["nama_bahan", "qty", "uom", "sesi_asal", "diperbarui_pada"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Tanki)
class TankiAdmin(admin.ModelAdmin):
    list_display = ["kode", "nama", "jenis", "kapasitas", "uom_kapasitas", "aktif"]
    list_filter = ["jenis", "aktif"]
    search_fields = ["kode", "nama"]
    inlines = [IsiTankiInline]


@admin.register(IsiTanki)
class IsiTankiAdmin(ReadOnlyAdmin):
    list_display = ["tanki", "nama_bahan", "qty", "uom", "sesi_asal", "diperbarui_pada"]
    list_filter = ["tanki"]
    search_fields = ["nama_bahan"]