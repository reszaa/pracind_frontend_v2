<!--
  src/features/accounting/views/PODetail.vue
  ===========================================
  Detail PO. Satu layar, DUA PERAN:

    akunting → melihat, catat pembayaran, unggah dokumen
    gudang   → terima barang

  Tombol "terima barang" hanya muncul untuk GUDANG/Supervisor karena backend
  menggate endpoint itu dengan has_role(GUDANG). Menyembunyikan tombol di
  sini murni soal kejelasan — backend tetap yang menolak.

  Penerimaan mengisi kuantitas per item, bukan sekali klik: barang sering
  datang bertahap, dan backend memang menerima parsial.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/accounting/po">Purchase Order</router-link> ›
                    {{ po?.nomor ?? 'Detail' }}
                </p>
                <h1 class="judul">{{ po?.nomor ?? 'Memuat' }}</h1>
                <p v-if="po" class="sub">
                    {{ po.suplier_detail?.nama }} · {{ po.akun_detail?.kode }} ·
                    {{ tanggalPanjang(po.tanggal) }}
                </p>
            </div>

            <div v-if="po" class="aksi-kepala">
                <button v-if="bolehTerima && po.status_penerimaan !== 'PENUH'" class="tbl tbl--utama"
                    @click="bukaTerima = !bukaTerima">{{ bukaTerima ? 'Tutup' : 'Terima barang' }}</button>
                <router-link v-if="po.status_pembayaran !== 'PAID'" to="/accounting/transaksi/pembayaran"
                    class="tbl">Catat
                    pembayaran</router-link>
            </div>
        </header>

        <LoadingBar v-if="isLoading && !po" pesan="Membaca detail PO" />

        <template v-else-if="po">
            <section class="metrik">
                <StatCard label="Nilai PO" :nilai="rpk(po.total_po)" kaki="Termasuk PPN" />
                <StatCard label="Penerimaan" :nilai="`${persenTerima}%`" :kaki="labelTerima(po.status_penerimaan)" />
                <StatCard label="Sisa tagihan" :nilai="rpk(sisa)" :kaki="labelBayar(po.status_pembayaran)"
                    :waspada="po.status_pembayaran === 'UNPAID'" />
                <StatCard label="Dokumen" :nilai="`${po.kelengkapan?.count ?? 0}/${po.kelengkapan?.total ?? 3}`"
                    :kaki="kurangDokumen" :waspada="!(po.kelengkapan?.is_complete)" />
            </section>

            <!-- ── panel terima barang ─────────────────────────── -->
            <section v-if="bukaTerima" class="panel panel--terima">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Terima barang</h2>
                        <p class="panel__sub">
                            Isi kuantitas yang benar-benar datang. Boleh sebagian.
                        </p>
                    </div>
                </div>

                <div class="terima">
                    <div v-for="item in po.daftar_item" :key="item.id" class="terima__baris">
                        <div class="terima__nama">
                            <p class="terima__judul">{{ item.nama_item }}</p>
                            <p class="terima__sisa">
                                Sudah {{ angka(item.kuantitas_terkirim) }} dari
                                {{ angka(item.quantity) }} · sisa {{ angka(sisaItem(item)) }}
                            </p>
                        </div>
                        <label class="terima__isian">
                            <span>Kuantitas</span>
                            <input v-model.number="formTerima[item.id].kuantitas" type="number" min="0"
                                :max="sisaItem(item)" step="0.01" placeholder="0" :disabled="sisaItem(item) <= 0" />
                        </label>
                        <label class="terima__isian">
                            <span>No. batch <em>opsional</em></span>
                            <input v-model="formTerima[item.id].no_batch" type="text"
                                placeholder="Otomatis kalau kosong" :disabled="sisaItem(item) <= 0" />
                        </label>
                    </div>

                    <label class="isian">
                        <span class="isian__label">Catatan penerimaan <em>opsional</em></span>
                        <input v-model="catatanTerima" type="text" placeholder="Contoh: 2 sak basah, sudah diganti" />
                    </label>

                    <p v-if="pesanTerima" class="galat">{{ pesanTerima }}</p>

                    <div class="terima__aksi">
                        <button type="button" class="tbl" @click="bukaTerima = false">Batal</button>
                        <button type="button" class="tbl tbl--utama" :disabled="sedangSimpan" @click="kirimTerima">{{
                            sedangSimpan ? 'Menyimpan' : 'Catat penerimaan' }}</button>
                    </div>
                </div>
            </section>

            <div class="dua">
                <!-- ── item ──────────────────────────────────────── -->
                <section class="panel">
                    <div class="panel__kepala">
                        <h2 class="panel__judul">Rincian item</h2>
                    </div>

                    <div class="tabel">
                        <div class="tabel__kepala">
                            <span>Barang</span>
                            <span class="ka">Dipesan</span>
                            <span class="ka">Diterima</span>
                            <span class="ka">Harga</span>
                            <span class="ka">Subtotal</span>
                        </div>
                        <div v-for="item in po.daftar_item" :key="item.id" class="tabel__baris">
                            <div>
                                <p class="tabel__nama">{{ item.nama_item }}</p>
                                <p class="tabel__meta">
                                    {{ item.packaging }} · {{ angka(item.unit_kg) }} kg × {{ item.total_unit }}
                                    <span v-if="item.no_batch"> · {{ item.no_batch }}</span>
                                </p>
                            </div>
                            <span class="ka">{{ angka(item.quantity) }}</span>
                            <span class="ka" :class="kelasTerimaItem(item)">
                                {{ angka(item.kuantitas_terkirim) }}
                            </span>
                            <span class="ka">{{ rp(item.harga_satuan) }}</span>
                            <span class="ka tebal">{{ rp(subtotalItem(item)) }}</span>
                        </div>
                    </div>
                </section>

                <!-- ── samping ───────────────────────────────────── -->
                <aside class="samping">
                    <section class="panel">
                        <div class="panel__kepala">
                            <h2 class="panel__judul">Riwayat pembayaran</h2>
                        </div>
                        <div v-if="pembayaranAktif.length" class="riwayat">
                            <div v-for="r in pembayaranAktif" :key="r.id" class="riwayat__baris">
                                <div>
                                    <p class="riwayat__nilai">{{ rp(r.nominal_dibayar) }}</p>
                                    <p class="riwayat__catatan">{{ r.catatan || '—' }}</p>
                                </div>
                                <span class="riwayat__tanggal">{{ tanggalPendek(r.tanggal_bayar) }}</span>
                            </div>
                        </div>
                        <EmptyState v-else pesan="Belum ada pembayaran." />
                    </section>

                    <section class="panel">
                        <div class="panel__kepala">
                            <h2 class="panel__judul">Kelengkapan dokumen</h2>
                        </div>
                        <ul class="dokumen">
                            <li v-for="d in dokumenSemua" :key="d.jenis" class="dokumen__baris">
                                <span class="dokumen__tanda" :class="{ 'dokumen__tanda--ada': d.ada }">
                                    {{ d.ada ? '✓' : '·' }}
                                </span>
                                <span class="dokumen__nama" :class="{ 'dokumen__nama--kurang': !d.ada }">
                                    {{ d.label }}
                                </span>
                            </li>
                        </ul>
                    </section>
                </aside>
            </div>
        </template>

        <EmptyState v-else pesan="PO tidak ditemukan." petunjuk="Periksa kembali tautannya." />
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePurchaseOrder } from '@/features/accounting/composables/usePurchaseOrder'
import { useAuth } from '@/composables/useAuth'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const route = useRoute()
const { role, isSupervisor } = useAuth()
const {
    poAktif: po, isLoading, sedangSimpan, muatDetail, terimaBarang,
} = usePurchaseOrder()

