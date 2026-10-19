import { Decimal } from '../core/math'
import { ARC_LOG10_MAX, decadeGate } from './pacing'
import { branchProgress, getBranchGate } from './branches'

/**
 * Özellik Merdiveni (Progressive Feature Unlock)
 *
 * Tasarım prensibi (ADR-0009): kilitlemeler state'ten türetilir; bir kez açılan
 * özellik `unlockedFeatures` listesiyle yapışkan (sticky) kalır.
 *
 * ADR-0032 — dekad omurgası: eski merdiven 13 basamağın hepsini log10 ≈ 26'da
 * açıyordu (koşunun ilk %17'si), sonra 278 dekad boş kalıyordu. Ölçüm:
 * brain/scratchpad/harness/results-308-audit.json.
 *
 * Artık her basamak bir dekad eşiğine bağlıdır ve 0 → 308 boyunca yayılır.
 * `dimBought` kapıları bilinçli olarak merdivenden çıkarıldı: satın alınan
 * boyut sayıları sıçramalarda birikiyor (ölçümde D8×190, 17 sıçrama), bu yüzden
 * "şu kadar D4" kapısı hangi dekada açılacağını öngörülebilir biçimde ifade
 * edemiyordu. Dekad kapısı kesin, deterministik ve 308 hedefini doğrudan gösterir.
 * `dimBought` kapıları yalnızca boyut keşfi teaser'larında (DimensionsTab) kalır.
 *
 * ADR-0035 — açılış bir OLAY'dır, kapı değil. Dopamin kapıları artık koşu içi
 * `matter` yerine `lifetimePeakMatter` (hayat boyu tepe nokta) üzerinden
 * değerlendirilir: Sıçrama / Küme / şafak dopamini sıfırladığında açılan özellik
 * yeniden kilitlenmez. `unlockedFeatures` listesi (ADR-0009) 0.5 sn'lik senkron
 * penceresinde kaçabildiği için asıl kayıt bu tepe noktadır; liste yalnızca
 * "hangi özellikler açıldı" ayrıntısı ve UI ipucu olarak kalır.
 */

export type UnlockReq =
  | { kind: 'dimBought'; tier: number; count: number } // Dn formatını X adet sahibi ol
  | { kind: 'dopamine'; amount: string } // X Dopamin biriktir
  | { kind: 'shifts'; count: number } // X Akış Sıçraması yap
  | { kind: 'galaxies'; count: number } // X Akış Kümesi yap
  | { kind: 'singularities'; count: number } // X Tekillik (prestij) yaşa
  | { kind: 'anomalies'; count: number } // X Gece Krizi yakala
  | { kind: 'spellsCast'; count: number } // X Gece Kararı al

export interface UnlockContext {
  matter: Decimal
  /**
   * Hayat boyu ulaşılan en yüksek dopamin (ADR-0035).
   *
   * Koşu içi `matter` Sıçrama/Küme/şafak ile sıfırlandığı için tek başına
   * "açıldım mı?" sorusuna cevap veremez. Bu alan su seviyesidir: bir kez
   * yükseldi mi bir daha inmez. `unlockedFeatures` listesinin (ADR-0009) 0.5 sn'lik
   * senkron penceresini kapatır — botun otomatik sıçraması ya da çevrimdışı
   * ilerleme adımı listeye yazılmadan reset çalıştırırsa bile kapı açık kalır.
   *
   * Opsiyoneldir: alan yoksa (eski kayıt, harici bağlam) davranış `matter`'a düşer.
   */
  lifetimePeakMatter?: Decimal
  dimensions: Array<{ amount: Decimal; bought: number }>
  dimensionShifts: number
  galaxies: number
  singularities: number
  spellsCast: number
  anomaliesClicked: number
  /**
   * Kazanılan başarım id'leri (P3.1 — başarım kapılı dallar).
   *
   * Dekad eşiği aşılsa bile dal gate'li bir özelliğin GERÇEK açılışı bu
   * listeden gelir. Opsiyoneldir: alan yoksa (eski kayıt, harici bağlam)
   * tüketiciler `?? []` ile boş liste sayar — hiçbir dal boş listeden
   * açılmaz. Store tarafındaki kaynak: `state.achievements`.
   */
  achievements?: readonly string[]
}

/**
 * İki Decimal'dan büyüğünü döndürür; NaN tarafı yok sayılır.
 * AGENTS.md: `dec.isNan() || Number.isNaN(dec.mag)`.
 */
