<template>
  <div class="wo-panel">
    <!-- ── kepala ──────────────────────────────────────────── -->
    <header class="panel__kepala">
      <div>
        <p class="stensil">Papan tugas</p>
        <h1 class="panel__judul">
          {{ mading.length }}
          <span>{{ mading.length === 1 ? 'tugas' : 'tugas' }} menunggu</span>
        </h1>
        <p v-if="terlambat.length" class="panel__telat">
          {{ terlambat.length }} lewat tenggat
        </p>
      </div>

      <button class="tombol-utama" @click="formTerbuka = !formTerbuka">
        {{ formTerbuka ? 'Tutup' : 'Tugas baru' }}
      </button>
    </header>

    <!-- ── form buat tugas ─────────────────────────────────── -->
    <transition name="buka">
      <form v-if="formTerbuka" class="form" @submit.prevent="kirim">
        <div class="form__baris">
          <label class="isian isian--lebar">
            <span class="isian__label">Judul</span>
            <input v-model="draf.judul" type="text" required placeholder="Beli label untuk ruang packing" />
          </label>
        </div>

        <div class="form__baris">
          <label class="isian isian--lebar">
            <span class="isian__label">Keterangan</span>
            <textarea v-model="draf.deskripsi" rows="2" placeholder="Detail yang perlu diketahui pelaksana"></textarea>
          </label>
        </div>

        <div class="form__baris form__baris--dua">
          <label class="isian">
            <span class="isian__label">Tanggal</span>
            <input v-model="draf.tanggal" type="date" required />
          </label>
          <label class="isian">
            <span class="isian__label">Tenggat <em>opsional</em></span>
            <input v-model="draf.deadline" type="datetime-local" />
          </label>
        </div>

        <fieldset class="isian isian--lebar">
          <legend class="isian__label">Tujukan ke</legend>
          <div class="pilih-staf">
            <button v-for="s in staffList" :key="s.id" type="button" class="staf"
              :class="{ 'staf--pilih': draf.staffIds.includes(s.id) }" @click="toggleStaf(s.id)">
              {{ s.nama_lengkap }}
              <small>{{ s.jabatan }}</small>
            </button>
          </div>
          <p class="isian__bantu">
            Cukup satu orang menyetujui — tugas langsung selesai untuk semua.
          </p>
        </fieldset>

        <p v-if="pesanForm" class="form__galat">{{ pesanForm }}</p>

        <div class="form__aksi">
          <button type="button" class="tombol-sepi" @click="batal">Batal</button>
          <button type="submit" class="tombol-utama" :disabled="isLoading">
            {{ isLoading ? 'Menyimpan' : 'Terbitkan tugas' }}
          </button>
        </div>
      </form>
    </transition>

    <!-- ── daftar ──────────────────────────────────────────── -->
    <div v-if="isLoading && !mading.length" class="memuat">
      <span class="memuat__garis"></span> Membaca papan tugas
    </div>

    <TransitionGroup v-else-if="mading.length" name="kartu" tag="div" class="daftar">
      <article v-for="wo in mading" :key="wo.id" class="wo" :class="{ 'wo--telat': wo.terlambat }">
        <div class="wo__atas">
          <span class="wo__nomor">{{ wo.nomor }}</span>
          <span v-if="wo.terlambat" class="wo__telat">Lewat tenggat</span>
          <span v-else-if="labelTenggat(wo)" class="wo__tenggat">{{ labelTenggat(wo) }}</span>
        </div>

        <h2 class="wo__judul">{{ wo.judul }}</h2>
        <p v-if="wo.deskripsi" class="wo__deskripsi">{{ wo.deskripsi }}</p>

        <div class="wo__bawah">
          <div class="wo__orang">
            <span v-for="p in wo.penugasan" :key="p.id" class="wo__tag"
              :class="{ 'wo__tag--saya': p.staff === staffId }">
              {{ p.staff_nama }}
            </span>
          </div>

          <button v-if="bisaApprove(wo)" class="wo__setuju" :disabled="sedangApprove === wo.id" @click="setujui(wo)">
            {{ sedangApprove === wo.id ? 'Menyimpan' : 'Sudah dikerjakan' }}
          </button>
          <span v-else class="wo__bukan-saya">Bukan tugas kamu</span>
        </div>

        <p class="wo__dari">Dari {{ wo.dibuat_oleh_username }}</p>
      </article>
    </TransitionGroup>

    <div v-else class="kosong">
      <p class="kosong__pesan">Papan kosong.</p>
      <p class="kosong__petunjuk">
        Semua tugas yang ditujukan ke kamu sudah dikerjakan.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useWorkOrder } from '@/features/work-order/composables/useWorkOrder'
