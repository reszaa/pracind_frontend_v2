<!--
  src/features/accounting/views/PembayaranSuplier.vue
  =====================================================
  Dua kolom: kiri daftar PO yang masih punya sisa, kanan form pembayaran
  untuk PO yang dipilih.

  Kenapa bukan modal: akunting sering perlu melihat riwayat cicilan sambil
  mengisi nominal. Modal menutupi konteks; panel bersebelahan tidak.

  Sisa tagihan dihitung dari pembayaran yang MASIH AKTIF — yang dibatalkan
  tidak dihitung. Bug ini pernah ada di paymentHelper lama dan membuat PO
  terlihat lunas padahal belum.
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/accounting">Akunting</router-link> › Pembayaran Suplier
                </p>
                <h1 class="judul">Pembayaran supplier</h1>
            </div>
        </header>

        <section class="metrik">
            <StatCard label="Total belum dibayar" :nilai="rpk(totalSisa)" :kaki="`${belumLunas.length} PO terbuka`" />
            <StatCard label="Lewat tempo" :nilai="lewatTempo.length" kaki="Perlu segera dibayar"
                :waspada="lewatTempo.length > 0" />
            <StatCard label="Jatuh tempo 7 hari" :nilai="pekanIni.length" kaki="Siapkan dana" />
        </section>

        <div class="dua">
            <!-- ── kiri: daftar PO ─────────────────────────────── -->
            <section class="panel">
                <div class="panel__kepala">
                    <div>
                        <h2 class="panel__judul">PO belum lunas</h2>
                        <p class="panel__sub">Terurut dari jatuh tempo terdekat</p>
                    </div>
                    <input v-model="cari" type="search" class="cari" placeholder="Cari nomor atau supplier" />
                </div>

                <LoadingBar v-if="isLoading" pesan="Membaca purchase order" />

                <div v-else-if="belumLunas.length" class="daftar">
                    <button v-for="po in belumLunas" :key="po.id" class="po"
                        :class="{ 'po--pilih': pilihan?.id === po.id }" @click="pilih(po)">
                        <span class="po__arah" :class="kelasTempo(po.hari)"></span>
                        <span class="po__kiri">
                            <span class="po__nomor">{{ po.nomor }}</span>
                            <span class="po__supplier">{{ po.suplier_detail?.nama ?? '—' }}</span>
                            <span v-if="po.pembayaranAktif.length" class="po__cicil">
                                {{ po.pembayaranAktif.length }}x cicilan tercatat
                            </span>
                        </span>
                        <span class="po__kanan">
                            <span class="po__sisa">{{ rp(po.sisa) }}</span>
                            <span class="po__tempo" :class="kelasTempo(po.hari)">
                                {{ labelTempo(po.hari) }}
                            </span>
                        </span>
                    </button>
                </div>

                <EmptyState v-else pesan="Tidak ada PO yang menunggu pembayaran."
                    petunjuk="Semua tagihan supplier sudah lunas." />
            </section>

            <!-- ── kanan: form pembayaran ──────────────────────── -->
            <aside class="panel panel--form">
                <template v-if="pilihan">
                    <div class="panel__kepala">
                        <div>
                            <h2 class="panel__judul">Catat pembayaran</h2>
                            <p class="panel__sub">{{ pilihan.nomor }}</p>
                        </div>
                        <button class="tutup" aria-label="Batal" @click="batalPilih">×</button>
                    </div>

                    <div class="form">
                        <dl class="ringkas">
                            <div>
                                <dt>Suplier</dt>
                                <dd>{{ pilihan.suplier_detail?.nama }}</dd>
                            </div>
                            <div>
                                <dt>Total tagihan</dt>
                                <dd>{{ rp(pilihan.total_po) }}</dd>
                            </div>
                            <div>
                                <dt>Sudah dibayar</dt>
                                <dd>{{ rp(Number(pilihan.total_po) - pilihan.sisa) }}</dd>
                            </div>
                            <div class="ringkas__sisa">
                                <dt>Sisa</dt>
                                <dd>{{ rp(pilihan.sisa) }}</dd>
                            </div>
                        </dl>

                        <div v-if="pilihan.pembayaranAktif.length" class="riwayat">
                            <p class="riwayat__judul">Cicilan tercatat</p>
                            <div v-for="r in pilihan.pembayaranAktif" :key="r.id" class="riwayat__baris">
                                <span>{{ tanggalPendek(r.tanggal_bayar) }}</span>
                                <span>{{ rp(r.nominal_dibayar) }}</span>
                            </div>
                        </div>

                        <form @submit.prevent="kirim">
                            <label class="isian">
                                <span class="isian__label">Nominal dibayar</span>
                                <div class="isian__uang">
                                    <span>Rp</span>
                                    <input v-model="draf.nominal" type="number" min="1" :max="pilihan.sisa" step="1"
                                        required placeholder="0" />
                                </div>
                                <button type="button" class="isian__penuh" @click="isiPenuh">
                                    Bayar penuh — {{ rp(pilihan.sisa) }}
                                </button>
                            </label>

                            <label class="isian">
                                <span class="isian__label">Catatan <em>opsional</em></span>
                                <input v-model="draf.catatan" type="text" placeholder="Contoh: Pembayaran termin 2" />
                            </label>

                            <label class="isian">
                                <span class="isian__label">Bukti transfer <em>opsional</em></span>
                                <input type="file" accept="image/*,.pdf" @change="pilihBerkas" />
                                <span v-if="draf.bukti" class="isian__berkas">{{ draf.bukti.name }}</span>
                            </label>

                            <p v-if="pesan" class="galat">{{ pesan }}</p>

                            <div class="form__aksi">
                                <button type="button" class="tbl" @click="batalPilih">Batal</button>
                                <button type="submit" class="tbl tbl--utama" :disabled="sedangSimpan">
                                    {{ sedangSimpan ? 'Menyimpan' : 'Catat pembayaran' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </template>

                <EmptyState v-else pesan="Pilih PO di sebelah kiri."
                    petunjuk="Rincian tagihan dan form pembayaran muncul di sini." />
            </aside>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { usePembayaran } from '@/features/accounting/composables/usePayment'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const {
    belumLunas, isLoading, sedangSimpan, cari, pilihan,
    totalSisa, lewatTempo, muat, pilih, batalPilih, catatPembayaran,
} = usePembayaran()

const pesan = ref('')
const draf = reactive({ nominal: '', catatan: '', bukti: null })

onMounted(muat)

const pekanIni = computed(() =>
    belumLunas.value.filter(po => po.hari !== null && po.hari >= 0 && po.hari <= 7),
)

const bersihkanDraf = () => {
    draf.nominal = ''
    draf.catatan = ''
    draf.bukti = null
    pesan.value = ''
}

const isiPenuh = () => { draf.nominal = pilihan.value.sisa }
const pilihBerkas = (e) => { draf.bukti = e.target.files?.[0] ?? null }

const kirim = async () => {
    pesan.value = ''
    const hasil = await catatPembayaran({
        nominal: draf.nominal,
        catatan: draf.catatan,
        bukti: draf.bukti,
    })
    if (hasil.success) bersihkanDraf()
    else pesan.value = hasil.message
}

const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

const rpk = (n) => {
    const a = Number(n)
    if (Math.abs(a) >= 1e9) return `Rp ${(a / 1e9).toFixed(2)} M`
    if (Math.abs(a) >= 1e6) return `Rp ${(a / 1e6).toFixed(1)} jt`
    return rp(a)
}

const tanggalPendek = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const labelTempo = (h) => {
    if (h === null) return 'Tanpa tempo'
    if (h < 0) return `${Math.abs(h)} hari lewat`
    if (h === 0) return 'Hari ini'
    return `${h} hari lagi`
}

const kelasTempo = (h) => {
    if (h === null) return 'aman'
    if (h < 0) return 'telat'
    return h <= 7 ? 'dekat' : 'aman'
}
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

.dua {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 23rem);
    gap: 1.25rem;
    align-items: start;
}

@media (max-width: 1000px) {
    .dua {
        grid-template-columns: 1fr;
    }
}

.panel {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    overflow: hidden;
}

.panel--form {
    position: sticky;
    top: 1.5rem;
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
    min-width: 13rem;
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

/* ── daftar PO ── */
.daftar {
    display: flex;
    flex-direction: column;
}

.po {
    display: grid;
    grid-template-columns: 3px 1fr auto;
    gap: .9rem;
    align-items: center;
    width: 100%;
    padding: .95rem 1.25rem;
    border: none;
    border-bottom: 1px solid var(--latar);
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.po:last-child {
    border-bottom: none;
}

.po:hover {
    background: var(--panel-hover);
}

.po--pilih {
    background: var(--biru-latar);
}

.po__arah {
    align-self: stretch;
    border-radius: 2px;
}

.po__arah.telat {
    background: var(--merah);
}

.po__arah.dekat {
    background: var(--kuning);
}

.po__arah.aman {
    background: var(--garis);
}

.po__kiri {
    display: flex;
    flex-direction: column;
    gap: .18rem;
    min-width: 0;
}

.po__nomor {
    font-size: .8125rem;
    font-weight: 600;
}

.po__supplier {
    font-size: .75rem;
    color: var(--redup);
}

.po__cicil {
    font-size: .6875rem;
    color: var(--biru);
}

.po__kanan {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: .25rem;
}

.po__sisa {
    font-size: .9375rem;
    font-weight: 700;
}

.po__tempo {
    font-size: .6875rem;
}

.telat {
    color: var(--merah);
    font-weight: 600;
}

.dekat {
    color: var(--kuning);
}

.aman {
    color: var(--redup-2);
}

/* ── form ── */
.tutup {
    font-family: inherit;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--redup);
    background: none;
    border: none;
    padding: 0 .25rem;
    cursor: pointer;
}

.tutup:hover {
    color: var(--teks);
}

.form {
    padding: 1.25rem;
}

.ringkas {
    margin: 0 0 1.15rem;
}

.ringkas>div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: .45rem 0;
    border-bottom: 1px solid var(--latar);
}

.ringkas dt {
    font-size: .75rem;
    color: var(--redup);
}

.ringkas dd {
    margin: 0;
    font-size: .8125rem;
    font-weight: 500;
}

.ringkas__sisa {
    border-bottom: none !important;
    padding-top: .7rem !important;
}

.ringkas__sisa dt {
    font-weight: 600;
    color: var(--teks);
}

.ringkas__sisa dd {
    font-size: 1.125rem;
    font-weight: 700;
}

.riwayat {
    margin-bottom: 1.15rem;
    padding: .75rem .9rem;
    background: var(--latar);
    border-radius: var(--lengkung-kecil);
}

.riwayat__judul {
    margin: 0 0 .5rem;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.riwayat__baris {
    display: flex;
    justify-content: space-between;
    font-size: .75rem;
    color: var(--teks-2);
    padding: .18rem 0;
}

.isian {
    display: block;
    margin-bottom: 1.05rem;
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

.isian input[type="text"],
.isian input[type="number"],
.isian input[type="file"] {
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

.isian__uang {
    display: flex;
    align-items: center;
    gap: .5rem;
}

.isian__uang>span {
    font-size: .875rem;
    font-weight: 600;
    color: var(--redup);
    flex-shrink: 0;
}

.isian__penuh {
    margin-top: .4rem;
    font-family: inherit;
    font-size: .6875rem;
    color: var(--biru);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
}

.isian__berkas {
    display: block;
    margin-top: .35rem;
    font-size: .6875rem;
    color: var(--hijau);
}

.galat {
    margin: 0 0 1rem;
    padding: .6rem .8rem;
    background: var(--merah-latar);
    border-radius: var(--lengkung-kecil);
    font-size: .75rem;
    color: var(--merah);
    line-height: 1.5;
}

.form__aksi {
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
</style>