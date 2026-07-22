<!--
  src/features/accounting/views/BuatPO.vue
  ==========================================  ===============================================
  Form buat PO. Beberapa hal yang berbeda dari versi frontend lama:

  1. Entitas dan supplier dikirim sebagai PRIMARY KEY, bukan string. Versi
     lama mengirim "PT" dan "PT Anu" — itu kontrak backend lama.
  2. Nomor PO TIDAK dirakit di client. Backend yang membuatnya; preview di
     sini cuma perkiraan dan diberi label "sementara" karena angkanya bisa
     bergeser kalau ada PO lain dibuat bersamaan.
  3. Quantity dihitung `unit_kg x total_unit` — sama dengan yang dipakai
     backend untuk menghitung subtotal.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/accounting/po">Pembelian</router-link> › Buat PO
                </p>
                <h1 class="judul">Buat purchase order</h1>
            </div>
        </header>

        <form @submit.prevent="kirim">
            <!-- ── header ──────────────────────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <h2 class="panel__judul">Informasi utama</h2>
                </div>

                <div class="isi">
                    <div class="baris3">
                        <label class="isian">
                            <span class="isian__label">Entitas pembeli</span>
                            <select v-model.number="draf.akun" required>
                                <option :value="null" disabled>Pilih entitas</option>
                                <option v-for="a in daftarAkun" :key="a.id" :value="a.id">
                                    {{ a.kode }} — {{ a.nama }}
                                </option>
                            </select>
                        </label>

                        <label class="isian">
                            <span class="isian__label">Tanggal PO</span>
                            <input v-model="draf.tanggal" type="date" required />
                        </label>

                        <div class="isian">
                            <span class="isian__label">Nomor PO</span>
                            <div class="nomor">
                                <span v-if="nomorPreview">{{ nomorPreview }}</span>
                                <span v-else class="nomor__kosong">Pilih entitas &amp; tanggal</span>
                            </div>
                            <span class="isian__bantu">
                                Sementara — nomor final dibuat sistem saat disimpan.
                            </span>
                        </div>
                    </div>

                    <div class="baris2">
                        <label class="isian">
                            <span class="isian__label">Supplier</span>
                            <select v-model.number="draf.suplier" required>
                                <option :value="null" disabled>Pilih supplier</option>
                                <option v-for="s in daftarSuplier" :key="s.id" :value="s.id">
                                    {{ s.nama }}{{ s.kota ? ` — ${s.kota}` : '' }}
                                </option>
                            </select>
                            <span v-if="terminSupplier !== null" class="isian__bantu">
                                Termin {{ terminSupplier }} hari
                            </span>
                        </label>

                        <label class="isian">
                            <span class="isian__label">Jatuh tempo <em>opsional</em></span>
                            <input v-model="draf.tanggal_jatuh_tempo" type="date" />
                        </label>
                    </div>

                    <label class="isian">
                        <span class="isian__label">Catatan <em>opsional</em></span>
                        <input v-model="draf.catatan" type="text" placeholder="Contoh: Kirim ke gudang belakang" />
                    </label>
                </div>
            </section>

            <!-- ── item ────────────────────────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Rincian item</h2>
                        <p class="panel__sub">Qty dihitung dari unit/kg × jumlah unit</p>
                    </div>
                    <button type="button" class="tbl" @click="tambahItem">
                        <BaseIcon nama="tambah" :ukuran="14" /> Tambah item
                    </button>
                </div>

                <div class="tabel">
                    <div class="tabel__kepala">
                        <span>Nama barang</span>
                        <span>Kemasan</span>
                        <span class="ka">Unit/kg</span>
                        <span class="ka">Jml unit</span>
                        <span class="ka">Qty</span>
                        <span class="ka">Harga satuan</span>
                        <span class="ka">Subtotal</span>
                        <span></span>
                    </div>

                    <div v-for="(item, i) in draf.daftar_item" :key="i" class="tabel__baris">
                        <input v-model="item.nama_item" type="text" required placeholder="Nama barang" />
                        <input v-model="item.packaging" type="text" placeholder="sak / drum" />
                        <input v-model.number="item.unit_kg" type="number" min="0" step="0.01" class="ka"
                            placeholder="0" />
                        <input v-model.number="item.total_unit" type="number" min="1" step="1" required class="ka"
                            placeholder="0" />
                        <span class="hitung">{{ angka(qty(item)) }}</span>
                        <input v-model.number="item.harga_satuan" type="number" min="0" step="1" class="ka"
                            placeholder="0" />
                        <span class="hitung hitung--tebal">{{ rp(subtotal(item)) }}</span>
                        <button type="button" class="hapus" :disabled="draf.daftar_item.length === 1"
                            aria-label="Hapus item" @click="hapusItem(i)">×</button>
                    </div>
                </div>

                <div class="total">
                    <div class="total__baris">
                        <span>Subtotal</span>
                        <span>{{ rp(subtotalSemua) }}</span>
                    </div>
                    <div class="total__baris">
                        <span>PPN 11%</span>
                        <span>{{ rp(ppn) }}</span>
                    </div>
                    <div class="total__baris total__baris--akhir">
                        <span>Total</span>
                        <span>{{ rp(grandTotal) }}</span>
                    </div>
                </div>
            </section>

            <p v-if="pesan" class="galat">{{ pesan }}</p>

            <div class="aksi">
                <router-link to="/accounting/po" class="tbl">Batal</router-link>
                <button type="submit" class="tbl tbl--utama" :disabled="sedangSimpan">
                    {{ sedangSimpan ? 'Menyimpan' : 'Terbitkan PO' }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePurchaseOrder } from '@/features/accounting/composables/usePurchaseOrder'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const router = useRouter()
