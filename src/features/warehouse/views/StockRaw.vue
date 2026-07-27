<template>
    <div class="space-y-4 md:space-y-10 animate-fade-in w-full">
        <div class="bg-white border border-slate-200 rounded-[24px] p-4 md:p-8 shadow-sm">

            <div
                class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 pb-4 md:pb-6 border-b border-slate-50 gap-4">
                <div class="flex items-center gap-3 md:gap-4">
                    <div class="w-1.5 md:w-2 h-5 md:h-6 bg-amber-500 rounded-full"></div>
                    <h3 class="text-base md:text-lg font-bold text-slate-800">Daftar Saldo Bahan Baku</h3>
                </div>

                <div class="relative flex items-center group w-full md:w-auto">
                    <i
                        class="pi pi-search absolute left-4 text-slate-400 group-focus-within:text-amber-500 transition-colors"></i>
                    <InputText v-model="filters['global'].value" placeholder="Cari nama bahan atau entitas..."
                        class="!pl-12 !py-2.5 md:!py-3 !rounded-xl !bg-slate-50 !border-none shadow-sm focus:!ring-2 focus:!ring-amber-500/20 w-full md:w-64 lg:w-80 transition-all font-medium text-sm" />
                </div>
            </div>

            <div class="md:overflow-x-auto rounded-xl border-0 md:border md:border-slate-100">
                <DataTable v-model:filters="filters" :value="stokBahanBakuList" :loading="isLoading"
                    :globalFilterFields="['nama_bahan', 'akun_detail.nama', 'akun_detail.kode']"
                    class="p-datatable-stacked md:min-w-[800px]" responsiveLayout="scroll" :paginator="true" :rows="15">

                    <Column field="akun_detail.nama" header="ENTITAS" :sortable="true" style="width: 20%;">
                        <template #body="{ data }">
                            <div class="flex justify-between items-center md:block w-full">
                                <span
                                    class="md:hidden text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-24 text-left">Pemilik</span>
                                <span
                                    class="px-2.5 md:px-3 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider whitespace-nowrap shadow-sm">
                                    {{ data.akun_detail?.kode || 'UMUM' }}
                                </span>
                            </div>
                        </template>
                    </Column>

                    <Column field="nama_bahan" header="NAMA BAHAN BAKU" :sortable="true" style="width: 35%;">
                        <template #body="{ data }">
                            <div class="flex justify-between items-center md:block w-full">
                                <span
                                    class="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama
                                    Bahan</span>
                                <span class="text-sm font-bold text-slate-800 md:text-slate-700">{{ data.nama_bahan
                                    }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="uom" header="UOM" :sortable="true" style="width: 15%;">
                        <template #body="{ data }">
                            <div class="flex justify-between items-center md:block w-full">
                                <span
                                    class="md:hidden text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-24 text-left">Satuan</span>
                                <span
                                    class="px-2.5 md:px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                    {{ data.uom || 'KG' }}
                                </span>
                            </div>
                        </template>
                    </Column>

                    <Column field="qty" header="SALDO KEPEMILIKAN" :sortable="true"
                        style="width: 15%; text-align: right;">
                        <template #body="{ data }">
                            <div class="flex justify-between items-center md:block w-full text-right">
                                <span
                                    class="md:hidden text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-28 text-left">Saldo
                                    Kepemilikan</span>
                                <span
                                    :class="{ 'text-rose-500 font-black': data.qty < 0, 'text-emerald-600 font-bold text-base md:text-lg': data.qty >= 0 }">
                                    {{ parseFloat(data.qty).toFixed(2) }}
                                </span>
                            </div>
                        </template>
                    </Column>

                    <Column field="berhutang" header="STATUS" :sortable="true" style="width: 15%; text-align: center;">
                        <template #body="{ data }">
                            <div class="flex justify-between items-center md:block w-full md:text-center">
                                <span
                                    class="md:hidden text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-24 text-left">Status</span>

                                <span v-if="data.qty < 0"
                                    class="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    HUTANG POOL
                                </span>
                                <span v-else
                                    class="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    AMAN
                                </span>
                            </div>
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center py-12 md:py-20 bg-slate-50/50 rounded-2xl md:bg-transparent">
                            <i class="pi pi-box text-3xl md:text-4xl text-slate-200 mb-3 md:mb-4 block"></i>
                            <p class="text-slate-400 font-medium text-xs md:text-sm">Data saldo entitas tidak ditemukan.
                            </p>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

import { useStockRaw } from '@/features/warehouse/composables/useStockRaw'

const { isLoading, stokBahanBakuList, filters, fetchStokBahanBaku } = useStockRaw()


onMounted(() => {
    fetchStokBahanBaku()
})
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (min-width: 768px) {
    :deep(.p-datatable-stacked .p-datatable-thead > tr > th) {
        background-color: #f8fafc;
        color: #64748b;
        font-size: 0.70rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr > td) {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid #f1f5f9;
    }
}

@media (max-width: 767px) {
    :deep(.p-datatable-stacked .p-datatable-thead) {
        display: none !important;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr) {
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        margin-bottom: 1.25rem;
        background-color: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        overflow: hidden;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr > td) {
        display: block;
        width: 100% !important;
        border: none;
        padding: 0.5rem 1rem;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr > td:first-child) {
        background-color: #f8fafc;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 0.5rem;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr > td:not(:first-child):not(:last-child)) {
        border-bottom: 1px dashed #f1f5f9;
    }

    :deep(.p-datatable-stacked .p-datatable-tbody > tr > td:last-child) {
        padding-top: 0.75rem;
        padding-bottom: 1rem;
    }
}

:deep(.p-paginator) {
    background-color: transparent;
    padding: 0.75rem;
    border-top: 1px solid #e2e8f0;
}

:deep(.p-paginator .p-paginator-current) {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
}
</style>