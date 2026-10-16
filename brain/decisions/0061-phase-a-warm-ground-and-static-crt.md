# ADR-0061: Faz A — Sıcak Zemin ("Aç Kumarhane") ve Statik CRT Katmanı

- **Tarih:** 2026-10-16
- **Durum:** Uygulandı (Faz A kapsamı) — Faz B/C/D/E bekliyor
- **Kapsam:** Renk zemin tokenları, panel yüzey tokenları, vinyet, yeni `CrtOverlay.vue` katmanı, z-index merdiveni, erişilebilirlik kapıları
- **Önceller:** ADR-0060 (GIC kimlik + faz-temelli bozulma — bu ADR onun **Faz A** ayağıdır) · ADR-0058 (motion kapısı + rezerve renk) · ADR-0049 (Okunaklı Balatro) · ADR-0044 (shake containing-block) · ADR-0040 (modern minimalist HUD)
- **Derin spesifikasyon:** `brain/research/phase-a-ground-crt-deep-spec-2026-10.md`
- **Bağlayıcı sözleşme:** `brain/context/visual-language.md`

---

## 1. Bağlam

ADR-0060 oyunun görsel dilini "Aç Kumarhane"ye çevirme kararını verdi ve bunu fazlara böldü.
Faz A iki işi kapsar: **(a)** zeminin soğuk "kuantum HUD" siyahından sıcak **ink-black**'e
çevrilmesi, **(b)** hâlihazırda kablolu ama **ölü** olan `crtEffect` ayarının gerçek bir CRT
tüp katmanına bağlanması.

Üç paralel kod denetimi (zemin/renk census, katman/z-index census, CRT/motion kablolama census)
şu bulguları verdi:

1. **`crtEffect` uçtan uca kablolu** (type → `state.ts` default `true` → kayıt migrasyonu →
   `GameplaySettings` toggle → `useNavigation.syncEffectClasses()` → kök `crt-off` sınıfı),
   **ama hedef görsel katman yok**: `.crt-overlay` / `.crt-vignette` / `.crt-scanlines`
   yalnızca iki "kapatma listesinde" no-op seçiciydi; `body::before/after` ise
   `display:none !important` ile ölüydü. Ayar değiştirildiğinde görsel olarak hiçbir şey olmuyordu.
2. **`--ds-bg` tanımlı ama hiç tüketilmiyordu**; ana zemin hex'i `#08090d` **5 ayrı yerde**
   çiftlenmişti (`index.html` ×2, `style.css` base, `App.vue` kökü, `AlgorithmicSwirl` fallback).
3. **Panel yüzeyleri iki aileye bölünmüştü:** tokenli (`--ds-panel*`) ve hardcoded
   (`.glass-panel-card`, `.panel-hero`).
4. **Kök div'de transform/filter/backdrop-filter YOK** → `position:fixed` CRT katmanı güvenli.
   Ancak `#game-main-content` shake anında `translate3d` **+ `will-change: transform`** alıyor →
   içine konan her şey hapsolur (ADR-0044).
5. **Kontrast:** proje `slate.500/600/700`'ü zaten WCAG için override etmişti (varsayılan
   Tailwind değerleri değil). Ölçüm, ısınmanın **tüm oranları hafifçe iyileştirdiğini** gösterdi.

## 2. Karar