const {
    daftarAkun, daftarSuplier, sedangSimpan, muat, previewNomor, buatPO,
} = usePurchaseOrder()

const pesan = ref('')
const nomorPreview = ref(null)

const hariIni = () => {
    const t = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    return t.toISOString().slice(0, 10)
}

const itemKosong = () => ({
    nama_item: '', packaging: '', unit_kg: null,
    total_unit: null, harga_satuan: null,
})

const draf = reactive({
    akun: null,
    suplier: null,
    tanggal: hariIni(),
    tanggal_jatuh_tempo: '',
    catatan: '',
    daftar_item: [itemKosong()],
})

onMounted(muat)

// Perkiraan nomor diperbarui saat entitas atau tanggal berubah.
watch([() => draf.akun, () => draf.tanggal], async ([akun, tanggal]) => {
    nomorPreview.value = akun && tanggal ? await previewNomor(akun, tanggal) : null
})

// Jatuh tempo terisi otomatis dari termin supplier — masih bisa diubah manual.
watch([() => draf.suplier, () => draf.tanggal], ([sup, tanggal]) => {
    if (!sup || !tanggal || draf.tanggal_jatuh_tempo) return
    const s = daftarSuplier.value.find(x => x.id === sup)
    if (!s?.termin_pembayaran_hari) return
    const d = new Date(tanggal)
    d.setDate(d.getDate() + s.termin_pembayaran_hari)
    draf.tanggal_jatuh_tempo = d.toISOString().slice(0, 10)
})

const terminSupplier = computed(() => {
    const s = daftarSuplier.value.find(x => x.id === draf.suplier)
    return s ? s.termin_pembayaran_hari : null
})

const qty = (item) => (Number(item.unit_kg) || 0) * (Number(item.total_unit) || 0)
const subtotal = (item) => qty(item) * (Number(item.harga_satuan) || 0)

const subtotalSemua = computed(() =>
    draf.daftar_item.reduce((s, i) => s + subtotal(i), 0),
)
const ppn = computed(() => subtotalSemua.value * 0.11)
const grandTotal = computed(() => subtotalSemua.value + ppn.value)

const tambahItem = () => draf.daftar_item.push(itemKosong())
const hapusItem = (i) => {
    if (draf.daftar_item.length > 1) draf.daftar_item.splice(i, 1)
}

