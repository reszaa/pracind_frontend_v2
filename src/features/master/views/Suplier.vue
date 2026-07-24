<!--
  src/features/master/views/Suplier.vue
  =======================================
  Master suplier — BACA-SAJA. Sumber datanya sama persis dengan yang
  dipakai form Buat PO. Tambah/ubah butuh service backend yang belum ada
  (form tambah suplier yang kosong ikut dihapus karena alasan ini).
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Master › Suplier
                </p>
                <h1 class="judul">Suplier</h1>
                <p class="sub">{{ jumlahAktif }} aktif. Termin di sini yang mengisi jatuh tempo PO otomatis.</p>
            </div>
            <div class="alat">
                <input v-model="cari" type="search" class="cari" placeholder="Cari nama / kota" />
                <div class="tab" role="tablist">
                    <button v-for="t in saringan" :key="t.id" :class="{ on: saringKategori === t.id }" role="tab"
                        :aria-selected="saringKategori === t.id" @click="saringKategori = t.id">{{ t.label }}</button>
                </div>
            </div>
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca suplier" />

        <section v-else-if="tampil.length" class="panel">
            <div class="tabel">
                <div class="tabel__kepala">
                    <span>Suplier</span>
                    <span>Kategori</span>
                    <span>Kota</span>
                    <span class="ka">Termin</span>
                    <span class="ka">Status</span>
                </div>
                <div v-for="s in tampil" :key="s.id" class="tabel__baris" :class="{ redup: !s.aktif }">
                    <span class="sel-nama">
                        <span class="nama">{{ s.nama }}</span>
                        <small>{{ s.kode }} · {{ s.jenis === 'PERORANGAN' ? 'Perorangan' : 'Perusahaan' }}</small>
                    </span>
                    <span>
                        <span class="lencana" :class="s.kategori === 'KEMASAN' ? 'lencana--kemasan' : 'lencana--raw'">
                            {{ s.kategori === 'KEMASAN' ? 'Kemasan' : 'Bahan baku' }}
                        </span>
                    </span>
                    <span class="sel-redup">{{ s.kota }}</span>
                    <span class="ka">{{ s.termin_pembayaran_hari > 0 ? `${s.termin_pembayaran_hari} hari` : 'Tunai' }}</span>
                    <span class="ka sel-redup">{{ s.aktif ? 'Aktif' : 'Nonaktif' }}</span>
                </div>
            </div>
        </section>

        <EmptyState v-else pesan="Tidak ada suplier yang cocok."
            petunjuk="Ubah kata kunci atau saringan kategori." />
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSuplier } from '@/features/master/composables/useSuplier'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampil, isLoading, cari, saringKategori, jumlahAktif, muat,
} = useSuplier()

onMounted(muat)

const saringan = [
    { id: 'semua', label: 'Semua' },
    { id: 'raw_material', label: 'Bahan baku' },
    { id: 'kemasan', label: 'Kemasan' },
]
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

.alat { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.cari {
    font-family: inherit; font-size: .8125rem; color: var(--teks);
    background: var(--panel); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .5rem .75rem; min-width: 11rem;
}
.cari:focus { outline: none; border-color: var(--biru); }

.tab { display: flex; gap: .25rem; background: var(--latar); border: 1px solid var(--garis); border-radius: var(--lengkung-kecil); padding: .2rem; }
.tab button {
    font-family: inherit; font-size: .75rem; color: var(--redup);
    background: none; border: none; border-radius: 6px; padding: .35rem .7rem; cursor: pointer;
}
.tab button.on { background: var(--panel); color: var(--teks); font-weight: 600; box-shadow: var(--bayang); }

.panel { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); overflow: hidden; }

.tabel { padding: .25rem 1.25rem .5rem; }
.tabel__kepala, .tabel__baris {
    display: grid; grid-template-columns: 1.8fr 1fr .9fr .7fr .7fr;
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

.lencana { font-size: .625rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 5px; }
.lencana--raw { color: var(--biru); background: var(--biru-latar); }
.lencana--kemasan { color: var(--kuning); background: var(--kuning-latar); }

@media (max-width: 720px) {
    .tabel__kepala, .tabel__baris { grid-template-columns: 1.6fr 1fr .8fr; }
    .tabel__kepala span:nth-child(3), .tabel__baris > span:nth-child(3),
    .tabel__kepala span:nth-child(5), .tabel__baris > span:nth-child(5) { display: none; }
}
</style>
