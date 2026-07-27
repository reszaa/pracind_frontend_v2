import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const MENU_RND = [
    {
        id: 'produksi',
        label: 'Sesi Produksi',
        ikon: 'pi-cog',
        rute: '/rnd/produksi', // Kita pindahkan rute utama produksi ke sini
    },
    {
        id: 'formula',
        label: 'Formula Master',
        ikon: 'pi-box',
        rute: '/rnd/formula',
    },
    {
        id: 'tangki',
        label: 'Monitor Tangki',
        ikon: 'pi-database',
        rute: '/rnd/tangki',
    },
    {
        id: 'riset',
        label: 'Riset Pasar',
        ikon: 'pi-chart-line',
        rute: '/rnd/riset',
    },
    {
        id: 'prototipe',
        label: 'Prototipe & Uji',
        ikon: 'pi-flask',
        rute: '/rnd/prototipe',
    },
    {
        id: 'qc',
        label: 'Quality Control',
        ikon: 'pi-check-circle',
        rute: '/rnd/qc',
    }
]

export function useNavRnd() {
    const route = useRoute()
    const menu = computed(() => MENU_RND)

    // Cek apakah URL saat ini cocok dengan rute menu
    const aktif = (rute) => {
        if (rute === '/rnd' && route.path === '/rnd') return true
        if (rute !== '/rnd' && route.path.startsWith(rute)) return true
        return false
    }

    const sekarang = computed(() => MENU_RND.find(m => aktif(m.rute)) ?? null)

    return { menu, aktif, sekarang }
}