<!--
  src/features/accounting/views/InputTransaksi.vue
  ================================================
  Pintu masuk pencatatan transaksi. Tiga jenis punya bentuk data yang
  sangat berbeda (pembelian butuh daftar item, pembayaran butuh PO yang
  sudah ada), jadi ini pemilih yang mengarahkan — bukan satu form panjang
  yang separuh isinya selalu tidak relevan.

  Di bawahnya riwayat, supaya akunting bisa memastikan entri barusan
  benar-benar masuk tanpa pindah halaman.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/accounting">Akunting</router-link> › Input Transaksi
                </p>
                <h1 class="judul">Input transaksi</h1>
                <p class="sub">Pilih jenis transaksi yang mau dicatat.</p>
            </div>
        </header>

        <section class="metrik">
            <StatCard label="Transaksi hari ini" :nilai="transaksiHariIni.length" :kaki="ringkasHariIni" />
            <StatCard label="Nilai hari ini" :nilai="rpk(nilaiHariIni)" kaki="Sudah termasuk PPN" />
            <StatCard label="Menunggu dokumen" :nilai="dokumenKurang.length" kaki="Invoice, faktur, surat jalan"
                :waspada="dokumenKurang.length > 0" />
        </section>

        <!-- ── pemilih jenis ─────────────────────────────────── -->
        <section class="pilih">
            <router-link v-for="j in jenisTransaksi" :key="j.id" :to="j.siap ? j.rute : ''" class="jenis"
                :class="{ 'jenis--tunggu': !j.siap }" :aria-disabled="!j.siap"
                @click="!j.siap && $event.preventDefault()">
                <span v-if="!j.siap" class="jenis__segera">segera</span>
                <span class="jenis__lambang" :class="`jenis__lambang--${j.nada}`">
                    <BaseIcon :nama="j.ikon" :ukuran="22" />
                </span>
                <span class="jenis__teks">
                    <span class="jenis__nama">{{ j.nama }}</span>
                    <span class="jenis__ringkas">{{ j.siap ? j.ringkas : j.catatan }}</span>
                </span>
                <span v-if="j.siap" class="jenis__panah" aria-hidden="true">→</span>
            </router-link>
        </section>

        <!-- ── riwayat ───────────────────────────────────────── -->
        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Riwayat transaksi</h2>
                    <p class="panel__sub">Terbaru di atas</p>
                </div>
                <div class="tab" role="tablist">
                    <button v-for="t in ['semua', 'pembelian', 'penjualan']" :key="t" :class="{ on: saring === t }"
                        role="tab" :aria-selected="saring === t" @click="saring = t">{{ t }}</button>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca riwayat transaksi" />

            <div v-else-if="tampil.length" class="daftar">
                <div v-for="x in tampil" :key="x.id" class="baris">
                    <span class="baris__jenis" :class="`baris__jenis--${x.jenis.toLowerCase()}`">
                        {{ x.jenis === 'PEMBELIAN' ? 'Beli' : 'Jual' }}
                    </span>
                    <div class="baris__kiri">
                        <p class="baris__nomor">{{ x.nomor }}</p>
                        <p class="baris__pihak">{{ x.pihak }}</p>
                    </div>
                    <div class="baris__tengah">
                        <span class="baris__tanggal">{{ tanggalPendek(x.tanggal) }}</span>
                        <span v-if="x.lengkap === false" class="baris__dokumen">Dokumen kurang</span>
                    </div>
                    <div class="baris__kanan">
                        <span class="baris__nilai">{{ rp(x.nilai) }}</span>
                        <span class="baris__status" :class="kelasStatus(x.status)">
                            {{ labelStatus(x.status) }}
                        </span>
                    </div>
                </div>
            </div>

            <EmptyState v-else pesan="Belum ada transaksi."
                petunjuk="Pilih jenis transaksi di atas untuk mulai mencatat." />
        </section>

        <p class="catatan">
            <strong>Catatan pengembangan.</strong>
            Input penjualan belum bisa dipakai — <code>sales_order</code> di backend
            punya model tapi <strong>belum punya service sama sekali</strong>, jadi tidak
            ada endpoint untuk membuat SO.
        </p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTransaksi, JENIS } from '@/features/accounting/composables/useTransaksi'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const {
    isLoading, riwayat, transaksiHariIni, nilaiHariIni, dokumenKurang, muat,
} = useTransaksi()

const saring = ref('semua')

onMounted(muat)

const jenisTransaksi = [
    {
        id: JENIS.PEMBELIAN,
        nama: 'Pembelian',
        ringkas: 'Buat PO baru ke supplier',
        ikon: 'transaksi',
        nada: 'merah',
        rute: '/accounting/po/buat',
        siap: true,
    },
    {
        id: JENIS.PENJUALAN,
        nama: 'Penjualan',
        ringkas: 'Buat sales order ke customer',
        ikon: 'buku',
        nada: 'hijau',
        rute: '/accounting/transaksi/penjualan',
        siap: false,
        catatan: 'Service sales_order belum ada di backend',
    },
    {
        id: JENIS.PEMBAYARAN,
        nama: 'Pembayaran',
        ringkas: 'Catat pembayaran ke supplier',
        ikon: 'transaksi',
        nada: 'biru',
        rute: '/accounting/pembayaran',
        siap: true,
    },
]

