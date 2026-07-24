/**
 * src/features/master/composables/useCustomer.js
 * ===============================================
 * Master customer — BACA-SAJA, tersambung API.
 *   GET customer/       (usulan — lihat SPEK-BACKEND.md)
 *   GET sales-order/    untuk statistik order per customer (best-effort:
 *                       kalau endpoint SO belum ada, kolom order kosong
 *                       tanpa menggagalkan daftar customer)
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

export function useCustomer() {
    const daftarCustomer = ref([])
    const daftarSO = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const cari = ref('')

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get('customer/')
            daftarCustomer.value = data.results || data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat customer.')
        } finally {
            isLoading.value = false
        }
        // Statistik SO — best-effort, terpisah supaya kegagalan SO
        // tidak menggagalkan daftar customer.
        try {
            const { data } = await api.get('sales-order/')
            daftarSO.value = data.results || data
        } catch {
            daftarSO.value = []
        }
    }

    /** Statistik SO per customer — dihitung dari sumber SO yang sama. */
    const statistikSO = (customerId) => {
        const milik = daftarSO.value.filter(
            so => so.customer_detail?.id === customerId,
        )
        if (!milik.length) return { jumlah: 0, terakhir: null }
        const terakhir = milik.map(so => so.tanggal).sort().at(-1)
        return { jumlah: milik.length, terakhir }
    }

    const tampil = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return daftarCustomer.value
            .filter(c => !q
                || c.nama.toLowerCase().includes(q)
                || c.kode.toLowerCase().includes(q)
                || (c.alamat ?? '').toLowerCase().includes(q))
            .map(c => ({ ...c, so: statistikSO(c.id) }))
    })

    const jumlahAktif = computed(() =>
        daftarCustomer.value.filter(c => c.aktif).length,
    )

    return {
        daftarCustomer, tampil,
        isLoading, error, cari, jumlahAktif,
        muat,
    }
}
