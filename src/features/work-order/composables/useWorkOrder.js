/**
 * features/work-order/composables/useWorkOrder.js
 * ================================================
 * Disesuaikan dari versi lama ke kontrak pracindodb.
 *
 * PERUBAHAN ENDPOINT:
 *   workorder/?status=PENDING   -> work-order/mading/     (sudah difilter per user login)
 *   work_order/create/          -> work-order/            (POST)
 *   work_order/{id}/validasi/   -> work-order/{id}/approve/
 *   staff/profil-staff/         -> staff_user/profil/     ⚠ Supervisor-only
 *
 * PERUBAHAN PAYLOAD:
 *   ditujukan_untuk  -> staff_ids
 *   + tanggal (WAJIB), + deadline (opsional)
 *
 * PERUBAHAN RESPONS:
 *   response.data.data -> response.data (mading) / response.data.results (paginated)
 *
 * FIELD YANG TIDAK ADA DI BACKEND: `bisa_validasi` dan `dibuat_oleh_saya`
 * dihitung di sini dari accessCard — backend tidak mengirimnya.
 *
 * ATURAN APPROVE: cukup SATU staf yang ditag menyetujui, WO langsung hilang
 * dari mading semua orang. Backend menolak kalau bukan yang ditag.

 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export function useWorkOrder(accessCard) {
    const mading = ref([])          // WO yang ditag ke saya, belum di-approve
    const semuaWO = ref([])         // seluruh WO (untuk halaman daftar)
    const staffList = ref([])
    const isLoading = ref(false)
    const sedangApprove = ref(null) // id WO yang tombolnya sedang diproses
    const error = ref(null)

    const staffId = computed(() => accessCard?.value?.profil_staff_id ?? null)
    const username = computed(() => accessCard?.value?.username ?? '')

    /** Pengganti `bisa_validasi` — dihitung di client. */
    const bisaApprove = (wo) =>
        !wo.selesai && wo.penugasan?.some(p => p.staff === staffId.value)

    /** Pengganti `dibuat_oleh_saya`. */
    const sayaBuat = computed(() =>
        semuaWO.value.filter(wo => wo.dibuat_oleh_username === username.value)
    )

    const terlambat = computed(() => mading.value.filter(wo => wo.terlambat))

    const fetchMading = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat papan tugas.')
        } finally {
            isLoading.value = false
        }
    }

    const fetchSemua = async ({ selesai = null, tanggal = null } = {}) => {
        isLoading.value = true
        try {
        } catch (err) {
            error.value = 'Gagal memuat daftar tugas.'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * ⚠ Endpoint staff_user/profil/ hanya boleh diakses SUPERVISOR
     * (permission_classes = [IsAuthenticated, IsSupervisor]).
     * Staf biasa akan dapat 403 — form "tag staff" perlu sumber lain, atau
     * backend perlu endpoint daftar staf ringkas untuk semua staf login.
     */
    const fetchStaffList = async () => {
        try {
        } catch (err) {
            error.value = 'Gagal memuat daftar staf. Butuh akses Supervisor.'
        }
    }

    /**
     * @param {string} judul
     * @param {string} deskripsi
     * @param {number[]} staffIds   id ProfilStaff yang ditag
     * @param {string} tanggal      'YYYY-MM-DD' — WAJIB
     * @param {string|null} deadline ISO datetime — opsional
     */
    const buatWO = async ({ judul, deskripsi = '', staffIds, tanggal, deadline = null }) => {
        if (!staffIds?.length) {
            return { success: false, message: 'Minimal tag 1 staf.' }
        }
        isLoading.value = true
        try {
            const { data } = await api.post('work-order/', {
              judul, deskripsi, tanggal, deadline, staff_ids: staffIds,
            })
            await fetchMading()
            return { success: true, wo: data }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal membuat tugas.') }
        } finally {
            isLoading.value = false
        }
    }

    /** Satu approval menutup WO untuk semua yang ditag. */
    const approveWO = async (wo, catatan = '') => {
        sedangApprove.value = wo.id
        try {
            await api.post(`work-order/${wo.id}/approve/`, { catatan })
            await fetchMading()
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal menyetujui tugas.') }
        } finally {
            sedangApprove.value = null
        }
    }

    return {
        mading, semuaWO, staffList, isLoading, error, sedangApprove,
        staffId, bisaApprove, sayaBuat, terlambat,
        fetchMading, fetchSemua, fetchStaffList, buatWO, approveWO,
    }
}