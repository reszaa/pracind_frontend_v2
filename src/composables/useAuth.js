/**
 * composables/useAuth.js
 * =======================
 * Login, logout, dan identitas user — TERSAMBUNG API. State GLOBAL
 * (ref di luar fungsi): dipanggil banyak komponen, harus salinan sama.
 *
 * Kontrak backend:
 *   POST staff_user/login/   {identifier, password} -> {token, access_card}
 *                            `identifier` boleh username ATAU email
 *   POST staff_user/logout/  -> 204
 *   GET  staff_user/me/      -> access_card (rehydrate saat reload)
 *   POST staff_user/register/        {username,email,password,password2,
 *                                     nama_lengkap,jabatan?,telepon?,akun}
 *                                    -> 201, akun NONAKTIF role STAFF.
 *                                    TIDAK mengembalikan token: user belum
 *                                    boleh masuk sebelum Supervisor menyetujui.
 *   GET  staff_user/entitas-publik/  -> [{id,kode,nama}] untuk dropdown daftar
 *
 * Backend menghapus token lama setiap login — satu sesi aktif per user.
 *
 * ⚠ PRASYARAT BACKEND (lihat SPEK-BACKEND.md):
 *   1. staff_user/urls.py punya DUA blok urlpatterns — blok SimpleJWT
 *      menang. Sebelum ditambal, login/ bisa mengembalikan {access,refresh}
 *      (JWT) padahal api.js mengirim `Authorization: Token ...` -> gejala
 *      "login sukses tapi semua request 401".
 *   2. access_card belum mengirim `profil_staff_id` — tombol approve di
 *      papan tugas butuh itu. Patch satu baris di build_access_card().
 */

import { ref, computed } from 'vue'
import api, { KUNCI_TOKEN } from '@/utils/api'
import { bacaError } from '@/utils/error'
import { CacheService } from '@/utils/cacheService'

const KUNCI_KARTU = 'pracindo_access_card'

const token = ref(localStorage.getItem(KUNCI_TOKEN) || null)
const accessCard = ref(JSON.parse(localStorage.getItem(KUNCI_KARTU) || 'null'))
const sedangProses = ref(false)

export function useAuth() {
    const sudahLogin = computed(() => !!token.value && !!accessCard.value)
    const role = computed(() => accessCard.value?.role ?? null)
    const isSupervisor = computed(() => accessCard.value?.is_supervisor ?? false)
    const akun = computed(() => accessCard.value?.akun ?? null)
    const staffId = computed(() => accessCard.value?.profil_staff_id ?? null)

    const simpanSesi = (tokenBaru, kartu) => {
        token.value = tokenBaru
        accessCard.value = kartu
        localStorage.setItem(KUNCI_TOKEN, tokenBaru)
        localStorage.setItem(KUNCI_KARTU, JSON.stringify(kartu))
    }

    const hapusSesi = () => {
        token.value = null
        accessCard.value = null
        localStorage.removeItem(KUNCI_TOKEN)
        localStorage.removeItem(KUNCI_KARTU)
        CacheService.clearAll()
    }

    /** @param identifier username/email */
    const login = async (identifier, password) => {
        sedangProses.value = true
        try {
            const { data } = await api.post('staff_user/login/', { identifier, password })
            simpanSesi(data.token, data.access_card)
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Login gagal.') }
        } finally {
            sedangProses.value = false
        }
    }

    const logout = async () => {
        try {
            await api.post('staff_user/logout/')
        } catch {

        } finally {
            hapusSesi()
        }
    }

    /**
     * Daftar staf baru. Backend memaksa role STAFF dan is_active=False —
     * pendaftar TIDAK bisa memilih wewenangnya sendiri, dan akunnya belum
     * bisa dipakai login sampai Supervisor menyetujui.
     * @returns {{success: boolean, message?: string}}
     */
    const daftar = async (data) => {
        sedangProses.value = true
        try {
            await api.post('staff_user/register/', data)
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Pendaftaran gagal.') }
        } finally {
            sedangProses.value = false
        }
    }

    /** Daftar entitas (PT/CV) untuk dropdown form daftar — tanpa perlu login. */
    const muatEntitas = async () => {
        try {
            const { data } = await api.get('staff_user/entitas-publik/')
            return data
        } catch {
            return []
        }
    }

    /**
     * Rehydrate saat reload: pastikan token hidup dan kartu terkini
     * (role bisa diubah Supervisor kapan saja). Dipanggil App.vue onMounted.
     */
    const muatUlangKartu = async () => {
        if (!token.value) return false
        try {
            const { data } = await api.get('staff_user/me/')
            accessCard.value = data
            localStorage.setItem(KUNCI_KARTU, JSON.stringify(data))
            return true
        } catch {
            // 401 sudah ditangani interceptor (redirect ke login).
            return false
        }
    }

    return {
        token, accessCard, sedangProses,
        sudahLogin, role, isSupervisor, akun, staffId,
        login, daftar, muatEntitas, logout, muatUlangKartu, hapusSesi,
    }
}