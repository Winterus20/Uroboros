/**
 * Özellik Öğretimleri (P4a — §7.3 "İlk karşılaşmada anlat, sonrasında göster")
 *
 * Ne yapar:
 * Bir özellik (FEATURE_UNLOCKS kaydı) oyuncu için ilk kez AÇILDIĞINDA tek cümlelik
 * bir anlatım gösterilir. O andan itibaren yüzey saf görsel + sayısal kalır.
 *
 * Neden ayrı modül:
 * - İçerik saf veridir; store'dan veya DOM'dan bağımsızdır (Vitest kapsamı,
 *   AGENTS.md "src/game/* framework'süz" kuralı).
 * - Yazım ile mekanik ayrıdır: denge değişirse metin değişir, kod akışı değil.
 *
 * İletişim kulesi (plan §7.1): bu metin T4 seviyesindedir — yalnızca İLK
 * karşılaşmada kullanılır, sonra yüzey T0-T2'ye (renk/ramp/glif/oran) döner.
 * Bu yüzden metin kısa, tek cümle ve oyuncuya doğrudan hitap eden düz bir
 * dille yazılır: ne işe yarar, ne zaman devreye girer.
 *
 * KAPSAM: yalnızca GÖZLEMLENEBİLİR özellikler. `event_horizon_lens`,
 * `hawking_resonator` ve `cosmic_filament` UI'a bağlı değildir (boş kapılar);
 * oyuncu hiçbir şey görmediği için öğretim yazılmaz — aksi halde oyuncuya
 * var olmayan bir yüzey anlatılırdı (plan §1 "kilitli içerik metinsiz silüettir").
 */

/** Tek bir özelliğin ilk karşılaşma anlatımı. */
export interface FeatureTeaching {
  /** FEATURE_UNLOCKS içindeki özellik id'si (birebir eşleşir). */
  featureId: string
  /** Özelliğin adı — 1-3 kelime (T3 mikro etiket seviyesi). */
  title: string
  /**
   * TEK cümle: özelliğin ne işe yaradığı ve ne zaman devreye girdiği.
   * Hedef uzunluk 90-140 karakter (T4 seviyesi; tek ekranlık).
   */
  body: string
  /** Tek karakterlik kimlik glifi (Unicode dizgi karakteri — AD "Ω ∞ Ξ" taktiği). */
  glyph: string
}

