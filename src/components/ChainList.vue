<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'
import { BLOCK_SIZE, NUMBER_TUNING } from '../game/number/tuning'
import type { Decimal } from '../core/math'
import type { BuyMode, RingRow } from '../models/number'

const store = useGameStore()

/** E6: ekranda yukarıdan aşağı Fingers → Mathematician; üretim aşağıdan yukarı akar. */
const rows = computed(() => store.ringRows)

/**
 * AD'nin üç satın alma modu. Seçim uçucu durumdur (kayda yazılmaz, ayar değildir) ve
 * `M` kısayoluyla aynı kaynaktan okunur: `store.buyMode`.
 * `BLOCK_SIZE` = 10; etiket ondan türetilir ki ikisi ayrı düşmesin.
 */
const MODES: readonly { mode: BuyMode; label: string }[] = [
  { mode: 1, label: '×1' },
  { mode: BLOCK_SIZE, label: '×' + BLOCK_SIZE },
  { mode: 'max', label: 'Max' }
]

function selectMode(mode: BuyMode): void {
  store.setBuyMode(mode)
}

/** Alım gerçekten olduysa ses çal (fiyat yetmediyse sessiz kalır). */
function buy(index: number): void {
  const before = store.rings[index].bought
  store.buyWithMode(index)
  if (store.rings[index].bought > before && store.settings.soundEnabled) sounds.playBuy(index)
}

function costText(value: Decimal): string {
  return format(value, 2, store.settings.notation)
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

/** Düğme etiketi: ad + mod + fiyat. Sayısal etiket şaka yapmaz (V4). */
function buyLabel(row: RingRow): string {
  const quantity = store.buyMode === 'max' ? row.maxCount : store.buyMode
  return 'Buy ' + row.name + ' ×' + quantity + ' for ' + costText(rowCost(row))
}

/** Kilit gerekçesi yazıyla: bir önceki halkanın eşiği. Renk bilgi taşımaz (§8.4). */
function lockHint(row: RingRow): string {
  const previous = rows.value[row.index - 1]
  if (!previous) return 'locked'
  const remaining = Math.max(0, NUMBER_TUNING.unlockThreshold - store.rings[row.index - 1].bought)
  return remaining === 1 ? '1 more ' + previous.name : remaining + ' more ' + previous.name
}

/**
 * Blok çarpanı (contract §0): 5.5 ** floor(bought / 10). Metin satırdan gelir —
 * biçim tek kaynakta kalır ki zincir satırı ile `blockMultText` ayrı düşmesin (V4).
 * Çarpan 1 iken (henüz blok yok) satır susar: ekranı x1.00 ile doldurmaz.
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

/** Blok çarpanı hesaplanmış mı: şablon boş metin için ayırıcı basmaz. */
function hasBlockFactor(row: RingRow): boolean {
  return blockFactorText(row).length > 0
}
</script>

<template>
  <section class="chain" aria-label="Chain">
    <header class="chain__head">
      <p class="chain__title">Chain</p>
      <div class="modes">
        <div class="modes__modes" role="group" aria-label="Buy amount">
          <button
            v-for="option in MODES"
            :key="option.label"
            type="button"
            class="mode"
            :class="{ 'mode--on': store.buyMode === option.mode }"
            :aria-pressed="store.buyMode === option.mode"
            @click="selectMode(option.mode)"
          >
            {{ option.label }}
          </button>
        </div>

        <!--
          Max All: her satırın kendi modundan bağımsız, tek vuruşta tüm zinciri alır.
          Metin düğmesi — seçili mod değil, eylem; bu yüzden alt çizgi taşımaz.
        -->
        <button
          type="button"
          class="mode mode--action"
          aria-label="Buy every affordable block across the chain"
          @click="buyMaxAll"
        >
          Max All
        </button>
      </div>
    </header>

    <div v-for="row in rows" :key="row.index" class="row" :class="{ 'row--locked': !row.unlocked }">
      <div class="row__main">
        <p class="row__name">{{ row.name }}</p>
        <p class="row__meta data">
          <span>{{ format(row.amount, 0, store.settings.notation) }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span>{{ format(row.producesPerSecond, 2, store.settings.notation) }}/s</span>
          <!-- Doğrudan katkı: halka bir altındakini beslerken sayıya da yazar (V4: süs değil, veri). -->
          <template v-if="row.addsPerSecond.gt(0)">
            <span class="dot" aria-hidden="true">·</span>
            <span class="row__direct">+{{ format(row.addsPerSecond, 2, store.settings.notation) }}/s</span>
          </template>
          <!-- Blok çarpanı (contract §0): yalnız satır bu değeri yayınlıyorsa yazılır. -->
          <template v-if="hasBlockFactor(row)">
            <span class="dot" aria-hidden="true">·</span>
            <span class="row__block">{{ blockFactorText(row) }}</span>
          </template>
        </p>
      </div>

      <button
        v-if="row.unlocked"
        type="button"
        class="row__buy"
        :class="{ 'row__buy--ready': rowAffordable(row) }"
        :disabled="!rowAffordable(row)"
        :aria-label="buyLabel(row)"
        @click="buy(row.index)"
      >
        <span class="buy__cost">{{ costText(rowCost(row)) }}</span>
        <span v-if="store.buyMode === 'max'" class="buy__count">×{{ row.maxCount }}</span>
      </button>
      <p v-else class="row__lock data">{{ lockHint(row) }}</p>
    </div>
  </section>
</template>

<style scoped>
.chain {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Başlık: kutu yok, yalnız 1px hairline + tipografi (G3). */
.chain__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0 11px;
  border-top: 1px solid var(--pn-hairline);
}
.chain__title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--pn-text-dim);
}

