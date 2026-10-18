<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore, SINGULARITY_UPGRADES, NEURAL_TREE, NEURAL_LEGACY_UPGRADE_IDS } from '../stores/game'
import { Decimal } from '../core/math'
import { SaveSystem } from '../core/save'
import { useAuthStore } from '../stores/auth'
import { CloudSaveService } from '../core/auth/cloud-save-service'
import { TIME_CLOCK_MAX_DRAG } from '../game/clock-data'
import { X, ShieldAlert } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGameStore()
const authStore = useAuthStore()

const customAmount = ref('1e12')
const customSp = ref('100')
const feedback = ref('')

function flash(msg: string) {
  feedback.value = msg
  window.setTimeout(() => {
    feedback.value = ''
  }, 1800)
}

function parseDecimal(input: string): Decimal | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const d = new Decimal(trimmed)
    if (Number.isNaN(d.mag)) return null
    return d
  } catch {
    return null
  }
}

// ---- Kaynaklar ----
function addDopamine() {
  const d = parseDecimal(customAmount.value)
  if (!d) {
    flash('Geçersiz sayı!')
    return
  }
  store.matter = store.matter.plus(d)
  store.stats.totalMatterProduced = store.stats.totalMatterProduced.plus(d)
  if (store.matter.gt(store.stats.highestMatter)) {
    store.stats.highestMatter = store.matter
  }
  flash(`+${customAmount.value} Kütle eklendi`)
}

function setDopamine() {
  const d = parseDecimal(customAmount.value)
  if (!d) {
    flash('Geçersiz sayı!')
    return
  }
  store.matter = d
  flash(`Kütle = ${customAmount.value}`)
}

function giveDopaminePreset(preset: string) {
  const d = new Decimal(preset)
  store.matter = store.matter.plus(d)
  store.stats.totalMatterProduced = store.stats.totalMatterProduced.plus(d)
  if (store.matter.gt(store.stats.highestMatter)) {
    store.stats.highestMatter = store.matter
  }
  flash(`+${preset} Kütle`)
}

function resetDopamine() {
  store.matter = new Decimal(10)
  flash('Kütle sıfırlandı (10)')
}

function addSp() {
  const d = parseDecimal(customSp.value)
  if (!d) {
    flash('Geçersiz SP!')
    return
  }
  store.singularityPoints = store.singularityPoints.plus(d)
  flash(`+${customSp.value} SP`)
}

function addSingularity() {
  store.singularities += 1
  store.stats.singularityCount += 1
  flash('Singularity +1')
}

// ---- Boyutlar / Frekans ----
function giveDim(tier: number, count: number) {
  const dim = store.dimensions[tier - 1]
  if (!dim) return
  dim.amount = dim.amount.plus(count)
  dim.bought += count
  flash(`D${tier} +${count}`)
}

function fillAllDims() {
  store.dimensions.forEach((d) => {
    d.amount = d.amount.plus(100)
    d.bought += 100
  })
  flash('Tüm istasyonlara +100')
}

function zeroDims() {
  store.dimensions.forEach((d) => {
    d.amount = new Decimal(0)
    d.bought = 0
  })
  store.tickspeedBought = 0
  flash('Boyutlar sıfırlandı')
}

function addTickspeed(n: number) {
  store.tickspeedBought += n
  flash(`Hz +${n}`)
}

function addShift(n: number) {
  store.dimensionShifts += n
  flash(`Sıçrama +${n}`)
}

function addGalaxy(n: number) {
  store.galaxies += n
  flash(`Küme +${n}`)
}

// ---- Buff / Olay ----
function giveFyp() {
  store.activeBuffs.push({
    id: `buff-admin-fyp-${Date.now()}`,
    type: 'fyp',
    name: '🔥 Süpernova Patlaması (7× Kütle)',
    duration: 300,
    remaining: 300,
    multiplier: 7
  })
  flash('Süpernova buffı verildi (5 dk)')
}

function giveFrenzy() {
  store.activeBuffs.push({
    id: `buff-admin-frenzy-${Date.now()}`,
    type: 'heart_frenzy',
    name: '🌌 Kütle Patlaması (300× Çekim)',
    duration: 300,
    remaining: 300,
    multiplier: 300
  })
  flash('Kütle Patlaması buffı verildi (5 dk)')
}

