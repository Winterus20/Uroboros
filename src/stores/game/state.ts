declare module '../../models/types' {
  interface SerializedPlayerState {
    lastViralAt?: number
  }
}

import { Decimal } from '../../core/math'
import { BASE_COSTS, BASE_UNLOCKED_DIMENSIONS, COST_MULTS, resolvedUnlockedDimensionCount } from '../../game/balance'
import { TIME_CLOCK_SPAWN_INTERVAL_MIN, createIdleTimeClock } from '../../game/clock-data'
import { VIRAL_DROP_COOLDOWN_SECONDS } from '../../game/lab-data'
import type { ActiveBuff, AutobuyerConfig, CrisisDilemma, DimensionData, FloatingAnomaly, GameSettings, GuiltWrinkler, LabCell, LabMode, LabSeedType, MusicTrackId, OfflineReport, PastSingularityRecord, PlayerStats, ScaleJumpRecord, StanceType } from '../../models/types'

export function buildInitialState() {
  // ADR-0072 §A: kutlama sayacının başlangıcı, kütle kapılarından türeyen açık
  // boyut sayısıyla HİZALI doğar (taban 3). Aksi hâlde ilk tick bunu "artış"
  // sanıp yeni oyunda sahte bir doğum kutlaması ateşlerdi.
  const initialUnlockedDimensions = resolvedUnlockedDimensionCount({
    dimensionCapFloor: BASE_UNLOCKED_DIMENSIONS,
    activeChallenge: null,
    lifetimePeakMatter: new Decimal(10)
  })
  return {
    // Temel Kaynak: DOPAMİN (Dopamine)
    matter: new Decimal(10),

    // 1-8 Reels İstasyonları (Kedi Videolarından Saf Beyin Çürümesine)
    dimensions: Array.from({ length: 8 }, (_, i): DimensionData => ({
      tier: i + 1,
      amount: new Decimal(0),
      bought: 0,
      baseCost: BASE_COSTS[i],
      costMult: COST_MULTS[i]
    })),

    tickspeedBought: 0, // Algoritma Frekansı (Hz) Seviyesi
    dimensionShifts: 0, // Akış Sıçraması (Feed Shift / Boost) Seviyesi
    dimensionCapFloor: BASE_UNLOCKED_DIMENSIONS, // Save v12 legacy min açık tier (ADR-0033: taban 3)
    formatDiscoverSeenCap: 3, // Kutlanmış / tanıtılmış max tier (yeni oyun 3; D4+ kütle kapısıyla açılır — ADR-0072)
    formatUnlockBuffTier: 0,
    formatUnlockBuffUntil: 0,
    // ADR-0072 §A: kütle kapısı kutlaması için "son kutlanan açık boyut sayısı".
    // UÇUCUDUR (kayıt edilmez): deserialize sonunda sessizce hizalanır, böylece
    // kayıt yükleme kutlama tetiklemez. Yalnızca canlı update() tick'inde artış
    // olduğunda celebrateDimensionUnlocks() ateşlenir.
    celebratedDimensionCap: initialUnlockedDimensions,
    galaxies: 0, // Sonsuz Akış Kümeleri
    singularityPoints: new Decimal(0), // Uykusuzluk / Şöhret Puanı (SP)
    singularities: 0,
    nightWatchUnlocked: false, // Faz 2 kilometre taşı: 1e308 Dopamin (Kolektif Gece Nöbeti)

    // Gece Duruşu (Trimps Stance)
    currentStance: 'trend' as StanceType,

    // Cookie Clicker: Aktif Buff'lar ve Gece Krizleri
    activeBuffs: [] as ActiveBuff[],
    floatingAnomalies: [] as FloatingAnomaly[],
    anomalyTimer: 0,
    nextAnomalyInterval: 65, // saniye
    mythicPity: 0, // Void Reel garanti sayacı (25 spawn'da 1 zorunlu void)

    // Vicdan Azabı ve Göz Batması (Wrinklers)
    slackers: [] as GuiltWrinkler[],
    slackerTimer: 0,

    // Zaman Yayı (Time Clock): ekranda beliren hızlandırma olayı.
    // Faz uçucudur (kayıt edilmez, reload'da idle'a döner); sayaçlar kalıcıdır.
    timeClock: createIdleTimeClock(),
    clockTimer: 0, // Bir sonraki doğuşa kalan süre sayacı (sn)
    nextClockInterval: TIME_CLOCK_SPAWN_INTERVAL_MIN, // Bu doğuşun hedef aralığı (sn)

    // Mini-Oyun 1: Algoritma Stüdyosu (Viral Matris & Trend Reaktörü)
    labCells: Array.from({ length: 9 }, (_, i): LabCell => ({
      id: i,
      seedType: null,
      age: 0,
      matureAge: 0,
      maxAge: 0,
      isMature: false
    })),
    labHype: 0,
    labMode: 'overdrive' as LabMode,
    discoveredFormulas: ['photon_resonator'] as LabSeedType[],
    reactorCollapseCount: 0,
    isViralActive: false,
    viralTimeRemaining: 0,
    viralViews: 0,
    // P1: son Süperkritik Boşalım damgası (totalPlaytime sn). Negatif başlangıç
    // ilk tetiklemeyi beklemesiz yapar; eski kayıtlarda da aynı varsayılır.
    lastViralAt: -VIRAL_DROP_COOLDOWN_SECONDS,

    // Mini-Oyun 2: Olay Ufku Kararsızlık Reaktörü ve Hibrit Kriz Sistemi (Crisis 3.0)
    reactorHeat: 0,
    reactorMeltdownTimer: 0,
    activeCrisisDilemma: null as CrisisDilemma | null,
    dilemmaCooldown: 0,
    caffeineEnergy: 0, // Geriye dönük uyumluluk state alanı
    maxCaffeineEnergy: 100,
    crisisBackfireDebuff: 0, // saniye cinsinden debuff sayacı
    reactorCoolantCharges: 3, // Kriyojenik Soğutucu Rezervi (maks 3)
    reactorCoolantTimer: 0, // Kartuş dolum sayacı (sn)
    reactorMomentum: 1.0, // Tatlı Nokta Rezonans Momenti (1.0x - 5.0x)
    reactorCooldowns: {} as Record<string, number>,

    // Otonom Çekim Botları (Autobuyers - Hibrit tekli/toplu/max)
    autobuyers: {
      dim1: { id: 'dim1', name: 'Moleküler Ayırıcı Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim2: { id: 'dim2', name: 'Orbital Vakum Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim3: { id: 'dim3', name: 'Çekirdek Sıyırıcı Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim4: { id: 'dim4', name: 'Kuark Emici Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim5: { id: 'dim5', name: 'Makro Çöküş Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim6: { id: 'dim6', name: 'Gezegen Tuzağı Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim7: { id: 'dim7', name: 'Yıldız Yutucu Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim8: { id: 'dim8', name: 'Samanyolu Tekillik Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      tickspeed: { id: 'tickspeed', name: 'Çekim Hızı (Hz) Botu', enabled: false, unlocked: false, mode: 'single', interval: 10.0, timer: 0 },
      shift: { id: 'shift', name: 'Ölçek Sıçraması Botu', enabled: false, unlocked: false, mode: 'single', interval: 15.0, timer: 0 },
      galaxy: { id: 'galaxy', name: 'Kozmik Kümeler Botu', enabled: false, unlocked: false, mode: 'single', interval: 20.0, timer: 0 },
      singularity: { id: 'singularity', name: 'Kozmik Çöküş Botu', enabled: false, unlocked: false, mode: 'single', interval: 10.0, timer: 0, minGainSp: 1 }
    } as Record<string, AutobuyerConfig>,
    autobuyerBulkUnlocked: false,
    autobuyerMaxUnlocked: false,

    // Şafak Nöbeti optimizatörü (marjinal kazanç modeli) — runtime-only, serialize edilmez
    singularityBotSamples: [] as number[], // saniyelik log10(matter) örnekleri (max 60)
    singularityDecelStreak: 0, // eğim düşüşü üst üste kaç saniyedir sürüyor
    singularityRunSeconds: 0, // son resetten beri geçen koşu süresi
    singularitySampleAcc: 0, // saniyelik örnekleme accumulator'ı

    // Kalıcı Uykusuzluk Dükkanı (SP Upgrades Seviyeleri)
    // SINGULARITY_UPGRADES'teki 8 id ile birebir tutarlı olmalı (kayıt göçü + ağaç senkronu bu anahtarları okur)
    singularityUpgrades: {
      eye_drops: 0,
      muted_alerts: 0,
      fast_charger: 0,
      caffeine_drip: 0,
      neural_chip: 0,
      neural_nest: 0,
      guilt_immunity: 0,
      break_singularity: 0
    } as Record<string, number>,

    // Nöral Ağaç: kalıcı SP yetenek ağacı satın alımları (prestijde sıfırlanmaz; hariç seçimler sıfırlanır)
    neuralNodesBought: {} as Record<string, number>,
    // Nöral Ağaç combo serisi: count 1.5 sn hareketsizlikte 0'a düşer
    clickCombo: { count: 0, lastClickAt: 0 },

    // Çevrimdışı simülasyon çarpanı (kayıt edilmez): Nöral Ağaç çevrimdışı kazanç düğümleri
    // yalnızca simulateOfflineProgress içinde 1'den büyük olur; normal tick'lerde davranışı değiştirmez.
    offlineSimBoost: 1,

    // QoL: çevrimdışı/arka plan yakalama raporu (kayıt edilmez) — Welcome Back modalı bunu gösterir
    offlineReport: null as OfflineReport | null,
    // QoL: simülasyon sırasında ses/konfeti spam'ini bastıran bayrak (kayıt edilmez)
    offlineSimActive: false,
    offlineAchTick: 0, // offline simülasyonda başarım kontrolü seyreltme sayacı
    // QoL: aktif oyun sekmesi (kayıt edilmez) — otomatik olaylar yalnızca
    // ilgili sekme açıkken kutlar (örn. lab oto-sentezi `lab` sekmesinde).
    activeGameTab: 'dimensions' as string,

    // QoL: saniyelik üretim geçmişi (Rapor sparkline, max 600 örnek; kayıt edilmez)
    dpsHistory: [] as number[],
    dpsSampleAcc: 0,
    // Performans: pahalı taramaların seyreltilmesi (kayıt edilmez)
    achCheckAcc: 0,
    unlockCheckAcc: 0,

    // Telemetri: Son 10 Sabah 06:00 Çöküşünün geçmişi (Antimatter Dimensions Past 10 modeli)
    pastSingularities: [] as PastSingularityRecord[],

    // ADR-0052: Ölçek sıçrama günlüğü (shift/galaxy/singularity; son 100 kayıt saklanır)
    jumpLog: [] as ScaleJumpRecord[],

    // ADR-0032: Hayat boyu ulaşılan dekad basamakları (bir kez talep edilir)
    // ADR-0034: Bu basamaklar artık SP vermez; koşu içi "Dekad Yükselişi" çarpanı verir.
    claimedBounties: [] as number[],
    // ADR-0034: Koşu içi yükselişi çarpanı (1 = yükseliş yok). SP değildir, kalıcı değildir:
    // şafak çöküşünde ve meydan okuma girişinde resetRunState() ile 1'e döner.
    // claimedBounties'tan türetilemez (o liste hayat boyu, bu koşuya özeldir) — bu yüzden kaydedilir.
    decadeSurgeMult: 1,

    // Önbelleği Temizleme (Dimension Sacrifice)
    sacrificeCount: 0,
    sacrificeMultiplier: new Decimal(1),

    // — Gece Krizi (Challenge) koşu durumu —
    activeChallenge: null as string | null,
    completedChallenges: [] as string[],
    challengeBestTimes: {} as Record<string, number>,
    challengeElapsed: 0, // aktif koşunun duvar-saati süresi (sn)
    challengeHaltUntil: 0, // C2: tam durma sayacı (sn; alımda productionHaltOnBuySec'e kurulur)
    challengeSinceBuy: 9999, // C2: son alımdan beri geçen süre (sn; 60 sn lineer rampa buradan okunur)
    challengeCostInflation: 0, // C5: koşu-içi birikimli maliyet şişme sayacı (Faz 3'te işler)
    challengeNotificationDoom: 0, // C8: bildirim sayacı 0-1+ (Faz 3'te işler)
    challengeDim1Growth: new Decimal(1), // C3: D1 üstel büyüme çarpanı (Faz 3'te işler)

    // Nöral İzleme Kolonisi (Otonom İzleme Botları & Toplu Uyku)
    neuralBots: new Decimal(0),
    napCount: 0,
    napMultiplier: new Decimal(1),

    // Başarımlar (Prestij dahil kalıcı — reset action'ları bu alana dokunmaz)
    achievements: [] as string[],
    achievementsSeenCount: 0,
    achievementToastQueue: [] as string[],

    // Kozmik Haber Bandı (ADR-0045) — görülen haberler & etkileşimli tıklama
    seenNewsIds: [] as string[],
    uselessNewsClicks: 0,
    hasClickedSecretNews: false,

    // Özellik Merdiveni (v0.11.0) — yapışkan (sticky) kilitleme listesi
    unlockedFeatures: [] as string[],

    // ADR-0035 — "Açılış bir olaydır, kapı değil": hayat boyu yüksek su seviyeleri.
    // `matter` Sıçrama/Küme/şafak ile sıfırlandığı için dopamin kapıları koşu içi
    // sayaca bakamaz; bu iki tepe nokta hiç inmez ve kayıtta saklanır (v15).
    // Tek yazım yolu: syncUnlocks() (update döngüsü + tüm reset giriş noktaları).
    lifetimePeakMatter: new Decimal(10), // oyun 10 dopaminle başlar
    lifetimePeakShifts: 0,

    lastUpdate: Date.now(),
    isSingularityReady: false,

    settings: {
      notation: 'standard' as const,
      decimalPlaces: 2,
      soundEnabled: true,
      soundVolume: 0.3,
      theme: 'cyberpunk' as const,
      musicEnabled: true,
      musicVolume: 0.35,
      musicTrack: 'lofi_chill' as MusicTrackId,
      vinylCrackle: true,
      rainEnabled: true,
      rainLevel: 0.5,
      musicIntensity: 0.5,
      sleepTimerMinutes: 0,
      customAudioUrl: '',
      confirmDialogs: true,
      reduceAnimations: false,
      motionMode: 'full' as const,
      screenShake: true,
      juiceMode: 'balanced' as const,
      screenOverlayEffects: true,
      sideHands: true,
      holoCardsEnabled: true,
      swirlShaderQuality: 'balanced' as const,
      sequentialStrike: true,
      batterySaver: false,
      floatingTexts: true,
      newsTickerEnabled: true,
      swipeSensitivity: 'balanced' as const,
      offlineProgressModal: true,
      hotkeysEnabled: true,
      activeSlot: 1
    } as GameSettings,

    stats: {
      manualClicks: 0, // Kaydırma Sayısı
      totalMatterProduced: new Decimal(10), // Toplam Dopamin
      highestMatter: new Decimal(10),
      totalPlaytime: 0,
      singularityCount: 0,
      fastestSingularity: Infinity,
      highestDps: new Decimal(0),
      totalManualDopamine: new Decimal(0),
      anomaliesClicked: 0,
      mythicsClicked: 0,
      combosTriggered: 0,
      slackersFired: 0,
      labHarvests: 0,
      spellsCast: 0,
      seedsPlanted: 0,
      challengesCompleted: 0,
      reactorCollapses: 0,
      // Zaman Yayı (Time Clock): yaşam boyu istatistikler — prestijden sağ çıkar,
      // `applyResetScope` bu alanlara dokunmaz (koşuya özel olan yalnızca canlı faz).
      clockRewinds: 0,
      clockRewoundSeconds: 0,
      clockBestTension: 0,
      clockPerfectReleases: 0,
      clockStreak: 0,
      clockBestStreak: 0
    } as PlayerStats
  }
}

export type GameState = ReturnType<typeof buildInitialState>
