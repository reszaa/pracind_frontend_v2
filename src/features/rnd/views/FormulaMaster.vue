<!--
  src/features/rnd/views/FormulaMaster.vue
  =========================================
  Master formula — BACA-SAJA. Merevisi formula adalah keputusan R&D yang
  butuh approval; tombol edit sengaja tidak ada sebelum service dan aturan
  approval-nya jelas di backend.

  Versi lama produk tetap ditampilkan (redup) — sesi produksi historis
  menunjuk versinya masing-masing, jadi riwayat harus bisa dibaca.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/rnd">Produksi</router-link> › Formula
                </p>
                <h1 class="judul">Formula produk</h1>
                <p class="sub">{{ jumlahAktif }} formula aktif. Revisi formula lewat R&amp;D, bukan dari layar ini.</p>
            </div>
            <div class="alat">
                <input v-model="cari" type="search" class="cari" placeholder="Cari produk" />
                <label class="saklar">
                    <input v-model="hanyaAktif" type="checkbox" />
                    Hanya aktif
                </label>
            </div>
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca formula" />

        <div v-else-if="tampil.length" class="kisi">
            <article v-for="f in tampil" :key="f.id" class="formula" :class="{ 'formula--nonaktif': !f.aktif }">
                <div class="formula__atas">
                    <div>
                        <p class="formula__nama">{{ f.nama_produk }}</p>
                        <p class="formula__meta">
                            v{{ f.versi }} · target {{ angka(f.target_batch) }} {{ f.uom_hasil }}/batch
                            · diperbarui {{ tanggalPendek(f.diperbarui_pada) }}
                        </p>
                    </div>
                    <span class="lencana" :class="f.aktif ? 'lencana--aktif' : 'lencana--nonaktif'">
                        {{ f.aktif ? 'Aktif' : 'Nonaktif' }}
                    </span>
                </div>

                <div class="komposisi">
                    <div class="komposisi__kepala">
                        <span>Bahan</span>
                        <span class="ka">Per batch</span>
                    </div>
                    <div v-for="k in f.komposisi" :key="k.id" class="komposisi__baris">
                        <span>{{ k.nama_bahan }}</span>
                        <span class="ka">{{ angka(k.qty) }} {{ k.uom }}</span>
                    </div>
                </div>

                <p v-if="f.catatan" class="formula__catatan">{{ f.catatan }}</p>
            </article>
        </div>

        <EmptyState v-else pesan="Tidak ada formula yang cocok."
            petunjuk="Ubah kata kunci atau matikan saringan aktif." />
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFormula } from '@/features/rnd/composables/useFormula'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampil, isLoading, cari, hanyaAktif, jumlahAktif, muat,
} = useFormula()

onMounted(muat)

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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
    border-radius: var(--lengkung-kecil); padding: .5rem .75rem; min-width: 12rem;
}
.cari:focus { outline: none; border-color: var(--biru); }
.saklar { display: flex; align-items: center; gap: .4rem; font-size: .8125rem; color: var(--teks-2); cursor: pointer; }

.kisi { display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; }

.formula { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); padding: 1.15rem 1.25rem; }
.formula--nonaktif { opacity: .55; }

.formula__atas { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.formula__nama { margin: 0; font-size: 1rem; font-weight: 700; }
.formula__meta { margin: .25rem 0 0; font-size: .75rem; color: var(--redup); }

.lencana { font-size: .625rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 5px; flex-shrink: 0; }
.lencana--aktif { color: var(--hijau); background: var(--hijau-latar); }
.lencana--nonaktif { color: var(--redup); background: var(--latar); }

.komposisi { margin-top: .9rem; border-top: 1px solid var(--garis); }
.komposisi__kepala, .komposisi__baris {
    display: flex; justify-content: space-between; gap: 1rem;
    padding: .5rem 0; font-size: .8125rem;
}
.komposisi__kepala {
    font-size: .625rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--redup-2);
    border-bottom: 1px solid var(--garis);
}
.komposisi__baris { border-bottom: 1px solid var(--garis); color: var(--teks-2); }
.komposisi__baris:last-child { border-bottom: none; }
.ka { text-align: right; font-variant-numeric: tabular-nums; }

.formula__catatan {
    margin: .75rem 0 0; padding: .55rem .75rem; font-size: .8125rem;
    color: var(--kuning); background: var(--kuning-latar);
    border: 1px solid var(--kuning-garis); border-radius: var(--lengkung-kecil);
}
</style>
