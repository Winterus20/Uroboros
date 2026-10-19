# Tempo & Ekonomi Yeniden Tasarımı — Dikey/Yatay Denge, Başarım Kapısı, Fiyat Eğrisi, Shift Yeniden Görevlendirme

> **Tarih:** 2026-10-19 · **Kaynak:** kullanıcı tasarım görüşmesi (kararlar §0)
> **Durum:** TASARIM — uygulama başlamadı · ADR henüz açılmadı (uygulama öncesi ADR-0070 önerilir)
> **İlgili mevcut kararlar:** ADR-0023 (3s30d altın standart), ADR-0026 (yumuşak erken merdivenler), ADR-0031 (mimari), ADR-0032 (dekad omurgası), ADR-0033 (3 boyutlu başlangıç + D4 sıçramada), ADR-0035 (açılış bir OLAYdır), ADR-0051 (kademeli maliyet ivmelenmesi)

---

## 0. Kullanıcı Kararları (bu planın kaynağı)

1. **Şişkinlik teşhisi kabul edildi:** oyun ilk 10 dakikada oyuncuya çoğu şeyi gösteriyor;
   ilerleme **dikey ve yatay olarak dengelenmeli**.
2. **İçerik açılışları başarımlara bağlanmalı** (melez model — §2).
3. **Fiyat artışları güçlendirilmeli:** boyut ve güçlendirme fiyatlarındaki artış az geliyor (§3).
4. **Shift yeniden görevlendirilecek:** ilk sıçramalar D3/D4/D5 açmak için kullanılmayacak;
   sıçrama, **D8 açıldıktan sonra hızlandırmaya** hizmet edecek (§4).

---

## 1. Dikey/Yatay Denge — İlk 10 Dakika Kontratı

**Sorun (ölçülmüş):** dekad omurgası (ADR-0032) 308 dekada yayılmış olsa da yatay içerik
temporally kambur: 1e3 Dalgalanmalar → 1e9 Botlar → 1e14+1e18 duruşlar → 1e22 Koloni →
1e28 Kriz sekmesi. İlk oturumda ~6-7 sistem + D1-D4 keşfi + Sıçrama + Küme aynı anda
iniyor. Sonrası tersine kilitleniyor: büyüler 1e34-1e52, lab 1e65, tohumlar 1e80+,
Wrinkler 1e160 — uzun dikey çöl.

**Kural önerisi (uygulamada ölçülerek doğrulanacak):**
- *Sindirme vadisi:* her yatay açılışın (yeni sistem) ardından, o sistemin dikey
  metriklerle (Hz, çarpanlar, duruşlar) bütünleştiği en az ~10-15 dakikalık saf dikey
  bölüm gelir. İki yatay açılış arasındaki dikey süre ≥ yeni sistemin öğrenme süresinin 2 katı.
- *İlk 10 dakika kontratı:* oyuncuya yalnızca **YUT tıklaması + D1-D2 + Çekim Hızı + en
  fazla bir anomali** sunulur. Geri kalan her yüzey **silüet** (etkileşimsiz, isimsiz
  teaser) olarak durur. Mevcut teaser altyapısı: DimensionsTab dimBought teaser
ları +
  LockedFeature.vue + Sonraki Açılacak bandı → nav sekmelerine ve anomali/bot
  kartlarına genişletilir.
- Erken dekad merdiveni yeniden ölçülür: crisis_spawn 1e3ten geriye çekilemez (tıklama
  dopamini), ancak **autobuyers 1e9 → 1e12+**, duruşlar/koloni/kriz ölçüme göre yeniden
  yerleştirilir. Hedef: ilk oturumda en fazla 4 yeni sistem.

## 2. Başarım Kapısı — Melez Model (KARAR)

86 başarım şu an hiçbir mekanik açmıyor (saf takip). Seçilen model:

- **Omurga (D1-D8, Çekim Hızı, Botlar, Tekillik/SP) deterministik dekad eşiklerinde kalır.**
  Idle temposu öngörülebilir olmalı; başarımla sert kapı kurulursa (anomalilere tıklamayan
  oyuncu Kriz sekmesine hiç ulaşamaz) yapay duvar/softlock riski doğar.
- **Opsiyonel yatay dallar (büyüler, lab tohumları, time clock, olay ufku merceği vb.)
  başarımla açılır:** dekad eşiği *görünürlüğü* (silüet + ipucu) verir, ilgili başarım
  ailesi *gerçek açılımı* verir. Başarım yoksa sistem yakında durumunda bekler.
- **Başarım ödül katmanı (dikey):** başarım ailesi tamamlamaları küçük kalıcı çarpan
  kademeleri verir (Cookie Clicker süt modeli, ama çizgisel değil aile bazlı — 86
  noktalık çizgisel şişkinlik yeniden üretilmez).
- Başarım aileleri zaten 8 kümeli (dop/dim/auto/cri/gui/lab/sin/chl) — her küme bir
  yatay dala eşlenir.

## 3. Fiyat Eğrisi — Artışları Kızıştırma (KARAR, sayılar ölçümle kilitlenir)

**Mevcut durum (balance.ts):**
- Kova (10 adet) çarpanları: COST_MULTS = [1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15].
- Ama erken yumuşak merdivenler (ADR-0026) bu çarpanları eziliyor:
  D1 ×55/4 kova, D2 ×42/3, D3 ×32/3, D4 ×28/2, D5 ×24/2, D6 ×20/2.
- Kademeli ivme (ADR-0051): B0_BUCKET_THRESHOLD = 30 kova, COST_ACCEL_DECADES_PER_STEP = 0.011
  — koşunun ilk yarısında fiilen etkisiz.
