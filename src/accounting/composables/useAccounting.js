/**
 * src/features/accounting/composables/useAccounting.js
 * =====================================================
 * Agregat untuk halaman depan modul akunting. Menarik dari sumber yang sama
 * dengan BukuTagihan dan PembayaranSuplier, lalu merangkumnya jadi daftar
 * "perlu ditangani" yang terurut prioritas.
 *
 * Urutan prioritas SENGAJA: yang menghentikan uang keluar-masuk lebih dulu,
 * yang administratif belakangan.
 *   1. hutang lewat tempo    — supplier bisa menahan pengiriman berikutnya
 *   2. piutang lewat tempo   — uang yang seharusnya sudah masuk
 *   3. jatuh tempo pekan ini — masih bisa disiapkan
 *   4. dokumen belum lengkap — penting untuk audit, tidak menghentikan apa pun
 *
 * ⚠ Sisi piutang memakai data contoh. SalesOrder di backend belum punya
 * status_pembayaran maupun riwayat pembayaran.
 */

import { ref, computed } from 'vue'
import api from '@/utils/api'
import { bacaError } from '@/utils/error'


const rp = (n) =>
    `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

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

export function useAccounting() {
    const daftarPO = ref([])
    const daftarSO = ref([])
    const isLoading = ref(false)
    const error = ref(null)

    const muat = async () => {
        isLoading.value = true
        error.value = null
        try {
        } catch (err) {
            error.value = bacaError(err, 'Gagal memuat data akunting.')
        } finally {
            isLoading.value = false
        }
    }

    const hutang = computed(() =>
        daftarPO.value
            .filter(po => po.status_pembayaran !== 'PAID' && !po.dibatalkan_pada)
            .map(po => ({
                id: po.id, nomor: po.nomor,
                pihak: po.suplier_detail?.nama ?? '—',
                sisa: sisa(po), hari: selisihHari(po.tanggal_jatuh_tempo),
            })),
    )

    const piutang = computed(() =>
        daftarSO.value
            .filter(so => so.status_pembayaran !== 'PAID' && so.status !== 'DIBATALKAN')
            .map(so => ({
                id: so.id, nomor: so.nomor,
                pihak: so.customer_detail?.nama ?? '—',
                sisa: sisa(so), hari: selisihHari(so.tanggal_jatuh_tempo),
            })),
    )

    const totalHutang = computed(() => hutang.value.reduce((s, x) => s + x.sisa, 0))
    const totalPiutang = computed(() => piutang.value.reduce((s, x) => s + x.sisa, 0))
    const posisiBersih = computed(() => totalPiutang.value - totalHutang.value)

    /** PO yang dokumennya belum lengkap (invoice/faktur/surat jalan). */
    const dokumenKurang = computed(() =>
        daftarPO.value.filter(po => po.kelengkapan && !po.kelengkapan.is_complete),
    )

    /**
     * Satu daftar tindakan lintas sumber, terurut dampak.
     * Bukan grid kartu: daftar terurut membuat orang tahu harus mulai dari mana.
     */
    const perluDitangani = computed(() => {
        const daftar = []

        for (const h of hutang.value) {
            if (h.hari !== null && h.hari < 0) {
                daftar.push({
                    urutan: 1, jenis: 'hutang', tingkat: 'kritis',
                    judul: `${h.nomor} lewat tempo ${Math.abs(h.hari)} hari`,
                    detail: `${h.pihak} · sisa ${rp(h.sisa)}`,
                    tautan: '/accounting/transaksi/pembayaran',
                })
            }
        }

        for (const p of piutang.value) {
            if (p.hari !== null && p.hari < 0) {
                daftar.push({
                    urutan: 2, jenis: 'piutang', tingkat: 'kritis',
                    judul: `${p.nomor} belum tertagih ${Math.abs(p.hari)} hari`,
                    detail: `${p.pihak} · sisa ${rp(p.sisa)}`,
                    tautan: '/accounting/tagihan',
                })
            }
        }

        for (const x of [...hutang.value, ...piutang.value]) {
            if (x.hari !== null && x.hari >= 0 && x.hari <= 7) {
                daftar.push({
                    urutan: 3, jenis: 'tempo', tingkat: 'perhatian',
                    judul: `${x.nomor} jatuh tempo ${x.hari === 0 ? 'hari ini' : `${x.hari} hari lagi`}`,
                    detail: `${x.pihak} · ${rp(x.sisa)}`,
                    tautan: '/accounting/tagihan',
                })
            }
        }

        for (const po of dokumenKurang.value) {
            const kurang = po.kelengkapan.belum.map(b => b.label).join(', ')
            daftar.push({
                urutan: 4, jenis: 'dokumen', tingkat: 'biasa',
                judul: `${po.nomor} dokumen belum lengkap`,
                detail: `Menunggu ${kurang} — ${po.suplier_detail?.nama ?? '—'}`,
                tautan: `/accounting/po/${po.id}`,
            })
        }

        return daftar.sort((a, b) => a.urutan - b.urutan)
    })

    const jumlahKritis = computed(
        () => perluDitangani.value.filter(x => x.tingkat === 'kritis').length,
    )

    return {
        isLoading, error,
        hutang, piutang, totalHutang, totalPiutang, posisiBersih,
        dokumenKurang, perluDitangani, jumlahKritis,
        muat,
    }
}