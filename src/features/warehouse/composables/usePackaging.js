/**
 * src/features/warehouse/composables/usePackaging.js
 * =============================================
 * Packaging = langkah HasilPackaging dalam SESI produksi (bukan CRUD gudang).
 * Kontrak backend ASLI:
 *
 *   GET  produksi/sesi/?status=DIBUKA        sesi terbuka (packaging butuh sesi)
 *   GET  produksi/sesi/{id}/                 detail (hasil_packaging berjalan)
 *   POST produksi/sesi/buka/                 {catatan?}                role PRODUKSI
 *   POST produksi/sesi/{id}/packaging/       {produk, qty_unit, no_batch_fg?, dari_tanki?}
 *   GET  produksi/sesi/{id}/kapasitas/       ?produk=  -> Q_max = min(pool_m/β_m)
 *   GET  produksi/produk/                    master produk (varian kemasan)
 *   GET  inventory/tanki/                    tangki (sumber MIXING/BLENDING)
 *
 * PERBEDAAN PENTING dari draf referensi (mock localStorage):
 *  - TANPA pemilik. Di model SZA, packaging TIDAK diberi ke PT/CV — kepemilikan
 *    dibagi otomatis proporsional (Share) saat sesi DITUTUP. Selektor "Pemilik"
 *    dibuang; itu justru yang digantikan oleh rekonsiliasi.
 *  - Produk = varian kemasan (satu produk = satu kemasan, mis. "X Pail 25KG").
 *    Kategori kemasan hardcoded diganti pilihan produk nyata.
 *  - Kalkulasi "berat ditarik" = qty_unit × β_m dari FORMULA AKTIF produk
 *    (bukan tabel kg-per-kemasan hardcoded) — sama secara konsep (unit × laju
 *    per-unit), benar secara model.
 *  - Append-only: tak ada update/hapus HasilPackaging (sesi dikunci saat tutup).
 *  - Satu produk per sesi (dijaga backend) — di-surface ke UI.
 */

