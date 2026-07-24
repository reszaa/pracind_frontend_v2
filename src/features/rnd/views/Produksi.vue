<!--
  src/features/rnd/views/Produksi.vue
  ====================================
  Sesi produksi. Menjawab: "apa yang sedang jalan di tangki, apa yang
  antre, dan apa yang sudah keluar bulan ini."

  Aksi satu-satunya di sini: CATAT PACKAGING pada sesi BERJALAN — menutup
  sesi, mengosongkan tangki, dan mendebit bahan (saldo + fisik tangki) di
  gudang. Membuat/menjadwalkan sesi belum ada karena service backend-nya
  belum ada; jangan ditambah sebelum kontraknya jelas.

  Catatan sesi tampil menonjol kalau ada — itu tempat info operasional
  seperti "menunggu Asam Sitrat, stok rak habis".
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> › Produksi
                </p>
                <h1 class="judul">Sesi produksi</h1>
                <p class="sub">Yang berjalan di tangki, yang antre, dan hasilnya.</p>
            </div>
        </header>

        <section class="metrik">
            <StatCard label="Sedang berjalan" :nilai="berjalan.length" kaki="Di dalam tangki" />
            <StatCard label="Dijadwalkan" :nilai="dijadwalkan.length" kaki="Menunggu tangki / bahan" />
            <StatCard label="Selesai bulan ini" :nilai="selesaiBulanIni.length" kaki="Sudah packaging" />
        </section>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Daftar sesi</h2>
                    <p class="panel__sub">Klik "Catat packaging" untuk menutup sesi berjalan</p>
                </div>
                <div class="tab" role="tablist">
                    <button v-for="t in saringan" :key="t.id" :class="{ on: saringStatus === t.id }" role="tab"
                        :aria-selected="saringStatus === t.id" @click="saringStatus = t.id">{{ t.label }}</button>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca sesi produksi" />

            <div v-else-if="tampil.length" class="daftar">
                <article v-for="s in tampil" :key="s.id" class="sesi">
                    <div class="sesi__atas">
                        <div>
                            <p class="sesi__nomor">{{ s.nomor }}</p>
                            <p class="sesi__produk">
                                {{ s.formula_detail.nama_produk }}
                                <small>v{{ s.formula_detail.versi }} · {{ s.akun_detail?.kode }}</small>
                            </p>
                        </div>
                        <div class="sesi__kanan">
                            <span class="lencana" :class="`lencana--${s.status.toLowerCase()}`">
                                {{ labelStatus(s.status) }}
                            </span>
                            <p class="sesi__waktu">{{ ringkasWaktu(s) }}</p>
                        </div>
                    </div>

                    <div class="sesi__isi">
                        <span class="sesi__target">
                            Target {{ angka(s.target_qty) }} {{ s.uom_hasil }}
                            <template v-if="s.hasil_qty"> · hasil {{ angka(s.hasil_qty) }} {{ s.uom_hasil }}</template>
                            <template v-if="s.tanki_detail"> · {{ s.tanki_detail.nama }}</template>
                        </span>
                        <span v-if="s.bahan_terpakai.length" class="sesi__bahan">
                            <span v-for="b in s.bahan_terpakai" :key="b.id" class="sesi__chip">
                                {{ b.nama_bahan }} {{ angka(b.qty) }} {{ b.uom }}
                            </span>
                        </span>
                        <span v-if="s.hasil_packaging.length" class="sesi__kemasan">
                            <span v-for="k in s.hasil_packaging" :key="k.id">
                                {{ k.jumlah }}× {{ k.kemasan }}
                            </span>
                        </span>
                    </div>

                    <p v-if="s.catatan" class="sesi__catatan">{{ s.catatan }}</p>

                    <div v-if="s.status === 'BERJALAN'" class="sesi__aksi">
                        <button class="tbl tbl--utama" @click="bukaForm(s)">
                            {{ formSesi === s.id ? 'Tutup' : 'Catat packaging' }}
                        </button>
                    </div>

                    <!-- ── form packaging (inline, sesi berjalan) ─────── -->
                    <div v-if="formSesi === s.id" class="paket">
                        <div class="paket__baris">
                            <label class="isian">
                                <span class="isian__label">Hasil jadi ({{ s.uom_hasil }})</span>
                                <input v-model.number="draf.hasil_qty" type="number" min="0" step="0.01"
                                    :placeholder="s.target_qty" />
                            </label>
                        </div>

                        <fieldset class="isian">
                            <legend class="isian__label">Kemasan</legend>
                            <div v-for="(k, i) in draf.kemasan" :key="i" class="paket__kemasan">
                                <input v-model="k.nama" type="text" placeholder="Pail 25KG / Jerigen 5L" />
                                <input v-model.number="k.jumlah" type="number" min="1" step="1" placeholder="0" />
                                <button type="button" class="hapus" :disabled="draf.kemasan.length === 1"
                                    aria-label="Hapus kemasan" @click="hapusKemasan(i)">×</button>
                            </div>
                            <button type="button" class="tbl tbl--kecil" @click="draf.kemasan.push({ nama: '', jumlah: null })">
                                + Tambah kemasan
                            </button>
                        </fieldset>

                        <label class="isian">
                            <span class="isian__label">Catatan <em>opsional</em></span>
                            <input v-model="draf.catatan" type="text"
                                placeholder="Contoh: 2 pail disisihkan untuk sampel QC" />
                        </label>

                        <p v-if="pesan" class="galat">{{ pesan }}</p>

                        <div class="paket__aksi">
                            <button type="button" class="tbl" @click="tutupForm">Batal</button>
                            <button type="button" class="tbl tbl--utama" :disabled="sedangSimpan" @click="kirim(s)">
                                {{ sedangSimpan ? 'Menyimpan' : 'Selesaikan sesi' }}
                            </button>
                        </div>
                        <p class="paket__info">
                            Menyelesaikan sesi mengosongkan {{ s.tanki_detail?.nama ?? 'tangki' }} dan
                            mendebit bahan dari saldo {{ s.akun_detail?.kode }} di gudang.
                        </p>
                    </div>
                </article>
            </div>

            <EmptyState v-else pesan="Tidak ada sesi pada saringan ini."
                petunjuk="Ubah saringan status di kanan atas." />
        </section>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useProduksi } from '@/features/rnd/composables/useProduksi'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    tampil, isLoading, sedangSimpan, saringStatus,
    berjalan, dijadwalkan, selesaiBulanIni,
    muatSesi, catatPackaging,
} = useProduksi()

