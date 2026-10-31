<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'
import { BLOCK_SIZE, NUMBER_TUNING } from '../game/number/tuning'
import type { Decimal } from '../core/math'
import type { BuyMode, RingRow } from '../models/number'
import SectionHeader from './ui/SectionHeader.vue'
import SegmentedControl from './ui/SegmentedControl.vue'
import BuyButton from './ui/BuyButton.vue'
import BlockPips from './ui/BlockPips.vue'

const store = useGameStore()

/** E6: ekranda yukarıdan aşağı Fingers → Mathematician; üretim aşağıdan yukarı akar. */
const rows = computed(() => store.ringRows)

/**
 * Kilitli halkalardan yalnız ilk ikisi satır olarak çizilir (gerekçesiyle); daha derindekiler
 * tek bir sayaç satırında toplanır. Gizlenen bir şey yok — sayaç kaç halka kaldığını yazar,
 * yalnız henüz okunacak bir şey olmayan 6 boş satır ekranı doldurmaz.
 */
const LOCKED_PREVIEW = 2

const visibleRows = computed(() => {
  let locked = 0
  return rows.value.filter((row) => {
    if (row.unlocked) return true
    locked += 1
    return locked <= LOCKED_PREVIEW
  })
})

const hiddenLocked = computed(() => rows.value.length - visibleRows.value.length)

/**
 * AD'nin üç satın alma modu. Seçim uçucu durumdur (kayda yazılmaz, ayar değildir):
 * `store.buyMode`. `BLOCK_SIZE` = 10; etiket ondan türetilir ki ikisi ayrı düşmesin.
 */
const MODES: readonly { value: BuyMode; label: string }[] = [
  { value: 1, label: '×1' },
  { value: BLOCK_SIZE, label: '×' + BLOCK_SIZE },
  { value: 'max', label: 'Max' }
]

/**
 * Bölüm açıklaması (narrative-voice §4 "Açıklama" kanalı): yalnız mekanik bilgi. Eşik
 * sabitten okunur — tuning değişirse cümle de değişir (V4).
 */
const description = computed(
  () =>
    'Each ring feeds the one above it. Buying ' +
    NUMBER_TUNING.unlockThreshold +
    ' of a ring opens the next; every ' +
    BLOCK_SIZE +
    ' bought multiplies its output ' +
    store.blockMultText +
    '.'
)

function selectMode(mode: BuyMode): void {
  store.setBuyMode(mode)
}

/** Alım gerçekten olduysa ses çal (fiyat yetmediyse sessiz kalır). */
function buy(index: number): void {
  const before = store.rings[index].bought
  store.buyWithMode(index)
  if (store.rings[index].bought > before && store.settings.soundEnabled) sounds.playBuy(index)
}

function fmt(value: Decimal, precision = 2): string {
  return format(value, precision, store.settings.notation)
}

/** Satır sırası "01".."08": mono, sabit genişlik. */
function indexText(row: RingRow): string {
  return String(row.index + 1).padStart(2, '0')
}

/** Seçili modun satır fiyatı: ×1 tek birim, ×10 blok, Max alınabilen toplam. */
function rowCost(row: RingRow): Decimal {
  if (store.buyMode === 'max') return row.costMax
  if (store.buyMode === BLOCK_SIZE) return row.cost10
  return row.cost
}

/** Seçili modda alım mümkün mü — Max'ta alınacak adet yoksa düğme pasiftir. */
function rowAffordable(row: RingRow): boolean {
  if (!row.unlocked) return false
  if (store.buyMode === 'max') return row.maxCount > 0
  if (store.buyMode === BLOCK_SIZE) return row.affordable10
  return row.affordable
}

/**
 * Düğme dolgusu = min(1, sayı / fiyat): fiyata ne kadar yaklaşıldığının okuması (V4).
 * Logaritmik değil doğrusal — "yarısı doldu" gerçekten fiyatın yarısı demektir.
 */
