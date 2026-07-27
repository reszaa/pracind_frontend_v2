/**
 * src/features/warehouse/composables/useNavWarehouse.js
 * =====================================================
 * Menu rel ikon untuk WarehouseLayout.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROLE } from '@/config/modules'

export const MENU_WAREHOUSE = [
    {
        id: 'stok',
        label: 'Dashboard Stok',
        ringkas: 'Pantau ketersediaan barang',
        ikon: 'pi-box',
        rute: '/warehouse',
        roles: [ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'saldo-raw',
        label: 'Saldo Entitas',
        ringkas: 'Pantau kepemilikan dan hutang bahan',
        ikon: 'pi-list',
        rute: '/warehouse/saldo',
        roles: [ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'inbound',
        label: 'Penerimaan',
        ringkas: 'Terima bahan dari suplier (Inbound)',
        ikon: 'pi-download',
        rute: '/warehouse/inbound',
        roles: [ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'outbound',
        label: 'Pengepakan',
        ringkas: 'Siapkan pesanan & produksi (Outbound)',
        ikon: 'pi-upload',
        rute: '/warehouse/outbound',
        roles: [ROLE.GUDANG],
        activate: true,
    },
    {
        id: 'opname',
        label: 'Stok Opname',
        ringkas: 'Penyesuaian fisik vs sistem',
        ikon: 'pi-clipboard',
        rute: '/warehouse/opname',
        roles: [ROLE.GUDANG],
        activate: true,
    },
]

export function useNavWarehouse() {
    const route = useRoute()
    const { role, isSupervisor } = useAuth()

    const menu = computed(() =>
        MENU_WAREHOUSE.filter(m =>
            isSupervisor.value || !m.roles?.length || m.roles.includes(role.value),
        ),
    )

    const aktif = (rute) => {

        if (rute === '/warehouse') {
            return route.path === '/warehouse'
        }
        return route.path.startsWith(rute)
    }

    const sekarang = computed(() => MENU_WAREHOUSE.find(m => aktif(m.rute)) ?? null)

    return { menu, aktif, sekarang }
}