<template>
    <div class="space-y-6 pb-24" v-if="so">
        <!-- Breadcrumb & Header -->
        <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
                <div class="text-slate-400 text-xs font-semibold tracking-wide mb-1 flex items-center gap-2">
                    <span class="hover:text-slate-600 cursor-pointer" @click="router.push('/')">Dashboard</span>
                    <i class="pi pi-angle-right text-[10px]"></i>
                    <span class="hover:text-slate-600 cursor-pointer"
                        @click="router.push('/accounting/transaksi/penjualan')">Penjualan</span>
                    <i class="pi pi-angle-right text-[10px]"></i>
                    <span class="text-slate-700">Detail SO</span>
                </div>
                <div class="flex items-center gap-3">
                    <h1 class="text-2xl font-bold text-slate-800">{{ so.nomor }}</h1>
                    <Tag :value="so.status_display" :severity="getStatusSeverity(so.status)"
                        class="!rounded-md !px-2 !py-1 !text-xs !font-bold" />
                </div>
                <p class="text-slate-500 text-sm mt-1">Dibuat oleh {{ so.dibuat_oleh_username }} pada {{
                    formatDateTime(so.dibuat_pada) }}</p>
            </div>

            <!-- Tombol Cetak PDF yang akan mengarah ke Backend PostgreSQL -->
            <div>
                <Button label="Cetak Surat Jalan (PDF)" icon="pi pi-print" @click="cetakSuratJalanPDF"
                    class="p-button-outlined p-button-secondary !bg-white !font-bold !rounded-lg"
                    :disabled="so.status === 'ORDER' || so.status === 'DIBATALKAN'" />
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Informasi Utama -->
            <div class="lg:col-span-1 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 class="font-bold text-slate-700 mb-4 pb-3 border-b border-slate-100">Informasi Pesanan</h2>

                    <div class="space-y-4 text-sm">
                        <div>
                            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Customer</p>
                            <p class="font-medium text-slate-800">{{ so.customer_detail?.nama }}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Entitas
                                Penjual</p>
                            <p class="font-medium text-slate-800">{{ so.akun_detail?.nama }}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Tanggal SO</p>
                            <p class="font-medium text-slate-800">{{ formatDate(so.tanggal) }}</p>
                        </div>
                        <div v-if="so.tanggal_jatuh_tempo">
                            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Jatuh Tempo
                            </p>
                            <p class="font-medium text-slate-800">{{ formatDate(so.tanggal_jatuh_tempo) }}</p>
                        </div>
                        <div v-if="so.catatan">
                            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Catatan</p>
                            <p class="font-medium text-slate-800 bg-slate-50 p-2 rounded-md">{{ so.catatan }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rincian Item -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 class="font-bold text-slate-700">Daftar Item</h2>
                    </div>

                    <div class="p-6 overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead
                                class="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th class="pb-3">Nama Barang</th>
                                    <th class="pb-3 text-center">Qty</th>
                                    <th class="pb-3 text-right">Harga Satuan</th>
                                    <th class="pb-3 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in so.daftar_item" :key="item.id"
                                    class="border-b border-slate-50 last:border-none">
                                    <td class="py-3 font-medium text-slate-700">{{ item.nama_item }}</td>
                                    <td class="py-3 text-center">{{ parseFloat(item.qty_unit).toLocaleString('id-ID') }}
                                    </td>
                                    <td class="py-3 text-right">{{ formatCurrencyLocal(item.harga_satuan) }}</td>
                                    <td class="py-3 text-right font-medium text-slate-700">{{
                                        formatCurrencyLocal(item.subtotal) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                        <div class="w-full sm:w-64 space-y-2 text-sm">
                            <div class="flex justify-between text-slate-800 font-bold text-base pt-1">
                                <span>Total Tagihan</span>
                                <span class="text-teal-700">{{ formatCurrencyLocal(so.total_so) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons Floating (State Machine) -->
        <div v-if="aksiSelanjutnya"
            class="fixed bottom-0 left-0 lg:left-[120px] right-0 bg-white border-t border-slate-200 p-4 px-6 flex justify-between items-center z-20">
            <div>
                <Button v-if="so.status === 'ORDER'" type="button" label="Batalkan SO" @click="bukaModalBatal"
                    class="p-button-text p-button-danger !font-bold" />
            </div>
            <div class="flex gap-3">
                <Button type="button" :label="isSubmitting ? 'Memproses...' : aksiSelanjutnya.label"
                    :loading="isSubmitting" @click="prosesMajuStatus" icon="pi pi-arrow-right" iconPos="right"
                    class="!bg-teal-600 hover:!bg-teal-700 !border-none !rounded-lg !px-6 !font-bold" />
            </div>
        </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="isLoading" class="p-6 flex justify-center items-center h-64">
        <i class="pi pi-spin pi-spinner text-4xl text-teal-600"></i>
    </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesOrder } from '../composables/useSalesOrder'
import { useToast } from '@/composables/useToast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
    fetchSalesOrderDetail,
    salesOrderDetail: so,
    isLoading,
    isSubmitting,
    majuStatus
} = useSalesOrder()

onMounted(() => {
    if (route.params.id) {
        fetchSalesOrderDetail(route.params.id)
    }
})

// Logika Format Tampilan
const formatCurrencyLocal = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getStatusSeverity = (status) => {
    const map = {
        'ORDER': 'info',
        'PICKING': 'warning',
        'PACKING': 'warning',
        'DELIVERY': 'success',
        'COMPLETED': 'success',
        'DIBATALKAN': 'danger'
    }
    return map[status] || 'secondary'
}

// State Machine Alur
const alurStatus = {
    'ORDER': { target: 'PICKING', label: 'Proses ke Picking' },
    'PICKING': { target: 'PACKING', label: 'Proses ke Packing' },
    'PACKING': { target: 'DELIVERY', label: 'Kirim Pesanan' },
    'DELIVERY': { target: 'COMPLETED', label: 'Tandai Selesai' }
}

const aksiSelanjutnya = computed(() => {
    if (!so.value) return null
    return alurStatus[so.value.status] || null
})

const prosesMajuStatus = async () => {
    if (!aksiSelanjutnya.value) return
    try {
        await majuStatus(so.value.id, aksiSelanjutnya.value.target)
    } catch (error) {
        // Error di-handle di composable
    }
}

const bukaModalBatal = () => {
    // Implementasi pembatalan dengan alasan (prompt dialog)
    const alasan = prompt("Masukkan alasan pembatalan (wajib):")
    if (alasan) {
        // batalkanSalesOrder(so.value.id, alasan)
        toast.info("Fitur batal akan dipasang.")
    }
}

const cetakSuratJalanPDF = () => {
    toast.info("Mempersiapkan template Blueprint dari PostgreSQL...")
    // URL ke backend: window.open(`/api/sales-order/${so.value.id}/pdf/`, '_blank')
}
</script>