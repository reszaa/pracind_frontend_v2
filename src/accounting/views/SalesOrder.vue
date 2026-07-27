<template>
    <div class="space-y-6">
        <!-- Header Section -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Sales Order</h1>
                <p class="text-slate-500 text-sm mt-1">Kelola penjualan langsung ke customer</p>
            </div>
            <router-link to="/accounting/sales-order/buat">
                <Button label="Buat SO Baru" icon="pi pi-plus" class="!bg-teal-600 hover:!bg-teal-700 !border-none" />
            </router-link>
        </div>

        <!-- Data Table Card -->
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <!-- Filter / Search Header (Opsional) -->
            <div class="flex justify-end mb-4">
                <span class="p-input-icon-left w-full sm:w-auto">
                    <i class="pi pi-search" />
                    <InputText v-model="searchQuery" placeholder="Cari No. SO atau Customer..."
                        class="w-full sm:w-80" />
                </span>
            </div>

            <DataTable :value="filteredOrders" :loading="isLoading" responsiveLayout="scroll" class="p-datatable-sm"
                paginator :rows="10">
                <template #empty>
                    <div class="text-center py-8 text-slate-500">
                        Belum ada data Sales Order.
                    </div>
                </template>

                <Column field="nomor" header="No. SO" class="font-medium text-slate-800"></Column>

                <Column field="tanggal" header="Tanggal">
                    <template #body="{ data }">
                        {{ formatDate(data.tanggal) }}
                    </template>
                </Column>

                <Column field="customer_detail.nama" header="Customer"></Column>

                <Column field="akun_detail.nama" header="Entitas (Penjual)"></Column>

                <Column field="total_so" header="Total" class="text-right">
                    <template #body="{ data }">
                        <span class="font-medium">{{ formatCurrency(data.total_so) }}</span>
                    </template>
                </Column>

                <Column field="status" header="Status" class="text-center">
                    <template #body="{ data }">
                        <Tag :value="data.status_display" :severity="getStatusSeverity(data.status)"
                            class="!rounded-md !px-2 !py-1 !text-xs !font-bold" />
                    </template>
                </Column>

                <Column header="Aksi" :exportable="false" style="min-width:8rem">
                    <template #body="{ data }">
                        <router-link :to="`/accounting/sales-order/${data.id}`">
                            <Button icon="pi pi-external-link" class="p-button-text p-button-sm p-button-secondary"
                                tooltip="Lihat Detail" />
                        </router-link>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSalesOrder } from '../composables/useSalesOrder'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'

const { salesOrders, isLoading, fetchSalesOrders } = useSalesOrder()
const searchQuery = ref('')

onMounted(() => {
    fetchSalesOrders()
})

// Fungsi Format Lokal (Menggantikan impor dari utils/format.js yang error)
const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Client-side search
const filteredOrders = computed(() => {
    if (!searchQuery.value) return salesOrders.value
    const query = searchQuery.value.toLowerCase()
    return salesOrders.value.filter(so =>
        so.nomor.toLowerCase().includes(query) ||
        so.customer_detail?.nama.toLowerCase().includes(query)
    )
})

// UI Helpers untuk mewarnai badge status
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
</script>