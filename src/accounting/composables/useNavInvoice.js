/**
 * src/features/accounting/composables/useNavInvoice.js
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROLE } from '@/config/modules'

export const MENU_INVOICE = [
    {
        id: 'invoice',
        label: 'Invoice',
        ringkas: 'Hutang & piutang per jatuh tempo',
        ikon: 'pi-receipt',
        rute: '/accounting/invoice',
        roles: [ROLE.STAFF, ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'document',
        label: 'Document',
        ringkas: 'Peninjauan kelengkapan dokumen',
        ikon: 'pi-folder',
        rute: '/accounting/document',
        roles: [ROLE.STAFF, ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'payment',
        label: 'Payment',
        ringkas: 'Riwayat dan status pembayaran',
        ikon: 'pi-wallet',
        rute: '/accounting/payment',
        roles: [ROLE.STAFF],
        activate: true,
    },
    {
        id: 'suplier',
        label: 'Suplier',
        ringkas: 'Master data dan riwayat mutasi suplier',
        ikon: 'pi-address-book',
        rute: '/accounting/suplier',
        roles: [ROLE.STAFF],
        activate: true,
    },
]

export function useNavInvoice() {
    const route = useRoute()
    const { role, isSupervisor } = useAuth()

    const menu = computed(() =>
        MENU_INVOICE.filter(m =>
            isSupervisor.value || !m.roles?.length || m.roles.includes(role.value),
        ),
    )

    const aktif = (rute) => route.path.startsWith(rute)

    const sekarang = computed(() => MENU_INVOICE.find(m => aktif(m.rute)) ?? null)

    return { menu, aktif, sekarang }
}