const bukaTerima = ref(false)
const catatanTerima = ref('')
const pesanTerima = ref('')
const formTerima = reactive({})

onMounted(() => muatDetail(route.params.id))

/** Backend menggate terima-barang dengan has_role(GUDANG). */
const bolehTerima = computed(() =>
    isSupervisor.value || role.value === 'GUDANG',
)

// Siapkan slot form begitu detail termuat.
watch(po, (baru) => {
    if (!baru) return
    for (const item of baru.daftar_item) {
        if (!formTerima[item.id]) {
            formTerima[item.id] = { kuantitas: null, no_batch: '' }
        }
    }
}, { immediate: true })

const sisaItem = (item) =>
    Number(item.quantity) - Number(item.kuantitas_terkirim)

const subtotalItem = (item) =>
    Number(item.quantity) * Number(item.harga_satuan)

const persenTerima = computed(() => {
    if (!po.value) return 0
    const pesan = po.value.daftar_item.reduce((s, i) => s + Number(i.quantity), 0)
    const terima = po.value.daftar_item.reduce((s, i) => s + Number(i.kuantitas_terkirim), 0)
    return pesan > 0 ? Math.round((terima / pesan) * 100) : 0
})

const pembayaranAktif = computed(() =>
    (po.value?.riwayat_pembayaran ?? []).filter(r => !r.dibatalkan_pada),
)