export function raisedLifetimePeak(current: Decimal, candidate: Decimal | undefined): Decimal {
  const curBad = current.isNan() || Number.isNaN(current.mag)
  const candBad = !candidate || candidate.isNan() || Number.isNaN(candidate.mag)
  if (curBad && candBad) return new Decimal(0)
  if (curBad) return candidate as Decimal
  if (candBad) return current
  return candidate!.gt(current) ? candidate! : current
}

/**
 * Bir kilit kapısının değerlendirileceği "etkin dopamin": koşu içi miktar ile
 * hayat boyu tepe noktasından büyüğü. AÇILIŞ BİR OLAYDIR, KAPI DEĞİL.
 */
export function lifetimeUnlockDopamine(
  matter: Decimal,
  lifetimePeakMatter?: Decimal
): Decimal {
  return raisedLifetimePeak(matter, lifetimePeakMatter)
}

/**
 * Dopamin kapısı aşıldı mı? Tek doğru kaynak: `checkUnlock` ve dışarıdaki
 * görünürlük kontrolleri (örn. Şafak sekmesi) hep bu fonksiyonu çağırır.
 */
export function meetsDopamineGate(
  matter: Decimal,
  lifetimePeakMatter: Decimal | undefined,
  amount: string
): boolean {
  const peak = lifetimeUnlockDopamine(matter, lifetimePeakMatter)
  if (peak.isNan() || Number.isNaN(peak.mag)) return false
  return peak.gte(new Decimal(amount))
}

export interface FeatureUnlock {
  id: string
  name: string
  hint: string
  req: UnlockReq
  order: number
}

export function buildUnlockContext(state: {
  matter: Decimal
  lifetimePeakMatter?: Decimal
  dimensions: Array<{ amount: Decimal; bought: number }>
  dimensionShifts: number
  galaxies: number
  singularities: number
  stats?: { spellsCast?: number; anomaliesClicked?: number }
  /** Kazanılan başarım id'leri (P3.1). Yoksa boş liste sayılır. */
  achievements?: readonly string[]
}): UnlockContext {
  return {
    matter: state.matter,
    lifetimePeakMatter: state.lifetimePeakMatter,
    dimensions: state.dimensions,
    dimensionShifts: state.dimensionShifts,
    galaxies: state.galaxies,
    singularities: state.singularities,
    spellsCast: state.stats?.spellsCast || 0,
    anomaliesClicked: state.stats?.anomaliesClicked || 0,
    // P3.1: başarım listesi bağlama gerçekten iletilir; eski kayıt / alan yoksa
    // `?? []` boş listeye düşer ve hiçbir dal kapısı açılmaz (softlock değil:
    // omurga dekad kapıları achievements'tan bağımsız çalışmaya devam eder).
    achievements: state.achievements ?? []
  }
}

/**
 * Görünürlük = özelliğin KENDİ şartı (dekad / sayaç kapısı); DAL KATMANI YOK.
 *
 * UI siluetini bu ayırır (P3.2): false → şart henüz geçmedi (görünmez),
 * true ama `checkUnlock` false → dekad geçti, başarım eksik (siluet + ipucu).
 * GERÇEK açılış her zaman `checkUnlock`'dur (dal katmanı dahil edilmiş hâli).
 */
export function checkVisibility(ctx: UnlockContext, feature: FeatureUnlock): boolean {
  const req = feature.req
  switch (req.kind) {
    case 'dimBought': {
      const dim = ctx.dimensions[req.tier - 1]
      return !!dim && dim.bought >= req.count
    }
    case 'dopamine':
      // ADR-0035: dopamin sıfırlandığında açılım geri alınmaz. Kapı koşu içi
      // `matter` yerine hayat boyu tepe noktasına bakar (bkz. lifetimeUnlockDopamine).
      return meetsDopamineGate(ctx.matter, ctx.lifetimePeakMatter, req.amount)
    case 'shifts':
      return ctx.dimensionShifts >= req.count
    case 'galaxies':
      return ctx.galaxies >= req.count
    case 'singularities':
      return ctx.singularities >= req.count
    case 'anomalies':
      return ctx.anomaliesClicked >= req.count
    case 'spellsCast':
      return ctx.spellsCast >= req.count
  }
}

/**
 * Dekad kapısı görünürlüğü verir; başarım kapısı (P3.1) GERÇEK açılışı verir:
 * kendi şartı sağlansa bile dal kilitliyse özellik KİLİTLİ kalır. Spine
 * (omurga) özelliklerinin gate'i yoktur, davranışları değişmez.
 */
export function checkUnlock(ctx: UnlockContext, feature: FeatureUnlock): boolean {
  if (!checkVisibility(ctx, feature)) return false
  const gate = getBranchGate(feature.id)
  if (gate && !branchProgress(gate, ctx.achievements ?? []).unlocked) return false
  return true
}

