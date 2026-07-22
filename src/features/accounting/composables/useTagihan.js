/**
 * src/features/accounting/useTagihan.js
 * ======================================
 * Buku tagihan dirakit di CLIENT dari daftar PO dan SO — backend belum punya
 * endpoint agregat. Cukup untuk sekarang; kalau dokumennya sudah ribuan, ini
 * perlu dipindah jadi endpoint laporan di backend.
 *
 * ⚠ SISI PIUTANG BELUM ADA DI BACKEND.
 * SalesOrder tidak punya `status_pembayaran` maupun riwayat pembayaran —
 * docstring modelnya eksplisit menunda ke fase Finance. Yang dibutuhkan,
 * polanya cermin purchase_order:
 *
 *     SalesOrder + status_pembayaran (UNPAID/PARTIAL/PAID)
 *     RiwayatPembayaranSO    <- cermin RiwayatPembayaranPO
 *     catat_pembayaran_so()  <- cermin catat_pembayaran()
 *
 * Sampai itu ada, MODE_MOCK memakai data contoh untuk sisi piutang.
 */

import { ref, computed } from 'vue'
// import api from '@/utils/api'
// import { bacaError } from '@/utils/error'
import * as mock from '@/mock/tagihanData'

const MODE_MOCK = true

/**
 * Sisa tagihan: total dikurangi pembayaran yang MASIH AKTIF.
 * Pembayaran yang dibatalkan TIDAK dihitung — bug ini pernah ada di
 * paymentHelper lama dan membuat dokumen terlihat lunas padahal belum.
 */
const sisa = (dok) => {
  const total = Number(dok.total_po ?? dok.total_so ?? 0)
  const dibayar = (dok.riwayat_pembayaran || [])
    .filter(r => !r.dibatalkan_pada)
    .reduce((s, r) => s + Number(r.nominal_dibayar || 0), 0)
  return total - dibayar
}

const selisihHari = (tanggal) => {
  if (!tanggal) return null
  const t = new Date(tanggal); t.setHours(0, 0, 0, 0)
  const kini = new Date(); kini.setHours(0, 0, 0, 0)
  return Math.round((t - kini) / 86_400_000)
}

export function useTagihan() {
  const daftarPO = ref([])
  const daftarSO = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const tab = ref('semua')   // semua | hutang | piutang

  const muat = async () => {
    isLoading.value = true
    error.value = null
    try {
      if (MODE_MOCK) {
        await new Promise(r => setTimeout(r, 350))
        daftarPO.value = mock.daftarPO
        daftarSO.value = mock.daftarSO
      } else {
        // const [po, so] = await Promise.all([
        //   api.get('purchase-order/'),
        //   api.get('sales-order/'),
        // ])
        // daftarPO.value = po.data.results || po.data
        // daftarSO.value = so.data.results || so.data
      }
    } catch (err) {
      error.value = 'Gagal memuat data tagihan.'
      // error.value = bacaError(err, 'Gagal memuat data tagihan.')
    } finally {
      isLoading.value = false
    }
  }

  const hutang = computed(() =>
    daftarPO.value
      .filter(po => po.status_pembayaran !== 'PAID' && !po.dibatalkan_pada)
      .map(po => ({
        id: po.id,
        arah: 'hutang',
        nomor: po.nomor,
        pihak: po.suplier_detail?.nama ?? '—',
        tempo: po.tanggal_jatuh_tempo,
        sisa: sisa(po),
        hari: selisihHari(po.tanggal_jatuh_tempo),
        status: po.status_pembayaran,
      })),
  )

  const piutang = computed(() =>
    daftarSO.value
      .filter(so => so.status_pembayaran !== 'PAID' && so.status !== 'DIBATALKAN')
      .map(so => ({
        id: so.id,
        arah: 'piutang',
        nomor: so.nomor,
        pihak: so.customer_detail?.nama ?? '—',
        tempo: so.tanggal_jatuh_tempo,
        sisa: sisa(so),
        hari: selisihHari(so.tanggal_jatuh_tempo),
        status: so.status_pembayaran,
      })),
  )

  /** Terurut dari yang paling mendesak — jatuh tempo terdekat di atas. */
  const tampil = computed(() => {
    const sumber = tab.value === 'hutang' ? hutang.value
      : tab.value === 'piutang' ? piutang.value
        : [...hutang.value, ...piutang.value]
    return [...sumber].sort((a, b) => {
      if (a.hari === null) return 1
      if (b.hari === null) return -1
      return a.hari - b.hari
    })
  })

  const totalHutang = computed(() => hutang.value.reduce((s, x) => s + x.sisa, 0))
  const totalPiutang = computed(() => piutang.value.reduce((s, x) => s + x.sisa, 0))
  const posisiBersih = computed(() => totalPiutang.value - totalHutang.value)

  const lewatTempo = computed(() =>
    [...hutang.value, ...piutang.value].filter(x => x.hari !== null && x.hari < 0),
  )
  const tempoPekanIni = computed(() =>
    [...hutang.value, ...piutang.value]
      .filter(x => x.hari !== null && x.hari >= 0 && x.hari <= 7),
  )

  return {
    isLoading, error, tab,
    hutang, piutang, tampil,
    totalHutang, totalPiutang, posisiBersih,
    lewatTempo, tempoPekanIni,
    muat,
  }
}