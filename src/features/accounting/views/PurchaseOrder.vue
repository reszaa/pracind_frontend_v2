<!--
  src/features/accounting/views/PurchaseOrder.vue
  ================================================  =================================================
  Daftar PO. Dua status ditampilkan berdampingan karena keduanya berjalan
  independen di backend: penerimaan barang dan pembayaran tidak saling
  menunggu — PO bisa lunas sebelum barang datang, atau sebaliknya.

  Kelengkapan dokumen ikut ditampilkan karena itu yang paling sering jadi
  masalah saat audit, dan tidak terlihat dari dua status di atas.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Pembelian
                </p>
                <h1 class="judul">Purchase order</h1>
            </div>
            <router-link to="/accounting/transaksi/pembelian" class="tbl tbl--utama">
                <BaseIcon nama="tambah" :ukuran="15" />
                Buat PO
            </router-link>
        </header>

        <section class="metrik">
            <StatCard label="PO bulan ini" :nilai="rpk(totalBulanIni)" :kaki="`${daftarPO.length} dokumen`" />
            <StatCard label="Belum diterima penuh" :nilai="belumDiterima.length" kaki="Menunggu barang datang" />
            <StatCard label="Dokumen kurang" :nilai="dokumenKurang.length" kaki="Invoice, faktur, surat jalan"
                :waspada="dokumenKurang.length > 0" />
        </section>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Daftar PO</h2>
                    <p class="panel__sub">Terbaru di atas</p>
                </div>
                <div class="alat">
                    <input v-model="cari" type="search" class="cari" placeholder="Cari nomor atau supplier" />
                    <div class="tab" role="tablist">
                        <button v-for="t in saringan" :key="t.id" :class="{ on: saringStatus === t.id }" role="tab"
                            :aria-selected="saringStatus === t.id" @click="saringStatus = t.id">{{ t.label }}</button>
                    </div>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca purchase order" />

            <div v-else-if="tampil.length" class="daftar">
                <router-link v-for="po in tampil" :key="po.id" :to="`/accounting/po/${po.id}`" class="po">
                    <div class="po__utama">
                        <p class="po__nomor">{{ po.nomor }}</p>
                        <p class="po__supplier">
                            {{ po.suplier_detail?.nama }} · {{ po.akun_detail?.kode }}
                        </p>
                    </div>

                    <div class="po__status">
                        <span class="lencana" :class="kelasTerima(po.status_penerimaan)">
                            {{ labelTerima(po.status_penerimaan) }}
                        </span>
                        <span class="lencana" :class="kelasBayar(po.status_pembayaran)">
                            {{ labelBayar(po.status_pembayaran) }}
                        </span>
                        <span v-if="po.kelengkapan && !po.kelengkapan.is_complete" class="lencana lencana--dokumen">{{
                            po.kelengkapan.count }}/{{ po.kelengkapan.total }} dokumen</span>
                    </div>

                    <div class="po__kanan">
                        <span class="po__nilai">{{ rp(po.total_po) }}</span>
                        <span class="po__tanggal">{{ tanggalPendek(po.tanggal) }}</span>
                    </div>
                </router-link>
            </div>

            <EmptyState v-else pesan="Tidak ada PO yang cocok." petunjuk="Ubah kata kunci atau saringan status." />
        </section>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { usePurchaseOrder } from '@/features/accounting/composables/usePurchaseOrder'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const {
    daftarPO, tampil, isLoading, cari, saringStatus,
    belumDiterima, totalBulanIni, muat,
} = usePurchaseOrder()

onMounted(muat)

const saringan = [
    { id: 'semua', label: 'Semua' },
    { id: 'belum', label: 'Belum' },
    { id: 'sebagian', label: 'Sebagian' },
    { id: 'penuh', label: 'Penuh' },
]

const dokumenKurang = computed(() =>
    daftarPO.value.filter(po => po.kelengkapan && !po.kelengkapan.is_complete),
)

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const rpk = (n) => {
    const a = Number(n)
    if (Math.abs(a) >= 1e9) return `Rp ${(a / 1e9).toFixed(2)} M`
    if (Math.abs(a) >= 1e6) return `Rp ${(a / 1e6).toFixed(1)} jt`
    return rp(a)
}

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const labelTerima = (s) => ({
    BELUM_DITERIMA: 'Belum diterima',
    SEBAGIAN: 'Diterima sebagian',
    PENUH: 'Diterima penuh',
}[s] ?? s)

