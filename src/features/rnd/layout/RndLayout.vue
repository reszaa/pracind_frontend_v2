<template>
    <div class="layout-rnd">
        <!-- Sidebar Navigasi -->
        <aside class="sidebar">
            <div class="sidebar__kepala">
                <div class="logo">
                    <i class="pi pi-flask"></i>
                    <span>R&D Dept.</span>
                </div>
            </div>

            <nav class="sidebar__menu">
                <router-link v-for="item in menu" :key="item.id" :to="item.rute" class="menu-item"
                    :class="{ 'menu-item--aktif': aktif(item.rute) }">
                    <i class="pi" :class="item.ikon"></i>
                    <span>{{ item.label }}</span>
                </router-link>
            </nav>

            <div class="sidebar__kaki">
                <router-link to="/" class="menu-item menu-item--kembali">
                    <i class="pi pi-arrow-left"></i>
                    <span>Menu Utama</span>
                </router-link>
            </div>
        </aside>

        <!-- Area Konten Utama -->
        <main class="konten">
            <div class="konten__bungkus">
                <!-- Komponen dari masing-masing halaman akan di-render di sini -->
                <router-view v-slot="{ Component }">
                    <transition name="pudar" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </div>
        </main>
    </div>
</template>

<script setup>
import { useNavRnd } from '@/features/rnd/composables/useNavRnd'

const { menu, aktif } = useNavRnd()
</script>

<style scoped>
.layout-rnd {
    display: flex;
    min-height: 100vh;
    background: var(--latar);
}

/* ── Sidebar ────────────────────────────────────────────── */
.sidebar {
    width: 16rem;
    background: var(--panel);
    border-right: 1px solid var(--garis);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    flex-shrink: 0;
}

.sidebar__kepala {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid var(--garis);
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--biru);
    letter-spacing: -0.02em;
}

.sidebar__menu {
    flex: 1;
    padding: 1.25rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow-y: auto;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--lengkung-kecil);
    color: var(--redup);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
}

.menu-item i {
    font-size: 1.1rem;
}

.menu-item:hover {
    background: var(--latar);
    color: var(--teks);
}

.menu-item--aktif {
    background: var(--biru-latar);
    color: var(--biru);
}

.sidebar__kaki {
    padding: 1rem 0.75rem;
    border-top: 1px solid var(--garis);
}

.menu-item--kembali {
    color: var(--redup-2);
}

.menu-item--kembali:hover {
    background: var(--merah-latar);
    color: var(--merah);
}

/* ── Konten ─────────────────────────────────────────────── */
.konten {
    flex: 1;
    overflow-x: hidden;
}

.konten__bungkus {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

/* ── Animasi Transisi Halaman ───────────────────────────── */
.pudar-enter-active,
.pudar-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.pudar-enter-from,
.pudar-leave-to {
    opacity: 0;
    transform: translateY(5px);
}
</style>