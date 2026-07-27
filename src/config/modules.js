/**
 * src/config/modules.js
 * ======================
 */

export const ROLE = {
  SUPERVISOR: 'SUPERVISOR',
  STAFF: 'STAFF',
  PRODUKSI: 'PRODUKSI',
  GUDANG: 'GUDANG',
  SALES: 'SALES',
}

export const MODUL = [
  {
    id: 'accounting',
    nama: 'Akunting',
    ringkas: 'Purchase order, tagihan, dokumen',
    ikon: 'buku',
    rute: '/accounting',
    // Gudang ikut di sini HANYA untuk akses via URL/PO Detail, bukan kartu dashboard
    roles: [ROLE.STAFF, ROLE.GUDANG],
    siap: true,
    sembunyiDiDashboard: true,
    menu: [
      { label: 'Ringkasan', rute: '/accounting' },
      { label: 'Invoice', rute: '/accounting/invoice' },
      { label: 'Document', rute: '/accounting/document' },
      { label: 'Payment', rute: '/accounting/payment' },
    ],
  },
  {
    id: 'transaksi',
    nama: 'Input Transaksi',
    ringkas: 'Pembelian dan penjualan',
    ikon: 'buku',
    rute: '/accounting/transaksi',
    // ROLE.GUDANG sudah dihapus agar tidak muncul di dashboard staf gudang
    roles: [ROLE.STAFF, ROLE.SALES],
    siap: true,
    menu: [
      { label: 'Pembelian', rute: '/accounting/transaksi/pembelian' },
      { label: 'Penjualan', rute: '/accounting/transaksi/penjualan' },
    ],
  },
  {
    id: 'invoice',
    nama: 'Invoice & Document',
    ringkas: 'Hutang, piutang, dan kelengkapan dokumen',
    ikon: 'buku',
    rute: '/accounting/invoice',
    // ROLE.GUDANG sudah dihapus
    roles: [ROLE.STAFF],
    siap: true,
    menu: [
      { label: 'Invoice', rute: '/accounting/invoice' },
      { label: 'Document', rute: '/accounting/document' },
      { label: 'Payment', rute: '/accounting/payment' },
    ],
  },
  {
    id: 'warehouse',
    nama: 'Gudang',
    ringkas: 'Inbound, outbound, opname, stok',
    ikon: 'gudang',
    rute: '/warehouse',
    roles: [ROLE.GUDANG],
    siap: true,
    menu: [
      { label: 'Dashboard stok', rute: '/warehouse' },
      { label: 'Penerimaan', rute: '/warehouse/inbound' },
      { label: 'Pengepakan', rute: '/warehouse/outbound' },
      { label: 'Stok opname', rute: '/warehouse/opname' },
    ],
  },
  {
    id: 'rnd',
    nama: 'Produksi',
    ringkas: 'Sesi produksi, formula, tangki',
    ikon: 'produksi',
    rute: '/rnd',
    roles: [ROLE.PRODUKSI],
    siap: true,
    menu: [
      { label: 'Sesi produksi', rute: '/rnd' },
      { label: 'Formula produk', rute: '/rnd/formula' },
      { label: 'Monitor tangki', rute: '/rnd/tangki' },
    ],
  },
  {
    id: 'logistic',
    nama: 'Pengiriman',
    ringkas: 'Surat jalan, armada, pantau kiriman',
    ikon: 'kirim',
    rute: '/logistic',
    roles: [ROLE.GUDANG, ROLE.SALES],
    siap: true,
    menu: [
      { label: 'Pantau kiriman', rute: '/logistic' },
      { label: 'Buat surat jalan', rute: '/logistic/buat' },
      { label: 'Armada & sopir', rute: '/logistic/armada' },
    ],
  },
  {
    id: 'master',
    nama: 'Master Data',
    ringkas: 'Suplier, customer, produk',
    ikon: 'master',
    rute: '/master',
    roles: [ROLE.STAFF, ROLE.GUDANG, ROLE.PRODUKSI, ROLE.SALES],
    siap: true,
    sembunyiDiDashboard: true,
    menu: [
      { label: 'Suplier', rute: '/master/suplier' },
      { label: 'Customer', rute: '/master/customer' },
      { label: 'Produk', rute: '/master/produk' },
    ],
  },
  {
    id: 'work-order',
    nama: 'Papan Tugas',
    ringkas: 'Tugas yang ditujukan ke kamu',
    ikon: 'buku',
    rute: '/work-order',
    roles: [ROLE.STAFF, ROLE.GUDANG, ROLE.PRODUKSI, ROLE.SALES],
    siap: true,
    menu: [
      { label: 'Papan tugas', rute: '/work-order' },
    ],
  },
]

export const bolehAkses = (modul, role) =>
  role === ROLE.SUPERVISOR || modul.roles.includes(role)

export const modulUntuk = (role) => MODUL.filter(m => bolehAkses(m, role))

export const modulDashboard = (role) =>
  modulUntuk(role).filter(m => !m.sembunyiDiDashboard)

export const cariModul = (id) => MODUL.find(m => m.id === id) ?? null

export const IKON = {
  transaksi: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  buku: '<path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3"/>',
  gudang: '<path d="M3 9l9-5 9 5v11H3z"/><path d="M8 20v-7h8v7"/>',
  produksi: '<path d="M4 20V9l5 3V9l5 3V6l6 4v10z"/><path d="M4 20h16"/>',
  kirim: '<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  master: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/>',
  panah: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  balik: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>',
}