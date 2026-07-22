/**
 * src/router/index.js
 * ====================
 * Dua bentuk rute:
 *
 *   /                 -> DashboardView, TANPA layout (tanpa sidebar)
 *   /accounting/*     -> ModulLayout + halaman  (dengan sidebar)
 *
 * `meta.modul` dibaca ModulLayout untuk menentukan menu sidebar dari
 * config/modules.js — menambah menu cukup di config, bukan di sini.
 *
 * Rute modul yang layarnya belum dibuat SENGAJA tidak didaftarkan. Kartu
 * di dashboard sudah menandainya `siap: false` sehingga tidak bisa diklik;
 * mendaftarkan rute ke komponen yang belum ada cuma menghasilkan error saat
 * navigasi.
 */

import { createRouter, createWebHistory } from 'vue-router'
import { pasangGuards } from './guards'

const ModulLayout = () => import('@/components/layout/ModulLayout.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { publik: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { perluLogin: true },
  },

  // ── Akunting ─────────────────────────────────────────────
  {
    path: '/accounting',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'accounting', roles: ['STAFF'] },
    children: [
      {
        path: '',
        name: 'accounting',
        component: () => import('@/features/accounting/views/DashboardAccounting.vue'),
      },
      {
        path: 'tagihan',
        name: 'accounting-tagihan',
        component: () => import('@/features/accounting/views/BukuTagihan.vue'),
      },
      {
        path: 'transaksi',
        name: 'accounting-transaksi',
        component: () => import('@/features/accounting/views/InputTransaksi.vue'),
      },
      {
        path: 'pembayaran',
        name: 'accounting-pembayaran',
        component: () => import('@/features/accounting/views/PembayaranSupplier.vue'),
      },
    ],
  },

  // ── Papan Tugas ──────────────────────────────────────────
  {
    path: '/work-order',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'work-order' },
    children: [
      {
        path: '',
        name: 'work-order',
        component: () => import('@/features/work-order/views/WorkOrderPanel.vue'),
      },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

pasangGuards(router)

export default router