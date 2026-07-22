/**
 * mock/tagihanData.js
 * ====================
 * Bentuk persis respons backend:
 *   GET /api/purchase-order/  -> { results: [...PurchaseOrderSerializer] }
 *   GET /api/sales-order/     -> { results: [...] }  ⚠ belum ada di backend
 *
 * Desimal dikirim DRF sebagai STRING — jangan diubah jadi number di sini,
 * supaya komponen tidak diam-diam mengandalkan tipe yang salah.
 */

export const daftarPO = [
  {
    id: 11, nomor: 'PO/PCJM/2026/VII/002', tanggal: '2026-07-04',
    tanggal_jatuh_tempo: '2026-07-18',
    status_penerimaan: 'PENUH', status_pembayaran: 'UNPAID',
    dibatalkan_pada: null, total_po: '8880000.00',
    suplier_detail: { id: 5, kode: 'SUP-0005', nama: 'PT Kemasan Nusantara' },
    riwayat_pembayaran: [],
  },
  {
    id: 12, nomor: 'PO/PCJM/2026/VII/003', tanggal: '2026-07-11',
    tanggal_jatuh_tempo: '2026-07-25',
    status_penerimaan: 'PENUH', status_pembayaran: 'PARTIAL',
    dibatalkan_pada: null, total_po: '41625000.00',
    suplier_detail: { id: 3, kode: 'SUP-0003', nama: 'CV Sumber Manis' },
    riwayat_pembayaran: [
      { id: 4, nominal_dibayar: '20000000.00', tanggal_bayar: '2026-07-15', dibatalkan_pada: null },
    ],
  },
  {
    id: 14, nomor: 'PO/PCJM/2026/VII/005', tanggal: '2026-07-14',
    tanggal_jatuh_tempo: '2026-08-04',
    status_penerimaan: 'SEBAGIAN', status_pembayaran: 'UNPAID',
    dibatalkan_pada: null, total_po: '15400000.00',
    suplier_detail: { id: 7, kode: 'SUP-0007', nama: 'PT Aroma Jaya' },
    riwayat_pembayaran: [],
  },
  {
    id: 10, nomor: 'PO/PCJM/2026/VII/001', tanggal: '2026-07-02',
    tanggal_jatuh_tempo: '2026-07-16',
    status_penerimaan: 'PENUH', status_pembayaran: 'PAID',
    dibatalkan_pada: null, total_po: '27750000.00',
    suplier_detail: { id: 3, kode: 'SUP-0003', nama: 'CV Sumber Manis' },
    riwayat_pembayaran: [
      { id: 2, nominal_dibayar: '27750000.00', tanggal_bayar: '2026-07-14', dibatalkan_pada: null },
    ],
  },
]

/**
 * ⚠ DATA KARANGAN. SalesOrder di backend TIDAK punya status_pembayaran
 * maupun riwayat_pembayaran. Struktur ini mengandaikan patch berikut sudah
 * diterapkan — polanya cermin purchase_order:
 *
 *   SalesOrder.status_pembayaran : UNPAID | PARTIAL | PAID
 *   RiwayatPembayaranSO(so, nominal_dibayar, tanggal_bayar,
 *                       bukti_transfer, dicatat_oleh, dibatalkan_*)
 *   services.catat_pembayaran_so()  <- lock + rekalkulasi, seperti PO
 */
export const daftarSO = [
  {
    id: 21, nomor: 'SO/PCJM/2026/VII/011', tanggal: '2026-07-05',
    tanggal_jatuh_tempo: '2026-07-19',
    status: 'COMPLETED', status_pembayaran: 'PARTIAL',
    total_so: '62000000.00',
    customer_detail: { id: 2, kode: 'CUST-0002', nama: 'PT Andalan Sejahtera' },
    riwayat_pembayaran: [
      { id: 9, nominal_dibayar: '30000000.00', tanggal_bayar: '2026-07-12', dibatalkan_pada: null },
    ],
  },
  {
    id: 24, nomor: 'SO/PCJM/2026/VII/014', tanggal: '2026-07-09',
    tanggal_jatuh_tempo: '2026-07-23',
    status: 'DELIVERY', status_pembayaran: 'UNPAID',
    total_so: '18750000.00',
    customer_detail: { id: 5, kode: 'CUST-0005', nama: 'Toko Berkah Jaya' },
    riwayat_pembayaran: [],
  },
  {
    id: 26, nomor: 'SO/PCJM/2026/VII/016', tanggal: '2026-07-16',
    tanggal_jatuh_tempo: '2026-08-06',
    status: 'PACKING', status_pembayaran: 'UNPAID',
    total_so: '44300000.00',
    customer_detail: { id: 8, kode: 'CUST-0008', nama: 'PT Mitra Niaga' },
    riwayat_pembayaran: [],
  },
]