onMounted(muatSesi)

const saringan = [
    { id: 'semua', label: 'Semua' },
    { id: 'berjalan', label: 'Berjalan' },
    { id: 'dijadwalkan', label: 'Antre' },
    { id: 'selesai', label: 'Selesai' },
]

const formSesi = ref(null)
const pesan = ref('')
const draf = reactive({ hasil_qty: null, kemasan: [{ nama: '', jumlah: null }], catatan: '' })

const bukaForm = (s) => {
    if (formSesi.value === s.id) return tutupForm()
    formSesi.value = s.id
    pesan.value = ''
    Object.assign(draf, { hasil_qty: null, kemasan: [{ nama: '', jumlah: null }], catatan: '' })
}
const tutupForm = () => { formSesi.value = null; pesan.value = '' }
const hapusKemasan = (i) => {
    if (draf.kemasan.length > 1) draf.kemasan.splice(i, 1)
}

const kirim = async (s) => {
    pesan.value = ''
    const hasil = await catatPackaging(s.id, {
        hasil_qty: draf.hasil_qty,
        kemasan: draf.kemasan,
        catatan: draf.catatan,
    })
    if (hasil.success) tutupForm()
    else pesan.value = hasil.message
}

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const tanggalJam = (iso) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

const ringkasWaktu = (s) => {
    if (s.status === 'DIJADWALKAN') return 'Belum dimulai'
    if (s.status === 'BERJALAN') return `Mulai ${tanggalJam(s.mulai_pada)}`
    return `Selesai ${tanggalJam(s.selesai_pada)}`
}

const labelStatus = (st) => ({
    DIJADWALKAN: 'Antre',
    BERJALAN: 'Berjalan',
    SELESAI: 'Selesai',
}[st] ?? st)
</script>

<style scoped>
.kepala { margin-bottom: 1.5rem; }
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
.sesi { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--garis); }
.sesi:last-child { border-bottom: none; }

.sesi__atas { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.sesi__nomor { margin: 0; font-size: .6875rem; font-weight: 700; letter-spacing: .06em; color: var(--redup-2); }
.sesi__produk { margin: .2rem 0 0; font-size: .9375rem; font-weight: 600; }
.sesi__produk small { font-weight: 400; color: var(--redup); margin-left: .3rem; }
.sesi__kanan { text-align: right; }
.sesi__waktu { margin: .35rem 0 0; font-size: .6875rem; color: var(--redup-2); }

.lencana { font-size: .625rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 5px; }
.lencana--berjalan { color: var(--biru); background: var(--biru-latar); }
.lencana--dijadwalkan { color: var(--kuning); background: var(--kuning-latar); }
.lencana--selesai { color: var(--hijau); background: var(--hijau-latar); }

.sesi__isi { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; margin-top: .6rem; }
.sesi__target { font-size: .8125rem; color: var(--teks-2); }
.sesi__bahan { display: flex; gap: .35rem; flex-wrap: wrap; }
.sesi__chip { font-size: .6875rem; color: var(--redup); background: var(--latar); padding: .15rem .45rem; border-radius: 5px; }
.sesi__kemasan { font-size: .75rem; color: var(--hijau); font-weight: 500; display: flex; gap: .6rem; }

.sesi__catatan {
    margin: .6rem 0 0; padding: .55rem .75rem; font-size: .8125rem;
    color: var(--kuning); background: var(--kuning-latar);
    border: 1px solid var(--kuning-garis); border-radius: var(--lengkung-kecil);
}

.sesi__aksi { margin-top: .75rem; }

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
.tbl--kecil { font-size: .75rem; padding: .35rem .6rem; margin-top: .4rem; }

.paket { margin-top: .9rem; padding: 1rem; background: var(--latar); border: 1px solid var(--garis); border-radius: var(--lengkung-kecil); }
.paket__baris { margin-bottom: .9rem; max-width: 16rem; }
.paket__kemasan { display: grid; grid-template-columns: 1fr 6rem 2rem; gap: .5rem; margin-bottom: .5rem; }
.paket__aksi { display: flex; gap: .6rem; justify-content: flex-end; margin-top: .9rem; }
.paket__info { margin: .7rem 0 0; font-size: .75rem; color: var(--redup-2); }

.isian { display: block; border: none; padding: 0; margin: 0 0 .9rem; }
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

.hapus {
    font-family: inherit; font-size: 1rem; color: var(--redup);
    background: none; border: 1px solid var(--garis); border-radius: var(--lengkung-kecil); cursor: pointer;
}
.hapus:hover:not(:disabled) { color: var(--merah); border-color: var(--merah); }
.hapus:disabled { opacity: .35; cursor: default; }

.galat {
    margin: 0 0 .75rem; padding: .6rem .8rem; font-size: .8125rem; color: var(--merah);
    background: var(--merah-latar); border-radius: var(--lengkung-kecil); white-space: pre-line;
}

@media (max-width: 640px) {
    .sesi__atas { flex-direction: column; }
    .sesi__kanan { text-align: left; }
}
</style>
