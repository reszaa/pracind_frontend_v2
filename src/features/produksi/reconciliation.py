"""
produksi/reconciliation.py
===========================
Mesin perhitungan MURNI untuk SZA (Shared-Ownership Inventory & Production
System) — implementasi langsung dari spec Resza Malvin. Tidak menyentuh DB;
semua I/O ditangani produksi/services.py. Fungsi di sini dipakai tutup_sesi
(T_production) dan stock_raw.koreksi_batch (T_adjust).

Simbol (§2–§4 spec):
    C_im  = kepemilikan bahan m milik entitas i sebelum rekonsiliasi (= S_{i,m})
    T_m   = Σ_i C_im  (= Pool_m = F_m menurut invariant)
    β_m   = qty bahan m per 1 unit produk (BOM)
    Q     = total unit produk sesi ini
    Share_i, Alloc_i, Net_im, LRM — lihat §4, §6.2, §8.

Diverifikasi terhadap kasus §9 (4 entitas, 2 bahan): E2 dapat 1 unit residual,
Net pool m1→0 dan m2→5. Lihat test di bawah (jalankan file ini langsung).
"""

from decimal import Decimal, ROUND_FLOOR

# Mode bobot Share (§11). UNIT = model kanonis §4 (w_m = 1/k).
MODE_UNIT = "UNIT"     # setiap kategori bahan berbobot sama
MODE_HARGA = "HARGA"   # value-weighted: share = nilai disetor / nilai kolam (JV)


def _D(x):
    return x if isinstance(x, Decimal) else Decimal(str(x))


# ---------- kapasitas (§6.2 guard, §9.2) ----------

def kapasitas_maksimum(total_per_bahan, beta):
    """Q_max = min_m (T_m / β_m). Return (q_max, bottleneck, rincian)."""
    rincian, q_max, bottleneck = [], None, None
    for m, b in beta.items():
        b = _D(b)
        t = _D(total_per_bahan.get(m, 0))
        qm = (t / b) if b > 0 else Decimal("0")
        rincian.append({"nama_bahan": m, "beta": str(b), "total": str(t),
                        "q_max_bahan": str(qm.quantize(Decimal("0.01")))})
        if q_max is None or qm < q_max:
            q_max, bottleneck = qm, m
    return (q_max or Decimal("0")), bottleneck, rincian


# ---------- Share (§4 unit-equivalence, §11 generalized) ----------

def hitung_share(kontribusi, total, materials, *, mode=MODE_UNIT, harga=None):
    """
    kontribusi: {akun_id: {bahan: qty}}   (C_im)
    total:      {bahan: qty}              (T_m)
    materials:  daftar bahan formula      (kunci β)
    Return {akun_id: Decimal(share)}. Σ share == 1 (Teorema 1/8).
    """
    akun_ids = list(kontribusi.keys())
    share = {}

    if mode == MODE_UNIT:
        k = Decimal(len(materials))
        if k == 0:
            return {a: Decimal("0") for a in akun_ids}
        for a in akun_ids:
            s = Decimal("0")
            for m in materials:
                Tm = _D(total.get(m, 0))
                if Tm > 0:
                    s += _D(kontribusi[a].get(m, 0)) / Tm
            share[a] = s / k

    elif mode == MODE_HARGA:
        if not harga:
            raise ValueError("Mode HARGA butuh peta harga per bahan.")
        # Corollary 11.2.1: Share_i = Σ C_im·P_m / Σ T_m·P_m
        nilai_kolam = sum((_D(total.get(m, 0)) * _D(harga[m]) for m in materials
                           if harga.get(m) is not None), Decimal("0"))
        kurang = [m for m in materials if harga.get(m) is None]
        if kurang:
            raise ValueError(f"Harga belum diisi untuk: {', '.join(kurang)} — "
                             "mode HARGA tak bisa dihitung.")
        if nilai_kolam == 0:
            return {a: Decimal("0") for a in akun_ids}
        for a in akun_ids:
            nilai_i = sum((_D(kontribusi[a].get(m, 0)) * _D(harga[m]) for m in materials),
                          Decimal("0"))
            share[a] = nilai_i / nilai_kolam
    else:
        raise ValueError(f"Mode Share tidak dikenal: {mode}")

    return share


# ---------- LRM (§8, Teorema 5) ----------