function rowProgress(row: RingRow): number {
  const cost = rowCost(row)
  if (cost.lte(0)) return 1
  if (store.number.gte(cost)) return 1
  const ratio = store.number.div(cost).toNumber()
  return Number.isFinite(ratio) ? ratio : 0
}

/** Düğme etiketi: ad + mod + fiyat. Sayısal etiket şaka yapmaz (V4). */
function buyLabel(row: RingRow): string {
  const quantity = store.buyMode === 'max' ? row.maxCount : store.buyMode
  return 'Buy ' + row.name + ' ×' + quantity + ' for ' + fmt(rowCost(row))
}

/** Kilit gerekçesi yazıyla: bir önceki halkanın eşiği. Renk bilgi taşımaz (§8.4). */
function lockHint(row: RingRow): string {
  const previous = rows.value[row.index - 1]
  if (!previous) return 'locked'
  const remaining = Math.max(0, NUMBER_TUNING.unlockThreshold - store.rings[row.index - 1].bought)
  return remaining + ' more ' + previous.name
}

/**
 * Blok çarpanı (contract §0): 5.5 ** floor(bought / 10). Metin satırdan gelir —
 * biçim tek kaynakta kalır ki zincir satırı ile `blockMultText` ayrı düşmesin (V4).
 * Çarpan 1 iken (henüz blok yok) metin susar: göstergeler yalnız ilerlemeyi okur.
 */
function blockFactorText(row: RingRow): string {
  return row.blockFactor.gt(1) ? row.blockFactorText : ''
}

/**
 * Max All: tüm halkaları alır (contract §3, store.buyMaxAll).
 * Ses yalnız gerçekten alım olduysa çalar ve en derin değişen halkanın tonunu kullanır —
 * fiyat hiçbir yere yetmediyse sessiz kalır.
 */
function buyMaxAll(): void {
  const before = store.rings.map((ring) => ring.bought)
  store.buyMaxAll()
  if (!store.settings.soundEnabled) return
  let deepest = -1
  for (let i = 0; i < store.rings.length; i++) {
    if (store.rings[i].bought > before[i]) deepest = i
  }
  if (deepest >= 0) sounds.playBuy(deepest)
}
</script>

<template>
  <section class="chain" aria-label="Chain">
    <SectionHeader title="Chain" :description="description">
      <SegmentedControl
        :options="MODES"
        :model-value="store.buyMode"
        label="Buy amount"
        @update:model-value="selectMode"
      />
      <!-- Max All: seçili moddan bağımsız, tek vuruşta tüm zinciri alır — seçim değil eylem. -->
      <button
        type="button"
        class="btn"
        aria-label="Buy every affordable block across the chain"
        @click="buyMaxAll"
      >
        Max all
      </button>
    </SectionHeader>

    <table class="dt chain__table">
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Index</span></th>
          <th scope="col">RING</th>
          <th scope="col">OWNED</th>
          <th scope="col" class="col-prod">PRODUCES</th>
          <th scope="col" class="col-block">BLOCK</th>
          <th scope="col" class="r">COST</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in visibleRows" :key="row.index">
          <tr v-if="row.unlocked" class="crow">
            <td class="dt__idx c-idx">{{ indexText(row) }}</td>
            <td class="dt__name c-name">{{ row.name }}</td>
            <td class="data c-own">{{ fmt(row.amount, 0) }}</td>
            <td class="data c-prod col-prod">
              <span class="c-prod__main">{{ fmt(row.producesPerSecond) }}/s</span>
              <!-- Doğrudan katkı: halka bir altındakini beslerken sayıya da yazar (V4: veri, süs değil). -->
              <span v-if="row.addsPerSecond.gt(0)" class="c-prod__direct">+{{ fmt(row.addsPerSecond) }}/s to number</span>
            </td>
            <td class="c-block col-block">
              <BlockPips :filled="row.bought % BLOCK_SIZE" :size="BLOCK_SIZE" :text="blockFactorText(row)" />
            </td>
            <td class="r c-cost">
              <BuyButton
                :progress="rowProgress(row)"
                :ready="rowAffordable(row)"
                :label="buyLabel(row)"
                @click="buy(row.index)"
              >
                <span v-if="store.buyMode === 'max'" class="c-cost__count">×{{ row.maxCount }}</span>
                <span>{{ fmt(rowCost(row)) }}</span>
              </BuyButton>
            </td>
          </tr>
          <tr v-else class="crow crow--locked">
            <td class="dt__idx c-idx">{{ indexText(row) }}</td>
            <td class="dt__name c-name">{{ row.name }}</td>
            <td colspan="3" class="data c-lock">{{ lockHint(row) }}</td>
            <td class="r data c-cost c-cost--locked" aria-label="Locked">—</td>
          </tr>
        </template>
        <tr v-if="hiddenLocked > 0" class="crow crow--locked crow--more">
          <td class="dt__idx c-idx" aria-hidden="true"></td>
          <td colspan="5" class="data c-more">+{{ hiddenLocked }} more {{ hiddenLocked === 1 ? 'ring' : 'rings' }}, each opened by the one above</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.c-own { color: var(--pn-text); }
