# FAZ A — Derinleştirme Spesifikasyonu: Zemin & CRT

**Tarih:** 2026-10-16 · **Durum:** Uygulamaya hazır (orchestrator spec) · **Kapsam:** YALNIZ Faz A
**Üst belge:** [`visual-language-hungry-parlor-implementation-plan-2026-10.md`](visual-language-hungry-parlor-implementation-plan-2026-10.md) §4
**Bağlayıcı sözleşme:** [`brain/context/visual-language.md`](../context/visual-language.md) · ADR-0060
**Önceller:** ADR-0049 (Kural 1: AlgorithmicSwirl korunur) · ADR-0044 (shake containment) · ADR-0058 (motion kapısı, rezerve renk)

> **Tek cümlelik hedef:** Oyunun zeminini "steril mavi-siyah kuantum HUD"tan "sıcak ink-black kumarhane"ye çevir
> ve **hâlihazırda kablolu ama ölü olan** `crtEffect` ayarını statik, okunaklı, sıfır-CPU bir CRT kaplamasına bağla.

---

## 1. Denetim Özeti (3 paralel census, 2026-10-16)

| Öğe | Mevcut durum | Kanıt |
| :--- | :--- | :--- |
| `crtEffect` kablolaması | ✅ Tam: type → state default `true` → migrasyon → UI toggle → kök `crt-off` sınıfı | `models/settings.ts:26`, `models/types.ts:197`, `state.ts:222`, `actions-save.ts:736`, `GameplaySettings.vue:78-81/352-365`, `useNavigation.ts:325-326` |
| `crt-off` CSS karşılığı | ❌ **YOK** — sınıf toggle ediliyor, hiçbir kural tüketmiyor | `useNavigation.ts:326`; `style.css`'te `.crt-off` yok |
| `.crt-overlay`/`.crt-vignette`/`.crt-scanlines` | ⚠️ **Gerçek stil yok** — yalnız 2 kapatma listesinde no-op | `style.css:1181-1183`, `1217-1220` |
| `body::before/after` CRT | ❌ `display:none !important` (ölü) | `style.css:475-480` |
| CRT görsel katmanı / bileşeni | ❌ Yok | `glob **/*Crt*` → 0 dosya |
| `--ds-bg` | ⚠️ Tanımlı ama **hiçbir yerde tüketilmiyor** | `style.css:42`; tüketilen tek değişkenler `--ds-panel/-border/-strong/-track` |
| Ana zemin hex'i `#08090d` | ⚠️ **5 ayrı yerde çiftlenmiş** | `index.html:7` (theme-color), `index.html:17` (body), `style.css:9`, `App.vue:164`, `AlgorithmicSwirl.vue:515`; ayrıca `style.css:1114` scrollbar |
| Panel yüzeyleri | ⚠️ İki aile: tokenli (`--ds-panel*`) + hardcoded (`.glass-panel-card`, `.panel-hero`) | `style.css:90-127` |
| Satır içi hardcoded zemin hex'i | ⚠️ 9 adet `bg-[#…]` | §6.3 tablosu |
| `bg-black/NN` | ⚠️ 161 kullanım (nötr siyah; ısınmaz ama bozmaz) | census §4.4 |
| `.cosmic-vignette`/`.singularity-horizon` | ⚠️ **İki dosyada kopya** — senkron güncellenmeli | `style.css:1240-1252` + `ScreenOverlay.vue:116-131` |
| Kök div transform/filter | ✅ **Yok** → `position:fixed` CRT güvenli | `App.vue:164` |
| `#game-main-content` | ⚠️ shake'te `translate3d` + `will-change: transform` → containing block | `style.css:410-413,556-575`; `JuiceLayer.vue:426-475` |
| `slate.500/600/700` | ✅ **Zaten WCAG override edilmiş** (varsayılan Tailwind değil) | `tailwind.config.js:14-18` |
| `m6x11` font | ⚠️ `public/fonts/m6x11.woff2` **repoda var ama hiç bağlı değil** | `public/fonts/m6x11.woff2`; `@font-face` yok |
| CRT/motion testi | ❌ Yok | `src/test/` 0 eşleşme |

