# Faz E — İnternet Araştırması (Kontrast + Cascade Katmanları)

**Tarih:** 2026-10-16 · **Faz:** E (Retrofit & QA) · **Yöntem:** doğrudan kaynak çekme (webfetch)
**Durum:** Tamamlandı — bulgular `phase-e-retrofit-qa-deep-spec-2026-10.md`'ye işlendi

---

## 1. W3C — Understanding SC 1.4.3 Contrast (Minimum) (Level AA)

**URL:** https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

**Normatif eşikler (Faz E turunun ölçütü):**
- Normal metin (< 18pt / < 14pt bold ≈ 24px / 18.5px): **≥ 4.5:1**.
- Büyük metin (≥ 18pt / ≥ 14pt bold): **≥ 3:1**.
- Muaf: inaktif bileşen, saf dekorasyon, görünmez metin, logotype.
- Oranlar eşik değerdir — **yuvarlama yok** (4.499:1 ≠ geçer).
- Önplan rengi belirtilip arka plan belirtilmezse (veya tersi) → F24 başarısızlığı.
- Kontrast **luminance**'tır (hue değil) — sıcak/soğuk palet ısınması hue'yu
  değiştirir ama oranı belirleyen açıklık farkıdır.

**Faz E etkisi:** `harness:contrast` zaten bu eşiği ölçer (metin/zemin çiftleri).
Faz A–D'de eklenen sıcak zemin (#0a0608) + vinyet + yeni katmanlar bu turda
yeniden ölçülür; `< 4.5:1` (küçük metin) ve `< 3:1` (büyük/UI) ihlal = düzeltme.

## 2. W3C — Understanding SC 1.4.11 Non-text Contrast (Level AA)

**URL:** https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html

**Normatif eşikler:**
- UI bileşenini/state'ini tanımak için gereken görsel bilgi: bitişik renklere
  karşı **≥ 3:1** (inaktif bileşen muaf).
- Anlaşılmak için gereken grafik nesne parçaları: **≥ 3:1**.
- Odak göstergesi (author-supplied): bitişik zemine karşı **≥ 3:1** (G195/C40).
- Hover ek-yemi "gerekli" değildir (işaretçinin konumu göstergedir), ama hover
  bileşenin kontrastını DÜŞÜREMEZ.
- Odaklanmış/unfocused **arasındaki fark** ölçülmez; her durum kendi bitişik
  rengine karşı ölçülür.

**Faz E etkisi:** satın alma butonları zaten metin taşır (metin kontrastı yeterli
→ sınır çizgisi zorunlu değil, Fig.30). Odak göstergesi: `button:focus-visible`
`rgba(168,85,247,0.6)` 2px outline — koyu zeminde ~3:1 üstü (mor parlaklığı
yeterli); turda gözle doğrulanır, değişiklik gerekmezse dokunulmaz.

## 3. MDN — `@layer` (K-2 kök neden kanıtı)

**URL:** https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer

**Kural (doğrudan alıntı niteliğinde):** katmanlı stiller kendi arasında
kademelenir; **katman DIŞI stiller, katman İÇİ stilleri HER ZAMAN ezer**
(spesifite ve kaynak sırası fark etmez). Katman sırası ilk bildirime göre
dizilir; Tailwind v3 kendi katman sırasını (`base → components → utilities`)
kendi bildirimiyle kurar.

**K-2'ye uygulanması:** derlenen `dist` paketinde **sıfır `@layer` bildirimi**
vardır (doğrulandı: `grep -c "@layer" dist/assets/index-*.css` → 0). Yani bu
projede katman sistemi devrede DEĞİL; mekanizma daha basit: **düz kaynak sırası**
— `@tailwind utilities` dosyanın başında genişler, `.glass-panel*` kuralları
sonda yazılır → eşit spesifitede (0,1,0) **sondaki kazanır** → `bg-*` /
`border-*-*` / `bg-gradient-*` ölü kalır (doğrulanan örnek: `AchievementToast:54`
`bg-[#141017]/95`).

**Onaylanan düzeltme (3 adaydan):**
| Aday | Etki | Karar |
| :--- | :--- | :--- |
| Ölü `bg-*` sınıflarını tek tek silmek (~99 nokta) | Tasarlanan aksanlar kaybolur; dev diff | RED |
| `.glass-panel*`'ı `@layer components`'e taşımak | Dosyada katman yokken ilk katmanı açar; katman-dışı state sınıflarıyla etkileşim riski | RED (aşırı mimari) |
| Seçicileri `:where()` ile sarmak (spesifite 0) | Tek CSS dokunuşu; utility'ler (0,1,0) kazanır; katman-dışı state sınıfları (`ds-ramp-*`, `hero-accent-*`) yine kazanır; hover varyantları (0,2,0) kazanır | **KABUL** |

Spesifite matematiği (düzeltme sonrası, hepsi katmansız + kaynak sırası):
`.glass-panel-card`(0,0,0) < utility(0,1,0) < `ds-ramp-locked`(0,1,0, sonda
değil — ramp utilities'ten SONRA mı? ramp kuralları style.css'te ~99. satır,
glass ~127. satır... tie (0,1,0)=(0,1,0) → SONDAKİ kazanır → glass (127) ramp'i
(99) ezerdi! Düzeltme sonrası glass (0,0,0) < ramp (0,1,0) → **ramp kazanır** —
bu DAHA doğru (state > yüzey). `hover:` varyantları (0,2,0) her ikisini de
ezer — doğru (etkileşim > state > yüzey).
