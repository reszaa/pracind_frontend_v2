<!--
  src/features/master/views/Suplier.vue
  ======================================
  Master Supplier — layar master-detail: kiri daftar, tengah identitas +
  posisi hutang + kontak, kanan riwayat mutasi/pembayaran.

  Gaya mengikuti konvensi modul accounting: token tema.css (BUKAN warna
  Tailwind mentah), komponen EmptyState/LoadingBar, panel bersih dengan
  border --garis lembut. Struktur mencerminkan PaymentSuplier.vue.

  ⚠ REKONSTRUKSI DARI SCREENSHOT — asumsi bentuk data ditandai di bawah.
  Kalau nama field composable-mu berbeda, sesuaikan bagian <script> saja;
  <style> dan class di <template> bisa dipakai apa adanya.

  Kontrak data yang diasumsikan (samakan dengan API-mu):
    supplier : { id, nama, kode, status('AKTIF'|'NONAKTIF'), tipe,
                 pic, telp, kota, bank, rekening, total_hutang }
    mutasi   : { id, tanggal, nomor, keterangan, nominal, arah('MASUK'|'KELUAR') }
-->
<template>
    <div>
        <header class="kepala">
            <p class="remah">
                <router-link to="/">Dashboard</router-link> ›
                <router-link to="/master">Master Data</router-link> › Suplier
            </p>
            <h1 class="judul">Master supplier</h1>
            <p class="sub">Data induk supplier beserta posisi hutang dan riwayat pembayaran.</p>
        </header>

        <div class="tata">
            <!-- ── kiri: daftar supplier ──────────────────────────── -->
            <section class="panel daftar">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Daftar suplier</h2>
                        <p class="panel__sub">{{ terfilter.length }} supplier terdaftar</p>
                    </div>
                </div>

                <div class="daftar__cari">
                    <i class="pi pi-search"></i>
                    <input v-model="cari" type="search" placeholder="Cari nama atau kode…" />
                </div>

                <LoadingBar v-if="isLoading" pesan="Membaca data supplier" />

                <div v-else-if="terfilter.length" class="daftar__isi">
                    <button v-for="s in terfilter" :key="s.id" class="item"
                        :class="{ 'item--pilih': pilihan?.id === s.id }" @click="pilih(s)">
                        <span class="item__aksen" :class="{ 'item__aksen--aktif': aktif(s) }"></span>
                        <span class="item__teks">
                            <span class="item__nama">{{ s.nama }}</span>
                            <span class="item__kode">{{ s.kode }}</span>
                        </span>
                        <span class="pil" :class="aktif(s) ? 'pil--aktif' : 'pil--nonaktif'">
                            {{ aktif(s) ? 'Aktif' : 'Nonaktif' }}
                        </span>
                    </button>
                </div>

                <EmptyState v-else pesan="Tidak ada supplier yang cocok." petunjuk="Ubah kata kunci pencarian." />
            </section>

            <!-- ── tengah: identitas + hutang + kontak ─────────────── -->
            <div class="tengah" v-if="pilihan">
                <section class="panel kartu">
                    <span class="stensil">Nama suplier</span>
                    <p class="kartu__nama">{{ pilihan.nama }}</p>
                    <p class="kartu__meta">
                        <span class="mono">{{ pilihan.kode }}</span>
                        <span v-if="pilihan.tipe" class="chip">{{ labelTipe(pilihan.tipe) }}</span>
                    </p>
                </section>

                <section class="panel kartu kartu--hutang">
                    <span class="stensil">Total hutang</span>
                    <p class="kartu__angka" :class="{ 'kartu__angka--tagih': adaHutang }">
                        {{ rp(pilihan.total_hutang) }}
                    </p>
                    <p class="kartu__kaki" :class="{ 'kartu__kaki--tagih': adaHutang }">
                        {{ adaHutang ? 'Perlu dibayar ke supplier' : 'Tidak ada hutang berjalan' }}
                    </p>
                </section>

                <section class="panel kartu">
                    <span class="stensil">Kontak</span>
                    <dl class="kontak">
                        <div>
                            <dt>PIC</dt>
                            <dd>{{ pilihan.pic || '—' }}</dd>
                        </div>
                        <div>
                            <dt>Telp</dt>
                            <dd>{{ pilihan.telp || '—' }}</dd>
                        </div>
                        <div>
                            <dt>Kota</dt>
                            <dd>{{ pilihan.kota || '—' }}</dd>
                        </div>
                    </dl>
                    <div class="pisah"></div>
                    <dl class="kontak">
                        <div>
                            <dt>Bank</dt>
                            <dd :class="{ redup: !pilihan.bank }">{{ pilihan.bank || 'Belum diisi' }}</dd>
                        </div>
                        <div>
                            <dt>Rek</dt>
                            <dd class="mono" :class="{ redup: !pilihan.rekening }">
                                {{ pilihan.rekening || '—' }}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>

            <!-- ── kanan: riwayat mutasi ──────────────────────────── -->
            <section class="panel riwayat" v-if="pilihan">
                <div class="panel__kepala">
                    <h2 class="panel__judul">Mutasi / riwayat pembayaran</h2>
                    <span v-if="mutasi.length" class="hitung">{{ mutasi.length }}</span>
                </div>

                <div v-if="mutasi.length" class="riwayat__isi">
                    <div v-for="m in mutasi" :key="m.id" class="mutasi">
                        <div class="mutasi__kiri">
                            <p class="mutasi__ket">{{ m.keterangan || m.nomor || 'Mutasi' }}</p>
                            <p class="mutasi__meta">
                                <span v-if="m.nomor" class="mono">{{ m.nomor }}</span>
                                <span>{{ tgl(m.tanggal) }}</span>
                            </p>
                        </div>
                        <span class="mutasi__nominal" :class="m.arah === 'MASUK' ? 'naik' : 'turun'">
                            {{ m.arah === 'MASUK' ? '+' : '−' }}{{ rp(Math.abs(Number(m.nominal || 0))) }}
                        </span>
                    </div>
                </div>

                <div v-else class="kosong">
                    <i class="pi pi-receipt"></i>
                    <p class="kosong__judul">Belum ada mutasi tercatat</p>
                    <p class="kosong__sub">
                        Pembayaran dan penerimaan dengan
                        <strong>{{ pilihan.nama }}</strong> akan muncul di sini.
                    </p>
                </div>
            </section>

            <!-- ── belum ada yang dipilih ─────────────────────────── -->
            <section v-if="!pilihan && !isLoading" class="panel kosong-pilih">
                <EmptyState pesan="Pilih supplier di sebelah kiri."
                    petunjuk="Identitas, posisi hutang, dan riwayat muncul di sini." />
            </section>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const daftarSuplier = ref([])
