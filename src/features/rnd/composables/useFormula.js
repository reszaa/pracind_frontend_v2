/**
 * src/features/rnd/composables/useFormula.js
 * ===========================================
 * Master formula produk. Kontrak (usulan — backend produksi belum punya
 * urls.py; lihat SPEK-BACKEND.md):
 *
 *   GET produksi/formula/          ?aktif=true
 *
 * BACA-SAJA untuk sekarang. Membuat/merevisi formula adalah keputusan
 * R&D yang butuh approval — jangan ditambah di frontend sebelum service
 * dan aturan approval-nya ada di backend.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export function useFormula() {
    const daftarFormula = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const cari = ref('')
    const hanyaAktif = ref(false)

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat formula.')
        } finally {
            isLoading.value = false
        }
    }

    const tampil = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarFormula.value
            .filter(f => !hanyaAktif.value || f.aktif)
            .filter(f => !q || f.nama_produk.toLowerCase().includes(q))
            // Produk sama dikelompokkan berdampingan, versi terbaru dulu.
            .slice()
            .sort((a, b) =>
                a.nama_produk.localeCompare(b.nama_produk) || b.versi - a.versi)
    })

    const jumlahAktif = computed(() =>
        daftarFormula.value.filter(f => f.aktif).length,
    )

    return {
        daftarFormula, tampil,
        isLoading, error, cari, hanyaAktif, jumlahAktif,
        muat,
    }
}