- Üretim sürekli: DIM_PER_TEN_MULT = 1.595 + zincir darbesi + dekad yükselişi.

**Neden az geliyor:** erken merdiven oranları (20-55×) kova başına üretim artışının
altında kalıyor; oyuncu aynı bütçeyle kova kova alım yapıp duvar hissetmiyor.

**Aday ayar kolları (tek seferde değil, smoke ölçümüyle sırayla):**
1. B0_BUCKET_THRESHOLD 30 → **15-20** (ivme erken başlar).
2. COST_ACCEL_DECADES_PER_STEP 0.011 → **0.02-0.03** (kova başına kızışma görünür olur).
3. Erken oranlar: 55/42/32/28/24/20 → **75/55/40/34/28/24** bandına çekilir, soft bucket
   aralıkları korunur (ADR-0026nın çözdüğü 1e9→1e14 duvarı geri dönmemeli — smoke log10
   eğrisi bunu garanti eder).
4. Güçlendirme fiyatları (tickspeed/duruş/SP dükkanı baseCost × costMult^lvl) için de
   costMult tabanları aynı ölçüm turunda gözden geçirilir.

**Katı kısıt:** ADR-0023 altın standart **ilk koşu ≈ 3s 30dk** korunmalı. harness:smoke
çıktısı (log10-zaman eğrisi + 8 shift zamanı) her ayar turunun kanıtıdır; standart bozulursa
kolaya dönülür. Ölçüm yöntemi: brain/scratchpad/harness/results-308-audit.json.

## 4. Shift Yeniden Görevlendirme — Sıçrama = D8 Sonrası Hız (KARAR)

**Mevcut:** BASE_UNLOCKED_DIMENSIONS = 3; her sıçrama +1 boyut açar (D4-D8, 5 sıçrama)
ve ayrıca shiftPowerMultiplier (×N GÜÇ) verir. Sıçrama çift rolde.

**Yeni rejim:**
- **D1-D8in tamamı sıçramadan koparılır.** Boyut açılımları §1/§2deki kapılara taşınır:
  dekad eşikleri görünürlüğü, omurga boyutları deterministik kütle eşikleriyle açılır.
  D8 açıldığında sıçramanın açılış rolü biter.
- **Sıçrama, D8den sonra hızlandırıcıdır:** her sıçrama tüm boyut üretimine ve/veya
  Çekim Hızına kalıcı koşu-içi çarpan ekler (mevcut shiftPowerMultiplier bu role büyütülür).
  Sıçrama gereksinimi (kütle eşiği) D8 sonrası üstel kızışır — §3teki fiyat felsefesiyle aynı dil.
- **Sıçrama öncesi dönemde** buton görünürlüğü: D8 açılana dek sıçrama UIsı silüette
  bekler (yanlış yönlendirme olmaz). Küme (galaxy) katmanı ayrı mekanik olarak kalır
  (kendi kapısı yeniden ölçülür).
- **Bağlılıklar (kırılmaması gerekenler):**
  - corruption.ts K seviyesi unlockedDimensionsCounti lifetimePeakShifts üzerinden
    türetir (monotoniklik sözleşmesi) → yeni kaynak lifetimePeakUnlockedDims benzeri
    monotonic tepe alanına taşınır; ADR-0035 açılış bir OLAYdır ilkesi aynı kalır.
  - resolvedUnlockedDimensionCount / SHIFT_CAP_THRESHOLD / diminishingPurchaseCount
    yeni role göre yeniden anlamlanır.
  - **Kayıt migrasyonu:** save-version.tsde yeni sürüm; dimensionShifts alanı korunur
    (istatistik), açılış durumu unlockedFeatures + yeni tepe alanından türetilir.
  - ADR-0033 (3 boyutlu başlangıç + D4 1. sıçramada) **fiilen süperseeded** olur; yeni ADR
    (öneri: ADR-0070) bunu açıkça kaydeder. ADR-0026 merdivenleri §3 ile uyumlu kalır.

## 5. Uygulama Fazları (öneri)

- **P0 — Ölçüm:** mevcut smoke harness ile fiyat/shift deneyleri ölçülür; ayar kolları
  kilitlenir. Kod değişikliği yok.
- **P1 — Fiyat eğrisi (§3):** balance.ts sabitleri + testler (cost-acceleration.test.ts
  güncellenir). Kabul: smoke altın standart ±%5, test yeşil.
- **P2 — Boyut açılış kapıları + shift rol değişimi (§4):** unlocks.ts boyut kapıları,
  store shift action sadeleşir, migrasyon + corruption kaynağı taşınır. Kabul: yeni koşuda
  D8 öncesi sıçrama butonu yok; K merdiveni değişmez davranışta.
- **P3 — Başarım kapısı & ilk 10 dk (§1-2):** omurga/opsiyonel dal ayrımı, başarım
  çarpanı, silüet teaserlar, erken merdiven yeniden zamanlaması. Kabul: ilk oturumda
  ≤4 yeni sistem; aile→dal haritası dokümante.
- Her faz sonrası: npm test + npm run build + harness:smoke + completed.md kaydı
  + conventional commit (AGENTS.md §5).

## 6. Açık Kararlar (uygulama öncesi kapatılmalı)

1. D8 öncesi sıçramalar tamamen mi kaldırılır, yoksa D8 sonrası ilk sıçrama için geriye
   dönük sayaç mı birikir? (öneri: kaldırılır; sayaç 0dan başlar)
