/**
 * src/features/warehouse/composables/useWarehouse.js
 * ===================================================
 * Stok bahan baku. Kontrak backend (dikonfirmasi ke stock_raw/views.py):
 *
 *   GET  stock-raw/dashboard/            {data:[{nama_bahan,total_fisik,status,saldo_per_akun}]}
 *   GET  stock-raw/saldo/                ?akun=&nama_bahan=&berhutang=true   (array polos)
 *   GET  stock-raw/batch/                ?nama_bahan=&no_batch=&tersisa=true (array polos)
 *   POST stock-raw/batch/{id}/koreksi/   {qty_benar, alasan}   role GUDANG
 *   GET  stock-raw/mutasi/               ?nama_bahan=&jenis=&akun=&no_batch= (array polos)
 *
 * ⚠ ENVELOPE: dashboard dibungkus {data:[...]} (bukan {results}); batch/saldo/
 * mutasi array polos (proyek belum pasang pagination DRF). Loader menangani
 * keduanya secara defensif.
 *
 * ⚠ CELAH KONTRAK DASHBOARD — view butuh 4 field yang backend BELUM kirim:
 *   - deviasi_invariant : DITURUNKAN di sini = Σ saldo_per_akun.qty − total_fisik
 *                         (arah sesuai SPEK-BACKEND; dibulatkan 2 desimal supaya
 *                          noise float tidak memunculkan selisih palsu).
 *   - uom (level bahan) : DITURUNKAN dari saldo_per_akun[0].uom.
 *   - stok_minimum      : dibaca langsung dari respons; TAMBAHKAN 2 baris di
 *                         DashboardStokView agar terisi (datanya sudah dipegang
 *                         services.status_bahan). Sampai itu ada -> null, garis
 *                         ambang minimum di bar tidak tergambar.
 *   - fisik_tanki       : butuh app `inventory` (Tanki). Sementara 0 -> segmen
 *                         biru tangki di bar kosong. Menyusul bareng modul tangki.
 *
 * DUA LAPIS STOK:
 *   fisik       BatchGudang   — barang nyata, TIDAK PERNAH minus
 *   kepemilikan SaldoEntitas  — per Akun, BOLEH minus (hutang ke pool gudang)
 * Saldo minus BUKAN error — sembuh sendiri saat entitas beli/setor lagi.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

/** Bulatkan ke 2 desimal (uom KG) supaya sisa float tak jadi "selisih". */
const bulat2 = (n) => Math.round(n * 100) / 100

export function useWarehouse() {
    const stokBahan = ref([])
    const daftarBatch = ref([])
    const daftarMutasi = ref([])

    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringStatus = ref('semua')   // semua | aman | menipis | habis

    const muatDashboard = async () => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get('stock-raw/dashboard/')
            stokBahan.value = (data.data || []).map(b => {
                const totalFisik = Number(b.total_fisik) || 0
                const sumSaldo = (b.saldo_per_akun || [])
                    .reduce((s, x) => s + (Number(x.qty) || 0), 0)
                return {
                    ...b,
                    // total_fisik backend = Σ BatchGudang = STOK RAK. View memakai
                    // nama `fisik_gudang` untuk itu -> petakan di sini (tanpa ini
                    // angka utama & bar jadi NaN).
                    fisik_gudang: totalFisik,
                    // enrichment field yang backend belum kirim (lihat header):
                    uom: b.uom ?? b.saldo_per_akun?.[0]?.uom ?? 'KG',
                    stok_minimum: b.stok_minimum ?? null,
                    fisik_tanki: b.fisik_tanki ?? 0,
                    deviasi_invariant: b.deviasi_invariant ?? bulat2(sumSaldo - totalFisik),
                }
            })
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat dashboard stok.')
        } finally {
            isLoading.value = false
        }
    }

    const muatBatch = async ({ nama_bahan = '', tersisa = true } = {}) => {
        isLoading.value = true
        error.value = null
        try {
            const params = new URLSearchParams()
            if (nama_bahan) params.set('nama_bahan', nama_bahan)
            if (tersisa) params.set('tersisa', 'true')
            const { data } = await api.get(`stock-raw/batch/?${params.toString()}`)
            daftarBatch.value = data.results || data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data batch.')
        } finally {
            isLoading.value = false
        }
    }

    const muatMutasi = async ({ nama_bahan = '', jenis = '', akun = '', no_batch = '' } = {}) => {
        isLoading.value = true
        error.value = null
        try {
            const params = new URLSearchParams()
            if (nama_bahan) params.set('nama_bahan', nama_bahan)
            if (jenis) params.set('jenis', jenis)
            if (akun) params.set('akun', akun)
            if (no_batch) params.set('no_batch', no_batch)
            const { data } = await api.get(`stock-raw/mutasi/?${params.toString()}`)
            daftarMutasi.value = data.results || data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat ledger mutasi.')
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Stock opname — SET qty batch ke angka hasil hitung ulang.
     * Alasan WAJIB (backend menolak kalau kosong). Selisih opname TIDAK
     * dibebankan ke akun mana pun — invariant Σ saldo == Σ fisik sengaja
     * dibiarkan meleset sampai rekonsiliasi sesi produksi berikutnya
     * membaginya proporsional; yang bergeser justru deviasi_invariant.
     */
    const koreksiBatch = async (batchId, { qty_benar, alasan }) => {
        if (!alasan?.trim()) {
            return { success: false, message: 'Alasan koreksi wajib diisi.' }
        }
        if (qty_benar === null || qty_benar === '' || Number(qty_benar) < 0) {
            return { success: false, message: 'Qty hasil opname tidak boleh minus.' }
        }

        sedangSimpan.value = true
        try {
            await api.post(`stock-raw/batch/${batchId}/koreksi/`, { qty_benar, alasan })
            await muatBatch()
            await muatDashboard()
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal menyimpan koreksi.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const tampilBahan = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return stokBahan.value
            .filter(b => {
                if (saringStatus.value === 'semua') return true
                return b.status === saringStatus.value.toUpperCase()
            })
            .filter(b => !q || b.nama_bahan.toLowerCase().includes(q))
    })

    const habis = computed(() => stokBahan.value.filter(b => b.status === 'HABIS'))
    const menipis = computed(() => stokBahan.value.filter(b => b.status === 'MENIPIS'))

    /** Saldo minus = entitas sedang berhutang bahan ke pool gudang. */
    const berhutang = computed(() => {
        const hasil = []
        for (const b of stokBahan.value) {
            for (const s of b.saldo_per_akun ?? []) {
                if (Number(s.qty) < 0) {
                    hasil.push({
                        nama_bahan: b.nama_bahan,
                        uom: s.uom ?? b.uom,
                        akun: s.akun_detail?.kode ?? '—',
                        qty: Number(s.qty),
                    })
                }
            }
        }
        return hasil.sort((a, b) => a.qty - b.qty)
    })

    /** Bahan yang Σ saldo-nya tidak cocok dengan Σ fisik (sudah diturunkan di loader). */
    const deviasi = computed(() =>
        stokBahan.value.filter(b => Number(b.deviasi_invariant) !== 0),
    )

    return {
        stokBahan, daftarBatch, daftarMutasi, tampilBahan,
        isLoading, sedangSimpan, error, cari, saringStatus,
        habis, menipis, berhutang, deviasi,
        muatDashboard, muatBatch, muatMutasi, koreksiBatch,
    }
}