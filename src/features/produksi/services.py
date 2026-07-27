"""
produksi/services.py
=====================
Mesin alokasi kepemilikan model Share (19 Jul):

    Share_i  = (1/k) * SUM_m ( C_im / T_m )        — porsi kepemilikan
    Alloc_i  = Share_i * Q  -> dibulatkan LRM       — jatah produk jadi
    Net_im   = C_im - (Alloc_i_desimal * beta_m)    — sisa/hutang bahan (boleh minus)
    V_im     = Net_im * P_m                          — valuasi rupiah (audit)

Kepemilikan produk TIDAK lagi dicatat saat packaging — dihitung saat tutup
sesi dari proporsi kontribusi bahan. Satu sesi = SATU produk (β tunggal).
Net memakai Alloc DESIMAL supaya konservasi material tepat (Σ Net_im = R_m);
pembulatan LRM hanya untuk unit fisik produk.
"""

import datetime
from collections import defaultdict
from decimal import Decimal, ROUND_FLOOR

from django.db import IntegrityError, transaction
from django.utils import timezone

from stock_raw.models import BahanBakuRingkas, BatchGudang, MutasiStok, SaldoEntitas
from stock_raw.services import kurangi_stok

from .models import (
    AlokasiProduk,
    HasilPackaging,
    ProdukRingkas,
    RekonsiliasiBaris,
    SesiProduksi,
    SetoranBahan,
)


# ---------- sesi ----------

def _nomor_sesi_berikutnya():
    prefix = f"SESI-{datetime.date.today():%Y%m}-"
    jumlah = SesiProduksi.objects.filter(nomor__startswith=prefix).count()
    return f"{prefix}{jumlah + 1:03d}"


@transaction.atomic
def buka_sesi(user, catatan=""):
    for _ in range(5):
        try:
            return SesiProduksi.objects.create(
                nomor=_nomor_sesi_berikutnya(), dibuka_oleh=user, catatan=catatan
            )
        except IntegrityError:
            continue
    raise ValueError("Gagal membuat nomor sesi unik, coba lagi.")


def _sesi_terkunci_dibuka(sesi):
    sesi = SesiProduksi.objects.select_for_update().get(pk=sesi.pk)
    if sesi.status != SesiProduksi.Status.DIBUKA:
        raise ValueError(f"Sesi {sesi.nomor} sudah ditutup — tidak bisa diubah lagi.")
    return sesi


# ---------- pencatatan selama sesi ----------

@transaction.atomic
def catat_setoran(sesi, *, akun, nama_bahan, qty, user, dari_tanki=None):
    """C_im bertambah. Sumber fisik: gudang raw (default, FIFO) atau isi
    tanki sisa sesi sebelumnya (dari_tanki). Dua-duanya menurunkan saldo
    kepemilikan akun; saldo boleh minus, fisik tidak."""
    sesi = _sesi_terkunci_dibuka(sesi)
    qty = Decimal(str(qty))

    if dari_tanki is not None:
        from inventory.models import Tanki
        from inventory.services import ambil_dari_tanki

        tanki = dari_tanki if isinstance(dari_tanki, Tanki) else Tanki.objects.get(pk=dari_tanki)
        uom = ambil_dari_tanki(tanki=tanki, nama_bahan=nama_bahan, qty=qty)
        if qty <= 0:
            raise ValueError("Qty harus lebih dari 0.")
        saldo, _ = SaldoEntitas.objects.select_for_update().get_or_create(
            akun=akun, nama_bahan=nama_bahan, defaults={"uom": uom}
        )
        saldo.qty -= qty
        saldo.save(update_fields=["qty", "diperbarui_pada"])
        MutasiStok.objects.create(
            jenis=MutasiStok.Jenis.PEMAKAIAN_PRODUKSI, nama_bahan=nama_bahan,
            no_batch=f"TANKI-{tanki.kode}", akun=akun, qty=-qty, uom=uom,
            referensi=sesi.nomor, dicatat_oleh=user,
            keterangan=f"Setoran dari tanki {tanki.kode} ke sesi {sesi.nomor}",
        )
        from stock_raw.services import status_bahan

        status_alert = status_bahan(nama_bahan)
    else:
        status_alert = kurangi_stok(
            akun=akun, nama_bahan=nama_bahan, qty=qty,
            jenis=MutasiStok.Jenis.PEMAKAIAN_PRODUKSI,
            referensi=sesi.nomor, user=user,
            keterangan=f"Setoran ke sesi {sesi.nomor}",
        )

    setoran = SetoranBahan.objects.create(
        sesi=sesi, akun=akun, nama_bahan=nama_bahan, qty=qty, dicatat_oleh=user,
    )
    return setoran, status_alert


