/**
 * src/config/modules.js
 * ======================
 * Satu sumber kebenaran untuk navigasi. Kartu di dashboard DAN menu sidebar
 * di dalam modul dibaca dari sini — tambah modul di sini, dua-duanya ikut.
 *
 * `roles` untuk KENYAMANAN, bukan keamanan. Menyembunyikan kartu yang tidak
 * relevan supaya layar tidak penuh menu orang lain. Backend tetap yang
 * menegakkan akses — jangan pernah mengandalkan ini sebagai proteksi.
 *
 * `siap` = backend-nya sudah ada. Yang false tampil redup dan tidak bisa
 * diklik, supaya jelas mana yang menunggu, bukan mana yang rusak.
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
    ringkas: 'Buku tagihan, pembayaran, input transaksi',
    ikon: 'buku',
    rute: '/accounting',
    roles: [ROLE.STAFF],
    siap: true,
    menu: [
      { label: 'Ringkasan', rute: '/accounting' },
      { label: 'Buku tagihan', rute: '/accounting/tagihan' },
      { label: 'Input transaksi', rute: '/accounting/transaksi' },
      { label: 'Pembayaran supplier', rute: '/accounting/pembayaran' },
    ],
  },
  {
    id: 'procurement',
    nama: 'Pembelian',
    ringkas: 'Buat PO, terima barang, riwayat',
    ikon: 'transaksi',
    rute: '/procurement',
    roles: [ROLE.STAFF, ROLE.GUDANG],
    siap: false,
    catatan: 'Layar belum dibuat',
    menu: [
      { label: 'Buat PO', rute: '/procurement/buat' },
      { label: 'Daftar PO', rute: '/procurement' },
      { label: 'Penerimaan barang', rute: '/procurement/penerimaan' },
    ],
  },
  {
    id: 'warehouse',
    nama: 'Gudang',
    ringkas: 'Stok bahan, penerimaan, opname',
    ikon: 'gudang',
    rute: '/warehouse',
    roles: [ROLE.GUDANG],
    siap: false,
    catatan: 'Layar belum dibuat',
    menu: [
      { label: 'Dashboard stok', rute: '/warehouse' },
      { label: 'Stok bahan baku', rute: '/warehouse/bahan' },
      { label: 'Penerimaan', rute: '/warehouse/penerimaan' },
      { label: 'Stok opname', rute: '/warehouse/opname' },
      { label: 'Mutasi barang', rute: '/warehouse/mutasi' },
    ],
  },
  {
    id: 'rnd',
    nama: 'Produksi',
    ringkas: 'Sesi produksi, formula, tangki',
    ikon: 'produksi',
    rute: '/rnd',
    roles: [ROLE.PRODUKSI],
    siap: false,
    catatan: 'Layar belum dibuat',
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
    siap: false,
    catatan: 'Layar belum dibuat',
    menu: [
      { label: 'Pantau kiriman', rute: '/logistic' },
      { label: 'Buat surat jalan', rute: '/logistic/buat' },
      { label: 'Armada & sopir', rute: '/logistic/armada' },
    ],
  },
  {
    id: 'master',
    nama: 'Master Data',
    ringkas: 'Supplier, customer, produk, armada',
    ikon: 'master',
    rute: '/master',
    roles: [ROLE.STAFF, ROLE.GUDANG, ROLE.PRODUKSI, ROLE.SALES],
    siap: false,
    catatan: 'Layar belum dibuat',
    menu: [
      { label: 'Supplier', rute: '/master/supplier' },
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

export const cariModul = (id) => MODUL.find(m => m.id === id) ?? null

/** SVG garis tunggal — tanpa dependensi icon library. */
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