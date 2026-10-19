# 0073. Başarım Kapısı — Omurga/Opsiyonel Dal Ayrımı ve Aile Kademe Çarpanı

- **Tarih:** 2026-10-19
- **Durum:** Kabul edildi ve uygulanıyor (P3.1)
- **Tür:** Oyun Tasarımı, Pacing, Ekonomi
- **İlgili Belgeler:** ADR-0026 (yumuşak erken merdivenler), ADR-0032 (dekad omurgası), ADR-0035 ("açılış bir OLAYdır"), Plan §1/§2/§6.4 (`brain/research/pacing-economy-shift-redesign-plan-2026-10.md`), P0 Baseline (`brain/research/pacing-p0-baseline-2026-10.md`)
- **Karar sahibi:** kullanıcı · uygulama: orchestrator + 3 paralel subagent (P3.0/P3.1a/P3.1b)

---

## 1. Bağlam ve Problem

İki ölçüm sorunu üst üste biniyor:

**(a) Yatay şişkinlik (plan §1, ölçülmüş).** İlk 8 dakikada **7 özellik kapısı** aynı anda iniyor:
`crisis_spawn` 26s · `autobuyers` 190s · `stance_spam` 262s · `stance_private` 332s · `colony` 348s ·
`crisis` 384s · `spell_espresso` 470s. Plan §1'in "ilk 10 dakika kontratı" (YUT + D1-D2 + Çekim Hızı +
en fazla bir anomali) açıkça ihlal ediliyor.

**(b) Başarımlar hiçbir şey açmıyor (plan §2).** 86 başarım saf takip: oyuncunun ne yaparsa yapsın
açtığı bir yüzey yok. Bu, hem motivasyon (başarım bir hedef değil, bir kayıt) hem de *pacing aracı*
olarak kullanılamayan boş bir katman demek.

---

## 2. Karar — Melez Model (omurga + opsiyonel dal)

### 2.1 Kural

