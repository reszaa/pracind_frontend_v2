<!--
  src/features/logistic/views/Monitor.vue
  ========================================
  Pantau kiriman — layar kerja utama logistik. Dua aksi siklus SJ ada di
  sini (menggantikan Confirm.vue & Review.vue yang kosong):

    DISIAPKAN         -> tombol "Berangkat"       (truk keluar; SO jadi DELIVERY)
    DALAM_PERJALANAN  -> tombol "Tandai terkirim" (form penerima/POD; SO bisa
                                                   COMPLETED kalau sudah penuh)

  Keputusan siapa pemilik transisi status SO ada di useLogistic — layar ini
  hanya memicu kejadian fisiknya.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Pengiriman
                </p>
                <h1 class="judul">Pantau kiriman</h1>
                <p class="sub">Surat jalan yang disiapkan, di jalan, dan sudah sampai.</p>
            </div>
            <router-link to="/logistic/buat" class="tbl tbl--utama">Buat surat jalan</router-link>
        </header>

        <section class="metrik">
            <StatCard label="Di jalan" :nilai="dalamPerjalanan.length" kaki="Sedang menuju customer" />
            <StatCard label="Disiapkan" :nilai="disiapkan.length" kaki="Menunggu berangkat" />
            <StatCard label="Terkirim 7 hari" :nilai="terkirimPekanIni.length" kaki="POD terkonfirmasi" />
        </section>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Surat jalan</h2>
                    <p class="panel__sub">Terbaru di atas</p>
                </div>
                <div class="tab" role="tablist">
                    <button v-for="t in saringan" :key="t.id" :class="{ on: saringStatus === t.id }" role="tab"
                        :aria-selected="saringStatus === t.id" @click="saringStatus = t.id">{{ t.label }}</button>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca surat jalan" />

            <div v-else-if="tampil.length" class="daftar">
                <article v-for="sj in tampil" :key="sj.id" class="sj">
                    <div class="sj__atas">
                        <div>
                            <p class="sj__nomor">{{ sj.nomor }} · <span class="sj__so">{{ sj.so_nomor }}</span></p>
                            <p class="sj__customer">{{ sj.customer_detail?.nama }}</p>
                            <p class="sj__alamat">{{ sj.alamat_tujuan || '—' }}</p>
                        </div>
                        <div class="sj__kanan">
                            <span class="lencana" :class="`lencana--${sj.status.toLowerCase()}`">
                                {{ labelStatus(sj.status) }}
                            </span>
                            <p class="sj__waktu">{{ ringkasWaktu(sj) }}</p>
                        </div>
                    </div>

                    <div class="sj__isi">
                        <span class="sj__kurir" v-if="sj.kurir_detail">
                            {{ sj.kurir_detail.nama }} · {{ sj.kurir_detail.plat }}
                        </span>
                        <span class="sj__barang">
                            <span v-for="i in sj.daftar_item" :key="i.id" class="sj__chip">
                                {{ angka(i.qty) }}× {{ i.nama_item }}
                            </span>
                        </span>
                    </div>

                    <p v-if="sj.penerima" class="sj__pod">
                        Diterima {{ sj.penerima }}
                    </p>
                    <p v-if="sj.catatan" class="sj__catatan">{{ sj.catatan }}</p>

                    <div v-if="sj.status === 'DISIAPKAN'" class="sj__aksi">
                        <button class="tbl tbl--utama" :disabled="sedangSimpan" @click="jalan(sj)">
                            Berangkat
                        </button>
                        <span class="sj__hint">SO menjadi DELIVERY begitu truk jalan.</span>
                    </div>

                    <div v-else-if="sj.status === 'DALAM_PERJALANAN'" class="sj__aksi">
                        <button class="tbl" @click="bukaPOD(sj)">
                            {{ podSj === sj.id ? 'Tutup' : 'Tandai terkirim' }}
                        </button>
                    </div>

                    <!-- form POD inline -->
                    <div v-if="podSj === sj.id" class="pod">
                        <div class="pod__baris">
                            <label class="isian">
                                <span class="isian__label">Nama penerima</span>
                                <input v-model="draf.penerima" type="text" placeholder="Bpk. Andi — Gudang" />
                            </label>
                            <label class="isian">
                                <span class="isian__label">Catatan <em>opsional</em></span>
                                <input v-model="draf.catatan" type="text" placeholder="POD ditandatangani" />
                            </label>
                        </div>
                        <p v-if="pesan" class="galat">{{ pesan }}</p>
                        <div class="pod__aksi">
                            <button type="button" class="tbl" @click="tutupPOD">Batal</button>
                            <button type="button" class="tbl tbl--utama" :disabled="sedangSimpan" @click="konfirmasi(sj)">
                                {{ sedangSimpan ? 'Menyimpan' : 'Konfirmasi sampai' }}
                            </button>
                        </div>
                    </div>
                </article>
            </div>

            <EmptyState v-else pesan="Tidak ada surat jalan pada saringan ini."
                petunjuk="Ubah saringan status, atau buat surat jalan baru." />
        </section>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useLogistic } from '@/features/logistic/composables/useLogistic'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampil, isLoading, sedangSimpan, saringStatus,
    dalamPerjalanan, disiapkan, terkirimPekanIni,
    muat, berangkat, terkirim,
} = useLogistic()