def alokasi_unit(alloc_desimal, q_total):
    """Bulatkan Alloc pecahan ke unit utuh; sisa unit ke pemilik remainder
    terbesar sampai jumlahnya TEPAT Q (Σ Alloc_unit = Q)."""
    q_total = _D(q_total)
    floors = {a: v.to_integral_value(rounding=ROUND_FLOOR) for a, v in alloc_desimal.items()}
    sisa = int(q_total.to_integral_value(rounding=ROUND_FLOOR)) - int(sum(floors.values()))
    urutan = sorted(alloc_desimal, key=lambda a: alloc_desimal[a] - floors[a], reverse=True)
    hasil = dict(floors)
    for a in urutan[:max(sisa, 0)]:
        hasil[a] += 1
    # Q pecahan (jarang) -> ke remainder terbesar supaya total tepat Q
    pecahan = q_total - q_total.to_integral_value(rounding=ROUND_FLOOR)
    if pecahan > 0 and urutan:
        hasil[urutan[0]] += pecahan
    return hasil


# ---------- Net (§4, Teorema 4) ----------

def net_per_bahan(kontribusi, alloc_desimal, beta):
    """Net_im = C_im − Alloc_i(desimal)·β_m. Pakai Alloc DESIMAL supaya
    Σ_i Net_im = T_m − Q·β_m tepat (konservasi). Return {(akun, bahan): Net}."""
    hasil = {}
    for a, per_bahan in kontribusi.items():
        alloc = _D(alloc_desimal.get(a, 0))
        bahan_semua = set(per_bahan) | set(beta)
        for m in bahan_semua:
            c = _D(per_bahan.get(m, 0))
            pakai = alloc * _D(beta[m]) if m in beta else Decimal("0")
            if c == 0 and pakai == 0:
                continue
            hasil[(a, m)] = c - pakai
    return hasil


# ---------- rekonsiliasi lengkap (dipakai tutup_sesi) ----------

def rekonsiliasi_sesi(kontribusi, total, beta, Q, *, mode=MODE_UNIT, harga=None):
    """Satu panggilan: Share -> Alloc(desimal+unit) -> Net. Guard kapasitas
    Q·β_m ≤ T_m dilempar sebagai ValueError (Axiom 1 / Teorema 4)."""
    Q = _D(Q)
    materials = list(beta.keys())
    for m in materials:
        b, t = _D(beta[m]), _D(total.get(m, 0))
        if Q * b > t:
            raise ValueError(
                f"Kapasitas tidak cukup: '{m}' butuh {Q * b} tapi kepemilikan total "
                f"(pool) {t}. Q_max bahan ini = {(t / b).quantize(Decimal('0.01')) if b else 0}."
            )
    share = hitung_share(kontribusi, total, materials, mode=mode, harga=harga)
    alloc_des = {a: share[a] * Q for a in kontribusi}
    alloc_unit = alokasi_unit(alloc_des, Q)
    net = net_per_bahan(kontribusi, alloc_des, beta)
    return {"share": share, "alloc_desimal": alloc_des, "alloc_unit": alloc_unit, "net": net}


# ---------- T_adjust: sebar selisih opname (§6.4, Teorema 7) ----------

def sebar_selisih(saldo_per_akun, delta):
    """S_{i}' = S_i + Δ·(S_i / Pool). Return {akun: S_baru}. Δ dibagi
    proporsional ke pemilik → memulihkan Pool = F. Undefined saat Pool = 0."""
    delta = _D(delta)
    pool = sum((_D(v) for v in saldo_per_akun.values()), Decimal("0"))
    if pool == 0:
        raise ValueError("Pool kepemilikan = 0 — selisih tak bisa dibagi proporsional "
                         "(aturan T_adjust tak terdefinisi).")
    return {a: _D(v) + delta * (_D(v) / pool) for a, v in saldo_per_akun.items()}


# ---------- verifikasi §9 (jalankan: python reconciliation.py) ----------

if __name__ == "__main__":
    C = {1: {"m1": _D(20), "m2": _D(5)},
         2: {"m1": _D(10), "m2": _D(10)},
         3: {"m1": _D(15), "m2": _D(8)},
         4: {"m1": _D(5),  "m2": _D(7)}}
    T = {"m1": _D(50), "m2": _D(30)}
    beta = {"m1": _D(2), "m2": _D(1)}

    qmax, bottleneck, _ = kapasitas_maksimum(T, beta)
    assert qmax == _D(25) and bottleneck == "m1", (qmax, bottleneck)

    r = rekonsiliasi_sesi(C, T, beta, 25, mode=MODE_UNIT)
    au = r["alloc_unit"]
    assert (au[1], au[2], au[3], au[4]) == (7, 7, 7, 4), au       # E2 dapat residual
    net = r["net"]
    sum_m1 = sum(net[(a, "m1")] for a in C)
    sum_m2 = sum(net[(a, "m2")] for a in C)
    assert sum_m1 == 0, sum_m1                                    # pool m1 -> 0
    assert sum_m2 == 5, sum_m2                                    # pool m2 -> 5
    print("§9 OK: alloc_unit =", {a: au[a] for a in sorted(au)},
          "| Σnet m1 =", sum_m1, "| Σnet m2 =", sum_m2)