/**
 * src/features/accounting/composables/useDocument.js
 * ===================================================
 * Kontrol kelengkapan dokumen PO — TERSAMBUNG API. Dokumen NYATA-nya
 * disimpan di app `dokumen` (Lampiran, append-only), bukan di composable
 * ini. Layar ini merakit "audit row" per PO dari dua sumber:
 *
 *   GET  purchase-order/            list PO (scoped ke Akun) -> partner, tanggal,
 *                                   status_pembayaran, nomor
 *   GET  dokumen/lampiran/          ?purchase_order=&jenis=  (di sini diambil
 *                                   sekali lalu dikelompokkan di klien)
 *   POST dokumen/lampiran/          multipart {purchase_order, jenis, file,
 *                                   nomor_dokumen?} -> unggah / revisi
 *
 * KENAPA kelengkapan dirakit di klien: PurchaseOrderSerializer TIDAK
 * mengirim field `kelengkapan` (statistik_kelengkapan_po ada di
 * dokumen/services tapi belum di-expose). Bentuk yang layar ini butuh —
 * nomor & URL file PER dokumen — memang cuma ada di daftar lampiran, bukan
 * di ringkasan boolean. Kalau nanti `kelengkapan` di-expose di PO
 * serializer, ini bisa disederhanakan (dan sekalian memperbaiki
 * dokumenKurang di useAccounting/useTransaksi yang sekarang selalu kosong).
 *
 * ⚠ APPEND-ONLY: backend tidak punya endpoint hapus lampiran (salah unggah
 * = unggah ulang jadi revisi baru). Karena itu TIDAK ada fungsi hapus di
 * sini — tombol hapus di prototipe lama sengaja dibuang.
 *
 * ⚠ JENIS wajib file: POST lampiran menolak tanpa `file`. Modal upload
 * WAJIB punya input file.
 */

