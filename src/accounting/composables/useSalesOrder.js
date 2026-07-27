import { ref } from 'vue'
import api from '@/utils/api'
import { useToast } from 'primevue/usetoast'

export function useSalesOrder() {
    const isLoading = ref(false)
    const isSubmitting = ref(false)
    const salesOrders = ref([])
    const salesOrderDetail = ref(null)
    const toast = useToast()

    // Ambil daftar SO (bisa difilter)
    const fetchSalesOrders = async (params = {}) => {
        isLoading.value = true
        try {
            const { data } = await api.get('/sales-order/', { params })
            salesOrders.value = data
        } catch (error) {
            toast.error('Gagal mengambil data Sales Order')
            console.error(error)
        } finally {
            isLoading.value = false
        }
    }

    // Ambil Detail SO
    const fetchSalesOrderDetail = async (id) => {
        isLoading.value = true
        try {
            const { data } = await api.get(`/sales-order/${id}/`)
            salesOrderDetail.value = data
            return data
        } catch (error) {
            toast.error('Gagal mengambil detail SO')
            throw error
        } finally {
            isLoading.value = false
        }
    }

    // Ambil Preview Nomor
    const getPreviewNomor = async (akunId, tanggal) => {
        if (!akunId || !tanggal) return null
        try {
            const { data } = await api.get('/sales-order/preview-nomor/', {
                params: { akun: akunId, tanggal }
            })
            return data.nomor_preview
        } catch (error) {
            return null
        }
    }

    // Buat SO Baru
    const createSalesOrder = async (payload) => {
        isSubmitting.value = true
        try {
            const { data } = await api.post('/sales-order/', payload)
            toast.success('Sales Order berhasil dibuat')
            return data
        } catch (error) {
            const msg = error.response?.data?.detail || 'Gagal membuat Sales Order'
            toast.error(msg)
            throw error
        } finally {
            isSubmitting.value = false
        }
    }

    // Majukan Status (Transisi searah)
    const majuStatus = async (id, ke_status = null) => {
        isSubmitting.value = true
        try {
            const payload = ke_status ? { ke_status } : {}
            const { data } = await api.post(`/sales-order/${id}/maju-status/`, payload)
            toast.success(`Status berhasil diperbarui ke ${data.status_display}`)
            salesOrderDetail.value = data // Update local state
            return data
        } catch (error) {
            const msg = error.response?.data?.status || 'Gagal mengubah status'
            toast.error(msg)
            throw error
        } finally {
            isSubmitting.value = false
        }
    }

    // Batalkan SO
    const batalkanSalesOrder = async (id, alasan) => {
        isSubmitting.value = true
        try {
            const { data } = await api.post(`/sales-order/${id}/batalkan/`, { alasan })
            toast.success('Sales Order berhasil dibatalkan')
            salesOrderDetail.value = data
            return data
        } catch (error) {
            const msg = error.response?.data?.status || error.response?.data?.alasan || 'Gagal membatalkan'
            toast.error(msg)
            throw error
        } finally {
            isSubmitting.value = false
        }
    }

    return {
        isLoading,
        isSubmitting,
        salesOrders,
        salesOrderDetail,
        fetchSalesOrders,
        fetchSalesOrderDetail,
        getPreviewNomor,
        createSalesOrder,
        majuStatus,
        batalkanSalesOrder
    }
}