<!--
  src/features/master/views/Customer.vue
  =======================================
  Master customer — BACA-SAJA. Kolom "Order" dihitung dari sumber SO yang
  sama dengan buku tagihan, jadi angkanya tidak mungkin beda antarlayar.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Master › Customer
                </p>
                <h1 class="judul">Customer</h1>
                <p class="sub">{{ jumlahAktif }} aktif. Alamat di sini yang jadi tujuan surat jalan.</p>
            </div>
            <input v-model="cari" type="search" class="cari" placeholder="Cari nama / kode / alamat" />
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca customer" />

        <section v-else-if="tampil.length" class="panel">
            <div class="tabel">
                <div class="tabel__kepala">
                    <span>Customer</span>
                    <span>Alamat</span>
                    <span>Telepon</span>
                    <span class="ka">Order</span>
                    <span class="ka">Status</span>
                </div>
                <div v-for="c in tampil" :key="c.id" class="tabel__baris" :class="{ redup: !c.aktif }">
                    <span class="sel-nama">
                        <span class="nama">{{ c.nama }}</span>
                        <small>{{ c.kode }} · {{ c.jenis === 'PERORANGAN' ? 'Perorangan' : 'Perusahaan' }}</small>
                    </span>
                    <span class="sel-redup">{{ c.alamat }}</span>
                    <span class="sel-redup">{{ c.telepon }}</span>
                    <span class="ka">
                        <template v-if="c.so.jumlah">
                            {{ c.so.jumlah }} SO
                            <small class="blok">terakhir {{ tanggalPendek(c.so.terakhir) }}</small>
                        </template>
                        <template v-else>—</template>
                    </span>
                    <span class="ka sel-redup">{{ c.aktif ? 'Aktif' : 'Nonaktif' }}</span>
                </div>
            </div>
        </section>

        <EmptyState v-else pesan="Tidak ada customer yang cocok."
            petunjuk="Ubah kata kunci pencarian." />
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useCustomer } from '@/features/master/composables/useCustomer'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const { tampil, isLoading, cari, jumlahAktif, muat } = useCustomer()

onMounted(muat)

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
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

.cari {
    font-family: inherit; font-size: .8125rem; color: var(--teks);
    background: var(--panel); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .5rem .75rem; min-width: 13rem;
}
.cari:focus { outline: none; border-color: var(--biru); }

.panel { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); overflow: hidden; }

.tabel { padding: .25rem 1.25rem .5rem; }
.tabel__kepala, .tabel__baris {
    display: grid; grid-template-columns: 1.5fr 1.7fr .9fr .8fr .6fr;
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
.blok { display: block; font-size: .6875rem; color: var(--redup-2); font-weight: 400; }

@media (max-width: 720px) {
    .tabel__kepala, .tabel__baris { grid-template-columns: 1.5fr 1fr .8fr; }
    .tabel__kepala span:nth-child(3), .tabel__baris > span:nth-child(3),
    .tabel__kepala span:nth-child(5), .tabel__baris > span:nth-child(5) { display: none; }
}
</style>