2. Sıçrama çarpanının bölüşümü: yalnız üretim, yalnız Hz, yoksa ikisine de mi? (öneri: üretim ağırlıklı, Hzye sabit küçük katkı)
3. Küme (galaxy) eşikleri yeni tempo altında yeniden ölçülecek mi? (P1 ölçümüne bağlandı)
4. Başarım çarpanı formülü: aile tamamlama kademeleri (öneri) mi, yoksa çizgisel mi?
5. Erken dekad merdiveninde hangi sistemler ilk oturumda kalır — autobuyersın 1e12ye
   alınması smoke sonrası netleşir.

---

## 7. Görsel-Öncelikli İletişim İlkesi — "Önce Göster, Gerekiyorsa Yaz" (KARAR, 2026-10-19 ekleri)

**Kullanıcı kararı:** oyunda gereksiz fazla yazı var; bir bilgi önce görsel anlatılmalı,
görsel yetersiz kaldığında yazıya başvurulmalı.

**Bu bir dönüş değil, soguçlamadır:** görsel dil çalışması zaten yarı yolda bu yöne girdi
(Metin→çubuk dalgası B, MultipliersPanel glifleri, 16 SVG motif kütüphanesi, 3-state ramp).
Eksik olan, ilkeyi KURAL olarak yazıp her yeni metni bu kuleye karşı sorgulamaktı.

### 7.1 İletişim Kulesi (her yüzey için sırayla denenir)

| Kademe | Kanal | Soruyu yanıtlar | Mevcut altyapı |
| :--- | :--- | :--- | :--- |
| **T0** | Renk / ramp / 3-state | Durum: alınabilir mi, kilitli mi, aktif mi? | `ds-ramp-*` sistemi |
| **T1** | Glif / motif / ikon | Kimlik: bu nedir? | `src/assets/motifs/` (16 SVG) + lucide |
| **T2** | Çubuk / rakam | Nicelik: ne kadar? | `progress-track` + `tabular-nums` |
| **T3** | Mikro etiket (1-3 kelime) | T0-T2 yanıt veremediğinde | rozet/chip dili |
| **T4** | Cümle / tooltip / lore | Yalnızca ilk karşılaşma, hata, hover-isteği | v-tip + `LockedFeature.hint` |

**Kural:** *Her yüzey T0-T2'den en az ikisini taşır; T4 yalnızca kule tıkanınca gelir.*

### 7.2 Metin yükü ölçümü (2026-10-19, kaba sayım)

- Statik şablon metni: ~7.900 karakter / 32 bileşen; en ağır üç: `LabTab.vue` (1.870),
  `AdminPanel.vue` (1.047), `SettingsModal.vue` (973).
- Asıl hacim interpolasyonla akan veri korpusunda: 20 unlock ipucu (ort. ~25 karakter),
  86 başarım açıklaması, challenge mod metinleri, 9 bant blurb'ı, büyü/milestone
  ad+desc, haber bandı.
- `LockedFeature.vue` zaten model yüzey: kilit ikonu + ad + tek satır ipucu + çubuk —
  kuleye birebir uyar.

### 7.3 Kritik mekanik: "İlk karşılaşmada anlat, sonrasında göster"

- Bir sistem oyuncuyla İLK kez karşılaştığında toast/modal ile 1-2 cümle öğretir;
  o andan itibaren yüzey saf görsel+sayısal kalır (T4 → T0-T2 geçişi zamanlanır).
- §1 silüet yaklaşımıyla birleşir: kilitli içerik metinsiz silüettir; açılış anı tek
  metin anıdır; sonrası glif+rakam.
- `unlockedFeatures` listesi (ADR-0009) zaten "görüldü mü" bayrağı taşıyabilir —
  ayrı kayıt alanı eklenmeden öğretim-durumu türetilebilir.

### 7.4 Muafiyetler ve korumalar (pazarlık konumu değil)

- **Okunabilirlik kanonu:** sayı/etiket/ramp asla bozulmaz (visual-language.md sözleşmesi).
- **Erişilebilirlik:** ikon-only yüzeyler `aria-label` ister — 243 çiftlik WCAG 2.2 AA
  tabanının ikon-anlamı kaybolmadan korunması şart.
- **`CommentTicker` muaf:** kasıtlı lezzet/easter-egg metnidir, arayüz metni değil.
- Azaltma yapılırken `harness:contrast` + testler her turda koşar (AGENTS.md §5).

### 7.5 Uygulama notu

- **P4 fazı olarak §5'e eklenmiştir** (todo.md'de kayıtlı). P3'ten sonra gelir;
  silüet/öğretim altyapısı P3'ün parçası olarak kurulur, P4 metni söker.
- Denetim yöntemi: §7.2 sayımı bir betikte kalıcılaştırılır (`brain/scratchpad/`),
  P4 kabul kriteri: T4 kullanımı ilk-karşılaşma + hata + hover ile sınırlanmış olması.
---

## 8. SP (Tekillik Puanı) Ekonomisi — Sorunlar ve Kollar (2026-10-19 görüşmesi)

### 8.1 Kod tespiti

- **Kazanım** (`src/stores/game/getters-misc.ts` — `singularityGain` getter): iki rejimli.
  - Planck Kırılması ÖNCESİ: kütle 1.79e308'de kilitliyken şafak başına DÜZ 1 SP
    (floor(1 × totalMult), min 1).
  - Kırılma SONRASI: floor(10^((log10(matter)−308)/45) × 3 × totalMult), min 3.
    Çarpan kaynakları yalnız 3: dawnSpeedMult (nöral) × spMult (challenge) × relicSpMult (lab).
