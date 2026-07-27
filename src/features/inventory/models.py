"""
inventory/models.py
====================
Gudang barang jadi + tools (rename dari gudang/stock_gudang, PRD §3).

Beda fundamental dari stock_raw: SATU LAPIS. Barang jadi punya pemilik jelas
sejak lahir (HasilPackaging mencatat akun pengemasnya), tidak pernah
bercampur kepemilikan — jadi tidak ada saldo minus, tidak ada guard
total-vs-entitas. Batch langsung bawa kolom pemilik, qty >= 0 constraint DB.

Tools: inventori SEDERHANA (nama, qty, kondisi, lokasi). BUKAN manajemen
aset penuh (penyusutan/maintenance/nilai buku) — itu fase Asset, §19.
"""

from decimal import Decimal

from django.conf import settings
from django.db import models



class BatchBarangJadi(models.Model):
    """Stok produk jadi per batch, per pemilik. Masuk dari sesi produksi
    yang ditutup; keluar nanti lewat sales_order/distribusi."""

    produk = models.ForeignKey("produksi.ProdukRingkas", on_delete=models.PROTECT, related_name="batch_barang_jadi")
    pemilik = models.ForeignKey("entitas.Akun", on_delete=models.PROTECT, related_name="batch_barang_jadi")
    no_batch = models.CharField(max_length=50, db_index=True)
    qty_unit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    sesi_asal = models.ForeignKey(
        "produksi.SesiProduksi", on_delete=models.PROTECT, null=True, blank=True,
        related_name="batch_barang_jadi",
        help_text="Kosong kalau masuk bukan dari produksi (mis. koreksi opname).",
    )
    dibuat_pada = models.DateTimeField(auto_now_add=True)
    diperbarui_pada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Batch Barang Jadi"
        verbose_name_plural = "Batch Barang Jadi"
        ordering = ["produk", "dibuat_pada"]
        constraints = [
            models.CheckConstraint(check=models.Q(qty_unit__gte=0), name="fg_qty_tidak_minus"),
            models.UniqueConstraint(
                fields=["produk", "pemilik", "no_batch"], name="fg_unik_per_pemilik_batch"
            ),
        ]

    def __str__(self):
        return f"{self.produk.nama} [{self.no_batch}] {self.pemilik.kode}: {self.qty_unit}"


class MutasiBarangJadi(models.Model):
    """Ledger append-only barang jadi — pola sama dengan stock_raw.MutasiStok."""

    class Jenis(models.TextChoices):
        MASUK_PRODUKSI = "MASUK_PRODUKSI", "Masuk dari produksi"
        KELUAR_PENJUALAN = "KELUAR_PENJUALAN", "Keluar penjualan/distribusi"
        ALOKASI_RETAIL = "ALOKASI_RETAIL", "Keluar alokasi ke toko retail"
        RETUR_RETAIL = "RETUR_RETAIL", "Masuk retur dari toko retail"
        KOREKSI = "KOREKSI", "Koreksi / stock opname"

    jenis = models.CharField(max_length=25, choices=Jenis.choices, db_index=True)
    produk = models.ForeignKey("produksi.ProdukRingkas", on_delete=models.PROTECT, related_name="mutasi_barang_jadi")
    no_batch = models.CharField(max_length=50, blank=True)
    akun = models.ForeignKey("entitas.Akun", on_delete=models.PROTECT, related_name="mutasi_barang_jadi")
    qty_unit = models.DecimalField(max_digits=15, decimal_places=2, help_text="Positif masuk, negatif keluar.")
    referensi = models.CharField(max_length=100, blank=True)
    keterangan = models.CharField(max_length=255, blank=True)
    dicatat_oleh = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="mutasi_fg_dicatat")
    dicatat_pada = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Mutasi Barang Jadi"
        verbose_name_plural = "Mutasi Barang Jadi"
        ordering = ["-dicatat_pada", "-id"]

    def __str__(self):
        arah = "+" if self.qty_unit >= 0 else ""
        return f"[{self.get_jenis_display()}] {self.produk.nama} {arah}{self.qty_unit}"


