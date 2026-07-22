/**
 * composables/useAuth.js
 * =======================
 * Login, logout, dan identitas user. State GLOBAL (ref di luar fungsi) —
 * dipanggil dari banyak komponen, harus salinan yang sama.
 *
 * Kontrak backend:
 *   POST staff_user/login/   {identifier, password} -> {token, access_card}
 *                            `identifier` boleh username ATAU email
 *   POST staff_user/logout/  -> 204
 *   GET  staff_user/me/      -> access_card (untuk rehydrate saat reload)
 *
 * Backend menghapus token lama setiap login — satu sesi aktif per user.
 * Login di perangkat lain otomatis mencabut sesi sebelumnya.
 *
 * ⚠ CATATAN BACKEND: access_card belum mengirim `profil_staff_id`. Padahal
 * PenugasanWO.staff menunjuk ProfilStaff.id, bukan User.id — tanpa itu
 * frontend tidak bisa tahu WO mana yang boleh di-approve user ini.
 * Perbaikannya satu baris di staff_user/services.py build_access_card():
 *     "profil_staff_id": profil.id,
 */

import { ref, computed } from 'vue'
import api, { KUNCI_TOKEN } from '@/utils/api'
import { bacaError } from '@/utils/error'
import { CacheService } from '@/utils/cacheService'

const KUNCI_KARTU = 'pracindo_access_card'

// State global — di LUAR fungsi.
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
    CacheService.clearAll()   // master data ikut dibersihkan, token sudah dihapus di atas
  }

  /** @param identifier username ATAU email */
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
      // Token mungkin sudah mati di server — tidak masalah, tetap bersihkan lokal.
    } finally {
      hapusSesi()
    }
  }

  /**
   * Rehydrate saat halaman di-reload: pastikan token masih hidup dan
   * accessCard terkini (role bisa diubah Supervisor kapan saja).
   * Panggil sekali di App.vue onMounted.
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
    login, logout, muatUlangKartu, hapusSesi,
  }
}