- **Harcama:** SP dükkanı (8 upgrade, `src/game/neural-data.ts` SINGULARITY_UPGRADES) +
  24 düğümlü NEURAL_TREE. Tümünü maksimuma alma ≈ **~3.000-3.400 SP**.
  `break_singularity` 4 SP.
- **Başarım bağı token düzeyinde:** `achievementSpDiscount` yalnızca %5 indirim
  (tek başarım ödülü, hasAchievementReward sp_discount).
- Auto-şafak botu (`shouldAutoSingularity`): marjinal kazanç optimizatörü — minGainSp +
  3 saniyelik log10 yavaşlama serisi. Verimlilik dilinde konuşur ama kazanım formülü duymaz.

### 8.2 Üç yapısal sorun

1. **Planck Kırılması öncesi 4 SP duvarı — oyunun en büyük sıkışma riski.** Kütle
   `break_singularity` (4 SP) alınına dek 1.79e308'de kilitli; kilitliyken her şafak 1 SP.
   Matematik: 1. şafak 1 SP (kök insomnia_heart alınır, cepler boş), 2. ve 3. şafak da 1'er SP
   → break'e ulaşmak ~4 tam koşu ≈ 10-14 saat (ADR-0023 altın standardı 3s30dk/koşu).
   Bu sürede 0→308 tırmanışı anlamlı alım olmadan tekrar edilir. todo.md'deki
   'ağacın ilk 15-20 düğümü boşta kalıyor' notunun kaynağı budur.
2. **Kırılma sonrası eğri dik ama çarpan kaynağı az.** divisor 45: 308 ötesinde her 45 dekad
   SP ×10 (10 SP→1e353, 100→1e398, 1000→1e443). P1 fiyat kızıştırması derin itişleri
   yavaşlatacağı için marjinal SP/saat zamanla düşer — orta oyunda büyüme hissi yok.
3. **Verimlilik boyutu yok.** Kazanım yalnızca derinliğe (kütle) bağlı; ne kadar HIZLI
   ulaşıldığı önemsiz. AD'de IP çok sayıda çarpan kaynağıyla hem derinlik hem hızı ödüllendirir.

### 8.3 Kollar (sayılar P0 ölçümüyle kilitlenir)

- **A. Şafak merdiveni (en kritik):** pre-break kazanç `1` → `1 + singularities`.
  1. şafak 1, 2. şafak 2 (kasa 3), 3. şafak 3 (kasa 6) → break_singularity 3. ŞAFAKTA
  alınabilir. Ölü bölge 4 koşudan 3'e iner; aradaki koşulara eye_drops (1 SP) gibi
  anlamlı alımlar serpiştirilir. Deterministik — 'omurga deterministik kalır' kararıyla uyumlu.
- **B. break_singularity omurgaya taşınır:** SP dükkanındaki 4 SP fiyatıyla değil,
  '3. Tekillik' gibi deterministik eşikle açılır (§2 kararının uygulaması). A ile birlikte de
  çalışır (fiyat 4→2 + merdiven). Karar: A+B birlikte mi, yalnız A mı — P0 sonrası.
