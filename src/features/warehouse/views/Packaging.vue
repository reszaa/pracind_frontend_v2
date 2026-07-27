<!--
  src/features/warehouse/views/Packaging.vue
  ====================================================
  Packaging = mengemas hasil produksi jadi unit barang jadi, DI DALAM satu
  sesi produksi yang terbuka. Pilih produk (varian kemasan), isi jumlah unit;
  sistem menampilkan bahan yang akan ditarik (qty × β) dan kapasitas pool.

  TANPA pemilik: kepemilikan PT/CV TIDAK dipilih di sini — dibagi otomatis
  proporsional (model Share/SZA) saat sesi DITUTUP. Itulah yang menggantikan
  penunjukan pemilik manual di versi lama.

  Konvensi: token tema.css, umpan balik inline (bukan alert), append-only.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah"><router-link to="/">Dashboard</router-link> › <router-link
                        to="/warehouse">Gudang</router-link> › Packaging</p>
                <h1 class="judul">Packaging</h1>
                <p class="sub">Kemas hasil produksi jadi unit barang jadi di dalam sesi terbuka.</p>
            </div>
            <span v-if="sesiAktif" class="sesibadge">
                <i class="pi pi-bolt"></i> {{ sesiAktif.nomor }} · DIBUKA
            </span>
        </header>

        <p v-if="feedback" class="banner" :class="`banner--${feedback.tipe}`">
            <i class="pi" :class="feedback.tipe === 'ok' ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
            {{ feedback.teks }}
        </p>

        <!-- Tidak ada sesi terbuka -->
        <section v-if="!sesiAktif && !isLoading" class="panel panel--buka">
            <div class="buka">
                <div class="buka__ikon"><i class="pi pi-inbox"></i></div>
                <h2>Belum ada sesi produksi terbuka</h2>
                <p>Packaging dicatat di dalam sesi. Buka sesi dulu untuk mulai mengemas.</p>
                <div class="buka__form">
                    <input v-model="catatanBaru" type="text" placeholder="Catatan sesi (opsional)…" />
                    <button class="tbl tbl--utama" :disabled="isSaving" @click="bukaSesiBaru">
                        <i class="pi pi-plus"></i> {{ isSaving ? 'Membuka…' : 'Buka sesi' }}
                    </button>
                </div>
            </div>
        </section>

        <template v-else-if="sesiAktif">
            <!-- 1. Sumber & produk -->
            <section class="panel">
                <div class="panel__kepala"><span class="dot dot--ungu"></span>
                    <h2 class="panel__judul">Sumber &amp; produk</h2>
                </div>
                <div class="grid3">
                    <label class="bidang">
                        <span class="stensil">Sumber tangki <em>(opsional)</em></span>
                        <select v-model="form.dari_tanki">
                            <option :value="null">— Tanpa jejak tangki —</option>
                            <option v-for="t in tankiList" :key="t.id" :value="t.id">
                                {{ t.kode }} · {{ t.jenis }}
                            </option>
                        </select>
                    </label>

                    <label class="bidang grid3__lebar">
                        <span class="stensil">Produk (varian kemasan)</span>
                        <select :value="form.produk" :disabled="!!produkTerkunci"
                            @change="setProduk(Number($event.target.value))">
                            <option :value="null" disabled>— Pilih produk —</option>
                            <option v-for="p in produkList" :key="p.id" :value="p.id">
                                {{ p.nama }} <template v-if="p.kemasan && p.kemasan !== '-'">[{{ p.kemasan
                                }}]</template>
                            </option>
                        </select>
                        <span v-if="produkTerkunci" class="petunjuk">
                            <i class="pi pi-lock"></i> Sesi terkunci ke produk ini — satu sesi satu produk (model
                            Share).
                        </span>
                    </label>
                </div>
            </section>

            <!-- 2. Jumlah & kalkulasi -->
            <section class="panel">
                <div class="panel__kepala"><span class="dot dot--amber"></span>
                    <h2 class="panel__judul">Spesifikasi kemasan</h2>
                    <span v-if="kapasitas" class="kapasitas">
                        Kapasitas pool: <b>{{ angka(kapasitas.q_max) }}</b> unit
                        <template v-if="kapasitas.bottleneck">· batas: {{ kapasitas.bottleneck }}</template>
                    </span>
                </div>

                <div class="grid2">
                    <label class="bidang">
                        <span class="stensil">Jumlah unit kemasan</span>
                        <input v-model.number="form.qty_unit" type="number" min="0" step="1" class="besar"
                            placeholder="0" />
                    </label>
                    <label class="bidang">
                        <span class="stensil">No. batch FG <em>(opsional)</em></span>
                        <input v-model="form.no_batch_fg" type="text" placeholder="auto jika kosong" />
                    </label>
                </div>

                <!-- kalkulator: bahan ditarik = qty × β -->
                <div v-if="produkTerpilih" class="kalk">
                    <div class="kalk__baris" v-for="b in previewTarik" :key="b.nama_bahan">
                        <span class="kalk__bahan">{{ b.nama_bahan }}</span>
                        <span class="kalk__rumus">{{ angka(form.qty_unit) }} × {{ b.beta }}</span>
                        <span class="kalk__hasil" :class="{ 'kalk__hasil--lebih': melebihiTarik(b) }">
                            {{ b.total }} {{ b.uom }}
                        </span>
                        <span class="kalk__pool">pool {{ poolBahan(b.nama_bahan) }} {{ b.uom }}</span>
                    </div>
                    <p v-if="melebihiKapasitas" class="kalk__warn">
                        <i class="pi pi-exclamation-triangle"></i>
                        Total unit ({{ totalQ + angka(form.qty_unit) }}) melebihi kapasitas pool
                        ({{ angka(kapasitas?.q_max) }}). Boleh disimpan, tapi sesi akan ditolak saat tutup
                        bila tidak dikoreksi.
                    </p>
                </div>

                <div class="aksi">
                    <button class="tbl" @click="resetForm">Reset</button>
                    <button class="tbl tbl--utama" :disabled="isSaving || angka(form.qty_unit) <= 0" @click="simpan">
                        <i class="pi" :class="isSaving ? 'pi-spin pi-spinner' : 'pi-save'"></i>
                        {{ isSaving ? 'Menyimpan…' : 'Simpan packaging' }}
                    </button>
                </div>
            </section>

            <!-- 3. Sudah dikemas -->
            <section class="panel">
                <div class="panel__kepala"><span class="dot dot--hijau"></span>
                    <h2 class="panel__judul">Sudah dikemas sesi ini</h2>
                    <span class="total">Total {{ angka(totalQ) }} unit</span>
                </div>
                <div v-if="hasilPackaging.length" class="daftar">
                    <div v-for="h in hasilPackaging" :key="h.id" class="hbaris">
                        <div>
                            <p class="hbaris__produk">{{ h.produk_nama || namaProduk(h.produk) }}</p>
                            <p class="hbaris__batch">{{ h.no_batch_fg }} · {{ waktu(h.dicatat_pada) }}</p>
                        </div>
                        <span class="hbaris__qty">{{ angka(h.qty_unit) }} unit</span>
                    </div>
                    <p class="nota">
                        Catatan bersifat append-only. Kepemilikan PT/CV dibagi otomatis proporsional
                        saat sesi ditutup — tidak ditentukan di sini.
                    </p>
                </div>
                <EmptyState v-else pesan="Belum ada packaging di sesi ini."
                    petunjuk="Isi form di atas untuk mencatat unit pertama." />
            </section>
        </template>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePackaging } from '@/features/warehouse/composables/usePackaging'