/* Mod düğmeleri kutusuz: seçim ton + 1px alt çizgiyle (dock dili, G10). */
.modes {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
/* Mod grubu ile Max All ayrı roller: seçim ile eylem arasında biraz daha boşluk. */
.modes__modes {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.mode {
  appearance: none;
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  padding: 2px 0 3px;
  font-family: var(--font-ui);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--pn-text-faint);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.mode:hover { color: var(--pn-text-dim); }
.mode--on {
  color: var(--pn-text);
  border-bottom-color: var(--pn-hairline-strong);
}
/*
 * Max All bir secim degil eylemdir: alt cizgi tasimaz, tonla one cikar.
 * Ayni satirda iki farkli anlam (secim / eylem) iki farkli gorselle anlatilir (S8.5).
 */
.mode--action {
  color: var(--pn-text-dim);
  letter-spacing: 0.1em;
}
.mode--action:hover { color: var(--pn-text); }
/* Blok çarpanı: aynı meta satırının en gerisinde — süs değil, okuma. */
.row__block { color: var(--pn-text-faint); }

/* Kutu yok: her satır yalnız 1px hairline ile ayrılır (G3). */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 0;
  border-top: 1px solid var(--pn-hairline);
}
.row:last-child { border-bottom: 1px solid var(--pn-hairline); }

.row__main { min-width: 0; }

.row__name {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--pn-text);
}
.row__meta {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--pn-text-dim);
}
.dot { opacity: 0.55; margin: 0 6px; }
/* Doğrudan katkı: aynı veri, bir ton geride — hiyerarşi punto/kontrast ile (G-bölüm 8). */
.row__direct { color: var(--pn-text-faint); }

/* Kilitli = gri (rezerve renk değil, ton). Gerekçe metni okunur tonda kalır. */
.row--locked .row__name { color: var(--pn-locked); }

.row__buy {
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 7px;
  appearance: none;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 6px 0 6px 10px;
  min-width: 116px;
  font-size: 13px;
  color: var(--pn-text-dim);
  cursor: pointer;
  transition: color 120ms ease;
}
/* Sayısal metin: mono + tabular (§3.1). Mono yüzü `--font-data` (Space Mono). */
.row__buy,
.buy__count {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}
.row__buy--ready { color: var(--pn-text); }
.row__buy--ready:hover { color: var(--pn-text); text-decoration: underline; text-underline-offset: 3px; }
.row__buy:disabled { color: var(--pn-text-faint); cursor: default; }
.buy__count { color: var(--pn-text-dim); }
.row__buy:disabled .buy__count { color: var(--pn-text-faint); }

.row__lock {
  margin: 0;
  padding-left: 10px;
  font-size: 11px;
  text-align: right;
  color: var(--pn-text-dim);
}

@media (max-width: 560px) {
  .chain { padding: 0 16px; }
  .chain__head { gap: 10px; padding: 9px 0 10px; }
  .chain__title { font-size: 12px; }
  .modes { gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
  .modes__modes { gap: 12px; }
  .row { gap: 12px; }
  .row__name { font-size: 13px; }
  .row__buy { min-width: 100px; font-size: 12px; gap: 6px; }
  .buy__count { font-size: 10px; }
  .row__lock { font-size: 10px; max-width: 42%; line-height: 1.45; }
}
</style>
