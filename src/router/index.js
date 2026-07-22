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
    meta: { perluLogin: true, modul: 'accounting' },
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
        component: () => import('@/features/accounting/views/PembayaranSuplier.vue'),
      },
      // ── purchase order ──
      // Ada di bawah /accounting, BUKAN modul sendiri: akunting yang membuat
      // PO, dan "procurement" cuma nama lain untuk pekerjaan yang sama. Yang
      // berbeda peran cuma penerimaan barang (gudang) — itu tombol di dalam
      // PODetail, bukan modul terpisah.
      {
        path: 'po',
        name: 'accounting-po',
        component: () => import('@/features/accounting/views/PurchaseOrder.vue'),
      },
      {
        path: 'po/buat',
        name: 'accounting-po-buat',
        component: () => import('@/features/accounting/views/BuatPO.vue'),
      },
      {
        path: 'po/:id',
        name: 'accounting-po-detail',
        component: () => import('@/features/accounting/views/PODetail.vue'),
        props: true,
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