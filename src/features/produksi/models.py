"""
produksi/models.py
===================
Implementasi PRD §5.5 — sesi produksi + rekonsiliasi rasio.

Keputusan batas sesi (Isu Terbuka #5): MANUAL buka/tutup. Satu sesi =
satu periode kerja yang dibuka staf produksi dan ditutup saat selesai;
rekonsiliasi dihitung & terkunci saat tutup. Selama sesi DIBUKA, kepemilikan
bahan di dalam proses TIDAK dilacak (bebas bercampur di tanki) — sistem cuma
mencatat setoran & hasil packaging.

Alur fisik (dicatat sebagai info, bukan tabel per-tahap):
    Raw ─▶ Gilingan ─▶ Tanki Giling ─▶ Mixing ─▶ Tanki Mixing ─▶ Packaging
    (packaging juga boleh langsung dari tanki giling)

⚠️ SEMENTARA: ProdukRingkas + FormulaProduk hidup di sini sampai master_stock
dibangun — pola yang sama dengan BahanBakuRingkas di stock_raw.
"""

from decimal import Decimal

from django.conf import settings
from django.db import models



class ProdukRingkas(models.Model):
    """Master produk jadi SEMENTARA (TODO: pindah ke master_stock).

    Satu varian kemasan = satu baris produk (COSCA GREEN Pail 25KG dan
    COSCA GREEN Dus 12KG adalah DUA produk) — karena formulanya beda dan
    stoknya dihitung terpisah (pola pivot per-kemasan dari sistem lama)."""

    kode = models.CharField(
        max_length=30, unique=True, null=True, blank=True,
        help_text="SKU internal, mis. PK00229. Boleh kosong dulu.",
    )
    nama = models.CharField(max_length=150)
    kemasan = models.CharField(
        max_length=50, default="-",
        help_text="Varian kemasan fisik: PAIL 25KG, DUS 12KG, GALON, PCS, dst.",
    )
    uom = models.CharField(max_length=20, default="UNIT", help_text="Satuan output packaging: UNIT, DUS, BOTOL, dst.")
    stok_minimum = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal("0"),
        help_text="Ambang alert restock barang jadi (per varian kemasan).",
    )
    aktif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Produk (sementara)"
        verbose_name_plural = "Produk (sementara)"
        ordering = ["nama", "kemasan"]
        constraints = [
            models.UniqueConstraint(fields=["nama", "kemasan"], name="produk_unik_per_kemasan"),
        ]

    def __str__(self):
        return f"{self.nama} [{self.kemasan}]"

    @property
    def formula_aktif(self):
        return self.formula.filter(aktif=True).order_by("-versi").first()


class FormulaProduk(models.Model):
    """Formula/BOM BERVERSI — jantung rekonsiliasi (§5.5). Rekonsiliasi
    mengunci versi yang AKTIF saat sesi ditutup; mengubah resep = buat versi
    baru + nonaktifkan lama, JANGAN edit versi lama (angka rekonsiliasi
    terdahulu menggantung ke sana)."""

    produk = models.ForeignKey(ProdukRingkas, on_delete=models.PROTECT, related_name="formula")
    versi = models.PositiveIntegerField(default=1)
    aktif = models.BooleanField(default=True)
    keterangan = models.CharField(max_length=255, blank=True)
    dibuat_pada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Formula Produk"
        verbose_name_plural = "Formula Produk"
        ordering = ["produk", "-versi"]
        constraints = [
            models.UniqueConstraint(fields=["produk", "versi"], name="formula_unik_per_versi"),
        ]

    def __str__(self):
        return f"{self.produk.nama} v{self.versi}{' (aktif)' if self.aktif else ''}"


class KomposisiFormula(models.Model):
    """Baris resep: 1 unit produk butuh qty_per_unit bahan ini.
    Contoh §5.5: Teh Kemas = 2.2 KG gula + 1 PCS teh celup."""

    formula = models.ForeignKey(FormulaProduk, on_delete=models.CASCADE, related_name="komposisi")
    nama_bahan = models.CharField(max_length=150, help_text="Harus sama persis dengan nama di stock_raw.")
    qty_per_unit = models.DecimalField(max_digits=12, decimal_places=4)
    uom = models.CharField(max_length=20, default="KG")

    class Meta:
        verbose_name = "Komposisi Formula"
        verbose_name_plural = "Komposisi Formula"
        constraints = [
            models.UniqueConstraint(fields=["formula", "nama_bahan"], name="komposisi_unik_per_bahan"),
            models.CheckConstraint(check=models.Q(qty_per_unit__gt=0), name="komposisi_qty_positif"),
        ]

    def __str__(self):
        return f"{self.formula} — {self.nama_bahan} {self.qty_per_unit} {self.uom}/unit"


class SesiProduksi(models.Model):
    class Status(models.TextChoices):
        DIBUKA = "DIBUKA", "Dibuka"
        DITUTUP = "DITUTUP", "Ditutup (rekonsiliasi terkunci)"

    nomor = models.CharField(max_length=30, unique=True)  # SESI-YYYYMM-NNN
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DIBUKA, db_index=True)
    catatan = models.TextField(blank=True)

    dibuka_oleh = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sesi_dibuka")
    dibuka_pada = models.DateTimeField(auto_now_add=True)
    ditutup_oleh = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sesi_ditutup", null=True, blank=True
    )
    ditutup_pada = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Sesi Produksi"
        verbose_name_plural = "Sesi Produksi"
        ordering = ["-dibuka_pada"]

    def __str__(self):
        return f"{self.nomor} ({self.get_status_display()})"


