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
      // ── purchase order ──
      // Ada di bawah /accounting, BUKAN modul sendiri: akunting yang membuat
      // PO, dan "procurement" cuma nama lain untuk pekerjaan yang sama. Yang
      // berbeda peran cuma penerimaan barang (gudang) — itu tombol di dalam
      // PODetail, bukan modul terpisah.
      {
        path: 'po/:id',
        name: 'accounting-po-detail',
        component: () => import('@/features/accounting/views/PODetail.vue'),
        props: true,
      },
    ],
  },

  // ── Buku Tagihan (ruang peninjauan, rel ikon sendiri) ────
  {
    path: '/accounting/tagihan',
    component: () => import('@/features/accounting/layout/BukuTagihanLayout.vue'),
    meta: { perluLogin: true, modul: 'tagihan' },
    children: [
      {
        path: '',
        name: 'accounting-tagihan',
        component: () => import('@/features/accounting/views/BukuTagihan.vue'),
      },
    ],
  },
  {
    path: '/accounting/po',
    component: () => import('@/features/accounting/layout/BukuTagihanLayout.vue'),
    meta: { perluLogin: true, modul: 'tagihan' },
    children: [
      {
        path: '',
        name: 'accounting-po',
        component: () => import('@/features/accounting/views/PurchaseOrder.vue'),
      },
    ],
  },

  // ── Input Transaksi (ruang kerja, rel ikon sendiri) ──────
  // SEJAJAR modul, bukan anak /accounting. Kalau ditaruh sebagai child,
  // ModulLayout yang membungkusnya dan rel ikon tidak pernah muncul.
  {
    path: '/accounting/transaksi',
    component: () => import('@/features/accounting/layout/InputTransaksiLayout.vue'),
    meta: { perluLogin: true, modul: 'transaksi' },
    children: [
      {
        // Tidak ada layar "pilih transaksi" tersendiri — rel ikon di kiri
        // SUDAH jadi pemilihnya. Masuk ruang ini langsung mendarat di
        // Pembelian; menu lain sejauh satu klik di rel.
        path: '',
        redirect: '/accounting/transaksi/pembelian',
      },
      {
        path: 'pembelian',
        name: 'transaksi-pembelian',
        component: () => import('@/features/accounting/views/BuatPO.vue'),
      },
      {
        path: 'pembayaran',
        name: 'transaksi-pembayaran',
        component: () => import('@/features/accounting/views/PembayaranSuplier.vue'),
      },
    ],
  },

  // ── Gudang ───────────────────────────────────────────────
  {
    path: '/warehouse',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'warehouse' },
    children: [
      {
        path: '',
        name: 'warehouse',
        component: () => import('@/features/warehouse/views/DashboardGudang.vue'),
      },
      {
        path: 'opname',
        name: 'warehouse-opname',
        component: () => import('@/features/warehouse/views/Opname.vue'),
      },
      {
        // Layar yang sama dengan /rnd/tangki — pintu masuk untuk GUDANG
        // tanpa membuka formula. Lihat header TankMonitoring.vue.
        path: 'tangki',
        name: 'warehouse-tangki',
        component: () => import('@/features/master/views/TankMonitoring.vue'),
      },
    ],
  },

  // ── Produksi ─────────────────────────────────────────────
  {
    path: '/rnd',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'rnd' },
    children: [
      {
        path: '',
        name: 'rnd',
        component: () => import('@/features/rnd/views/Produksi.vue'),
      },
      {
        path: 'formula',
        name: 'rnd-formula',
        component: () => import('@/features/rnd/views/FormulaMaster.vue'),
      },
      {
        path: 'tangki',
        name: 'rnd-tangki',
        component: () => import('@/features/master/views/TankMonitoring.vue'),
      },
    ],
  },

  // ── Pengiriman ───────────────────────────────────────────
  {
    path: '/logistic',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'logistic' },
    children: [
      {
        path: '',
        name: 'logistic',
        component: () => import('@/features/logistic/views/Monitor.vue'),
      },
      {
        path: 'buat',
        name: 'logistic-buat',
        component: () => import('@/features/logistic/views/FormPengirimanCustomer.vue'),
      },
      {
        path: 'armada',
        name: 'logistic-armada',
        component: () => import('@/features/logistic/views/Armada.vue'),
      },
    ],
  },

  // ── Master Data ──────────────────────────────────────────
  {
    path: '/master',
    component: ModulLayout,
    meta: { perluLogin: true, modul: 'master' },
    children: [
      { path: '', redirect: '/master/suplier' },
      {
        path: 'suplier',
        name: 'master-suplier',
        component: () => import('@/features/master/views/Suplier.vue'),
      },
      {
        path: 'customer',
        name: 'master-customer',
        component: () => import('@/features/master/views/Customer.vue'),
      },
      {
        path: 'produk',
        name: 'master-produk',
        component: () => import('@/features/master/views/Produk.vue'),
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