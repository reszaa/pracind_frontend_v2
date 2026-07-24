<!--
  src/features/logistic/views/Armada.vue
  =======================================
  Armada & sopir. Status sopir DITURUNKAN dari surat jalan aktifnya —
  tidak ada field status yang disimpan terpisah, jadi tidak bisa basi
  (keputusan desain #2, lihat useLogistic / mock/logistikData.js).
-->
<template>
    <div>
        <header class="kepala">
            <div>
                <p class="remah">
                    <router-link to="/">Dashboard</router-link> ›
                    <router-link to="/logistic">Pengiriman</router-link> › Armada
                </p>
                <h1 class="judul">Armada &amp; sopir</h1>
                <p class="sub">
                    {{ sibuk.length }} dari {{ kurirStatus.length }} sopir sedang di jalan.
                </p>
            </div>
        </header>

        <LoadingBar v-if="isLoading" pesan="Membaca data armada" />

        <div v-else-if="kurirStatus.length" class="kisi">
            <article v-for="k in kurirStatus" :key="k.id" class="kurir"
                :class="{ 'kurir--jalan': k.status === 'DALAM_PERJALANAN' }">
                <div class="kurir__atas">
                    <div>
                        <p class="kurir__nama">{{ k.nama }}</p>
                        <p class="kurir__kontak">{{ k.telepon }}</p>
                    </div>
                    <span class="lencana" :class="k.status === 'DALAM_PERJALANAN' ? 'lencana--jalan' : 'lencana--siap'">
                        {{ k.status === 'DALAM_PERJALANAN' ? 'Di jalan' : 'Tersedia' }}
                    </span>
                </div>

                <p class="kurir__kendaraan">
                    {{ k.kendaraan.jenis }} · {{ k.kendaraan.plat }}
                </p>

                <router-link v-if="k.sj_aktif" to="/logistic" class="kurir__sj">
                    {{ k.sj_aktif.nomor }}
                    <small>{{ k.sj_aktif.customer_detail?.nama }} · berangkat {{ jam(k.sj_aktif.berangkat_pada) }}</small>
                </router-link>
                <p v-else class="kurir__kosong">Tidak ada kiriman berjalan.</p>
            </article>
        </div>

        <EmptyState v-else pesan="Belum ada kurir terdaftar." />

        <p class="catatan">
            Status di atas mengikuti surat jalan: sopir dianggap "di jalan" selama
            punya SJ berstatus dalam perjalanan, dan kembali "tersedia" begitu
            kirimannya dikonfirmasi sampai di layar Pantau kiriman.
        </p>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useLogistic } from '@/features/logistic/composables/useLogistic'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBar from '@/components/ui/LoadingBar.vue'

const { kurirStatus, isLoading, muat } = useLogistic()

onMounted(muat)

const sibuk = computed(() =>
    kurirStatus.value.filter(k => k.status === 'DALAM_PERJALANAN'),
)

const jam = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.kepala { margin-bottom: 1.5rem; }
.remah { margin: 0 0 .3rem; font-size: .75rem; color: var(--redup-2); }
.remah a { color: var(--redup); text-decoration: none; }
.remah a:hover { color: var(--teks); text-decoration: underline; }
.judul { margin: 0; font-size: 1.625rem; font-weight: 700; letter-spacing: -.02em; }
.sub { margin: .3rem 0 0; font-size: .875rem; color: var(--redup); }

.kisi { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 1rem; }

.kurir { background: var(--panel); border: 1px solid var(--garis); border-radius: var(--lengkung); padding: 1.15rem 1.25rem; }
.kurir--jalan { border-color: var(--biru); }

.kurir__atas { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.kurir__nama { margin: 0; font-size: 1rem; font-weight: 700; }
.kurir__kontak { margin: .15rem 0 0; font-size: .75rem; color: var(--redup); }
.kurir__kendaraan { margin: .5rem 0 0; font-size: .8125rem; color: var(--teks-2); }

.lencana { font-size: .625rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 5px; flex-shrink: 0; }
.lencana--jalan { color: var(--biru); background: var(--biru-latar); }
.lencana--siap { color: var(--hijau); background: var(--hijau-latar); }

.kurir__sj {
    display: block; margin-top: .85rem; padding: .55rem .7rem;
    font-size: .8125rem; font-weight: 600; color: var(--teks);
    background: var(--biru-latar); border-radius: var(--lengkung-kecil);
    text-decoration: none;
}
.kurir__sj small { display: block; font-weight: 400; color: var(--redup); margin-top: .1rem; }
.kurir__sj:hover { outline: 1px solid var(--biru); }

.kurir__kosong { margin: .85rem 0 0; font-size: .8125rem; color: var(--redup-2); }

.catatan { margin: 1.5rem 0 0; font-size: .8125rem; color: var(--redup-2); max-width: 40rem; line-height: 1.5; }
</style>
