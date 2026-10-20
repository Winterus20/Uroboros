import { Decimal } from '../core/math'
import type {
  AchievementCategoryId,
  AchievementDef,
  AchievementRewardKind
} from '../models/types'

// ---- Denge Sabitleri ----
// Taslak plandaki (×1.03 / ×1.10) değerler 56 başarımda toplam ×4.5+ veriyordu;
// onaylanan "tam sette ~×2.5-3" hedefini tutturmak için aşağı ayarlandı.
//
// P3.1b (plan §6/§4 — aile tamamlama kademeleri): "%100 satır dolunca ×1.06"
// ödülü kaldırıldı; yerine %25/%50/%75/%100 KADEME ödülü geldi.
// Toplam tavan ≈ AYNI kalır: 1.015^32 ≈ ×1.611 (eski 1.06^8 ≈ ×1.594) — fark
// tavanın büyümesi değil, ödemin İLK %25'TE, yani ilk koşuda da başlaması
// (sıradan oyuncu daha oyunun başında kademe çarpanını görür; eski sistemde
// 86/86 plaket gerekirdi ve çoğu oyuncu hiç ödeme almazdı).
export const PER_ACHIEVEMENT_MULT = 1.012
/** Aile tamamlanma eşikleri: %25 / %50 / %75 / %100 (gizli plaketler dahil). */
export const FAMILY_TIER_STEPS = [0.25, 0.5, 0.75, 1] as const
/** Aile kademesi başına ek küresel üretim çarpanı (8 aile × 4 kademe = 32). */
export const FAMILY_TIER_MULT = 1.015

/**
 * Aile kademesi başına ek SP (şöhret puanı) çarpanı — plan §10.1 O3.
 *
 * Tavan: 1 + 0.03 × 32 kademe = 1.96× (tüm aileleri tamamlayan oyuncu SP'yi
 * ~2 katına yakın kazanır).
 *
 * Bu çarpan ÜRETİM çarpanından (PER_ACHIEVEMENT_MULT / FAMILY_TIER_MULT)
 * BİLEREK AYRIDIR: biri kütle üretimini güçlendirir, diğeri prestij puanı
 * kazancını. İkisi aynı anda devrede olabilir, birbirinin yerine geçmez.
 */
export const SP_PER_FAMILY_TIER = 0.03

