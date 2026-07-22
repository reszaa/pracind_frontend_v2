<!--
  src/features/warehouse/views/Opname.vue
  =======================================
  Stock opname — satu-satunya jalur mengubah fisik gudang tanpa transaksi.

  Alasan koreksi WAJIB diisi (backend menolak kalau kosong), karena ini
  perubahan tanpa dokumen sumber. Alasannya ikut tercatat di ledger sebagai
  keterangan mutasi jenis KOREKSI.

  ⚠ Selisih opname TIDAK dibebankan ke akun mana pun — murni fisik.
  Konsekuensinya invariant Σ saldo == Σ fisik sengaja dibiarkan meleset
  sampai rekonsiliasi sesi produksi berikutnya membaginya proporsional.
  Itu disebut di layar supaya tidak dikira bug.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/warehouse">Gudang</router-link> › Stok Opname
                </p>
                <h1 class="judul">Stok opname</h1>
                <p class="sub">Sesuaikan qty batch dengan hasil hitung ulang fisik.</p>
            </div>
        </header>

        <section class="panel">
            <div class="panel__kepala">
                <div>
                    <h2 class="panel__judul">Batch di gudang</h2>
                    <p class="panel__sub">Klik batch untuk mengoreksi qty</p>
                </div>
                <input v-model="cariBatch" type="search" class="cari" placeholder="Cari bahan atau no. batch" />
            </div>

            <LoadingBar v-if="isLoading" pesan="Membaca data batch" />

            <div v-else-if="batchTampil.length" class="daftar">
                <div v-for="b in batchTampil" :key="b.id" class="batch">
                    <button class="batch__utama" @click="pilih(b)">
                        <div class="batch__kiri">
                            <p class="batch__bahan">{{ b.nama_bahan }}</p>
                            <p class="batch__nomor">
                                {{ b.no_batch }} · diterima {{ tanggalPendek(b.diterima_pada) }}
                            </p>
                        </div>
                        <div class="batch__kanan">
                            <span class="batch__qty">{{ angka(b.qty) }}</span>
                            <span class="batch__uom">{{ b.uom }}</span>
                        </div>
                    </button>

                    <!-- form koreksi muncul di bawah batch yang dipilih -->
                    <div v-if="terpilih?.id === b.id" class="koreksi">
                        <div class="koreksi__baris">
                            <label class="isian">
                                <span class="isian__label">Qty tercatat</span>
                                <div class="isian__mati">{{ angka(b.qty) }} {{ b.uom }}</div>
                            </label>

                            <label class="isian">
                                <span class="isian__label">Qty hasil hitung</span>
                                <input ref="isianQty" v-model.number="draf.qty_benar" type="number" min="0" step="0.01"
                                    :placeholder="b.qty" />
                            </label>

                            <div class="isian">
                                <span class="isian__label">Selisih</span>
                                <div class="isian__mati" :class="kelasSelisih">
                                    {{ selisih === null ? '—' : `${selisih > 0 ? '+' : ''}${angka(selisih)} ${b.uom}` }}
                                </div>
                            </div>
                        </div>

                        <label class="isian">
                            <span class="isian__label">Alasan koreksi</span>
                            <input v-model="draf.alasan" type="text" required
                                placeholder="Contoh: susut penguapan, hasil hitung ulang 21 Juli" />
                            <span class="isian__bantu">
                                Wajib diisi — tercatat permanen di ledger mutasi.
                            </span>
                        </label>

                        <p v-if="pesan" class="galat">{{ pesan }}</p>

                        <div class="koreksi__aksi">
                            <button type="button" class="tbl" @click="batal">Batal</button>
                            <button type="button" class="tbl tbl--utama" :disabled="sedangSimpan" @click="simpan">{{
                                sedangSimpan ? 'Menyimpan' : 'Simpan koreksi' }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <EmptyState v-else pesan="Tidak ada batch yang cocok." petunjuk="Ubah kata kunci pencarian." />
        </section>

        <p class="catatan">
            <strong>Selisih opname tidak dibebankan ke entitas mana pun.</strong>
            Koreksi ini murni fisik, jadi saldo kepemilikan sengaja dibiarkan
            berbeda dari fisik sampai rekonsiliasi sesi produksi berikutnya
            membagi selisihnya secara proporsional. Selisihnya tetap terlihat di
            dashboard sebagai “selisih pembukuan”.
        </p>
    </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { useWarehouse } from '@/features/warehouse/composables/useWarehouse'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    daftarBatch, isLoading, sedangSimpan, muatBatch, koreksiBatch,
} = useWarehouse()

