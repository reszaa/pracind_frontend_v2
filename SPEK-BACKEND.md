# SPEK BACKEND — diselamatkan dari header mock (mock sudah dihapus)

Frontend kini menembak API sungguhan. Endpoint di bawah WAJIB ada di
Django sebelum modul terkait berfungsi. Bentuk respons mengikuti contoh
yang dulu ada di mock (riwayat git kalau butuh contoh datanya).


## Modul PRODUKSI — endpoint yang harus dibuat

```
src/mock/produksiData.js
=========================
⚠ KONTRAK USULAN — backend produksi belum punya urls.py, jadi bentuk di
bawah ini adalah SPESIFIKASI yang frontend butuhkan, bukan salinan
respons yang sudah ada. Saat menambal backend, expose endpoint ini:

  GET  produksi/sesi/                    ?status=BERJALAN|DIJADWALKAN|SELESAI
  GET  produksi/sesi/{id}/
  POST produksi/sesi/{id}/packaging/     {hasil_qty, kemasan:[{nama,jumlah}], catatan?}
                                         -> sesi SELESAI, tangki kosong,
                                            saldo & fisik_tanki bahan didebit
  GET  produksi/tanki/
  GET  produksi/formula/                 ?aktif=true

MODEL WAKTU DEBIT (penting — cocokkan dengan services saat menambal):
  masuk tangki  = memindahkan FISIK rak -> tangki, kepemilikan TETAP
  sesi SELESAI  = saldo akun sesi didebit + fisik_tanki dibebaskan
                  (bahan menjadi finished goods)
Bukti dari data gudang: saldo Sirup Fruktosa (1232) masih ≈ fisik
gudang+tangki (1220+dev 12) — artinya bahan di tangki BELUM didebit
dari saldo. Mutasi PEMAKAIAN di ledger bertanggal saat sesi selesai.

KONSISTEN SILANG (jangan diubah sebelah):
  - Sesi 4 (BERJALAN, Tangki A) memakai Sirup Fruktosa 900 kg +
    Perisa Melon 120 L == fisik_tanki di mock/warehouseData.js.
  - Sesi 2 = FG-SESI-202607-002, batch COSCA GREEN yang dikomplain
    endapan di mock/workOrderData.js (WO "riset komplain").
  - Sesi 3 (akun CV) memakai Pewarna Hijau 35 kg == mutasi PEMAKAIAN
    id 118 di warehouseData; inilah asal saldo CV -15.
  - Sesi 4 menunggu Asam Sitrat — bahan yang HABIS di dashboard gudang.

Desimal sebagai STRING, cermin DRF.
```

## Modul LOGISTIK — endpoint yang harus dibuat

```
src/mock/logistikData.js
=========================
⚠ KONTRAK USULAN — app logistik belum dimodelkan di backend. Bentuk di
bawah adalah SPESIFIKASI yang frontend butuhkan. Endpoint yang harus ada:

  GET  logistik/surat-jalan/               ?status=
  POST logistik/surat-jalan/               {so, kurir, daftar_item:[{so_item,qty}], catatan?}
  POST logistik/surat-jalan/{id}/berangkat/
  POST logistik/surat-jalan/{id}/terkirim/ {penerima, catatan?}
  GET  logistik/kurir/

TIGA KEPUTUSAN DESAIN (jawaban untuk pertanyaan terbuka modul logistik):

1. PARTIAL DELIVERY — cermin pola penerimaan PO yang sudah terbukti:
   SuratJalan = satuan kiriman; satu SO boleh punya banyak SJ.
   SO.daftar_item membawa `kuantitas_terkirim` (naik saat SJ BERANGKAT),
   dan SO.status_pengiriman = BELUM | SEBAGIAN | PENUH — persis simetri
   kuantitas_terkirim + status_penerimaan di purchase order.
   Sisa yang boleh dibuat SJ baru = quantity − kuantitas_terkirim −
   qty yang sudah dialokasikan di SJ berstatus DISIAPKAN (mencegah
   double-ship sebelum truk berangkat).

2. STATUS SOPIR — DITURUNKAN, bukan disimpan: kurir "Dalam perjalanan"
   kalau punya SJ berstatus DALAM_PERJALANAN, selain itu "Tersedia".
   Satu sumber kebenaran (SJ), tidak ada field status kurir yang bisa
   basi. Backend boleh menyimpan cache-nya, tapi SJ tetap sumbernya.

3. PEMILIK TRANSISI DELIVERY — LOGISTIK, lewat kejadian fisik:
     SJ pertama berangkat            -> SO.status = DELIVERY
     semua item PENUH & semua SJ
     (non-batal) TERKIRIM            -> SO.status = COMPLETED
   Sales tidak pernah menyetel DELIVERY manual. Alasannya sama dengan
   filosofi status_pembayaran PO: status harus mengikuti kenyataan
   fisik, dan yang tahu truk sudah jalan adalah logistik. Kedua efek
   ini milik service berangkat()/terkirim() di backend (dengan lock),
   dan cabang mock useLogistic meniru keduanya.

SIKLUS SJ:  DISIAPKAN -> DALAM_PERJALANAN -> TERKIRIM   (+ DIBATALKAN)
WAKTU DEBIT kuantitas_terkirim: saat BERANGKAT — barang resmi keluar
gudang begitu truk jalan; COMPLETED menunggu konfirmasi tiba.

KONSISTEN SILANG dengan mock/tagihanData.js (jangan diubah sebelah):
  SO 24 (DELIVERY, terkirim 12/20)  <- SJ-003 DALAM_PERJALANAN qty 12,
                                       SJ-004 DISIAPKAN qty 8 (sisa buat = 0)
  SO 21 (COMPLETED, terkirim penuh) <- SJ-001 TERKIRIM qty 40
  SO 26 (PACKING)                   <- belum punya SJ

Desimal sebagai STRING, cermin DRF.
```

