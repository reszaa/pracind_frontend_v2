<!--
  src/features/accounting/views/Document.vue
  ==========================================
  Kontrol dokumen PO — ruang PENINJAUAN (rel Buku Tagihan). Tiga berkas
  wajib per PO: Invoice, Faktur Pajak, Surat Jalan. Dokumen nyata disimpan
  di app `dokumen` (Lampiran, append-only) dan dirakit jadi baris audit di
  useDocument.

  Konvensi mengikuti BukuTagihan.vue: token tema.css (bukan warna Tailwind
  mentah), komponen StatCard/EmptyState/LoadingBar, umpan balik inline
  (bukan alert). Backend append-only -> tidak ada aksi hapus; salah unggah
  diperbaiki dengan mengunggah revisi baru.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/accounting/tagihan">Buku Tagihan</router-link> › Dokumen
                </p>
                <h1 class="judul">Dokumen</h1>
                <p class="sub">Kelengkapan berkas legal penagihan & pengiriman per purchase order.</p>
            </div>
            <button class="tbl tbl--utama" @click="bukaUploadKosong">
                <i class="pi pi-cloud-upload"></i> Upload dokumen
            </button>
        </header>

        <section class="metrik">
            <StatCard label="Total PO" :nilai="totalTransactions" kaki="Dipindai kelengkapannya" />
            <StatCard label="Lengkap" :nilai="fullyCompliantCount" kaki="3 dari 3 berkas" />
            <StatCard label="Menunggu berkas" :nilai="missingDocsCount" kaki="Belum lengkap"
                :waspada="missingDocsCount > 0" />
        </section>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Kontrol dokumen</h2>
                    <p class="panel__sub">Unggah invoice, faktur pajak, dan surat jalan per PO</p>
                </div>
                <div class="alat">
                    <div class="tab" role="tablist">
                        <button v-for="t in tabs" :key="t.id" :class="{ on: statusFilter === t.id }" role="tab"
                            :aria-selected="statusFilter === t.id" @click="statusFilter = t.id">{{ t.label }}</button>
                    </div>
                    <div class="cari">
                        <i class="pi pi-search"></i>
                        <input v-model="searchQuery" type="text" placeholder="Cari No. PO / supplier…" />
                    </div>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca data dokumen" />

            <p v-else-if="error" class="galat">{{ error }}</p>

            <div v-else-if="filteredAuditData.length">
                <div v-for="item in filteredAuditData" :key="item.id" class="baris">
                    <div class="baris__ref">
                        <p class="baris__nomor">{{ item.po_id }}</p>
                        <p class="baris__pihak">{{ item.partner }}</p>
                    </div>

                    <div class="berkas">
                        <div v-for="w in WAJIB" :key="w.key" class="berkas__sel">
                            <span class="stensil berkas__label">{{ w.label }}</span>
                            <span v-if="item.files[w.key].exists" class="chip chip--ada"
                                :title="`${item.files[w.key].oleh} · ${tgl(item.files[w.key].pada)}`">
                                <i class="pi pi-check"></i> {{ item.files[w.key].doc_no }}
                            </span>
                            <button v-else class="chip chip--upload" @click="bukaUpload(item, w.label)">
                                <i class="pi pi-cloud-upload"></i> Upload
                            </button>
                        </div>
                    </div>

                    <div class="audit">
                        <span class="lencana" :class="stat(item).isComplete ? 'lencana--ok' : 'lencana--pending'">
                            {{ stat(item).isComplete ? 'LENGKAP' : 'PENDING' }}
                        </span>
                        <div class="bar">
                            <div class="bar__isi" :class="stat(item).isComplete ? 'bar__isi--ok' : 'bar__isi--pending'"
                                :style="{ width: stat(item).percentage + '%' }"></div>
                        </div>
                    </div>

                    <span class="terima"
                        :class="`terima--${(item.status_penerimaan || 'belum_diterima').toLowerCase()}`">
                        {{ labelTerima(item.status_penerimaan) }}
                    </span>

                    <span class="bayar" :class="`bayar--${(item.payment_status || 'unpaid').toLowerCase()}`">
                        {{ labelBayar(item.payment_status) }}
                    </span>

                    <button class="lihat" @click="bukaDetail(item)" title="Lihat detail">
                        <i class="pi pi-eye"></i>
                    </button>
                </div>
            </div>

            <EmptyState v-else pesan="Belum ada PO untuk ditinjau." petunjuk="PO yang dibuat akan muncul di sini." />
        </section>

        <!-- ── Modal upload ─────────────────────────────────────── -->
        <div v-if="showUpload" class="tirai" @click.self="showUpload = false">
            <div class="kotak">
                <div class="kotak__kepala">
                    <h3>Upload berkas pendukung</h3>
                    <button class="x" @click="showUpload = false"><i class="pi pi-times"></i></button>
                </div>

                <div class="kotak__isi">
                    <label class="bidang">
                        <span class="stensil">Referensi PO</span>
                        <input :value="uploadForm.po_reference || '—'" readonly class="baca" />
                    </label>

                    <div class="dua">
                        <label class="bidang">
                            <span class="stensil">Jenis dokumen</span>
                            <select v-model="uploadForm.document_type">
                                <option value="Invoice">Invoice</option>
                                <option value="Faktur Pajak">Faktur Pajak</option>
                                <option value="Surat Jalan">Surat Jalan</option>
                            </select>
                        </label>
                        <label class="bidang">
                            <span class="stensil">Nomor dokumen</span>
                            <input v-model="uploadForm.document_number" type="text" placeholder="No. seri berkas…" />
                        </label>
                    </div>

                    <label class="bidang">
                        <span class="stensil">Berkas <em>(wajib)</em></span>
                        <input type="file" @change="setFile($event.target.files)" accept=".pdf,.jpg,.jpeg,.png,.webp" />
                        <span v-if="uploadForm.file" class="berkas__nama">{{ uploadForm.file.name }}</span>
                    </label>

                    <p v-if="pesanModal" class="galat galat--modal">{{ pesanModal }}</p>
                </div>

                <div class="kotak__kaki">
                    <button class="tbl" @click="showUpload = false">Batal</button>
                    <button class="tbl tbl--utama" :disabled="sedangSimpan" @click="submitUpload">
                        {{ sedangSimpan ? 'Mengarsipkan…' : 'Arsipkan dokumen' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ── Modal detail ─────────────────────────────────────── -->
        <div v-if="showDetail && terpilih" class="tirai" @click.self="showDetail = false">
            <div class="kotak kotak--lebar">
                <div class="kotak__kepala">
                    <h3>Detail dokumen — {{ terpilih.po_id }}</h3>
                    <button class="x" @click="showDetail = false"><i class="pi pi-times"></i></button>
                </div>

                <div class="kotak__isi detail">
                    <div class="detail__info">
                        <div><span class="stensil">Rekanan</span>
                            <p>{{ terpilih.partner }}</p>
                        </div>
                        <div><span class="stensil">Tanggal</span>
                            <p>{{ tgl(terpilih.date) }}</p>
                        </div>
                        <div><span class="stensil">Penerimaan Gudang</span>
                            <p><span class="terima"
                                    :class="`terima--${(terpilih.status_penerimaan || 'belum_diterima').toLowerCase()}`">{{
                                        labelTerima(terpilih.status_penerimaan) }}</span></p>
                        </div>
                        <div><span class="stensil">Pembayaran</span>
                            <p><span class="bayar"
                                    :class="`bayar--${(terpilih.payment_status || 'unpaid').toLowerCase()}`">{{
                                        labelBayar(terpilih.payment_status) }}</span></p>
                        </div>
                        <div class="detail__prog">
                            <div class="detail__prog-kepala">
                                <span :class="stat(terpilih).isComplete ? 'ok' : 'pending'">
                                    {{ stat(terpilih).isComplete ? 'Lengkap 100%' : 'Belum lengkap' }}
                                </span>
                                <span class="redup">{{ stat(terpilih).count }} / 3 berkas</span>
                            </div>
                            <div class="bar">
                                <div class="bar__isi"
                                    :class="stat(terpilih).isComplete ? 'bar__isi--ok' : 'bar__isi--pending'"
                                    :style="{ width: stat(terpilih).percentage + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <div class="detail__berkas">
                        <span class="stensil">Kelengkapan berkas</span>
                        <div v-for="w in WAJIB" :key="w.key" class="fbaris">
                            <div>
                                <p class="fbaris__judul">{{ w.label }}</p>
                                <span v-if="terpilih.files[w.key].exists" class="chip chip--ada">{{
                                    terpilih.files[w.key].doc_no }}</span>
                                <span v-else class="chip chip--kosong">Belum ada</span>
                            </div>
                            <div class="fbaris__aksi">
                                <a v-if="terpilih.files[w.key].exists" :href="terpilih.files[w.key].file"
                                    target="_blank" rel="noopener" class="ikon ikon--unduh" title="Buka / unduh"><i
                                        class="pi pi-download"></i></a>
                                <button class="ikon ikon--upload"
                                    :title="terpilih.files[w.key].exists ? 'Unggah revisi' : 'Unggah'"
                                    @click="bukaUpload(terpilih, w.label)"><i class="pi pi-cloud-upload"></i></button>
                            </div>
                        </div>
                        <p class="nota">Dokumen bersifat append-only — mengunggah ulang membuat revisi baru, versi lama
                            tetap tersimpan sebagai jejak audit.</p>
                    </div>
                </div>

                <div class="kotak__kaki">
                    <button class="tbl" @click="showDetail = false">Tutup</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDocument } from '@/features/accounting/composables/useDocument'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    isLoading, sedangSimpan, error,
    searchQuery, statusFilter, uploadForm,
    filteredAuditData, totalTransactions, fullyCompliantCount, missingDocsCount,
    getComplianceStats, muat, siapkanUpload, setFile, handleUploadDocument, WAJIB,
} = useDocument()