class SetoranBahan(models.Model):
    """Bahan masuk ke lantai produksi atas nama satu akun. Saat dicatat,
    stok raw akun itu langsung berkurang (fisik FIFO + saldo kepemilikan) —
    lihat services.catat_setoran."""

    sesi = models.ForeignKey(SesiProduksi, on_delete=models.PROTECT, related_name="setoran")
    akun = models.ForeignKey("entitas.Akun", on_delete=models.PROTECT, related_name="setoran_bahan")
    nama_bahan = models.CharField(max_length=150)
    qty = models.DecimalField(max_digits=15, decimal_places=2)
    uom = models.CharField(max_length=20, default="KG")
    dicatat_oleh = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="setoran_dicatat")
    dicatat_pada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Setoran Bahan"
        verbose_name_plural = "Setoran Bahan"
        ordering = ["-dicatat_pada"]
        constraints = [
            models.CheckConstraint(check=models.Q(qty__gt=0), name="setoran_qty_positif"),
        ]

    def __str__(self):
        return f"[{self.sesi.nomor}] {self.akun.kode} setor {self.qty} {self.uom} {self.nama_bahan}"


class HasilPackaging(models.Model):
    """Output packaging TOTAL (tanpa akun) — sejak model alokasi Share_i,
    kepemilikan TIDAK dicatat saat packaging, melainkan DIHITUNG saat sesi
    ditutup dari proporsi kontribusi bahan. Satu sesi = satu produk
    (ditegakkan services.catat_packaging)."""

    sesi = models.ForeignKey(SesiProduksi, on_delete=models.PROTECT, related_name="hasil_packaging")
    produk = models.ForeignKey(ProdukRingkas, on_delete=models.PROTECT, related_name="hasil_packaging")
    dari_tanki = models.ForeignKey(
        "inventory.Tanki", on_delete=models.PROTECT, null=True, blank=True,
        related_name="hasil_packaging",
        help_text="Tanki sumber (hanya jenis MIXING/BLENDING). Jejak fisik — "
                  "tidak memengaruhi perhitungan Share/Net.",
    )
    qty_unit = models.DecimalField(max_digits=15, decimal_places=2)
    no_batch_fg = models.CharField(max_length=50, db_index=True)
    dicatat_oleh = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="packaging_dicatat")
    dicatat_pada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Hasil Packaging"
        verbose_name_plural = "Hasil Packaging"
        ordering = ["-dicatat_pada"]
        constraints = [
            models.CheckConstraint(check=models.Q(qty_unit__gt=0), name="packaging_qty_positif"),
        ]

    def __str__(self):
        return f"[{self.sesi.nomor}] kemas {self.qty_unit} {self.produk.nama}"


class RekonsiliasiBaris(models.Model):
    """Hasil rekonsiliasi per (akun, bahan) — SNAPSHOT permanen, dihitung
    sekali saat sesi ditutup, tidak pernah diubah. Sisa boleh minus (hutang
    implisit, PRD §2 prinsip 4)."""

    sesi = models.ForeignKey(SesiProduksi, on_delete=models.PROTECT, related_name="rekonsiliasi")
    akun = models.ForeignKey("entitas.Akun", on_delete=models.PROTECT, related_name="rekonsiliasi_baris")
    nama_bahan = models.CharField(max_length=150)
    uom = models.CharField(max_length=20, default="KG")
    qty_setoran = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0"))
    qty_pemakaian = models.DecimalField(
        max_digits=15, decimal_places=4, default=Decimal("0"),
        help_text="Alloc_i (desimal) x beta_m — bahan yang terkandung di produk jatah entitas ini.",
    )
    qty_sisa = models.DecimalField(
        max_digits=15, decimal_places=4, default=Decimal("0"),
        help_text="Net_im = C_im - (Alloc_i x beta_m). Boleh minus.",
    )
    nilai_net = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True,
        help_text="V_im = Net_im x P_m (harga dari master bahan). Null kalau harga belum diisi.",
    )

    class Meta:
        verbose_name = "Rekonsiliasi (baris)"
        verbose_name_plural = "Rekonsiliasi (baris)"
        constraints = [
            models.UniqueConstraint(fields=["sesi", "akun", "nama_bahan"], name="rekonsiliasi_unik"),
        ]

    def __str__(self):
        return f"[{self.sesi.nomor}] {self.akun.kode} {self.nama_bahan}: sisa {self.qty_sisa}"


class AlokasiProduk(models.Model):
    """Hasil alokasi kepemilikan produk jadi per entitas — SNAPSHOT permanen
    (Tahap 3-4 model Share): share = (1/k) SUM(C_im/T_m), alloc bulat via
    Largest Remainder Method."""

    sesi = models.ForeignKey(SesiProduksi, on_delete=models.PROTECT, related_name="alokasi_produk")
    akun = models.ForeignKey("entitas.Akun", on_delete=models.PROTECT, related_name="alokasi_produk")
    produk = models.ForeignKey(ProdukRingkas, on_delete=models.PROTECT, related_name="alokasi_produk")
    share = models.DecimalField(max_digits=9, decimal_places=6, help_text="Porsi kepemilikan (0-1).")
    alloc_desimal = models.DecimalField(max_digits=15, decimal_places=4)
    alloc_unit = models.DecimalField(max_digits=15, decimal_places=2, help_text="Hasil pembulatan LRM.")

    class Meta:
        verbose_name = "Alokasi Produk"
        verbose_name_plural = "Alokasi Produk"
        constraints = [
            models.UniqueConstraint(fields=["sesi", "akun"], name="alokasi_unik_per_akun"),
        ]

    def __str__(self):
        return f"[{self.sesi.nomor}] {self.akun.kode}: {self.share:.2%} = {self.alloc_unit} unit"