import { ref, reactive, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'

const TANGKI_SUMBER = ['MIXING', 'BLENDING']   // Tanki.JENIS_SUMBER_PACKAGING

const angka = (n) => Number(n) || 0

export function usePackaging() {
    const sesiAktif = ref(null)
    const produkList = ref([])
    const tankiList = ref([])
    const kapasitas = ref(null)        // {produk, q_max, bottleneck, rincian}

    const isLoading = ref(false)
    const isSaving = ref(false)
    const error = ref(null)
    const feedback = ref(null)         // { tipe:'ok'|'galat', teks }

    const form = reactive({
        produk: null,
        qty_unit: 0,
        no_batch_fg: '',
        dari_tanki: null,
    })

    // ---- muat ----

    const muatSesiAktif = async () => {
        isLoading.value = true
        error.value = null
        try {
            const { data } = await api.get('produksi/sesi/?status=DIBUKA')
            const daftar = data.results || data
            sesiAktif.value = daftar.length ? daftar[0] : null   // ambil sesi terbuka terbaru
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat sesi aktif.')
        } finally {
            isLoading.value = false
        }
    }

    const muatProduk = async () => {
        try {
            const { data } = await api.get('produksi/produk/')
            const semua = data.results || data
            // hanya produk yang punya formula aktif — packaging butuh β
            produkList.value = semua.filter(p => p.aktif && p.formula_aktif)
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat produk.')
        }
    }

    const muatTanki = async () => {
        try {
            const { data } = await api.get('inventory/tanki/')
            const semua = data.results || data
            tankiList.value = semua.filter(t => t.aktif && TANGKI_SUMBER.includes(t.jenis))
        } catch (err) {
            // tangki opsional (jejak fisik) — jangan gagalkan layar
            tankiList.value = []
        }
    }

    const bukaSesi = async (catatan = '') => {
        isSaving.value = true
        error.value = null
        try {
            const { data } = await api.post('produksi/sesi/buka/', { catatan })
            sesiAktif.value = data
            feedback.value = { tipe: 'ok', teks: `Sesi ${data.nomor} dibuka. Mulai catat packaging.` }
            return { success: true }
        } catch (err) {
            const m = bacaError(err, 'Gagal membuka sesi.')
            error.value = m
            return { success: false, message: m }
        } finally {
            isSaving.value = false
        }
    }

    const refreshSesi = async () => {
        if (!sesiAktif.value) return
        const { data } = await api.get(`produksi/sesi/${sesiAktif.value.id}/`)
        sesiAktif.value = data
    }

    const muatKapasitas = async (produkId) => {
        kapasitas.value = null
        if (!sesiAktif.value || !produkId) return
        try {
            const { data } = await api.get(
                `produksi/sesi/${sesiAktif.value.id}/kapasitas/?produk=${produkId}`,
            )
            kapasitas.value = data
        } catch (err) {
            // kapasitas cuma pratinjau — jangan gagalkan
            kapasitas.value = null
        }
    }

    // ---- turunan ----

    /** Event packaging yang sudah tercatat di sesi ini. */
    const hasilPackaging = computed(() => sesiAktif.value?.hasil_packaging ?? [])

    /** Total unit yang sudah dikemas sesi ini (Q berjalan). */
    const totalQ = computed(() =>
        hasilPackaging.value.reduce((s, h) => s + angka(h.qty_unit), 0),
    )

    /** Kalau sesi sudah punya packaging, ia terkunci ke produk itu (1 produk/sesi). */
    const produkTerkunci = computed(() =>
        hasilPackaging.value.length ? hasilPackaging.value[0].produk : null,
    )

    const produkTerpilih = computed(() =>
        produkList.value.find(p => p.id === form.produk) ?? null,
    )

    /** Komposisi formula aktif produk terpilih: [{nama_bahan, qty_per_unit, uom}]. */
    const komposisi = computed(() => produkTerpilih.value?.formula_aktif?.komposisi ?? [])

    /**
     * "Berat ditarik" per bahan = qty_unit × β_m — cairan/bahan yang akan
     * dikonsumsi saat tutup. Inti kalkulasi yang sama seperti referensi
     * (jumlah × laju per-unit), tapi memakai formula nyata.
     */
    const previewTarik = computed(() =>
        komposisi.value.map(k => ({
            nama_bahan: k.nama_bahan,
            uom: k.uom,
            beta: angka(k.qty_per_unit),
            total: +(angka(form.qty_unit) * angka(k.qty_per_unit)).toFixed(4),
        })),
    )

    /** true kalau qty melebihi kapasitas pool (akan gagal di tutup). */
    const melebihiKapasitas = computed(() => {
        if (!kapasitas.value) return false
        return angka(form.qty_unit) + totalQ.value > angka(kapasitas.value.q_max)
    })

    // ---- aksi ----

    const setProduk = (produkId) => {
        form.produk = produkId
        muatKapasitas(produkId)
    }

    const resetForm = () => {
        form.produk = produkTerkunci.value ?? null
        form.qty_unit = 0
        form.no_batch_fg = ''
        form.dari_tanki = null
        error.value = null
        feedback.value = null
        if (form.produk) muatKapasitas(form.produk)
    }

    const catatPackaging = async () => {
        error.value = null
        feedback.value = null

        if (!sesiAktif.value) {
            const m = 'Belum ada sesi terbuka. Buka sesi dulu.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }
        if (!form.produk) {
            const m = 'Pilih produk yang dikemas.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }
        if (angka(form.qty_unit) <= 0) {
            const m = 'Jumlah unit kemasan harus lebih dari 0.'
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        }

        isSaving.value = true
        try {
            await api.post(`produksi/sesi/${sesiAktif.value.id}/packaging/`, {
                produk: form.produk,
                qty_unit: form.qty_unit,
                ...(form.no_batch_fg?.trim() ? { no_batch_fg: form.no_batch_fg.trim() } : {}),
                ...(form.dari_tanki ? { dari_tanki: form.dari_tanki } : {}),
            })
            await refreshSesi()
            await muatKapasitas(form.produk)
            const catatan = melebihiKapasitas.value
                ? ' — perhatikan: total unit melebihi kapasitas pool, sesi akan ditolak saat tutup kalau tidak dikoreksi.'
                : ''
            feedback.value = { tipe: 'ok', teks: `Packaging tercatat.${catatan}` }
            form.qty_unit = 0
            form.no_batch_fg = ''
            return { success: true }
        } catch (err) {
            const m = bacaError(err, 'Gagal mencatat packaging.')
            error.value = m
            feedback.value = { tipe: 'galat', teks: m }
            return { success: false, message: m }
        } finally {
            isSaving.value = false
        }
    }

    return {
        // state
        sesiAktif, produkList, tankiList, kapasitas,
        isLoading, isSaving, error, feedback, form,
        // turunan
        hasilPackaging, totalQ, produkTerkunci, produkTerpilih, komposisi,
        previewTarik, melebihiKapasitas,
        // aksi
        muatSesiAktif, muatProduk, muatTanki, bukaSesi, refreshSesi,
        muatKapasitas, setProduk, resetForm, catatPackaging,
    }
}