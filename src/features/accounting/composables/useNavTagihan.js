/**
 * src/features/accounting/composables/useNavTagihan.js
 * =====================================================
 * Menu rel ikon untuk BukuTagihanLayout. Pola sama dengan useNavTransaksi:
 * satu sumber, ter-gate peran, tidak mungkin menunjuk rute mati.
 *
 * BEDA PERAN DENGAN RUANG TRANSAKSI:
 *   Transaksi = MENCATAT (buat PO, catat pembayaran)
 *   Tagihan   = MENINJAU (lihat posisi hutang/piutang, telusuri dokumen)
 * Karena itu isinya halaman baca, bukan form.
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROLE } from '@/config/modules'

export const MENU_TAGIHAN = [
    {
        id: 'tagihan',
        label: 'Buku tagihan',
        ringkas: 'Hutang & piutang per jatuh tempo',
        ikon: 'pi-receipt',
        rute: '/accounting/tagihan',
        roles: [ROLE.STAFF, ROLE.GUDANG],
        siap: true,
    },
    {
        id: 'po',
        label: 'Purchase order',
        ringkas: 'Daftar PO & kelengkapan dokumen',
        ikon: 'pi-list',
        rute: '/accounting/po',
        roles: [ROLE.STAFF, ROLE.GUDANG],
        siap: true,
    },
]

export function useNavTagihan() {
    const route = useRoute()
    const { role, isSupervisor } = useAuth()

    const menu = computed(() =>
        MENU_TAGIHAN.filter(m =>
            isSupervisor.value || !m.roles?.length || m.roles.includes(role.value),
        ),
    )

    const aktif = (rute) => route.path.startsWith(rute)

    const sekarang = computed(() => MENU_TAGIHAN.find(m => aktif(m.rute)) ?? null)

    return { menu, aktif, sekarang }
}