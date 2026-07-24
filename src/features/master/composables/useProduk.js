/**
 * src/features/master/composables/useProduk.js
 * =============================================
 * Master produk jadi (ProdukRingkas) — BACA-SAJA, tersambung API.
 *   GET produk/                     (usulan — lihat SPEK-BACKEND.md)
 *   GET produksi/formula/?aktif=true  untuk kolom status formula
 *                                   (best-effort: kalau modul produksi
 *                                   belum ada, kolom formula kosong)
 * Produk aktif TANPA formula aktif tetap ditandai — tidak bisa diproduksi.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

export function useProduk() {
    const daftarProduk = ref([])
    const daftarFormulaAktif = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const cari = ref('')
    const hanyaAktif = ref(false)

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get('produk/')
            daftarProduk.value = data.results || data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat produk.')
        } finally {
            isLoading.value = false
        }
        // Status formula — best-effort.
        try {
            const { data } = await api.get('produksi/formula/', { params: { aktif: true } })
            daftarFormulaAktif.value = data.results || data
        } catch {
            daftarFormulaAktif.value = []
        }
    }

    const formulaUntuk = (namaProduk) =>
        daftarFormulaAktif.value.find(f => f.nama_produk === namaProduk && f.aktif)
        ?? null

    const tampil = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarProduk.value
            .filter(p => !hanyaAktif.value || p.aktif)
            .filter(p => !q || p.nama.toLowerCase().includes(q))
            .map(p => ({ ...p, formula_aktif: formulaUntuk(p.nama_produk) }))
    })

    const jumlahAktif = computed(() =>
        daftarProduk.value.filter(p => p.aktif).length,
    )

    return {
        daftarProduk, tampil,
        isLoading, error, cari, hanyaAktif, jumlahAktif,
        muat,
    }
}