onMounted(muat)

const saringan = [
    { id: 'semua', label: 'Semua' },
    { id: 'disiapkan', label: 'Disiapkan' },
    { id: 'dalam_perjalanan', label: 'Di jalan' },
    { id: 'terkirim', label: 'Terkirim' },
]

const podSj = ref(null)
const pesan = ref('')
const draf = reactive({ penerima: '', catatan: '' })

const jalan = async (sj) => {
    pesan.value = ''
    const hasil = await berangkat(sj.id)
    if (!hasil.success) pesan.value = hasil.message
}

const bukaPOD = (sj) => {
    if (podSj.value === sj.id) return tutupPOD()
    podSj.value = sj.id
    pesan.value = ''
    Object.assign(draf, { penerima: '', catatan: '' })
}
const tutupPOD = () => { podSj.value = null; pesan.value = '' }

const konfirmasi = async (sj) => {
    pesan.value = ''
    const hasil = await terkirim(sj.id, { penerima: draf.penerima, catatan: draf.catatan })
    if (hasil.success) tutupPOD()
    else pesan.value = hasil.message
}

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const tanggalJam = (iso) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

const ringkasWaktu = (sj) => {
    if (sj.status === 'DISIAPKAN') return `Disiapkan ${tanggalJam(sj.dibuat_pada)}`
    if (sj.status === 'DALAM_PERJALANAN') return `Berangkat ${tanggalJam(sj.berangkat_pada)}`
    if (sj.status === 'TERKIRIM') return `Tiba ${tanggalJam(sj.tiba_pada)}`
    return ''
}

const labelStatus = (st) => ({
    DISIAPKAN: 'Disiapkan',
    DALAM_PERJALANAN: 'Di jalan',
    TERKIRIM: 'Terkirim',
    DIBATALKAN: 'Dibatalkan',
}[st] ?? st)
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

.metrik {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 1px; background: var(--garis); border: 1px solid var(--garis);
    border-radius: var(--lengkung); overflow: hidden; margin-bottom: 1.25rem;
}

.panel { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); overflow: hidden; }
.panel__kepala {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    flex-wrap: wrap; padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--garis);
}
.panel__judul { margin: 0; font-size: .9375rem; font-weight: 700; }
.panel__sub { margin: .2rem 0 0; font-size: .75rem; color: var(--redup); }

