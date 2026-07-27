/**
* src/features/warehouse/composables/useReceived.js
* ==================================================
* Terima barang PO (penerimaan gudang). Kontrak backend ASLI
* (dikonfirmasi ke purchase_order/views.py + services.py):
*
* GET purchase-order/ daftar PO (di-scope Akun)
* GET purchase-order/{id}/ detail + daftar_item
* POST purchase-order/{id}/terima-barang/ {items:[{item_id,kuantitas,no_batch?}], catatan?}
* role GUDANG/Supervisor
*
* PERBEDAAN PENTING dari draf referensi:
* - Endpoint pakai ID PO di URL (detail action), BUKAN collection.
* - Payload = {items:[...], catatan}, BUKAN {header, items}.
* - Item DIKUNCI ke item PO: penerimaan diarahkan ke ItemPurchaseOrder.id
* (`item_id`). Tidak ada "tambah baris manual" — terima-barang hanya bisa
* untuk item yang memang ada di PO. Barang di luar PO bukan urusan layar ini.
* - `kuantitas` = BERAT dalam KG (backend membandingkannya ke item.quantity
* yang juga KG, dan stock_raw membuat BatchGudang dalam KG). Operator
* menghitung unit -> berat = unit_kg × unit_diterima dikirim sebagai kuantitas.
* - Field PO nyata: id, nomor, suplier_detail.nama, status_penerimaan,
* daftar_item[].{id,nama_item,packaging,unit_kg,total_unit,quantity,
* kuantitas_terkirim,sisa_kuantitas}. (id_transaksi/nama_supplier/status_audit
* di draf lama tidak ada di serializer.)
*
* ⚠ RANTAI KE STOK BELUM NYAMBUNG DI BACKEND: purchase_order.terima_barang
* saat ini TIDAK memanggil stock_raw.catat_penerimaan_po (masih TODO). Jadi
* status_penerimaan PO maju, TAPI BatchGudang belum terbentuk -> barang belum
* muncul di Dashboard Gudang sampai satu baris itu ditambahkan (lihat catatan
* yang dikirim bersama file ini).
*/

import { ref, reactive, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

const bulat2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const angkaAman = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)

export function useReceived() {
    const isLoading = ref(false)
    const isSaving = ref(false)
    const error = ref(null)
    const feedback = ref(null) // { tipe: 'ok'|'galat', teks }

    const poList = ref([])
    const poTerpilih = ref('') // id PO yang dipilih
    const selectedPODetail = ref(null)
    const formItems = ref([])
    const form = reactive({ catatan: '' })

    /** PO yang masih bisa diterima: aktif (belum dibatalkan) & belum PENUH. */
    const fetchAvailablePO = async () => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get('purchase-order/')
            const semua = Array.isArray(data) ? data : (data.results || data.data || [])
            poList.value = semua
                .filter(po => po.aktif !== false && po.status_penerimaan !== 'PENUH')
                .map(po => ({
                    id: po.id,
                    nomor: po.nomor,
                    supplier: po.suplier_detail?.nama ?? 'Supplier tidak diketahui',
                    status_penerimaan: po.status_penerimaan,
                    label: `${po.nomor} — ${po.suplier_detail?.nama ?? 'Supplier ?'}`,
                }))
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat daftar PO.')
        } finally {
            isLoading.value = false
        }
    }

    /** Muat detail PO -> kunci baris form ke item PO, prefill sisa yang belum diterima. */
    const fetchPODetail = async (poId) => {
        selectedPODetail.value = null
        formItems.value = []
        if (!poId) return

        isLoading.value = true
        error.value = null
        feedback.value = null
        try {
            const { data } = await api.get(`purchase-order/${poId}/`)
            selectedPODetail.value = {
                id: data.id,
                nomor: data.nomor,
                supplier: data.suplier_detail?.nama ?? '—',
                status_penerimaan: data.status_penerimaan,
                tanggal: data.tanggal,
            }

            formItems.value = (data.daftar_item || []).map(it => {
                const unitKg = angkaAman(it.unit_kg)
                const quantity = angkaAman(it.quantity)
                const terkirim = angkaAman(it.kuantitas_terkirim)
                const sisa = bulat2(angkaAman(it.sisa_kuantitas ?? (quantity - terkirim)))
                // default: terima seluruh sisa. Unit diturunkan dari sisa (informasi
                // hitung), berat = sisa persis supaya "terima semua" akurat di KG.
                const unitDiterima = unitKg > 0 ? Math.round(sisa / unitKg) : 0
                return {
                    item_id: it.id,
                    nama_item: it.nama_item,
                    packaging: it.packaging,
                    unit_kg: unitKg,
                    total_unit: angkaAman(it.total_unit),
                    quantity,
                    kuantitas_terkirim: terkirim,
                    sisa,
                    unit_diterima: unitDiterima,
                    berat: sisa, // sumber kebenaran yang dikirim (KG)
                    no_batch: '',
                }
            })
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat detail PO.')
        } finally {
            isLoading.value = false
        }
    }

    /** unit_diterima berubah -> hitung ulang berat (KG). */
    const calcWeight = (item) => {
        item.berat = bulat2(angkaAman(item.unit_kg) * angkaAman(item.unit_diterima))
        return item.berat
    }

    const totalTonase = computed(() =>
        bulat2(formItems.value.reduce((s, it) => s + angkaAman(it.berat), 0)),
    )

    /** true kalau ada baris yang berat terimanya melebihi sisa pesanan. */
    const adaLebih = computed(() =>
        formItems.value.some(it => angkaAman(it.berat) > angkaAman(it.sisa) + 1e-6),
    )

    const resetForm = () => {
        poTerpilih.value = ''
        selectedPODetail.value = null
        formItems.value = []
        form.catatan = ''
        error.value = null
        feedback.value = null
    }

    const saveData = async () => {
        error.value = null
        feedback.value = null

        if (!poTerpilih.value) {
            const m = 'Pilih PO yang barangnya datang dulu.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }

        if (formItems.value.some(it => angkaAman(it.berat) < 0)) {
            const m = 'Berat diterima tidak boleh minus.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }

        const items = formItems.value.filter(it => angkaAman(it.berat) > 0)
            .map(it => ({
                item_id: it.item_id,
                kuantitas: bulat2(it.berat),
                ...(it.no_batch?.trim() ? { no_batch: it.no_batch.trim() } : {}),
            }))

        if (items.length === 0) {
            const m = 'Isi minimal satu item dengan berat diterima lebih dari 0 kg.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }

        isSaving.value = true
        try {
            const { data } = await api.post(
                `purchase-order/${poTerpilih.value}/terima-barang/`,
                { items, catatan: form.catatan },
            )
            const status = data?.status_penerimaan
            const teks = status === 'PENUH'
                ? 'Penerimaan tersimpan. PO terisi penuh — siap dilanjut ke audit dokumen akunting.'
                : 'Penerimaan sebagian tersimpan. Sisa masih bisa diterima di kedatangan berikutnya.'
            feedback.value = { tipe: 'ok', teks }
            resetForm()
            await fetchAvailablePO()
            return { success: true, message: teks }
        } catch (err) {
            const m = bacaError(err, 'Gagal menyimpan penerimaan.')
            error.value = m
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        } finally {
            isSaving.value = false
        }
    }

    return {
        isLoading, isSaving, error, feedback,
        poList, poTerpilih, selectedPODetail, formItems, form,
        totalTonase, adaLebih,
        fetchAvailablePO, fetchPODetail, calcWeight, resetForm, saveData,
    }
}