/**
 * src/features/accounting/composables/usePembayaran.js
 * =====================================================
 * Pembayaran ke supplier. Kontrak backend:
 *
 *   GET  purchase-order/                        list PO
 *   POST purchase-order/{id}/catat-pembayaran/  {nominal_dibayar, catatan?, bukti_transfer?}
 *
 * Backend memakai row lock + rekalkulasi status di catat_pembayaran(), jadi
 * status_pembayaran (UNPAID/PARTIAL/PAID) TIDAK dihitung ulang di sini —
 * cukup dibaca. Menghitung ulang di client = dua sumber kebenaran.
 *
 * `bukti_transfer` dikirim sebagai FormData; interceptor di utils/api.js
 * sudah melewatkan Content-Type agar axios menetapkan boundary sendiri.
 *
 * ⚠ Backend menolak kelebihan bayar (guard di patch catat_pembayaran).
 * Validasi di sini cuma untuk umpan balik cepat — backend tetap penentu.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


/** Total dikurangi pembayaran yang MASIH AKTIF (yang dibatalkan tidak dihitung). */
export const sisaTagihan = (po) => {
    const total = Number(po.total_po ?? 0)
    const dibayar = (po.riwayat_pembayaran || [])
        .filter(r => !r.dibatalkan_pada)
        .reduce((s, r) => s + Number(r.nominal_dibayar || 0), 0)
    return total - dibayar
}

const selisihHari = (tanggal) => {
    if (!tanggal) return null
    const t = new Date(tanggal); t.setHours(0, 0, 0, 0)
    const kini = new Date(); kini.setHours(0, 0, 0, 0)
    return Math.round((t - kini) / 86_400_000)
}

export function usePembayaran() {
    const daftarPO = ref([])
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const pilihan = ref(null)


    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            // Ambil data PO dari backend
            const { data } = await api.get('purchase-order/')
            daftarPO.value = Array.isArray(data) ? data : (data.results || data.data || [])
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data purchase order.')
        } finally {
            isLoading.value = false
        }
    }

    const belumLunas = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarPO.value
            .filter(po => po.status_pembayaran !== 'PAID' && !po.dibatalkan_pada)
            .filter(po => po.status_penerimaan !== 'BELUM_DITERIMA')

            .filter(po => !q
                || po.nomor.toLowerCase().includes(q)
                || (po.suplier_detail?.nama ?? '').toLowerCase().includes(q))
            .map(po => ({
                ...po,
                sisa: sisaTagihan(po),
                hari: selisihHari(po.tanggal_jatuh_tempo),
                pembayaranAktif: (po.riwayat_pembayaran || []).filter(r => !r.dibatalkan_pada),
            }))
            .sort((a, b) => {
                if (a.hari === null) return 1
                if (b.hari === null) return -1
                return a.hari - b.hari
            })
    })

    const totalSisa = computed(() =>
        belumLunas.value.reduce((s, po) => s + po.sisa, 0),
    )
    const lewatTempo = computed(() =>
        belumLunas.value.filter(po => po.hari !== null && po.hari < 0),
    )

    const pilih = (po) => { pilihan.value = po; error.value = null }
    const batalPilih = () => { pilihan.value = null; error.value = null }

    /**
     * @param {number} nominal
     * @param {string} catatan
     * @param {File|null} bukti
     */
    const catatPembayaran = async ({ nominal, catatan = '', bukti = null }) => {
        const po = pilihan.value
        if (!po) return { success: false, message: 'Belum ada PO yang dipilih.' }

        const angka = Number(nominal)
        if (!angka || angka <= 0) {
            return { success: false, message: 'Nominal harus lebih dari 0.' }
        }
        if (angka > po.sisa) {
            return {
                success: false,
                message: `Kelebihan bayar: sisa tagihan ${po.sisa.toLocaleString('id-ID')}, `
                    + `nominal ${angka.toLocaleString('id-ID')}.`,
            }
        }

        sedangSimpan.value = true
        try {

            const fd = new FormData()
            fd.append('nominal_dibayar', angka)
            if (catatan) fd.append('catatan', catatan)
            if (bukti) fd.append('bukti_transfer', bukti)
            await api.post(`purchase-order/${po.id}/catat-pembayaran/`, fd)
            await muat()
            pilihan.value = null
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mencatat pembayaran.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    return {
        daftarPO, belumLunas, isLoading, sedangSimpan, error, cari, pilihan,
        totalSisa, lewatTempo,
        muat, pilih, batalPilih, catatPembayaran,
    }
}