import { useAuth } from '@/composables/useAuth'

// Identitas dari sesi login (useAuth), BUKAN dari mock — supaya papan tugas
// dan dashboard menilai "tugas saya" dengan kartu yang sama.
const { accessCard: kartu } = useAuth()
const {
  mading, staffList, isLoading, sedangApprove, staffId,
  bisaApprove, terlambat,
  fetchMading, fetchStaffList, buatWO, approveWO,
} = useWorkOrder(kartu)

const formTerbuka = ref(false)
const pesanForm = ref('')

const hariIni = () => {
  const t = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return t.toISOString().slice(0, 10)
}

const draf = reactive({
  judul: '', deskripsi: '', tanggal: hariIni(), deadline: '', staffIds: [],
})

onMounted(() => {
  fetchMading()
  fetchStaffList()
})

const toggleStaf = (id) => {
  const i = draf.staffIds.indexOf(id)
  i === -1 ? draf.staffIds.push(id) : draf.staffIds.splice(i, 1)
}

const batal = () => {
  formTerbuka.value = false
  pesanForm.value = ''
  Object.assign(draf, { judul: '', deskripsi: '', tanggal: hariIni(), deadline: '', staffIds: [] })
}

const kirim = async () => {
  pesanForm.value = ''
  if (!draf.staffIds.length) {
    pesanForm.value = 'Pilih minimal satu orang yang dituju.'
    return
  }
  const hasil = await buatWO({
    judul: draf.judul,
    deskripsi: draf.deskripsi,
    staffIds: draf.staffIds,
    tanggal: draf.tanggal,
    deadline: draf.deadline ? new Date(draf.deadline).toISOString() : null,
  })
  if (hasil.success) batal()
  else pesanForm.value = hasil.message
}

const setujui = async (wo) => {
  const hasil = await approveWO(wo)
  if (!hasil.success) pesanForm.value = hasil.message
}

const labelTenggat = (wo) => {
  if (!wo.deadline) return ''
  const d = new Date(wo.deadline)
  const jam = Math.round((d - Date.now()) / 3_600_000)
  if (jam < 0) return ''
  if (jam < 24) return `${jam} jam lagi`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.wo-panel {
  --latar: #12100E;
  --panel: #1E1A17;
  --panel-terang: #262119;
  --garis: #2C2621;
  --garis-terang: #453C33;
  --teks: #F5F1E8;
  --redup: #8C8378;
  --merah: #C8102E;
  --kuning: #E8A33D;
  --hijau: #4A7C59;

  background: var(--latar);
  color: var(--teks);
  min-height: 100vh;
  padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
  font-family: 'Inter', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

.stensil {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--redup);
  margin: 0;
}

/* kepala */
.panel__kepala {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--garis);
}

.panel__judul {
  margin: 0.5rem 0 0;
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 200;
  letter-spacing: -0.02em;
  line-height: 1;
}

.panel__judul span {
  font-size: 0.9375rem;
  font-weight: 400;
  color: var(--redup);
  margin-left: 0.5rem;
}

.panel__telat {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--merah);
}

/* tombol */
.tombol-utama {
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--latar);
  background: var(--teks);
  border: none;
  padding: 0.6rem 1.1rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.tombol-utama:hover:not(:disabled) {
  opacity: 0.85;
}

.tombol-utama:disabled {
  opacity: 0.45;
  cursor: default;
}

.tombol-sepi {
  font-family: inherit;
  font-size: 0.8125rem;
  color: var(--redup);
  background: none;
  border: 1px solid var(--garis);
  padding: 0.6rem 1.1rem;
  cursor: pointer;
}

.tombol-sepi:hover {
  color: var(--teks);
  border-color: var(--garis-terang);
}

.tombol-utama:focus-visible,
.tombol-sepi:focus-visible {
  outline: 2px solid var(--kuning);
  outline-offset: 2px;
}

/* form */
.form {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--garis);
}

.form__baris {
  margin-bottom: 1.1rem;
}

.form__baris--dua {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 560px) {
  .form__baris--dua {
    grid-template-columns: 1fr;
  }
}

