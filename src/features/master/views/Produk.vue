<!--
  src/features/master/views/Produk.vue
  =====================================
  Master produk jadi — BACA-SAJA. Kolom "Formula" ditarik dari master
  formula lewat nama_produk: produk aktif TANPA formula aktif ditandai
  merah karena tidak bisa diproduksi — kondisi yang harus terlihat.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Master › Produk
                </p>
                <h1 class="judul">Produk</h1>
                <p class="sub">
                    {{ jumlahAktif }} aktif. Kemasan &amp; satuan masih teks bebas —
                    belum jadi tabel master.
                </p>
            </div>
            <div class="alat">
                <input v-model="cari" type="search" class="cari" placeholder="Cari produk" />
                <label class="saklar">
                    <input v-model="hanyaAktif" type="checkbox" />
                    Hanya aktif
                </label>
            </div>
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca produk" />

        <section v-else-if="tampil.length" class="panel">
            <div class="tabel">
                <div class="tabel__kepala">
                    <span>Produk</span>
                    <span>Kemasan</span>
                    <span>Formula</span>
                    <span class="ka">Harga jual</span>
                    <span class="ka">Status</span>
                </div>
                <div v-for="p in tampil" :key="p.id" class="tabel__baris" :class="{ redup: !p.aktif }">
                    <span class="sel-nama">
                        <span class="nama">{{ p.nama }}</span>
                        <small>{{ p.nama_produk }}</small>
                    </span>
                    <span class="sel-redup">{{ p.kemasan }} · per {{ p.satuan }}</span>
                    <span>
                        <router-link v-if="p.formula_aktif" to="/rnd/formula" class="formula">
                            v{{ p.formula_aktif.versi }} aktif
                        </router-link>
                        <span v-else-if="p.aktif" class="formula formula--kosong">Tanpa formula aktif</span>
                        <span v-else class="sel-redup">—</span>
                    </span>
                    <span class="ka">{{ rp(p.harga_jual) }}</span>
                    <span class="ka sel-redup">{{ p.aktif ? 'Aktif' : 'Nonaktif' }}</span>
                </div>
            </div>
        </section>

        <EmptyState v-else pesan="Tidak ada produk yang cocok."
            petunjuk="Ubah kata kunci atau matikan saringan aktif." />
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useProduk } from '@/features/master/composables/useProduk'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampil, isLoading, cari, hanyaAktif, jumlahAktif, muat,
} = useProduk()

onMounted(muat)

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
</script>

<style scoped>
.kepala {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;
}
.remah { margin: 0 0 .3rem; font-size: .75rem; color: var(--redup-2); }
.remah a { color: var(--redup); text-decoration: none; }
.remah a:hover { color: var(--teks); text-decoration: underline; }
.judul { margin: 0; font-size: 1.625rem; font-weight: 700; letter-spacing: -.02em; }
.sub { margin: .3rem 0 0; font-size: .875rem; color: var(--redup); }

.alat { display: flex; align-items: center; gap: .75rem; }
.cari {
    font-family: inherit; font-size: .8125rem; color: var(--teks);
    background: var(--panel); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .5rem .75rem; min-width: 11rem;
}
.cari:focus { outline: none; border-color: var(--biru); }
.saklar { display: flex; align-items: center; gap: .4rem; font-size: .8125rem; color: var(--teks-2); cursor: pointer; }

.panel { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); overflow: hidden; }

.tabel { padding: .25rem 1.25rem .5rem; }
.tabel__kepala, .tabel__baris {
    display: grid; grid-template-columns: 1.6fr 1fr 1fr .9fr .6fr;
    gap: .75rem; align-items: center; padding: .65rem 0; font-size: .8125rem;
}
.tabel__kepala {
    font-size: .625rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--redup-2);
    border-bottom: 1px solid var(--garis);
}
.tabel__baris { border-bottom: 1px solid var(--garis); color: var(--teks-2); }
.tabel__baris:last-child { border-bottom: none; }
.tabel__baris.redup { opacity: .5; }

.sel-nama { display: flex; flex-direction: column; gap: .1rem; }
.sel-nama .nama { font-weight: 600; color: var(--teks); }
.sel-nama small { font-size: .6875rem; color: var(--redup-2); }
.sel-redup { color: var(--redup); }
.ka { text-align: right; font-variant-numeric: tabular-nums; }

.formula { font-size: .75rem; font-weight: 600; color: var(--hijau); text-decoration: none; }
.formula:hover { text-decoration: underline; }
.formula--kosong { color: var(--merah); }

@media (max-width: 720px) {
    .tabel__kepala, .tabel__baris { grid-template-columns: 1.6fr 1fr .8fr; }
    .tabel__kepala span:nth-child(2), .tabel__baris > span:nth-child(2),
    .tabel__kepala span:nth-child(5), .tabel__baris > span:nth-child(5) { display: none; }
}
</style>