import { reactive, ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

/** Tiga dokumen yang dihitung kelengkapannya untuk PO (cermin JENIS_WAJIB_PO). */
const WAJIB = [
    { key: 'invoice', jenis: 'INVOICE', label: 'Invoice' },
    { key: 'faktur_pajak', jenis: 'FAKTUR', label: 'Faktur Pajak' },
    { key: 'surat_jalan', jenis: 'SURAT_JALAN', label: 'Surat Jalan' },
]

/** Label UI -> enum backend (dipakai saat memilih jenis di modal upload). */
const LABEL_KE_JENIS = {
    'Invoice': 'INVOICE',
    'Faktur Pajak': 'FAKTUR',
    'Surat Jalan': 'SURAT_JALAN',
}

const slotKosong = () => ({ exists: false, doc_no: '', file: null, id: null, oleh: '', pada: null })

export function useDocument() {
    const daftarPO = ref([])
    const daftarLampiran = ref([])
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)

    const searchQuery = ref('')
    const statusFilter = ref('all')   // all | lengkap | tidak_lengkap

    const uploadForm = reactive({
        po_id: null,            // PK PurchaseOrder — dikirim sebagai FK
        po_reference: '',       // nomor PO — tampilan saja
        partner_name: '',
        document_type: 'Invoice',
        document_number: '',
        file: null,             // File dari <input type="file">
    })

    /** Muat PO + seluruh lampiran, lalu biarkan computed merakit audit row. */
    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            const [po, lampiran] = await Promise.all([
                api.get('purchase-order/'),
                api.get('dokumen/lampiran/'),
            ])
            daftarPO.value = po.data.results || po.data
            daftarLampiran.value = lampiran.data.results || lampiran.data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data dokumen.')
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Peta poId -> (jenis -> lampiran TERKINI). Backend mengurutkan
     * -diunggah_pada, jadi kemunculan PERTAMA tiap (po, jenis) = versi terbaru.
     */
    const lampiranPerPO = computed(() => {
        const peta = new Map()
        for (const l of daftarLampiran.value) {
            if (!l.purchase_order) continue          // lewati lampiran SO / surat jalan
            if (!peta.has(l.purchase_order)) peta.set(l.purchase_order, new Map())
            const per = peta.get(l.purchase_order)
            if (!per.has(l.jenis)) per.set(l.jenis, l)
        }
        return peta
    })

    const filesUntuk = (poId) => {
        const files = { invoice: slotKosong(), faktur_pajak: slotKosong(), surat_jalan: slotKosong() }
        const per = lampiranPerPO.value.get(poId)
        if (!per) return files
        for (const w of WAJIB) {
            const l = per.get(w.jenis)
            if (l) {
                files[w.key] = {
                    exists: true,
                    doc_no: l.nomor_dokumen || '(tanpa nomor)',
                    file: l.file,
                    id: l.id,
                    oleh: l.diunggah_oleh_username || '',
                    pada: l.diunggah_pada,
                }
            }
        }
        return files
    }

    /** {count, percentage, isComplete} atas 3 dokumen wajib. */
    const getComplianceStats = (files) => {
        const count = WAJIB.filter(w => files?.[w.key]?.exists).length
        return { count, percentage: Math.round((count / WAJIB.length) * 100), isComplete: count === WAJIB.length }
    }

    /** Satu baris audit per PO aktif. */
    const auditData = computed(() =>
        daftarPO.value
            .filter(po => !po.dibatalkan_pada)
            .map(po => {
                const files = filesUntuk(po.id)
                return {
                    po_id: po.nomor,                              // tampilan
                    id: po.id,                                    // PK untuk upload
                    partner: po.suplier_detail?.nama ?? '—',
                    date: po.tanggal,
                    payment_status: po.status_pembayaran,         // UNPAID | PARTIAL | PAID
                    files,
                    lengkap: getComplianceStats(files).isComplete,
                }
            }),
    )

    const filteredAuditData = computed(() => {
        const q = searchQuery.value.trim().toLowerCase()
        return auditData.value
            .filter(x => {
                if (statusFilter.value === 'lengkap') return x.lengkap
                if (statusFilter.value === 'tidak_lengkap') return !x.lengkap
                return true
            })
            .filter(x => !q
                || x.po_id.toLowerCase().includes(q)
                || x.partner.toLowerCase().includes(q))
    })

    const totalTransactions = computed(() => auditData.value.length)
    const fullyCompliantCount = computed(() => auditData.value.filter(x => x.lengkap).length)
    const missingDocsCount = computed(() => auditData.value.filter(x => !x.lengkap).length)

    /** Siapkan modal untuk satu PO + jenis tertentu (dari tombol "Upload" di baris). */
    const siapkanUpload = (row, docLabel = 'Invoice') => {
        uploadForm.po_id = row.id
        uploadForm.po_reference = row.po_id
        uploadForm.partner_name = row.partner
        uploadForm.document_type = docLabel
        uploadForm.document_number = ''
        uploadForm.file = null
        error.value = null
    }

    const setFile = (fileList) => {
        uploadForm.file = fileList && fileList.length ? fileList[0] : null
    }

    /**
     * Unggah / revisi lampiran. Mengembalikan {success, message} — komponen
     * yang menampilkan umpan balik, bukan alert().
     */
    const handleUploadDocument = async () => {
        if (!uploadForm.po_id) return { success: false, message: 'PO tidak dikenali.' }
        if (!uploadForm.file) return { success: false, message: 'Pilih berkas dokumen dulu.' }

        const jenis = LABEL_KE_JENIS[uploadForm.document_type]
        if (!jenis) return { success: false, message: 'Jenis dokumen tidak dikenal.' }

        sedangSimpan.value = true
        try {
            const fd = new FormData()
            fd.append('purchase_order', uploadForm.po_id)
            fd.append('jenis', jenis)
            fd.append('file', uploadForm.file)
            if (uploadForm.document_number) fd.append('nomor_dokumen', uploadForm.document_number)

            await api.post('dokumen/lampiran/', fd)
            await muat()
            return { success: true }
        } catch (err) {
            const pesan = bacaError(err, 'Gagal mengunggah dokumen.')
            error.value = pesan
            return { success: false, message: pesan }
        } finally {
            sedangSimpan.value = false
        }
    }

    return {
        // state
        isLoading, sedangSimpan, error,
        searchQuery, statusFilter, uploadForm,
        // turunan
        filteredAuditData, totalTransactions, fullyCompliantCount, missingDocsCount,
        getComplianceStats,
        // aksi
        muat, siapkanUpload, setFile, handleUploadDocument,
        WAJIB, LABEL_KE_JENIS,
    }
}