- **Omurga** deterministik dekad eşiğinde kalır: D1–D8, Çekim Hızı, Botlar, Tekillik/SP. Idle
  temposu öngörülebilir olmalı — başarım zorunlu kapı olsaydı anomaliye tıklamayan oyuncu Kriz
  sekmesine asla ulaşamazdı (plan §2'nin uyardığı yapay duvar/softlock).
- **Opsiyonel yatay dallar** başarım ailesiyle açılır. Dekad eşiği yalnızca **görünürlüğü** (silüet
  + ipuç) verir; aile başarımı **gerçek açılımı** verir.
- **Açılış bir OLAYdır (ADR-0035):** dal bir kez açıldığında `unlockedFeatures` yapışkanlığıyla
  geri kilitlenmez; kapı yalnızca *o koşudaki* ilerlemeyi değil, lifetimePeakMatter ile ayni ruhta
  monoton bir durumu ifade eder.

### 2.2 Kapı seviyesi = özellik, DAL DEĞİL (kritik karar)

İlk taslakta kapı *aile düzeyinde* düşünüldü ("X aileden N başarım → dal açılır"). Bu, iki ailede
**kilitlenme** yaratır:

| Aile | Döngü |
| :--- | :--- |
| `lab` | `lab_seed` başarımı için Kuantum Laboratuvarı zaten açılmış olmalı |
| `guilt` | `gui_seen` başarımı için parazitler zaten spawn olmalı (`actions-misc.ts`: slacker doğumu `isFeatureUnlocked('guilt_slackers')`'a bağlı) |

Yani bu iki ailede dalın *giriş* katmanı bile ailenin başarımına bağlı → dal asla açılamaz →
planın tam olarak uyardığı softlock. **Çözüm: kapı özelliğin kendisine konur.** Kendini kilitleyen
ailelerin giriş katmanları (`lab`, `guilt_slackers`) **omurgada** kalır; o aileye bağlanan
**derin** katmanlar (tohumlar, mercek/rezonatör) aile kapısına girer — o katmana geldiğinde aile
zaten doğurgandır.

### 2.3 Softlock koruması kodda kanıtlanır (`safeAchievementIds`)

Her kapı, dal açılmadan **kazanılabilen** aile başarımlarını listeler:

```ts
export interface BranchGate {
  featureId: string            // FEATURE_UNLOCKS id'si
  family: AchievementCategoryId
  requiredAchievements: number // bu aileden gereken başarım sayısı
  safeAchievementIds: string[] // dal açılmadan kazanılabilen aile başarım listesi
}
```

İnvariant (test ile kilitli): `safeAchievementIds.length >= requiredAchievements`.
Bir kapı bu invariant'ı ihlal ederse test kırmızıya döner — yani "bu dal asla açılamaz" hatası
**yazım anında** yakalanır, yayında değil. Sayım yalnızca `safeAchievementIds` içinden yapılır:
ailedeki *diğer* (dala bağlı) başarımlar sayılmaz, yoksa sayı şişer ve kapı görünürde açılırken
gerçekte açılmaz.

### 2.4 Aile → dal haritası (P3 kabul maddesi: dokümante)

| Özellik | Omurga/Dal | Aile | Gereken | Güvenli başarımlar |
| :--- | :--- | :--- | ---: | :--- |
| `crisis_spawn` · `autobuyers` · `stance_spam` · `stance_private` | **omurga** | — | — | dekad eşiği tek başına |
| `colony` | dal | automation | 2 | `auto_first`, `auto_bulk`, `auto_max` |
| `crisis` | dal | crisis | 2 | `cri_first`, `cri_10` |
| `spell_espresso` | dal | crisis | 3 | + `cri_combo` |
| `spell_noise` | dal | crisis | 4 | + `cri_50` |
| `spell_sleep` | dal | crisis | 5 | + `cri_combo5` |
| `lab` | **omurga** | — | — | dekad eşiği (giriş: kendini kilitleyen aile) |
| `seed_nucleon` | dal | lab | 2 | `lab_seed`, `lab_harvest` |
| `seed_gluon` | dal | lab | 4 | + `lab_10`, `lab_mature3` |
| `time_clock` | dal | singularity | 3 | `sin_sight`, `sin_first`, `sin_hour` |
| `seed_graviton` | dal | lab | 5 | + `lab_full` |
| `guilt_slackers` | **omurga** | — | — | dekad eşiği (giriş: kendini kilitleyen aile) |
| `event_horizon_lens` | dal | guilt | 2 | `gui_seen`, `gui_full` |
| `hawking_resonator` | dal | guilt | 3 | + `gui_5` |
| `cosmic_filament` | dal | guilt | 5 | + `gui_25`, `gui_leech` |
| `night_watch` · `challenges` | **omurga** | — | — | dekad / tekillik eşiği |

---

## 3. Karar — Aile Kademe Çarpanı (plan §6.4)

**Seçenek 4 ("aile tamamlama kademeleri") kabul edildi; çizgisel model (86 nokta) reddedildi.**
Gerekçe: 86 başarım üzerinden lineer büyüme aynı şişkinliği ayni çarpan yüzeyinde çoğaltır ve
86 küçük ödülü izlemeyi mümkün kılmaz.

```ts
export const FAMILY_TIER_STEPS = [0.25, 0.5, 0.75, 1] as const  // aile tamamlanma eşikleri
export const FAMILY_TIER_MULT = 1.015                           // kademe başına çarpan
calcAchievementMultiplier = 1.012^başarım × 1.015^(kademeler)
```

**Tavan korunur:** eski `1.06^8 = 1.594` → yeni `1.015^32 = 1.611` (≈ %1 fark). Yani denge ucuyor,
değişen tek şey **ödemenin erken başlaması** — planın "küçük kalıcı çarpan kademeleri" isteğinin
tam karşılığı. Çizgisel modele göre avantaj: oyuncu %25'lik dilimde bile ödüldür, kaçırılmış hissi
yoktur.

---

## 4. Reddedilen Seçenekler

| Seçenek | Neden reddedildi |
| :--- | :--- |
| Tüm sistemi başarım kapısına almak (spine dahil) | Anomali/kütleye tıklamayan oyuncu omurgaya da ulaşamaz → sert softlock. |
| Dal **seviyesinde** aile kapısı | `lab`/`guilt` kendi kendini kilitliyor → §2.2. |
| Çizgisel 86 nokta çarpan | Şişkinliği çarpan yüzeyinde yeniden üretir (plan §2 açıkça reddediyor). |
| `safeAchievementIds`'siz sayım | Dala bağlı başarımlar sayılınca kapı *açık görünür ama açılmaz* → sahte ilerleme çubuğu. |

---

## 5. Bağlılıklar ve İhlal Edilmeyenler

- **ADR-0035:** dal kapısı da monoton — `unlockedFeatures` yapışkan, açılıştan sonra geri alınmaz.
- **ADR-0032:** dekad merdiveni omurgada aynen durur; `order`/`hint` semantiği değişmez, yalnızca
  dal kapısı devredeyken ilerleme göstergesi aile sayacına döner (lineer, logaritmik değil —
  zaten asıl koşu ilerlemesi dolu).
- **Kayıt alanları:** `achievements` zaten state'te mevcut; yeni kayıt alanı **yok**, migrasyon **yok**.
- **Açık kalan (P3.3):** erken dekad merdiveninin yeniden zamanlaması (≤4 sistem / ilk 10 dk) bu
  ADR'nin dışıdır; ölçüm `brain/scratchpad/p3-early-ladder-candidates.md` içinde ve kullanıcı
  onayı beklemektedir. İlk koşu süresi için bkz. P0 §7 (ADR-0023 gerilimi, açık karar).
