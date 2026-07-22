<!--
  src/features/warehouse/views/DashboardGudang.vue
  =================================================
  Layar kerja harian gudang. Menjawab: "bahan apa yang perlu direstock, dan
  siapa berhutang apa."

  Bar dua warna: rak gudang (hijau/kuning/merah sesuai status) dan isi tangki
  (biru). Garis putih tipis menandai ambang minimum.

  Alert HABIS/MENIPIS dihitung dari RAK GUDANG saja, bukan total — bahan yang
  sedang di tangki tidak bisa diambil dari rak, jadi gudang kosong dengan
  tangki penuh tetap merah. Itu keputusan sadar, bukan bug.

  Saldo minus BUKAN error: entitas memakai lebih banyak dari yang disetor,
  dan hutangnya sembuh sendiri saat dia beli/setor lagi.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Gudang
                </p>
                <h1 class="judul">Stok bahan baku</h1>
                <p class="sub">Fisik rak gudang, isi tangki, dan kepemilikan per entitas.</p>
            </div>
            <router-link to="/warehouse/opname" class="tbl">Stok opname</router-link>
        </header>

        <section class="metrik">
            <StatCard label="Bahan habis" :nilai="habis.length" kaki="Rak gudang kosong" :waspada="habis.length > 0" />
            <StatCard label="Bahan menipis" :nilai="menipis.length" kaki="Di bawah ambang minimum" />
            <StatCard label="Entitas berhutang" :nilai="berhutang.length" kaki="Saldo minus ke pool gudang" />
            <StatCard label="Selisih pembukuan" :nilai="deviasi.length" kaki="Saldo ≠ fisik"
                :waspada="deviasi.length > 0" />
        </section>

        <div class="dua">
            <!-- ── kiri: posisi bahan ──────────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Posisi bahan</h2>
                        <p class="panel__sub">Rak gudang vs isi tangki</p>
                    </div>
                    <div class="alat">
                        <input v-model="cari" type="search" class="cari" placeholder="Cari bahan" />
                        <div class="tab" role="tablist">
                            <button v-for="t in saringan" :key="t.id" :class="{ on: saringStatus === t.id }" role="tab"
                                :aria-selected="saringStatus === t.id" @click="saringStatus = t.id">{{ t.label
                                }}</button>
                        </div>
                    </div>
                </div>

                <LoadingBar v-if="isLoading" pesan="Membaca posisi stok" />

                <div v-else-if="tampilBahan.length" class="bahan">
                    <article v-for="b in tampilBahan" :key="b.nama_bahan" class="bahan__baris">
                        <div class="bahan__atas">
                            <div>
                                <p class="bahan__nama">{{ b.nama_bahan }}</p>
                                <p class="bahan__min">
                                    Minimum {{ angka(b.stok_minimum) }} {{ b.uom }}
                                </p>
                            </div>
                            <div class="bahan__angka">
                                <span class="bahan__qty" :class="`teks--${b.status.toLowerCase()}`">
                                    {{ angka(b.fisik_gudang) }}
                                    <small>{{ b.uom }}</small>
                                </span>
                                <span class="lencana" :class="`lencana--${b.status.toLowerCase()}`">
                                    {{ b.status }}
                                </span>
                            </div>
                        </div>

                        <div class="ukur" :style="{ '--ambang': posisiAmbang(b) }">
                            <span class="ukur__gudang" :class="`isi--${b.status.toLowerCase()}`"
                                :style="{ width: lebarGudang(b) }"></span>
                            <span class="ukur__tanki" :style="{ width: lebarTanki(b) }"></span>
                            <span class="ukur__ambang"></span>
                        </div>

                        <div class="bahan__bawah">
                            <span v-if="Number(b.fisik_tanki) > 0" class="bahan__wip">
                                + {{ angka(b.fisik_tanki) }} {{ b.uom }} di tangki
                            </span>
                            <span v-if="Number(b.deviasi_invariant) !== 0" class="bahan__deviasi">
                                Selisih pembukuan {{ angka(b.deviasi_invariant) }} {{ b.uom }}
                            </span>
                            <span class="bahan__pemilik">
                                <span v-for="s in b.saldo_per_akun" :key="s.id"
                                    :class="{ 'minus': Number(s.qty) < 0 }">{{ s.akun_detail?.kode }} {{ angka(s.qty)
                                    }}</span>
                            </span>
                        </div>
                    </article>
                </div>

                <EmptyState v-else pesan="Tidak ada bahan yang cocok."
                    petunjuk="Ubah kata kunci atau saringan status." />
            </section>

            <!-- ── kanan ───────────────────────────────────────── -->
            <aside class="samping">
                <section class="panel">
                    <div class="panel__kepala">
                        <div>
                            <h2 class="panel__judul">Entitas berhutang</h2>
                            <p class="panel__sub">Saldo minus ke pool gudang</p>
                        </div>
                    </div>

                    <div v-if="berhutang.length" class="hutang">
                        <div v-for="(h, i) in berhutang" :key="i" class="hutang__baris">
                            <div>
                                <p class="hutang__bahan">{{ h.nama_bahan }}</p>
                                <p class="hutang__akun">{{ h.akun }}</p>
                            </div>
                            <span class="hutang__qty">{{ angka(h.qty) }} {{ h.uom }}</span>
                        </div>
                        <p class="hutang__catatan">
                            Saldo minus bukan kesalahan — hutang sembuh sendiri saat entitas
                            membeli atau menyetor bahan lagi.
                        </p>
                    </div>

                    <EmptyState v-else pesan="Tidak ada saldo minus." />
                </section>

                <section class="panel">
                    <div class="panel__kepala">
                        <h2 class="panel__judul">Keterangan</h2>
                    </div>
                    <ul class="legenda">
                        <li>
                            <span class="legenda__kotak isi--aman"></span>
                            Rak gudang — bisa langsung diambil
                        </li>
                        <li>
                            <span class="legenda__kotak legenda__kotak--tanki"></span>
                            Dalam tangki — belum bisa diambil dari rak
                        </li>
                        <li>
                            <span class="legenda__garis"></span>
                            Ambang minimum restock
                        </li>
                    </ul>
                    <p class="legenda__catatan">
                        Status dihitung dari rak gudang saja. Bahan yang sedang di tangki
                        tidak menghitung sebagai stok siap pakai.
                    </p>
                </section>
            </aside>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useWarehouse } from '@/features/warehouse/composables/useWarehouse'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampilBahan, isLoading, cari, saringStatus,
    habis, menipis, berhutang, deviasi, muatDashboard,
} = useWarehouse()