const sisa = computed(() => {
    if (!po.value) return 0
    const dibayar = pembayaranAktif.value
        .reduce((s, r) => s + Number(r.nominal_dibayar), 0)
    return Number(po.value.total_po) - dibayar
})

const kurangDokumen = computed(() => {
    const k = po.value?.kelengkapan
    if (!k) return '—'
    return k.is_complete ? 'Lengkap' : `Menunggu ${k.belum.map(b => b.label).join(', ')}`
})

const dokumenSemua = computed(() => {
    const k = po.value?.kelengkapan
    const semua = [
        { jenis: 'INVOICE', label: 'Invoice' },
        { jenis: 'FAKTUR', label: 'Faktur Pajak' },
        { jenis: 'SURAT_JALAN', label: 'Surat Jalan' },
    ]
    const belum = new Set((k?.belum ?? []).map(b => b.jenis))
    return semua.map(d => ({ ...d, ada: !belum.has(d.jenis) }))
})

const kirimTerima = async () => {
    pesanTerima.value = ''
    const items = Object.entries(formTerima)
        .filter(([, v]) => Number(v.kuantitas) > 0)
        .map(([id, v]) => ({
            item_id: Number(id),
            kuantitas: Number(v.kuantitas),
            no_batch: v.no_batch?.trim() || undefined,
        }))

    const hasil = await terimaBarang(route.params.id, items, catatanTerima.value)
    if (hasil.success) {
        bukaTerima.value = false
        catatanTerima.value = ''
        for (const k of Object.keys(formTerima)) {
            formTerima[k] = { kuantitas: null, no_batch: '' }
        }
    } else {
        pesanTerima.value = hasil.message
    }
}

const kelasTerimaItem = (item) => {
    const s = sisaItem(item)
    if (s <= 0) return 'hijau'
    return Number(item.kuantitas_terkirim) > 0 ? 'kuning' : 'redup'
}

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const rpk = (n) => {
    const a = Number(n)
    if (Math.abs(a) >= 1e9) return `Rp ${(a / 1e9).toFixed(2)} M`
    if (Math.abs(a) >= 1e6) return `Rp ${(a / 1e6).toFixed(1)} jt`
    return rp(a)
}

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const tanggalPanjang = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

const labelTerima = (s) => ({
    BELUM_DITERIMA: 'Belum diterima',
    SEBAGIAN: 'Diterima sebagian',
    PENUH: 'Diterima penuh',
}[s] ?? s)

const labelBayar = (s) => ({
    UNPAID: 'Belum dibayar',
    PARTIAL: 'Dibayar sebagian',
    PAID: 'Lunas',
}[s] ?? s)
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

.aksi-kepala {
    display: flex;
    gap: .6rem;
    flex-wrap: wrap;
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

.tbl--utama {
    background: var(--teks);
    color: var(--panel);
    border-color: var(--teks);
}

.tbl--utama:hover:not(:disabled) {
    opacity: .88;
}

.tbl--utama:disabled {
    opacity: .5;
    cursor: default;
}

.metrik {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1px;
    background: var(--garis);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
    margin-bottom: 1.25rem;
}

.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
}