export function unlockProgress(
  ctx: UnlockContext,
  feature: FeatureUnlock
): { current: number; target: number } {
  // P3.1: dal kapısı devrede (dekad eşiği aşıldı) ilerleme artık başarım
  // sayısına geçer: mevcut güvenli başarım / hedef; dekad öncesi eski davranış.
  // `current` hedefe kırpılır (safe listesi hedeften uzun olabilir, bkz. colony),
  // böylece "progress >= target" = checkUnlock sözleşmesi korunur.
  const gate = getBranchGate(feature.id)
  if (gate && checkVisibility(ctx, feature)) {
    const gateProgress = branchProgress(gate, ctx.achievements ?? [])
    return { current: Math.min(gateProgress.current, gateProgress.target), target: gateProgress.target }
  }
  const req = feature.req
  switch (req.kind) {
    case 'dimBought': {
      const dim = ctx.dimensions[req.tier - 1]
      const current = dim ? dim.bought : 0
      return { current: Math.min(current, req.count), target: req.count }
    }
    case 'dopamine': {
      const target = new Decimal(req.amount)
      // İlerleme de aynı su seviyesini okur: reset sonrası çubuk geriye gitmez.
      const peak = lifetimeUnlockDopamine(ctx.matter, ctx.lifetimePeakMatter)
      const isBad = peak.isNan() || Number.isNaN(peak.mag)
      const current = isBad ? new Decimal(0) : peak.gt(target) ? target : peak
      return { current: current.toNumber(), target: target.toNumber() }
    }
    case 'shifts':
      return { current: Math.min(ctx.dimensionShifts, req.count), target: req.count }
    case 'galaxies':
      return { current: Math.min(ctx.galaxies, req.count), target: req.count }
    case 'singularities':
      return { current: Math.min(ctx.singularities, req.count), target: req.count }
    case 'anomalies':
      return { current: Math.min(ctx.anomaliesClicked, req.count), target: req.count }
    case 'spellsCast':
      return { current: Math.min(ctx.spellsCast, req.count), target: req.count }
  }
}

/**
 * İlerleme çubuğu için 0..1 oran.
 *
 * ADR-0032: `unlockProgress` dopamin dalında `toNumber()` döndürdüğü için 1e308
 * ve üzeri hedeflerde `Infinity / Infinity` üretiyordu (NaN yüzde). Dopamin
 * kapıları logaritmik ölçekte ölçülür — 1e30 → 1e308 aralığı doğrusal ölçekte
 * pratikte "sıfır ilerleme" gibi görünürdü.
 *
 * ADR-0035: ölçüm koşu içi `matter` yerine hayat boyu tepe noktasından yapılır;
 * böylece reset sonrası çubuk sıfıra düşmez.
 */
export function unlockProgressFraction(ctx: UnlockContext, feature: FeatureUnlock): number {
  // P3.1: dal kapısı devredeyken oran LINEERDİR (mevcut / hedef başarım sayısı):
  // başarım sayacı 0..N aralığında ilerler; logaritmik ölçek yalnızca dekad
  // aşamasındaki dopamin kapısında uygulanır.
  const gate = getBranchGate(feature.id)
  if (gate && checkVisibility(ctx, feature)) {
    const { current, target } = unlockProgress(ctx, feature)
    if (target <= 0) return 1
    return Math.max(0, Math.min(1, current / target))
  }
  const req = feature.req
  if (req.kind === 'dopamine') {
    const peak = lifetimeUnlockDopamine(ctx.matter, ctx.lifetimePeakMatter)
    if (peak.isNan() || Number.isNaN(peak.mag)) return 0
    const target = log10Of(new Decimal(req.amount))
    if (!Number.isFinite(target) || target <= 0) return 0
    const current = Math.min(log10Of(peak), target)
    return Math.max(0, Math.min(1, current / target))
  }
  const { current, target } = unlockProgress(ctx, feature)
  if (target <= 0) return 0
  return Math.max(0, Math.min(1, current / target))
}

function log10Of(matter: Decimal): number {
  if (matter.isNan() || Number.isNaN(matter.mag)) return 0
  const l = matter.log10()
  if (l.isNan() || Number.isNaN(l.mag)) return 0
  return l.toNumber()
}

