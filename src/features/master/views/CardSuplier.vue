<!--
  src/features/master/views/CardSuplier.vue
  ==========================================
  Blueprint detail suplier — PRESENTATIONAL (props masuk -> render).
  Tidak fetch apa pun; induk (Suplier.vue) yang menghitung mutasi & hutang
  lalu mengoper via props.

  Restyle: border tebal-hitam -> panel token --garis lembut, senada dengan
  PaymentSuplier.vue / PurchaseOrderDetail.vue. Field mengikuti data asli.
-->
<template>
    <div class="blueprint">
        <!-- ── Kiri: 3 kartu bertumpuk ──────────────────────── -->
        <div class="kolom">
            <section class="kartu">
                <span class="eyebrow">Nama suplier</span>
                <p class="kartu__nama">{{ suplier.nama }}</p>
                <p class="kartu__meta">
                    <span class="mono">{{ suplier.kode }}</span>
                    <span v-if="suplier.kategori" class="chip">{{ labelKategori(suplier.kategori) }}</span>
                </p>
            </section>

            <section class="kartu kartu--hutang">
                <span class="eyebrow">Total hutang</span>
                <div v-if="loading" class="kartu__memuat">Menghitung…</div>
                <template v-else>
                    <p class="kartu__angka" :class="{ 'kartu__angka--tagih': totalHutang > 0 }">
                        {{ rp(totalHutang) }}
                    </p>
                    <span class="kartu__kaki" :class="{ 'kartu__kaki--tagih': totalHutang > 0 }">
                        {{ totalHutang > 0 ? 'Perlu dibayar ke supplier' : 'Tidak ada hutang berjalan' }}
                    </span>
                </template>
            </section>

            <section class="kartu kartu--kontak">
                <span class="eyebrow">Kontak</span>
                <dl class="kontak">
                    <div>
                        <dt>PIC</dt>
                        <dd>{{ suplier.kontak_person || '—' }}</dd>
                    </div>
                    <div>
                        <dt>Telp</dt>
                        <dd>{{ suplier.telepon || '—' }}</dd>
                    </div>
                    <div>
                        <dt>Kota</dt>
                        <dd>{{ suplier.kota || '—' }}</dd>
                    </div>
                </dl>
                <div class="pisah"></div>
                <dl class="kontak">
                    <div>
                        <dt>Bank</dt>
                        <dd :class="{ redup: !suplier.bank_nama }">{{ suplier.bank_nama || 'Belum diisi' }}</dd>
                    </div>
                    <div>
                        <dt>Rek</dt>
                        <dd class="mono" :class="{ redup: !suplier.bank_no_rekening }">
                            {{ suplier.bank_no_rekening || '—' }}
                        </dd>
                    </div>
                </dl>
            </section>
        </div>

        <!-- ── Kanan: mutasi / riwayat ──────────────────────── -->
        <section class="kartu area-kanan">
            <div class="area-kanan__kepala">
                <span class="eyebrow">Mutasi / riwayat pembayaran</span>
                <span v-if="!loading && mutasi.length" class="hitung">{{ mutasi.length }}</span>
            </div>

            <div v-if="loading" class="kosong">
                <i class="pi pi-spin pi-spinner"></i>
                <p class="kosong__judul">Memuat transaksi…</p>
            </div>

            <div v-else-if="mutasi.length" class="list-mutasi">
                <div v-for="po in mutasi" :key="po.id" class="mutasi">
                    <div class="mutasi__kiri">
                        <p class="mutasi__nomor">{{ po.nomor }}</p>
                        <span class="mutasi__tanggal">{{ tgl(po.tanggal) }}</span>
                    </div>
                    <div class="mutasi__kanan">
                        <span class="badge" :class="po.sisa > 0 ? 'badge--merah' : 'badge--hijau'">
                            {{ po.sisa > 0 ? 'Belum lunas' : 'Lunas' }}
                        </span>
                        <span class="mutasi__nilai">{{ rp(po.total_po) }}</span>
                    </div>
                </div>
            </div>

            <div v-else class="kosong">
                <i class="pi pi-receipt"></i>
                <p class="kosong__judul">Belum ada mutasi tercatat</p>
                <p class="kosong__sub">
                    Pembelian dan pembayaran dengan
                    <strong>{{ suplier.nama }}</strong> akan muncul di sini.
                </p>
            </div>
        </section>
    </div>
</template>

<script setup>
defineProps({
    suplier: { type: Object, required: true },
    mutasi: { type: Array, default: () => [] },
    totalHutang: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
})

const rp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const tgl = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const labelKategori = (k) =>
    ({ RAW_MATERIAL: 'Bahan baku', PACKAGING: 'Kemasan', JASA: 'Jasa' }[k] || k)