onMounted(muat)

const tabs = [
    { id: 'all', label: 'Semua' },
    { id: 'lengkap', label: 'Lengkap' },
    { id: 'tidak_lengkap', label: 'Pending' },
]

const showUpload = ref(false)
const showDetail = ref(false)
const terpilih = ref(null)
const pesanModal = ref('')

const stat = (item) => getComplianceStats(item.files)

const bukaUpload = (item, docLabel) => {
    siapkanUpload(item, docLabel)
    pesanModal.value = ''
    showDetail.value = false
    showUpload.value = true
}

const bukaUploadKosong = () => {
    siapkanUpload({ id: null, po_id: '', partner: '' }, 'Invoice')
    pesanModal.value = 'Buka dari baris PO agar referensi terisi otomatis.'
    showUpload.value = true
}

const submitUpload = async () => {
    const r = await handleUploadDocument()
    if (r.success) {
        showUpload.value = false
        pesanModal.value = ''
    } else {
        pesanModal.value = r.message
    }
}

const bukaDetail = (item) => {
    terpilih.value = item
    showDetail.value = true
}

const labelBayar = (s) => ({ PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum bayar' }[s] || '—')
const labelTerima = (s) => ({ PENUH: 'Diterima Penuh', SEBAGIAN: 'Sebagian', BELUM_DITERIMA: 'Belum Diterima' }[s] || 'Belum Diterima')

const tgl = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
/* ── kepala ─────────────────────────────────────────────── */
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
    font-size: .8125rem;
    color: var(--redup);
}

.tbl {
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 600;
    color: var(--teks);
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem 1rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: .45rem;
}

.tbl:hover {
    border-color: var(--garis-tegas);
}

.tbl--utama {
    color: #fff;
    background: var(--hijau);
    border-color: var(--hijau);
}

.tbl--utama:hover {
    filter: brightness(.95);
}

.tbl:disabled {
    opacity: .6;
    cursor: default;
}

/* ── metrik ─────────────────────────────────────────────── */
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

/* ── panel ──────────────────────────────────────────────── */
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
    gap: .75rem;
    align-items: center;
    flex-wrap: wrap;
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
    padding: .4rem .8rem;
    border-radius: 7px;
    cursor: pointer;
}

