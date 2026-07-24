/**
 * src/features/master/composables/useSuplier.js
 * ===============================================
 * Master suplier — BACA-SAJA. Sumber: GET suplier/ — endpoint
 * yang sama yang dipakai form BuatPO.
 *
 * Kontrak: GET suplier/  ?aktif=true  (SUDAH ADA — dipakai BuatPO).
 * Tambah/ubah suplier butuh service backend yang belum ditulis.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export function useSuplier() {
    const daftarSuplier = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringKategori = ref('semua')   // semua | raw_material | kemasan

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat supplier.')
        } finally {
            isLoading.value = false
        }
    }

    const tampil = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarSuplier.value
            .filter(s => saringKategori.value === 'semua'
                || s.kategori === saringKategori.value.toUpperCase())
            .filter(s => !q
                || s.nama.toLowerCase().includes(q)
                || (s.kota ?? '').toLowerCase().includes(q))
    })

    const jumlahAktif = computed(() =>
        daftarSuplier.value.filter(s => s.aktif).length,
    )

    return {
        daftarSuplier, tampil,
        isLoading, error, cari, saringKategori, jumlahAktif,
        muat,
    }
}
