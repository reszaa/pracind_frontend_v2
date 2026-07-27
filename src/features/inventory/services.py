"""
inventory/services.py
======================
"""

from decimal import Decimal

from django.db import transaction

from .models import Alat, BatchBarangJadi, MutasiBarangJadi


@transaction.atomic
def terima_alokasi_produksi(*, sesi, akun, produk, qty_unit, user):
    """Dipanggil produksi.tutup_sesi() per akun sesuai hasil alokasi Share.
    Batch FG per (sesi, akun) — traceability level-sesi (§2.7): produk jatah
    akun ini berasal dari SEMUA batch input sesi tsb secara proporsional."""
    no_batch = f"FG-{sesi.nomor}-{akun.kode}"
    batch, _ = BatchBarangJadi.objects.select_for_update().get_or_create(
        produk=produk, pemilik=akun, no_batch=no_batch,
        defaults={"qty_unit": Decimal("0"), "sesi_asal": sesi},
    )
    batch.qty_unit += qty_unit
    batch.save(update_fields=["qty_unit", "diperbarui_pada"])

    MutasiBarangJadi.objects.create(
        jenis=MutasiBarangJadi.Jenis.MASUK_PRODUKSI,
        produk=produk, no_batch=no_batch, akun=akun,
        qty_unit=qty_unit, referensi=sesi.nomor,
        keterangan=f"Alokasi Share sesi {sesi.nomor}",
        dicatat_oleh=user,
    )
    return batch


@transaction.atomic
def kurangi_barang_jadi(*, produk, pemilik, qty_unit, jenis, referensi, user, keterangan=""):
    """Kurangi stok barang jadi milik SATU akun, FIFO dari batch tertua.
    TIDAK boleh minus — barang jadi kepemilikannya jelas, kalau stok akun
    itu kurang berarti memang tidak bisa (beda filosofi dengan stock_raw).
    Nanti dipanggil sales_order/distribusi."""
    qty_unit = Decimal(str(qty_unit))
    if qty_unit <= 0:
        raise ValueError("Qty harus lebih dari 0.")

    batches = list(
        BatchBarangJadi.objects.select_for_update()
        .filter(produk=produk, pemilik=pemilik, qty_unit__gt=0)
        .order_by("dibuat_pada")
    )
    total = sum((b.qty_unit for b in batches), Decimal("0"))
    if qty_unit > total:
        raise ValueError(
            f"Stok '{produk.nama}' milik {pemilik.kode} tidak cukup: "
            f"diminta {qty_unit}, tersedia {total}."
        )

    sisa = qty_unit
    for batch in batches:
        if sisa <= 0:
            break
        ambil = min(batch.qty_unit, sisa)
        batch.qty_unit -= ambil
        batch.save(update_fields=["qty_unit", "diperbarui_pada"])
        sisa -= ambil

        MutasiBarangJadi.objects.create(
            jenis=jenis, produk=produk, no_batch=batch.no_batch, akun=pemilik,
            qty_unit=-ambil, referensi=referensi, keterangan=keterangan,
            dicatat_oleh=user,
        )


@transaction.atomic
def koreksi_batch_fg(*, batch, qty_benar, alasan, user):
    """Stock opname barang jadi — pola sama dengan stock_raw.koreksi_batch."""
    qty_benar = Decimal(str(qty_benar))
    if qty_benar < 0:
        raise ValueError("Qty hasil opname tidak boleh minus.")
    if not (alasan or "").strip():
        raise ValueError("Alasan koreksi wajib diisi.")

    batch = BatchBarangJadi.objects.select_for_update().get(pk=batch.pk)
    selisih = qty_benar - batch.qty_unit
    if selisih == 0:
        raise ValueError("Qty sudah sama, tidak ada yang dikoreksi.")

    batch.qty_unit = qty_benar
    batch.save(update_fields=["qty_unit", "diperbarui_pada"])

    MutasiBarangJadi.objects.create(
        jenis=MutasiBarangJadi.Jenis.KOREKSI, produk=batch.produk,
        no_batch=batch.no_batch, akun=batch.pemilik, qty_unit=selisih,
        referensi="OPNAME", keterangan=alasan, dicatat_oleh=user,
    )
    return batch


# ---------- tanki (WIP layer) ----------

@transaction.atomic
def tambah_isi_tanki(*, tanki, nama_bahan, qty, uom, sesi=None):
    """Dipanggil produksi.tutup_sesi — sisa sesi masuk ke tanki."""
    from .models import IsiTanki

    qty = Decimal(str(qty))
    if qty <= 0:
        raise ValueError("Qty harus lebih dari 0.")
    isi, _ = IsiTanki.objects.select_for_update().get_or_create(
        tanki=tanki, nama_bahan=nama_bahan, defaults={"qty": Decimal("0"), "uom": uom}
    )
    isi.qty += qty
    if sesi is not None:
        isi.sesi_asal = sesi
    isi.save(update_fields=["qty", "sesi_asal", "diperbarui_pada"])
    return isi


@transaction.atomic
def ambil_dari_tanki(*, tanki, nama_bahan, qty):
    """Dipanggil produksi.catat_setoran (sumber dari_tanki). Fisik tanki
    berkurang; kepemilikan diurus pemanggil (SaldoEntitas)."""
    from .models import IsiTanki

    qty = Decimal(str(qty))
    if qty <= 0:
        raise ValueError("Qty harus lebih dari 0.")
    isi = (
        IsiTanki.objects.select_for_update()
        .filter(tanki=tanki, nama_bahan=nama_bahan)
        .first()
    )
    if isi is None or isi.qty < qty:
        punya = isi.qty if isi else Decimal("0")
        raise ValueError(
            f"Isi tanki {tanki.kode} untuk '{nama_bahan}' tidak cukup: "
            f"punya setara {punya}, diminta {qty}."
        )
    isi.qty -= qty
    isi.save(update_fields=["qty", "diperbarui_pada"])
    return isi.uom