function giveCombo() {
  giveFyp()
  giveFrenzy()
  flash('KOMBO aktif (2100x)')
}

function clearBuffs() {
  store.activeBuffs = []
  flash('Bufflar temizlendi')
}

function spawnAnomalies() {
  store.spawnAnomaly()
  store.spawnAnomaly()
  flash('Anomali doğuruldu')
}

function clearAnomalies() {
  store.floatingAnomalies = []
  flash('Anomaliler temizlendi')
}

function spawnGuilt() {
  for (let i = 0; i < 5; i++) store.spawnSlacker()
  flash('5 Vicdan Azabı dadandı')
}

function cashoutGuilt() {
  store.slackers.forEach((s) => {
    const refund = s.leechedDopamine.times(1.5)
    store.matter = store.matter.plus(refund)
    store.stats.totalMatterProduced = store.stats.totalMatterProduced.plus(refund)
    store.stats.slackersFired += 1
  })
  store.slackers = []
  flash('Vicdanlar primli bozduruldu')
}

function clearGuilt() {
  store.slackers = []
  flash('Vicdanlar silindi')
}

// ---- Lab / Kriz ----
function fillCaffeine() {
  store.caffeineEnergy = store.maxCaffeineEnergy
  store.crisisBackfireDebuff = 0
  flash('Kafein full + debuff temiz')
}

function matureLab() {
  store.labCells.forEach((c) => {
    if (c.seedType) {
      c.age = c.matureAge
      c.isMature = true
    }
  })
  flash('Lab ürünleri olgunlaştırıldı')
}

function fillHype() {
  store.labHype = 100
  flash('Lab Hype %100 yapıldı')
}

function plantBrainrot() {
  const empty = store.labCells.find((c) => c.seedType === null)
  if (!empty) {
    flash('Boş hücre yok!')
    return
  }
  empty.seedType = 'higgs_boson'
  empty.age = 90
  empty.matureAge = 90
  empty.maxAge = 360
  empty.isMature = true
  flash('💥 Higgs Bozonu ekildi')
}

function clearLab() {
  store.labCells.forEach((c) => {
    c.seedType = null
    c.age = 0
    c.isMature = false
  })
  flash('Lab temizlendi')
}

// ---- Bot / Yükseltme ----
function unlockAllBots() {
  Object.values(store.autobuyers).forEach((b) => {
    b.unlocked = true
    b.enabled = true
  })
  store.autobuyerBulkUnlocked = true
  store.autobuyerMaxUnlocked = true
  flash('Tüm botlar açıldı (bulk+max)')
}

function toggleAllBots(off: boolean) {
  Object.values(store.autobuyers).forEach((b) => {
    if (b.unlocked) b.enabled = !off
  })
  flash(off ? 'Botlar durduruldu' : 'Botlar çalışıyor')
}

function maxSpUpgrades() {
  SINGULARITY_UPGRADES.forEach((u) => {
    store.singularityUpgrades[u.id] = u.maxLevel
  })
  flash('SP dükkanı maxlandı')
}

// ---- Nöral Ağaç ----
function grantNeuralNode(nodeId: string) {
  const node = NEURAL_TREE.find((n) => n.id === nodeId)
  if (!node) return
  const lvl = (store.neuralNodesBought[nodeId] || 0) + 1
  store.neuralNodesBought = { ...store.neuralNodesBought, [nodeId]: lvl }
  // Eski dükkân id'leri: etki bağlantıları singularityUpgrades okuduğu için kayıt senkronlanır
  if (NEURAL_LEGACY_UPGRADE_IDS.has(nodeId)) {
    store.singularityUpgrades[nodeId] = lvl
  }
  flash(`${node.icon} ${node.name} verildi (Sv.${lvl})`)
}

function maxNeuralTree() {
  NEURAL_TREE.forEach((n) => {
    const max = n.maxLevel ?? 1
    store.neuralNodesBought[n.id] = max
    if (NEURAL_LEGACY_UPGRADE_IDS.has(n.id)) {
      store.singularityUpgrades[n.id] = max
    }
  })
  store.neuralNodesBought = { ...store.neuralNodesBought }
  flash('Nöral Ağaç maxlandı')
}

