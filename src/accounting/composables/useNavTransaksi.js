/**
 * src/features/accounting/composables/useNavTransaksi.js
 * ======================================================
 * Daftar menu untuk rel ikon di InputTransaksiLayout.
 *
 * Kenapa ini composable dan bukan array di dalam komponen: daftarnya butuh
 * gating peran + flag `siap`, dan dipakai dua tempat — rel di layout DAN
 * kartu pemilih di InputTransaksi.vue. Satu sumber, supaya menu di rel tidak
 * pernah beda dengan kartu di halaman.
 *
 * HANYA TRANSAKSI. Daftar PO dan Buku tagihan sengaja TIDAK di sini —
 * keduanya halaman peninjauan, tempatnya di modul Akunting. Ruang ini
 * khusus mencatat.
 *
 * BEDA DENGAN useTransaksi.js: yang itu mencatat/mengambil data transaksi
 * (riwayat, simpan). Yang ini murni navigasi — tidak menyentuh API.
 *
 * ⚠ `siap: false` = layar/endpoint-nya belum ada. Item tetap TAMPIL tapi
 * redup dan tidak bisa diklik — lebih jujur daripada disembunyikan, karena
 * staf jadi tahu fitur itu direncanakan, bukan hilang. Jangan diaktifkan
 * sebelum backend-nya benar-benar jalan (lihat SPEK-BACKEND.md).
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROLE } from '@/config/modules'

/** Yang benar-benar MENCATAT transaksi (mengubah uang/barang). */
export const TRANSAKSI = [
    {
        id: 'pembelian',
        label: 'Pembelian',
        ringkas: 'Terbitkan PO ke suplier',
        ikon: 'pi-shopping-cart',
        rute: '/accounting/transaksi/pembelian',
        roles: [ROLE.STAFF, ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'penjualan',
        label: 'Penjualan',
        ringkas: 'Sales order ke customer',
        ikon: 'pi-send',
        rute: '/accounting/transaksi/penjualan',
        roles: [ROLE.STAFF, ROLE.SALES],
        activate: true,

    },
    {
        id: 'pembayaran',
        label: 'Pembayaran',
        ringkas: 'Lunasi / cicil tagihan suplier',
        ikon: 'pi-wallet',
        rute: '/accounting/transaksi/pembayaran',
        roles: [ROLE.STAFF],
        activate: true,
    },
]

const bolehLihat = (item, role, isSupervisor) =>
    isSupervisor || !item.roles?.length || item.roles.includes(role)

export function useNavTransaksi() {
    const route = useRoute()
    const { role, isSupervisor } = useAuth()

    const transaksi = computed(() =>
        TRANSAKSI.filter(t => bolehLihat(t, role.value, isSupervisor.value)),
    )
    /**
     * Rute index ruang transaksi harus cocok PERSIS, kalau tidak dia menyala
     * di semua sub-halamannya (perilaku router-link bawaan yang inklusif).
     */
    const aktif = (rute) =>
        rute === '/accounting/transaksi'
            ? route.path === rute
            : route.path.startsWith(rute)

    /** Item yang sedang dibuka — untuk judul halaman. */
    const sekarang = computed(() =>
        TRANSAKSI.find(i => aktif(i.rute)) ?? null,
    )

    return { transaksi, aktif, sekarang }
}