---

## 2. Kanıt: Kontrast Ölçümleri (Node ile hesaplandı — `harness:contrast`)

### 2.1 Sayfa zemini: `#08090d` → `#0a0608` (ısınma)

| Metin | `#08090d` (mevcut) | `#0a0608` (yeni) | Δ |
| :--- | ---: | ---: | :--- |
| slate-100 | 18.17 | **18.39** | +0.22 |
| slate-200 | 16.14 | **16.34** | +0.20 |
| slate-300 | 13.40 | **13.57** | +0.17 |
| slate-400 | 7.76 | **7.86** | +0.10 |
| slate-500 (override) | 5.23 | **5.29** | +0.06 |
| slate-600 (override) | 4.87 | **4.93** | +0.06 |
| slate-700 (override) | 4.68 | **4.73** | +0.05 |
| cyan-300 | 13.73 | **13.90** | +0.17 |
| amber-300 | 13.80 | **13.97** | +0.17 |
| purple-400 | 7.53 | **7.62** | +0.09 |
| rose-400 | 7.39 | **7.48** | +0.09 |
| `--feast` #ff3355 | 5.55 | **5.62** | +0.07 |

**Sonuç: ısınma hiçbir kontrastı bozmuyor, hepsini hafifçe iyileştiriyor.** (`#0a0608` L=0.00212 < `#08090d` L≈0.00255.)

### 2.2 Panel yüzeyleri: soğuk → sıcak (kompozit ölçüm)

Sıcak panel önerisi **`slate-700`'ün AA sınırındaki marjinal durumunu da düzeltiyor:**

| Metin | Soğuk `.glass-panel-card` | Sıcak `.glass-panel-card` | Not |
| :--- | ---: | ---: | :--- |
| slate-500 | 5.00 | **5.05** | ✅ |
| slate-600 | 4.66 | **4.71** | ✅ |
| **slate-700** | **4.48** ❌ | **4.52** ✅ | **AA sınırını geçiyor** |
| slate-300 | 12.82 | **12.96** | ✅ |
| slate-200 | 15.44 | **15.61** | ✅ |

→ **Isınma, WCAG AA açısından net kazanç.** (Not: `slate-700` soğuk zeminde 4.48 ile sınırın altındaydı.)

### 2.3 `--bicycle` uyarısı
`#c40f2e` sayfa zemininde **3.31:1** → **metin olarak kullanılamaz**. Sözleşmedeki "yalnız yüzey/ağırlık verir,
durum anlatmaz" kuralı matematiksel olarak doğrulandı. Kodda `text-[#c40f2e]` benzeri kullanım **yasak**.

---

## 3. Kilitli Kararlar

