// Noral agac + SP dukkani verisi ve computeNeuralEffects saf fonksiyonu.
// Saf moduldur; store import etmez.
import type { NeuralEffects, NeuralNode } from '../models/types'

export const SINGULARITY_UPGRADES = [
  {
    id: 'eye_drops',
    name: 'Optik Soğutucu',
    icon: '💧',
    desc: 'Lazer odaklama lenslerini soğutur. Kademe üretimlerini her seviye 2× çarpar.',
    baseCost: 1,
    costMult: 2,
    maxLevel: 10
  },
  {
    id: 'muted_alerts',
    name: 'Kozmik Parazit Filtresi',
    icon: '🔕',
    desc: 'Arka plan gürültüsünü filtreler. Kozmik Dalgalanmaların geliş aralığını her seviye %12 kısaltır.',
    baseCost: 2,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'fast_charger',
    name: 'Kuantum Güç Kaynağı',
    icon: '🔌',
    desc: 'Enerji hiç bitmez. Çekim Hızı (Hz) taban indirimini güçlendirir.',
    baseCost: 3,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'caffeine_drip',
    name: 'Taktil Çekim Katalizörü',
    icon: '🧪',
    desc: 'Manuel Yutma gücüne saniyelik üretimin her seviye %5\'ini ekler!',
    baseCost: 5,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'neural_chip',
    name: 'Otonom Çekim Çipi',
    icon: '🤖',
    desc: 'Tüm Otomatik Çekim Botlarının çalışma frekansını her seviye 1.5× hızlandırır.',
    baseCost: 4,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'neural_nest',
    name: 'Rezonans Yuvası',
    icon: '🐜',
    desc: 'Kuantum rezonatör kolonisinin üreme hızını her seviye %10 artırır.',
    baseCost: 6,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'guilt_immunity',
    name: 'Parazit Kalkanı',
    icon: '🛡️',
    desc: 'Kozmik parazitlerin emdiği kütle %50 azalır, temizlendiklerinde %150 prim verir.',
    baseCost: 3,
    costMult: 4,
    maxLevel: 3
  },
  {
    id: 'break_singularity',
    name: 'Planck Duvarını Yıkma',
    icon: '⚡',
    desc: 'Kütle 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
    baseCost: 4,
    costMult: 1,
    maxLevel: 1
  }
]

/**
 * Nöral Ağaç: kalıcı SP yetenek ağacı. Eski düz dükkân (SINGULARITY_UPGRADES)
 * id'leri buraya da yerleştirildi; iki yol aynı singularityUpgrades seviye
 * kaydını senkron tuttuğu için etki bağlantıları her iki satın alma yolunda da çalışır.
 */
