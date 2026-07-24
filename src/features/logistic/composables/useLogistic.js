/**
 * src/features/logistic/composables/useLogistic.js
 * =================================================
 * TERSAMBUNG API. Kontrak (logistik/urls.py):
 *
 *   GET  logistik/kurir/                      ?aktif=true
 *   GET  logistik/surat-jalan/                ?status=&sales_order=&kurir=
 *   POST logistik/surat-jalan/                {sales_order, kurir,
 *                                              daftar_item:[{so_item, qty}], catatan?}
 *   POST logistik/surat-jalan/{id}/berangkat/ -> SO jadi DELIVERY
 *   POST logistik/surat-jalan/{id}/terkirim/  {penerima, catatan?}
 *   POST logistik/surat-jalan/{id}/batalkan/  {alasan} — hanya saat DISIAPKAN
 *   GET  sales-order/                          ?status= untuk pilih SO
 *
 * TIGA ATURAN DIJAGA BACKEND, BUKAN DI SINI (logistik/services.py):
 *   - sisa kirim = qty_unit − kuantitas_terkirim − qty di SJ DISIAPKAN
 *     (pengurang terakhir mencegah double-ship sebelum truk berangkat)
 *   - berangkat  -> kuantitas_terkirim naik, SO jadi DELIVERY
 *   - terkirim   -> SO jadi COMPLETED hanya kalau penuh DAN tak ada SJ aktif
 * Frontend hanya menampilkan sisa sebagai panduan; server tetap yang menolak
 * kalau angkanya melebihi.
 *
 * ⚠ NAMA FIELD dari backend (beda dengan mock lama):
 *     item SO      -> qty_unit, kuantitas_terkirim   (bukan quantity)
 *     payload item -> so_item                        (bukan so_item_id)
 *     kurir        -> plat, jenis_kendaraan, status  (status DITURUNKAN
 *                     server dari SJ berjalan, bukan field tersimpan)
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

/** SO yang barangnya sudah disiapkan gudang — sebelum PICKING, backend menolak. */
const STATUS_SIAP_KIRIM = ['PICKING', 'PACKING', 'DELIVERY']

export function useLogistic() {
    const daftarSJ = ref([])
    const daftarKurir = ref([])
    const daftarSO = ref([])
    const isLoading = ref(false)
    const sedangSimpan = ref(false)
    const error = ref(null)
    const saringStatus = ref('semua')

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
            const [sj, kurir] = await Promise.all([
                api.get('logistik/surat-jalan/'),
                api.get('logistik/kurir/', { params: { aktif: true } }),
            ])
            daftarSJ.value = sj.data.results || sj.data
            daftarKurir.value = kurir.data.results || kurir.data
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data pengiriman.')
        } finally {
            isLoading.value = false
        }
    }

    /** SO yang layak dibuatkan surat jalan. */
    const muatSO = async () => {
        try {
            const { data } = await api.get('sales-order/')
            daftarSO.value = (data.results || data).filter(
                so => STATUS_SIAP_KIRIM.includes(so.status),
            )
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat sales order.')
            daftarSO.value = []
        }
    }

    /**
     * Qty yang sudah dijanjikan ke SJ berstatus DISIAPKAN — barangnya belum
     * keluar gudang tapi sudah dipesan satu surat jalan. Dihitung dari
     * daftarSJ yang sudah dimuat; server tetap punya perhitungan otoritatif.
     */
    const dialokasikan = (soItemId) =>
        daftarSJ.value
            .filter(sj => sj.status === 'DISIAPKAN')
            .flatMap(sj => sj.daftar_item ?? [])
            .filter(i => i.so_item === soItemId)
            .reduce((s, i) => s + Number(i.qty), 0)

    /** SO + item yang dihias `sisa_buat` untuk form. */
    const soDenganSisa = computed(() =>
        daftarSO.value
            .map(so => ({
                ...so,
                daftar_item: (so.daftar_item ?? []).map(i => {
                    const dialok = dialokasikan(i.id)
                    return {
                        ...i,
                        dialokasikan: dialok,
                        sisa_buat: Number(i.qty_unit) - Number(i.kuantitas_terkirim) - dialok,
                    }
                }),
            }))
            .filter(so => so.daftar_item.some(i => i.sisa_buat > 0)),
    )

    /** @param items [{so_item, qty}] */
    const buatSJ = async ({ soId, kurirId, items, catatan = '' }) => {
        const terisi = (items ?? []).filter(i => Number(i.qty) > 0)
        if (!terisi.length) return { success: false, message: 'Tidak ada kuantitas yang diisi.' }
        if (!kurirId) return { success: false, message: 'Pilih kurir untuk surat jalan ini.' }

        sedangSimpan.value = true
        try {
            const { data } = await api.post('logistik/surat-jalan/', {
                sales_order: soId, kurir: kurirId, catatan, daftar_item: terisi,
            })
            await muat()
            return { success: true, sj: data }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal membuat surat jalan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const berangkat = async (sjId) => {
        sedangSimpan.value = true
        try {
            await api.post(`logistik/surat-jalan/${sjId}/berangkat/`)
            await muat()
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mencatat keberangkatan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const terkirim = async (sjId, { penerima, catatan = '' }) => {
        if (!penerima?.trim()) return { success: false, message: 'Nama penerima wajib diisi.' }
        sedangSimpan.value = true
        try {
            await api.post(`logistik/surat-jalan/${sjId}/terkirim/`, { penerima, catatan })
            await muat()
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal mengonfirmasi penerimaan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const batalkanSJ = async (sjId, alasan) => {
        if (!alasan?.trim()) return { success: false, message: 'Alasan pembatalan wajib diisi.' }
        sedangSimpan.value = true
        try {
            await api.post(`logistik/surat-jalan/${sjId}/batalkan/`, { alasan })
            await muat()
            return { success: true }
        } catch (err) {
            return { success: false, message: bacaError(err, 'Gagal membatalkan surat jalan.') }
        } finally {
            sedangSimpan.value = false
        }
    }

    const tampil = computed(() =>
        saringStatus.value === 'semua'
            ? daftarSJ.value
            : daftarSJ.value.filter(sj => sj.status === saringStatus.value.toUpperCase()),
    )

    const dalamPerjalanan = computed(() =>
        daftarSJ.value.filter(sj => sj.status === 'DALAM_PERJALANAN'))
    const disiapkan = computed(() =>
        daftarSJ.value.filter(sj => sj.status === 'DISIAPKAN'))
    const terkirimPekanIni = computed(() => {
        const batas = Date.now() - 7 * 86_400_000
        return daftarSJ.value.filter(
            sj => sj.status === 'TERKIRIM' && new Date(sj.tiba_pada) >= batas)
    })

    /** Status kurir sudah DITURUNKAN server — jangan hitung ulang di sini. */
    const kurirStatus = computed(() => daftarKurir.value)

    return {
        daftarSJ, daftarKurir, daftarSO, tampil,
        isLoading, sedangSimpan, error, saringStatus,
        dalamPerjalanan, disiapkan, terkirimPekanIni,
        kurirStatus, soDenganSisa,
        muat, muatSO, buatSJ, berangkat, terkirim, batalkanSJ,
    }
}