onMounted(muatDashboard)

const saringan = [
    { id: 'semua', label: 'Semua' },
    { id: 'habis', label: 'Habis' },
    { id: 'menipis', label: 'Menipis' },
    { id: 'aman', label: 'Aman' },
]

/**
 * Skala bar dibuat memuat ambang minimum supaya garisnya selalu terlihat.
 * Kalau skalanya cuma total stok, ambang bisa jatuh di luar bar.
 */
const skala = (b) => Math.max(
    Number(b.fisik_gudang) + Number(b.fisik_tanki),
    Number(b.stok_minimum) * 1.6,
    1,
)

const lebarGudang = (b) => `${(Number(b.fisik_gudang) / skala(b)) * 100}%`
const lebarTanki = (b) => `${(Number(b.fisik_tanki) / skala(b)) * 100}%`
const posisiAmbang = (b) =>
    `${Math.min((Number(b.stok_minimum) / skala(b)) * 100, 99)}%`

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })
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

.sub {
    margin: .3rem 0 0;
    font-size: .875rem;
    color: var(--redup);
}

.tbl {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem 1rem;
    cursor: pointer;
    text-decoration: none;
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

.dua {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 20rem);
    gap: 1.25rem;
    align-items: start;
}

@media (max-width: 1000px) {
    .dua {
        grid-template-columns: 1fr;
    }
}

