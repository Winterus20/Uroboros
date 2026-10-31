<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { DecimalSource } from '../core/math'
import type { ChallengeRow } from '../models/number'
import SectionHeader from './ui/SectionHeader.vue'
import ProgressBar from './ui/ProgressBar.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

/**
 * 8 mücadele (ADR-0086). Giriş bir SIFIRLAMADIR: sayı 10'a, halkalar 0'a döner,
 * kilitler yalnız Fingers'ta kalır; boost sayısı ve tamamlanmış ödüller korunur.
 * Hedefler mutlaktır ve sıra zorunludur: yalnız store'un enterable dediği satır girilir.
 *
 * Satır dili zincir tablosuyla aynıdır (ADR-0085): 1px çizgili satırlar, mono veri,
 * vurgu yalnız eyleme açık durumda (Enter) ve aktif satırda.
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

function progressTone(row: ChallengeRow): 'rung' | 'dim' {
  return row.status === 'completed' ? 'dim' : 'rung'
}

/**
 * Sıra zorunludur (ADR-0086 §5): yalnız store'un enterable dediği satır girilebilir.
 * Sırası gelmemiş açık satır nedenini yazar — "Open" deyip ölü düğme göstermek
 * mekanik hakkında yalan olurdu (V4).
 */
function queueLabel(row: ChallengeRow): string {
  if (activeId.value) return 'One at a time'
  const index = rows.value.findIndex((item) => item.id === row.id)
  const previous = index > 0 ? rows.value[index - 1] : null
  return previous ? 'After ' + previous.id : 'Locked'
}

/**
 * Giriş geri alınamaz: koşu sıfırlanır ve giriş öncesi hâl geri gelmez.
 * Onay diyaloğu bunu tek tek yazar; ayar kapalıysa eylem doğrudan çalışır.
 */
const pending = ref<ChallengeRow | null>(null)
const dialogOpen = computed(() => pending.value !== null)

function requestEnter(row: ChallengeRow): void {
  if (!row.enterable) return
  if (!store.settings.confirmDialogs) {
    store.enterChallenge(row.id)
    return
  }
  pending.value = row
}

function confirmEnter(): void {
  const row = pending.value
  pending.value = null
  if (row) store.enterChallenge(row.id)
}
</script>

<template>
  <section class="challenges" aria-label="Challenges">
    <SectionHeader
      title="Challenges"
      description="One at a time, in order. Entering resets the number to 10 and the chain to 0; unlocks return to Fingers only. Boosts and completed rewards are kept."
    >
      <span class="challenges__note data">{{ doneCount }} / {{ rows.length }} done</span>
    </SectionHeader>

    <table class="dt ch__table">
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">CHALLENGE</th>
          <th scope="col">GOAL</th>
          <th scope="col">PROGRESS</th>
          <th scope="col" class="r">STATUS</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="ch"
          :class="'ch--' + row.status"
        >
          <td class="dt__idx ch__id">{{ row.id }}</td>

          <td class="ch__main">
            <span class="dt__name ch__ring">{{ row.ringName }}</span>
            <!-- Ceza ve ödül: sayısal etiket şaka yapmaz (V4), metin doğrudan core'dan gelir. -->
            <span class="ch__terms data">
              <span class="ch__penalty">{{ row.penaltyLabel }}</span>
              <span class="ch__reward">{{ row.rewardLabel }}</span>
            </span>
          </td>

          <td class="data ch__goal">{{ asGoalText(row.goal) }}</td>

          <td class="ch__prog">
            <span class="ch__prog-inner">
              <ProgressBar class="ch__bar" :value="row.progress" :tone="progressTone(row)" :label="row.id + ' progress'" />
              <span class="data ch__pct">{{ percentText(row.progress) }}</span>
            </span>
          </td>

          <td class="r ch__side">
            <button
              v-if="row.enterable"
              type="button"
              class="btn btn--accent ch__enter"
              :aria-label="'Enter ' + row.id + ', ' + row.ringName + '. Resets the run.'"
              @click="requestEnter(row)"
            >
              Enter
            </button>
            <span v-else-if="row.status === 'available'" class="ch__state data">
              {{ queueLabel(row) }}
            </span>
            <span v-else-if="row.status === 'active'" class="pill pill--accent">
              {{ statusLabel(row.status) }}
            </span>
            <span v-else-if="row.status === 'completed'" class="ch__state ch__state--done data">
              <Check :size="13" :stroke-width="1.8" aria-hidden="true" />
              {{ statusLabel(row.status) }}
            </span>
            <!--
              Kilitli satır gerekçesini yazar (zincir tablosundaki "N more …" ile aynı dil):
              eşik oyuncunun notasyonunda, sayısal etiket şaka yapmaz (V4).
            -->
            <span v-else class="ch__state ch__state--locked data">
              {{ 'Unlocks at ' + row.unlockText }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <ConfirmDialog
      v-if="pending"
      :open="dialogOpen"
      :title="'Enter ' + pending.id + '?'"
      confirm-label="Enter"
      tone="danger"
      @cancel="pending = null"
      @confirm="confirmEnter"
    >
      <p><strong>{{ pending.id }} · {{ pending.ringName }}</strong> — {{ pending.penaltyLabel }}</p>
      <ul>
        <li>Number resets to <strong>10</strong>; every ring returns to <strong>0</strong>; unlocks return to <strong>Fingers</strong> only.</li>
        <li>Boost count and completed challenge rewards are kept.</li>
        <li>Goal: <strong>{{ pending.goalText }}</strong>. Reward: {{ pending.rewardLabel }}</li>
        <li>Your run before entry is not restored.</li>
      </ul>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.challenges__note { font-size: 11px; color: var(--pn-text-dim); }

.ch td { height: 64px; padding-top: 10px; padding-bottom: 10px; }
.ch__id { color: var(--pn-text-dim); }
.ch__main { min-width: 0; }
.ch__ring { display: block; }
.ch__terms {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
}
.ch__penalty { color: var(--pn-text-dim); }
.ch__reward { color: var(--pn-text); }
.ch__goal { white-space: nowrap; color: var(--pn-text); }
.ch__prog { width: 150px; }
.ch__prog-inner { display: flex; align-items: center; gap: 10px; }
.ch__bar { flex: 1 1 auto; min-width: 48px; }
.ch__pct { min-width: 36px; text-align: right; font-size: 12px; color: var(--pn-text); }
.ch__side { width: 150px; white-space: nowrap; }
.ch__enter { min-width: 76px; }

.ch__state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--pn-text-dim);
}
.ch__state--done { color: var(--pn-text-dim); }
.ch__state--locked { color: var(--pn-text-dim); }

