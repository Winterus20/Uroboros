<script setup lang="ts">
import { computed, useId } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'
import { Decimal } from '../core/math'
import { toMillis } from '../core/auth/cloud-conflict'
import { useFocusTrap } from '../core/focus-trap'
import { AlertTriangle, Cloud, HardDrive, Sparkles, RefreshCw } from 'lucide-vue-next'

const authStore = useAuthStore()
const gameStore = useGameStore()

const conflict = computed(() => authStore.conflictData)

function formatNumber(val: string): string {
  try {
    return format(new Decimal(val), 2, gameStore.settings.notation)
  } catch {
    return val
  }
}

function formatDate(ts: number): string {
  if (!ts) return 'Bilinmiyor'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ')'
}

const isCloudAhead = computed(() => {
  if (!conflict.value) return false
  try {
    const localNumber = new Decimal(conflict.value.localMeta.number)
    const cloudNumber = new Decimal(conflict.value.cloudMeta.number)
    return cloudNumber.gt(localNumber)
  } catch {
    return false
  }
})

function choose(choice: 'local' | 'cloud') {
  authStore.resolveConflict(choice)
}

const titleId = useId()

// Çakışma tek seferlik bir karardır: kapatma yolu yok, bu yüzden odak başlıkta tutulur
// (Escape handler'ı yok — kullanıcı bilinçli olarak bir kayıt seçmek zorunda).
const { dialogRef } = useFocusTrap(
  () => authStore.showConflictModal && conflict.value !== null,
  { focusDialog: true }
)
</script>

<template>
  <!-- ADR-0085: düz karartma (blur yok) + s1 panel, 8 px köşe, 1px çizgi, gölge/gradyan yok. -->
  <div v-if="authStore.showConflictModal && conflict" class="modal conflict">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="modal__panel conflict__panel"
    >

      <!-- Başlık Çubuğu -->
      <div class="modal__head conflict__head">
        <span class="conflict__icon" aria-hidden="true"><AlertTriangle :size="18" :stroke-width="1.6" /></span>
        <div>
          <h2 :id="titleId" class="modal__title">Bulut Kayıt Çakışması Algılandı</h2>
          <p class="conflict__sub">
            Bu cihazdaki ilerlemeniz ile buluttaki ilerleme arasında fark bulundu. Lütfen devam etmek istediğiniz kaydı seçin.
          </p>
        </div>
      </div>

      <div class="modal__body">
        <!-- İki sütunlu karşılaştırma -->
        <div class="conflict__grid">

          <!-- Sol: Bu Cihazdaki İlerleme -->
          <div class="conflict__card">
            <div>
              <div class="conflict__card-head">
                <span class="conflict__card-title">
                  <HardDrive :size="15" :stroke-width="1.6" aria-hidden="true" />
                  Bu Cihazdaki Kayıt
                </span>
                <span class="pill">Yerel</span>
              </div>

              <dl class="conflict__facts">
                <div class="conflict__fact">
                  <dt>Sayı:</dt>
                  <dd class="data conflict__num">{{ formatNumber(conflict.localMeta.number) }}</dd>
                </div>
                <div class="conflict__fact">
                  <dt>Oynama Süresi:</dt>
                  <dd class="data">{{ formatTime(conflict.localMeta.playtime) }}</dd>
                </div>
                <div class="conflict__fact">
                  <dt>Son Güncelleme:</dt>
                  <dd class="data conflict__date">{{ formatDate(conflict.localMeta.clientTimestamp) }}</dd>
                </div>
              </dl>
            </div>

            <button type="button" class="btn btn--solid btn--lg btn--block" @click="choose('local')">
              Bu Cihazdakini Sakla (Bulutu Güncelle)
            </button>
          </div>

          <!-- Sağ: Buluttaki İlerleme -->
          <div class="conflict__card" :class="{ 'conflict__card--ahead': isCloudAhead }">
            <div>
              <div class="conflict__card-head">
                <span class="conflict__card-title">
                  <Cloud :size="15" :stroke-width="1.6" aria-hidden="true" />
                  Buluttaki Kayıt
                </span>
                <span v-if="isCloudAhead" class="pill pill--accent">
                  <Sparkles :size="10" :stroke-width="1.8" aria-hidden="true" />
                  Daha İleride
                </span>
                <span v-else class="pill">Bulut</span>
              </div>

              <dl class="conflict__facts">
                <div class="conflict__fact">
                  <dt>Sayı:</dt>
                  <dd class="data conflict__num">{{ formatNumber(conflict.cloudMeta.number) }}</dd>
                </div>
                <div class="conflict__fact">
                  <dt>Oynama Süresi:</dt>
                  <dd class="data">{{ formatTime(conflict.cloudMeta.playtime) }}</dd>
                </div>
                <div class="conflict__fact">
                  <dt>Son Güncelleme:</dt>
                  <dd class="data conflict__date">
                    {{ formatDate(toMillis(conflict.cloudPayload.updatedAt) ?? conflict.cloudMeta.clientTimestamp) }}
                  </dd>
                </div>
              </dl>
            </div>

            <button type="button" class="btn btn--accent btn--lg btn--block" @click="choose('cloud')">
              <RefreshCw :size="14" :stroke-width="1.6" aria-hidden="true" />
              Buluttakini Yükle (Cihazı Güncelle)
            </button>
          </div>

        </div>

        <!-- Bilgilendirme -->
        <p class="conflict__note">
          Seçtiğiniz ilerleme aktif hale gelecektir. Yanlışlıkla yapılan seçimlerde mevcut slot yedeği yerel çöp kutusunda tutulur.
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.conflict__panel { width: min(680px, 100%); max-height: 90vh; }
.conflict__head { justify-content: flex-start; align-items: flex-start; }
.conflict__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--pn-amber-line);
  border-radius: var(--pn-r);
  background: var(--pn-amber-soft);
  color: var(--pn-amber);
}
.conflict__sub { margin: 3px 0 0; font-size: 12px; line-height: 1.5; color: var(--pn-text-dim); }

.conflict__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.conflict__card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--pn-line-strong);
  border-radius: var(--pn-r-lg);
  background: var(--pn-s2);
}
.conflict__card--ahead { border-color: var(--pn-rung-line); }
.conflict__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--pn-line);
}
.conflict__card-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--pn-text); }

.conflict__facts { display: flex; flex-direction: column; gap: 10px; margin: 14px 0 0; }
.conflict__fact { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; }
.conflict__fact dt { color: var(--pn-text-dim); }
.conflict__fact dd { margin: 0; color: var(--pn-text); }
.conflict__num { font-size: 14px; color: var(--pn-rung) !important; }
.conflict__date { font-size: 11px; color: var(--pn-text-dim) !important; }

.conflict__note { margin: 16px 0 0; font-size: 11px; line-height: 1.5; text-align: center; color: var(--pn-text-dim); }

@media (max-width: 640px) {
  .conflict__grid { grid-template-columns: 1fr; }
}
</style>