- **C. Post-break büyüme bandı:** (i) divisor 45→35 (10 SP 1e343'te) ya da (ii) AD milestone
  diliyle 'her 25 dekadda ×2 SP çırpması' adlandırılmış eşikler — dopamin anı üretir ve
  auto-şafak botunun ritmini doğallaştırır. (ii) tercih edilir; (i) yedekte.
- **D. Çarpan kaynaklarını genişlet:** bugünkü kararlar buraya doğal bağlanır —
  başarım aileleri +%10-25/aile (8 aile ≈ ×2 tavan; §2
in en ucuz dikey uygulaması),
  koşu mutasyonları 'bu koşu SP ×1.5 ama maliyetler kızgın' takasları (§8 koşu kimliği),
  Power Nap başına küçük SP % (napMultiplier şu an yalnız üretimi besler, 20× tavansız kalkan).
- **E. P0'a SP/saat telemetrisi:** zaman-to-break, zaman-to-ilk-10-SP, derinlik başına
  SP/saat eğrisi. A-D'nin sayıları bu ölçümle kilitlenir.
- **Kısıt:** ADR-0034 (SP yalnızca şafakta kazanılır) hiçbir kolla bozulmaz — hepsi
  şafak anındaki kazanım BÜYÜKLÜĞÜNÜ değiştirir.

---

## 9. Cüzdan İkilemi — 'bot mu, güçlendirme mi' (2026-10-19 görüşmesi)

**Kullanıcı kararı:** 'boyut mu bot hızı mı' ikilemi şu an YOK — oyuncu kazandığı parayla
ikisini de almaya yetiyor. İkilem ancak kıt cüzdan paylaşımıyla kurulur.

### 9.1 Kod tespiti

- Bot alımları tek seferlik SABİT mass fiyatları, bilinçli olarak gevşek (ADR-0032 —
  eski maliyetler pure-idle oyuncuyu log10=12.41'de sonsuza dek kilitliyordu):
  AUTOBUYER_COSTS dim1: 1e9 … shift: 1e10, singularity: 1.79e308 (`src/game/autobuyer-data.ts`).
- Alım anında cüzdan mass (`actions-misc.ts`: matter.minus(AUTOBUYER_COSTS[id])).
- Artan fiyat yok, taksit yok, rekabet yok → bol mass + sabit fiyat = ikilem imkânsız.
- İkilem kuralı: **kıt kaynak + dışlayıcı mal + artan fiyat** üçlüsü.

### 9.2 Mekanizmalar (ucuzdan derine)

- **M1 — Bot hızları mass'te kızışsın (P1 eki, en ucuz):** bot ALIMLARI ucuz ve tek
  seferlik kalır (ADR-0032 idle düzeltmesi korunur); HIZ ÇİPLERİ/bulk artan fiyatlı olur
  (cost × mult^lvl). Mass cüzdanı paylaşılır: koşu ortasında 'bu dekad D4 kovasına mı,
  dim3 bot çipine mi' kararı doğar. Tuzak: yalnız hız pahalanır, VARLIK deterministik kalır.
- **M2 — SP ağacında rekabetçi dallar (P3 eki, orta):** nöral ağaç zaten dallı
  (passive/active/hybrid) ama dallar dışlayıcı değil. Otomasyon Dalı (bot interval, bulk,
  auto-şafak ayarı) vs Güç Dalı (üretim/Hz) arasında dal-başı dışlayıcılık ya da 'şafak
  dönemi başına tek dal derinleşir' ritmi. SP kıtlığı (§8) ikilemi besler; sonraki Çöküş
  döngüleri diğer dalı doldurur — koşular karakter kazanır (§8 mutasyon damarıyla aynı).
  AD'nin bot hız yükseltmelerini IP'den satması aynı ikilemdir.
- **M3 — Odak Bütçesi (Faz 2'ye ertelendi, ayrı ADR ister):** doomscrolling beyin sınırlı
  DİKKAT taşır (lore-birebir). Her aktif bot kanalı + duruş + büyü Odak tüketir; toplam
  Odak sınırlı, prestijle büyür. Sürgü/loadout kararı: 12 bot yavaş mı, 4 bot overclock +
  üretim odaklı mı? Satın alma değil YÜKLEME kararı. Duruş üçlüsünün (Kuantum Odak /
  Obur Çekim / Vakum Kalkanı — zaten dışlayıcı) genel ilkeye genişlemesi; Faz 2 '12 Sürgülü
  Uyku Baskısı Matrisi'nin mekanik prototipi (aynı altyapı Faz 2'de ceza tarafına döner).

### 9.3 Tuzaklar (pazarlık konumu değil)

- **Idle oyuncu cezalandırılmaz:** botların VARLIĞI asla kıtlaşmaz; kıtlaşan hız/derinliktir.
  ADR-0032'nin çözdüğü idle kilidi geri dönmemeli.
- **Çifte kıtlık tuzağı:** P1 + M1 birlikte erken oyunu aşırı kızgın yapabilir → smoke
  taramalı test zorunlu; 'bot çipi beklerken boyut duvarına çarpma' olmamalı.
- **Tek katman yeter:** M1+M2 plana girer (M1→P1 eki, M2→P3 eki); M3 Faz 2 tasarımına
  ADR ile ertelenir. Üçü birden yapılırsa şişkinlik geri gelir.
---

## 10. Orkestratör Önerileri — Dosya Taramasından (2026-10-19 · **ONAY BEKLİYOR**, karar değildir)

Bu bölüm kullanıcı onayına sunulan önerilerdir; işaretlenenler §5 fazlarına geçer.

### 10.1 İçerik/mekanik önerileri

- **O1 — Prestij ritüeli (iki-ekran kuralı):** todo.md'de 'kapsam dışı — ayrı iş' olarak
  duran F maddesi, bu planın doğal zirvesidir: Big Crunch oyunun en büyük 'ilk karşılaşma'
  anı ve §7 öğretim ilkesinin en önemli uygulama yüzeyi. Mevcut altyapı hazır
  (feast-scene canvas + confetti + shake + pastSingularities telemetrisi).
  Öneri: P4.5 olarak eklenir — ilk prestijde iki-ekran onay ritüeli + sıfırlama anı sahnesi.
- **O2 — Koşu mutasyonları = challenge mod motoru:** 11 challenge'ın modifiers sistemi
  (costInflation, maxDimensions, storm, doom…) fiilen bir mutasyon motorudur. Prestij sonrası
  koşuya 1-2 rastgele modifikasyon atamak (challenge tamamlama SP'si ile seçilir) ile
  'koşu kimliği' MEKANI KOD YAZDAN kurulur. §8-D'deki mutasyon kolunun somut uygulaması.
- **O3 — Başarım → SP çarpanı mevcut sisteme eklenti:** başarım ödül altyapısı ZATEN VAR:
  PER_ACHIEVEMENT_MULT 1.012 + ROW_COMPLETION_MULT 1.06 (tam set ≈ ×3.55) + 18 özel reward
  (AchievementRewardKind). §8-D'nin uygulaması yeni sistem DEĞİL: AchievementRewardKind'e
  'sp_gain' türü + aile tamamlama kontrolü eklemek yeterli. Ucuz, test altyapısı hazır.
- **O4 — Haber bandı önsezdirme kanalı:** news-early/mid/late korpusu (1.300+ satır, TR lezzet
  hazır). unlockProgress'e koşullu kayıtlar: açılacak sistem 1-2 koşu önce bantta esprili
  haber verir. §1 silüet + §7 T4 öğretim anının ucuz lezzetli tamamlayıcısı. Kod neredeyse bedava.
- **O5 — Budama telemetrisi (P0 eki):** harness üretim eğrilerini ölçüyor ama OYUNCU
  DAVRANIŞINI değil. P0'a sekme-açılma/özellik-kullanım sıklığı telemetrisi (yerel, opt-in):
  kullanılmayan sistem tespit edilirse taşımak, dört P fazını gereksiz kılabilir.

### 10.2 Hijyen bulguları (düşük efor, yüksek düzeltme değeri)

- **H1 — İkiz ADR-0033 [ÇÖZÜLDÜ 2026-10-19]:** `brain/decisions/` altında iki dosya 0033
  numarasını taşıyordu (cloud-sync 10-03 · üç boyutlu başlangıç 10-04). Cloud-sync ADR'i
  **0070**'e yeniden numaralandırıldı (plan önerisi 0071 idi) ve `brain/decisions/README.md`
  indeks oluşturuldu.
- **H2 — Sim sabit drifti KANITLI:** `brain/scratchpad/simulate-economy.js` BASE_COSTS/
  COST_MULTS'i ELLE kopyalıyor ve RESOLUTION_MILESTONES zaten sapmış (sim: 25/50/100/250/…,
  balance.ts: 50/100/200/250/…). Bu sim ile yapılan analizler güvenilmez. Çözüm: simulate-
  economy.js ya emekliye ayrılır ya harness build'inden (gerçek balance.ts'i derleyen) import eder.
- **H3 — Ölü dosya:** `brain/scratchpad/harness/run.ts.broken-backup` silinmeli (git tarihi var).

### 10.3 Kayıt durumu

- Önerilerden bugüne yazılanlar: §8 (SP) + §9 (cüzdan ikilemi) — kullanıcı kararıyla.
- Bu bölümdekiler ONAY BEKLİYOR: O1-O5 (etiketle işaretlenirse §5'e işlenir), H1-H3 (hemen yapılabilir).

### 10.4 O6 — Challenge Ödül Merdiveni: pasiften mekaniğe (2026-10-19 görüşmesi · ONAY BEKLİYOR)

**Kullanıcı kararı:** challenge'lar pasif çarpan vermek yerine yeni mekanik açmalı ya da
güçlü/güzel bufflar vermeli.

**Kod tespiti:** 8/8 challenge ödülü PASİF (`src/game/challenges.ts`: dim_mult,
tickspeed_effect, click_mult, even_dim_mult, dim_cost_discount, tickspeed_cost_discount,
shift_power, sp_gain). Ek: CHALLENGE_TIME_TIERS madalyaları (gold ×1.4 / silver ×1.25 /
bronze ×1.1 — kümülatif en iyi süre) + 8/8 Zombi Bakışı ×1.25 (ALL_CHALLENGES_COMPLETE_MULT).
MEKANİK açılımı YOK. Tür standardı aykırı: AD'de challenge'lar birincil mekanik kanalıdır
(otomasyon açılımları, Break Infinity katmanı).

**Tasarım ilkesi:** 'Challenge kuralı bozar, ödül bozukluğu silahlandırır' — her challenge
bir kuralı kırarak öğretir; ödül o kırığı sahiplenilecek araç olmalıdır.

**Üç katmanlı ödül merdiveni:**
- **R1 — Pasif:** mevcut çarpanlar; ikincil hat olarak kalır.
- **R2 — Build-tanımlı buff:** +%15 değil oyun kuran etki: iki duruş aynı anda aktif,
  anomali tıklama zinciri, bulk paketi ×10 vb.
- **R3 — Mekanik açılımı:** yeni toggle/bot/alan. Madalya iskeleti hazır; R3 açılımları
  gold tamamlamaya bağlanabilir (madalya kozmetikten mekanik kapıya geçer).

**Aday harita (8 challenge × tema → R3 adayı):**
- c1 Vakum İzolasyonu → Vakum Regülatörü: durma süresini +%üretim stoğuna çeviren toggle
- c2 Kütleçekim Durgunluğu → Durgunluk Yastığı: rölanti/çevrimdışı üretim yumuşatıcısı
- c3 Kuantum Kararsızlığı → Kararsızlık Zinciri: anomali tıklamaları zincirleme patlar
- c4 Simetri Kırılması → Ayna Kasası: MIRROR_PAIRS (balance.ts'te tanımlı, ödül yüzeyi yok)
- c5 Kozmik Enflasyon → Enflasyon Kalkanı: bulk alımda kalıcı indirim kademesi
- c6 Zaman Genleşmesi → Zaman Cebi: çevrimdışı birikimin %'sini harcanabilir stok
- c7 Boyutsal Çöküş → Otomatik Challenge Kuyruğu: challenge'ları botla koşturan AD-tipi otomasyon
- c8 Radyasyon Fırtınası → Fırtına Toplayıcı: fırtına cezasını buff süresine/SP'ye çevirir

**Çerçeveye oturuş:** challenge'lar 1 Tekillik sonrası açılır → yatay şişkinlik riski düşük
(oyuncu resmi görmüş); §2'nin 'omurga deterministik, opsiyonel dal skill-kapılı' formülünün
en temiz örneği. §9-M2 (ağaç dal rekabeti) + O2 (mutasyonlar) ile birlikte koşu kimliği üretir.

**Tuzak:** R3 mekanikleri zorluğa rehin verilmez — challenge'ı geçemeyen oyuncu otomasyondan
da mahrum kalmaz; her R3'ün makul bir varsayılan davranışı vardır. Gold madalya ayrı
yüceltme katmanı olarak kalır.

**Faz önerisi:** P5 (P1 fiyat + P2 shift + P3 başarım oturduktan sonra; Faz 2 öncesi son
büyük içerik turu). Sayılar P0 ölçüm kapısına bağlanır.

### 10.5 Kayıt durumu (güncel)

- Kullanıcı kararıyla yazılanlar: §8 (SP ekonomisi) + §9 (cüzdan ikilemi).
- ONAY BEKLİYOR: O1 (prestij ritüeli) · O2 (koşu mutasyonları) · O3 (başarım→SP eklentisi) ·
  O4 (haber bandı önsezdirme) · O5 (budama telemetrisi) · O6 (challenge ödül merdiveni) ·
  H1 çözüldü 2026-10-19 (ikiz ADR numarası) · H2-H3 (hijyen: sim drifti, ölü dosya).
---

## 11. KAYNAK HİYERARŞİSİ KANUNU (2026-10-19 · **KULLANICI KARARI — BAĞLAYICI**)

**Kullanıcı kararı (birebir):** SP kazanımı bir yerde olacak, yutulan kütle kazanımı
bir yerde olacak; ama oyunun ana artan şeyi HER ZAMAN yutulan kütle olacak.
Diğer her şey (SP, izotop, nap çarpanı, madalya…) onu GÜÇLENDİRECEK — her zaman.

### 11.1 Kanunun üç maddesi

1. **Tek yıldız:** Yutulan Kütle (g) oyundaki tek birincil, sonsuz büyüyen kaynaktır.
   Ana sayaç (Header) oyunun kimliğidir; hiçbir ikincil ekonomi onun yerini alamaz.
2. **Türetilmiş ekonomiler çarpan-sonludur:** SP/izotop/nap vb. asla doğrudan kütle
   ÜRETMEZ; yalnızca kütle akışını (üretim, çekim, tıklama gücü, Hz verimliliği)
   katlar. İkincil bir kaynağın çıkışı daima 'kütle/sn çarpanı'na dönüşmelidir.
3. **Yeni mekanik testi:** her yeni sistem şu soruya cevap vermek zorundadir:
   'Bu mekanik YUTULAN KÜTLE'yi nasıl ve ne kadar çarpıyor?' Cevabı olmayan mekanik
   ya kütle-zincirine bağlanır ya da kapsam dışı kalır.

### 11.1a Netleştirme — ikincil birimler GERÇEK birimlerdir (2026-10-19 kullanıcı düzeltmesi)

**Kullanıcı düzeltmesi (birebir):** 'onlar evet katlıyor ama kendi birimleri de var —
mesela oyunun ikinci birimi Tekillik Puanı.'

Kanun ikincil ekonomilerin VARLIĞINI inkâr etmez; HİYERARŞİLERİNİ düzenler:

- **SP gerçek oyunun ikinci birimidir:** kendi sayacı, dükkanı/ağacı, harcama döngüsü
  ve koşu-başı kimliğiyle meşrudur. Madalya, izotop, nap çarpanı gibi diğer ikincil
  birimler de kendi birim sayacıyla durabilir.
- **Ama dört hiyerarşi kuralı geçerlidir:**
  1. *Kazanım türetilir:* her ikincil birim, birincil (kütle) kilometre taşından kazanılır
     (SP → şafak/1.79e308; izotop → lab hasadı vb.). Hiçbiri kendi başına sonsuz
     büyümez — büyüme hızı daima kütle derinliğine BAĞLIDIR.
  2. *Harcama kütlede sonlanır:* birimin dükkan çıkışı daima kütle akış çarpanına
     dönüşür (madde 2).
  3. *Gösterim ikincil yüzeydedir:* kendi sekmesi/kartı var; Header tek yıldız kütle
     sayacıdır (madde 1 + §11.3).
  4. *Asla kütleyle yarışmaz:* hiçbir ikincil birimin kazanım eğrisi, kütle büyüme
     eğrisinin önüne geçemez (SP tavanı = kütle derinliği fonksiyonu).
- **Sonuç:** 'oyunun ikinci birimi SP' tanımı kanunla UYUMLUDUR — kanun bunu yasaklamaz,
  ikinci birimin birinci olmasını yasaklar.

### 11.1b Besleme Merdiveni — katmanlar birbirini besler (2026-10-19 kullanıcı kararı)

**Kullanıcı kararı (birebir):** ikinci birim SP zaten var; üçüncü birim geldiğinde o da
SP üretmeye başlayacak, SP de yutulan kütleyi besleyecek — biri diğerini besleyecek,
MERDİVEN gibi.

Bu, kanunun genelleştirilmesidir (AD geleneği: antimatter ← IP ← EP ← ...). Hiyerarşi
düz bir çizgi değil, **aşağı besleyen katman zinciridir**:

```
  L3 (Faz 3 birimi)  --üretir/besler-->  L2 (Faz 2 birimi)
  L2                  --üretir/besler-->  L1 (Tekillik Puanı)
  L1                  --üretir/besler-->  L0 (YUTULAN KÜTLE — TEK YILDIZ)
```

**Merdiven yasası (kanunun devamı olarak okunur):**

1. *Tek yönlü besleme:* her katman yalnızca BİR ALTINDAKİ katmanı besler (Ln → Ln-1).
   Zıplayan besleme (L3 → L0 doğrudan) ya yoktur ya zayıf/küçüktür — zincir akar.
2. *Kazanım bir alt katmanın eşiğinden doğar:* yeni katmanın kazanımı, alt katmanın
   DERİNLİK kilometresinden gelir (SP şafaktan/1.79e308; L2, SP derinliğinden; ...).
   §8A şafak merdiveni deseni (1+n) HER katmana genelletilir — her katmanda
   4-SP-duvarı kalıbı kurulmaz.
3. *Harcama aşağı akar:* her katmanın dükkanı, bir alt katmanın akışını çarpanlarla
   besleyen çıkışlara gider. Böylece yeni katman, altındaki TÜM ekonomileri dolaylı
   da olsa hızlandırır (L3 → SP çarpanı → kütle çarpanı).
4. *Yıldız değişmez:* zincir ne kadar derinleşirse derinleşsin, Header'daki tek görsel
   yıldız YUTULAN KÜTLE kalır (§11.3 çift kanon). Derin katmanlar kendi ikincil
   yüzeylerinde yaşar.

**Faz haritasına oturuşu:**
- L0 Kütle: Faz 0 (çalışıyor).
- L1 SP: Faz 1 (çalışıyor; §8 kollarıyla sağlığı tazelenir).
- L2 (üçüncü birim): Faz 2 — Gece Nöbeti katmanı; kazanımı SP derinliğinden (örn.
  toplam SP / en derin SP koşusu), çıkışı SP kazanımına + kütle çarpanına akar.
  Corruptions/Talismans bu katmanın harcama yüzeyleridir (mevcut todo ile eşleşir).
- L3 (dördüncü birim): Faz 3 — aynı yasa tekrarlanır.

**Sağlık tuzu (her katman için):** yeni katman eklendiğinde alttaki katmanın 'ölü bölge'
kontrolü yapılır — yeni katmanın kazanım eşiği, alt katmanın tavan derinliğini AŞMAMALI
ki alt ekonomi bayatlamasın (§8.2-1 dersinin genellemesi).
### 11.1c Harcama Yüzeyleri — her katmanın parasıyla bir şeyler alınır (2026-10-19 kullanıcı onayı)

**Kullanıcı onayı (birebir):** aynen böyle ve onlardan kazandığımız puanlarla da bir şeyler alabiliriz.

Merdivenin harcama tarafı — her katmanın dükkanı YALNIZCA bir alt katmanın akışını besler:

| Katman | Para | Harcama yüzeyi | Çıkış (nereye akar) | Durum |
| :--- | :--- | :--- | :--- | :--- |
| L1 | Tekillik Puanı (SP) | SP dükkanı + Nöral Ağaç | kütle üretim/tıklama/bot çarpanları + Planck kırılması | ✅ çalışıyor (§8 ile sağlıklanır) |
| L2 | Üçüncü birim (Faz 2) | Uyku Baskısı Matrisi sürgüleri + Gece Ekipmanları soketleri | SP kazanım çarpanı + kütle çarpanları | ❌ Faz 2 planı (todo ile eşleşir) |
| L3 | Dördüncü birim (Faz 3) | Celestials/Automator yüzeyleri | L2 kazanımı + SP çarpanı → dolaylı kütle | ❌ Faz 3 |

**Harcama yasası (kanunun 4. maddesi olarak okunur):**

1. *Para o katmanın yüzeyinde harcanır, değer aşağı akar:* L2 mağazasından alınan her
   şey SP'yi ve/veya kütle akışını güçlendirir — asla L2'nin kendisini üretmez.
2. *Her katmanda en az bir OMURGA alımı:* her dükkanın içinde zincirin devamını
   açan/koşan tek kritik alım vardır (L1 örneği: break_singularity → Planck Duvarı).
   L2/L3 tasarımlarında bu kalıp korunur — dükkan kozmetik çarpan yığını değildir.
3. *Yeniden alınabilirlik dengesi:* kalıcı çarpanlar (SP dükkanı tarzı) ile koşu-içi
   alımlar (sürgü/ekipman tarzı) her katmanda ayrı kollardadır; §9-M2 dal rekabeti
   katman dükkanlarına aynen taşınır.
4. *Birikim sızıntısı yok:* hiçbir katmanın parası alt katmanın parasına DÖNÜŞMEZ
   (SP ile kütle satın alınamaz); yalnızca çarpan olarak aşağı akar — aksi halde
   hiyerarşi çöker ve üst para gerçek para olur.


### 11.2 Bugünkü plana uygulaması (tutarlılık denetimi)

- **§8 SP kolları KANUNA UYUMLU:** A/B (şafak merdiveni + break omurgası) SP'nin
  KAZANIMINI düzenler; SP harcaması zaten kütle çarpanlarına gider (eye_drops prod,
  caffeine_drip click→prod, neural_chip bot→prod). SP kilitli bir yan Currency olarak
  kalır — yıldız olmaz.
- **§9 M1-M2 UYUMLU:** bot hızları ve ağaç dalları kütle akışını bölüştürür.
- **O6 challenge R3 UYUMLU:** her R3 mekanik tek başına 'kural bozan oyuncak' değil,
  kütle-zincirine bağlanan araçtır (vakum regülatörü → üretim stoğu, fırtına toplayıcı →
  buff/SP → SP tekrar kütle çarpanı).
- **DİKKAT — Faz 2/3 riski:** 1e308 sonrası içerikte (Corruptions, Celestials) yeni
  ekonomi cazibesi SP'yi ikinci bir 'ana sayı'ya dönüştürebilir. Kanun gereği Faz 2/3
  tasarımlarında da ana sayaç kütle kalır; SP göstergeleri ikincil yüzeyde durur.
- **P0 denetim maddesi:** mevcut tüm ikincil ekonomilerin çıkışlarının (lab izotopu,
  nap çarpanı, madalya çarpanı, relics) dolaşım haritası çıkarılır; kütle-sn çarpanına
  bağlanmayan bir kol bulunursa kanuna göre düzeltilir.

### 11.3 Görsel dil bağlantısı (§7 ile)

- Header kütle sayacı oyunun en büyük/güçlü görsel öğesi olarak kalır (okunabilirlik
  kanonuyla birlikte 'çift kanon').
- İkincil kaynaklar (SP, izotop) yüzeyleri kendi sekmelerinde ikincil tipografi ile
  gösterilir; hiyerarşi UI'da da görünür olur.