export interface AchievementCategoryMeta {
  id: AchievementCategoryId
  name: string
  desc: string
  icon: string
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = [
  { id: 'dopamine', name: 'Kozmik Kütle Açlığı', desc: 'Maddeyi yut, kütle biriktir. Olay ufkunun kaderi.', icon: '🌌' },
  { id: 'dimensions', name: 'Kütle Boyutları', desc: 'Moleküllerden Samanyolu\'na, çekim hızı ve ölçek sıçramaları.', icon: '⚛️' },
  { id: 'automation', name: 'Otonom Çekim Ağı', desc: 'Botları devreye sok, toplu ve maksimum çekime geç.', icon: '🤖' },
  { id: 'crisis', name: 'Kozmik Dalgalanmalar', desc: 'Kozmik anomaliler, süpernova patlamaları ve rezonans komboları.', icon: '✨' },
  { id: 'guilt', name: 'Kozmik Parazitler', desc: 'Olay ufkuna dadanırlar, kütle emerler, patlatılırlar.', icon: '👾' },
  { id: 'lab', name: 'Kuantum Laboratuvarı', desc: 'İzotop ek, reaksiyonu olgunlaştır, hasat et ve mutasyon yarat.', icon: '🔬' },
  { id: 'singularity', name: 'Kozmik Tekillik', desc: 'Büyük Çöküşü yaşa, SP biriktir, evrensel döngüyü sürdür.', icon: '🕳️' },
  { id: 'challenges', name: 'Kozmik Meydan Okumalar', desc: 'Uzay-zaman bozulmalarını ve Planck krizlerini aş.', icon: '🏆' }
]

// Eşik sabitleri (string tabanlı: float kayması yok)
const N1E6 = new Decimal('1e6')
const N1E12 = new Decimal('1e12')
const N1E30 = new Decimal('1e30')
const N1E50 = new Decimal('1e50')
const N1E75 = new Decimal('1e75')
const N1E105 = new Decimal('1e105')
const N1E140 = new Decimal('1e140')
const N1E180 = new Decimal('1e180')
const N1E225 = new Decimal('1e225')
const N1E270 = new Decimal('1e270')
const N1E308 = new Decimal('1e308')
const SP10 = new Decimal(10)
const SP1000 = new Decimal(1000)

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- 1. Kozmik Kütle Açlığı (ADR-0032: 0 → 1e308 ölçek merdiveni) ----
  { id: 'dop_first', name: 'İlk Kuantum Yutumu', desc: '1 kez kütle yut', icon: '🌌', category: 'dopamine', check: (c) => c.manualClicks >= 1 },
  { id: 'dop_100', name: 'Çekim Isınması', desc: '100 kez kütle yut', icon: '✨', category: 'dopamine', check: (c) => c.manualClicks >= 100 },
  { id: 'dop_1000', name: 'Obur Çekim Maratonu', desc: '1.000 kez kütle yut', icon: '🔥', category: 'dopamine', check: (c) => c.manualClicks >= 1000 },
  {
    id: 'dop_10k', name: 'Doyumsuz Tekillik', desc: '10.000 kez kütle yut', icon: '🌀', category: 'dopamine',
    reward: { kind: 'click_x2', desc: 'Kalıcı ödül: Manuel Çekim Gücü ×2' },
    check: (c) => c.manualClicks >= 10000
  },
  { id: 'dop_million', name: 'İlk Kütle Patlaması', desc: 'Toplam 1e6 g Kütle yut', icon: '📈', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E6) },
  { id: 'dop_trillion', name: 'Moleküler Çözünme', desc: 'Toplam 1e12 g Kütle yut', icon: '🪐', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E12) },
  { id: 'dop_baron', name: 'Kozmik Obur', desc: 'Toplam 1e30 g Kütle yut', icon: '👑', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E30) },
  { id: 'dop_50', name: 'Olay Ufku Nöbetçisi', desc: 'Toplam 1e50 g Kütle yut', icon: '🕳️', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E50) },
  { id: 'dop_75', name: 'Planck Duvarı Eşiği', desc: 'Toplam 1e75 g Kütle yut', icon: '⚡', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E75) },
  {
    id: 'dop_padisah', name: 'Yerçekimi Hükümdarı', desc: 'Toplam 1e105 g Kütle yut', icon: '💎', category: 'dopamine',
    reward: { kind: 'prod_x125', desc: 'Kalıcı ödül: Tüm kütle üretimi ×1.25' },
    check: (c) => c.totalMatter.gte(N1E105)
  },
  {
    id: 'dop_yasa', name: 'Termodinamik İhlali', desc: 'Toplam 1e140 g Kütle yut', icon: '📜', category: 'dopamine',
    reward: { kind: 'dim_cost_x085', desc: 'Kalıcı ödül: Boyut maliyetleri -%15' },
    check: (c) => c.totalMatter.gte(N1E140)
  },
  {
    id: 'dop_donus_yok', name: 'Işığın Kaçamadığı Nokta', desc: 'Toplam 1e180 g Kütle yut', icon: '⚡', category: 'dopamine',
    reward: { kind: 'click_x3', desc: 'Kalıcı ödül: Manuel Çekim Gücü ×3' },
    check: (c) => c.totalMatter.gte(N1E180)
  },
  {
    id: 'dop_sonsuz_akis', name: 'Sonsuz Çekim Alanı', desc: 'Toplam 1e225 g Kütle yut', icon: '🌌', category: 'dopamine',
    reward: { kind: 'shift_power_boost', desc: 'Kalıcı ödül: Ölçek Sıçraması tabanı 1.66 → 1.9' },
    check: (c) => c.totalMatter.gte(N1E225)
  },
  { id: 'dop_safak_yolu', name: 'Kozmik Çöküş Eşiği', desc: 'Toplam 1e270 g Kütle yut', icon: '💥', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E270) },
  {
    id: 'dop_tekillik', name: 'Evrensel Tekillik', desc: 'Toplam 1e308 g Kütle yut — Büyük Çöküş kapısı', icon: '☀️', category: 'dopamine',
    reward: { kind: 'prod_x2', desc: 'Kalıcı ödül: Tüm kütle üretimi ×2' },
    check: (c) => c.totalMatter.gte(N1E308)
  },
  { id: 'dop_247', name: 'Kozmik Gece Nöbeti', desc: 'Saat 02:00-03:00 arasında tekilliğe bağlan', icon: '🦉', category: 'dopamine', secret: true, check: (c) => c.wallHour === 2 },
  { id: 'dop_fake_news', name: 'Kozmik Parazit Sinyali', desc: '50 farklı haber bandı iletisi yakala', icon: '📰', category: 'dopamine', secret: true, check: (c) => c.seenNewsCount >= 50 },
  { id: 'dop_real_news', name: 'Doğrudan Kozmik İletim', desc: 'Tıklanabilir bir kozmik haber iletisine tıkla', icon: '📡', category: 'dopamine', secret: true, check: (c) => c.hasClickedSecretNews },

  // ---- 2. Kütle Boyutları ----
  { id: 'dim_d1', name: 'Bağları Parçala', desc: 'D1 Moleküler Bağlar katmanından 10 adet al', icon: '💧', category: 'dimensions', check: (c) => c.dimBought0 >= 10 },
  { id: 'dim_army', name: 'Kütleçekim Zinciri', desc: 'Toplam 100 kütle boyutu satın al', icon: '🪐', category: 'dimensions', check: (c) => c.dimBoughtTotal >= 100 },
  { id: 'dim_tick5', name: 'Çekim Hızı Yükseltmesi', desc: 'Çekim Hızı 5 Hz', icon: '📻', category: 'dimensions', check: (c) => c.tickspeedBought >= 5 },
  {
    id: 'dim_tick20', name: 'Hiper-Çekim Rezonansı', desc: 'Çekim Hızı 20 Hz', icon: '⚡', category: 'dimensions',
    reward: { kind: 'tickspeed_discount', desc: 'Kalıcı ödül: Çekim Hızı maliyeti -%5' },
    check: (c) => c.tickspeedBought >= 20
  },
  { id: 'dim_shift', name: 'İlk Ölçek Sıçraması', desc: '1 Ölçek Sıçraması yap', icon: '🎢', category: 'dimensions', check: (c) => c.shifts >= 1 },
  { id: 'dim_shift4', name: 'Galaktik Genişleme', desc: '4 Ölçek Sıçraması yap', icon: '🌌', category: 'dimensions', check: (c) => c.shifts >= 4 },
  { id: 'dim_galaxy', name: 'Kozmik Kütle Kümesi', desc: '1 Kütle Kümesi yarat', icon: '🌀', category: 'dimensions', check: (c) => c.galaxies >= 1 },
  { id: 'dim_fresh', name: 'Saf Tekillik', desc: 'Sıçrama/Küme yapmadan 1e6 g Kütleye ulaş', icon: '✨', category: 'dimensions', secret: true, check: (c) => c.matter.gte(N1E6) && c.shifts === 0 && c.galaxies === 0 },

  // ---- 3. Otonom Çekim Ağı ----
  { id: 'auto_first', name: 'İlk Otonom Çekici', desc: '1 bot kilidi aç', icon: '🤖', category: 'automation', check: (c) => c.unlockedBots.length >= 1 },
  { id: 'auto_half', name: 'Çekim Botu Filosu', desc: '6 bot kilidi aç', icon: '⚙️', category: 'automation', check: (c) => c.unlockedBots.length >= 6 },
  { id: 'auto_all', name: 'Kozmik Otonomi', desc: '11 botun tamamını aç', icon: '🧠', category: 'automation', check: (c) => c.unlockedBots.length >= 11 },
  { id: 'auto_bulk', name: 'Toplu Çekim Modu', desc: 'Toplu (Bulk) modunu aç', icon: '📦', category: 'automation', check: (c) => c.bulkUnlocked },
  { id: 'auto_max', name: 'Maksimum Olay Ufku', desc: 'Max modunu aç', icon: '🚀', category: 'automation', check: (c) => c.maxUnlocked },
  { id: 'auto_freq', name: 'Frekans Modülatörü', desc: 'Çekim Hızı (Hz) botunu aç', icon: '🎛️', category: 'automation', check: (c) => c.unlockedBots.includes('tickspeed') },
  { id: 'auto_shift', name: 'Sıçrama Operatörü', desc: 'Ölçek Sıçraması botunu aç', icon: '🔁', category: 'automation', check: (c) => c.unlockedBots.includes('shift') },
  { id: 'auto_galaxy', name: 'Küme Mimarı', desc: 'Kozmik Kümeler botunu aç', icon: '🛸', category: 'automation', secret: true, check: (c) => c.unlockedBots.includes('galaxy') },
  { id: 'colony_hatch', name: 'Kuantum Çekirdeği', desc: 'Nöral çekim kolonisini aktif et', icon: '🧠', category: 'automation', check: (c) => c.neuralBots.gt(0) },
  { id: 'colony_nap', name: 'Durgunluk Evresi', desc: '1 Koloni Durgunluk Döngüsü (Power Nap) yap', icon: '⏳', category: 'automation', check: (c) => c.napCount >= 1 },
  { id: 'colony_million', name: 'Milyonluk Alt-Sürü', desc: '1.000.000 nöral bot yetiştir', icon: '🐜', category: 'automation', secret: true, check: (c) => c.neuralBots.gte(N1E6) },

  // ---- 4. Kozmik Dalgalanmalar ----
  { id: 'cri_first', name: 'İlk Kozmik Dalgalanma', desc: '1 Kozmik Dalgalanmaya dokun', icon: '✨', category: 'crisis', check: (c) => c.anomaliesClicked >= 1 },
  { id: 'cri_10', name: 'Dalgalanma Avcısı', desc: '10 Kozmik Dalgalanmaya dokun', icon: '🎯', category: 'crisis', check: (c) => c.anomaliesClicked >= 10 },
  {
    id: 'cri_50', name: 'Kozmik Gözlemci', desc: '50 Kozmik Dalgalanmaya dokun', icon: '🔭', category: 'crisis',
    reward: { kind: 'anomaly_rate', desc: 'Kalıcı ödül: Dalgalanma sıklığı +%10' },
    check: (c) => c.anomaliesClicked >= 50
  },
  { id: 'cri_combo', name: 'Süper Rezonans', desc: 'İlk Süper Rezonans komboyu tetikle (Süpernova + Kütle Patlaması)', icon: '💥', category: 'crisis', check: (c) => c.combosTriggered >= 1 },
  { id: 'cri_void', name: 'Boşluk Tekilliği', desc: 'Nadir Boşluk Tekilliği anomalisini yakala', icon: '🌌', category: 'crisis', secret: true, check: (c) => (c.mythicsClicked || 0) >= 1 },
  { id: 'cri_combo5', name: 'Rezonans Ustası', desc: '5 Süper Rezonans kombo tetikle', icon: '💫', category: 'crisis', check: (c) => c.combosTriggered >= 5 },
  { id: 'cri_spell', name: 'İlk Alan Müdahalesi', desc: '1 kriz müdahale kararı al', icon: '⚡', category: 'crisis', check: (c) => c.spellsCast >= 1 },
  {
    id: 'cri_spells', name: 'Kriz Operatörü', desc: '10 kriz müdahale kararı al', icon: '🛡️', category: 'crisis',
    reward: { kind: 'buff_duration', desc: 'Kalıcı ödül: Dalgalanma buff süresi +%20' },
    check: (c) => c.spellsCast >= 10
  },
  { id: 'cri_100', name: 'Kozmik Anomali Müptelası', desc: '100 Kozmik Dalgalanmaya dokun', icon: '👁️', category: 'crisis', secret: true, check: (c) => c.anomaliesClicked >= 100 },

  // ---- 5. Kozmik Parazitler ----
  { id: 'gui_seen', name: 'İlk Çekim Paraziti', desc: 'Olay ufkunda 1 parazit belirsin', icon: '👀', category: 'guilt', check: (c) => c.activeSlackers >= 1 || c.slackersFired >= 1 },
  { id: 'gui_fired', name: 'Parazit Püskürtme', desc: '1 paraziti olay ufkuna fırlatarak yok et', icon: '💥', category: 'guilt', check: (c) => c.slackersFired >= 1 },
  { id: 'gui_5', name: 'Çekim Arındırıcı', desc: '5 paraziti yok et', icon: '🧹', category: 'guilt', check: (c) => c.slackersFired >= 5 },
  {
    id: 'gui_25', name: 'Geçirimsiz Olay Ufku', desc: '25 paraziti yok et', icon: '🗿', category: 'guilt',
    reward: { kind: 'leech_reduction', desc: 'Kalıcı ödül: Parazit kütle kaçağı -%15' },
    check: (c) => c.slackersFired >= 25
  },
  { id: 'gui_full', name: 'Parazit Kümelenmesi', desc: 'Aynı anda 5 parazit olay ufkunda olsun', icon: '👥', category: 'guilt', check: (c) => c.activeSlackers >= 5 },
  { id: 'gui_leech', name: 'Kütle Oburu Parazit', desc: 'Parazitler toplam 1e6 g Kütle emmiş olsun', icon: '🩸', category: 'guilt', check: (c) => c.leechedTotal.gte(N1E6) },
  { id: 'gui_drug', name: 'Parazit Yalıtkanı', desc: 'SP ağacından Parazit Kalkanı satın al', icon: '🛡️', category: 'guilt', check: (c) => c.guiltImmunityLvl >= 1 },
  { id: 'gui_100', name: 'Parazit Katili', desc: '100 paraziti yok et', icon: '⚔️', category: 'guilt', secret: true, check: (c) => c.slackersFired >= 100 },

  // ---- 6. Kuantum Laboratuvarı ----
  { id: 'lab_seed', name: 'İlk Kuantum Tohumu', desc: 'Kuantum hücresine 1 parçacık formatı ek', icon: '🌱', category: 'lab', check: (c) => c.seedsPlanted >= 1 },
  { id: 'lab_harvest', name: 'İlk Kuantum Hasadı', desc: '1 kuantum reaksiyonu hasat et', icon: '🌾', category: 'lab', check: (c) => c.labHarvests >= 1 },
  { id: 'lab_10', name: 'İzotop Araştırmacısı', desc: '10 kuantum reaksiyonu hasat et', icon: '🎧', category: 'lab', check: (c) => c.labHarvests >= 10 },
  {
    id: 'lab_25', name: 'Endüstriyel Kuantum Sentezi', desc: '25 kuantum reaksiyonu hasat et', icon: '🏗️', category: 'lab',
    reward: { kind: 'lab_yield', desc: 'Kalıcı ödül: Laboratuvar hasat verimi +%10' },
    check: (c) => c.labHarvests >= 25
  },
  { id: 'lab_mature3', name: 'Reaksiyon Dengesi', desc: 'Aynı anda 3 olgun reaksiyon hücresi', icon: '🌿', category: 'lab', check: (c) => c.matureCells >= 3 },
  { id: 'lab_full', name: 'Kritik Kütle Matrisi', desc: 'Aynı anda 9 olgun reaksiyon hücresi', icon: '🎛️', category: 'lab', check: (c) => c.matureCells >= 9 },
  { id: 'lab_mutant', name: 'Kozmik Mutasyon', desc: 'Kararsız mutant izotop filizlensin', icon: '👾', category: 'lab', check: (c) => c.hasBrainrot },
  { id: 'lab_mutant2', name: 'Saf Tekillik İzotopu', desc: 'Mutant reaksiyon olgunlaşsın', icon: '🧬', category: 'lab', secret: true, check: (c) => c.hasMatureBrainrot },

  // ---- 7. Kozmik Tekillik ----
  { id: 'sin_sight', name: 'Olay Ufkunun Şafağı', desc: '1e30 g Kütleye ulaş (Tekillik sekmesi açılır)', icon: '🌇', category: 'singularity', check: (c) => c.matter.gte(N1E30) },
  {
    id: 'sin_first', name: 'İlk Büyük Çöküş', desc: 'İlk Kozmik Tekillik Çöküşünü yaşa', icon: '🌅', category: 'singularity',
    reward: { kind: 'caffeine_regen', desc: 'Kalıcı ödül: Plazma enerjisi dolum hızı +%25' },
    check: (c) => c.singularityCount >= 1
  },
  {
    id: 'sin_3', name: 'Üç Çöküş Döngüsü', desc: '3 Tekillik yaşa', icon: '🌠', category: 'singularity',
    reward: { kind: 'starting_matter', desc: 'Kalıcı ödül: Büyük Çöküş sonrası 1.000 g Kütle ile başla' },
    check: (c) => c.singularityCount >= 3
  },
  {
    id: 'sin_sp', name: 'Tekillik Rezervi', desc: '10 SP biriktir', icon: '🏦', category: 'singularity',
    reward: { kind: 'caffeine_boost', desc: 'Kalıcı ödül: Kuantum Plazma Akışı +%25 güçlü' },
    check: (c) => c.sp.gte(SP10)
  },
  {
    id: 'sin_shop', name: 'Tekillik Ağacı', desc: 'Nöral ağaçta toplam 3 seviye al', icon: '🛒', category: 'singularity',
    reward: { kind: 'sp_discount', desc: 'Kalıcı ödül: SP yükseltme maliyetleri -%5' },
    check: (c) => c.spUpgradesTotal >= 3
  },
  { id: 'sin_hour', name: 'Bir Saatlik Tekillik', desc: 'Toplam 1 saat oyna', icon: '⏰', category: 'singularity', check: (c) => c.playtime >= 3600 },
  { id: 'sin_3h', name: 'Kozmik Mesai', desc: 'Toplam 3 saat oyna', icon: '🕰️', category: 'singularity', check: (c) => c.playtime >= 10800 },
  { id: 'sin_whale', name: 'Kozmik Hükümdar', desc: '1.000 SP biriktir', icon: '🏆', category: 'singularity', secret: true, check: (c) => c.sp.gte(SP1000) },

  // ---- 8. Kozmik Meydan Okumalar (her Kriz'e 1; koşu ödülü challenge'dan, buradaki plaket global çarpana işler) ----
  { id: 'chl_c1', name: 'İzolasyonun Sonu', desc: 'Vakum İzolasyonu meydan okumasını tamamla', icon: '🕳️', category: 'challenges', check: (c) => c.completedChallenges.includes('c1') },
  { id: 'chl_c2', name: 'Durgunluk Kırılması', desc: 'Kütleçekim Durgunluğu meydan okumasını tamamla', icon: '⚡', category: 'challenges', check: (c) => c.completedChallenges.includes('c2') },
  { id: 'chl_c3', name: 'Kuantum Kararlılığı', desc: 'Kuantum Kararsızlığı meydan okumasını tamamla', icon: '🌱', category: 'challenges', check: (c) => c.completedChallenges.includes('c3') },
  { id: 'chl_c4', name: 'Kırık Simetri Fatihi', desc: 'Simetri Kırılması meydan okumasını tamamla', icon: '🚫', category: 'challenges', check: (c) => c.completedChallenges.includes('c4') },
  { id: 'chl_c5', name: 'Enflasyon Fatihi', desc: 'Kozmik Enflasyon meydan okumasını tamamla', icon: '📈', category: 'challenges', check: (c) => c.completedChallenges.includes('c5') },
  { id: 'chl_c6', name: 'Zamanın Efendisi', desc: 'Zaman Genleşmesi meydan okumasını tamamla', icon: '⏳', category: 'challenges', check: (c) => c.completedChallenges.includes('c6') },
  { id: 'chl_c7', name: 'Boyut Yırtıcı', desc: 'Boyutsal Çöküş meydan okumasını tamamla', icon: '🔒', category: 'challenges', check: (c) => c.completedChallenges.includes('c7') },
  { id: 'chl_c8', name: 'Fırtına Dindirici', desc: 'Radyasyon Fırtınası meydan okumasını tamamla', icon: '☢️', category: 'challenges', secret: true, check: (c) => c.completedChallenges.includes('c8') }
]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export function categoryDefs(categoryId: AchievementCategoryId): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === categoryId)
}

