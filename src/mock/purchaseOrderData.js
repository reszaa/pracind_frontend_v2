/**
 * src/mock/purchaseOrderData.js
 * ============================
 * Bentuk persis respons backend:
 *   GET purchase-order/   -> { results: [...PurchaseOrderSerializer] }
 *   GET suplier/          -> { results: [...SuplierSerializer] }
 *   GET entitas/akun/     -> { results: [...AkunSerializer] }
 *
 * Desimal dikirim DRF sebagai STRING. Jangan diubah jadi number di sini —
 * kalau komponen diam-diam mengandalkan tipe number, nanti pecah saat
 * disambungkan ke API sungguhan.
 */

export const daftarAkun = [
    { id: 1, kode: 'PCJM', nama: 'PT Pracindo Jaya Mandiri', tipe: 'PT', aktif: true },
    { id: 2, kode: 'CV', nama: 'CV Marsini', tipe: 'CV', aktif: true },
]

export const daftarSuplier = [
    { id: 3, kode: 'SUP-0003', nama: 'CV Sumber Manis', jenis: 'PERUSAHAAN', kategori: 'RAW_MATERIAL', kota: 'Tangerang', termin_pembayaran_hari: 14, aktif: true },
    { id: 5, kode: 'SUP-0005', nama: 'PT Kemasan Nusantara', jenis: 'PERUSAHAAN', kategori: 'KEMASAN', kota: 'Bekasi', termin_pembayaran_hari: 14, aktif: true },
    { id: 7, kode: 'SUP-0007', nama: 'PT Aroma Jaya', jenis: 'PERUSAHAAN', kategori: 'RAW_MATERIAL', kota: 'Jakarta', termin_pembayaran_hari: 21, aktif: true },
    { id: 9, kode: 'SUP-0009', nama: 'Toko Berkah Kimia', jenis: 'PERORANGAN', kategori: 'RAW_MATERIAL', kota: 'Tangerang', termin_pembayaran_hari: 0, aktif: true },
]

export const daftarPO = [
    {
        id: 14, nomor: 'PO/PCJM/2026/VII/005', tanggal: '2026-07-14',
        tanggal_jatuh_tempo: '2026-08-04',
        status_penerimaan: 'SEBAGIAN', status_pembayaran: 'UNPAID',
        dibatalkan_pada: null, total_po: '15400000.00', catatan: '',
        akun_detail: { id: 1, kode: 'PCJM', nama: 'PT Pracindo Jaya Mandiri', tipe: 'PT' },
        suplier_detail: { id: 7, kode: 'SUP-0007', nama: 'PT Aroma Jaya' },
        daftar_item: [
            { id: 41, nama_item: 'Pewarna Hijau', packaging: 'drum', unit_kg: '25.00', total_unit: 8, quantity: '200.00', harga_satuan: '62000.00', tarif_ppn: '0.1100', kuantitas_terkirim: '75.00', no_batch: 'BATCH-20260716-001' },
        ],
        riwayat_pembayaran: [],
        kelengkapan: {
            count: 1, total: 3, percentage: 33, is_complete: false,
            belum: [{ jenis: 'INVOICE', label: 'Invoice' }, { jenis: 'FAKTUR', label: 'Faktur Pajak' }],
        },
    },
    {
        id: 12, nomor: 'PO/PCJM/2026/VII/003', tanggal: '2026-07-11',
        tanggal_jatuh_tempo: '2026-07-25',
        status_penerimaan: 'PENUH', status_pembayaran: 'PARTIAL',
        dibatalkan_pada: null, total_po: '41625000.00', catatan: '',
        akun_detail: { id: 1, kode: 'PCJM', nama: 'PT Pracindo Jaya Mandiri', tipe: 'PT' },
        suplier_detail: { id: 3, kode: 'SUP-0003', nama: 'CV Sumber Manis' },
        daftar_item: [
            { id: 36, nama_item: 'Gula Rafinasi', packaging: 'sak', unit_kg: '50.00', total_unit: 15, quantity: '750.00', harga_satuan: '50000.00', tarif_ppn: '0.1100', kuantitas_terkirim: '750.00', no_batch: 'BATCH-20260712-001' },
        ],
        riwayat_pembayaran: [
            { id: 4, nominal_dibayar: '20000000.00', tanggal_bayar: '2026-07-15', catatan: 'Termin 1', dibatalkan_pada: null },
        ],
        kelengkapan: {
            count: 2, total: 3, percentage: 67, is_complete: false,
            belum: [{ jenis: 'FAKTUR', label: 'Faktur Pajak' }],
        },
    },
    {
        id: 11, nomor: 'PO/CV/2026/VII/002', tanggal: '2026-07-04',
        tanggal_jatuh_tempo: '2026-07-18',
        status_penerimaan: 'BELUM_DITERIMA', status_pembayaran: 'UNPAID',
        dibatalkan_pada: null, total_po: '8880000.00', catatan: 'Kirim ke gudang belakang',
        akun_detail: { id: 2, kode: 'CV', nama: 'CV Marsini', tipe: 'CV' },
        suplier_detail: { id: 5, kode: 'SUP-0005', nama: 'PT Kemasan Nusantara' },
        daftar_item: [
            { id: 33, nama_item: 'Pail 25KG', packaging: 'pcs', unit_kg: '0.00', total_unit: 400, quantity: '400.00', harga_satuan: '20000.00', tarif_ppn: '0.1100', kuantitas_terkirim: '0.00', no_batch: '' },
        ],
        riwayat_pembayaran: [],
        kelengkapan: {
            count: 0, total: 3, percentage: 0, is_complete: false,
            belum: [
                { jenis: 'INVOICE', label: 'Invoice' },
                { jenis: 'FAKTUR', label: 'Faktur Pajak' },
                { jenis: 'SURAT_JALAN', label: 'Surat Jalan' },
            ],
        },
    },
    {
        id: 10, nomor: 'PO/PCJM/2026/VII/001', tanggal: '2026-07-02',
        tanggal_jatuh_tempo: '2026-07-16',
        status_penerimaan: 'PENUH', status_pembayaran: 'PAID',
        dibatalkan_pada: null, total_po: '27750000.00', catatan: '',
        akun_detail: { id: 1, kode: 'PCJM', nama: 'PT Pracindo Jaya Mandiri', tipe: 'PT' },
        suplier_detail: { id: 3, kode: 'SUP-0003', nama: 'CV Sumber Manis' },
        daftar_item: [
            { id: 30, nama_item: 'Gula Rafinasi', packaging: 'sak', unit_kg: '50.00', total_unit: 10, quantity: '500.00', harga_satuan: '50000.00', tarif_ppn: '0.1100', kuantitas_terkirim: '500.00', no_batch: 'BATCH-20260703-001' },
        ],
        riwayat_pembayaran: [
            { id: 2, nominal_dibayar: '27750000.00', tanggal_bayar: '2026-07-14', catatan: 'Lunas', dibatalkan_pada: null },
        ],
        kelengkapan: { count: 3, total: 3, percentage: 100, is_complete: true, belum: [] },
    },
]