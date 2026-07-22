/**
 * src/features/accounting/composables/usePurchaseOrder.js
 * =======================================================
 * Kontrak backend:
 *
 *   GET  purchase-order/                      list (scoped ke Akun user)
 *   GET  purchase-order/preview-nomor/        ?akun={id}&tanggal=YYYY-MM-DD
 *   POST purchase-order/                      buat PO
 *   POST purchase-order/{id}/terima-barang/   {items:[{item_id,kuantitas,no_batch?}]}
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
 */

import { ref, computed } from 'vue'
// import api from '@/utils/api'
// import { bacaError } from '@/utils/error'
import * as mock from '@/mock/purchaseOrderData'

const MODE_MOCK = true

export function usePurchaseOrder() {
    const daftarPO = ref([])
    const daftarSuplier = ref([])
    const daftarAkun = ref([])
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringStatus = ref('semua')   // semua | belum | sebagian | penuh

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 350))
                daftarPO.value = mock.daftarPO
                daftarSuplier.value = mock.daftarSuplier
                daftarAkun.value = mock.daftarAkun
            } else {
                // const [po, sup, akun] = await Promise.all([
                //   api.get('purchase-order/'),
                //   api.get('suplier/', { params: { aktif: true } }),
                //   api.get('entitas/akun/'),
                // ])
                // daftarPO.value = po.data.results || po.data
                // daftarSuplier.value = sup.data.results || sup.data
                // daftarAkun.value = akun.data.results || akun.data
            }
        } catch (err) {
            error.value = 'Gagal memuat data purchase order.'
            // error.value = bacaError(err, 'Gagal memuat data purchase order.')
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Perkiraan nomor untuk ditampilkan di form. BUKAN nomor final —
     * beri label "sementara" di UI supaya tidak dikira sudah pasti.
     */
    const previewNomor = async (akunId, tanggal) => {
        if (!akunId || !tanggal) return null
        try {
            if (MODE_MOCK) {
                const akun = daftarAkun.value.find(a => a.id === akunId)
                const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI',
                    'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
                const d = new Date(tanggal)
                return `PO/${akun?.kode ?? '???'}/${d.getFullYear()}/${romawi[d.getMonth()]}/007`
            }
            // const { data } = await api.get('purchase-order/preview-nomor/', {
            //   params: { akun: akunId, tanggal },
            // })
            // return data.nomor_preview
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
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 600))
                const akunObj = daftarAkun.value.find(a => a.id === akun)
                const supObj = daftarSuplier.value.find(s => s.id === suplier)
                const total = daftar_item.reduce(
                    (s, i) => s + Number(i.quantity) * Number(i.harga_satuan || 0) * 1.11, 0,
                )
                const baru = {
                    id: Date.now(),
                    nomor: await previewNomor(akun, tanggal),
                    tanggal, tanggal_jatuh_tempo, catatan,
                    status_penerimaan: 'BELUM_DITERIMA',
                    status_pembayaran: 'UNPAID',
                    dibatalkan_pada: null,
                    total_po: total.toFixed(2),
                    akun_detail: akunObj,
                    suplier_detail: supObj,
                    daftar_item: daftar_item.map((i, n) => ({
                        id: Date.now() + n, ...i,
                        kuantitas_terkirim: '0.00', no_batch: '', tarif_ppn: '0.1100',
                    })),
                    riwayat_pembayaran: [],
                }
                daftarPO.value = [baru, ...daftarPO.value]
                return { success: true, po: baru }
            }

            // const { data } = await api.post('purchase-order/', {
            //   akun, suplier, tanggal, tanggal_jatuh_tempo, catatan, daftar_item,
            // })
            // await muat()
            // return { success: true, po: data }   // data.nomor = nomor FINAL
        } catch (err) {
            return { success: false, message: 'Gagal menyimpan PO.' }
            // return { success: false, message: bacaError(err, 'Gagal menyimpan PO.') }
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
        daftarPO, daftarSuplier, daftarAkun, tampil,
        isLoading, sedangSimpan, error, cari, saringStatus,
        belumDiterima, totalBulanIni,
        muat, previewNomor, buatPO,
    }
}