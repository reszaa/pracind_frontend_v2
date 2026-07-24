/**
 * src/features/accounting/composables/usePurchaseOrder.js
 * =======================================================
 * Kontrak backend:
 *
 *   GET  purchase-order/                      list (scoped ke Akun user)
 *   GET  purchase-order/{id}/                 detail  ⚠ pastikan retrieve
 *                                             memang ada di ViewSet (standar
 *                                             ModelViewSet: otomatis)
 *   GET  purchase-order/preview-nomor/        ?akun={id}&tanggal=YYYY-MM-DD
 *   POST purchase-order/                      buat PO
 *   POST purchase-order/{id}/terima-barang/   {items:[{item_id,kuantitas,no_batch?}]}
 *                                             ⚠ field `catatan` di payload
 *                                             masih ASUMSI — cocokkan dengan
 *                                             service terima_barang; kalau
 *                                             tidak ada, backend akan
 *                                             mengabaikannya tanpa error.
 *
 * ⚠ NOMOR PO DIBUAT BACKEND. preview-nomor hanya PERKIRAAN — angkanya bisa
 * bergeser kalau ada PO lain dibuat di antara preview dan submit. Nomor
 * final selalu diambil dari respons POST, jangan dari preview.
 *
 * ⚠ PAYLOAD: `akun` dan `suplier` adalah PRIMARY KEY, bukan string. Versi
 * frontend lama mengirim nama ("PT Anu") dan kode entitas ("PT") — itu
 * kontrak backend lama dan akan ditolak.
 *
 * ⚠ ENAM SERVICE HILANG di backend: koreksi_header_po, koreksi_item,
 * tambah_item_po, hapus_item_po, koreksi_penerimaan, batalkan_pembayaran.
 * Endpoint-nya ada di views tapi fungsinya tidak ada -> AttributeError 500.
 * Karena itu composable ini TIDAK menyediakan fungsi edit PO.
 *
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export function usePurchaseOrder() {
    const daftarPO = ref([])
    const daftarSuplier = ref([])
    const daftarAkun = ref([])
    const poAktif = ref(null)           // detail yang sedang dibuka (PODetail)
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringStatus = ref('semua')   // semua | belum | sebagian | penuh

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data purchase order.')
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Detail satu PO untuk PODetail. Mengambil sendiri berdasarkan id —
     * TIDAK bergantung daftarPO sudah dimuat, karena state composable ini
     * per-instance dan PODetail tidak memanggil muat().
     * @param {number|string} poId  route.params.id datang sebagai STRING.
     */
    const muatDetail = async (poId) => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            poAktif.value = null
            error.value = bacaError(err, 'Gagal memuat detail PO.')
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Penerimaan barang — boleh parsial, boleh berkali-kali.
     * @param {number|string} poId
     * @param {Array} items     [{item_id, kuantitas, no_batch?}]
     * @param {string} catatan  ⚠ lihat catatan payload di header
     */
    const terimaBarang = async (poId, items, catatan = '') => {
        if (!items?.length) {
            return { success: false, message: 'Tidak ada kuantitas yang diisi.' }
        }
        sedangSimpan.value = true
        try {

            await api.post(`purchase-order/${poId}/terima-barang/`, {
              items, catatan,
            })
            await muatDetail(poId)
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mencatat penerimaan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    /**
     * Perkiraan nomor untuk ditampilkan di form. BUKAN nomor final —
     * beri label "sementara" di UI supaya tidak dikira sudah pasti.
     */
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

    /**
     * @param {number} akun     PK entitas.Akun
     * @param {number} suplier  PK suplier.Suplier
     * @param {string} tanggal  'YYYY-MM-DD'
     * @param {Array}  daftar_item  [{nama_item, packaging?, unit_kg?, total_unit, quantity, harga_satuan?}]
     */
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
            return { success: true, po: data }   // data.nomor = nomor FINAL
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