function resetNeuralTree() {
  store.neuralNodesBought = {}
  const nextUpgrades = { ...store.singularityUpgrades }
  NEURAL_LEGACY_UPGRADE_IDS.forEach((id) => {
    delete nextUpgrades[id]
  })
  store.singularityUpgrades = nextUpgrades
  flash('Nöral Ağaç sıfırlandı (düz dükkan korunur)')
}

// ---- Zaman / Prestij ----
function timeWarp(seconds: number) {
  const step = 5
  let left = seconds
  while (left > 0) {
    const dt = Math.min(step, left)
    store.update(dt)
    left -= dt
  }
  flash(`${seconds} sn ileri sarıldı`)
}

// ---- Zaman Yayı (Time Clock) ----
/**
 * Saat, tick döngüsünde yalnızca `time_clock` kilidi açıkken ilerler (kilitliyken
 * hız nötre çekilir → donmuş bir saat kalırdı). Admin testinde kilidi de biz açarız.
 */
function ensureClockUnlocked() {
  if (!store.unlockedFeatures.includes('time_clock')) {
    store.unlockedFeatures.push('time_clock')
  }
}

function spawnClock() {
  ensureClockUnlocked()
  if (store.timeClock.phase !== 'idle' || store.timeClock.active) store.resetTimeClock()
  const ok = store.spawnTimeClock()
  flash(ok ? '⏰ Zaman Yayı doğuruldu — ibreyi dairesel geri sar' : 'Saat doğurulamadı (faz meşgul)')
}

/** Ödül tarafını sarma zahmeti olmadan denemek için: tam gerginlik + bedelsiz salgı. */
function forceClockRelease() {
  ensureClockUnlocked()
  store.resetTimeClock()
  store.spawnTimeClock()
  store.timeClock.drag = TIME_CLOCK_MAX_DRAG
  const ok = store.releaseTimeClock()
  flash(ok ? 'Yay tam gergin salındı (16×)' : 'Salgı başlatılamadı')
}

function clearClock() {
  store.resetTimeClock()
  flash('Zaman Yayı kapatıldı')
}

function forceShift() {
  store.dimensionShifts += 1
  store.matter = new Decimal(10)
  store.dimensions.forEach((d) => {
    d.amount = new Decimal(0)
    d.bought = 0
  })
  store.tickspeedBought = 0
  flash('Sıçrama zorla yapıldı')
}

function forceGalaxy() {
  store.galaxies += 1
  store.dimensionShifts = 0
  store.matter = new Decimal(10)
  store.dimensions.forEach((d) => {
    d.amount = new Decimal(0)
    d.bought = 0
  })
  store.tickspeedBought = 0
  flash('Küme zorla yapıldı')
}

function forceSingularity() {
  const gain = store.canSingularity ? store.singularityGain : new Decimal(1)
  store.singularityPoints = store.singularityPoints.plus(gain)
  store.singularities += 1
  store.stats.singularityCount += 1
  store.matter = new Decimal(10)
  store.dimensions.forEach((d) => {
    d.amount = new Decimal(0)
    d.bought = 0
  })
  store.tickspeedBought = 0
  store.dimensionShifts = 0
  store.galaxies = 0
  store.slackers = []
  flash(`Tekillik zorla: +${gain.toString()} SP`)
}

function hardReset() {
  if (!window.confirm('Tüm kayıt silinsin mi? (Hard Reset)')) return
  store.$reset()
  SaveSystem.hardReset()
  SaveSystem.suppressSaves()
  CloudSaveService.forgetAllLocalRevisions()
  if (!authStore.isAuthenticated) {
    window.location.reload()
    return
  }
  const uid = authStore.user?.uid
  if (uid) CloudSaveService.forgetMockCloud(uid)
  void authStore.saveToCloud(true).then(
    () => window.location.reload(),
    () => window.location.reload()
  )
}
</script>