class Alat(models.Model):
    """Tools & perlengkapan gudang/produksi — inventori sederhana."""

    class Kondisi(models.TextChoices):
        BAIK = "BAIK", "Baik"
        PERBAIKAN = "PERBAIKAN", "Sedang diperbaiki"
        RUSAK = "RUSAK", "Rusak"

    nama = models.CharField(max_length=150)
    kode = models.CharField(max_length=30, unique=True, help_text="Kode internal, mis. ALT-001.")
    qty = models.PositiveIntegerField(default=1)
    kondisi = models.CharField(max_length=15, choices=Kondisi.choices, default=Kondisi.BAIK)
    lokasi = models.CharField(max_length=100, blank=True, help_text="Mis. 'Ruang mixing', 'Rak B2'.")
    keterangan = models.TextField(blank=True)
    aktif = models.BooleanField(default=True, help_text="Nonaktifkan (jangan hapus) kalau sudah tidak dipakai.")
    dibuat_pada = models.DateTimeField(auto_now_add=True)
    diperbarui_pada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Alat"
        verbose_name_plural = "Alat"
        ordering = ["nama"]

    def __str__(self):
        return f"{self.kode} — {self.nama} ({self.get_kondisi_display()})"


class Tanki(models.Model):
    """Master tanki produksi — class tersendiri, terpisah dari stok barang
    jadi (BatchBarangJadi) dan tools (Alat). WIP layer §5.5."""

    class Jenis(models.TextChoices):
        PENAMPUNG_GILING = "PENAMPUNG_GILING", "Tanki penampungan hasil giling"
        MIXING = "MIXING", "Tanki hasil mixing"
        BLENDING = "BLENDING", "Tanki hasil blending"
        SIMPAN = "SIMPAN", "Tanki simpan lainnya"

    # Jenis yang isinya siap dikemas — sumber sah packaging.
    JENIS_SUMBER_PACKAGING = ("MIXING", "BLENDING")

    kode = models.CharField(max_length=20, unique=True, help_text="Mis. TK-01.")
    nama = models.CharField(max_length=100)
    jenis = models.CharField(max_length=20, choices=Jenis.choices)
    kapasitas = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="Kapasitas maksimum (opsional, satuan uom_kapasitas).",
    )
    uom_kapasitas = models.CharField(max_length=20, default="KG")
    keterangan = models.TextField(blank=True)
    aktif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tanki"
        verbose_name_plural = "Tanki"
        ordering = ["kode"]

    def __str__(self):
        return f"{self.kode} — {self.nama} ({self.get_jenis_display()})"


class IsiTanki(models.Model):
    """Isi tanki dalam SETARA-BAHAN — lapis FISIK murni, SENGAJA tanpa kolom
    pemilik: isi tanki adalah campuran milik bersama (prinsip rekonsiliasi
    rasio §5.5), kepemilikannya hanya hidup di stock_raw.SaldoEntitas.

    Fisiknya satu adonan; baris per nama_bahan di sini adalah pembukuan
    'setara berapa bahan mentah' supaya invariant tetap bisa dijaga:

        Σ SaldoEntitas(bahan) == Σ BatchGudang(bahan) + Σ IsiTanki(bahan)

    Masuk: sisa saat sesi produksi ditutup (tutup_sesi dengan tanki_sisa).
    Keluar: setoran sesi berikutnya dengan sumber dari_tanki.
    """

    tanki = models.ForeignKey(Tanki, on_delete=models.PROTECT, related_name="isi")
    nama_bahan = models.CharField(max_length=150, db_index=True)
    qty = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    uom = models.CharField(max_length=20, default="KG")
    sesi_asal = models.ForeignKey(
        "produksi.SesiProduksi", on_delete=models.PROTECT, null=True, blank=True,
        related_name="isi_tanki", help_text="Sesi terakhir yang menaruh sisa ke sini.",
    )
    diperbarui_pada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Isi Tanki"
        verbose_name_plural = "Isi Tanki"
        ordering = ["tanki", "nama_bahan"]
        constraints = [
            models.CheckConstraint(check=models.Q(qty__gte=0), name="isi_tanki_tidak_minus"),
            models.UniqueConstraint(fields=["tanki", "nama_bahan"], name="isi_tanki_unik_per_bahan"),
        ]

    def __str__(self):
        return f"{self.tanki.kode} — setara {self.qty} {self.uom} {self.nama_bahan}"