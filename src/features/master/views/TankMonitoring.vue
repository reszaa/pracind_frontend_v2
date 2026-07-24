<!--
  src/features/master/views/TankMonitoring.vue
  =============================================
  CATATAN LOKASI: file ini dipindah dari features/rnd/views/ ke sini karena
  dipakai dua modul (Produksi & Gudang). Lokasi folder TIDAK menentukan
  akses — akses tetap lewat rute /rnd/tangki dan /warehouse/tangki.
  Composable-nya tetap useProduksi (rnd): datanya memang data produksi.
  Monitor tangki. Satu kartu per tangki: kosong atau sedang dipakai sesi
  apa, dan bahan apa saja yang ada di dalamnya.

  Isi tangki TIDAK dijumlahkan jadi satu angka — bahan bisa beda satuan
  (kg dan liter), dan menjumlahkannya menyesatkan. Daftarnya ditampilkan
  per bahan, sama seperti fisik_tanki di dashboard gudang.

  Menggantikan Mixing.vue & Combine.vue — backend tidak mencatat tahap
  mixing/blending terpisah; yang ada Tanki + isinya (keputusan PRD 21 Juli).

  AKSES: supervisor, PRODUKSI, dan GUDANG. Satu file ini terdaftar di DUA
  rute — /rnd/tangki (modul Produksi) dan /warehouse/tangki (modul Gudang) —
  supaya gudang bisa memantau tangki TANPA membuka formula (komposisi resep
  bukan konsumsi gudang). Breadcrumb menyesuaikan pintu masuknya.
  ⚠ Backend: permission GET produksi/tanki/ harus mengizinkan role GUDANG.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link :to="dariGudang ? '/warehouse' : '/rnd'">
                        {{ dariGudang ? 'Gudang' : 'Produksi' }}</router-link> › Tangki
                </p>
                <h1 class="judul">Monitor tangki</h1>
                <p class="sub">{{ terpakai.length }} dari {{ daftarTanki.length }} tangki sedang dipakai.</p>
            </div>
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca status tangki" />

        <div v-else-if="daftarTanki.length" class="kisi">
            <article v-for="t in daftarTanki" :key="t.id" class="tanki"
                :class="{ 'tanki--terpakai': t.status === 'TERPAKAI' }">
                <div class="tanki__atas">
                    <p class="tanki__nama">{{ t.nama }}</p>
                    <span class="lencana" :class="t.status === 'TERPAKAI' ? 'lencana--terpakai' : 'lencana--kosong'">
                        {{ t.status === 'TERPAKAI' ? 'Terpakai' : 'Kosong' }}
                    </span>
                </div>
                <p class="tanki__kapasitas">Kapasitas {{ angka(t.kapasitas) }} {{ t.uom_kapasitas }}</p>

                <template v-if="t.status === 'TERPAKAI'">
                    <component :is="dariGudang ? 'div' : 'router-link'" :to="dariGudang ? undefined : '/rnd'"
                        class="tanki__sesi">
                        {{ t.sesi_nomor }}
                        <small>{{ t.nama_produk }}</small>
                    </component>
                    <ul class="tanki__isi">
                        <li v-for="(b, i) in t.isi" :key="i">
                            <span>{{ b.nama_bahan }}</span>
                            <span class="ka">{{ angka(b.qty) }} {{ b.uom }}</span>
                        </li>
                    </ul>
                </template>

                <p v-else class="tanki__kosong">
                    Siap dipakai sesi berikutnya.
                </p>
            </article>
        </div>

        <EmptyState v-else pesan="Belum ada tangki terdaftar." />

        <p class="catatan">
            Bahan di tangki tidak bisa diambil dari rak — karena itu status
            HABIS/MENIPIS di dashboard gudang dihitung dari rak saja, dan isi
            tangki dilaporkan terpisah di sana.
        </p>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProduksi } from '@/features/rnd/composables/useProduksi'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const route = useRoute()
const dariGudang = computed(() => route.path.startsWith('/warehouse'))

const { daftarTanki, isLoading, muatTanki } = useProduksi()

onMounted(muatTanki)

const terpakai = computed(() =>
    daftarTanki.value.filter(t => t.status === 'TERPAKAI'),
)

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })
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

.kisi {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 1rem;
}

.tanki {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    padding: 1.15rem 1.25rem;
}

.tanki--terpakai {
    border-color: var(--biru);
}

.tanki__atas {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
}

.tanki__nama {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
}

.tanki__kapasitas {
    margin: .2rem 0 0;
    font-size: .75rem;
    color: var(--redup);
}

.lencana {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: .2rem .5rem;
    border-radius: 5px;
}

.lencana--terpakai {
    color: var(--biru);
    background: var(--biru-latar);
}

.lencana--kosong {
    color: var(--redup);
    background: var(--latar);
}

.tanki__sesi {
    display: block;
    margin-top: .85rem;
    padding: .55rem .7rem;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
    background: var(--biru-latar);
    border-radius: var(--lengkung-kecil);
    text-decoration: none;
}

.tanki__sesi small {
    display: block;
    font-weight: 400;
    color: var(--redup);
    margin-top: .1rem;
}

.tanki__sesi:hover {
    outline: 1px solid var(--biru);
}

.tanki__isi {
    list-style: none;
    margin: .6rem 0 0;
    padding: 0;
}

.tanki__isi li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: .4rem 0;
    font-size: .8125rem;
    color: var(--teks-2);
    border-bottom: 1px solid var(--garis);
}

.tanki__isi li:last-child {
    border-bottom: none;
}

.ka {
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.tanki__kosong {
    margin: .85rem 0 0;
    font-size: .8125rem;
    color: var(--redup-2);
}

.catatan {
    margin: 1.5rem 0 0;
    font-size: .8125rem;
    color: var(--redup-2);
    max-width: 40rem;
    line-height: 1.5;
}
</style>