| # | Karar | Gerekçe |
| :--- | :--- | :--- |
| **A-K1** | `--ds-bg` **tek kaynak olur**; `#08090d` çiftlenmesi (5 yer) tek kaynağa indirilir | `--ds-bg` şu an ölü token |
| **A-K2** | Zemin `#0a0608` (sıcak ink-black); panel ailesi sıcak tona çekilir | Ölçüm: kontrast iyileşiyor (§2) |
| **A-K3** | Panel yüzeyleri **tokenleşir** (`--ds-card`, `--ds-card-hover`, `--ds-hero`) | `glass-panel-card`/`panel-hero` şu an hardcoded → tek kaynak disiplini |
| **A-K4** | **CRT tamamen statiktir** — animasyon/flicker YOK | WCAG 2.3.1 (10°'de >3 flaş/s = Level A ihlali) + performans (statik gradyan bir kez boyanır) |
| **A-K5 (O4 kapandı)** | `CrtOverlay` = `#game-main-content`'in **kardeşi**, yeni `.layer-crt { z-index: 40 }` | İçerik(10)+vinyet(30) üstünde; juice(60)/toast(70)/modaller(80) altında (okunabilirlik + VS bloom önde) |
| **A-K6** | CRT **hiç JS gerektirmez** — tüm kapılar CSS'te | `crt-off` sınıfı zaten `crtEffect + motion reduced/off`'u birleştiriyor (`useNavigation.ts:325-326`) → yeni state/reaktivite YOK |
| **A-K7** | Gerçek eğrilik (barrel distortion) **yapılmaz**; curvature illüzyonu güçlü kenar vinyetiyle verilir | Shader/SVG displacement = köke `filter` (ADR-0044 ihlali) + pahalı; Balatro da bunu yapıyor |
| **A-K8 (O3 kapandı)** | CRT şiddeti tek knob ailesiyle verilir; **Faz A baseline = K0** (`--crt-scanline-alpha: .10`). Faz B `[data-corruption]` ile yükseltir | Faz A makineyi kurar, Faz B ilerlemeyi bağlar |
| **A-K9 (M7)** | `m6x11` **ertelenir** | Lisans "free to use with attribution" (resmî lisans dosyası yok) → alınırsa atıf zorunlu. Dosya repoda hazır ama bağlanmayacak |
| **A-K10** | CRT z katmanı **modal altı** | Modal metni okunaklı kalmalı (kullanıcı kararı: okunabilirlik kanonu) |

---

## 4. Token Sözlüğü (kesin değerler)

### 4.1 `src/style.css` `:root` — değişen/eklenen

| Token | Önce | Sonra | Not |
| :--- | :--- | :--- | :--- |
| `--ds-bg` | `#07090e` | **`#0a0608`** | sıcak ink-black (Balatro `#0D0A12`–`#100808` ailesinin daha koyu/sıcak üyesi) |
| `--ds-panel` | `rgba(12,16,24,.78)` | **`rgba(19,14,19,.78)`** | ısınmış panel |
| `--ds-panel-strong` | `rgba(14,19,28,.90)` | **`rgba(20,15,20,.90)`** | |
| `--ds-card` **(YENİ)** | — | `rgba(19,14,18,.88)` | `.glass-panel-card` |
| `--ds-card-hover` **(YENİ)** | — | `rgba(26,20,25,.94)` | |
| `--ds-hero` **(YENİ)** | — | `rgba(19,13,17,.90)` | `.panel-hero` |
| `--ds-border` | `rgba(255,255,255,.08)` | **değişmez** | |
| `--ds-border-strong` | `rgba(255,255,255,.14)` | **değişmez** | |
| `--ds-track` | `rgba(0,0,0,.5)` | **değişmez** | |
| **`--feast` (YENİ)** | — | **`#ff3355`** | oburluk/olay enerjisi (rezerve renk ailesine yeni üye; `rose` ikazdır, karışmaz) |
| **`--bicycle` (YENİ)** | — | **`#c40f2e`** | yalnız yüzey/ağırlık — **metin olarak yasak** (§2.3) |
| **`--ds-vignette-core` (YENİ)** | — | `rgba(14,5,9,.86)` | sıcak köşe kararması |
| **`--ds-vignette-warm` (YENİ)** | — | `rgba(255,51,85,.05)` | `--feast` vinyet halkası |
| **`--crt-scanline-alpha` (YENİ)** | — | `0.10` | K0 baseline; Faz B yükseltir |
| **`--crt-scanline-period` (YENİ)** | — | `4px` | 2px boşluk + 2px çizgi (Balatro oranı) |
| **`--crt-vignette-alpha` (YENİ)** | — | `0.30` | |
| **`--crt-glow-alpha` (YENİ)** | — | `0.015` | hafif fosfor — **okunabilirlik ölçülecek** |

### 4.2 `tailwind.config.js` — `dark.*` ısınması

| Sınıf | Önce | Sonra |
| :--- | :--- | :--- |
| `dark.950` | `#07090e` | **`#0a0608`** |
| `dark.900` | `#0d1117` | **`#141016`** |
| `dark.850` | `#131822` | **`#1b151b`** |
| `dark.800` | `#1b2230` | **`#241b22`** |
| `dark.700` | `#283347` | **`#33262e`** |

> `slate.500/600/700` override'ları **DOKUNULMAZ** (bilinçli WCAG kararı). Yorum satırındaki
> `// 5.23:1 on #08090d` → `// 5.29:1 on #0a0608` olarak güncellenir.

### 4.3 Rezerve renkler — dokunulmaz
amber(prestij) · cyan(bonus) · rose(risk) · purple/violet(katman) · emerald/blue(bölüm kimliği). Hiçbiri değişmez.

---

## 5. `CrtOverlay.vue` Sözleşmesi (YENİ — saf CSS, JS yok)

```vue
<script setup lang="ts">
// Statik CRT kaplaması. Animasyon YOK (WCAG 2.3.1 + performans).
// Tüm görünürlük kapıları CSS'te: .crt-off (ayar + motion reduced/off),
// .battery-saver, OS prefers-reduced-motion, forced-colors.
</script>

<template>
  <div
    class="layer-crt crt-layer pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full overflow-hidden select-none"
    aria-hidden="true"
  >
    <div class="crt-scanlines absolute inset-0"></div>
    <div class="crt-vignette absolute inset-0"></div>
    <div class="crt-glow absolute inset-0"></div>
  </div>
</template>
```

**Kurallar:**
- Bileşen **hiç JS/props/store okumaz** → reaktivite, watcher, rAF yok.
- `App.vue`'da **`#game-main-content`'in kardeşi** olarak konur (bkz. §7.1).
- `pointer-events-none` + `aria-hidden="true"` (dekoratif).
- Kök elemanda `transform`/`filter`/`backdrop-filter` **yok** (ADR-0044).
- `w-screen`/`h-screen` repo konvansiyonu için `max-w-full max-h-full` ile sınırlanır (ScreenOverlay deseni).

---

## 6. Dosya Bazlı İş Listesi

### 6.1 A1 — Zemin tek kaynak (orchestrator)

| Dosya:satır | Değişiklik |
| :--- | :--- |
| `index.html:7` | `content="#08090d"` → `content="#0a0608"` (meta theme-color literal olmalı, var() kullanamaz) |
| `index.html:17` | `<body class="… bg-[#08090d] …">` → bg sınıfı **kaldırılır** (tek kaynak `style.css` base) |
| `style.css:9` | `@apply bg-[#08090d]` → **düz CSS** `background-color: var(--ds-bg);` |
| `App.vue:164` | `bg-[#08090d]` kök sınıftan **kaldırılır** (body'den miras) |
| `style.css:1114` | scrollbar track `#08090d` → `#0a0608` |
| `style.css:1117` | scrollbar thumb `#1b202e` → `#241b22` |
| `style.css:1121` | scrollbar hover `#2b334a` → `#33262e` |
| `AlgorithmicSwirl.vue:515` | fallback `via-[#08090d] to-[#040507]` → `via-[#0a0608] to-[#07030a]` |

### 6.2 A2 — Panel yüzeyleri tokenleşir + ısınır (orchestrator)

| Dosya:satır | Değişiklik |
| :--- | :--- |
| `style.css:41-55` | `:root` blok: §4.1 tablosundaki tüm tokenlar |
| `style.css:90-96` | `.glass-panel` → `var(--ds-panel)` (zaten tokenli, değer değişir) |
| `style.css:99-103` | `.glass-panel-glow` → `var(--ds-panel-strong)` |
| `style.css:106-111` | `.glass-panel-card` → `background: var(--ds-card)` |
| `style.css:113-116` | `.glass-panel-card:hover` → `background: var(--ds-card-hover)` |
| `style.css:119-127` | `.panel-hero` → `background: var(--ds-hero)` |

### 6.3 A3 — Sıcak vinyet (orchestrator; **iki dosya senkron**)

`style.css:1240-1244` **ve** `ScreenOverlay.vue:116-121`:
```css
.cosmic-vignette {
  background:
    radial-gradient(ellipse 65% 55% at 50% 40%, rgba(0, 240, 255, 0.02) 0%, transparent 70%),
    radial-gradient(ellipse 128% 108% at 50% 50%, transparent 55%,
      var(--ds-vignette-warm) 80%, var(--ds-vignette-core) 100%);
}
```
> Soğuk cyan merkez ışıması **korunur** (uzay hissi); yalnız dış halka ısınır + `--feast` halkası eklenir.
> Üç duraklı gradyan **banding'i de azaltır** (near-black gradyanların bilinen sorunu).

`ScreenOverlay.vue` scoped blokta `var()` kullanımı kök `:root`'tan çözülür (scoped olsa da custom property miras alınır) — **doğrulanacak**.

### 6.4 A4 — CRT katmanı (orchestrator)

| Dosya | Değişiklik |
| :--- | :--- |
| `src/components/CrtOverlay.vue` | **YENİ** — §5 sözleşmesi |
| `App.vue` | `<CrtOverlay />` import + template'te `<ScreenOverlay />`'dan sonra, `#game-main-content`'in kardeşi |
| `style.css` | Yeni CRT bloğu: `.layer-crt{z-index:40}`, `.crt-scanlines`, `.crt-vignette`, `.crt-glow`, kapılar |
| `style.css:1176-1194` | reduced-motion `animation:none` listesinden `.crt-overlay` **çıkarılır** (artık animasyonu yok); `.crt-layer`/`.crt-glow` da eklenmez |
| `style.css:1215-1220` | `display:none` listesi `.crt-layer`'a taşınır (force-colors + OS reduced-motion dahil) |
| `style.css:475-480` | `body::before/after { display:none }` kuralı **KALIR** (tema dışı sızıntıya karşı) + yorum güncellenir ("CrtOverlay.vue ile değiştirildi") |

**CRT CSS taslağı:**
```css
/* ===== CRT Kaplaması (Faz A) — STATİK, animasyonsuz =====================
   Kapsam: yalnız dekoratif tüp dokusu. Sayı/etiket/tooltip asla bozulmaz.
   z=40: içerik(10)+vinyet(30) üstü, juice(60)/toast(70)/modal(80) altı.
   Kapı: .crt-off (ayar+motion) · .battery-saver · OS reduced-motion · forced-colors.
   ======================================================================== */
.layer-crt { z-index: 40; }

.crt-scanlines {
  background: repeating-linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0px,
    rgba(0, 0, 0, 0) calc(var(--crt-scanline-period) / 2),
    rgba(0, 0, 0, var(--crt-scanline-alpha)) calc(var(--crt-scanline-period) / 2),
    rgba(0, 0, 0, var(--crt-scanline-alpha)) var(--crt-scanline-period)
  );
}
.crt-vignette {
  background: radial-gradient(ellipse 120% 105% at 50% 50%, transparent 52%,
    rgba(255, 51, 85, calc(var(--crt-vignette-alpha) * 0.18)) 78%,
    rgba(0, 0, 0, var(--crt-vignette-alpha)) 100%);
}
.crt-glow {
  background: radial-gradient(ellipse 70% 60% at 50% 42%,
    rgba(255, 245, 235, var(--crt-glow-alpha)) 0%, transparent 72%);
}

/* Kapılar */
.crt-off .crt-layer,
.battery-saver .crt-layer { display: none !important; }

@media (prefers-reduced-motion: reduce) {
  .crt-layer { display: none !important; }
}
@media (forced-colors: active) {
  .crt-layer { display: none !important; }
}
```

### 6.5 A5 — Ayar canlandırma (kullanıcı metni)
`GameplaySettings.vue:352-365` metni zaten doğru: *"Eski tüplü televizyon ve retro cyberpunk dokusu"*.
→ **Değişiklik gerekmez**; Faz A sonunda ayar **gerçekten çalışır** hale gelir. (Aç/Kapalı anında etki.)

### 6.6 A6 — Font kararı
`public/fonts/m6x11.woff2` repoda var, **bağlanmaz** (A-K9). Faz E'de "kullanılmayan public varlık" olarak
temizlik adayı. Atıf zorunluluğu kabul edilirse krediler ekranına satır eklenir.

### 6.7 A7 — Kalıcı kontrast denetimi (önerilen, küçük)
`brain/scratchpad/harness/contrast.mjs` + `package.json` → `"harness:contrast"`.
Girdi: §2 tablolarındaki metin/zemin çiftleri. Çıktı: oran + AA/AAA verdict; `<4.5` **exit 1**.
Amaç: Faz A/B/C/E boyunca palet regresyonunu otomatik yakalamak.

---

## 7. Uygulama Dalgası & Dosya Sahipliği

> Kural (ADR-0058 dalga 2 deseni): **her agent yalnız kendi dosyalarını düzenler**; paylaşılan
> dosyalar orchestrator'da kalır. `brain/**`, `dist/**`, test dosyaları ve başka bölümün dosyaları ELLENMEZ.

| Sahip | Dosyalar |
| :--- | :--- |
| **Orchestrator** | `src/style.css` (tüm), `src/App.vue`, `index.html`, `tailwind.config.js`, `src/components/CrtOverlay.vue` (yeni), `brain/**` |
| **Subagent A (ıslatma)** | `src/components/CommentTicker.vue`, `src/components/WelcomeBackModal.vue`, `src/components/ConfirmModal.vue`, `src/components/AdminPanel.vue`, `src/components/AchievementToast.vue`, `src/components/AnomalyOverlay.vue`, `src/components/FloatingThumbBar.vue`, `src/components/AlgorithmicSwirl.vue` (yalnız bir sınıf) |
| **Subagent B (QA)** | Salt-okunur denetim + rapor (dosya düzenlemez) |

### Subagent A — ısınma tablosu (yalnız sınıf değişimi)

| Dosya:satır | Önce | Sonra |
| :--- | :--- | :--- |
| `App.vue:201` ⟵ **orchestrator** | `bg-[#0c1017]/80` | `bg-[#130f14]/80` |
| `CommentTicker.vue:366` | `bg-[#0c1017]/85` | `bg-[#130f14]/85` |
| `CommentTicker.vue:393` | `from-[#0c1017]` | `from-[#130f14]` |
| `CommentTicker.vue:394` | `from-[#0c1017]` | `from-[#130f14]` |
| `WelcomeBackModal.vue:59` | `bg-[#0b0d14]/95` | `bg-[#120e13]/95` |
| `ConfirmModal.vue:47` | `bg-[#0b0d14]/95` | `bg-[#120e13]/95` |
| `AdminPanel.vue:374` | `bg-[#0d0710]` | `bg-[#140c12]` |
| `AchievementToast.vue:54` | `bg-[#0e121a]/95` | `bg-[#141017]/95` |
| `AnomalyOverlay.vue:209` | `bg-[#0a0d14]` | `bg-[#110d12]` |
| `FloatingThumbBar.vue:110` | `bg-[#090d15]/90` | `bg-[#100c11]/90` |
| `AlgorithmicSwirl.vue:515` ⟵ **orchestrator** | `via-[#08090d] to-[#040507]` | `via-[#0a0608] to-[#07030a]` |

> Kural: aynı **R≈B, G en düşük** karakteri; mavi kanal düşürülür, kırmızı hafif yükseltilir.
> Kesin hex'ler görsel doğrulamada ±3 ton ince ayarlanabilir.

---

## 8. Kabul Kriterleri

- [ ] **Tek kaynak:** `#08090d` repoda **0 kez** geçer (yalnız `brain/` tarihsel kayıtlarında kalır).
- [ ] **Ayar canlı:** `crtEffect` Aç/Kapalı → CRT katmanı anında görünür/kaybolur.
- [ ] **Motion kapıları:** `reduced` ve `off` modlarında CRT görünmez; `batterySaver` CRT'yi kapatır; OS `prefers-reduced-motion: reduce` kapatır.
- [ ] **Forced-colors:** Windows Yüksek Karşılaştırma emülasyonunda CRT görünmez (§6.4 guard).
- [ ] **ADR-0044:** shake tetiklendiğinde mobil dock + FloatingThumbBar **hiç oynamaz/silinmez**.
- [ ] **Okunabilirlik:** sayı/etiket/tooltip okunurluğu değişmemiş; §2 ölçümleri CI'da (`harness:contrast`) geçiyor.
- [ ] **Bandıng yok:** yeni sıcak vinyet near-black zeminde görünür bant üretmiyor (scanline maskeliyor).
- [ ] **DPR:** DPR 1 ve DPR 2'de scanline periyodu tutarlı/zarif (moiré yok).
- [ ] **AlgorithmicSwirl** korunuyor (ADR-0049 Kural 1) — dokunulmadı.
- [ ] `npm run typecheck` 0 hata · `npm test` yeşil · `npm run build` 0 hata.
- [ ] `npm run harness:perf` regresyonu yok (statik CSS; tick'e etki beklenmiyor).

---

## 9. Riskler ve Önlemler

| Risk | Etki | Önlem |
| :--- | :--- | :--- |
| CRT'yi `#game-main-content` içine/üstüne koymak | ADR-0044: shake'te fixed UI kaybolur | Kardeş eleman; `will-change:transform` içeren div'e **girmez** |
| Köke `filter`/`backdrop-filter` | Tüm fixed katmanlar kırılır | Kullanılmaz (grafikler düz gradient) |
| Near-black gradyan **banding** | Çirkin bant çizgileri | 3 duraklı gradyan + üstteki scanline katmanı dither görevi görür |
| İnce scanline **moiré/alias** | Metinle çakışma | Periyot `4px` (≥3px); DPR 1+2'de görsel doğrulama; `image-rendering: pixelated` **kullanılmaz** |
| `--crt-glow` metin kontrastını düşürür | Okunabilirlik | Alpha `.015`; §2 ölçüm turu ile doğrulanır |
| `bg-black/NN` (161 kullanım) nötr kalır | Isınma tam hissedilmez | **Kabul edilir**: nötr siyah sıcak zemine oturur; toplu değişim kapsam dışı |
| `ScreenOverlay.vue` scoped'daki `var()` çözülmez | Vinyet bozulur | Doğrulanacak; gerekirse literal sıcak değer yazılır |
| `@apply bg-[var(--ds-bg)]` Tailwind arbitrary-value sorunu | Build hatası | Base katmanda **düz CSS** `background-color: var(--ds-bg)` kullanılır |
| `forced-colors` / OS reduced-motion | CRT görünür kalır | Açık `@media` guard'ları (§6.4) |

---

## 10. Kapsam Dışı (Faz A'da YAPILMAZ)

- ❌ `corruption.ts` / `data-corruption` / `--crt-intensity` seviye eğrisi → **Faz B**
- ❌ Motif bandı, substrat, Wrinkler kaplaması, kolaj vinyetleri → **Faz C**
- ❌ Partikül şöleni / yeni `particles.ts` → **Faz D**
- ❌ Tüm bileşenlerin renk retrosu + tam WCAG turu → **Faz E**
- ❌ `bg-black/NN` toplu ısıtma, `quantum.*` ölü token temizliği, `m6x11` bağlama → **Faz E**
- ❌ `body::before/after` pseudo-element yaklaşımı → **terk edildi** (bileşen yaklaşımı seçildi)
- ❌ Davranış/mekanik/denge değişikliği — **hiçbiri** (yalnız sunum)

---

## 11. Doğrulama Protokolü (Faz A kapanışı)

1. `npm run typecheck` → 0 hata
2. `npm test` → tüm testler yeşil (mevcut taban)
3. `npm run build` → 0 hata
4. `npm run harness:contrast` (yeni) → tüm çiftler ≥ AA
5. `npm run harness:perf` → churn/wall regresyonu yok
6. Görsel tur matrisi: **{full, reduced, off} × {batterySaver on/off} × {DPR 1, DPR 2} × {desktop, <768px}** + forced-colors emülasyonu
7. Shake testi (ADR-0044): dock + thumb bar sabit
8. `brain/tasks/completed.md` kaydı + `todo.md` Faz A `[x]` + `in-progress.md` Faz B'ye taşıma
9. Conventional commit + push (`feat: visual language phase A — warm ink-black ground + static CRT`)

---

## 12. Brain Hijyeni (bu spec ile birlikte)

- `brain/tasks/completed.md` içinde **bayat kayıt**: "App.vue: syncEffectClasses()" — fonksiyon
  `useNavigation.ts:321`'de yaşıyor. Düzeltme notu eklenecek.
- `brain/tasks/todo.md` "Aç Kumarhane" bloğu: Faz A `[~]` (uygulama başladı) olarak işaretlenir.
- `brain/tasks/in-progress.md`: Faz A aktif dalga.