export function isCategoryComplete(categoryId: AchievementCategoryId, unlockedIds: readonly string[]): boolean {
  return categoryDefs(categoryId).every((a) => unlockedIds.includes(a.id))
}

export function countCompletedRows(unlockedIds: readonly string[]): number {
  return ACHIEVEMENT_CATEGORIES.filter((c) => isCategoryComplete(c.id, unlockedIds)).length
}

// ---- Aile Tamamlama Kademeleri (P3.1b) ----
/**
 * Tek bir ailenin (kategori) kademe sayısı: 0..4.
 * Kural: unlocked/total >= FAMILY_TIER_STEPS[i] ise o kademe sayılır.
 * Gizli/secret plaketler de paydadadır — eski "tam satır" semantiğiyle aynı
 * kapsam, yalnızca %100 yerine dört ayrı eşiğe bölünmüş hâli.
 */
export function familyTierCount(
  categoryId: AchievementCategoryId,
  unlockedIds: readonly string[]
): number {
  const defs = categoryDefs(categoryId)
  const total = defs.length
  if (total === 0) return 0
  const unlocked = defs.filter((a) => unlockedIds.includes(a.id)).length
  const ratio = unlocked / total
  return FAMILY_TIER_STEPS.filter((step) => ratio >= step).length
}