</script>

<style scoped>
.blueprint {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
}

@media (max-width: 900px) {
    .blueprint {
        grid-template-columns: 1fr;
    }
}

.kolom {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* ── kartu dasar (soft, bukan blueprint tebal) ──────────── */
.kartu {
    background: var(--panel, #fff);
    border: 1px solid var(--garis, #e5e7eb);
    border-radius: var(--lengkung, 12px);
    box-shadow: var(--bayang, 0 1px 2px rgba(0, 0, 0, .04));
    padding: 1.25rem;
}

.eyebrow {
    display: block;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--redup-2, #9ca3af);
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .95em;
}

.redup {
    color: var(--redup-2, #9ca3af);
}

/* ── kartu identitas ── */
.kartu__nama {
    margin: .6rem 0 .5rem;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -.01em;
    line-height: 1.25;
    color: var(--teks, #111827);
}

.kartu__meta {
    margin: 0;
    display: flex;
    align-items: center;
    gap: .6rem;
    flex-wrap: wrap;
    font-size: .8125rem;
    color: var(--redup, #6b7280);
}

.chip {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: .2rem .5rem;
    border-radius: 5px;
    background: var(--biru-latar, #eff6ff);
    color: var(--biru, #3b82f6);
}

/* ── kartu hutang (signature) ── */
.kartu--hutang {
    text-align: center;
}

.kartu__memuat {
    margin-top: .7rem;
    font-size: .75rem;
    color: var(--redup, #6b7280);
}

.kartu__angka {
    margin: .7rem 0 .3rem;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.02em;
    color: var(--teks, #111827);
}

.kartu__angka--tagih {
    color: var(--merah, #dc2626);
}

.kartu__kaki {
    font-size: .75rem;
    color: var(--redup, #6b7280);
}

.kartu__kaki--tagih {
    color: var(--merah, #dc2626);
    font-weight: 600;
}

/* ── kartu kontak ── */
.kontak {
    margin: .8rem 0 0;
    display: flex;
    flex-direction: column;
    gap: .55rem;
}

.kontak>div {
    display: grid;
    grid-template-columns: 3.5rem 1fr;
    gap: .5rem;
    align-items: baseline;
}

.kontak dt {
    font-size: .75rem;
    font-weight: 600;
    color: var(--redup, #6b7280);
}

.kontak dd {
    margin: 0;
    font-size: .8125rem;
    color: var(--teks, #111827);
    word-break: break-word;
}

.pisah {
    height: 1px;
    background: var(--garis, #e5e7eb);
    margin: 1rem 0;
}

/* ── area kanan: mutasi ── */
.area-kanan {
    min-height: 26rem;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.area-kanan__kepala {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--garis, #e5e7eb);
}

.hitung {
    font-size: .75rem;
    font-weight: 700;
    color: var(--redup, #6b7280);
    background: var(--latar, #f3f4f6);
    padding: .2rem .5rem;
    border-radius: 6px;
}

.list-mutasi {
    padding: .4rem 0;
    overflow-y: auto;
}

.mutasi {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: .85rem 1.25rem;
    border-bottom: 1px solid var(--latar, #f3f4f6);
}

.mutasi:last-child {
    border-bottom: none;
}

.mutasi__kiri {
    min-width: 0;
}

.mutasi__nomor {
    margin: 0 0 .2rem;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks, #111827);
}

.mutasi__tanggal {
    font-size: .6875rem;
    color: var(--redup, #6b7280);
}

.mutasi__kanan {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: .35rem;
    white-space: nowrap;
}

.mutasi__nilai {
    font-size: .875rem;
    font-weight: 700;
    color: var(--teks, #111827);
}

.badge {
    font-size: .625rem;
    font-weight: 700;
    padding: .18rem .5rem;
    border-radius: 999px;
}

.badge--merah {
    background: var(--merah-latar, #fee2e2);
    color: var(--merah, #991b1b);
}

.badge--hijau {
    background: var(--hijau-latar, #dcfce7);
    color: var(--hijau, #166534);
}

/* ── empty / loading ── */
.kosong {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 2rem;
}

.kosong i {
    font-size: 2rem;
    color: var(--garis-tegas, #d1d5db);
    margin-bottom: 1rem;
}

.kosong__judul {
    margin: 0 0 .35rem;
    font-size: .9375rem;
    font-weight: 600;
    color: var(--redup, #6b7280);
}

.kosong__sub {
    margin: 0;
    max-width: 22rem;
    font-size: .8125rem;
    color: var(--redup-2, #9ca3af);
    line-height: 1.5;
}

.kosong__sub strong {
    color: var(--redup, #6b7280);
    font-weight: 600;
}
</style>