.samping {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
    min-width: 10rem;
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

/* ── daftar bahan ── */
.bahan {
    display: flex;
    flex-direction: column;
}

.bahan__baris {
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.bahan__baris:last-child {
    border-bottom: none;
}

.bahan__baris:hover {
    background: var(--panel-hover);
}

.bahan__atas {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: .6rem;
}

.bahan__nama {
    margin: 0 0 .15rem;
    font-size: .9375rem;
    font-weight: 600;
}

.bahan__min {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup-2);
}

.bahan__angka {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: .3rem;
    align-items: flex-end;
}

.bahan__qty {
    font-size: 1.0625rem;
    font-weight: 700;
}

.bahan__qty small {
    font-size: .6875rem;
    font-weight: 500;
    color: var(--redup);
    margin-left: .2rem;
}

.lencana {
    font-size: .5625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: .15rem .4rem;
    border-radius: 5px;
}

.lencana--aman {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.lencana--menipis {
    background: var(--kuning-latar);
    color: var(--kuning);
}

.lencana--habis {
    background: var(--merah-latar);
    color: var(--merah);
}

.teks--aman {
    color: var(--teks);
}

.teks--menipis {
    color: var(--kuning);
}

.teks--habis {
    color: var(--merah);
}

/* ── bar ── */
.ukur {
    position: relative;
    display: flex;
    height: 6px;
    background: var(--latar);
    border-radius: 3px;
    overflow: hidden;
}

.ukur__gudang,
.ukur__tanki {
    transition: width .5s cubic-bezier(.22, 1, .36, 1);
}

.ukur__tanki {
    background: var(--biru);
    opacity: .45;
}

.ukur__ambang {
    position: absolute;
    top: -2px;
    bottom: -2px;
    left: var(--ambang);
    width: 2px;
    background: var(--teks);
    opacity: .35;
}

.isi--aman {
    background: var(--hijau);
}

.isi--menipis {
    background: var(--kuning);
}

.isi--habis {
    background: var(--merah);
}

.bahan__bawah {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: .55rem;
    font-size: .6875rem;
}

.bahan__wip {
    color: var(--biru);
}

.bahan__deviasi {
    color: var(--kuning);
}

.bahan__pemilik {
    margin-left: auto;
    display: flex;
    gap: .6rem;
    color: var(--redup);
}

.bahan__pemilik .minus {
    color: var(--merah);
    font-weight: 600;
}

/* ── hutang ── */
.hutang {
    padding: .5rem 1.25rem 1.1rem;
}

.hutang__baris {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: .6rem 0;
    border-bottom: 1px solid var(--latar);
}

.hutang__bahan {
    margin: 0 0 .12rem;
    font-size: .8125rem;
    font-weight: 600;
}

.hutang__akun {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup);
}

.hutang__qty {
    font-size: .875rem;
    font-weight: 700;
    color: var(--merah);
    white-space: nowrap;
}

.hutang__catatan {
    margin: .85rem 0 0;
    padding-top: .8rem;
    border-top: 1px solid var(--latar);
    font-size: .6875rem;
    color: var(--redup-2);
    line-height: 1.5;
}

/* ── legenda ── */
.legenda {
    list-style: none;
    margin: 0;
    padding: 1rem 1.25rem 0;
}

.legenda li {
    display: flex;
    align-items: center;
    gap: .55rem;
    padding: .35rem 0;
    font-size: .75rem;
    color: var(--teks-2);
}

.legenda__kotak {
    width: 14px;
    height: 6px;
    border-radius: 3px;
    flex-shrink: 0;
}

.legenda__kotak--tanki {
    background: var(--biru);
    opacity: .45;
}

.legenda__garis {
    width: 2px;
    height: 12px;
    background: var(--teks);
    opacity: .35;
    flex-shrink: 0;
    margin: 0 6px;
}

.legenda__catatan {
    margin: .5rem 0 0;
    padding: .8rem 1.25rem 1.1rem;
    font-size: .6875rem;
    color: var(--redup-2);
    line-height: 1.55;
}
</style>