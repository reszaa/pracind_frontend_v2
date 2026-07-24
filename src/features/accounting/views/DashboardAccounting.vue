<!--
  src/features/accounting/views/DashboardAccounting.vue
  ======================================================
  Halaman depan modul akunting. Menjawab satu pertanyaan: "apa yang harus
  saya kerjakan hari ini?"

  Elemen utamanya daftar tindakan terurut prioritas, bukan grid kartu.
  Grid membuat orang memindai lalu bingung mulai dari mana; daftar terurut
  membuat orang langsung bertindak.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Akunting
                </p>
                <h1 class="judul">Akunting</h1>
                <p class="sub">Posisi hutang, piutang, dan dokumen yang menunggu.</p>
            </div>
        </header>

        <section class="metrik">
            <StatCard label="Hutang supplier" :nilai="rpk(totalHutang)" :kaki="`${hutang.length} PO belum lunas`" />
            <StatCard label="Piutang customer" :nilai="rpk(totalPiutang)"
                :kaki="`${piutang.length} SO belum tertagih`" />
            <StatCard label="Posisi bersih" :nilai="rpk(posisiBersih)" kaki="Piutang dikurangi hutang" />
            <StatCard label="Dokumen kurang" :nilai="dokumenKurang.length" kaki="PO belum lengkap"
                :waspada="dokumenKurang.length > 0" />
        </section>

        <div class="dua">
            <!-- ── kiri: daftar tindakan ───────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Perlu ditangani</h2>
                        <p class="panel__sub">Terurut dari yang paling mendesak</p>
                    </div>
                    <span class="hitung" :class="{ 'hitung--kritis': jumlahKritis > 0 }">
                        {{ perluDitangani.length }}
                    </span>
                </div>

                <LoadingBar v-if="isLoading" pesan="Membaca data akunting" />

                <ol v-else-if="perluDitangani.length" class="antre">
                    <li v-for="(x, i) in perluDitangani" :key="i" class="antre__baris"
                        :class="`antre__baris--${x.tingkat}`">
                        <span class="antre__urut">{{ String(i + 1).padStart(2, '0') }}</span>
                        <div class="antre__isi">
                            <p class="antre__judul">{{ x.judul }}</p>
                            <p class="antre__detail">{{ x.detail }}</p>
                        </div>
                        <router-link :to="x.tautan" class="antre__tautan">{{ x.jenis }}</router-link>
                    </li>
                </ol>

                <EmptyState v-else pesan="Tidak ada yang tertunda."
                    petunjuk="Semua tagihan terkendali dan dokumen lengkap." />
            </section>

            <!-- ── kanan: pintasan ─────────────────────────────── -->
            <aside class="samping">
                <section class="panel">
                    <div class="panel__kepala">
                        <h2 class="panel__judul">Pintasan</h2>
                    </div>
                    <nav class="pintas">
                        <router-link v-for="p in pintasan" :key="p.rute" :to="p.rute" class="pintas__item">
                            <span class="pintas__teks">
                                <span class="pintas__nama">{{ p.nama }}</span>
                                <span class="pintas__ringkas">{{ p.ringkas }}</span>
                            </span>
                            <span class="pintas__panah" aria-hidden="true">→</span>
                        </router-link>
                    </nav>
                </section>

                <section class="panel">
                    <div class="panel__kepala">
                        <h2 class="panel__judul">Ringkasan posisi</h2>
                    </div>
                    <dl class="ringkas">
                        <div>
                            <dt>Hutang supplier</dt>
                            <dd class="merah">{{ rp(totalHutang) }}</dd>
                        </div>
                        <div>
                            <dt>Piutang customer</dt>
                            <dd class="hijau">{{ rp(totalPiutang) }}</dd>
                        </div>
                        <div class="ringkas__total">
                            <dt>Posisi bersih</dt>
                            <dd :class="posisiBersih >= 0 ? 'hijau' : 'merah'">
                                {{ rp(posisiBersih) }}
                            </dd>
                        </div>
                    </dl>
                </section>
            </aside>
        </div>

        <p class="catatan">
            <strong>Catatan pengembangan.</strong>
            Sisi piutang memakai data contoh — <code>SalesOrder</code> di backend belum
            punya <code>status_pembayaran</code> maupun riwayat pembayaran.
        </p>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAccounting } from '@/features/accounting/composables/useAccounting'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    isLoading, hutang, piutang, totalHutang, totalPiutang, posisiBersih,
    dokumenKurang, perluDitangani, jumlahKritis, muat,
} = useAccounting()