.tab { display: flex; gap: .25rem; background: var(--latar); border: 1px solid var(--garis); border-radius: var(--lengkung-kecil); padding: .2rem; }
.tab button {
    font-family: inherit; font-size: .75rem; color: var(--redup);
    background: none; border: none; border-radius: 6px; padding: .35rem .7rem; cursor: pointer;
}
.tab button.on { background: var(--panel); color: var(--teks); font-weight: 600; box-shadow: var(--bayang); }

.daftar { display: flex; flex-direction: column; }
.sj { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--garis); }
.sj:last-child { border-bottom: none; }

.sj__atas { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.sj__nomor { margin: 0; font-size: .6875rem; font-weight: 700; letter-spacing: .06em; color: var(--redup-2); }
.sj__so { font-weight: 400; }
.sj__customer { margin: .2rem 0 0; font-size: .9375rem; font-weight: 600; }
.sj__alamat { margin: .1rem 0 0; font-size: .75rem; color: var(--redup); }
.sj__kanan { text-align: right; flex-shrink: 0; }
.sj__waktu { margin: .35rem 0 0; font-size: .6875rem; color: var(--redup-2); }

.lencana { font-size: .625rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 5px; }
.lencana--disiapkan { color: var(--kuning); background: var(--kuning-latar); }
.lencana--dalam_perjalanan { color: var(--biru); background: var(--biru-latar); }
.lencana--terkirim { color: var(--hijau); background: var(--hijau-latar); }
.lencana--dibatalkan { color: var(--redup); background: var(--latar); }

.sj__isi { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; margin-top: .6rem; }
.sj__kurir { font-size: .8125rem; color: var(--teks-2); font-weight: 500; }
.sj__barang { display: flex; gap: .35rem; flex-wrap: wrap; }
.sj__chip { font-size: .6875rem; color: var(--redup); background: var(--latar); padding: .15rem .45rem; border-radius: 5px; }

.sj__pod { margin: .5rem 0 0; font-size: .8125rem; color: var(--hijau); font-weight: 500; }
.sj__catatan { margin: .4rem 0 0; font-size: .75rem; color: var(--redup); }

.sj__aksi { display: flex; align-items: center; gap: .75rem; margin-top: .75rem; }
.sj__hint { font-size: .6875rem; color: var(--redup-2); }

.tbl {
    display: inline-flex; align-items: center; gap: .35rem;
    font-family: inherit; font-size: .8125rem; font-weight: 500;
    color: var(--teks); background: var(--panel); border: 1px solid var(--garis-tegas);
    border-radius: var(--lengkung-kecil); padding: .5rem .9rem; cursor: pointer; text-decoration: none;
}
.tbl:hover { border-color: var(--teks); }
.tbl--utama { color: var(--panel); background: var(--teks); border-color: var(--teks); }
.tbl--utama:hover { opacity: .88; }
.tbl--utama:disabled { opacity: .5; cursor: default; }

.pod { margin-top: .9rem; padding: 1rem; background: var(--latar); border: 1px solid var(--garis); border-radius: var(--lengkung-kecil); }
.pod__baris { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.pod__aksi { display: flex; gap: .6rem; justify-content: flex-end; margin-top: .5rem; }

.isian { display: block; margin: 0 0 .75rem; }
.isian__label {
    display: block; margin-bottom: .35rem; font-size: .6875rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--redup);
}
.isian__label em { font-style: normal; font-weight: 400; letter-spacing: 0; text-transform: none; }
.isian input {
    width: 100%; font-family: inherit; font-size: .875rem; color: var(--teks);
    background: var(--panel); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .55rem .7rem;
}
.isian input:focus { outline: none; border-color: var(--biru); }

.galat {
    margin: 0 0 .75rem; padding: .6rem .8rem; font-size: .8125rem; color: var(--merah);
    background: var(--merah-latar); border-radius: var(--lengkung-kecil); white-space: pre-line;
}

@media (max-width: 640px) {
    .sj__atas { flex-direction: column; }
    .sj__kanan { text-align: left; }
    .pod__baris { grid-template-columns: 1fr; }
}
</style>
