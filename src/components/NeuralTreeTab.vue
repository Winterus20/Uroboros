<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, NEURAL_TREE, NEURAL_LEGACY_UPGRADE_IDS } from '../stores/game'
import type { NeuralBranch, NeuralNode } from '../models/types'
import { formatNumber } from '../core/format'
import { Check, Lock, Moon, Sparkles, Link2, Zap } from 'lucide-vue-next'

const store = useGameStore()

// Ağaç topolojisi: her satır bir "kademe"; aynı satırdaki id'ler yan yana (kardeş/SEÇİM çifti) çizilir.
type TreeRow = string[]
const PASSIVE_ROWS: TreeRow[] = [
  ['eye_drops', 'muted_alerts'],
  ['offline_dream_weaver'],
  ['dream_ascetic', 'dream_lucid'],
  ['neural_chip'],
  ['bot_overclock', 'neural_nest'],
  ['prod_echo'],
  ['dawn_harbinger']
]
const ACTIVE_ROWS: TreeRow[] = [
  ['fast_charger', 'cps_sync'],
  ['combo_unlock', 'caffeine_drip'],
  ['click_momentum', 'crisis_bounty'],
  ['guilt_immunity'],
  ['frenzy_thumb', 'iron_patience']
]
const HYBRID_ROWS: TreeRow[] = [
  ['synaptic_bridge', 'neural_symphony', 'apex_doomscroll', 'break_singularity']
]

const NODE_MAP: Record<string, NeuralNode> = Object.fromEntries(
  NEURAL_TREE.map((n): [string, NeuralNode] => [n.id, n])
)

function getNode(id: string): NeuralNode {
  // Satır sabitleri yalnızca NEURAL_TREE'de var olan id'leri içerir
  return NODE_MAP[id]!
}

function nodeLevel(node: NeuralNode): number {
  // Eski dükkân id'leri iki kaydı senkron taşır; birleşik seviye maliyetin temelidir
  const legacy = NEURAL_LEGACY_UPGRADE_IDS.has(node.id) ? store.singularityUpgrades[node.id] || 0 : 0
  return Math.max(store.neuralNodesBought[node.id] || 0, legacy)
}

function nodeMaxLevel(node: NeuralNode): number {
  return node.maxLevel ?? 1
}

// Maliyet formülü store.buyNeuralNode ile birebir aynı kalıpta çoğaltılır (UI/çekirdek tutarlılığı)
function nodeCost(node: NeuralNode): number {
  return Math.floor(node.cost * Math.pow(node.costMult ?? 1, nodeLevel(node)) * store.achievementSpDiscount)
}

const isBought = (id: string): boolean => (store.neuralNodesBought[id] || 0) > 0

type Visibility = 'full' | 'mystery' | 'hidden'
// Cookie Clicker kuralı: tüm öncüller alınmadan tam bilgi gösterilmez;
// en az bir öncül alındıysa "???" slotu, hiç alınmadıysa hiç görünmez.
function visibility(node: NeuralNode): Visibility {
  if (node.requires.length === 0) return 'full'
  const boughtCount = node.requires.filter(isBought).length
  if (boughtCount === node.requires.length) return 'full'
  return boughtCount > 0 ? 'mystery' : 'hidden'
}

function rowVisible(row: TreeRow): boolean {
  return row.some((id) => visibility(getNode(id)) !== 'hidden')
}

// SEÇİM kilidi: aynı choiceGroup'tan kardeş alınmışsa bu düğüm bir sonraki Şafak'a kilitlenir
function isChoiceLocked(node: NeuralNode): boolean {
  if (!node.choiceGroup) return false
  return NEURAL_TREE.some(
    (n) => n.choiceGroup === node.choiceGroup && n.id !== node.id && isBought(n.id)
  )
}

type NodeUiState = 'maxed' | 'choice-locked' | 'available' | 'insufficient'
function uiState(node: NeuralNode): NodeUiState {
  if (nodeLevel(node) >= nodeMaxLevel(node)) return 'maxed'
  if (isChoiceLocked(node)) return 'choice-locked'
  return store.singularityPoints.gte(nodeCost(node)) ? 'available' : 'insufficient'
}

const CARD_STATE_CLASS: Record<NodeUiState, string> = {
  maxed: 'border-cyan-500/40 bg-cyan-950/20',
  'choice-locked': 'ds-ramp-locked',
  available: 'border-amber-500/50 bg-amber-950/10 hover:border-amber-400/70 affordance-pulse',
  insufficient: 'ds-ramp-partial'
}

// Dal renk kodu: pasif = indigo, aktif = pembe/mor, hibrit = gök mavisi (mevcut paletle uyumlu)
const BRANCH_ICON_CLASS: Record<NeuralBranch, string> = {
  root: 'text-amber-300',
  passive: 'text-indigo-300',
  active: 'text-fuchsia-300',
  hybrid: 'text-sky-300'
}

