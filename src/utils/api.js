/**
 * utils/api.js
 * =============
 * Disesuaikan dari versi lama. Yang berubah:
 *
 * 1. Response interceptor DITAMBAHKAN. ExpiringTokenAuthentication di backend
 *    membunuh token setelah TOKEN_EXPIRE_HOURS (default 12 jam), jadi 401
 *    adalah kejadian RUTIN, bukan kasus langka. Tanpa penanganan, user cuma
 *    melihat layar yang diam.
 *
 * 2. Cek endpoint auth diperbaiki: '/auth/login' tidak ada di pracindodb.
 *    Yang benar 'staff_user/login/'.
 *
 * 3. baseURL dari env — jangan hardcode 127.0.0.1, nanti gagal saat deploy.
 *
 * 4. Content-Type default DIHAPUS dari config global: upload lampiran &
 *    bukti transfer pakai FormData, dan axios perlu menetapkan boundary
 *    multipart sendiri. Memaksa application/json membuat upload gagal.
 */

import axios from 'axios'

export const KUNCI_TOKEN = 'pracindo_token'
const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: 'application/json' },
})

// Endpoint yang TIDAK boleh dikirimi token.
const TANPA_TOKEN = ['staff_user/login/']

api.interceptors.request.use(
  (config) => {
    const url = config.url || ''
    const token = localStorage.getItem(KUNCI_TOKEN)
    if (token && !TANPA_TOKEN.some(p => url.includes(p))) {
      config.headers.Authorization = `Token ${token}`
    }
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''

    if (status === 401 && !TANPA_TOKEN.some(p => url.includes(p))) {
      localStorage.removeItem(KUNCI_TOKEN)
      localStorage.removeItem('pracindo_access_card')
      if (!window.location.pathname.startsWith('/login')) {
        const tujuan = window.location.pathname + window.location.search
        window.location.href = `/login?lanjut=${encodeURIComponent(tujuan)}`
      }
    }
    return Promise.reject(error)
  },
)

export default api