def _generate_no_batch_fg(produk):
    hari = datetime.date.today().strftime("%Y%m%d")
    prefix = f"FG-{hari}-"
    jumlah = HasilPackaging.objects.filter(no_batch_fg__startswith=prefix).count()
    return f"{prefix}{jumlah + 1:03d}"


@transaction.atomic
def catat_packaging(sesi, *, produk, qty_unit, user, no_batch_fg="", dari_tanki=None):
    """Q bertambah — TANPA akun (kepemilikan dihitung nanti).
    Satu sesi dikunci ke SATU produk: baris pertama menentukan.
    dari_tanki (opsional): jejak tanki sumber — wajib jenis MIXING/BLENDING."""
    sesi = _sesi_terkunci_dibuka(sesi)
    if isinstance(produk, int):
        produk = ProdukRingkas.objects.get(pk=produk)

    tanki = None
    if dari_tanki is not None:
        from inventory.models import Tanki

        tanki = dari_tanki if isinstance(dari_tanki, Tanki) else Tanki.objects.get(pk=dari_tanki)
        if tanki.jenis not in Tanki.JENIS_SUMBER_PACKAGING:
            raise ValueError(
                f"Tanki {tanki.kode} berjenis {tanki.get_jenis_display()} — packaging hanya "
                "boleh bersumber dari tanki hasil MIXING atau BLENDING."
            )
    if produk.formula_aktif is None:
        raise ValueError(f"Produk '{produk}' belum punya formula aktif.")

    sudah_ada = sesi.hasil_packaging.select_related("produk").first()
    if sudah_ada and sudah_ada.produk_id != produk.pk:
        raise ValueError(
            f"Sesi ini sudah terkunci ke produk '{sudah_ada.produk}' — satu sesi satu produk "
            "(model Share memakai satu formula). Buka sesi baru untuk produk lain."
        )

    qty_unit = Decimal(str(qty_unit))
    if qty_unit <= 0:
        raise ValueError("Qty unit harus lebih dari 0.")

    return HasilPackaging.objects.create(
        sesi=sesi, produk=produk, qty_unit=qty_unit, dari_tanki=tanki,
        no_batch_fg=(no_batch_fg or "").strip() or _generate_no_batch_fg(produk),
        dicatat_oleh=user,
    )


# ---------- kapasitas (pra-produksi) ----------

def hitung_kapasitas(sesi, produk):
    """Q_max = min_m ( T_m / beta_m ) dari setoran sesi ini."""
    if isinstance(produk, int):
        produk = ProdukRingkas.objects.get(pk=produk)
    formula = produk.formula_aktif
    if formula is None:
        raise ValueError(f"Produk '{produk}' belum punya formula aktif.")

    T = defaultdict(Decimal)
    for s in sesi.setoran.all():
        T[s.nama_bahan] += s.qty

    rincian, q_max = [], None
    for komp in formula.komposisi.all():
        t = T.get(komp.nama_bahan, Decimal("0"))
        qm = (t / komp.qty_per_unit) if komp.qty_per_unit else Decimal("0")
        rincian.append({
            "nama_bahan": komp.nama_bahan, "beta": str(komp.qty_per_unit),
            "total_setoran": str(t), "q_max_bahan": str(qm.quantize(Decimal("0.01"))),
        })
        q_max = qm if q_max is None else min(q_max, qm)

    return {
        "produk": str(produk),
        "q_max": str((q_max or Decimal("0")).quantize(Decimal("0.01"))),
        "bottleneck": min(rincian, key=lambda r: Decimal(r["q_max_bahan"]))["nama_bahan"] if rincian else None,
        "rincian": rincian,
    }