const pilihan = ref(null)
const mutasi = ref([])
const cari = ref('')
const isLoading = ref(false)
const error = ref(null)

// Muat daftar. GANTI endpoint bila berbeda (usePurchaseOrder pakai 'suplier/').
const muat = async () => {
    isLoading.value = true
    error.value = null
    try {
        const { data } = await api.get('suplier/')
        daftarSuplier.value = data?.results || data || []      // aman utk paginated & non-paginated
        if (daftarSuplier.value.length) pilih(daftarSuplier.value[0])
    } catch (err) {
        error.value = bacaError(err, 'Gagal memuat data supplier.')
    } finally {
        isLoading.value = false
    }
}

// Pilih supplier + ambil mutasinya. GANTI endpoint mutasi sesuai backend
// (mis. `suplier/{id}/mutasi/`). Fallback ke [] -> empty state tampil.
const pilih = async (s) => {
    pilihan.value = s
    mutasi.value = []
    try {
        const { data } = await api.get(`suplier/${s.id}/mutasi/`)
        mutasi.value = data?.results || data || []
    } catch {
        mutasi.value = []   // endpoint belum ada -> biarkan empty state yang bicara
    }
}

const terfilter = computed(() => {
    const q = cari.value.trim().toLowerCase()
    if (!q) return daftarSuplier.value
    return daftarSuplier.value.filter(s =>
        (s.nama || '').toLowerCase().includes(q) ||
        (s.kode || '').toLowerCase().includes(q))
})

const aktif = (s) => (s.status ? s.status === 'AKTIF' : !!s.aktif)
const adaHutang = computed(() => Number(pilihan.value?.total_hutang || 0) > 0)

const labelTipe = (t) =>
    ({ RAW_MATERIAL: 'Bahan baku', PACKAGING: 'Kemasan', JASA: 'Jasa' }[t] || t)

