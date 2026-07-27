<template>
  <div class="wo-panel">
    <!--   kepala   -->
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

    <!--   form buat tugas   -->
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
            <input v-model="draf.deadline" type="date" />
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

    <div v-if="isLoading && !mading.length" class="memuat">
      <span class="memuat__garis"></span> Membaca papan tugas
    </div>

    <TransitionGroup v-else-if="mading.length" name="kartu" tag="div" class="daftar">
      <WorkOrderCard v-for="wo in mading" :key="wo.id" :wo="wo" :staffId="staffId" :sibuk="sedangApprove === wo.id"
        @approve="setujui" />
    </TransitionGroup>

    <div v-else class="kosong">
      <p class="kosong__pesan">Papan kosong.</p>
      <p class="kosong__petunjuk">
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useWorkOrder } from '@/features/work-order/composables/useWorkOrder'
import { useAuth } from '@/composables/useAuth'

// [FIX] Import komponen WorkOrderCard
import WorkOrderCard from '@/components/WorkOrderCard.vue'

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
    deadline: draf.deadline ? draf.deadline : null,
  })

  if (hasil.success) batal()
  else pesanForm.value = hasil.message
}
const setujui = async (wo) => {
  const hasil = await approveWO(wo)
  if (!hasil.success) pesanForm.value = hasil.message
}
</script>

<style scoped>
.wo-panel {
  /* Hapus variabel dark mode, gunakan fallback warna terang modern */
  --latar: var(--global-latar, #F8FAFC);
  --panel: var(--global-panel, #FFFFFF);
  --panel-terang: var(--global-panel-terang, #F1F5F9);
  --garis: var(--global-garis, #E2E8F0);
  --garis-tegas: var(--global-garis-tegas, #CBD5E1);
  --teks: var(--global-teks, #0F172A);
  --redup: var(--global-redup, #64748B);
  --redup-2: var(--global-redup-2, #94A3B8);
  --merah: var(--global-merah, #EF4444);
  --kuning: var(--global-kuning, #F59E0B);
  --hijau: var(--global-hijau, #10B981);
  --biru: var(--global-biru, #3B82F6);

  background: var(--latar);
  color: var(--teks);
  min-height: 100vh;
  padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
  font-family: 'Inter', system-ui, sans-serif;
}

.stensil {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--biru);
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
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--teks);
}

.panel__judul span {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--redup);
  margin-left: 0.5rem;
}

.panel__telat {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--merah);
  background: #FEF2F2;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  display: inline-block;
}

/* tombol */
.tombol-utama {
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #FFFFFF;
  background: var(--biru);
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tombol-utama:hover:not(:disabled) {
  background: #2563EB;
}

.tombol-utama:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tombol-sepi {
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--teks);
  background: #FFFFFF;
  border: 1px solid var(--garis-tegas);
  border-radius: 6px;
  padding: 0.6rem 1.1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tombol-sepi:hover {
  background: var(--latar);
}

/* form */
.form {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--garis);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.form__baris {
  margin-bottom: 1.25rem;
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
  gap: 0.5rem;
  border: none;
  padding: 0;
  margin: 0;
}

.isian--lebar {
  width: 100%;
}

.isian__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--teks);
  padding: 0;
}

.isian__label em {
  font-style: normal;
  font-weight: 400;
  color: var(--redup);
  margin-left: 0.25rem;
}

.isian input,
.isian textarea {
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--teks);
  background: var(--panel);
  border: 1px solid var(--garis-tegas);
  border-radius: 6px;
  padding: 0.65rem 0.75rem;
  width: 100%;
  resize: vertical;
  transition: border-color 0.15s;
}

.isian input:focus,
.isian textarea:focus {
  outline: none;
  border-color: var(--biru);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.isian input::placeholder,
.isian textarea::placeholder {
  color: var(--redup-2);
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
  font-weight: 500;
  color: var(--teks);
  background: var(--panel);
  border: 1px solid var(--garis-tegas);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.staf small {
  display: block;
  font-size: 0.6875rem;
  color: var(--redup);
  font-weight: 400;
  margin-top: 0.15rem;
}

.staf:hover {
  border-color: var(--biru);
}

.staf--pilih {
  color: var(--biru);
  background: #EFF6FF;
  border-color: var(--biru);
}

.form__galat {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: #B91C1C;
  background: #FEF2F2;
  padding: 0.75rem;
  border-radius: 6px;
}

.form__aksi {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--garis);
}

/* daftar */
.daftar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

/* kosong & memuat */
.kosong {
  padding: 2.5rem 2rem;
  background: var(--panel);
  border: 1px dashed var(--garis-tegas);
  border-radius: 12px;
  margin-top: 1.5rem;
  text-align: center;
}

.kosong__pesan {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--teks);
}

.kosong__petunjuk {
  margin: 0.5rem 0 0;
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
  border-radius: 2px;
}

.memuat__garis::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--biru);
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
  padding-block: 0;
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
</style>