# ---------- tutup sesi = alokasi Share + rekonsiliasi Net ----------

def _largest_remainder(alloc_desimal, q_total):
    """alloc_desimal: {akun_id: Decimal}. Bulatkan ke unit utuh, sisa unit
    dibagikan satu-satu ke pecahan terbesar sampai jumlahnya tepat Q."""
    floors = {a: v.to_integral_value(rounding=ROUND_FLOOR) for a, v in alloc_desimal.items()}
    sisa_unit = int(q_total.to_integral_value(rounding=ROUND_FLOOR)) - int(sum(floors.values()))
    urutan = sorted(alloc_desimal, key=lambda a: alloc_desimal[a] - floors[a], reverse=True)
    hasil = dict(floors)
    for a in urutan[:max(sisa_unit, 0)]:
        hasil[a] += 1
    # kalau Q punya pecahan (jarang — packaging biasanya bulat), pecahannya
    # ikut ke pemilik pecahan terbesar supaya total tepat Q
    pecahan_q = q_total - q_total.to_integral_value(rounding=ROUND_FLOOR)
    if pecahan_q > 0 and urutan:
        hasil[urutan[0]] += pecahan_q
    return hasil


@transaction.atomic
def tutup_sesi(sesi, user, tanki_sisa=None):
    sesi = _sesi_terkunci_dibuka(sesi)

    setoran_semua = list(sesi.setoran.select_related("akun"))
    hasil_semua = list(sesi.hasil_packaging.select_related("produk"))

    # ---- agregasi C_im, T_m ----
    C = defaultdict(Decimal)      # (akun_id, bahan) -> qty
    T = defaultdict(Decimal)      # bahan -> total
    uom_map, akun_ids = {}, set()
    for s in setoran_semua:
        C[(s.akun_id, s.nama_bahan)] += s.qty
        T[s.nama_bahan] += s.qty
        uom_map[s.nama_bahan] = s.uom
        akun_ids.add(s.akun_id)

    alloc_desimal, alloc_unit, beta = {}, {}, {}
    Q = Decimal("0")

    if hasil_semua:
        produk = hasil_semua[0].produk          # satu produk per sesi (dijaga catat_packaging)
        Q = sum((h.qty_unit for h in hasil_semua), Decimal("0"))
        formula = produk.formula_aktif
        if formula is None:
            raise ValueError(f"Produk '{produk}' tidak punya formula aktif.")
        komposisi = list(formula.komposisi.all())
        beta = {k.nama_bahan: k.qty_per_unit for k in komposisi}
        for k_ in komposisi:
            uom_map.setdefault(k_.nama_bahan, k_.uom)

        # ---- guard kapasitas: Q <= min(T_m / beta_m) ----
        for m, b in beta.items():
            t = T.get(m, Decimal("0"))
            if Q * b > t:
                raise ValueError(
                    f"Kapasitas tidak cukup: '{m}' butuh {Q * b} tapi total setoran {t}. "
                    f"Q_max bahan ini = {(t / b).quantize(Decimal('0.01'))}. Koreksi angka "
                    "packaging/setoran — produksi tidak bisa memakai bahan yang tidak disetor."
                )

        # ---- Share_i = (1/k) * SUM_m C_im/T_m ----
        k = Decimal(len(beta))
        for akun_id in akun_ids:
            share = sum(
                (C.get((akun_id, m), Decimal("0")) / T[m] for m in beta if T[m] > 0),
                Decimal("0"),
            ) / k
            alloc_desimal[akun_id] = (share * Q)
            AlokasiProduk.objects.create(
                sesi=sesi, akun_id=akun_id, produk=produk,
                share=share.quantize(Decimal("0.000001")),
                alloc_desimal=alloc_desimal[akun_id].quantize(Decimal("0.0001")),
                alloc_unit=Decimal("0"),  # diisi setelah LRM
            )
        alloc_unit = _largest_remainder(alloc_desimal, Q)
        for akun_id, unit in alloc_unit.items():
            AlokasiProduk.objects.filter(sesi=sesi, akun_id=akun_id).update(alloc_unit=unit)

    # ---- Net_im per (akun, bahan) + kembalikan ke saldo ----
    harga_map = dict(
        BahanBakuRingkas.objects.filter(nama__in=uom_map.keys()).values_list("nama", "harga_per_uom")
    )
    semua_bahan = set(T) | set(beta)
    sisa_fisik = defaultdict(Decimal)

    for akun_id in sorted(akun_ids):
        for bahan in sorted(semua_bahan):
            c = C.get((akun_id, bahan), Decimal("0"))
            pakai = (alloc_desimal.get(akun_id, Decimal("0")) * beta[bahan]) if bahan in beta else Decimal("0")
            if c == 0 and pakai == 0:
                continue
            net = c - pakai
            harga = harga_map.get(bahan)
            RekonsiliasiBaris.objects.create(
                sesi=sesi, akun_id=akun_id, nama_bahan=bahan, uom=uom_map.get(bahan, "KG"),
                qty_setoran=c, qty_pemakaian=pakai.quantize(Decimal("0.0001")),
                qty_sisa=net.quantize(Decimal("0.0001")),
                nilai_net=(net * harga).quantize(Decimal("0.01")) if harga is not None else None,
            )
            if net != 0:
                saldo, _ = SaldoEntitas.objects.select_for_update().get_or_create(
                    akun_id=akun_id, nama_bahan=bahan, defaults={"uom": uom_map.get(bahan, "KG")}
                )
                saldo.qty += net
                saldo.save(update_fields=["qty", "diperbarui_pada"])
                MutasiStok.objects.create(
                    jenis=MutasiStok.Jenis.REKONSILIASI, nama_bahan=bahan,
                    akun_id=akun_id, qty=net, uom=uom_map.get(bahan, "KG"),
                    referensi=sesi.nomor, dicatat_oleh=user,
                    keterangan=f"Net rekonsiliasi Share sesi {sesi.nomor}",
                )
            sisa_fisik[bahan] += net

    # ---- sisa fisik (R_m) -> tanki atau batch SISA ----
    if tanki_sisa is not None:
        from inventory.models import Tanki
        from inventory.services import tambah_isi_tanki

        tanki = tanki_sisa if isinstance(tanki_sisa, Tanki) else Tanki.objects.get(pk=tanki_sisa)
        for bahan, total in sisa_fisik.items():
            if total > 0:
                tambah_isi_tanki(tanki=tanki, nama_bahan=bahan, qty=total,
                                 uom=uom_map.get(bahan, "KG"), sesi=sesi)
    else:
        for bahan, total in sisa_fisik.items():
            if total > 0:
                BatchGudang.objects.create(
                    nama_bahan=bahan, no_batch=f"SISA-{sesi.nomor}", qty=total,
                    uom=uom_map.get(bahan, "KG"), diterima_oleh=user,
                )

    # ---- serahkan produk jadi sesuai alokasi ----
    if hasil_semua:
        from entitas.models import Akun
        from inventory.services import terima_alokasi_produksi

        for akun_id, unit in alloc_unit.items():
            if unit > 0:
                terima_alokasi_produksi(
                    sesi=sesi, akun=Akun.objects.get(pk=akun_id),
                    produk=produk, qty_unit=unit, user=user,
                )

    sesi.status = SesiProduksi.Status.DITUTUP
    sesi.ditutup_oleh = user
    sesi.ditutup_pada = timezone.now()
    sesi.save(update_fields=["status", "ditutup_oleh", "ditutup_pada"])
    return sesi