import EmptyState from '@/components/ui/EmptyState.vue'

const {
    sesiAktif, produkList, tankiList, kapasitas,
    isLoading, isSaving, feedback, form,
    hasilPackaging, totalQ, produkTerkunci, produkTerpilih,
    previewTarik, melebihiKapasitas,
    muatSesiAktif, muatProduk, muatTanki, bukaSesi, setProduk, resetForm, catatPackaging,
} = usePackaging()

const catatanBaru = ref('')

onMounted(async () => {
    await Promise.all([muatSesiAktif(), muatProduk(), muatTanki()])
    if (produkTerkunci.value) setProduk(produkTerkunci.value)
})

const bukaSesiBaru = async () => {
    const r = await bukaSesi(catatanBaru.value)
    if (r.success) { catatanBaru.value = ''; await muatProduk() }
}

const simpan = () => catatPackaging()

const angka = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })
const namaProduk = (id) => produkList.value.find(p => p.id === id)?.nama || `#${id}`

const poolBahan = (nama) => {
    const r = kapasitas.value?.rincian?.find(x => x.nama_bahan === nama)
    return r ? Number(r.total).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'
}
const melebihiTarik = (b) => {
    const r = kapasitas.value?.rincian?.find(x => x.nama_bahan === b.nama_bahan)
    return r ? Number(b.total) > Number(r.total) : false
}

const waktu = (iso) => iso
    ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'
</script>

