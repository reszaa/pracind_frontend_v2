/**
 * src/router/index.js
 * ====================
 *
 * PERUBAHAN vs versi lama (semua ditandai `// [FIX]`):
 *   1. Tambah rute DAFTAR PO `/accounting/po` — sebelumnya PurchaseOrder.vue
 *      tidak teregister sama sekali (dead code) & semua link ke `/accounting/po`
 *      jatuh ke catch-all -> bounce ke `/`. Ini juga menyelamatkan redirect
 *      after-save di PurchaseOrderCreate (router.push('/accounting/po')).
 *   2. `suplier` di review-layout: path relatif -> absolut `/accounting/suplier`,
 *      sekaligus menghapus orphan `/accounting/review-layout/suplier`.
 *   3. Redirect `path: ''` untuk review-layout supaya buka URL parent telanjang
 *      tidak menghasilkan rail kosong.
 *   4. ALIAS kompatibilitas untuk URL yang salah namespace tapi dipakai di
 *      nav-config & komponen: `/accounting/tagihan`, `/accounting/payment`,
 *      `/accounting/sales-order/buat`, `/accounting/sales-order/:id`.
 *      -> bisa dibuang nanti setelah link di SalesOrder.vue + useNavInvoice.js
 *         + modules.js dirapikan ke namespace kanonik.
 *
 * CATATAN: file ini hanya menutup masalah NAVIGASI. Bug data (#4 unwrap
 * .results, #5 kelengkapan belum di-expose, #6 endpoint produk 404) tidak
 * tersentuh di sini.
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
      // [FIX] Daftar PO — sebelumnya tidak ada. Dipakai oleh pintasan Dashboard,
      // breadcrumb PO Detail, tombol Batal & redirect after-save PO Create.
      {
        path: 'po',
        name: 'accounting-po',
        component: () => import('@/features/accounting/views/PurchaseOrder.vue'),
      },
      {
        path: 'po/:id',
        name: 'accounting-po-detail',
        component: () => import('@/features/accounting/views/PurchaseOrderDetail.vue'),
        props: true,
      },
    ],
  },


  {
    path: '/accounting/review-layout',
    component: () => import('@/features/accounting/layout/InvoiceLayout.vue'),
    meta: { perluLogin: true, modul: 'invoice' },
    children: [
      // [FIX] buka parent telanjang -> arahkan ke Invoice, bukan rail kosong.
      {
        path: '',
        redirect: '/accounting/invoice',
      },
      {
        path: '/accounting/invoice',
        name: 'accounting-invoice',
        // [FIX] alias untuk link `/accounting/tagihan` (useAccounting, Document breadcrumb).
        alias: '/accounting/tagihan',
        component: () => import('@/features/accounting/views/Invoice.vue'),
      },
      {
        path: '/accounting/document',
        name: 'accounting-document',
        component: () => import('@/features/accounting/views/Document.vue'),
      },
      // [FIX] path relatif 'suplier' (-> /accounting/review-layout/suplier, orphan)
      // diganti absolut agar cocok dengan link nav `/accounting/suplier`.
      {
        path: '/accounting/suplier',
        name: 'accounting-suplier',
        component: () => import('@/features/master/views/Suplier.vue'),
      },
    ],
  },

  {
    path: '/accounting/transaksi',
    component: () => import('@/features/accounting/layout/TransactionEntryLayout.vue'),
    meta: { perluLogin: true, modul: 'transaksi' },
    children: [
      {
        path: '',
        redirect: '/accounting/transaksi/pembelian',
      },
      {
        path: 'pembelian',
        name: 'transaksi-pembelian',
        component: () => import('@/features/accounting/views/PurchaseOrderCreate.vue'),
      },
      {
        path: 'pembayaran',
        name: 'transaksi-pembayaran',
        // [FIX] alias untuk link `/accounting/payment` (useNavInvoice, modules.js).
        alias: '/accounting/payment',
        component: () => import('@/features/accounting/views/PaymentSuplier.vue'),
      },
      {
        path: 'penjualan',
        name: 'transaksi-penjualan',
        component: () => import('@/features/accounting/views/SalesOrder.vue'),
      },
      {
        path: 'penjualan/buat',
        name: 'transaksi-penjualan-buat',
        // [FIX] alias untuk link `/accounting/sales-order/buat` di SalesOrder.vue.
        alias: '/accounting/sales-order/buat',
        component: () => import('@/features/accounting/views/CreateSalesOrder.vue'),
      },
      {
        path: 'penjualan/:id',
        name: 'transaksi-penjualan-detail',
        // [FIX] alias untuk link `/accounting/sales-order/:id` di SalesOrder.vue.
        // 'buat' didahulukan di atas -> tetap menang atas :id (static > dynamic).
        alias: '/accounting/sales-order/:id',
        component: () => import('@/features/accounting/views/SalesOrderDetail.vue'),
      },
    ],
  },


  {
    path: '/warehouse',
    component: () => import('@/features/warehouse/layout/WarehouseLayout.vue'),
    meta: { perluLogin: true, modul: 'warehouse' },
    children: [
      {
        path: '',
        name: 'warehouse-stok',
        component: () => import('@/features/warehouse/views/DashboardGudang.vue'),
      },
      {
        path: 'saldo',
        name: 'warehouse-saldo',
        component: () => import('@/features/warehouse/views/StockRaw.vue'),
      },
      {
        path: 'inbound',
        name: 'warehouse-inbound',
        component: () => import('@/features/warehouse/views/Received.vue'),
      },
      {
        path: 'outbound',
        name: 'warehouse-outbound',
        component: () => import('@/features/warehouse/views/Packaging.vue'),
      },
      {
        path: 'opname',
        name: 'warehouse-opname',
        component: () => import('@/features/warehouse/views/Opname.vue'),
      },
    ],
  },


  {
    path: '/rnd',
    component: () => import('@/features/rnd/layout/RndLayout.vue'),
    meta: { perluLogin: true, modul: 'rnd' },
    children: [
      {
        path: '',
        redirect: '/rnd/produksi', // Otomatis arahkan ke produksi
      },
      {
        path: 'produksi',
        name: 'rnd-produksi',
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
      // ... (rute riset, prototipe, qc bisa Anda tambahkan nanti)
    ],
  },

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