## Master CUSTOMER & PRODUK — endpoint usulan

```
src/mock/masterData.js
=======================
Master customer & produk. Suplier TIDAK di sini — sumbernya tetap
mock/purchaseOrderData.js (daftarSuplier) yang sudah dipakai BuatPO;
dua sumber untuk data yang sama adalah penyakit yang sedang kita basmi.

⚠ KONTRAK USULAN (endpoint master belum terdokumentasi di backend):
  GET customer/        ?aktif=true&cari=
  GET produk/          ?aktif=true            (model: ProdukRingkas —
                        kemasan & satuan masih CharField bebas, BUKAN
                        tabel master; karena itu Kemasan.vue/Satuan.vue
                        dihapus, sesuai PRD)
  GET suplier/         SUDAH ADA (dipakai BuatPO), ?aktif=true

BACA-SAJA untuk sekarang: service tambah/ubah master belum ada di
backend (nasibnya sama dengan enam service PO yang hilang). Jangan
tambahkan form sebelum service-nya ditulis.

KONSISTEN SILANG:
  - id & alamat customer == customer_detail + alamat_kirim di
    mock/tagihanData.js (SO 21 -> id 2, SO 24 -> id 5, SO 26 -> id 8).
  - Harga COSCA GREEN Pail 25KG × qty SO 21 = 40 × 1.550.000 =
    62.000.000 == total_so SO 21. (Harga SO boleh menyimpang dari
    master — diskon dsb. — jadi jangan jadikan aturan, cukup contoh.)
  - `nama_produk` adalah kunci ke formula di mock/produksiData.js.

Desimal sebagai STRING, cermin DRF.
```

## Modul GUDANG — dua asumsi yang harus dikonfirmasi serializer

```
1. Arah deviasi_invariant diasumsikan: Σ saldo − Σ fisik.
   (Opname menurunkan fisik, saldo tetap -> deviasi positif.)
   Kalau backend memakai arah sebaliknya, sesuaikan tampilan panel deviasi.
2. Enum jenis mutasi stock-raw: 'KOREKSI' pasti (dipakai opname).
   'PENERIMAAN' dan 'PEMAKAIAN' masih asumsi frontend — cocokkan dengan
   model mutasi sebelum layar ledger dibuat.
3. Permission GET produksi/tanki/ harus mengizinkan role GUDANG
   (layar Monitor tangki diakses gudang lewat /warehouse/tangki).
```

## Sisi PIUTANG SalesOrder — belum ada di backend

```
SalesOrder belum punya status_pembayaran maupun riwayat pembayaran
(docstring model menundanya ke fase Finance). Buku tagihan sisi piutang
akan kosong sampai ini ada. Polanya cermin purchase_order:

    SalesOrder + status_pembayaran (UNPAID/PARTIAL/PAID)
    RiwayatPembayaranSO    <- cermin RiwayatPembayaranPO
    catat_pembayaran_so()  <- cermin catat_pembayaran()

Plus minimal: GET sales-order/ (list) — dipakai buku tagihan, input
transaksi, dashboard akunting, form surat jalan, dan statistik customer.
Field pengiriman yang frontend baca per item SO:
    daftar_item[].kuantitas_terkirim, status_pengiriman, alamat_kirim
```
