/**
 * router/guards.js
 * =================
 * Proteksi rute. ⚠ Ini untuk PENGALAMAN, bukan keamanan — backend tetap
 * yang menegakkan akses. Guard di sini mencegah user melihat layar kosong
 * atau menunggu 403; dia tidak melindungi data.
 *
 * Pemakaian di router/index.js:
 *
 *   import { pasangGuards } from './guards'
 *   const router = createRouter({ ... })
 *   pasangGuards(router)
 *
 * Tandai rute yang butuh akses lewat meta:
 *
 *   { path: '/rnd', meta: { perluLogin: true, roles: ['PRODUKSI'] } }
 *   { path: '/login', meta: { publik: true } }
 */

import { useAuth } from '@/composables/useAuth'

export const pasangGuards = (router) => {
  router.beforeEach((to) => {
    const { sudahLogin, role, isSupervisor } = useAuth()

    if (to.meta?.publik) {
      if (to.path === '/login' && sudahLogin.value) return { path: '/' }
      return true
    }

    if (!sudahLogin.value) {
      return { path: '/login', query: { lanjut: to.fullPath } }
    }

    const roles = to.meta?.roles
    if (roles?.length && !isSupervisor.value && !roles.includes(role.value)) {
      return { path: '/', query: { ditolak: to.path } }
    }

    return true
  })
}