function buy(node: NeuralNode): void {
  if (uiState(node) !== 'available' && uiState(node) !== 'insufficient') return
  store.buyNeuralNode(node.id)
}

const spBalance = computed(() => formatNumber(store.singularityPoints, store.settings.notation))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
      <h3 class="section-label">
        <Sparkles class="w-4 h-4 text-amber-400" />
        <span>Nöral Ağaç (Yetenek Ağacı)</span>
      </h3>
      <span class="section-hint">Düğümler kalıcıdır ve asla silinmez — yalnızca SEÇİM düğümleri her Şafak'ta yeniden seçilir.</span>
    </div>

    <!-- SP bakiyesi + dal lejantı -->
    <div class="glass-panel-card p-3 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
        <span class="text-xs font-mono text-slate-300">Harcanabilir Uykusuzluk:</span>
        <span class="text-sm font-bold font-mono text-amber-400 tabular-nums">{{ spBalance }} SP</span>
      </div>
      <div class="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
        <span class="ds-badge ds-badge-blue"><Moon class="w-3 h-3" /><span>Pasif — Uyku</span></span>
        <span class="ds-badge ds-badge-violet"><Zap class="w-3 h-3" /><span>Aktif — Başparmak</span></span>
        <span class="inline-flex items-center gap-1 px-2 py-[0.15rem] rounded-full border border-sky-500/35 bg-sky-500/[0.12] text-sky-300 text-[10px] font-mono font-semibold whitespace-nowrap"><Link2 class="w-3 h-3" /><span>Hibrit — Köprü</span></span>
      </div>
    </div>

    <div class="glass-panel-card p-4 rounded-xl">
      <!-- Kök düğüm -->
      <div class="flex justify-center">
        <div
          class="glass-panel-card p-3 rounded-xl border w-full max-w-xs text-center"
          :class="uiState(getNode('insomnia_heart')) === 'maxed' ? CARD_STATE_CLASS.maxed : CARD_STATE_CLASS[uiState(getNode('insomnia_heart'))]"
        >
          <div class="text-2xl mb-1">❤️</div>
          <h4 class="text-xs font-bold font-mono text-slate-100">{{ getNode('insomnia_heart').name }}</h4>
          <p class="text-[10px] text-slate-400 leading-snug mt-1">{{ getNode('insomnia_heart').desc }}</p>
          <button
            v-if="uiState(getNode('insomnia_heart')) !== 'maxed'"
            @click="buy(getNode('insomnia_heart'))"
            :disabled="uiState(getNode('insomnia_heart')) === 'insufficient'"
            class="btn-tactile mt-2 w-full py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border tabular-nums"
            :class="uiState(getNode('insomnia_heart')) === 'available'
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 affordance-pulse'
              : 'ds-ramp-partial text-slate-300 cursor-not-allowed'"
          >
            <span>Al ({{ nodeCost(getNode('insomnia_heart')) }} SP)</span>
          </button>
          <div v-else class="mt-2 text-[11px] font-mono text-cyan-300 flex items-center justify-center gap-1">
            <Check class="w-3.5 h-3.5" />
            <span>MAKS · Kalıcı Olarak Aktif</span>
          </div>
        </div>
      </div>

      <!-- Kökten dal sütunlarına bağlantı -->
      <div class="flex justify-center" aria-hidden="true">
        <div class="w-px h-5 bg-white/15"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <!-- Pasif Dal (🌙 Uyku) -->
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-1 px-1">
            <Moon class="w-3.5 h-3.5 text-indigo-400" />
            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300">Uyku Dalı — Pasif</span>
          </div>
          <template v-for="(row, ri) in PASSIVE_ROWS" :key="ri">
            <template v-if="rowVisible(row)">
              <div class="flex justify-center" aria-hidden="true">
                <div class="w-px h-4 bg-indigo-500/25"></div>
              </div>
              <div class="flex gap-2 items-stretch">
                <template v-for="id in row" :key="id">
                  <!-- Düğüm kartı (tam bilgi) -->
                  <div
                    v-if="visibility(getNode(id)) === 'full'"
                    class="glass-panel-card p-3 rounded-xl border transition-all flex-1 min-w-0 flex flex-col justify-between"
                    :class="CARD_STATE_CLASS[uiState(getNode(id))]"
                  >
                    <div>
                      <div class="flex items-start gap-2">
                        <span class="text-xl p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0" :class="BRANCH_ICON_CLASS[getNode(id).branch]">{{ getNode(id).icon }}</span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-1">
                            <h4 class="text-[11px] font-bold font-mono text-slate-100 truncate">{{ getNode(id).name }}</h4>
                            <span v-if="getNode(id).choiceGroup" class="flex items-center gap-1 shrink-0">
                              <span
                                class="ds-badge ds-badge-violet text-[9px] px-1 py-0"
                              >SEÇİM</span>
                              <span class="text-[9px] font-mono text-slate-500">Kardeşini kilitler</span>
                            </span>
                          </div>
                          <p class="text-[10px] text-slate-400 leading-snug mt-1">{{ getNode(id).desc }}</p>
                        </div>
                      </div>
                      <div v-if="nodeMaxLevel(getNode(id)) > 1" class="mt-1.5">
                        <div class="text-[10px] font-mono text-slate-400 tabular-nums">
                          Seviye: <span class="text-indigo-300 font-bold">{{ nodeLevel(getNode(id)) }}</span> / {{ nodeMaxLevel(getNode(id)) }}
                        </div>
                        <div class="progress-track progress-track-mini mt-1">
                          <div class="progress-fill progress-fill-purple" :style="{ width: `${(nodeLevel(getNode(id)) / nodeMaxLevel(getNode(id))) * 100}%` }"></div>
                        </div>
                      </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-white/[0.06]">
                      <button
                        v-if="uiState(getNode(id)) === 'available' || uiState(getNode(id)) === 'insufficient'"
                        @click="buy(getNode(id))"
                        :disabled="uiState(getNode(id)) === 'insufficient'"
                        class="btn-tactile w-full py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border tabular-nums"
                        :class="uiState(getNode(id)) === 'available'
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 affordance-pulse'
                          : 'ds-ramp-partial text-slate-300 cursor-not-allowed'"
                      >
                        <span>Al ({{ nodeCost(getNode(id)) }} SP)</span>
                      </button>
                      <div
                        v-else-if="uiState(getNode(id)) === 'maxed'"
                        class="text-center py-1 text-[10px] font-mono text-cyan-300 flex items-center justify-center gap-1"
                      >
                        <Check class="w-3 h-3" />
                        <span>MAKS</span>
                      </div>
                      <div v-else class="text-center py-1 text-[10px] font-mono text-slate-500">
                        Hariç Kilitli 🔒
                      </div>
                    </div>
                  </div>
                  <!-- "???" slotu: en az bir öncül alınmış ama zincir tamamlanmamış -->
                  <div
                    v-else
                    class="flex-1 min-w-0 rounded-xl border border-dashed border-white/[0.08] bg-black/30 p-3 flex items-center gap-2.5 opacity-70"
                  >
                    <span class="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0">
                      <Lock class="w-4 h-4 text-slate-500" />
                    </span>
                    <div class="min-w-0">
                      <h4 class="text-[11px] font-mono text-slate-500">???</h4>
                      <p class="text-[10px] text-slate-600 leading-snug">Algoritma bu hesabı henüz çözemedi.</p>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </template>
        </div>

        <!-- Aktif Dal (👍 Başparmak) -->
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-1 px-1">
            <Zap class="w-3.5 h-3.5 text-fuchsia-400" />
            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-300">Başparmak Dalı — Aktif</span>
          </div>
          <template v-for="(row, ri) in ACTIVE_ROWS" :key="ri">
            <template v-if="rowVisible(row)">
              <div class="flex justify-center" aria-hidden="true">
                <div class="w-px h-4 bg-fuchsia-500/25"></div>
              </div>
              <div class="flex gap-2 items-stretch">
                <template v-for="id in row" :key="id">
                  <div
                    v-if="visibility(getNode(id)) === 'full'"
                    class="glass-panel-card p-3 rounded-xl border transition-all flex-1 min-w-0 flex flex-col justify-between"
                    :class="CARD_STATE_CLASS[uiState(getNode(id))]"
                  >
                    <div>
                      <div class="flex items-start gap-2">
                        <span class="text-xl p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0" :class="BRANCH_ICON_CLASS[getNode(id).branch]">{{ getNode(id).icon }}</span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-1">
                            <h4 class="text-[11px] font-bold font-mono text-slate-100 truncate">{{ getNode(id).name }}</h4>
                            <span v-if="getNode(id).choiceGroup" class="flex items-center gap-1 shrink-0">
                              <span
                                class="ds-badge ds-badge-violet text-[9px] px-1 py-0"
                              >SEÇİM</span>
                              <span class="text-[9px] font-mono text-slate-500">Kardeşini kilitler</span>
                            </span>
                          </div>
                          <p class="text-[10px] text-slate-400 leading-snug mt-1">{{ getNode(id).desc }}</p>
                        </div>
                      </div>
                      <div v-if="nodeMaxLevel(getNode(id)) > 1" class="mt-1.5">
                        <div class="text-[10px] font-mono text-slate-400 tabular-nums">
                          Seviye: <span class="text-fuchsia-300 font-bold">{{ nodeLevel(getNode(id)) }}</span> / {{ nodeMaxLevel(getNode(id)) }}
                        </div>
                        <div class="progress-track progress-track-mini mt-1">
                          <div class="progress-fill progress-fill-purple" :style="{ width: `${(nodeLevel(getNode(id)) / nodeMaxLevel(getNode(id))) * 100}%` }"></div>
                        </div>
                      </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-white/[0.06]">
                      <button
                        v-if="uiState(getNode(id)) === 'available' || uiState(getNode(id)) === 'insufficient'"
                        @click="buy(getNode(id))"
                        :disabled="uiState(getNode(id)) === 'insufficient'"
                        class="btn-tactile w-full py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border tabular-nums"
                        :class="uiState(getNode(id)) === 'available'
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 affordance-pulse'
                          : 'ds-ramp-partial text-slate-300 cursor-not-allowed'"
                      >
                        <span>Al ({{ nodeCost(getNode(id)) }} SP)</span>
                      </button>
                      <div
                        v-else-if="uiState(getNode(id)) === 'maxed'"
                        class="text-center py-1 text-[10px] font-mono text-cyan-300 flex items-center justify-center gap-1"
                      >
                        <Check class="w-3 h-3" />
                        <span>MAKS</span>
                      </div>
                      <div v-else class="text-center py-1 text-[10px] font-mono text-slate-500">
                        Hariç Kilitli 🔒
                      </div>
                    </div>
                  </div>
                  <div
                    v-else
                    class="flex-1 min-w-0 rounded-xl border border-dashed border-white/[0.08] bg-black/30 p-3 flex items-center gap-2.5 opacity-70"
                  >
                    <span class="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0">
                      <Lock class="w-4 h-4 text-slate-500" />
                    </span>
                    <div class="min-w-0">
                      <h4 class="text-[11px] font-mono text-slate-500">???</h4>
                      <p class="text-[10px] text-slate-600 leading-snug">Algoritma bu hesabı henüz çözemedi.</p>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- Hibrit Köprüler: iki dalın kesişimi -->
      <div class="mt-5 pt-4 border-t border-white/[0.06]">
        <div class="flex items-center gap-2 mb-2 px-1">
          <Link2 class="w-3.5 h-3.5 text-sky-400" />
          <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-300">Hibrit Köprüler — İki Daldan da Yatırım İster</span>
        </div>
        <div class="flex justify-center mb-2" aria-hidden="true">
          <div class="w-px h-4 bg-sky-500/25"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <template v-for="id in HYBRID_ROWS[0]" :key="id">
            <div
              v-if="visibility(getNode(id)) === 'full'"
              class="glass-panel-card p-3 rounded-xl border transition-all flex flex-col justify-between"
              :class="CARD_STATE_CLASS[uiState(getNode(id))]"
            >
              <div>
                <div class="flex items-start gap-2">
                  <span class="text-xl p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0" :class="BRANCH_ICON_CLASS[getNode(id).branch]">{{ getNode(id).icon }}</span>
                  <div class="min-w-0 flex-1">
                    <h4 class="text-[11px] font-bold font-mono text-slate-100 truncate">{{ getNode(id).name }}</h4>
                    <p class="text-[10px] text-slate-400 leading-snug mt-1">{{ getNode(id).desc }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-white/[0.06]">
                <button
                  v-if="uiState(getNode(id)) === 'available' || uiState(getNode(id)) === 'insufficient'"
                  @click="buy(getNode(id))"
                  :disabled="uiState(getNode(id)) === 'insufficient'"
                  class="btn-tactile w-full py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border tabular-nums"
                  :class="uiState(getNode(id)) === 'available'
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 affordance-pulse'
                    : 'ds-ramp-partial text-slate-300 cursor-not-allowed'"
                >
                  <span>Al ({{ nodeCost(getNode(id)) }} SP)</span>
                </button>
                <div v-else class="text-center py-1 text-[10px] font-mono text-cyan-300 flex items-center justify-center gap-1">
                  <Check class="w-3 h-3" />
                  <span>MAKS</span>
                </div>
              </div>
            </div>
            <div
              v-else
              class="rounded-xl border border-dashed border-white/[0.08] bg-black/30 p-3 flex items-center gap-2.5 opacity-70"
            >
              <span class="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] shrink-0">
                <Lock class="w-4 h-4 text-slate-500" />
              </span>
              <div class="min-w-0">
                <h4 class="text-[11px] font-mono text-slate-500">???</h4>
                <p class="text-[10px] text-slate-600 leading-snug">Algoritma bu hesabı henüz çözemedi.</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
