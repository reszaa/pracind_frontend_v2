/**
 * mock/workOrderData.js
 * ======================
 * Bentuk persis sama dengan respons backend:
 *   GET /api/work-order/mading/   -> [ ...WorkOrderSerializer ]
 *   GET /api/work-order/          -> { results: [...] }
 *   GET /api/staff_user/profil/   -> { results: [...ProfilStaffSerializer] }
 */

export const mading = [
  {
    id: 4,
    nomor: 'WO-202607-004',
    judul: 'Beli label & pulpen untuk ruang packing',
    deskripsi: 'Stok label habis. Beli di toko ATK depan, minta nota untuk klaim.',
    tanggal: '2026-07-21',
    deadline: '2026-07-22T17:00:00Z',
    dibuat_oleh: 5,
    dibuat_oleh_username: 'rina.kantor',
    dibuat_pada: '2026-07-21T08:15:00Z',
    disetujui_pada: null,
    disetujui_oleh: null,
    selesai: false,
    terlambat: false,
    penugasan: [
      { id: 7, staff: 3, staff_nama: 'Budi Santoso', staff_username: 'budi.gudang', disetujui_pada: null, catatan_approve: '' },
      { id: 8, staff: 5, staff_nama: 'Rina Wulandari', staff_username: 'rina.kantor', disetujui_pada: null, catatan_approve: '' },
    ],
  },
  {
    id: 3,
    nomor: 'WO-202607-003',
    judul: 'Riset komplain COSCA GREEN — endapan di dasar pail',
    deskripsi: 'Customer PT Andalan lapor ada endapan pada batch FG-SESI-202607-002. Cek formula aktif dan catatan sesi produksinya.',
    tanggal: '2026-07-19',
    deadline: '2026-07-20T12:00:00Z',
    dibuat_oleh: 2,
    dibuat_oleh_username: 'siti.akunting',
    dibuat_pada: '2026-07-19T10:02:00Z',
    disetujui_pada: null,
    disetujui_oleh: null,
    selesai: false,
    terlambat: true,
    penugasan: [
      { id: 5, staff: 3, staff_nama: 'Budi Santoso', staff_username: 'budi.gudang', disetujui_pada: null, catatan_approve: '' },
      { id: 6, staff: 4, staff_nama: 'Agus Prasetyo', staff_username: 'agus.produksi', disetujui_pada: null, catatan_approve: '' },
    ],
  },
  {
    id: 6,
    nomor: 'WO-202607-006',
    judul: 'Jaga gerbang belakang jam 10 malam',
    deskripsi: 'Ada pengiriman bahan malam ini dari CV Sumber Manis. Perkiraan tiba 22.00.',
    tanggal: '2026-07-21',
    deadline: '2026-07-21T22:00:00Z',
    dibuat_oleh: 1,
    dibuat_oleh_username: 'supervisor',
    dibuat_pada: '2026-07-21T09:40:00Z',
    disetujui_pada: null,
    disetujui_oleh: null,
    selesai: false,
    terlambat: false,
    penugasan: [
      { id: 11, staff: 3, staff_nama: 'Budi Santoso', staff_username: 'budi.gudang', disetujui_pada: null, catatan_approve: '' },
    ],
  },
]

export const semuaWO = [
  ...mading,
  {
    id: 2,
    nomor: 'WO-202607-002',
    judul: 'Perbaiki timbangan digital ruang mixing',
    deskripsi: 'Selisih 200 gram dibanding timbangan gudang. Panggil teknisi.',
    tanggal: '2026-07-16',
    deadline: '2026-07-18T17:00:00Z',
    dibuat_oleh: 4,
    dibuat_oleh_username: 'agus.produksi',
    dibuat_pada: '2026-07-16T13:20:00Z',
    disetujui_pada: '2026-07-18T09:05:00Z',
    disetujui_oleh: 3,
    selesai: true,
    terlambat: false,
    penugasan: [
      { id: 3, staff: 3, staff_nama: 'Budi Santoso', staff_username: 'budi.gudang', disetujui_pada: '2026-07-18T09:05:00Z', catatan_approve: 'Sudah dikalibrasi teknisi, selisih hilang.' },
    ],
  },
]

export const staffList = [
  { id: 1, user: 1, username: 'supervisor', nama_lengkap: 'Hendra Kusuma', role: 'SUPERVISOR', jabatan: 'Supervisor Operasional', akun: null },
  { id: 2, user: 2, username: 'siti.akunting', nama_lengkap: 'Siti Rahayu', role: 'STAFF', jabatan: 'Akunting', akun: 1 },
  { id: 3, user: 3, username: 'budi.gudang', nama_lengkap: 'Budi Santoso', role: 'GUDANG', jabatan: 'Kepala Gudang', akun: 1 },
  { id: 4, user: 4, username: 'agus.produksi', nama_lengkap: 'Agus Prasetyo', role: 'PRODUKSI', jabatan: 'Operator Produksi', akun: 1 },
  { id: 5, user: 5, username: 'rina.kantor', nama_lengkap: 'Rina Wulandari', role: 'STAFF', jabatan: 'Admin Kantor', akun: 2 },
  { id: 6, user: 6, username: 'dedi.sales', nama_lengkap: 'Dedi Firmansyah', role: 'SALES', jabatan: 'Sales Retail', akun: 2 },
]

/** accessCard user yang sedang login — dari GET /api/staff_user/me/ */
export const accessCard = {
  user_id: 3,
  username: 'budi.gudang',
  profil_staff_id: 3,          // ⚠ backend belum mengirim ini — lihat catatan
  nama_lengkap: 'Budi Santoso',
  role: 'GUDANG',
  role_display: 'Staff Gudang',
  is_supervisor: false,
  jabatan: 'Kepala Gudang',
  akun: { id: 1, kode: 'PCJM', nama: 'PT Pracindo Jaya Mandiri', tipe: 'PT' },
}