const rp = (n) =>
    `Rp ${Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const tgl = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(muat)
</script>

<style scoped>
/* ── kepala ─────────────────────────────────────────────── */
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

/* ── tata letak master-detail ───────────────────────────── */
.tata {
    display: grid;
    grid-template-columns: 19rem 20rem minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
}

@media (max-width: 1200px) {
    .tata {
        grid-template-columns: 18rem minmax(0, 1fr);
    }

    .riwayat,
    .kosong-pilih {
        grid-column: 1 / -1;
    }
}

@media (max-width: 720px) {
    .tata {
        grid-template-columns: 1fr;
    }
}

/* ── panel dasar ────────────────────────────────────────── */
.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    box-shadow: var(--bayang);
    overflow: hidden;
}

.panel__kepala {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
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

.stensil {
    display: block;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .95em;
}

.redup {
    color: var(--redup-2);
}

/* ── kiri: daftar ───────────────────────────────────────── */
.daftar {
    position: sticky;
    top: 1.5rem;
}

.daftar__cari {
    display: flex;
    align-items: center;
    gap: .5rem;
    margin: 1rem 1.25rem;
    padding: .55rem .7rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
}

.daftar__cari i {
    color: var(--redup-2);
    font-size: .8125rem;
}

.daftar__cari input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    outline: none;
    font-family: inherit;
    font-size: .8125rem;
    color: var(--teks);
}

.daftar__isi {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
    padding-bottom: .3rem;
}

.item {
    display: grid;
    grid-template-columns: 3px 1fr auto;
    gap: .8rem;
    align-items: center;
    width: 100%;
    padding: .85rem 1.25rem;
    border: none;
    border-top: 1px solid var(--latar);
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease;
}

.item:hover {
    background: var(--panel-hover);
}

.item--pilih {
    background: var(--biru-latar);
}

.item__aksen {
    align-self: stretch;
    border-radius: 2px;
    background: var(--garis);
}

.item__aksen--aktif {
    background: var(--hijau);
}

.item--pilih .item__aksen {
    background: var(--biru);
}

.item__teks {
    display: flex;
    flex-direction: column;
    gap: .15rem;
    min-width: 0;
}

.item__nama {
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item__kode {
    font-size: .6875rem;
    color: var(--redup);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* pil status */
.pil {
    font-size: .625rem;
    font-weight: 700;
    padding: .18rem .5rem;
    border-radius: 999px;
    white-space: nowrap;
}

.pil--aktif {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.pil--nonaktif {
    background: var(--latar);
    color: var(--redup-2);
}

/* ── tengah: kartu ──────────────────────────────────────── */
.tengah {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.kartu {
    padding: 1.25rem;
}

.kartu__nama {
    margin: .6rem 0 .5rem;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -.01em;
    line-height: 1.25;
    color: var(--teks);
}

.kartu__meta {
    margin: 0;
    display: flex;
    align-items: center;
    gap: .6rem;
    flex-wrap: wrap;
    font-size: .8125rem;
    color: var(--redup);
}

.chip {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: .2rem .5rem;
    border-radius: 5px;
    background: var(--biru-latar);
    color: var(--biru);
}

/* kartu hutang — signature: angka posisi hutang */
.kartu--hutang {
    text-align: center;
}

.kartu__angka {
    margin: .7rem 0 .3rem;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.02em;
    color: var(--teks);
}

.kartu__angka--tagih {
    color: var(--merah);
}

.kartu__kaki {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.kartu__kaki--tagih {
    color: var(--merah);
    font-weight: 600;
}

/* kontak */
.kontak {
    margin: .8rem 0 0;
    display: flex;
    flex-direction: column;
    gap: .55rem;
}

.kontak>div {
    display: grid;
    grid-template-columns: 3.5rem 1fr;
    gap: .5rem;
    align-items: baseline;
}

.kontak dt {
    font-size: .75rem;
    font-weight: 600;
    color: var(--redup);
}

.kontak dd {
    margin: 0;
    font-size: .8125rem;
    color: var(--teks);
    word-break: break-word;
}

.pisah {
    height: 1px;
    background: var(--garis);
    margin: 1rem 0;
}

/* ── kanan: riwayat ─────────────────────────────────────── */
.riwayat {
    min-height: 24rem;
    display: flex;
    flex-direction: column;
}

.riwayat__isi {
    padding: .4rem 0;
    overflow-y: auto;
}

.mutasi {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: .85rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.mutasi:last-child {
    border-bottom: none;
}

.mutasi__kiri {
    min-width: 0;
}

.mutasi__ket {
    margin: 0 0 .2rem;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
}

.mutasi__meta {
    margin: 0;
    display: flex;
    gap: .6rem;
    flex-wrap: wrap;
    font-size: .6875rem;
    color: var(--redup);
}

.mutasi__nominal {
    font-size: .875rem;
    font-weight: 700;
    white-space: nowrap;
}

.naik {
    color: var(--hijau);
}

.turun {
    color: var(--merah);
}

/* empty state riwayat */
.kosong {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 2rem;
}

.kosong i {
    font-size: 2rem;
    color: var(--garis-tegas);
    margin-bottom: 1rem;
}

.kosong__judul {
    margin: 0 0 .35rem;
    font-size: .9375rem;
    font-weight: 600;
    color: var(--redup);
}

.kosong__sub {
    margin: 0;
    max-width: 22rem;
    font-size: .8125rem;
    color: var(--redup-2);
    line-height: 1.5;
}

.kosong__sub strong {
    color: var(--redup);
    font-weight: 600;
}

.kosong-pilih {
    padding: 2rem;
}
</style>