const ringkasHariIni = computed(() => {
    const beli = transaksiHariIni.value.filter(x => x.jenis === JENIS.PEMBELIAN).length
    const jual = transaksiHariIni.value.filter(x => x.jenis === JENIS.PENJUALAN).length
    return `${beli} pembelian · ${jual} penjualan`
})

const tampil = computed(() => {
    if (saring.value === 'pembelian') {
        return riwayat.value.filter(x => x.jenis === JENIS.PEMBELIAN)
    }
    if (saring.value === 'penjualan') {
        return riwayat.value.filter(x => x.jenis === JENIS.PENJUALAN)
    }
    return riwayat.value
})

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

const labelStatus = (s) => ({
    UNPAID: 'Belum dibayar',
    PARTIAL: 'Sebagian',
    PAID: 'Lunas',
}[s] ?? s)

const kelasStatus = (s) => ({
    UNPAID: 'st-merah',
    PARTIAL: 'st-kuning',
    PAID: 'st-hijau',
}[s] ?? 'st-redup')
</script>

<style scoped>
.kepala {
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

.sub {
    margin: .3rem 0 0;
    font-size: .875rem;
    color: var(--redup);
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

/* ── pemilih jenis ── */
.pilih {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.jenis {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    color: inherit;
    text-decoration: none;
    transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
}

.jenis:hover:not(.jenis--tunggu) {
    border-color: var(--garis-tegas);
    transform: translateY(-2px);
    box-shadow: var(--bayang-angkat);
}

.jenis--tunggu {
    opacity: .5;
    cursor: default;
}

.jenis__lambang {
    width: 44px;
    height: 44px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.jenis__lambang--merah {
    background: var(--merah-latar);
    color: var(--merah);
}

.jenis__lambang--hijau {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.jenis__lambang--biru {
    background: var(--biru-latar);
    color: var(--biru);
}

.jenis__teks {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    min-width: 0;
    flex: 1;
}

.jenis__nama {
    font-size: .9375rem;
    font-weight: 600;
}

.jenis__ringkas {
    font-size: .75rem;
    color: var(--redup);
    line-height: 1.45;
}

.jenis__panah {
    color: var(--redup-2);
    font-size: .9375rem;
    opacity: 0;
    transform: translateX(-4px);
    transition: all .18s ease;
}

.jenis:hover .jenis__panah {
    opacity: 1;
    transform: none;
    color: var(--teks);
}

.jenis__segera {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: .625rem;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--redup-2);
    border: 1px solid var(--garis);
    padding: .12rem .4rem;
    border-radius: 5px;
}

/* ── panel riwayat ── */
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
    text-transform: capitalize;
    color: var(--redup);
    background: none;
    border: none;
    padding: .4rem .8rem;
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

.baris {
    display: grid;
    grid-template-columns: 3.5rem minmax(0, 1fr) auto auto;
    gap: 1rem;
    align-items: center;
    padding: .9rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.baris:last-child {
    border-bottom: none;
}

.baris:hover {
    background: var(--panel-hover);
}

.baris__jenis {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: .2rem .4rem;
    border-radius: 5px;
    text-align: center;
}

.baris__jenis--pembelian {
    background: var(--merah-latar);
    color: var(--merah);
}

.baris__jenis--penjualan {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.baris__nomor {
    margin: 0 0 .15rem;
    font-size: .8125rem;
    font-weight: 600;
}

.baris__pihak {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.baris__tengah {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    text-align: right;
}

.baris__tanggal {
    font-size: .75rem;
    color: var(--redup);
}

.baris__dokumen {
    font-size: .625rem;
    color: var(--kuning);
}

.baris__kanan {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: .25rem;
}

.baris__nilai {
    font-size: .875rem;
    font-weight: 700;
}

.baris__status {
    font-size: .6875rem;
}

.st-merah {
    color: var(--merah);
}

.st-kuning {
    color: var(--kuning);
}

.st-hijau {
    color: var(--hijau);
}

.st-redup {
    color: var(--redup-2);
}

@media (max-width: 720px) {
    .baris {
        grid-template-columns: 3.5rem 1fr auto;
    }

    .baris__tengah {
        display: none;
    }
}

.catatan {
    margin: 1.25rem 0 0;
    padding: .8rem 1rem;
    background: var(--kuning-latar);
    border: 1px solid var(--kuning-garis);
    border-radius: var(--lengkung-kecil);
    font-size: .75rem;
    color: var(--kuning);
    line-height: 1.6;
}

.catatan code {
    background: rgba(0, 0, 0, .05);
    padding: .1rem .3rem;
    border-radius: 4px;
    font-size: .95em;
}
</style>