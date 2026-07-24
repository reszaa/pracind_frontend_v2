<!--
  src/features/accounting/layout/BukuTagihanLayout.vue
  ====================================================
  Ruang PENINJAUAN — rel ikon sendiri, konsep sama dengan
  InputTransaksiLayout (rail melayang w-[88px], tooltip hover, header mobil,
  sidebar geser + tirai). Bedanya isi: di sini halaman BACA, bukan form.

  Butuh Tailwind v4 (sudah terpasang di proyek ini).

  Menu dari useNavTagihan — ter-gate peran, satu sumber, tidak mungkin
  menunjuk rute mati. Panah di atas rel kembali ke dashboard, sama seperti
  ruang Transaksi: kartunya ada di dashboard, jadi keluarnya juga ke sana.
-->
<template>
    <div class="flex h-screen bg-[#F8FAFC] font-sans text-slate-700 overflow-hidden relative">

        <header
            class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-30 flex items-center justify-between px-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
                <button @click="toggleSidebar"
                    class="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors">
                    <i class="pi pi-bars text-xl"></i>
                </button>
                <span class="font-bold text-slate-800 text-base md:text-lg">Buku Tagihan</span>
            </div>

            <button @click="kembali"
                class="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
                <i class="pi pi-arrow-left text-white text-sm"></i>
            </button>
        </header>

        <div v-if="isMobile && sidebarAktif" @click="tutupDiMobile"
            class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"></div>

        <aside
            class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center py-6 flex-shrink-0 justify-between transition-transform duration-300 ease-in-out"
            :class="[
                'lg:relative lg:translate-x-0 lg:w-[88px] lg:h-[calc(100vh-2rem)] lg:m-4 lg:z-20',
                'fixed top-2 bottom-2 left-2 w-[88px] z-50',
                sidebarAktif ? 'translate-x-0' : '-translate-x-[150%]'
            ]">
            <div class="flex flex-col items-center w-full gap-6 lg:gap-8">
                <div @click="kembali" class="mb-2 cursor-pointer hidden lg:block">
                    <div
                        class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                        <i class="pi pi-arrow-left text-white text-xl"></i>
                    </div>
                </div>

                <nav class="flex flex-col gap-3 lg:gap-4 w-full px-4">
                    <button v-for="item in menu" :key="item.id" @click="klikMenu(item)"
                        class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative mx-auto group"
                        :class="aktif(item.rute) ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'">

                        <i
                            :class="['pi', item.ikon, 'text-lg lg:text-xl', 'transition-transform', 'group-hover:scale-110']"></i>

                        <span
                            class="absolute left-16 bg-slate-800 text-white text-[11px] lg:text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
                            {{ item.label }}
                        </span>
                    </button>

                </nav>
            </div>

            <div class="mt-auto flex flex-col items-center group relative mb-4">
                <button @click="keluar" type="button"
                    class="w-10 h-10 rounded-xl overflow-hidden cursor-pointer border border-slate-200 hover:border-red-500 bg-white hover:bg-red-50 transition-all shadow-sm flex items-center justify-center">
                    <i class="pi pi-power-off text-slate-400 group-hover:text-red-500 transition-colors"></i>
                </button>

                <span
                    class="absolute -top-10 bg-slate-800 text-white text-[11px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Keluar
                </span>
            </div>
        </aside>

        <main class="flex-1 overflow-y-auto p-4 pt-20 md:p-6 md:pt-24 lg:p-8 custom-scrollbar">
            <div class="mx-auto w-full">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </div>
        </main>

    </div>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLayout } from '@/composables/useLayout'
import { useNavTagihan } from '@/features/accounting/composables/useNavTagihan'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const { sidebarAktif, isMobile, toggleSidebar, tutupDiMobile } = useLayout()
const { menu, aktif } = useNavTagihan()

// Kembali ke DASHBOARD, bukan /accounting: sejak Input Transaksi jadi
// modul sendiri, pintu masuknya dari dashboard — pintu keluar harus sama.
const kembali = () => router.push('/')

const klikMenu = (item) => {
    router.push(item.rute)
    tutupDiMobile()
}

const keluar = async () => {
    await logout()
    router.push('/login')
}

watch(() => route.fullPath, tutupDiMobile)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity .15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

@media (prefers-reduced-motion: reduce) {

    .fade-enter-active,
    .fade-leave-active {
        transition: none;
    }
}
</style>