<!--
  src/features/accounting/BukuTagihan.vue
  ========================================
  Buku tagihan — tugas akunting. Hutang supplier dan piutang customer dalam
  SATU daftar terurut jatuh tempo, bukan dua tabel terpisah.

  Alasannya: pertanyaan yang dijawab layar ini adalah "apa yang paling
  mendesak hari ini", dan yang mendesak bisa datang dari sisi mana pun.
  Garis warna di kiri membedakan arah; tab untuk menyaring bila perlu fokus.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Buku Tagihan
                </p>
                <h1 class="judul">Buku tagihan</h1>
            </div>
            <button class="tbl">Ekspor</button>
        </header>

        <section class="metrik">
            <StatCard label="Hutang supplier" :nilai="rpk(totalHutang)" :kaki="`${hutang.length} PO belum lunas`" />
            <StatCard label="Piutang customer" :nilai="rpk(totalPiutang)"
                :kaki="`${piutang.length} SO belum tertagih`" />
            <StatCard label="Lewat tempo" :nilai="lewatTempo.length" kaki="Perlu tindakan"
                :waspada="lewatTempo.length > 0" />
            <StatCard label="Posisi bersih" :nilai="rpk(posisiBersih)" kaki="Piutang dikurangi hutang" />
        </section>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Daftar tagihan</h2>
                    <p class="panel__sub">Belum lunas, terurut dari yang paling mendesak</p>
                </div>
                <div class="tab" role="tablist">
                    <button v-for="t in ['semua', 'hutang', 'piutang']" :key="t" :class="{ on: tab === t }" role="tab"
                        :aria-selected="tab === t" @click="tab = t">{{ t }}</button>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca data tagihan" />

            <div v-else-if="tampil.length">
                <div v-for="x in tampil" :key="`${x.arah}-${x.id}`" class="baris">
                    <span class="baris__arah" :class="`baris__arah--${x.arah}`"></span>
                    <div>
                        <p class="baris__nomor">{{ x.nomor }}</p>
                        <p class="baris__pihak">
                            {{ x.pihak }} ·
                            {{ x.arah === 'hutang' ? 'bayar ke supplier' : 'tagih ke customer' }}
                        </p>
                    </div>
                    <div class="baris__kanan">
                        <span class="baris__nilai">{{ rp(x.sisa) }}</span>
                        <span class="baris__tempo" :class="kelasTempo(x.hari)">
                            {{ labelTempo(x.hari) }}
                        </span>
                    </div>
                </div>
            </div>

            <EmptyState v-else pesan="Tidak ada tagihan terbuka." petunjuk="Semua dokumen sudah lunas." />
        </section>

        <p class="catatan">
            <strong>Catatan pengembangan.</strong>
            Sisi piutang memakai data contoh — <code>SalesOrder</code> di backend belum
            punya <code>status_pembayaran</code> maupun riwayat pembayaran. Sisi hutang
            sudah bisa dirakit dari data nyata.
        </p>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTagihan } from '@/features/accounting/composables/useInvoice'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    isLoading, tab, hutang, piutang, tampil,
    totalHutang, totalPiutang, posisiBersih, lewatTempo, muat,
} = useTagihan()

onMounted(muat)

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const rpk = (n) => {
    const a = Number(n)
    if (Math.abs(a) >= 1e9) return `Rp ${(a / 1e9).toFixed(2)} M`
    if (Math.abs(a) >= 1e6) return `Rp ${(a / 1e6).toFixed(1)} jt`
    return rp(a)
}

const labelTempo = (h) => {
    if (h === null) return 'Tanpa tempo'
    if (h < 0) return `${Math.abs(h)} hari lewat`
    if (h === 0) return 'Jatuh tempo hari ini'
    return `${h} hari lagi`
}

const kelasTempo = (h) => {
    if (h === null) return 'aman'
    if (h < 0) return 'telat'
    return h <= 7 ? 'dekat' : 'aman'
}
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
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem 1rem;
    cursor: pointer;
}

.tbl:hover {
    border-color: var(--garis-tegas);
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

.baris {
    display: grid;
    grid-template-columns: 3px 1fr auto;
    gap: .9rem;
    align-items: center;
    padding: .95rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.baris:last-child {
    border-bottom: none;
}

.baris:hover {
    background: var(--panel-hover);
}

.baris__arah {
    align-self: stretch;
    border-radius: 2px;
}

.baris__arah--hutang {
    background: var(--merah);
}

.baris__arah--piutang {
    background: var(--hijau);
}

.baris__nomor {
    margin: 0 0 .2rem;
    font-size: .8125rem;
    font-weight: 600;
}

.baris__pihak {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.baris__kanan {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: .25rem;
}

.baris__nilai {
    font-size: .9375rem;
    font-weight: 700;
}

.baris__tempo {
    font-size: .6875rem;
}

.telat {
    color: var(--merah);
    font-weight: 600;
}

.dekat {
    color: var(--kuning);
}

.aman {
    color: var(--redup-2);
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