export const FEATURE_TEACHINGS: Record<string, FeatureTeaching> = {
  crisis_spawn: {
    featureId: 'crisis_spawn',
    title: 'Kozmik Dalgalanmalar',
    body: 'Dopamin yükseldikçe ekranda dalgalanmalar belirir; tıklayınca 7× ya da 777× çekim patlaması gibi geçici bufflar kazanırsın.',
    glyph: '✦'
  },
  autobuyers: {
    featureId: 'autobuyers',
    title: 'Çekim Botları',
    body: 'Botlar sekmesi açıldı; buradan çekim botlarını açarak boyut ve Çekim Hızı alımlarını otomatikleştirebilirsin.',
    glyph: '⚙'
  },
  stance_spam: {
    featureId: 'stance_spam',
    title: 'Obur Çekim Duruşu',
    body: 'Çılgın Kaydırma duruşu tıklama gücünü 4 katına çıkarır ve anomali sıklığını artırır; üretim hızı değişmez.',
    glyph: '⚡'
  },
  crisis: {
    featureId: 'crisis',
    title: 'Kriz Yönetimi',
    body: 'Kriz sekmesi açıldı; reaktör ısısını düşürüp çıkan dilemma için karar vererek müdahale büyülerini kullanırsın.',
    glyph: '⚠'
  },
  stance_private: {
    featureId: 'stance_private',
    title: 'Vakum Kalkanı',
    body: 'Düşük Parlaklık duruşu Çekim Hızı alımlarının maliyetini %15 düşürür; üretim ve tıklama gücü olduğu gibi kalır.',
    glyph: '◐'
  },
  spell_espresso: {
    featureId: 'spell_espresso',
    title: 'Zaman Genleşmesi',
    body: 'Zaman Genleşmesi müdahalesi, ekrandaki tüm geçici güçlendirmelerin süresini 15 saniye uzatır; kriz anında kullanılır.',
    glyph: '☕'
  },
  spell_noise: {
    featureId: 'spell_noise',
    title: 'Manyetik Tahliye',
    body: 'Manyetik Tahliye müdahalesi bir kriyojenik kartuş harcayarak reaktör ısısını 35 puan soğutur ve parazitleri temizler.',
    glyph: '↯'
  },
  spell_sleep: {
    featureId: 'spell_sleep',
    title: 'Planck Patlaması',
    body: 'Planck Patlaması müdahalesi 20 saniye boyunca Çekim Hızını 4 kat, manuel yutma gücünü 10 kat yapar.',
    glyph: '☄'
  },
  colony: {
    featureId: 'colony',
    title: 'Rezonans Kolonisi',
    body: 'Kuantum Rezonans Kolonisi açıldı; izleme botları üretip Toplu Uyku ile hepsini birden pasif üretime bağlarsın.',
    glyph: '⬡'
  },
  lab: {
    featureId: 'lab',
    title: 'Parçacık Reaktörü',
    body: 'Laboratuvar sekmesi açıldı; dokuz hücreye tohum eker, büyüyünce hasat ederek pasif kütle ve kalıcı bonus kazanırsın.',
    glyph: '⚗'
  },
  seed_nucleon: {
    featureId: 'seed_nucleon',
    title: 'Ağır Nükleon',
    body: 'Ağır Nükleon Çekirdeği tohumu olgunlaşınca pasif kütleyi %35 artırır ve komşu hücreleri de güçlendirir.',
    glyph: '⚛'
  },
  seed_gluon: {
    featureId: 'seed_gluon',
    title: 'Gluon Bağlayıcı',
    body: 'Gluon Bağlayıcı tohumu olgunlaşınca manuel yutma gücünü iki katına çıkarır; komşu hücrelere de kuantum çökertme yayar.',
    glyph: '⊗'
  },
  time_clock: {
    featureId: 'time_clock',
    title: 'Zaman Yayı',
    body: 'Zaman Yayı ekranda belirip sarıldıkça gerginlik artar; salgı yaptığında üretim hızı yükselir, fazla sararsan zaman geri sarılır.',
    glyph: '⌛'
  },
  seed_graviton: {
    featureId: 'seed_graviton',
    title: 'Graviton Tuzağı',
    body: 'Graviton Tuzağı tohumu olgunlaşınca Kozmik Krizleri %50 sıklaştırır ve komşu hücrelerin üretimini 1,25 kat yapar.',
    glyph: '⬤'
  },
  guilt_slackers: {
    featureId: 'guilt_slackers',
    title: 'Kozmik Parazitler',
    body: 'Kozmik Parazitler ekranda belirip dopaminini emer; üst üste tıklayınca yuttuğu miktarın %120’sini geri alırsın.',
    glyph: '☣'
  },
  night_watch: {
    featureId: 'night_watch',
    title: 'Büyük Çöküş',
    body: 'Büyük Kozmik Çöküş eşiğini geçtin; Kolektif Gece Nöbeti açıldı ve dünya artık bozulma merdiveninde ilerliyor.',
    glyph: '☾'
  },
  challenges: {
    featureId: 'challenges',
    title: 'Meydan Okumalar',
    body: 'Kozmik Meydan Okumalar açıldı; her koşuda bir kural seçip hedefi tutturarak kalıcı çarpan ödülleri kazanabilirsin.',
    glyph: '⚑'
  }
}

/**
 * Bir özellik için öğretim metnini döndürür.
 * Kayıt yoksa `null` — çağıran taraf "bu özellik anlatılmaz" diye karar verir.
 */
export function getFeatureTeaching(featureId: string): FeatureTeaching | null {
  const teaching = FEATURE_TEACHINGS[featureId]
  return teaching ?? null
}