.tab button.on {
    background: var(--panel);
    color: var(--teks);
    box-shadow: var(--bayang);
}

.cari {
    position: relative;
}

.cari .pi {
    position: absolute;
    left: .7rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--redup-2);
    font-size: .8rem;
}

.cari input {
    font-family: inherit;
    font-size: .8125rem;
    padding: .5rem .75rem .5rem 2rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    color: var(--teks);
    width: 15rem;
    max-width: 60vw;
}

.cari input:focus {
    outline: none;
    border-color: var(--biru);
}

/* ── baris audit ────────────────────────────────────────── */
.baris {
    display: grid;
    /* [FIX] Menambahkan satu 'auto' agar ada ruang untuk lencana Penerimaan Gudang */
    grid-template-columns: minmax(9rem, 1.1fr) minmax(0, 2.4fr) auto auto auto auto;
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.baris:last-child {
    border-bottom: none;
}

.baris:hover {
    background: var(--panel-hover);
}

.baris__nomor {
    margin: 0 0 .2rem;
    font-size: .8125rem;
    font-weight: 600;
}

.baris__pihak {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.berkas {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: .5rem;
}

.berkas__sel {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    align-items: flex-start;
}

.berkas__label {
    color: var(--redup-2);
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-size: .75rem;
    font-weight: 600;
    padding: .35rem .6rem;
    border-radius: var(--lengkung-kecil);
    border: 1px solid transparent;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chip--ada {
    color: var(--hijau);
    background: var(--hijau-latar);
    border-color: #A7F3D0;
}

.chip--kosong {
    color: var(--merah);
    background: var(--merah-latar);
    border-color: #FECACA;
}

.chip--upload {
    color: var(--redup);
    background: var(--latar);
    border-color: var(--garis);
    cursor: pointer;
    font-family: inherit;
}

.chip--upload:hover {
    color: var(--hijau);
    background: var(--hijau-latar);
    border-color: #A7F3D0;
}

.audit {
    display: flex;
    flex-direction: column;
    gap: .35rem;
    align-items: center;
    min-width: 5.5rem;
}

.lencana {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .05em;
    padding: .2rem .55rem;
    border-radius: 999px;
}

.lencana--ok {
    color: #fff;
    background: var(--hijau);
}

.lencana--pending {
    color: var(--kuning);
    background: var(--kuning-latar);
}

.bar {
    width: 5rem;
    height: 6px;
    background: var(--garis);
    border-radius: 3px;
    overflow: hidden;
}

.bar__isi {
    height: 100%;
    transition: width .4s ease;
}

.bar__isi--ok {
    background: var(--hijau);
}

.bar__isi--pending {
    background: var(--kuning);
}

/* ── Status Penerimaan (Baru) ───────────────────────────── */
.terima {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: .3rem .55rem;
    border-radius: var(--lengkung-kecil);
    text-align: center;
    min-width: 6.5rem;
}

.terima--penuh {
    color: var(--hijau);
    background: var(--hijau-latar);
}

.terima--sebagian {
    color: var(--biru);
    background: var(--biru-latar);
}

.terima--belum_diterima {
    color: var(--redup);
    background: var(--latar);
    border: 1px solid var(--garis);
}

.bayar {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: .3rem .55rem;
    border-radius: var(--lengkung-kecil);
    text-align: center;
    min-width: 5rem;
}

.bayar--paid {
    color: var(--hijau);
    background: var(--hijau-latar);
}

.bayar--partial {
    color: var(--biru);
    background: var(--biru-latar);
}

.bayar--unpaid {
    color: var(--kuning);
    background: var(--kuning-latar);
}

.lihat {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: var(--lengkung-kecil);
    background: var(--biru-latar);
    color: var(--biru);
    border: 1px solid #BFDBFE;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.lihat:hover {
    background: var(--biru);
    color: #fff;
}

.galat {
    margin: 0;
    padding: 1rem 1.25rem;
    font-size: .8125rem;
    color: var(--merah);
}

/* ── modal ──────────────────────────────────────────────── */
.tirai {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(17, 24, 39, .5);
    backdrop-filter: blur(2px);
}

.kotak {
    background: var(--panel);
    width: 100%;
    max-width: 28rem;
    max-height: 95vh;
    overflow-y: auto;
    border-radius: var(--lengkung);
    box-shadow: var(--bayang-angkat);
    display: flex;
    flex-direction: column;
}

.kotak--lebar {
    max-width: 44rem;
}

.kotak__kepala {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--garis);
    position: sticky;
    top: 0;
    background: var(--panel);
}

.kotak__kepala h3 {
    margin: 0;
    font-size: .9375rem;
    font-weight: 700;
}

.x {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: none;
    background: var(--latar);
    color: var(--redup);
    cursor: pointer;
}

.x:hover {
    color: var(--merah);
}

.kotak__isi {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.kotak__kaki {
    display: flex;
    justify-content: flex-end;
    gap: .6rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--garis);
    position: sticky;
    bottom: 0;
    background: var(--panel);
}

.bidang {
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.bidang em {
    color: var(--merah);
    font-style: normal;
}

.bidang input,
.bidang select {
    font-family: inherit;
    font-size: .8125rem;
    padding: .55rem .7rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    color: var(--teks);
}

.bidang input:focus,
.bidang select:focus {
    outline: none;
    border-color: var(--biru);
}

.bidang input.baca {
    color: var(--redup);
}

.dua {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .75rem;
}

.berkas__nama {
    font-size: .75rem;
    color: var(--hijau);
}

.galat--modal {
    padding: .6rem .75rem;
    background: var(--merah-latar);
    border: 1px solid #FECACA;
    border-radius: var(--lengkung-kecil);
}

/* ── detail ─────────────────────────────────────────────── */
.detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.detail__info {
    display: flex;
    flex-direction: column;
    gap: .9rem;
}

.detail__info p {
    margin: .2rem 0 0;
    font-size: .875rem;
    font-weight: 600;
}

.detail__prog-kepala {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .4rem;
    font-size: .75rem;
    font-weight: 700;
}

.detail__prog-kepala .ok {
    color: var(--hijau);
}

.detail__prog-kepala .pending {
    color: var(--kuning);
}

.detail__prog-kepala .redup {
    color: var(--redup);
}

.detail__berkas {
    display: flex;
    flex-direction: column;
    gap: .6rem;
}

.fbaris {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .7rem .85rem;
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
}

.fbaris__judul {
    margin: 0 0 .35rem;
    font-size: .8125rem;
    font-weight: 600;
}

.fbaris__aksi {
    display: flex;
    gap: .4rem;
}

.ikon {
    width: 2rem;
    height: 2rem;
    border-radius: var(--lengkung-kecil);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    cursor: pointer;
    text-decoration: none;
}

.ikon--unduh {
    color: var(--hijau);
    background: var(--hijau-latar);
    border-color: #A7F3D0;
}

.ikon--unduh:hover {
    color: #fff;
    background: var(--hijau);
}

.ikon--upload {
    color: var(--redup);
    background: var(--latar);
    border-color: var(--garis);
}

.ikon--upload:hover {
    color: var(--biru);
    background: var(--biru-latar);
}

.nota {
    margin: .25rem 0 0;
    font-size: .6875rem;
    color: var(--redup);
    line-height: 1.5;
}

@media (max-width: 900px) {
    .baris {
        grid-template-columns: 1fr;
        gap: .75rem;
    }

    .berkas {
        grid-template-columns: 1fr;
    }

    .audit {
        align-items: flex-start;
    }

    .detail {
        grid-template-columns: 1fr;
    }
}
</style>