<style scoped>
.kepala {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
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

.sesibadge {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-size: .75rem;
    font-weight: 700;
    color: var(--biru);
    background: var(--biru-latar);
    border: 1px solid #BFDBFE;
    padding: .45rem .8rem;
    border-radius: 999px;
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
    display: flex;
    align-items: center;
    gap: .6rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--garis);
}

.panel__judul {
    margin: 0;
    font-size: .9375rem;
    font-weight: 600;
}

.dot {
    width: 6px;
    height: 22px;
    border-radius: 3px;
    flex-shrink: 0;
}

.dot--ungu {
    background: #7C3AED;
}

.dot--amber {
    background: var(--kuning);
}

.dot--hijau {
    background: var(--hijau);
}

.kapasitas {
    margin-left: auto;
    font-size: .75rem;
    color: var(--redup);
}

.total {
    margin-left: auto;
    font-size: .75rem;
    font-weight: 700;
    color: var(--teks);
}

.grid3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1.25rem;
}

.grid3__lebar {
    grid-column: span 2;
}

.grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1.25rem 1.25rem 0;
}

@media (max-width: 800px) {

    .grid3,
    .grid2 {
        grid-template-columns: 1fr;
    }

    .grid3__lebar {
        grid-column: auto;
    }
}

.bidang {
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.bidang em {
    color: var(--redup-2);
    font-style: normal;
}

.bidang select,
.bidang input {
    font-family: inherit;
    font-size: .875rem;
    padding: .6rem .7rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    color: var(--teks);
}

.bidang select:focus,
.bidang input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.bidang select:disabled {
    opacity: .7;
}

.besar {
    font-weight: 800;
    font-size: 1.125rem;
    text-align: center;
}

.petunjuk {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-size: .6875rem;
    color: var(--redup);
}

.kalk {
    margin: 1.1rem 1.25rem;
    padding: 1rem 1.1rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
}

.kalk__baris {
    display: grid;
    grid-template-columns: 1.4fr 1fr auto 1fr;
    gap: 1rem;
    align-items: baseline;
    padding: .35rem 0;
    font-size: .8125rem;
}

.kalk__bahan {
    font-weight: 600;
}

.kalk__rumus {
    color: var(--redup);
    font-variant-numeric: tabular-nums;
}

.kalk__hasil {
    font-weight: 800;
    text-align: right;
}

.kalk__hasil--lebih {
    color: var(--merah);
}

.kalk__pool {
    text-align: right;
    color: var(--redup-2);
    font-size: .6875rem;
}

.kalk__warn {
    display: flex;
    align-items: center;
    gap: .5rem;
    margin: .6rem 0 0;
    padding-top: .6rem;
    border-top: 1px solid var(--garis);
    font-size: .75rem;
    color: var(--kuning);
}

.aksi {
    display: flex;
    justify-content: flex-end;
    gap: .75rem;
    padding: 1.1rem 1.25rem;
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
    padding: .6rem 1.1rem;
    cursor: pointer;
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
    background: #7C3AED;
    border-color: #7C3AED;
}

.tbl--utama:hover {
    filter: brightness(.95);
}

.daftar {
    display: flex;
    flex-direction: column;
}

.hbaris {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .8rem 1.25rem;
    border-bottom: 1px solid var(--latar);
}

.hbaris:last-of-type {
    border-bottom: none;
}

.hbaris__produk {
    margin: 0 0 .15rem;
    font-size: .8125rem;
    font-weight: 600;
}

.hbaris__batch {
    margin: 0;
    font-size: .6875rem;
    color: var(--redup);
}

.hbaris__qty {
    font-size: .9375rem;
    font-weight: 800;
    color: #7C3AED;
}

.nota {
    margin: 0;
    padding: .85rem 1.25rem;
    font-size: .6875rem;
    color: var(--redup-2);
    line-height: 1.55;
    border-top: 1px solid var(--latar);
}

.panel--buka {
    border-style: dashed;
}

.buka {
    text-align: center;
    padding: 2.5rem 1.5rem;
}

.buka__ikon {
    width: 3.5rem;
    height: 3.5rem;
    margin: 0 auto 1rem;
    border-radius: 999px;
    background: var(--latar);
    color: var(--redup);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.buka h2 {
    margin: 0 0 .4rem;
    font-size: 1.0625rem;
    font-weight: 700;
}

.buka p {
    margin: 0 auto 1.25rem;
    font-size: .8125rem;
    color: var(--redup);
    max-width: 26rem;
}

.buka__form {
    display: flex;
    gap: .6rem;
    justify-content: center;
    flex-wrap: wrap;
}

.buka__form input {
    font-family: inherit;
    font-size: .8125rem;
    padding: .6rem .8rem;
    min-width: 16rem;
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    color: var(--teks);
}
</style>