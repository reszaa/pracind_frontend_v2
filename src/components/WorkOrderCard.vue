<!--
  components/WorkOrderCard.vue
  ============================
  Dipakai di dashboard dan (nanti) di halaman work order penuh.

  Tombol approve hanya muncul untuk staf yang DI-TAG — backend juga
  menegakkan ini, jadi menyembunyikan tombol murni soal kejelasan.
  Satu approval menutup WO untuk semua yang ditag.
-->
<template>
    <article class="wo" :class="{ 'wo--telat': wo.terlambat }">
        <div class="wo__atas">
            <span class="wo__nomor">{{ wo.nomor }}</span>
            <span v-if="wo.terlambat" class="wo__telat">Lewat tenggat</span>
            <span v-else-if="tenggat" class="wo__tempo">{{ tenggat }}</span>
        </div>

        <h3 class="wo__judul">{{ wo.judul }}</h3>
        <p v-if="wo.deskripsi" class="wo__desk">{{ wo.deskripsi }}</p>

        <div class="wo__bawah">
            <div class="wo__orang">
                <span v-for="p in wo.penugasan" :key="p.id" class="wo__tag"
                    :class="{ 'wo__tag--saya': p.staff === staffId }">{{ p.staff_nama }}</span>
            </div>

            <button v-if="bisaApprove" class="wo__ok" :disabled="sibuk" @click="$emit('approve', wo)">{{ sibuk ?
                'Menyimpan' : 'Sudah dikerjakan' }}</button>
        </div>
    </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    wo: { type: Object, required: true },
    staffId: { type: Number, default: null },
    sibuk: { type: Boolean, default: false },
})
defineEmits(['approve'])

const bisaApprove = computed(() =>
    !props.wo.selesai && props.wo.penugasan?.some(p => p.staff === props.staffId),
)

const tenggat = computed(() => {
    if (!props.wo.deadline) return ''
    const d = new Date(props.wo.deadline)
    const jam = Math.round((d - Date.now()) / 3_600_000)
    if (jam < 0) return ''
    if (jam < 24) return `${jam} jam lagi`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
})
</script>

<style scoped>
.wo {
    background: var(--panel);
    border: 1px solid var(--garis);
    border-left: 3px solid var(--garis);
    border-radius: var(--lengkung-kecil);
    padding: 1.15rem;
    transition: border-color .16s ease;
}

.wo:hover {
    border-color: var(--garis-tegas);
}

.wo--telat {
    border-left-color: var(--merah);
}

.wo__atas {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: .45rem;
}

.wo__nomor {
    font-size: .6875rem;
    font-weight: 600;
    letter-spacing: .04em;
    color: var(--redup-2);
}

.wo__telat {
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--merah);
}

.wo__tempo {
    font-size: .6875rem;
    color: var(--redup);
}

.wo__judul {
    margin: 0 0 .35rem;
    font-size: .9375rem;
    font-weight: 600;
    line-height: 1.4;
}

.wo__desk {
    margin: 0;
    font-size: .8125rem;
    color: var(--redup);
    line-height: 1.5;
}

.wo__bawah {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
}

.wo__orang {
    display: flex;
    gap: .3rem;
    flex-wrap: wrap;
}

.wo__tag {
    font-size: .6875rem;
    color: var(--redup);
    background: var(--latar);
    padding: .15rem .45rem;
    border-radius: 5px;
}

.wo__tag--saya {
    color: var(--teks);
    font-weight: 500;
}

.wo__ok {
    font-family: inherit;
    font-size: .75rem;
    font-weight: 600;
    color: #fff;
    background: var(--hijau);
    border: none;
    padding: .45rem .8rem;
    border-radius: var(--lengkung-kecil);
    cursor: pointer;
    transition: opacity .15s ease;
}

.wo__ok:hover:not(:disabled) {
    opacity: .88;
}

.wo__ok:disabled {
    opacity: .5;
    cursor: default;
}
</style>