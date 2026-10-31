<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { DecimalSource } from '../core/math'

/**
 * 8 mücadele (contract §1/§6). Mücadele bir sıfırlama değil, koşunun üstüne binen
 * kısıttır: girişte sayı/halkalar blok çarpanı korunur, ceza anında biner.
 *
 * Satır dili zincir listesiyle aynıdır (G3): kutu yok, yalnız 1px hairline,
 * hiyerarşi punto + kontrast + boşluk. Basamak rengi buraya gelmez (§2.2).
 */
const store = useGameStore()

const rows = computed(() => store.challengeRows)

/** Başlıktaki sayaç: tamamlanan / toplam (8 sabit, türetilmiş). */
const doneCount = computed(() => rows.value.filter((row) => row.status === 'completed').length)

/**
 * Aynı anda tek mücadele açık olabilir (contract §0: cezalar stacklenmez).
 * Bir mücadele aktifken diğer açık satırlar "Open" yazar, "Enter" düğmesi basmaz:
 * ölü düğme göstermek mekanik hakkında yalan olurdu (V4).
 */
const activeId = computed(() => {
  const active = rows.value.find((row) => row.status === 'active')
  return active ? active.id : null
})

/** Hedef metni: getter biçimlenmiş metin verirse aynen, Decimal verirse aynı notasyonda. */
function asGoalText(goal: DecimalSource | string): string {
  if (typeof goal === 'string') return goal
  return format(goal, 2, store.settings.notation)
}

/** Yüzde: 0-100 aralığına kırpılır, tam sayı okunur (plan §6). */
function percentText(progress: number): string {
  const value = Number(progress)
  if (!Number.isFinite(value)) return '0%'
  return Math.floor(Math.min(100, Math.max(0, value))) + '%'
}

/** Durum sözcüğü her zaman yazıyla da vardır: renk tek başına bilgi taşımaz (§8.4). */
function statusLabel(status: string): string {
  if (status === 'locked') return 'Locked'
  if (status === 'available') return 'Open'
  if (status === 'active') return 'Active'
  if (status === 'completed') return 'Completed'
  return status
}

function enter(id: string): void {
  store.enterChallenge(id)
}
</script>

<template>
  <section class="challenges" aria-label="Challenges">
    <header class="challenges__head">
      <p class="challenges__title">Challenges</p>
      <p class="challenges__note data">{{ doneCount }} / {{ rows.length }} done</p>
    </header>

    <!--
      Satır düzeni: kimlik + halka adı solda, durum/eylem sağda.
      Kilitli satır gri tonda kalır (--pn-locked), gerekçe metni okunur tonda.
    -->
    <div
      v-for="row in rows"
      :key="row.id"
      class="crow"
      :class="[
        row.status === 'locked' ? 'crow--locked' : '',
        row.status === 'active' ? 'crow--active' : '',
        row.status === 'completed' ? 'crow--done' : ''
      ]"
    >
      <div class="crow__main">
        <p class="crow__name">
          <span class="crow__id data">{{ row.id }}</span>
          <span class="crow__sep" aria-hidden="true">·</span>
          <span class="crow__ring">{{ row.ringName }}</span>
        </p>

        <p class="crow__meta data">
          <span>Goal {{ asGoalText(row.goal) }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span class="crow__pct">{{ percentText(row.progress) }}</span>
        </p>

        <!-- Ceza ve ödül: sayısal etiket şaka yapmaz (V4), metin doğrudan core'dan gelir. -->
        <p class="crow__terms data">
          <span class="crow__penalty">{{ row.penaltyLabel }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span class="crow__reward">{{ row.rewardLabel }}</span>
        </p>
      </div>

      <div class="crow__side">
        <button
          v-if="row.status === 'available' && !activeId"
          type="button"
          class="crow__enter data"
          :aria-label="'Enter ' + row.id + ', ' + row.ringName"
          @click="enter(row.id)"
        >
          Enter
        </button>
        <span v-else-if="row.status === 'available'" class="crow__state data">
          {{ statusLabel(row.status) }}
        </span>
        <span v-else-if="row.status === 'active'" class="crow__state crow__state--active data">
          {{ statusLabel(row.status) }}
        </span>
        <!--
          Tamamlanma işareti bir glif, ikon değil: dili metinle aynı (Saf Sayı §5).
          Ekran okuyucu işareti okumaz; anlam zaten yanındaki sözcükte.
        -->
        <span v-else-if="row.status === 'completed'" class="crow__state crow__state--done data">
          <span class="crow__check" aria-hidden="true">✓</span>
          {{ statusLabel(row.status) }}
        </span>
        <!--
          Kilitli satır gerekçesini yazar (zincir listesindeki "N more …" ile aynı dil):
          eşik oyuncunun notasyonunda, sayısal etiket şaka yapmaz (V4).
        -->
        <span v-else class="crow__state crow__state--locked data">
          {{ 'Unlocks at ' + row.unlockText }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.challenges {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Başlık: kutu yok, 1px hairline + tipografi (G3). */
.challenges__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0 11px;
  border-top: 1px solid var(--pn-hairline);
}
.challenges__title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--pn-text-dim);
}
.challenges__note {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--pn-text-faint);
}