/**
 * 8 ailenin kademe toplamı: 0..32 (8 × 4).
 * Bilinmeyen id'ler tanımlar üzerinden sayılmadığı için kademe artırmaz
 * (ADR-0031 beyaz liste korumasıyla uyumlu).
 */
export function countFamilyTiers(unlockedIds: readonly string[]): number {
  return ACHIEVEMENT_CATEGORIES.reduce(
    (sum, c) => sum + familyTierCount(c.id, unlockedIds),
    0
  )
}

/**
 * Başarım aile kademelerinden üretilen SP (şöhret puanı) çarpanı — plan §10.1 O3.
 *
 * Yeni bir reward türü açmadan mevcut kademe sayacını (countFamilyTiers)
 * yeniden kullanır: kayıttan gelen id listesinden YALNIZCA gerçekten var olan
 * başarımlar sayılır, bilinmeyen id hiçbir kademeyi artırmaz (ADR-0031 beyaz
 * liste koruması — bozuk kayıt SP çarpanını şişiremez).
 *
 * Kademe başına SP_PER_FAMILY_TIER (0.03) kademe SABİTTİR: oyuncu ilerledikçe
 * çarpan artar, hiçbir koşu içi sayaçla (üretim gibi) dalgalanmaz.
 */
export function achievementSpMult(unlockedIds: readonly string[]): number {
  return 1 + SP_PER_FAMILY_TIER * countFamilyTiers(unlockedIds)
}

// Global kalıcı çarpan: 1.012^(başarım) × 1.015^(aile kademesi). SP kazancına uygulanmaz.
export function calcAchievementMultiplier(unlockedIds: readonly string[]): Decimal {
  const per = Decimal.pow(PER_ACHIEVEMENT_MULT, unlockedIds.length)
  const tiers = Decimal.pow(FAMILY_TIER_MULT, countFamilyTiers(unlockedIds))
  return per.times(tiers)
}

export function hasAchievementReward(unlockedIds: readonly string[], kind: AchievementRewardKind): boolean {
  return ACHIEVEMENTS.some((a) => a.reward?.kind === kind && unlockedIds.includes(a.id))
}
