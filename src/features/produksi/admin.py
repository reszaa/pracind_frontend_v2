"""
produksi/admin.py
==================
Sesi + isinya read-only di admin (mutasi cuma lewat API/services). Produk
boleh dikelola; Formula cuma bisa DILIHAT — versi baru dibuat lewat API
supaya aturan "versi lama nonaktif otomatis, tidak pernah diedit" terjaga.
"""

from django.contrib import admin

from .models import (
    AlokasiProduk,
    FormulaProduk,
    HasilPackaging,
    KomposisiFormula,
    ProdukRingkas,
    RekonsiliasiBaris,
    SesiProduksi,
    SetoranBahan,
)


class ReadOnlyMixin:
    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProdukRingkas)
class ProdukAdmin(admin.ModelAdmin):
    list_display = ["kode", "nama", "kemasan", "uom", "stok_minimum", "aktif"]
    search_fields = ["kode", "nama"]
    list_filter = ["kemasan", "aktif"]


class KomposisiInline(ReadOnlyMixin, admin.TabularInline):
    model = KomposisiFormula
    extra = 0


@admin.register(FormulaProduk)
class FormulaAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ["produk", "versi", "aktif", "dibuat_pada"]
    list_filter = ["aktif", "produk"]
    inlines = [KomposisiInline]


class SetoranInline(ReadOnlyMixin, admin.TabularInline):
    model = SetoranBahan
    extra = 0


class PackagingInline(ReadOnlyMixin, admin.TabularInline):
    model = HasilPackaging
    extra = 0


class RekonsiliasiInline(ReadOnlyMixin, admin.TabularInline):
    model = RekonsiliasiBaris
    extra = 0


class AlokasiInline(ReadOnlyMixin, admin.TabularInline):
    model = AlokasiProduk
    extra = 0


@admin.register(SesiProduksi)
class SesiAdmin(ReadOnlyMixin, admin.ModelAdmin):
    list_display = ["nomor", "status", "dibuka_pada", "dibuka_oleh", "ditutup_pada"]
    list_filter = ["status"]
    search_fields = ["nomor"]
    inlines = [SetoranInline, PackagingInline, AlokasiInline, RekonsiliasiInline]