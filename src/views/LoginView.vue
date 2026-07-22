<!--
  src/views/LoginView.vue
  ========================
  Kontrak backend:
    POST staff_user/login/  {identifier, password} -> {token, access_card}

  `identifier` boleh username ATAU email — backend menolak eksplisit kalau
  satu email cocok dengan lebih dari satu user, jadi label input tidak
  memaksa memilih salah satu.

  Backend menghapus token lama setiap login: satu sesi aktif per user. Login
  di perangkat lain otomatis mencabut sesi sebelumnya. Itu disebut di bawah
  form supaya tidak jadi kejutan.

  Setelah berhasil, redirect ke `?lanjut=` kalau ada — interceptor 401 di
  utils/api.js menyimpannya saat sesi kedaluwarsa di tengah pekerjaan.
-->
<template>
    <div class="masuk">
        <div class="masuk__kartu">
            <div class="merek">
                <span class="merek__kotak">PC</span>
                <span class="merek__teks">Pracindo</span>
            </div>

            <h1 class="judul">Masuk</h1>
            <p class="sub">Sistem internal gudang, produksi, dan akunting.</p>

            <form @submit.prevent="kirim">
                <label class="isian">
                    <span class="isian__label">Username atau email</span>
                    <input ref="isianPertama" v-model="form.identifier" type="text" autocomplete="username" required
                        :disabled="sedangProses" placeholder="budi.gudang" />
                </label>

                <label class="isian">
                    <span class="isian__label">Kata sandi</span>
                    <div class="isian__sandi">
                        <input v-model="form.password" :type="lihatSandi ? 'text' : 'password'"
                            autocomplete="current-password" required :disabled="sedangProses" placeholder="••••••••" />
                        <button type="button" class="isian__lihat"
                            :aria-label="lihatSandi ? 'Sembunyikan sandi' : 'Tampilkan sandi'"
                            @click="lihatSandi = !lihatSandi">{{ lihatSandi ? 'Sembunyikan' : 'Lihat' }}</button>
                    </div>
                </label>

                <p v-if="pesan" class="galat" role="alert">{{ pesan }}</p>

                <button type="submit" class="tombol" :disabled="sedangProses">
                    {{ sedangProses ? 'Memeriksa' : 'Masuk' }}
                </button>
            </form>

            <p class="catatan">
                Satu sesi aktif per akun — masuk di perangkat lain akan menutup sesi ini.
            </p>
        </div>

        <p class="kaki">
            Lupa kata sandi? Hubungi Supervisor untuk mengatur ulang.
        </p>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { login, sedangProses } = useAuth()

const form = reactive({ identifier: '', password: '' })
const pesan = ref('')
const lihatSandi = ref(false)
const isianPertama = ref(null)

onMounted(() => isianPertama.value?.focus())

const kirim = async () => {
    pesan.value = ''
    const hasil = await login(form.identifier.trim(), form.password)

    if (!hasil.success) {
        pesan.value = hasil.message
        form.password = ''
        return
    }

    // Kembali ke halaman yang dituju sebelum sesi kedaluwarsa.
    const lanjut = route.query.lanjut
    router.push(typeof lanjut === 'string' && lanjut.startsWith('/') ? lanjut : '/')
}
</script>

<style scoped>
.masuk {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: 2rem 1rem;
    background: var(--latar);
}

.masuk__kartu {
    width: 100%;
    max-width: 23rem;
    background: var(--panel);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung);
    padding: 2rem;
}

.merek {
    display: flex;
    align-items: center;
    gap: .6rem;
    margin-bottom: 1.75rem;
}

.merek__kotak {
    width: 32px;
    height: 32px;
    background: var(--teks);
    color: var(--panel);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: .6875rem;
    border-radius: var(--lengkung-kecil);
}

.merek__teks {
    font-size: .8125rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--redup-2);
}

.judul {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -.02em;
}

.sub {
    margin: .35rem 0 1.75rem;
    font-size: .8125rem;
    color: var(--redup);
}

.isian {
    display: block;
    margin-bottom: 1.1rem;
}

.isian__label {
    display: block;
    margin-bottom: .4rem;
    font-size: .6875rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--redup);
}

.isian input {
    width: 100%;
    font-family: inherit;
    font-size: .875rem;
    color: var(--teks);
    background: var(--latar);
    border: 1px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: .65rem .75rem;
}

.isian input:focus {
    outline: none;
    border-color: var(--biru);
    background: var(--panel);
}

.isian input:disabled {
    opacity: .6;
}

.isian input::placeholder {
    color: var(--redup-2);
}

.isian__sandi {
    position: relative;
}

.isian__sandi input {
    padding-right: 5.5rem;
}

.isian__lihat {
    position: absolute;
    right: .5rem;
    top: 50%;
    transform: translateY(-50%);
    font-family: inherit;
    font-size: .6875rem;
    font-weight: 600;
    color: var(--redup);
    background: none;
    border: none;
    padding: .3rem .4rem;
    cursor: pointer;
}

.isian__lihat:hover {
    color: var(--teks);
}

.galat {
    margin: 0 0 1rem;
    padding: .7rem .9rem;
    background: var(--merah-latar);
    border-radius: var(--lengkung-kecil);
    font-size: .8125rem;
    color: var(--merah);
    line-height: 1.5;
    white-space: pre-line;
}

.tombol {
    width: 100%;
    font-family: inherit;
    font-size: .875rem;
    font-weight: 600;
    color: var(--panel);
    background: var(--teks);
    border: none;
    border-radius: var(--lengkung-kecil);
    padding: .75rem;
    cursor: pointer;
    transition: opacity .15s ease;
}

.tombol:hover:not(:disabled) {
    opacity: .88;
}

.tombol:disabled {
    opacity: .5;
    cursor: default;
}

.catatan {
    margin: 1.35rem 0 0;
    padding-top: 1.15rem;
    border-top: 1px solid var(--garis);
    font-size: .6875rem;
    color: var(--redup-2);
    line-height: 1.5;
}

.kaki {
    margin: 0;
    font-size: .75rem;
    color: var(--redup-2);
}
</style>