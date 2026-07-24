<!--
  src/views/LoginView.vue
  ========================
  Form login dan registrasi (versi disederhanakan).
  Field Entitas dan Jabatan telah dihapus dari antarmuka dan state.
-->
<template>
    <div class="masuk">

        <!-- ── kiri: panel ilustrasi (desktop) ─────────────────── -->
        <aside class="kiri">
            <div class="merek">
                <img :src="logoPracindo" alt="Logo Pracindo" class="merek__logo" />
                <span class="merek__nama">Pracindo Supply Chain Management</span>
            </div>

            <div class="kiri__isi">
                <h1 class="tagline">
                    Aplikasi <br>
                    Utama untuk <br>
                    <span class="tagline__aksen">Kontrol Manufaktur.</span>
                </h1>

                <p class="tagline__sub">
                    Aplikasi untuk mengelola rantai pasok, proses produksi, pembukuan,
                    inventaris gudang, hingga distribusi lapangan.
                </p>

                <img :src="ilustrationImg" alt="Ilustrasi Central Hub" class="ilustrasi" />
            </div>
        </aside>

        <!-- ── kanan: form login ───────────────────────────────── -->
        <main class="kanan">
            <div class="kartu">
                <div class="merek merek--mobil">
                    <img :src="logoPracindo" alt="Logo Pracindo" class="merek__logo merek__logo--besar" />
                    <span class="merek__nama merek__nama--besar">Pracindo Jaya Mandiri</span>
                </div>

                <h2 class="kartu__judul">{{ modeDaftar ? 'Buat Akun' : 'Login Staff' }}</h2>
                <p v-if="modeDaftar" class="kartu__sub">
                    Akun aktif setelah disetujui Supervisor.
                </p>

                <p v-if="sukses" class="sukses" role="status">{{ sukses }}</p>

                <!-- ── mode LOGIN ─────────────────────────────── -->
                <form v-if="!modeDaftar" class="form" @submit.prevent="handleLogin">
                    <input ref="isianPertama" v-model="form.identifier" type="text" class="isian"
                        placeholder="Username atau email" autocomplete="username" required :disabled="sedangProses" />

                    <div class="sandi">
                        <input v-model="form.password" :type="showPassword ? 'text' : 'password'"
                            class="isian isian--sandi" placeholder="Kata Sandi" autocomplete="current-password" required
                            :disabled="sedangProses" />
                        <button type="button" class="sandi__mata"
                            :aria-label="showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'"
                            @click="showPassword = !showPassword">
                            <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                        </button>
                    </div>

                    <p v-if="pesan" class="galat" role="alert">{{ pesan }}</p>

                    <button type="submit" class="tombol" :disabled="sedangProses">
                        <i v-if="sedangProses" class="pi pi-spin pi-spinner"></i>
                        {{ sedangProses ? 'Memeriksa...' : 'Login' }}
                    </button>
                </form>

                <!-- ── mode DAFTAR ────────────────────────────── -->
                <form v-else class="form" @submit.prevent="handleDaftar">
                    <input v-model="daftarForm.nama_lengkap" type="text" class="isian" placeholder="Nama lengkap"
                        autocomplete="name" required :disabled="sedangProses" />

                    <input v-model="daftarForm.username" type="text" class="isian" placeholder="Username pilihan"
                        autocomplete="username" required :disabled="sedangProses" />

                    <input v-model="daftarForm.email" type="email" class="isian" placeholder="Alamat email resmi"
                        autocomplete="email" required :disabled="sedangProses" />

                    <!-- Field Entitas dan Jabatan telah dihapus -->

                    <input v-model="daftarForm.telepon" type="tel" class="isian" placeholder="Nomor telepon (opsional)"
                        autocomplete="tel" :disabled="sedangProses" />

                    <input v-model="daftarForm.password" type="password" class="isian" placeholder="Kata sandi baru"
                        autocomplete="new-password" required :disabled="sedangProses" />

                    <input v-model="daftarForm.password2" type="password" class="isian" placeholder="Ulangi kata sandi"
                        autocomplete="new-password" required :disabled="sedangProses" />

                    <p v-if="pesan" class="galat" role="alert">{{ pesan }}</p>

                    <button type="submit" class="tombol" :disabled="sedangProses">
                        <i v-if="sedangProses" class="pi pi-spin pi-spinner"></i>
                        {{ sedangProses ? 'Memproses...' : 'Ajukan Pendaftaran' }}
                    </button>
                </form>

                <div class="pisah"></div>

                <button type="button" class="tombol tombol--kedua" @click="gantiMode">
                    {{ modeDaftar ? 'Sudah punya akun? Masuk' : 'Buat akun baru' }}
                </button>

                <p class="catatan">
                    <template v-if="modeDaftar">
                        Wewenang (role) ditetapkan Supervisor, bukan dipilih sendiri.
                    </template>
                    <template v-else>
                        Satu sesi aktif per akun — masuk di perangkat lain akan menutup sesi ini.
                    </template>
                </p>
            </div>

            <p class="kaki">
                <i class="pi pi-shield"></i> Pracindo Central Hub
            </p>
        </main>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

