<!--
  src/features/logistic/views/FormPengirimanCustomer.vue
  =======================================================
  Buat surat jalan dari sales order. Satu form untuk semua sumber
  (menggantikan GoToCustomer/GoToRetail yang kosong — keputusan PRD).

  PARTIAL DELIVERY di sini: kolom qty per item dibatasi `sisa_buat` =
  quantity − sudah terkirim − yang sudah dialokasikan di SJ lain yang
  masih DISIAPKAN. Jadi dua SJ tidak bisa memperebutkan barang yang sama.

  Kurir WAJIB dipilih saat membuat — SJ tanpa sopir tidak bisa berangkat.
  (Kalau backend nanti mengizinkan penetapan kurir belakangan, longgarkan
  di useLogistic, bukan di sini.)
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/logistic">Pengiriman</router-link> › Buat surat jalan
                </p>
                <h1 class="judul">Buat surat jalan</h1>
            </div>
        </header>

        <LoadingBar v-if="isLoading && !soDenganSisa.length" pesan="Membaca sales order" />

        <template v-else>
            <!-- ── pilih SO ────────────────────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Sales order</h2>
                        <p class="panel__sub">Hanya SO yang masih punya sisa untuk dikirim</p>
                    </div>
                </div>

                <div v-if="soDenganSisa.length" class="so-list">
                    <button v-for="so in soDenganSisa" :key="so.id" class="so"
                        :class="{ 'so--pilih': draf.soId === so.id }" @click="pilihSO(so)">
                        <span class="so__kiri">
                            <span class="so__nomor">{{ so.nomor }}</span>
                            <span class="so__customer">{{ so.customer_detail?.nama }}</span>
                        </span>
                        <span class="so__kanan">
                            <span class="so__sisa">
                                {{ totalSisa(so) }} unit belum dialokasikan
                            </span>
                            <span class="so__status">{{ labelKirim(so.status_pengiriman) }}</span>
                        </span>
                    </button>
                </div>
                <EmptyState v-else pesan="Semua SO sudah teralokasi penuh."
                    petunjuk="Surat jalan baru bisa dibuat saat ada SO dengan sisa kirim." />
            </section>

            <!-- ── rincian kiriman ─────────────────────────────── -->
            <section v-if="soTerpilih" class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">Isi kiriman — {{ soTerpilih.nomor }}</h2>
                        <p class="panel__sub">Boleh sebagian. Sisa sudah dikurangi alokasi SJ lain.</p>
                    </div>
                </div>

                <div class="isi">
                    <div class="tabel">
                        <div class="tabel__kepala">
                            <span>Barang</span>
                            <span class="ka">Dipesan</span>
                            <span class="ka">Terkirim</span>
                            <span class="ka">Sisa</span>
                            <span class="ka">Kirim sekarang</span>
                        </div>
                        <div v-for="item in soTerpilih.daftar_item" :key="item.id" class="tabel__baris">
                            <span>{{ item.nama_item }}</span>
                            <span class="ka">{{ angka(item.quantity) }}</span>
                            <span class="ka">{{ angka(item.kuantitas_terkirim) }}
                                <small v-if="item.dialokasikan > 0"> (+{{ angka(item.dialokasikan) }} disiapkan)</small>
                            </span>
                            <span class="ka" :class="{ habis: item.sisa_buat <= 0 }">{{ angka(item.sisa_buat) }}</span>
                            <input v-model.number="draf.qty[item.id]" type="number" min="0" :max="item.sisa_buat"
                                step="1" class="ka" placeholder="0" :disabled="item.sisa_buat <= 0" />
                        </div>
                    </div>

                    <div class="baris2">
                        <label class="isian">
                            <span class="isian__label">Kurir</span>
                            <select v-model.number="draf.kurirId" required>
                                <option :value="null" disabled>Pilih kurir</option>
                                <option v-for="k in daftarKurir" :key="k.id" :value="k.id">
                                    {{ k.nama }} — {{ k.kendaraan.plat }} ({{ k.kendaraan.jenis }})
                                </option>
                            </select>
                        </label>
                        <div class="isian">
                            <span class="isian__label">Alamat tujuan</span>
                            <div class="isian__mati">{{ soTerpilih.alamat_kirim || '—' }}</div>
                        </div>
                    </div>

                    <label class="isian">
                        <span class="isian__label">Catatan <em>opsional</em></span>
                        <input v-model="draf.catatan" type="text" placeholder="Contoh: bongkar lewat pintu belakang" />
                    </label>

                    <p v-if="pesan" class="galat">{{ pesan }}</p>

                    <div class="aksi">
                        <router-link to="/logistic" class="tbl">Batal</router-link>
                        <button type="button" class="tbl tbl--utama" :disabled="sedangSimpan" @click="kirim">
                            {{ sedangSimpan ? 'Menyimpan' : 'Terbitkan surat jalan' }}
                        </button>
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLogistic } from '@/features/logistic/composables/useLogistic'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const router = useRouter()
const {
    daftarKurir, soDenganSisa, isLoading, sedangSimpan,
    muat, muatSO, buatSJ,
} = useLogistic()

onMounted(() => { muat(); muatSO() })

const pesan = ref('')
const draf = reactive({ soId: null, kurirId: null, qty: {}, catatan: '' })

const soTerpilih = computed(() =>
    soDenganSisa.value.find(s => s.id === draf.soId) ?? null,
)