export const NEURAL_TREE: NeuralNode[] = [
  // ---- Kök ----
  {
    id: 'insomnia_heart',
    name: 'Uykusuzluğun Kalbi',
    icon: '❤️',
    desc: 'Ağacın kökü. Tüm dalları açar ve her çöküş ile sıfırlamada 10.000 g başlangıç kütlesi verir.',
    branch: 'root',
    cost: 1,
    requires: [],
    effect: 'root_unlock'
  },

  // ---- Pasif Dal (🌙 Uyku) ----
  {
    id: 'eye_drops',
    name: 'Göz Damlası',
    icon: '💧',
    desc: 'Kuruyan gözleri rahatlatır. İstasyon üretimlerini her seviye 2× çarpar.',
    branch: 'passive',
    cost: 1,
    maxLevel: 10,
    costMult: 2,
    requires: ['insomnia_heart'],
    effect: 'eye_drops'
  },
  {
    id: 'muted_alerts',
    name: 'Sessize Alınmış Bildirimler',
    icon: '🔕',
    desc: 'Gece Krizlerinin geliş aralığını her seviye %12 kısaltır.',
    branch: 'passive',
    cost: 2,
    maxLevel: 5,
    costMult: 2.5,
    requires: ['insomnia_heart'],
    effect: 'muted_alerts'
  },
  {
    id: 'offline_dream_weaver',
    name: 'Çevrimdışı Rüya Dokuyucu',
    icon: '🌙',
    desc: 'Telefon masada beklerken bile kazanç akar: çevrimdışı ilerleme her seviye +%25.',
    branch: 'passive',
    cost: 3,
    maxLevel: 3,
    costMult: 2.5,
    requires: ['eye_drops'],
    effect: 'offline_gain'
  },
  {
    id: 'neural_chip',
    name: 'Otonom Kaydırma Çipi',
    icon: '🤖',
    desc: 'Tüm Otomatik Kaydırma Botlarının çalışma frekansını her seviye 1.5× hızlandırır.',
    branch: 'passive',
    cost: 4,
    maxLevel: 5,
    costMult: 2.5,
    requires: ['offline_dream_weaver'],
    effect: 'neural_chip'
  },
  {
    id: 'bot_overclock',
    name: 'Bot Aşırı Yüklemesi',
    icon: '⚡',
    desc: 'Çipler kırmızıya keser: tüm bot frekansı her seviye +%25 hızlanır.',
    branch: 'passive',
    cost: 10,
    maxLevel: 3,
    costMult: 2.5,
    requires: ['neural_chip'],
    effect: 'bot_frequency'
  },
  {
    id: 'neural_nest',
    name: 'Nöral Yuva',
    icon: '🐜',
    desc: 'Nöral izleme kolonisinin üreme hızını her seviye %10 artırır.',
    branch: 'passive',
    cost: 6,
    maxLevel: 5,
    costMult: 3,
    requires: ['neural_chip'],
    effect: 'neural_nest'
  },
  {
    id: 'prod_echo',
    name: 'Yankılanan Üretim',
    icon: '📈',
    desc: 'Rezonans kararlılaşır: tüm kütle üretimi her seviye +%25 kalıcı artar.',
    branch: 'passive',
    cost: 5,
    maxLevel: 5,
    costMult: 2,
    requires: ['neural_nest'],
    effect: 'production_mult'
  },
  {
    id: 'dawn_harbinger',
    name: 'Şafak Habercisi',
    icon: '🌅',
    desc: 'Kozmik Çöküşe yaklaşmayı hızlandırır: Tekillik kazancını 2× katlar.',
    branch: 'passive',
    cost: 8,
    requires: ['prod_echo'],
    effect: 'dawn_speed'
  },
  {
    id: 'break_singularity',
    name: 'Planck Duvarını Yıkma',
    icon: '⚡',
    desc: 'Kütle 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
    branch: 'hybrid',
    cost: 4,
    requires: ['eye_drops'], // Denge: taban 3 SP ile 2. koşudan sonra hemen açılabilir (4 SP)
    effect: 'dawn_speed'
  },
  {
    id: 'dream_ascetic',
    name: 'Çileci Rüya',
    icon: '🧘',
    desc: 'SEÇİM: Ekranı kapatsan da kazanç durmaz — çevrimdışı kazanç +%50. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'passive',
    cost: 7,
    requires: ['offline_dream_weaver'],
    effect: 'offline_gain',
    choiceGroup: 'dream_duality'
  },
  {
    id: 'dream_lucid',
    name: 'Berrak Rüya',
    icon: '💭',
    desc: 'SEÇİM: Uykuda bile akış sürer — tüm üretim kalıcı 1.75×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'passive',
    cost: 7,
    requires: ['offline_dream_weaver'],
    effect: 'production_mult',
    choiceGroup: 'dream_duality'
  },

  // ---- Aktif Dal (👍 Başparmak) ----
  {
    id: 'fast_charger',
    name: 'GaN 120W Hızlı Adaptör',
    icon: '🔌',
    desc: 'Pil hiç bitmez. Algoritma Frekansı (Hz) taban indirimini güçlendirir.',
    branch: 'active',
    cost: 3,
    maxLevel: 5,
    costMult: 3,
    requires: ['insomnia_heart'],
    effect: 'fast_charger'
  },
  {
    id: 'cps_sync',
    name: 'Koleksiyon Senkronu',
    icon: '🔄',
    desc: 'Her seviye tıklamaya saniyelik üretimin +%1.5\'ini ekler (taban %2, tavan %8).',
    branch: 'active',
    cost: 2,
    maxLevel: 4,
    costMult: 2,
    requires: ['insomnia_heart'],
    effect: 'cps_sync'
  },
  {
    id: 'combo_unlock',
    name: 'Hipnotik Seri',
    icon: '👆',
    desc: 'Combo Sistemi: 1.5 sn içinde üst üste tıklamalar seri biriktirir; seri ×2/×3/×5 çarpanı verir.',
    branch: 'active',
    cost: 4,
    requires: ['cps_sync'],
    effect: 'combo_unlock'
  },
  {
    id: 'click_momentum',
    name: 'Başparmak Momenti',
    icon: '💪',
    desc: 'Kaydırma kası gelişir: Yukarı Kaydırma gücü kalıcı 1.3× artar.',
    branch: 'active',
    cost: 6,
    requires: ['combo_unlock'],
    effect: 'click_mult'
  },
  {
    id: 'caffeine_drip',
    name: 'Damardan Kafein Serumu',
    icon: '🧪',
    desc: 'Yukarı Kaydır (Manuel Tıklama) gücüne saniyelik üretimin her seviye %5\'ini ekler!',
    branch: 'active',
    cost: 5,
    maxLevel: 5,
    costMult: 3,
    requires: ['cps_sync'],
    effect: 'caffeine_drip'
  },
  {
    id: 'crisis_bounty',
    name: 'Kriz Ganimeti',
    icon: '💰',
    desc: 'Vicdan Azaplarını susturmak artık %50 daha fazla prim verir.',
    branch: 'active',
    cost: 6,
    requires: ['combo_unlock'],
    effect: 'crisis_reward'
  },
  {
    id: 'guilt_immunity',
    name: 'Vicdan Uyuşturucu',
    icon: '🛡️',
    desc: 'Vicdan azaplarının emdiği pay azalır, susturulduklarında %150 prim verir.',
    branch: 'active',
    cost: 4,
    maxLevel: 3,
    costMult: 2,
    requires: ['crisis_bounty'],
    effect: 'crisis_reward'
  },
  {
    id: 'frenzy_thumb',
    name: 'Çılgın Başparmak',
    icon: '🔥',
    desc: 'SEÇİM: Yüklenme modu — tıklama gücü kalıcı 2×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'active',
    cost: 9,
    requires: ['caffeine_drip'],
    effect: 'click_mult',
    choiceGroup: 'thumb_duality'
  },
  {
    id: 'iron_patience',
    name: 'Demir Sabır',
    icon: '🛡️',
    desc: 'SEÇİM: Soğukkanlı mod — Vicdan Azabı primi kalıcı 2×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'active',
    cost: 9,
    requires: ['caffeine_drip'],
    effect: 'crisis_reward',
    choiceGroup: 'thumb_duality'
  },

  // ---- Hibrit Köprüler (iki daldan da gerektirir) ----
  {
    id: 'synaptic_bridge',
    name: 'Sinaptik Köprü',
    icon: '🌉',
    desc: 'Uyku ile refleks birleşir: koloni üreme hızı 1.5× katlanır.',
    branch: 'hybrid',
    cost: 8,
    requires: ['eye_drops', 'cps_sync'],
    effect: 'breed_rate'
  },
  {
    id: 'neural_symphony',
    name: 'Nöral Senfoni',
    icon: '🎼',
    desc: 'Botlar ve başparmak aynı orkestrada: tıklama gücü kalıcı 3× artar.',
    branch: 'hybrid',
    cost: 12,
    requires: ['neural_chip', 'combo_unlock'],
    effect: 'click_mult'
  },
  {
    id: 'apex_doomscroll',
    name: 'Apex Uroboros',
    icon: '🌀',
    desc: 'Ağacın zirvesi: evrensel kütle tekilliği — tüm üretim kalıcı 10× katlanır.',
    branch: 'hybrid',
    cost: 20,
    requires: ['prod_echo', 'caffeine_drip'],
    effect: 'production_mult'
  }
]

