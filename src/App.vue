<template>
    <Toast />
    <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import Toast from 'primevue/toast'
// Rehydrate access card sekali per muat aplikasi — token divalidasi ke

const { muatUlangKartu } = useAuth()
onMounted(muatUlangKartu)
</script>
