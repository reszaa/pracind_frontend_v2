/**
 * src/features/accounting/composables/usePurchaseOrder.js
 * =======================================================
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

export function usePurchaseOrder() {
    const daftarPO = ref([])
    const daftarSuplier = ref([])
    const daftarAkun = ref([])
    const poAktif = ref(null)
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringStatus = ref('semua')

    // 1. Muat Data Utama (PO, Akun/Entitas, Suplier)
    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            // Menggunakan Rute Asli Sesuai Daftar Endpoint Backend Anda
            const [resPO, resAkun, resSuplier] = await Promise.all([
                api.get('purchase-order/'),
                api.get('staff_user/entitas-publik/'),
                api.get('suplier/')
            ])

            daftarPO.value = resPO.data?.results || resPO.data || []
            daftarAkun.value = resAkun.data?.results || resAkun.data || []
            daftarSuplier.value = resSuplier.data?.results || resSuplier.data || []
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data purchase order.')
        } finally {
            isLoading.value = false
        }
    }

    // 2. Muat Detail PO spesifik
    const muatDetail = async (poId) => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get(`purchase-order/${poId}/`)
            poAktif.value = data
        } catch (err) {
            poAktif.value = null
            error.value = bacaError(err, 'Gagal memuat detail PO.')
        } finally {
            isLoading.value = false
        }
    }

    // 3. Catat Penerimaan Fisik Gudang
    const terimaBarang = async (poId, items, catatan = '') => {
        if (!items?.length) {
            return { success: false, message: 'Tidak ada kuantitas yang diisi.' }
        }

        // [PERBAIKAN]: Memaksa struktur mapping data agar selalu cocok 
        // dengan requirement serializer/services DRF backend.
        const payloadItems = items.map(item => ({
            item_id: item.item_id || item.id,
            kuantitas: Number(item.kuantitas || item.qty),
            no_batch: item.no_batch || ''
        })).filter(item => item.kuantitas > 0) // Cegah kirim data kosong

        if (!payloadItems.length) {
            return { success: false, message: 'Kuantitas penerimaan harus lebih dari 0.' }
        }

        sedangSimpan.value = true
        try {
            await api.post(`purchase-order/${poId}/terima-barang/`, {
                items: payloadItems,
                catatan
            })
            await muatDetail(poId)
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mencatat penerimaan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    // 4. Request Nomor PO Sementara
    const previewNomor = async (akunId, tanggal) => {
        if (!akunId || !tanggal) return null
        try {
            const { data } = await api.get('purchase-order/preview-nomor/', {
                params: { akun: akunId, tanggal },
            })
            return data.nomor_preview
        } catch {
            return null
        }
    }

    // 5. Submit Form Buat PO Baru
    const buatPO = async ({ akun, suplier, tanggal, daftar_item,
        tanggal_jatuh_tempo = null, catatan = '' }) => {
        if (!daftar_item?.length) {
            return { success: false, message: 'Minimal harus ada 1 item.' }
        }
        sedangSimpan.value = true
        try {
            const { data } = await api.post('purchase-order/', {
                akun, suplier, tanggal, tanggal_jatuh_tempo, catatan, daftar_item,
            })
            await muat()
            return { success: true, po: data }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal menyimpan PO.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const tampil = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarPO.value
            .filter(po => {
                if (saringStatus.value === 'belum') return po.status_penerimaan === 'BELUM_DITERIMA'
                if (saringStatus.value === 'sebagian') return po.status_penerimaan === 'SEBAGIAN'
                if (saringStatus.value === 'penuh') return po.status_penerimaan === 'PENUH'
                return true
            })
            .filter(po => !q
                || po.nomor.toLowerCase().includes(q)
                || (po.suplier_detail?.nama ?? '').toLowerCase().includes(q))
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    })

    const belumDiterima = computed(() =>
        daftarPO.value.filter(po =>
            po.status_penerimaan !== 'PENUH' && !po.dibatalkan_pada),
    )

    const totalBulanIni = computed(() => {
        const kini = new Date()
        return daftarPO.value
            .filter(po => {
                const d = new Date(po.tanggal)
                return d.getMonth() === kini.getMonth() && d.getFullYear() === kini.getFullYear()
            })
            .reduce((s, po) => s + Number(po.total_po ?? 0), 0)
    })

    return {
        daftarPO, daftarSuplier, daftarAkun, poAktif, tampil,
        isLoading, sedangSimpan, error, cari, saringStatus,
        belumDiterima, totalBulanIni,
        muat, muatDetail, terimaBarang, previewNomor, buatPO,
    }
}