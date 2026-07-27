/**
 * src/features/accounting/composables/useTransaksi.js
 * ====================================================
 * Pencatatan transaksi harian oleh akunting.
 *
 * ⚠ ASUMSI YANG PERLU DIKONFIRMASI:
 * "Input transaksi" di sini diperlakukan sebagai PINTU MASUK yang
 * mengarahkan ke form sesuai jenis, bukan satu form panjang. Alasannya
 * ketiga jenis punya bentuk data yang sangat berbeda:
 *
 *   PEMBELIAN  -> POST purchase-order/         (header + daftar_item)
 *   PENJUALAN  -> POST sales-order/            ⚠ SERVICE BELUM ADA di backend
 *   PEMBAYARAN -> POST purchase-order/{id}/catat-pembayaran/
 *                 (sudah ditangani PembayaranSuplier.vue)
 *
 * Kalau maksudnya satu form tunggal untuk semua jenis, struktur ini perlu
 * dirombak — bilang sebelum lanjut.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


export const JENIS = {
    PEMBELIAN: 'PEMBELIAN',
    PENJUALAN: 'PENJUALAN',
    PEMBAYARAN: 'PEMBAYARAN',
}

export function useTransaksi() {
    const daftarPO = ref([])
    const daftarSO = ref([])
    const isLoading = ref(false)
    const error = ref(null)

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat riwayat transaksi.')
        } finally {
            isLoading.value = false
        }
    }

    const hariIniISO = () => {
        const t = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
        return t.toISOString().slice(0, 10)
    }

    /** Semua transaksi dari dua sumber, digabung dan diurut terbaru dulu. */
    const riwayat = computed(() => {
        const beli = daftarPO.value.map(po => ({
            id: `po-${po.id}`,
            jenis: JENIS.PEMBELIAN,
            nomor: po.nomor,
            tanggal: po.tanggal,
            pihak: po.suplier_detail?.nama ?? '—',
            nilai: Number(po.total_po ?? 0),
            status: po.status_pembayaran,
            lengkap: po.kelengkapan?.is_complete ?? null,
        }))

        const jual = daftarSO.value.map(so => ({
            id: `so-${so.id}`,
            jenis: JENIS.PENJUALAN,
            nomor: so.nomor,
            tanggal: so.tanggal,
            pihak: so.customer_detail?.nama ?? '—',
            nilai: Number(so.total_so ?? 0),
            status: so.status_pembayaran,
            lengkap: null,
        }))

        return [...beli, ...jual].sort(
            (a, b) => new Date(b.tanggal) - new Date(a.tanggal),
        )
    })

    const transaksiHariIni = computed(() =>
        riwayat.value.filter(x => x.tanggal === hariIniISO()),
    )

    const nilaiHariIni = computed(() =>
        transaksiHariIni.value.reduce((s, x) => s + x.nilai, 0),
    )

    const dokumenKurang = computed(() =>
        daftarPO.value.filter(po => po.kelengkapan && !po.kelengkapan.is_complete),
    )

    return {
        isLoading, error,
        riwayat, transaksiHariIni, nilaiHariIni, dokumenKurang,
        muat, hariIniISO,
    }
}