/* Kutu yok: her satır yalnız 1px hairline ile ayrılır (G3). */
.crow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid var(--pn-hairline);
}
.crow:last-child { border-bottom: 1px solid var(--pn-hairline); }

.crow__main { min-width: 0; }

.crow__name {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--pn-text);
}
.crow__id { font-size: 12px; letter-spacing: 0.06em; }
.crow__sep { opacity: 0.55; margin: 0 6px; }
.crow__ring { color: var(--pn-text); }

.crow__meta {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--pn-text-dim);
}
.crow__pct { color: var(--pn-text); }

/* Ceza/ödül aynı veri satırının devamı: bir ton geride (hiyerarşi kontrast ile). */
.crow__terms {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--pn-text-faint);
}
.crow__penalty { color: var(--pn-text-dim); }
.crow__reward { color: var(--pn-text-faint); }

.dot { opacity: 0.55; margin: 0 6px; }

/* Kilitli = gri + soluk; metin okunur kalır, bilgi renge bağlı değildir (§8.4). */
.crow--locked .crow__name,
.crow--locked .crow__meta,
.crow--locked .crow__terms { color: var(--pn-locked); }

/* Aktif satır: aynı hairline, bir ton güçlü — kart/rozet eklenmez (G3). */
.crow--active { border-top-color: var(--pn-hairline-strong); }
.crow--active + .crow { border-top-color: var(--pn-hairline-strong); }

/* Tamamlanmış satır geri çekilir: ödül kalıcı, satır artık okunacak bir şey değil. */
.crow--done .crow__name,
.crow--done .crow__meta { color: var(--pn-text-dim); }
.crow--done .crow__terms { color: var(--pn-text-faint); }

.crow__side {
  flex: none;
  display: flex;
  align-items: baseline;
  padding-top: 1px;
}

/* Eylem metin düğmesi: kutu yok, 1px alt çizgi (dock dili, G10). */
.crow__enter {
  appearance: none;
  border: 0;
  border-bottom: 1px solid var(--pn-hairline-strong);
  border-radius: 0;
  background: transparent;
  padding: 1px 0 2px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--pn-text);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.crow__enter:hover { border-bottom-color: var(--pn-text-dim); }

.crow__state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--pn-text-faint);
}
.crow__state--active { color: var(--pn-text); }
.crow__state--done { color: var(--pn-text-dim); }
/* Kilit gerekçesi okunur tonda kalır; kilitliliği satırın grisi zaten söyler. */
.crow__state--locked { color: var(--pn-text-dim); letter-spacing: 0.02em; }
.crow__check { flex: none; font-size: 12px; line-height: 1; }

@media (max-width: 560px) {
  .challenges { padding: 0 16px; }
  .challenges__head { gap: 10px; padding: 9px 0 10px; }
  .challenges__title { font-size: 12px; }
  .crow { gap: 12px; padding: 10px 0; }
  .crow__name { font-size: 13px; }
  .crow__meta { font-size: 11px; }
  .crow__terms { font-size: 10px; }
  .crow__enter { font-size: 11px; }
  .crow__state { font-size: 10px; }
}
</style>