const cariBatch = ref('')
const terpilih = ref(null)
const pesan = ref('')
const isianQty = ref(null)
const draf = reactive({ qty_benar: null, alasan: '' })

onMounted(() => muatBatch())

const batchTampil = computed(() => {
    const q = cariBatch.value.trim().toLowerCase()
    return daftarBatch.value.filter(b =>
        !q
        || b.nama_bahan.toLowerCase().includes(q)
        || b.no_batch.toLowerCase().includes(q),
    )
})

const selisih = computed(() => {
    if (!terpilih.value || draf.qty_benar === null || draf.qty_benar === '') return null
    return Number(draf.qty_benar) - Number(terpilih.value.qty)
})

const kelasSelisih = computed(() => {
    if (selisih.value === null || selisih.value === 0) return ''
    return selisih.value > 0 ? 'naik' : 'turun'
})

const pilih = async (b) => {
    if (terpilih.value?.id === b.id) return batal()
    terpilih.value = b
    draf.qty_benar = null
    draf.alasan = ''
    pesan.value = ''
    await nextTick()
    isianQty.value?.[0]?.focus?.() ?? isianQty.value?.focus?.()
}

const batal = () => {
    terpilih.value = null
    draf.qty_benar = null
    draf.alasan = ''
    pesan.value = ''
}

const simpan = async () => {
    pesan.value = ''
    const hasil = await koreksiBatch(terpilih.value.id, {
        qty_benar: draf.qty_benar,
        alasan: draf.alasan,
    })
    if (hasil.success) batal()
    else pesan.value = hasil.message
}

const angka = (n) =>
    Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
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

.sub {
    margin: .3rem 0 0;
    font-size: .875rem;
    color: var(--redup);
}

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

.cari {
    font-family: inherit;
    font-size: .8125rem;
    padding: .5rem .75rem;
    min-width: 14rem;
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    background: var(--latar);
    color: var(--teks);
}

.cari:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.daftar {
    display: flex;
    flex-direction: column;
}

.batch {
    border-bottom: 1px solid var(--latar);
}

.batch:last-child {
    border-bottom: none;
}

.batch__utama {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem 1.25rem;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.batch__utama:hover {
    background: var(--panel-hover);
}

.batch__bahan {
    margin: 0 0 .15rem;
    font-size: .875rem;
    font-weight: 600;
}

.batch__nomor {
    margin: 0;
    font-size: .75rem;
    color: var(--redup);
}

.batch__kanan {
    text-align: right;
}

.batch__qty {
    font-size: 1rem;
    font-weight: 700;
}

.batch__uom {
    font-size: .6875rem;
    color: var(--redup);
    margin-left: .25rem;
}

/* ── form koreksi ── */
.koreksi {
    padding: 1.15rem 1.25rem 1.35rem;
    background: var(--latar);
    border-top: 1px solid var(--garis);
}

.koreksi__baris {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.1rem;
}

@media (max-width: 640px) {
    .koreksi__baris {
        grid-template-columns: 1fr;
    }
}

.isian {
    display: block;
    margin-bottom: 1.05rem;
}

.koreksi__baris .isian {
    margin-bottom: 0;
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

.isian input {
    width: 100%;
    font-family: inherit;
    font-size: .875rem;
    color: var(--teks);
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .6rem .7rem;
}

.isian input:focus {
    outline: none;
    border-color: var(--biru);
}

.isian__mati {
    padding: .6rem .7rem;
    font-size: .875rem;
    font-weight: 600;
    background: var(--panel);
    border: 1px dashed var(--garis-tegas);
    border-radius: var(--lengkung-kecil);
    color: var(--redup);
}

.isian__mati.naik {
    color: var(--hijau);
    border-color: var(--hijau);
}

.isian__mati.turun {
    color: var(--merah);
    border-color: var(--merah);
}

.isian__bantu {
    display: block;
    margin-top: .35rem;
    font-size: .6875rem;
    color: var(--redup-2);
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

.koreksi__aksi {
    display: flex;
    gap: .6rem;
    justify-content: flex-end;
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

.catatan {
    margin: 1.25rem 0 0;
    padding: .85rem 1rem;
    background: var(--kuning-latar);
    border: 1px solid var(--kuning-garis);
    border-radius: var(--lengkung-kecil);
    font-size: .75rem;
    color: var(--kuning);
    line-height: 1.6;
}
</style>