.panel--terima {
    margin-bottom: 1.25rem;
    border-color: var(--biru);
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

/* ── terima barang ── */
.terima {
    padding: 1.25rem;
}

.terima__baris {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) 1fr 1.2fr;
    gap: 1rem;
    align-items: end;
    padding: .85rem 0;
    border-bottom: 1px solid var(--latar);
}

@media (max-width: 720px) {
    .terima__baris {
        grid-template-columns: 1fr;
    }
}

.terima__judul {
    margin: 0 0 .18rem;
    font-size: .875rem;
    font-weight: 600;
}

.terima__sisa {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.terima__isian {
    display: block;
}

.terima__isian>span {
    display: block;
    margin-bottom: .3rem;
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.terima__isian em {
    font-style: normal;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
}

.terima__isian input {
    width: 100%;
    font-family: inherit;
    font-size: .8125rem;
    color: var(--teks);
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: 6px;
    padding: .5rem .6rem;
}

.terima__isian input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.terima__isian input:disabled {
    opacity: .4;
}

.isian {
    display: block;
    margin-top: 1.1rem;
}

.isian__label {
    display: block;
    margin-bottom: .4rem;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--redup);
}

.isian__label em {
    font-style: normal;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
}

.isian input {
    width: 100%;
    font-family: inherit;
    font-size: .875rem;
    color: var(--teks);
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem .7rem;
}

.isian input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.terima__aksi {
    display: flex;
    gap: .6rem;
    justify-content: flex-end;
    margin-top: 1.1rem;
}

.galat {
    margin: 1rem 0 0;
    padding: .7rem .9rem;
    background: var(--merah-latar);
    border-radius: var(--lengkung-kecil);
    font-size: .8125rem;
    color: var(--merah);
    line-height: 1.5;
}

/* ── dua kolom ── */
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

/* ── tabel item ── */
.tabel {
    padding: 0 1.25rem 1rem;
    overflow-x: auto;
}

.tabel__kepala,
.tabel__baris {
    display: grid;
    grid-template-columns: minmax(0, 2fr) .8fr .8fr 1fr 1.1fr;
    gap: .75rem;
    align-items: center;
    min-width: 34rem;
}

.tabel__kepala {
    padding: .85rem 0 .5rem;
    border-bottom: 1px solid var(--latar);
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.tabel__baris {
    padding: .8rem 0;
    border-bottom: 1px solid var(--latar);
}

.tabel__baris:last-child {
    border-bottom: none;
}

.ka {
    text-align: right;
    font-size: .8125rem;
}

.tebal {
    font-weight: 700;
}

.hijau {
    color: var(--hijau);
    font-weight: 600;
}

.kuning {
    color: var(--kuning);
    font-weight: 600;
}

.redup {
    color: var(--redup-2);
}

.tabel__nama {
    margin: 0 0 .15rem;
    font-size: .8125rem;
    font-weight: 600;
}

.tabel__meta {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup);
}

/* ── riwayat & dokumen ── */
.riwayat {
    padding: .5rem 1.25rem 1rem;
}

.riwayat__baris {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: .6rem 0;
    border-bottom: 1px solid var(--latar);
}

.riwayat__baris:last-child {
    border-bottom: none;
}

.riwayat__nilai {
    margin: 0 0 .12rem;
    font-size: .875rem;
    font-weight: 600;
}

.riwayat__catatan {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup);
}

.riwayat__tanggal {
    font-size: .6875rem;
    color: var(--redup-2);
    white-space: nowrap;
}

.dokumen {
    list-style: none;
    margin: 0;
    padding: .5rem 1.25rem 1rem;
}

.dokumen__baris {
    display: flex;
    align-items: center;
    gap: .6rem;
    padding: .5rem 0;
    border-bottom: 1px solid var(--latar);
}

.dokumen__baris:last-child {
    border-bottom: none;
}

.dokumen__tanda {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: .75rem;
    font-weight: 700;
    background: var(--latar);
    color: var(--redup-2);
}

.dokumen__tanda--ada {
    background: var(--hijau-latar);
    color: var(--hijau);
}

.dokumen__nama {
    font-size: .8125rem;
}

.dokumen__nama--kurang {
    color: var(--redup);
}
</style>