<template>
    <div class="space-y-6 pb-24">
        <!-- Breadcrumb & Header -->
        <div>
            <div class="text-slate-400 text-xs font-semibold tracking-wide mb-1 flex items-center gap-2">
                <span class="hover:text-slate-600 cursor-pointer" @click="router.push('/')">Dashboard</span>
                <i class="pi pi-angle-right text-[10px]"></i>
                <span class="hover:text-slate-600 cursor-pointer"
                    @click="router.push('/accounting/transaksi/penjualan')">Penjualan</span>
                <i class="pi pi-angle-right text-[10px]"></i>
                <span class="text-slate-700">Buat SO</span>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">Buat sales order</h1>
        </div>

        <form @submit.prevent="submitSO">
            <!-- INFORMASI UTAMA -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 class="font-bold text-slate-700">Informasi utama</h2>
                </div>
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                    <!-- Entitas (Akun) -->
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Entitas
                            Penjual</label>
                        <Dropdown v-model="form.akun" :options="optAkun" optionLabel="nama" optionValue="id"
                            placeholder="Pilih entitas penjual" class="w-full !rounded-lg !border-slate-200"
                            :class="{ 'p-invalid': error.akun }" filter />
                    </div>

                    <!-- Tanggal SO -->
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal
                            SO</label>
                        <Calendar v-model="form.tanggal" dateFormat="dd/mm/yy" class="w-full !rounded-lg"
                            inputClass="!border-slate-200 !rounded-lg" />
                    </div>

                    <!-- Customer -->
                    <div>
                        <label
                            class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Customer</label>
                        <Dropdown v-model="form.customer" :options="optCustomer" optionLabel="nama" optionValue="id"
                            placeholder="Pilih customer" class="w-full !rounded-lg !border-slate-200"
                            :class="{ 'p-invalid': error.customer }" filter />
                    </div>

                    <!-- Nomor SO (Preview) -->
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nomor
                            SO</label>
                        <InputText v-model="previewNomor" disabled placeholder="Pilih entitas & tanggal..."
                            class="w-full !bg-slate-50 !border-slate-200 !rounded-lg text-slate-500 font-mono text-sm" />
                        <p class="text-[10px] text-slate-400 mt-1.5">Sementara — nomor final dibuat sistem saat
                            disimpan.</p>
                    </div>

                    <!-- Jatuh Tempo -->
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Jatuh
                            Tempo <span class="text-slate-400 font-normal lowercase">(opsional)</span></label>
                        <Calendar v-model="form.tanggal_jatuh_tempo" dateFormat="dd/mm/yy" placeholder="dd/mm/yyyy"
                            class="w-full !rounded-lg" inputClass="!border-slate-200 !rounded-lg" showClear />
                    </div>

                    <!-- Catatan -->
                    <div class="md:col-span-2">
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan
                            <span class="text-slate-400 font-normal lowercase">(opsional)</span></label>
                        <InputText v-model="form.catatan" placeholder="Contoh: Kirim ke gudang belakang"
                            class="w-full !border-slate-200 !rounded-lg" />
                    </div>

                </div>
            </div>

            <!-- RINCIAN ITEM -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 class="font-bold text-slate-700">Rincian item</h2>
                        <p class="text-xs text-slate-500 mt-0.5">Tentukan kuantitas dan harga satuan.</p>
                    </div>
                    <Button type="button" label="Tambah item" icon="pi pi-plus" @click="tambahItem"
                        class="p-button-outlined p-button-sm p-button-secondary !rounded-lg !text-xs !font-bold" />
                </div>

                <div class="p-6 overflow-x-auto">
                    <table class="w-full min-w-[700px] text-sm text-left">
                        <thead
                            class="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th class="pb-3 w-4/12">Nama Barang</th>
                                <th class="pb-3 w-2/12">Qty</th>
                                <th class="pb-3 w-3/12">Harga Satuan (Rp)</th>
                                <th class="pb-3 w-2/12 text-right">Subtotal UX (Rp)</th>
                                <th class="pb-3 w-1/12 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="form.daftar_item.length === 0">
                                <td colspan="5" class="py-8 text-center text-slate-400 text-sm">
                                    Belum ada item. Klik "Tambah item" di atas.
                                </td>
                            </tr>
                            <tr v-for="(item, index) in form.daftar_item" :key="index"
                                class="border-b border-slate-50 last:border-none">
                                <td class="py-3 pr-4">
                                    <Dropdown v-model="item.produk" :options="optProduk" optionLabel="nama"
                                        optionValue="id" placeholder="Pilih produk..."
                                        class="w-full !rounded-lg !border-slate-200" filter />
                                </td>
                                <td class="py-3 pr-4">
                                    <InputNumber v-model="item.qty_unit" placeholder="0" class="w-full"
                                        inputClass="!border-slate-200 !rounded-lg !w-full" :minFractionDigits="0"
                                        :maxFractionDigits="2" />
                                </td>
                                <td class="py-3 pr-4">
                                    <InputNumber v-model="item.harga_satuan" placeholder="0" class="w-full"
                                        inputClass="!border-slate-200 !rounded-lg !w-full" mode="currency"
                                        currency="IDR" locale="id-ID" />
                                </td>
                                <td class="py-3 pr-4 text-right font-medium text-slate-600">
                                    {{ formatCurrencyLocal((item.qty_unit || 0) * (item.harga_satuan || 0)) }}
                                </td>
                                <td class="py-3 text-center">
                                    <button type="button" @click="hapusItem(index)"
                                        class="w-8 h-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                        <i class="pi pi-times"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Kalkulasi Lokal (Murni untuk UX, tidak dikirim ke backend) -->
                <div v-if="form.daftar_item.length > 0"
                    class="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    <div class="w-full sm:w-64 space-y-2 text-sm">
                        <div class="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>{{ formatCurrencyLocal(hitungSubtotalUX) }}</span>
                        </div>
                        <div class="flex justify-between text-slate-500 pb-2 border-b border-slate-200">
                            <span>PPN (11%)</span>
                            <span>{{ formatCurrencyLocal(hitungPPNUX) }}</span>
                        </div>
                        <div class="flex justify-between text-slate-800 font-bold text-base pt-1">
                            <span>Total</span>
                            <span>{{ formatCurrencyLocal(hitungTotalUX) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Buttons Floating -->
            <div
                class="fixed bottom-0 left-0 lg:left-[120px] right-0 bg-white border-t border-slate-200 p-4 px-6 flex justify-end gap-3 z-20">
                <Button type="button" label="Batal" @click="router.back()"
                    class="p-button-text p-button-secondary !font-bold" />
                <Button type="submit" :label="isSubmitting ? 'Menyimpan...' : 'Simpan Sales Order'"
                    :loading="isSubmitting" icon="pi pi-check"
                    class="!bg-teal-600 hover:!bg-teal-700 !border-none !rounded-lg !px-6 !font-bold" />
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesOrder } from '../composables/useSalesOrder'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'

import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'

const router = useRouter()
const toast = useToast()
const { getPreviewNomor, createSalesOrder, isSubmitting } = useSalesOrder()

// Form State
const form = reactive({
    akun: null,
    customer: null,
    tanggal: new Date(),
    tanggal_jatuh_tempo: null,
    catatan: '',
    daftar_item: []
})
const error = reactive({ akun: false, customer: false })
const previewNomor = ref('')

// Master Data Options
const optAkun = ref([])
const optCustomer = ref([])
const optProduk = ref([])

onMounted(async () => {
    // Ambil data referensi (asumsi endpoint standar, sesuaikan jika berbeda)
    try {
        const [resAkun, resCustomer, resProduk] = await Promise.all([
            api.get('/akun/'), // Endpoint list entitas
            api.get('/customer/'), // Endpoint list customer
            api.get('/produksi/produk-ringkas/') // Endpoint list produk ringkas
        ])
        optAkun.value = resAkun.data
        optCustomer.value = resCustomer.data
        optProduk.value = resProduk.data
    } catch (err) {
        toast.error('Gagal memuat data master untuk form.')
    }
})

// Format tanggal ke YYYY-MM-DD untuk API
const formatDateToISO = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Watcher untuk meminta nomor preview ke server setiap kali akun/tanggal berubah
watch([() => form.akun, () => form.tanggal], async ([newAkun, newTanggal]) => {
    if (newAkun && newTanggal) {
        const tgl = formatDateToISO(newTanggal)
        const nomor = await getPreviewNomor(newAkun, tgl)
        previewNomor.value = nomor || 'Gagal memuat preview'
    } else {
        previewNomor.value = ''
    }
}, { immediate: true })

// Helper Form Items
const tambahItem = () => {
    form.daftar_item.push({ produk: null, qty_unit: null, harga_satuan: null })
}
const hapusItem = (index) => {
    form.daftar_item.splice(index, 1)
}

// Kalkulasi Murni UX (Sesuai kaidah: Frontend tidak mengirim total ke backend)
const hitungSubtotalUX = computed(() => {
    return form.daftar_item.reduce((acc, curr) => acc + ((curr.qty_unit || 0) * (curr.harga_satuan || 0)), 0)
})
const hitungPPNUX = computed(() => hitungSubtotalUX.value * 0.11)
const hitungTotalUX = computed(() => hitungSubtotalUX.value + hitungPPNUX.value)

const formatCurrencyLocal = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

// Submit Form
const submitSO = async () => {
    error.akun = !form.akun
    error.customer = !form.customer

    if (error.akun || error.customer) {
        toast.error('Lengkapi entitas penjual dan customer.')
        return
    }
    if (form.daftar_item.length === 0) {
        toast.error('Minimal harus ada 1 item rincian.')
        return
    }

    // Filter item kosong
    const validItems = form.daftar_item.filter(i => i.produk && i.qty_unit > 0 && i.harga_satuan >= 0)
    if (validItems.length !== form.daftar_item.length) {
        toast.error('Pastikan produk dipilih, qty > 0, dan harga tidak minus.')
        return
    }

    const payload = {
        akun: form.akun,
        customer: form.customer,
        tanggal: formatDateToISO(form.tanggal),
        tanggal_jatuh_tempo: formatDateToISO(form.tanggal_jatuh_tempo),
        catatan: form.catatan,
        daftar_item: validItems
    }

    try {
        const result = await createSalesOrder(payload)
        // Redirect ke halaman detail setelah berhasil
        router.push(`/accounting/transaksi/penjualan/${result.id}`)
    } catch (err) {
        // Error sudah di-handle oleh composable (toast)
    }
}
</script>