onMounted(muat)

const pintasan = [
    { nama: 'Buku tagihan', ringkas: 'Hutang & piutang belum lunas', rute: '/accounting/tagihan' },
    { nama: 'Catat pembayaran', ringkas: 'Bayar suplier, catat cicilan', rute: '/accounting/transaksi/pembayaran' },
    { nama: 'Input transaksi', ringkas: 'Pembelian, penjualan, pembayaran', rute: '/accounting/transaksi' },
    { nama: 'Purchase order', ringkas: 'Daftar PO & kelengkapan dokumen', rute: '/accounting/po' },
]

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const rpk = (n) => {
    const a = Number(n)
    if (Math.abs(a) >= 1e9) return `Rp ${(a / 1e9).toFixed(2)} M`
    if (Math.abs(a) >= 1e6) return `Rp ${(a / 1e6).toFixed(1)} jt`
    return rp(a)
}
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

.dua {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 21rem);
    gap: 1.25rem;
    align-items: start;
}

@media (max-width: 1000px) {
    .dua {
        grid-template-columns: 1fr;
    }
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

.hitung {
    font-size: .75rem;
    font-weight: 700;
    color: var(--redup);
    background: var(--latar);
    padding: .2rem .5rem;
    border-radius: 6px;
}

.hitung--kritis {
    color: var(--merah);
    background: var(--merah-latar);
}

/* ── daftar tindakan ── */
.antre {
    list-style: none;
    margin: 0;
    padding: 0;
}

.antre__baris {
    display: grid;
    grid-template-columns: 2rem 1fr auto;
    gap: .9rem;
    align-items: start;
    padding: .95rem 1.25rem;
    border-bottom: 1px solid var(--latar);
    border-left: 3px solid transparent;
}

.antre__baris:last-child {
    border-bottom: none;
}

.antre__baris:hover {
    background: var(--panel-hover);
}

.antre__baris--kritis {
    border-left-color: var(--merah);
}

.antre__baris--perhatian {
    border-left-color: var(--kuning);
}

.antre__urut {
    font-size: .75rem;
    font-weight: 700;
    color: var(--redup-2);
    padding-top: .1rem;
}

.antre__judul {
    margin: 0 0 .18rem;
    font-size: .875rem;
    font-weight: 600;
    line-height: 1.35;
}

.antre__detail {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.antre__tautan {
    font-size: .625rem;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--redup-2);
    text-decoration: none;
    padding-top: .2rem;
    white-space: nowrap;
    border-bottom: 1px solid transparent;
}

.antre__tautan:hover {
    color: var(--teks);
    border-bottom-color: var(--garis-tegas);
}

/* ── samping ── */
.samping {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.pintas {
    display: flex;
    flex-direction: column;
}

.pintas__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: .9rem 1.25rem;
    border-bottom: 1px solid var(--latar);
    color: inherit;
    text-decoration: none;
}

.pintas__item:last-child {
    border-bottom: none;
}

.pintas__item:hover {
    background: var(--panel-hover);
}

.pintas__teks {
    display: flex;
    flex-direction: column;
    gap: .15rem;
    min-width: 0;
}

.pintas__nama {
    font-size: .8125rem;
    font-weight: 600;
}

.pintas__ringkas {
    font-size: .6875rem;
    color: var(--redup);
}

.pintas__panah {
    color: var(--redup-2);
    font-size: .875rem;
    opacity: 0;
    transform: translateX(-4px);
    transition: all .18s ease;
}

.pintas__item:hover .pintas__panah {
    opacity: 1;
    transform: none;
    color: var(--teks);
}

.ringkas {
    margin: 0;
    padding: 1.1rem 1.25rem;
}

.ringkas>div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: .5rem 0;
    border-bottom: 1px solid var(--latar);
}

.ringkas dt {
    font-size: .8125rem;
    color: var(--redup);
}

.ringkas dd {
    margin: 0;
    font-size: .9375rem;
    font-weight: 600;
}

.ringkas__total {
    border-bottom: none !important;
    padding-top: .8rem !important;
    margin-top: .3rem;
    border-top: 2px solid var(--garis);
}

.ringkas__total dt {
    font-weight: 600;
    color: var(--teks);
}

.ringkas__total dd {
    font-size: 1.125rem;
    font-weight: 700;
}

.merah {
    color: var(--merah);
}

.hijau {
    color: var(--hijau);
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