const kelasTerima = (s) => ({
    BELUM_DITERIMA: 'lencana--redup',
    SEBAGIAN: 'lencana--kuning',
    PENUH: 'lencana--hijau',
}[s] ?? 'lencana--redup')

const labelBayar = (s) => ({
    UNPAID: 'Belum dibayar',
    PARTIAL: 'Dibayar sebagian',
    PAID: 'Lunas',
}[s] ?? s)

const kelasBayar = (s) => ({
    UNPAID: 'lencana--merah',
    PARTIAL: 'lencana--kuning',
    PAID: 'lencana--hijau',
}[s] ?? 'lencana--redup')
</script>

<style scoped>
.kepala {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.remah {
    margin: 0 0 .3rem;
    font-size: .75rem;
    color: var(--redup-2);
}

.remah a {
    color: var(--redup);
    text-decoration: none;
}

.remah a:hover {
    color: var(--teks);
    text-decoration: underline;
}

.judul {
    margin: 0;
    font-size: 1.625rem;
    font-weight: 700;
    letter-spacing: -.02em;
}

.tbl {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 600;
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem 1rem;
    cursor: pointer;
    text-decoration: none;
    background: var(--panel);
    color: var(--teks);
}

.tbl--utama {
    background: var(--teks);
    color: var(--panel);
    border-color: var(--teks);
}

.tbl--utama:hover {
    opacity: .88;
}

.metrik {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1px;
    background: var(--garis);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
    margin-bottom: 1.5rem;
}

.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
}

.panel__kepala {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--garis);
}

.panel__judul {
    margin: 0;
    font-size: .9375rem;
    font-weight: 600;
}

.panel__sub {
    margin: .15rem 0 0;
    font-size: .75rem;
    color: var(--redup);
}

.alat {
    display: flex;
    gap: .6rem;
    align-items: center;
    flex-wrap: wrap;
}

.cari {
    font-family: inherit;
    font-size: .8125rem;
    padding: .5rem .75rem;
    min-width: 12rem;
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    background: var(--latar);
    color: var(--teks);
}

.cari:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.tab {
    display: flex;
    gap: .2rem;
    background: var(--latar);
    padding: .2rem;
    border-radius: 9px;
}

.tab button {
    font-family: inherit;
    font-size: .75rem;
    font-weight: 600;
    color: var(--redup);
    background: none;
    border: none;
    padding: .4rem .7rem;
    border-radius: 7px;
    cursor: pointer;
}

.tab button.on {
    background: var(--panel);
    color: var(--teks);
    box-shadow: var(--bayang);
}

.daftar {
    display: flex;
    flex-direction: column;
}

.po {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 1.25rem;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--latar);
    color: inherit;
    text-decoration: none;
}

.po:last-child {
    border-bottom: none;
}

.po:hover {
    background: var(--panel-hover);
}

.po__nomor {
    margin: 0 0 .18rem;
    font-size: .875rem;
    font-weight: 600;
}

.po__supplier {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.po__status {
    display: flex;
    gap: .35rem;
    flex-wrap: wrap;
}

.lencana {
    font-size: .625rem;
    font-weight: 600;
    padding: .18rem .45rem;
    border-radius: 5px;
    white-space: nowrap;
}

.lencana--hijau {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.lencana--kuning {
    background: var(--kuning-latar);
    color: var(--kuning);
}

.lencana--merah {
    background: var(--merah-latar);
    color: var(--merah);
}

.lencana--redup {
    background: var(--latar);
    color: var(--redup);
}

.lencana--dokumen {
    background: var(--biru-latar);
    color: var(--biru);
}

.po__kanan {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: .2rem;
}

.po__nilai {
    font-size: .9375rem;
    font-weight: 700;
}

.po__tanggal {
    font-size: .6875rem;
    color: var(--redup-2);
}

@media (max-width: 820px) {
    .po {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .po__status {
        grid-column: 1 / -1;
    }
}
</style>