<template>
  <div class="layer-modal fixed inset-0 flex items-start md:items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto" @click.self="emit('close')">
    <div class="w-full max-w-2xl rounded-2xl border border-rose-500/40 bg-[var(--ds-panel-strong)] shadow-[0_0_40px_rgba(244,63,94,0.25)] overflow-hidden">
      <!-- Başlık -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-rose-500/20 bg-rose-500/10">
        <div class="flex items-center gap-2">
          <ShieldAlert class="w-5 h-5 text-rose-400" />
          <div>
            <div class="text-sm font-mono font-black text-rose-300 tracking-widest">ADMIN PANELİ — GODMODE</div>
            <div class="text-[11px] font-mono text-slate-400">Kapatmak için tekrar <span class="text-rose-300 font-bold">GODMODE</span> yaz veya ESC / X</div>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Kapat"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div v-if="feedback" class="px-4 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-500/10 border-b border-cyan-500/20">
        {{ feedback }}
      </div>

      <div class="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs font-mono">
        <!-- Kaynaklar -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-purple-300 tracking-wider">💰 KAYNAKLAR</h4>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="p in ['1e6', '1e12', '1e30', '1.79e308']" :key="p" @click="giveDopaminePreset(p)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 cursor-pointer">+{{ p }}</button>
            <button @click="resetDopamine" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Sıfırla</button>
          </div>
          <div class="flex gap-1.5">
            <input v-model="customAmount" type="text" spellcheck="false" placeholder="1e12" class="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-purple-400" />
            <button @click="addDopamine" class="btn-tactile px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">Ekle</button>
            <button @click="setDopamine" class="btn-tactile px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 cursor-pointer">Ayarla</button>
          </div>
          <div class="flex gap-1.5 items-center">
            <span class="text-slate-400 shrink-0">SP:</span>
            <input v-model="customSp" type="text" spellcheck="false" class="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-slate-100 tabular-nums focus:outline-none focus:border-amber-400" />
            <button @click="addSp" class="btn-tactile tabular-nums px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer">+SP</button>
            <button @click="addSingularity" class="btn-tactile px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer">+Tekillik</button>
          </div>
        </section>

        <!-- Boyutlar -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-cyan-300 tracking-wider">📐 BOYUTLAR & FREKANS</h4>
          <div class="grid grid-cols-4 gap-1.5">
            <button v-for="t in 8" :key="t" @click="giveDim(t, 10)" class="btn-tactile tabular-nums px-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 cursor-pointer">D{{ t }} +10</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button @click="fillAllDims" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-500/40 cursor-pointer">Tümü +100</button>
            <button @click="zeroDims" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Sıfırla</button>
            <button @click="addTickspeed(10)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">Hz +10</button>
            <button @click="addTickspeed(100)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">Hz +100</button>
            <button @click="addShift(1)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-500/40 cursor-pointer">Shift +1</button>
            <button @click="addGalaxy(1)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/40 cursor-pointer">Galaksi +1</button>
          </div>
        </section>

        <!-- Bufflar -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-rose-300 tracking-wider">🔥 BUFF & OLAY</h4>
          <div class="flex flex-wrap gap-1.5">
            <button @click="giveFyp" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 cursor-pointer">Gece 3 (7x)</button>
            <button @click="giveFrenzy" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 cursor-pointer">Histeri (300x)</button>
            <button @click="giveCombo" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-white border border-rose-400/50 font-bold cursor-pointer">KOMBO 2100x</button>
            <button @click="clearBuffs" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Buff Temizle</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button @click="spawnAnomalies" class="btn-tactile px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 cursor-pointer">Anomali Doğur</button>
            <button @click="clearAnomalies" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Anomali Temizle</button>
            <button @click="spawnGuilt" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 border border-violet-500/30 cursor-pointer">5 Vicdan Doğur</button>
            <button @click="cashoutGuilt" class="btn-tactile px-2 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 border border-violet-500/30 cursor-pointer">Primli Bozdur</button>
            <button @click="clearGuilt" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Vicdan Sil</button>
          </div>
        </section>

        <!-- Lab / Bot -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-emerald-300 tracking-wider">🧪 LAB, KRİZ & BOT</h4>
          <div class="flex flex-wrap gap-1.5">
            <button @click="fillCaffeine" class="btn-tactile px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 cursor-pointer">Kafein Full</button>
            <button @click="matureLab" class="btn-tactile px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 cursor-pointer">Lab Olgunlaştır</button>
            <button @click="fillHype" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-500/40 cursor-pointer font-bold">Hype %100</button>
            <button @click="plantBrainrot" class="btn-tactile px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 cursor-pointer">💥 Higgs Ekle</button>
            <button @click="clearLab" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Lab Temizle</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button @click="unlockAllBots" class="btn-tactile px-2 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 cursor-pointer">Tüm Botları Aç</button>
            <button @click="toggleAllBots(false)" class="btn-tactile px-2 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 cursor-pointer">Botları Çalıştır</button>
            <button @click="toggleAllBots(true)" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Botları Durdur</button>
            <button @click="maxSpUpgrades" class="btn-tactile px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 cursor-pointer">SP Dükkanı Maxla</button>
          </div>
        </section>

        <!-- Nöral Ağaç -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-teal-300 tracking-wider">🌳 NÖRAL AĞAÇ</h4>
          <div class="flex flex-wrap gap-1.5">
            <button @click="maxNeuralTree" class="btn-tactile px-2 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-100 border border-teal-500/40 cursor-pointer font-bold">Ağacı Maxla</button>
            <button @click="resetNeuralTree" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Ağaç Sıfırla</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="n in NEURAL_TREE" :key="n.id" @click="grantNeuralNode(n.id)" class="btn-tactile px-2 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 text-teal-200 border border-teal-500/30 cursor-pointer">
              {{ n.icon }} {{ n.id }}
            </button>
          </div>
        </section>

        <!-- Zaman / Prestij -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-amber-300 tracking-wider">⏩ ZAMAN & PRESTİJ</h4>
          <div class="flex flex-wrap gap-1.5">
            <button @click="timeWarp(60)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">+1 dk</button>
            <button @click="timeWarp(600)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">+10 dk</button>
            <button @click="timeWarp(3600)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">+1 sa</button>
            <button @click="timeWarp(28800)" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer">+8 sa</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button @click="forceShift" class="btn-tactile px-2 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-100 border border-violet-500/40 cursor-pointer">Shift Zorla</button>
            <button @click="forceGalaxy" class="btn-tactile px-2 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-500/40 cursor-pointer">Galaksi Zorla</button>
            <button @click="forceSingularity" class="btn-tactile px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border border-amber-500/40 cursor-pointer">Tekillik Zorla</button>
            <button @click="hardReset" class="btn-tactile px-2 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 cursor-pointer">Hard Reset</button>
          </div>
        </section>

        <!-- Zaman Yayı -->
        <section class="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
          <h4 class="font-bold text-cyan-300 tracking-wider">⏰ ZAMAN YAYI (TIME CLOCK)</h4>
          <div class="flex flex-wrap gap-1.5">
            <button @click="spawnClock" class="btn-tactile px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-500/40 cursor-pointer font-bold">Saati Doğur</button>
            <button @click="forceClockRelease" class="btn-tactile tabular-nums px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 cursor-pointer">Tam Gergin Salgı (16×)</button>
            <button @click="clearClock" class="btn-tactile px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer">Saati Kapat</button>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Saat yalnızca <span class="text-cyan-300">time_clock</span> kilidi açıkken ilerler; <span class="text-cyan-300">Saati Doğur</span> kilidi de açar.
            İbre ekranda 26 sn kalır — dairesel çevirerek geri sar, bıraktığında zaman hızlanır.
            <span class="text-cyan-300">Tam Gergin Salgı</span> sarma maliyetini atlar (yalnızca ödül tarafını hızlı denemek için).
          </p>
        </section>

        <p class="text-[11px] text-slate-500 leading-relaxed">
          Not: Admin işlemleri doğrudan kayıtlı oyunu değiştirir ve otomatik kayda dahil olur.
          Dengeli test için önce "Şimdi Kaydet" alıp sonra denemen önerilir.
        </p>
      </div>
    </div>
  </div>
</template>
