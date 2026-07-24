# Integrasi ke Django — 23 Juli 2026

`src/` di paket ini **API-only**: seluruh mock dihapus (folder `src/mock/`
tidak ada lagi), semua composable menembak backend sungguhan lewat
`utils/api.js`.

## Pasang

1. Timpa folder `src/` lokal dengan `src/` dari paket ini.
2. `.env.local`: hapus baris `VITE_MOCK=1` (atau hapus filenya) — sudah
   tidak dibaca siapa pun. Kalau backend bukan di `http://127.0.0.1:8000`,
   buat `.env` berisi `VITE_API_URL=http://host:port/api/`.
3. Restart `npm run dev`.

## Prasyarat backend SEBELUM login pertama

- CORS mengizinkan `http://localhost:5173`.
- Ada User + **ProfilStaff** (role, jabatan, akun) — `createsuperuser`
  saja tidak cukup: `build_access_card()` membaca profil.
- `staff_user/urls.py` DUA blok urlpatterns ditambal — kalau blok SimpleJWT
  menang, login mengembalikan `{access, refresh}` sedangkan frontend
  mengirim `Authorization: Token ...` -> gejala "login sukses, semua 401".
  Uji cepat: `curl -X POST .../api/staff_user/login/` harus mengembalikan
  `{token, access_card}`.
- `profil_staff_id` ditambahkan ke access card (satu baris di
  `build_access_card()`) — tanpa ini tombol approve papan tugas mati.

## Perilaku per modul saat backend belum lengkap

Modul yang endpoint-nya belum ada TIDAK crash — layarnya menampilkan pesan
"Gagal memuat ..." dari `bacaError`. Urutan realistis menyalakan:

| Modul | Butuh | Status backend |
|---|---|---|
| Login, Papan Tugas | staff_user/*, work-order/* | ADA (tambal urls.py + profil_staff_id) |
| Akunting: PO, bayar | purchase-order/* , suplier/ | ADA (cek retrieve {id}/ + payload `catatan` terima-barang; 6 service edit PO masih hilang) |
| Akunting: tagihan/transaksi sisi SO | sales-order/ (list) | BELUM — lihat SPEK |
| Gudang | stock-raw/* | ADA (konfirmasi 2 asumsi di SPEK) |
| Produksi | produksi/* | BELUM — spek lengkap di SPEK |
| Pengiriman | logistik/* + sales-order/ | BELUM — spek lengkap di SPEK |
| Master: suplier | suplier/ | ADA |
| Master: customer/produk | customer/, produk/ | BELUM — usulan di SPEK |

## Catatan sesi

- Konvensi ejaan seragam: **Suplier** (satu p) di seluruh codebase.
- `App.vue` kini memanggil `muatUlangKartu()` saat mount — token divalidasi
  dan perubahan role Supervisor langsung terasa.
- 28 file kosong sisa scaffold sudah dihapus (cashier, retail, dst.).
- Spek endpoint yang dulu hidup di header mock diselamatkan ke
  `SPEK-BACKEND.md` — itu dokumen kerja untuk sisi Django.