/**
 * Dekad merdiveni (ADR-0032).
 *
 * `order` alanı doğrudan dekad üssünün 10 katıdır: nextLocked() küçük order'ı
 * seçtiği için merdivenin görünür sırası ve zamanlaması aynı sayıdan gelir.
 * Hedef süreler, brain/scratchpad/harness ölçümündeki active profilinin geçtiği
 * dekadlara göre konmuştur (300 dk'lık mevcut koşu; ölçüm düzeltmesiyle
 * 240 dk bandına iner).
 */
export const FEATURE_UNLOCKS: FeatureUnlock[] = [
  {
    id: 'crisis_spawn',
    name: 'Kozmik Dalgalanmalar',
    hint: '1.000 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(3) },
    order: 10
  },
  {
    id: 'autobuyers',
    name: 'Otonom Çekim Botları Sekmesi',
    hint: '1.000.000.000 (1e9) g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(9) },
    order: 90
  },
  {
    id: 'stance_spam',
    name: 'Obur Çekim Duruşu',
    hint: '1e14 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(14) },
    order: 140
  },
  {
    id: 'stance_private',
    name: 'Vakum Kalkanı Duruşu',
    hint: '1e18 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(18) },
    order: 180
  },
  {
    id: 'colony',
    name: 'Kuantum Rezonans Kolonisi',
    hint: '1e22 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(22) },
    order: 220
  },
  {
    id: 'crisis',
    name: 'Olay Ufku Kriz Yönetimi Sekmesi',
    hint: '1e28 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(28) },
    order: 280
  },
  {
    id: 'spell_espresso',
    name: 'Zaman Genleşmesi Müdahalesi',
    hint: '1e34 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(34) },
    order: 340
  },
  {
    id: 'spell_noise',
    name: 'Manyetik Tahliye Müdahalesi',
    hint: '1e42 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(42) },
    order: 420
  },
  {
    id: 'spell_sleep',
    name: 'Planck Patlaması Müdahalesi',
    hint: '1e52 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(52) },
    order: 520
  },
  {
    id: 'lab',
    name: 'Kuantum Parçacık Reaktörü Sekmesi',
    hint: '1e65 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(65) },
    order: 650
  },
  {
    id: 'seed_nucleon',
    name: 'Ağır Nükleon Çekirdeği (⚛️)',
    hint: '1e80 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(80) },
    order: 800
  },
  {
    id: 'seed_gluon',
    name: 'Gluon Bağlayıcı (🌀)',
    hint: '1e100 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(100) },
    order: 1000
  },
  {
    id: 'time_clock',
    name: 'Zaman Yayı (Time Clock)',
    hint: '1e120 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(120) },
    order: 1200
  },
  {
    id: 'seed_graviton',
    name: 'Graviton Tuzağı (🕳️)',
    hint: '1e125 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(125) },
    order: 1250
  },
  {
    id: 'guilt_slackers',
    name: 'Kozmik Parazitler (Wrinklers)',
    hint: '1e160 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(160) },
    order: 1600
  },
  {
    id: 'event_horizon_lens',
    name: 'Olay Ufku Merceği',
    hint: '1e200 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(200) },
    order: 2000
  },
  {
    id: 'hawking_resonator',
    name: 'Hawking Rezonatörü',
    hint: '1e240 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(240) },
    order: 2400
  },
  {
    id: 'cosmic_filament',
    name: 'Kozmik İplikçik Dokuması',
    hint: '1e280 g Kütle biriktir',
    req: { kind: 'dopamine', amount: decadeGate(280) },
    order: 2800
  },
  {
    id: 'night_watch',
    name: 'Büyük Kozmik Çöküş',
    hint: `1e${ARC_LOG10_MAX} g Kütle biriktir — Tekillik eşiği`,
    req: { kind: 'dopamine', amount: decadeGate(ARC_LOG10_MAX) },
    order: ARC_LOG10_MAX * 10
  },
  {
    id: 'challenges',
    name: 'Kozmik Meydan Okumalar',
    hint: '1 Kozmik Çöküş yaşa',
    req: { kind: 'singularities', count: 1 },
    order: ARC_LOG10_MAX * 10 + 10
  }
]

export function getFeatureById(id: string): FeatureUnlock | null {
  return FEATURE_UNLOCKS.find((f) => f.id === id) || null
}

/** Kilitli kalan ilk özellik (merdivenin sıradaki basamağı) */
export function nextLocked(
  ctx: UnlockContext,
  unlockedIds: Set<string>
): FeatureUnlock | null {
  let best: FeatureUnlock | null = null
  for (const feature of FEATURE_UNLOCKS) {
    if (unlockedIds.has(feature.id)) continue
    if (checkUnlock(ctx, feature)) continue
    if (!best || feature.order < best.order) best = feature
  }
  return best
}