const kirim = async () => {
    pesan.value = ''

    const kosong = draf.daftar_item.some(
        i => !i.nama_item?.trim() || !i.total_unit || qty(i) <= 0,
    )
    if (kosong) {
        pesan.value = 'Setiap item butuh nama, jumlah unit, dan unit/kg yang menghasilkan qty di atas 0.'
        return
    }

    const hasil = await buatPO({
        akun: draf.akun,
        suplier: draf.suplier,
        tanggal: draf.tanggal,
        tanggal_jatuh_tempo: draf.tanggal_jatuh_tempo || null,
        catatan: draf.catatan,
        daftar_item: draf.daftar_item.map(i => ({
            nama_item: i.nama_item.trim(),
            packaging: i.packaging?.trim() || '-',
            unit_kg: Number(i.unit_kg) || 0,
            total_unit: Number(i.total_unit),
            quantity: qty(i),
            harga_satuan: Number(i.harga_satuan) || 0,
        })),
    })

    if (hasil.success) router.push('/accounting/po')
    else pesan.value = hasil.message
}

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })
</script>

<style scoped>
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

.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
    margin-bottom: 1.25rem;
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

.isi {
    padding: 1.25rem;
}

.baris3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.1rem;
}

.baris2 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 1.1rem;
}

@media (max-width: 760px) {

    .baris3,
    .baris2 {
        grid-template-columns: 1fr;
    }
}

.isian {
    display: block;
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

.isian input,
.isian select {
    width: 100%;
    font-family: inherit;
    font-size: .875rem;
    color: var(--teks);
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem .7rem;
}

.isian input:focus,
.isian select:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.isian__bantu {
    display: block;
    margin-top: .35rem;
    font-size: .6875rem;
    color: var(--redup-2);
}

.nomor {
    padding: .6rem .7rem;
    background: var(--latar);
    border: 1px dashed var(--garis-tegas);
    border-radius: var(--lengkung-kecil);
    font-size: .875rem;
    font-weight: 600;
}

.nomor__kosong {
    color: var(--redup-2);
    font-weight: 400;
}

/* ── tabel item ── */
.tabel {
    padding: 0 1.25rem 1rem;
    overflow-x: auto;
}

.tabel__kepala,
.tabel__baris {
    display: grid;
    grid-template-columns: 2fr 1.1fr .8fr .8fr .9fr 1.2fr 1.3fr 2rem;
    gap: .5rem;
    align-items: center;
    min-width: 52rem;
}

.tabel__kepala {
    padding: .85rem 0 .5rem;
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.tabel__baris {
    padding: .35rem 0;
}

.ka {
    text-align: right;
}

.tabel__baris input {
    width: 100%;
    font-family: inherit;
    font-size: .8125rem;
    color: var(--teks);
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: 6px;
    padding: .5rem .6rem;
}

.tabel__baris input.ka {
    text-align: right;
}

.tabel__baris input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.hitung {
    text-align: right;
    font-size: .8125rem;
    color: var(--redup);
}

.hitung--tebal {
    color: var(--teks);
    font-weight: 600;
}

.hapus {
    font-family: inherit;
    font-size: 1.125rem;
    line-height: 1;
    color: var(--redup-2);
    background: none;
    border: none;
    cursor: pointer;
    padding: .25rem;
}

.hapus:hover:not(:disabled) {
    color: var(--merah);
}

.hapus:disabled {
    opacity: .3;
    cursor: default;
}

.total {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--garis);
    background: var(--latar);
}

.total__baris {
    display: flex;
    justify-content: space-between;
    padding: .3rem 0;
    font-size: .8125rem;
    color: var(--redup);
    max-width: 20rem;
    margin-left: auto;
}

.total__baris--akhir {
    margin-top: .4rem;
    padding-top: .7rem;
    border-top: 1px solid var(--garis);
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--teks);
}

.galat {
    margin: 0 0 1rem;
    padding: .7rem .9rem;
    background: var(--merah-latar);
    border-radius: var(--lengkung-kecil);
    font-size: .8125rem;
    color: var(--merah);
    line-height: 1.5;
}

.aksi {
    display: flex;
    gap: .6rem;
    justify-content: flex-end;
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
</style>