### 2.1 Tek kaynak zemin
`--ds-bg` **tek kaynak** olur. `#08090d` çiftlenmesi kaldırılır: `body` sınıfı ve `App.vue`
kök div sınıfı silinir; base katman `background-color: var(--ds-bg)` kullanır; `index.html`
`theme-color` (literal zorunlu) ve `tailwind.config.js` `dark.950` aynı değere hizalanır.
`--ds-bg` = **`#0a0608`** (Balatro'nun `#0D0A12`–`#100808` ailesinin daha koyu/sıcak üyesi).

### 2.2 Panel yüzeyleri tokenleşir ve ısınır
`.glass-panel-card` / `.glass-panel-card:hover` / `.panel-hero` artık hardcoded değil:
`--ds-card` / `--ds-card-hover` / `--ds-hero`. Tüm panel ailesi R≈B, G en düşük olacak şekilde
ısıtılır. **Kanıt:** `slate-700` soğuk panelde **4.48:1** (AA altı) iken sıcak panelde
**4.52:1** (AA üstü) olur — ısınma salt estetik değil, erişilebilirlik kazancıdır.

### 2.3 CRT = statik tüp katmanı (animasyonsuz)
Yeni `src/components/CrtOverlay.vue` üç düz gradyan katmanı taşır: `.crt-scanlines`
(`repeating-linear-gradient`, periyot `--crt-scanline-period: 4px`), `.crt-vignette`
(sıcak kenar kararması) ve `.crt-glow` (hafif fosfor).

- **Animasyon yoktur.** Tekrarlayan flaş, WCAG 2.3.1'i (10° görüş açısında saniyede >3 flaş)
  ihlal eder. Ayrıca statik gradyan bir kez boyanır, sonra yalnızca composite edilir →
  ihmal edilebilir maliyet. "Titreşen CRT" fikri bilinçli olarak reddedildi.
- **Gerçek eğrilik (barrel distortion) yapılmaz.** Shader/SVG displacement köke `filter`
  gerektirir → hem ADR-0044 ihlali hem pahalı. Eğrilik **illüzyonu** kenar vinyetiyle verilir
  (Balatro'nun kendi yaklaşımı).
- **Bileşen hiç JS okumaz.** Tüm görünürlük kapıları CSS'tedir: `.crt-off` (ayar kapalı veya
  motion `reduced`/`off` — `syncEffectClasses()` bunu zaten tek sınıfa derliyor),
  `.battery-saver`, `@media (prefers-reduced-motion: reduce)` ve `@media (forced-colors: active)`.
  → **Faz A hiç yeni state/action eklemez.**

### 2.4 Katman konumu (O4 kararı kapandı)
`CrtOverlay`, `#game-main-content`'in **kardeşidir** (içine konmaz — ADR-0044). Yeni
`.layer-crt` = **z-index 40**:

```
0  AlgorithmicSwirl       10 #game-main-content     30 ScreenOverlay / dock / thumb bar
40 CRT tüp katmanı        50 anomali/strike/heart   60 JuiceLayer
70 toast                  80 modaller              9999 tooltip
```

Gerekçe: CRT içeriği ve kozmik vinyeti tarar ("dünyanın parçası"), ama **juice/anomali
parçacıkları, toast'lar ve modaller üstte kalır** (okunabilirlik kanonu + VS bloom önde).
`pointer-events-none` + `aria-hidden="true"` ile hiçbir etkileşimi engellemez.

### 2.5 Şiddet eğrisi (O3 kararı kapandı)
Faz A **K0 baseline**'ını kurar: `--crt-scanline-alpha: 0.10`, `--crt-vignette-alpha: 0.30`,
`--crt-glow-alpha: 0.015`. Faz B, `[data-corruption="K1"…]` seçicileriyle bu tokenları
yükseltir (makine Faz A'da, ilerleme Faz B'de). Ayar metni ("Kozmik CRT Scanline & Vinyet")
zaten doğruydu ve bu fazla birlikte **gerçekten çalışır** hale geldi.

### 2.6 Font (M7) ertelendi
`public/fonts/m6x11.woff2` repoda duruyor ama bağlanmadı: lisans "free to use with
attribution" (resmî lisans dosyası yok, atıf şartı var). Faz E'de ya atıfla bağlanır ya da
kullanılmayan varlık olarak temizlenir.

## 3. Sonuçlar

- **Tek kaynak:** `#08090d` çalışan kodda 0 kez geçer (yalnız tarihsel yorum notu).
- **Ölü ayar canlandı:** `crtEffect` toggle'ı anında görsel sonuç üretir; `crt-off` sınıfı
  artık gerçek bir tüketiciye sahiptir.
- **Kalıcı denetim:** `npm run harness:contrast` (yeni) palet regresyonunu AA eşiğine göre
  otomatik yakalar (Faz A/B/C/E boyunca).
- **Doğrulama:** `npm run typecheck` 0 hata · `npm test` 263/263 · `npm run build` 0 hata ·
  `npm run harness:perf` regresyon yok (değişiklik salt-CSS).
- **Ertelenen:** Faz B (corruption altyapısı + CRT şiddet eğrisi), Faz C (motif/substrat),
  Faz D (partikül şöleni), Faz E (retrofit + tam WCAG turu + `bg-black/NN` ısıtma).