/** Eski düz dükkân id'leri: iki kayıt (ağaç + dükkân) bu id'lerde senkron tutulur */
export const NEURAL_LEGACY_UPGRADE_IDS: ReadonlySet<string> = new Set([
  'eye_drops',
  'muted_alerts',
  'fast_charger',
  'caffeine_drip',
  'neural_chip',
  'neural_nest',
  'guilt_immunity',
  'break_singularity'
])

/** Combo eşiği: seri sayısı bu değere ulaşınca çarpan devreye girer (UI için dışa açık) */
export const COMBO_THRESHOLDS: ReadonlyArray<{ count: number; mult: number }> = [
  { count: 5, mult: 2 },
  { count: 15, mult: 3 },
  { count: 40, mult: 5 }
]

/** Combo serisinin sönme süresi (ms) */
export const COMBO_DECAY_MS = 1500

/** CPS-to-click senkronu: taban %1, senkron düğümü seviyesi başına +%1, %5 tavan */
export const CPS_SYNC_BASE = 0.01
export const CPS_SYNC_PER_LEVEL = 0.01
export const CPS_SYNC_CAP = 0.05

/**
 * Satın alınan düğüm seviyelerinden sayısal etkileri hesaplar (saf fonksiyon).
 * state-only bağlamlarda (ör. (state) => ... getter'ları) doğrudan çağrılır.
 */
export function computeNeuralEffects(bought: Record<string, number>): NeuralEffects {
  const lvl = (id: string): number => bought[id] || 0
  const has = (id: string): boolean => lvl(id) > 0

  let productionMult = 1
  let clickMult = 1
  let offlineGainBonus = 0
  let crisisRewardMult = 1
  let breedRateMult = 1
  let botFrequencyMult = 1
  let dawnSpeedMult = 1

  if (lvl('prod_echo') > 0) productionMult *= Math.pow(1.25, lvl('prod_echo'))
  if (has('dream_lucid')) productionMult *= 1.75
  if (has('apex_doomscroll')) productionMult *= 10
  // Soft cap: tek deep run / nöral zincir patlamasını engeller (25× üstü logaritmik)
  if (productionMult > 25) productionMult = 25 + Math.log2(Math.max(1, productionMult / 25)) * 3

  if (has('click_momentum')) clickMult *= 1.3
  if (has('neural_symphony')) clickMult *= 3.0
  if (has('frenzy_thumb')) clickMult *= 2

  offlineGainBonus += lvl('offline_dream_weaver') * 0.25
  if (has('dream_ascetic')) offlineGainBonus += 0.5

  if (has('crisis_bounty')) crisisRewardMult *= 1.5
  if (has('iron_patience')) crisisRewardMult *= 2

  if (has('synaptic_bridge')) breedRateMult *= 1.5

  botFrequencyMult *= Math.pow(1.25, lvl('bot_overclock'))

  if (has('dawn_harbinger')) dawnSpeedMult *= 2.0

  return {
    productionMult,
    clickMult,
    offlineGainBonus,
    crisisRewardMult,
    breedRateMult,
    botFrequencyMult,
    dawnSpeedMult,
    cpsSyncLevel: Math.min(4, lvl('cps_sync')),
    comboUnlocked: has('combo_unlock')
  }
}