/* Aktif satır: zemin bir kat yukarıda + sol vurgu çizgisi (durum; eylem değil). */
.ch--active td { background: var(--pn-s1); }
.ch--active td:first-child { box-shadow: inset 2px 0 0 var(--pn-rung); }

/* Kilitli satır geri çekilir: ad/sıra soluk; gerekçe ve şartlar okunur tonda kalır. */
.ch--locked .ch__ring,
.ch--locked .ch__id,
.ch--locked .ch__goal,
.ch--locked .ch__pct { color: var(--pn-text-faint); }
.ch--locked .ch__reward { color: var(--pn-text-dim); }

/* Tamamlanmış satır geri çekilir: ödül kalıcı, satır artık okunacak bir şey değil. */
.ch--completed .ch__ring,
.ch--completed .ch__goal { color: var(--pn-text-dim); }

/*
 * ≤ 900 px: satır ızgaraya katlanır:
 *   [id] [halka       ] [durum]
 *   [id] [şartlar               ]
 *   [id] [hedef] [ilerleme      ]
 */
@media (max-width: 900px) {
  .ch__table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .ch__table,
  .ch__table tbody { display: block; }
  .ch__table tr.ch {
    display: grid;
    grid-template-columns: 28px auto minmax(0, 1fr) auto;
    grid-template-areas:
      'id main main side'
      'id goal prog prog';
    align-items: center;
    column-gap: 10px;
    row-gap: 8px;
    padding: 12px 0;
    border-top: 1px solid var(--pn-line);
  }
  .ch__table tbody tr.ch:last-child { border-bottom: 1px solid var(--pn-line); }
  .ch__table tr.ch td {
    display: block;
    width: auto;
    height: auto;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  .ch__table tr.ch--active { box-shadow: inset 2px 0 0 var(--pn-rung); background: var(--pn-s1); }
  .ch__id { grid-area: id; align-self: start; padding-left: 6px !important; }
  .ch__main { grid-area: main; }
  .ch__ring { font-size: 13px; }
  .ch__terms { font-size: 10px; }
  .ch__side { grid-area: side; align-self: start; }
  .ch__goal { grid-area: goal; font-size: 12px; }
  .ch__prog { grid-area: prog; }
  .ch__enter { height: 28px; min-width: 64px; }
}
</style>
