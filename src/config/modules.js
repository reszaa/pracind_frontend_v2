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
    ringkas: 'Purchase order, tagihan, dokumen',
    ikon: 'buku',
    rute: '/accounting',
    // GUDANG ikut karena penerimaan barang dilakukan lewat PODetail —
    // satu layar, dua peran, tombol berbeda.
    roles: [ROLE.STAFF, ROLE.GUDANG],
    siap: true,
    // Tidak tampil sebagai kartu di dashboard: Akunting adalah ruang
    // PENINJAUAN yang selalu dicapai dari konteks — tautan "Perlu ditangani",
    // rel di ruang Transaksi, atau breadcrumb PODetail. Rute & menunya tetap
    // hidup penuh; yang disembunyikan cuma kartunya.
    sembunyiDiDashboard: true,
    menu: [
      { label: 'Ringkasan', rute: '/accounting' },
      { label: 'Buku tagihan', rute: '/accounting/tagihan' },
      { label: 'Purchase order', rute: '/accounting/po' },
    ],
  },
  {
    // Ruang PENCATATAN, dipisah dari Akunting yang untuk PENINJAUAN.
    // Satu jalan per tujuan: lihat data -> Akunting, catat transaksi -> sini.
    // Layarnya punya rel ikon sendiri (features/accounting/layout/
    // InputTransaksiLayout.vue) dan isinya diatur useNavTransaksi.
    id: 'transaksi',
    nama: 'Input Transaksi',
    ringkas: 'Pembelian, penjualan, pembayaran',
    ikon: 'buku',
    rute: '/accounting/transaksi',
    roles: [ROLE.STAFF, ROLE.GUDANG, ROLE.SALES],
    siap: true,
    menu: [
      { label: 'Pembelian', rute: '/accounting/transaksi/pembelian' },
      { label: 'Pembayaran', rute: '/accounting/transaksi/pembayaran' },
    ],
  },
  {
    // Bukan modul penuh — pintasan ke satu layar milik Akunting. Dibuat
    // kartu tersendiri karena buku tagihan dibuka jauh lebih sering
    // daripada halaman Akunting lainnya.
    id: 'tagihan',
    nama: 'Buku Tagihan',
    ringkas: 'Hutang & piutang per jatuh tempo',
    ikon: 'buku',
    rute: '/accounting/tagihan',
    roles: [ROLE.STAFF, ROLE.GUDANG],
    siap: true,
    menu: [
      { label: 'Buku tagihan', rute: '/accounting/tagihan' },
      { label: 'Purchase order', rute: '/accounting/po' },
    ],
  },
  {
    id: 'warehouse',
    nama: 'Gudang',
    ringkas: 'Stok bahan baku, opname, tangki',
    ikon: 'gudang',
    rute: '/warehouse',
    roles: [ROLE.GUDANG],
    // Menu HANYA layar yang benar-benar ada. Penerimaan barang tetap lewat
    // PODetail (modul Akunting); bahan/mutasi menyusul saat layarnya dibuat.
    siap: true,
    menu: [
      { label: 'Dashboard stok', rute: '/warehouse' },
      { label: 'Stok opname', rute: '/warehouse/opname' },
      { label: 'Monitor tangki', rute: '/warehouse/tangki' },
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
    // Armada pindah ke modul Pengiriman — status sopir diturunkan dari
    // surat jalan, jadi datanya milik logistik.
    ringkas: 'Suplier, customer, produk',
    ikon: 'master',
    rute: '/master',
    roles: [ROLE.STAFF, ROLE.GUDANG, ROLE.PRODUKSI, ROLE.SALES],
    siap: true,
    // Disembunyikan dari kartu dashboard — tetap bisa dibuka lewat URL
    // /master atau rel modul. Kalau nanti perlu dimunculkan lagi, cabut
    // satu baris ini.
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

/** Kartu di dashboard — modul ber-`sembunyiDiDashboard` dikecualikan. */
export const modulDashboard = (role) =>
  modulUntuk(role).filter(m => !m.sembunyiDiDashboard)

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