const pilihSO = (so) => {
    draf.soId = draf.soId === so.id ? null : so.id
    draf.qty = {}
    pesan.value = ''
}

const totalSisa = (so) =>
    so.daftar_item.reduce((s, i) => s + Math.max(0, i.sisa_buat), 0)

const kirim = async () => {
    pesan.value = ''
    const items = Object.entries(draf.qty)
        .filter(([, v]) => Number(v) > 0)
        .map(([id, v]) => ({ so_item_id: Number(id), qty: Number(v) }))

    const hasil = await buatSJ({
        soId: draf.soId,
        kurirId: draf.kurirId,
        items,
        catatan: draf.catatan,
    })
    if (hasil.success) router.push('/logistic')
    else pesan.value = hasil.message
}

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const labelKirim = (s) => ({
    BELUM: 'Belum terkirim',
    SEBAGIAN: 'Terkirim sebagian',
    PENUH: 'Terkirim penuh',
}[s] ?? s ?? '—')
</script>

<style scoped>
.kepala { margin-bottom: 1.5rem; }
.remah { margin: 0 0 .3rem; font-size: .75rem; color: var(--redup-2); }
.remah a { color: var(--redup); text-decoration: none; }
.remah a:hover { color: var(--teks); text-decoration: underline; }
.judul { margin: 0; font-size: 1.625rem; font-weight: 700; letter-spacing: -.02em; }

.panel { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); overflow: hidden; margin-bottom: 1.25rem; }
.panel__kepala { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--garis); }
.panel__judul { margin: 0; font-size: .9375rem; font-weight: 700; }
.panel__sub { margin: .2rem 0 0; font-size: .75rem; color: var(--redup); }

.so-list { display: flex; flex-direction: column; }
.so {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    width: 100%; text-align: left; font-family: inherit;
    background: none; border: none; border-bottom: 1px solid var(--garis);
    padding: .9rem 1.25rem; cursor: pointer;
}
.so:last-child { border-bottom: none; }
.so:hover { background: var(--latar); }
.so--pilih { background: var(--biru-latar); }
.so__kiri { display: flex; flex-direction: column; gap: .15rem; }
.so__nomor { font-size: .8125rem; font-weight: 700; }
.so__customer { font-size: .8125rem; color: var(--redup); }
.so__kanan { text-align: right; }
.so__sisa { display: block; font-size: .8125rem; font-weight: 600; }
.so__status { display: block; margin-top: .15rem; font-size: .6875rem; color: var(--redup-2); }

.isi { padding: 1.1rem 1.25rem; }

.tabel { margin-bottom: 1.1rem; }
.tabel__kepala, .tabel__baris {
    display: grid; grid-template-columns: 1.6fr .7fr 1fr .6fr .9fr;
    gap: .75rem; align-items: center; padding: .55rem 0; font-size: .8125rem;
}
.tabel__kepala {
    font-size: .625rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--redup-2);
    border-bottom: 1px solid var(--garis);
}
.tabel__baris { border-bottom: 1px solid var(--garis); color: var(--teks-2); }
.tabel__baris small { color: var(--redup-2); }
.ka { text-align: right; font-variant-numeric: tabular-nums; }
.habis { color: var(--redup-2); }

.tabel__baris input {
    font-family: inherit; font-size: .8125rem; color: var(--teks);
    background: var(--latar); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .45rem .55rem; width: 100%;
}
.tabel__baris input:focus { outline: none; border-color: var(--biru); background: var(--panel); }
.tabel__baris input:disabled { opacity: .4; }

.baris2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.isian { display: block; margin: 0 0 .9rem; }
.isian__label {
    display: block; margin-bottom: .35rem; font-size: .6875rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--redup);
}
.isian__label em { font-style: normal; font-weight: 400; letter-spacing: 0; text-transform: none; }
.isian input, .isian select {
    width: 100%; font-family: inherit; font-size: .875rem; color: var(--teks);
    background: var(--latar); border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil); padding: .55rem .7rem;
}
.isian input:focus, .isian select:focus { outline: none; border-color: var(--biru); background: var(--panel); }
.isian__mati {
    font-size: .875rem; color: var(--teks-2); background: var(--latar);
    border: 1px dashed var(--garis); border-radius: var(--lengkung-kecil);
    padding: .55rem .7rem;
}

.galat {
    margin: 0 0 .9rem; padding: .6rem .8rem; font-size: .8125rem; color: var(--merah);
    background: var(--merah-latar); border-radius: var(--lengkung-kecil); white-space: pre-line;
}

.aksi { display: flex; gap: .6rem; justify-content: flex-end; }
.tbl {
    display: inline-flex; align-items: center;
    font-family: inherit; font-size: .8125rem; font-weight: 500;
    color: var(--teks); background: var(--panel); border: 1px solid var(--garis-tegas);
    border-radius: var(--lengkung-kecil); padding: .5rem .9rem; cursor: pointer; text-decoration: none;
}
.tbl:hover { border-color: var(--teks); }
.tbl--utama { color: var(--panel); background: var(--teks); border-color: var(--teks); }
.tbl--utama:hover { opacity: .88; }
.tbl--utama:disabled { opacity: .5; cursor: default; }

@media (max-width: 720px) {
    .tabel__kepala, .tabel__baris { grid-template-columns: 1.4fr .8fr .8fr; }
    .tabel__kepala span:nth-child(3), .tabel__baris > span:nth-child(3) { display: none; }
    .baris2 { grid-template-columns: 1fr; }
}
</style>