import logoPracindo from '@/assets/logo_pt.svg'
import ilustrationImg from '@/assets/ilustration.jpg'

const route = useRoute()
const router = useRouter()

// Fungsi muatEntitas dihapus dari destrukturisasi karena sudah tidak dipakai
const { login, daftar, sedangProses } = useAuth()

const form = reactive({ identifier: '', password: '' })

// State daftarForm dibersihkan dari 'akun' dan 'jabatan'
const daftarForm = reactive({
    nama_lengkap: '', username: '', email: '',
    telepon: '', password: '', password2: '',
})

const modeDaftar = ref(false)
const showPassword = ref(false)
const pesan = ref('')
const sukses = ref('')
const isianPertama = ref(null)

onMounted(() => isianPertama.value?.focus())

const gantiMode = async () => {
    modeDaftar.value = !modeDaftar.value
    pesan.value = ''
    sukses.value = ''
    // Logika pemuatan entitas dari API dihapus
}

const handleDaftar = async () => {
    pesan.value = ''
    sukses.value = ''

    const hasil = await daftar({ ...daftarForm })

    if (!hasil.success) {
        pesan.value = hasil.message
        return
    }

    modeDaftar.value = false
    sukses.value = 'Pendaftaran terkirim. Akun bisa dipakai setelah disetujui Supervisor.'
    form.identifier = daftarForm.username

    // Reset form pendaftaran
    Object.assign(daftarForm, {
        nama_lengkap: '', username: '', email: '',
        telepon: '', password: '', password2: '',
    })
}

const handleLogin = async () => {
    pesan.value = ''
    sukses.value = ''
    const hasil = await login(form.identifier.trim(), form.password)

    if (!hasil.success) {
        pesan.value = hasil.message
        form.password = ''
        return
    }

    const lanjut = route.query.lanjut
    router.push(typeof lanjut === 'string' && lanjut.startsWith('/') ? lanjut : '/')
}
</script>

<style scoped>
/* Bagian CSS tidak diubah karena format tata letak grid dan flex sudah dinamis */
.masuk {
    --teal: #0d9488;
    --teal-tua: #0f766e;
    --teal-muda: #14b8a6;
    --abu-900: #0f172a;
    --abu-600: #475569;
    --abu-400: #94a3b8;
    --abu-200: #e2e8f0;
    --abu-50: #f8fafc;

    display: flex;
    min-height: 100vh;
    width: 100%;
    background: #fff;
    color: #1e293b;
    overflow: hidden;
}

.kiri {
    display: none;
    flex-direction: column;
    justify-content: center;
    position: relative;
    width: 55%;
    padding: 4rem;
    border-right: 1px solid var(--abu-200);
}

.merek {
    display: flex;
    align-items: center;
    gap: .75rem;
}

.kiri .merek {
    position: absolute;
    top: 3rem;
    left: 4rem;
}

.merek__logo {
    width: 4rem;
    height: 4rem;
    padding: .25rem;
    object-fit: contain;
    border: 1px solid var(--abu-200);
    border-radius: .75rem;
}

.merek__nama {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -.01em;
    color: var(--teal-tua);
}

.kiri__isi {
    width: 100%;
    margin-top: 2rem;
}

.tagline {
    margin: 0 0 1rem;
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -.02em;
    color: var(--abu-900);
}

