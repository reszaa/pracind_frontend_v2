import { ref } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import api from '@/utils/api'

export function useStockRaw() {
    const isLoading = ref(false)
    const stokBahanBakuList = ref([])

    const filters = ref({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }
    })

    const fetchStokBahanBaku = async () => {
        isLoading.value = true
        try {
            const { data } = await api.get('stock-raw/saldo/')
            stokBahanBakuList.value = data.results || data
        } catch (error) {
            console.error("Gagal memuat saldo bahan baku", error)
        } finally {
            isLoading.value = false
        }
    }

    return { isLoading, stokBahanBakuList, filters, fetchStokBahanBaku }
}