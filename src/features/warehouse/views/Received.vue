<!--
  src/features/warehouse/views/Received.vue
  =========================================
  Terima barang PO (penerimaan gudang). Pilih PO yang datang, isi berapa yang
  benar-benar diterima per item, simpan. Status penerimaan PO otomatis maju
  (SEBAGIAN/PENUH) dan — begitu rantai stok disambung di backend — BatchGudang
  ikut terbentuk.

  Item DIKUNCI ke item PO: yang tampil hanya bahan yang memang dipesan; operator
  mengisi kuantitas diterima, bukan mengetik bahan bebas (penerimaan diarahkan
  ke ItemPurchaseOrder.id). Barang di luar PO bukan alur layar ini.

  Konvensi: token tema.css, komponen EmptyState/LoadingBar, umpan balik inline
  (bukan alert). Berat diterima = unit_kg × unit diterima, dikirim sebagai KG.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/warehouse">Gudang</router-link> › Terima barang
                </p>
                <h1 class="judul">Terima barang</h1>
                <p class="sub">Catat penerimaan fisik atas purchase order yang datang.</p>
            </div>
            <router-link to="/warehouse" class="tbl"><i class="pi pi-arrow-left"></i> Dashboard stok</router-link>
        </header>

        <p v-if="feedback" class="banner" :class="`banner--${feedback.tipe}`">
            <i class="pi" :class="feedback.tipe === 'ok' ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
            {{ feedback.teks }}
        </p>

        <!-- ── 1. Pilih PO ─────────────────────────────────────── -->
        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Dokumen PO</h2>
                    <p class="panel__sub">Pilih PO yang barangnya baru tiba</p>
                </div>
            </div>

            <div class="isi">
                <label class="bidang">
                    <span class="stensil">Referensi PO yang datang</span>
                    <select v-model="poTerpilih" @change="fetchPODetail(poTerpilih)">
                        <option value="" disabled>— Pilih dokumen PO —</option>
                        <option v-for="po in poList" :key="po.id" :value="po.id">{{ po.label }}</option>
                    </select>
                    <span v-if="!poList.length && !isLoading" class="petunjuk">
                        Tidak ada PO yang menunggu penerimaan (semua sudah PENUH atau belum ada PO).
                    </span>
                </label>

                <div v-if="selectedPODetail" class="ringkasPO">
                    <div><span class="stensil">No. PO</span>
                        <p>{{ selectedPODetail.nomor }}</p>
                    </div>
                    <div><span class="stensil">Supplier</span>
                        <p>{{ selectedPODetail.supplier }}</p>
                    </div>
                    <div>
                        <span class="stensil">Status penerimaan</span>
                        <p><span class="statusbadge"
                                :class="`sb--${(selectedPODetail.status_penerimaan || '').toLowerCase()}`">
                                {{ labelStatus(selectedPODetail.status_penerimaan) }}</span></p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── 2. Barang diterima ──────────────────────────────── -->
        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Barang diterima</h2>
                    <p class="panel__sub">Isi jumlah yang benar-benar diterima per item</p>
                </div>
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca item PO" />

            <EmptyState v-else-if="!selectedPODetail" pesan="Belum ada PO dipilih."
                petunjuk="Pilih dokumen PO di atas untuk memuat item-nya." />

            <EmptyState v-else-if="!formItems.length" pesan="PO ini tidak punya item." />

            <div v-else class="daftar">
                <article v-for="it in formItems" :key="it.item_id" class="baris">
                    <div class="baris__bahan">
                        <p class="baris__nama">{{ it.nama_item }}</p>
                        <p class="baris__kemasan">{{ it.packaging }} · {{ angka(it.unit_kg) }} kg/unit</p>
                    </div>

                    <div class="baris__stat">
                        <span>Pesan <b>{{ angka(it.quantity) }}</b> kg</span>
                        <span>Sudah <b>{{ angka(it.kuantitas_terkirim) }}</b> kg</span>
                        <span class="sisa">Sisa <b>{{ angka(it.sisa) }}</b> kg</span>
                    </div>

                    <div class="baris__input">
                        <label>
                            <span class="stensil">Unit diterima</span>
                            <input v-model.number="it.unit_diterima" type="number" min="0" step="1"
                                @input="calcWeight(it)" />
                        </label>
                        <div class="hasil" :class="{ 'hasil--lebih': Number(it.berat) > Number(it.sisa) }">
                            <span class="stensil">Berat</span>
                            <b>{{ angka(it.berat) }} kg</b>
                        </div>
                        <label>
                            <span class="stensil">No. batch <em>(opsional)</em></span>
                            <input v-model="it.no_batch" type="text" placeholder="auto jika kosong" />
                        </label>
                    </div>
                </article>

                <div class="kaki">
                    <label class="bidang bidang--catatan">
                        <span class="stensil">Catatan penerimaan <em>(opsional)</em></span>
                        <textarea v-model="form.catatan" rows="2" placeholder="mis. 1 sak sobek, ditolak"></textarea>
                    </label>

                    <div class="tonase">
                        <div class="tonase__ikon"><i class="pi pi-inbox"></i></div>
                        <div>
                            <span class="stensil">Total tonase masuk</span>
                            <p class="tonase__angka">{{ angka(totalTonase) }} <small>kg</small></p>
                        </div>
                    </div>
                </div>

                <p v-if="adaLebih" class="lebih">
                    <i class="pi pi-info-circle"></i>
                    Ada item yang berat diterimanya melebihi sisa pesanan — tetap bisa disimpan (kelebihan kiriman),
                    pastikan itu memang benar.
                </p>
            </div>
        </section>

        <div class="aksi">
            <button class="tbl" :disabled="isSaving" @click="resetForm">Reset</button>
            <button class="tbl tbl--utama" :disabled="isSaving || !selectedPODetail" @click="simpan">
                <i class="pi" :class="isSaving ? 'pi-spin pi-spinner' : 'pi-check-circle'"></i>
                {{ isSaving ? 'Menyimpan…' : 'Simpan penerimaan' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useReceived } from '@/features/warehouse/composables/useReceived'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    isLoading, isSaving, feedback,
    poList, poTerpilih, selectedPODetail, formItems, form,
    totalTonase, adaLebih,
    fetchAvailablePO, fetchPODetail, calcWeight, resetForm, saveData,
} = useReceived()