.isian {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: none;
  padding: 0;
  margin: 0;
}

.isian--lebar {
  width: 100%;
}

.isian__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--redup);
  padding: 0;
}

.isian__label em {
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.isian input,
.isian textarea {
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--teks);
  background: var(--latar);
  border: 1px solid var(--garis);
  padding: 0.65rem 0.75rem;
  width: 100%;
  resize: vertical;
}

.isian input:focus,
.isian textarea:focus {
  outline: none;
  border-color: var(--kuning);
}

.isian input::placeholder,
.isian textarea::placeholder {
  color: var(--redup);
}

.isian__bantu {
  margin: 0.6rem 0 0;
  font-size: 0.75rem;
  color: var(--redup);
}

.pilih-staf {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.staf {
  font-family: inherit;
  text-align: left;
  font-size: 0.8125rem;
  color: var(--redup);
  background: var(--latar);
  border: 1px solid var(--garis);
  padding: 0.5rem 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.staf small {
  display: block;
  font-size: 0.625rem;
  opacity: 0.7;
  margin-top: 0.1rem;
}

.staf:hover {
  border-color: var(--garis-terang);
  color: var(--teks);
}

.staf--pilih {
  color: var(--latar);
  background: var(--kuning);
  border-color: var(--kuning);
}

.staf:focus-visible {
  outline: 2px solid var(--kuning);
  outline-offset: 2px;
}

.form__galat {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: var(--merah);
}

.form__aksi {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
}

/* daftar */
.daftar {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 1.5rem;
}

.wo {
  padding: 1.2rem;
  background: var(--panel);
  border: 1px solid var(--garis);
  border-left: 2px solid var(--garis-terang);
  transition: background 0.18s ease;
}

.wo:hover {
  background: var(--panel-terang);
}

.wo--telat {
  border-left-color: var(--merah);
}

.wo__atas {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.55rem;
}

.wo__nomor {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--redup);
}

.wo__telat {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--merah);
}

.wo__tenggat {
  font-size: 0.6875rem;
  color: var(--redup);
}

.wo__judul {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
}

.wo__deskripsi {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--redup);
  line-height: 1.5;
}

.wo__bawah {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.9rem;
}

.wo__orang {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.wo__tag {
  font-size: 0.6875rem;
  color: var(--redup);
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--garis);
}

.wo__tag--saya {
  color: var(--teks);
  border-color: var(--garis-terang);
}

.wo__setuju {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--latar);
  background: var(--hijau);
  border: none;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.wo__setuju:hover:not(:disabled) {
  opacity: 0.85;
}

.wo__setuju:disabled {
  opacity: 0.5;
  cursor: default;
}

.wo__setuju:focus-visible {
  outline: 2px solid var(--kuning);
  outline-offset: 2px;
}

.wo__bukan-saya {
  font-size: 0.6875rem;
  color: var(--redup);
}

.wo__dari {
  margin: 0.65rem 0 0;
  font-size: 0.6875rem;
  color: var(--redup);
}

/* kosong & memuat */
.kosong {
  padding: 3rem 0 3rem 1.25rem;
  border-left: 2px solid var(--hijau);
  margin-top: 1.5rem;
}

.kosong__pesan {
  margin: 0;
  font-size: 1rem;
}

.kosong__petunjuk {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  color: var(--redup);
}

.memuat {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 3rem 0;
  color: var(--redup);
  font-size: 0.9375rem;
}

.memuat__garis {
  width: 2.5rem;
  height: 2px;
  background: var(--garis);
  overflow: hidden;
  position: relative;
}

.memuat__garis::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--kuning);
  animation: geser 1.1s ease-in-out infinite;
}

@keyframes geser {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

/* transisi */
.buka-enter-active,
.buka-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.buka-enter-from,
.buka-leave-to {
  opacity: 0;
  max-height: 0;
  margin-block: 0;
}

.buka-enter-to,
.buka-leave-from {
  opacity: 1;
  max-height: 40rem;
}

.kartu-enter-active,
.kartu-leave-active {
  transition: all 0.3s ease;
}

.kartu-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.kartu-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.kartu-move {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .memuat__garis::after {
    animation: none;
    opacity: 0.5;
  }

  .buka-enter-active,
  .buka-leave-active,
  .kartu-enter-active,
  .kartu-leave-active,
  .kartu-move {
    transition: none;
  }
}
</style>