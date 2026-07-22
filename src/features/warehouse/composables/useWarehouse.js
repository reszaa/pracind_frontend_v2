/**
 * src/features/warehouse/composables/useWarehouse.js
 * ===================================================
 * Stok bahan baku. Kontrak backend:
 *
 *   GET  stock-raw/dashboard/            ringkasan per bahan + alert + saldo per akun
 *   GET  stock-raw/saldo/                ?akun=&nama_bahan=&berhutang=true
 *   GET  stock-raw/batch/                ?nama_bahan=&no_batch=&tersisa=true
 *   POST stock-raw/batch/{id}/koreksi/   {qty_benar, alasan}   role GUDANG
 *   GET  stock-raw/mutasi/               ?nama_bahan=&jenis=&akun=&no_batch=
 *
 * DUA LAPIS STOK (ini yang membuat modul ini beda dari inventory biasa):
 *   fisik       BatchGudang   — barang nyata, TIDAK PERNAH minus
 *   kepemilikan SaldoEntitas  — per Akun, BOLEH minus (hutang ke pool gudang)
 *
 * Saldo minus BUKAN error — artinya entitas itu memakai bahan lebih banyak
 * dari yang disetor, dan hutangnya sembuh sendiri saat dia beli/setor lagi.
 * Jangan tampilkan sebagai kesalahan.
 *
 * ⚠ ALERT BERBASIS RAK GUDANG, BUKAN TOTAL. Bahan yang sedang di tangki
 * tidak bisa diambil dari rak, jadi status HABIS/MENIPIS dihitung dari
 * fisik_gudang saja. Isi tangki dilaporkan terpisah.
 *
 * ⚠ deviasi_invariant != 0 artinya Σ saldo ≠ Σ fisik — biasanya sisa koreksi
 * opname yang belum direkonsiliasi sesi produksi. Ditampilkan supaya tidak
 * menggantung diam-diam.
 */

import { ref, computed } from 'vue'
// import api from '@/utils/api'
// import { bacaError } from '@/utils/error'
import * as mock from '@/mock/warehouseData'

const MODE_MOCK = true

export function useWarehouse() {
    const stokBahan = ref([])
    const daftarBatch = ref([])
    const daftarMutasi = ref([])

    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const cari = ref('')
    const saringStatus = ref('semua')   // semua | aman | menipis | habis

    const muatDashboard = async () => {
        isLoading.value = true
        error.value = null
        try {
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 350))
                stokBahan.value = mock.stokBahan
            } else {
                // const { data } = await api.get('stock-raw/dashboard/')
                // stokBahan.value = data.data
            }
        } catch (err) {
            error.value = 'Gagal memuat dashboard stok.'
            // error.value = bacaError(err, 'Gagal memuat dashboard stok.')
        } finally {
            isLoading.value = false
        }
    }

    const muatBatch = async ({ nama_bahan = '', tersisa = true } = {}) => {
        isLoading.value = true
        try {
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 300))
                daftarBatch.value = mock.daftarBatch
            } else {
                // const { data } = await api.get('stock-raw/batch/', {
                //   params: { nama_bahan, tersisa },
                // })
                // daftarBatch.value = data.results || data
            }
        } catch (err) {
            error.value = 'Gagal memuat data batch.'
        } finally {
            isLoading.value = false
        }
    }

    const muatMutasi = async ({ nama_bahan = '', jenis = '' } = {}) => {
        isLoading.value = true
        try {
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 300))
                daftarMutasi.value = mock.daftarMutasi
            } else {
                // const { data } = await api.get('stock-raw/mutasi/', {
                //   params: { nama_bahan, jenis },
                // })
                // daftarMutasi.value = data.results || data
            }
        } catch (err) {
            error.value = 'Gagal memuat ledger mutasi.'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Stock opname — SET qty batch ke angka hasil hitung ulang.
     * Alasan WAJIB diisi: ini satu-satunya jalur mengubah fisik tanpa
     * transaksi, dan backend menolak kalau alasan kosong.
     *
     * ⚠ Selisih opname TIDAK dibebankan ke akun mana pun — invariant
     * Σ saldo == Σ fisik sengaja dibiarkan meleset sampai rekonsiliasi sesi
     * produksi berikutnya membaginya proporsional.
     */
    const koreksiBatch = async (batchId, { qty_benar, alasan }) => {
        if (!alasan?.trim()) {
            return { success: false, message: 'Alasan koreksi wajib diisi.' }
        }
        if (qty_benar === null || qty_benar === '' || Number(qty_benar) < 0) {
            return { success: false, message: 'Qty hasil opname tidak boleh minus.' }
        }

        sedangSimpan.value = true
        try {
            if (MODE_MOCK) {
                await new Promise(r => setTimeout(r, 500))
                const b = daftarBatch.value.find(x => x.id === batchId)
                if (!b) return { success: false, message: 'Batch tidak ditemukan.' }
                if (Number(b.qty) === Number(qty_benar)) {
                    return { success: false, message: 'Qty sudah sama, tidak ada yang dikoreksi.' }
                }
                b.qty = Number(qty_benar).toFixed(2)
                return { success: true }
            }

            // await api.post(`stock-raw/batch/${batchId}/koreksi/`, {
            //   qty_benar, alasan,
            // })
            // await muatBatch()
            // await muatDashboard()
            // return { success: true }
        } catch (err) {
            return { success: false, message: 'Gagal menyimpan koreksi.' }
            // return { success: false, message: bacaError(err, 'Gagal menyimpan koreksi.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const tampilBahan = computed(() => {
        const q = cari.value.trim().toLowerCase()
        return stokBahan.value
            .filter(b => {
                if (saringStatus.value === 'semua') return true
                return b.status === saringStatus.value.toUpperCase()
            })
            .filter(b => !q || b.nama_bahan.toLowerCase().includes(q))
    })

    const habis = computed(() => stokBahan.value.filter(b => b.status === 'HABIS'))
    const menipis = computed(() => stokBahan.value.filter(b => b.status === 'MENIPIS'))

    /** Saldo minus = entitas sedang berhutang bahan ke pool gudang. */
    const berhutang = computed(() => {
        const hasil = []
        for (const b of stokBahan.value) {
            for (const s of b.saldo_per_akun ?? []) {
                if (Number(s.qty) < 0) {
                    hasil.push({
                        nama_bahan: b.nama_bahan,
                        uom: b.uom,
                        akun: s.akun_detail?.kode ?? '—',
                        qty: Number(s.qty),
                    })
                }
            }
        }
        return hasil.sort((a, b) => a.qty - b.qty)
    })

    /** Bahan yang Σ saldo-nya tidak cocok dengan Σ fisik. */
    const deviasi = computed(() =>
        stokBahan.value.filter(b => Number(b.deviasi_invariant) !== 0),
    )

    return {
        stokBahan, daftarBatch, daftarMutasi, tampilBahan,
        isLoading, sedangSimpan, error, cari, saringStatus,
        habis, menipis, berhutang, deviasi,
        muatDashboard, muatBatch, muatMutasi, koreksiBatch,
    }
}