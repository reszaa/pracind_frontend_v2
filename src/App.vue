<template>
    <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

// Rehydrate access card sekali per muat aplikasi — token divalidasi ke
// staff_user/me/ dan perubahan role oleh Supervisor langsung terasa.
const { muatUlangKartu } = useAuth()
onMounted(muatUlangKartu)
</script>