onMounted(fetchAvailablePO)

const simpan = () => saveData()

const angka = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const labelStatus = (s) => ({
    BELUM_DITERIMA: 'Belum diterima', SEBAGIAN: 'Sebagian', PENUH: 'Penuh',
}[s] || (s || '—'))
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

.tbl:disabled {
    opacity: .6;
    cursor: default;
}

.tbl--utama {
    color: #fff;
    background: var(--biru);
    border-color: var(--biru);
}

.tbl--utama:hover {
    filter: brightness(.96);
}

.banner {
    display: flex;
    align-items: center;
    gap: .5rem;
    margin: 0 0 1.25rem;
    padding: .75rem 1rem;
    border-radius: var(--lengkung-kecil);
    font-size: .8125rem;
    font-weight: 600;
}

.banner--ok {
    color: var(--hijau);
    background: var(--hijau-latar);
    border: 1px solid #A7F3D0;
}

.banner--galat {
    color: var(--merah);
    background: var(--merah-latar);
    border: 1px solid #FECACA;
}

.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
    margin-bottom: 1.25rem;
}

.panel__kepala {
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

.isi {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
}

.bidang {
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.bidang em,
.baris__input em {
    color: var(--redup-2);
    font-style: normal;
}

.bidang select,
.bidang input,
.bidang textarea,
.baris__input input {
    font-family: inherit;
    font-size: .875rem;
    padding: .6rem .7rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    color: var(--teks);
    width: 100%;
}

.bidang select:focus,
.bidang input:focus,
.bidang textarea:focus,
.baris__input input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.petunjuk {
    font-size: .75rem;
    color: var(--redup);
}

.ringkasPO {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
}

.ringkasPO p {
    margin: .25rem 0 0;
    font-size: .875rem;
    font-weight: 600;
}

.statusbadge {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: .25rem .5rem;
    border-radius: var(--lengkung-kecil);
}

.sb--belum_diterima {
    color: var(--redup);
    background: var(--garis);
}

.sb--sebagian {
    color: var(--kuning);
    background: var(--kuning-latar);
}

.sb--penuh {
    color: var(--hijau);
    background: var(--hijau-latar);
}

/* ── daftar item ── */
.daftar {
    display: flex;
    flex-direction: column;
}

.baris {
    display: grid;
    grid-template-columns: minmax(10rem, 1.3fr) minmax(10rem, 1.2fr) minmax(16rem, 1.6fr);
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.baris:last-of-type {
    border-bottom: none;
}

.baris__nama {
    margin: 0 0 .15rem;
    font-size: .875rem;
    font-weight: 600;
}

.baris__kemasan {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup);
}

.baris__stat {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    font-size: .75rem;
    color: var(--redup);
}

.baris__stat b {
    color: var(--teks);
    font-weight: 700;
}

.baris__stat .sisa b {
    color: var(--biru);
}

.baris__input {
    display: grid;
    grid-template-columns: 1fr auto 1.2fr;
    gap: .6rem;
    align-items: end;
}

.baris__input label {
    display: flex;
    flex-direction: column;
    gap: .3rem;
}

.hasil {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    text-align: center;
    padding: .1rem .6rem;
}

.hasil b {
    font-size: .9375rem;
    font-weight: 700;
    white-space: nowrap;
}

.hasil--lebih b {
    color: var(--kuning);
}

/* ── kaki: catatan + tonase ── */
.kaki {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: 1.1rem 1.25rem;
    border-top: 1px solid var(--garis);
}

.bidang--catatan {
    flex: 1;
    min-width: 16rem;
}

.tonase {
    display: flex;
    align-items: center;
    gap: .9rem;
    padding: .6rem 1.1rem .6rem .6rem;
    background: var(--teks);
    border-radius: var(--lengkung);
}

.tonase__ikon {
    width: 2.6rem;
    height: 2.6rem;
    border-radius: var(--lengkung-kecil);
    background: var(--biru);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.tonase .stensil {
    color: var(--redup-2);
}

.tonase__angka {
    margin: .1rem 0 0;
    font-size: 1.75rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
}

.tonase__angka small {
    font-size: .75rem;
    font-weight: 500;
    color: var(--redup-2);
}

.lebih {
    display: flex;
    align-items: center;
    gap: .5rem;
    margin: 0;
    padding: .75rem 1.25rem;
    font-size: .75rem;
    color: var(--kuning);
    background: var(--kuning-latar);
    border-top: 1px solid var(--kuning-garis);
}

.aksi {
    display: flex;
    justify-content: flex-end;
    gap: .75rem;
    padding-bottom: 1rem;
}

@media (max-width: 900px) {
    .baris {
        grid-template-columns: 1fr;
        gap: .75rem;
    }

    .baris__input {
        grid-template-columns: 1fr 1fr;
    }

    .kaki {
        flex-direction: column;
        align-items: stretch;
    }

    .tonase {
        justify-content: flex-start;
    }
}
</style>