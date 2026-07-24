/**
 * src/features/rnd/composables/useProduksi.js
 * ============================================
 * Sesi produksi & tangki. Kontrak (usulan — lihat SPEK-BACKEND.md):
 *
 *   GET  produksi/sesi/                 ?status=
 *   GET  produksi/tanki/
 *   POST produksi/sesi/{id}/packaging/  {hasil_qty, kemasan:[{nama,jumlah}], catatan?}
 *
 * PACKAGING = sesi SELESAI. Service backend HARUS: set status/hasil,
 * kosongkan tangki, debit saldo & fisik_tanki per bahan (mutasi PEMAKAIAN).
 * Lihat SPEK-BACKEND.md.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export function useProduksi() {
    const daftarSesi = ref([])
    const daftarTanki = ref([])
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const saringStatus = ref('semua')   // semua | berjalan | dijadwalkan | selesai

    const muatSesi = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat sesi produksi.')
        } finally {
            isLoading.value = false
        }
    }

    const muatTanki = async () => {
        isLoading.value = true
        try {
        } catch (err) {
            error.value = 'Gagal memuat data tangki.'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Catat hasil packaging — menutup sesi.
     * @param {number} sesiId
     * @param {number} hasil_qty        hasil jadi (uom_hasil sesi)
     * @param {Array}  kemasan          [{nama, jumlah}]
     * @param {string} catatan
     */
    const catatPackaging = async (sesiId, { hasil_qty, kemasan, catatan = '' }) => {
        const isiKemasan = (kemasan ?? []).filter(k => k.nama?.trim() && Number(k.jumlah) > 0)
        if (!Number(hasil_qty) || Number(hasil_qty) <= 0) {
            return { success: false, message: 'Hasil jadi harus lebih dari 0.' }
        }
        if (!isiKemasan.length) {
            return { success: false, message: 'Minimal satu kemasan dengan jumlah di atas 0.' }
        }

        sedangSimpan.value = true
        try {

            await api.post(`produksi/sesi/${sesiId}/packaging/`, {
              hasil_qty, kemasan: isiKemasan, catatan,
            })
            await Promise.all([muatSesi(), muatTanki()])
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mencatat packaging.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const tampil = computed(() => {
        if (saringStatus.value === 'semua') return daftarSesi.value
        return daftarSesi.value.filter(
            s => s.status === saringStatus.value.toUpperCase(),
        )
    })

    const berjalan = computed(() =>
        daftarSesi.value.filter(s => s.status === 'BERJALAN'),
    )
    const dijadwalkan = computed(() =>
        daftarSesi.value.filter(s => s.status === 'DIJADWALKAN'),
    )
    const selesaiBulanIni = computed(() => {
        const kini = new Date()
        return daftarSesi.value.filter(s => {
            if (s.status !== 'SELESAI' || !s.selesai_pada) return false
            const d = new Date(s.selesai_pada)
            return d.getMonth() === kini.getMonth() && d.getFullYear() === kini.getFullYear()
        })
    })

    return {
        daftarSesi, daftarTanki, tampil,
        isLoading, sedangSimpan, error, saringStatus,
        berjalan, dijadwalkan, selesaiBulanIni,
        muatSesi, muatTanki, catatPackaging,
    }
}