.c-prod { white-space: nowrap; }
.c-prod__main { display: block; color: var(--pn-text-dim); }
.c-prod__direct { display: block; margin-top: 2px; font-size: 11px; color: var(--pn-text-faint); }
.c-cost { width: 152px; }
.c-cost__count { color: var(--pn-text-dim); }
.c-cost--locked { color: var(--pn-text-faint); padding-right: 24px; }

/* Kilitli satır: ad ve sıra soluk; gerekçe bilgi taşıdığı için okunur tonda (§8 kanon). */
.crow--locked .c-name { color: var(--pn-text-faint); }
.c-lock { font-size: 12px; color: var(--pn-text-dim); }
.crow--more td { height: 44px; }
.c-more { font-size: 11px; color: var(--pn-text-faint); }

/*
 * ≤ 900 px: tablo satırı iki satırlık ızgaraya katlanır — başlık gizlenir, sütunlar alan alır:
 *   [idx] [ad     ] [sahip] [fiyat]
 *   [idx] [üretim        ] [fiyat]
 *   [idx] [blok          ] [fiyat]
 */
@media (max-width: 900px) {
  .chain__table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .chain__table,
  .chain__table tbody { display: block; }
  .chain__table tr.crow {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto 108px;
    grid-template-areas:
      'idx name own cost'
      'idx prod prod cost'
      'idx block block cost';
    align-items: center;
    column-gap: 10px;
    row-gap: 4px;
    padding: 10px 0;
    border-top: 1px solid var(--pn-line);
  }
  .chain__table tbody tr.crow:last-child { border-bottom: 1px solid var(--pn-line); }
  .chain__table tr.crow td {
    display: block;
    height: auto;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .c-idx { grid-area: idx; width: auto; align-self: start; padding-top: 2px !important; }
  .c-name { grid-area: name; font-size: 13px; }
  .c-own { grid-area: own; text-align: right; font-size: 12px; }
  .c-prod { grid-area: prod; min-width: 0; font-size: 11px; }
  .c-prod__main,
  .c-prod__direct { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-prod__direct { font-size: 10px; }
  .c-block { grid-area: block; justify-self: start; }
  .c-cost { grid-area: cost; width: auto; justify-self: end; }
  .c-cost :deep(.buy) { width: 108px; padding: 0 10px; }

  .chain__table tr.crow--locked {
    grid-template-areas: 'idx name lock cost';
    grid-template-columns: 22px auto minmax(0, 1fr) 24px;
  }
  .c-lock { grid-area: lock; text-align: right; font-size: 11px; }
  .chain__table tr.crow--more { grid-template-areas: 'idx more'; grid-template-columns: 22px minmax(0, 1fr); }
  .c-more { grid-area: more; }
}
</style>