.tagline__aksen {
    color: var(--teal);
}

.tagline__sub {
    max-width: 36rem;
    margin: 0 0 2rem;
    padding-right: 2rem;
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.65;
    color: var(--abu-600);
}

.ilustrasi {
    width: 100%;
    max-width: 700px;
    aspect-ratio: 21 / 10;
    object-fit: contain;
    object-position: left;
    border-radius: .75rem;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / .07));
}

.kanan {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 2rem;
    background: var(--abu-50);
}

.kartu {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    background: #fff;
    border: 1px solid var(--abu-200);
    border-radius: 1rem;
    box-shadow: 0 8px 30px rgb(0 0 0 / .08);
    animation: munculHalus .3s ease-out;
}

.merek--mobil {
    flex-direction: column;
    gap: .75rem;
    margin-bottom: 2rem;
}

.merek__logo--besar {
    width: 5rem;
    height: 5rem;
    padding: .375rem;
}

.merek__nama--besar {
    font-size: 1.5rem;
    color: var(--teal);
}

.kartu__judul {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    color: #1e293b;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.isian {
    width: 100%;
    padding: .875rem 1rem;
    font-family: inherit;
    font-size: .9375rem;
    color: #1e293b;
    background: rgb(248 250 252 / .5);
    border: 1px solid #cbd5e1;
    border-radius: .75rem;
    transition: border-color .15s, box-shadow .15s;
}

.isian::placeholder {
    color: var(--abu-400);
}

.isian:focus {
    outline: none;
    border-color: var(--teal-muda);
    box-shadow: 0 0 0 2px rgb(20 184 166 / .35);
}

.isian:disabled {
    opacity: .6;
}

.sandi {
    position: relative;
}

.isian--sandi {
    padding-right: 3rem;
}

.sandi__mata {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    font-size: 1.125rem;
    color: var(--abu-400);
    background: none;
    border: none;
    cursor: pointer;
}

.sandi__mata:hover {
    color: var(--abu-600);
}

.galat {
    margin: 0;
    padding: .75rem 1rem;
    font-size: .875rem;
    line-height: 1.5;
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fee2e2;
    border-radius: .75rem;
    white-space: pre-line;
}

.tombol {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    width: 100%;
    margin-top: .5rem;
    padding: .875rem 1rem;
    font-family: inherit;
    font-size: 1.0625rem;
    font-weight: 700;
    color: #fff;
    background: var(--teal);
    border: none;
    border-radius: .75rem;
    box-shadow: 0 1px 2px rgb(0 0 0 / .05);
    cursor: pointer;
    transition: background-color .15s;
}

.tombol:hover:not(:disabled) {
    background: var(--teal-tua);
}

.tombol:disabled {
    opacity: .7;
    cursor: default;
}

.kartu__sub {
    margin: -1rem 0 1.5rem;
    font-size: .8125rem;
    text-align: center;
    color: var(--abu-400);
}

.sukses {
    margin: 0 0 1rem;
    padding: .75rem 1rem;
    font-size: .875rem;
    line-height: 1.5;
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #d1fae5;
    border-radius: .75rem;
}

.tombol--kedua {
    margin-top: 0;
    font-size: 1rem;
    color: #fff;
    background: #1e293b;
}

.tombol--kedua:hover:not(:disabled) {
    background: #0f172a;
}

.pisah {
    margin: 1.5rem 0 1.25rem;
    border-bottom: 1px solid var(--abu-200);
}

.catatan {
    margin: 1.25rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--abu-200);
    font-size: .75rem;
    line-height: 1.6;
    color: var(--abu-400);
}

.kaki {
    position: absolute;
    bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .375rem;
    margin: 0;
    font-size: .875rem;
    font-weight: 500;
    color: var(--abu-400);
}

.kaki .pi {
    font-size: .75rem;
}

@keyframes munculHalus {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .kartu {
        animation: none;
    }
}

@media (min-width: 1024px) {
    .kiri {
        display: flex;
    }

    .kanan {
        width: 45%;
        background: #fff;
    }

    .merek--mobil {
        display: none;
    }
}

@media (min-width: 1280px) {
    .kiri {
        padding: 6rem;
    }

    .kiri .merek {
        left: 6rem;
    }
}
</style>