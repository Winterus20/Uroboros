# Görsel Dil Yayılım Sözleşmesi — Tüm Proje (2026-10, v1)

**Durum:** Aktif uygulama sözleşmesi — bu belge yayılım boyunca TEK gerçektir.
**Kaynak pass:** `dfa4dce` (ramp, glif, rezerve renk, nav renk-lengüajı, motion 3-state) + `brain/research/visual-language-over-text-research-2026-10.md`.
**Kapsam:** `src/components/**`, ilgili `src/composables/**`. Paylaşılan dosyalar (`src/style.css`, `DimensionRow.vue`, `useNavigation.ts`) yalnız orchestrator sahipliğindedir.

---

## 0. Amaç

"Yazı yığınından oyun diline": bilgi önce görsel kanaldan gelir (renk rampası, glif, çubuk, form, hareket); yazı yalnız mutlak sayıyı ve nüansı taşır. Şu an bu dil yalnız `DimensionRow` + nav + ayarlarda konuşuluyor; hedef: tüm sekmeler.

---

## 1. Durum ≠ Hue — Üç Durumlu Rampa (ZORUNLU)

Her satın alma / maliyetli aksiyon yüzeyi üç durumdan TAM birini gösterir:

| Durum | Sınıf | Anlam |
| :--- | :--- | :--- |
| ready | `ds-ramp-ready` (+ hazır ise `affordance-pulse`) | İşlem şimdi tam olarak yapılabilir |
| partial | `ds-ramp-partial` | Kısmi: 1 adet alınabilir ama seçili toplu/maks alınamaz; gereksinim %0–100 arası ilerliyor; ya da bekleme süresi (cooldown) akıyor |
| locked | `ds-ramp-locked` | Hiç yapılamaz: para yetersiz / özellik kilitli / gereksinim %0 |

Kurallar:
- Rampa yalnız opacity/kenarlık/zemin oynatır; **hue sözleşmesini ezmez**.
- Ready durumda bölüm/katman kimlik hue'u korunur (ör. boyutlarda purple + `affordance-pulse`; `DimensionRow.vue` kanonik örnektir).
- Locked'da içerik gizlenmez, solük kalır; ready'de okunabilirlik en yüksektir.
- Kısmi ilerleme varsa ASLA gizlenmez: packProgress, gereksinim yüzdesi, cooldown sayacı görünür kalır.

Kanonik örnek (`DimensionRow.vue`):

```ts
const affordRampClass = computed(() => {
  if (canAfford.value) return ''
  if (packProgress.value > 0) return 'ds-ramp-partial'
  return 'ds-ramp-locked'
})
```

```html
:class="[
  canAfford ? '<kimlik-hue> affordance-pulse' : `bg-black/30 text-slate-600 ... ${affordRampClass}`,
]"
```

---

## 2. Rezerve Renk Sözleşmesi (ZORUNLU)

| Hue | Anlam | Yasak |
| :--- | :--- | :--- |
| amber `#f59e0b` | SADECE progression / prestige / milestone / şafak eşiği | Genel vurgu, "alınabilir", dekoratif başlık |
| cyan `#06b6d2` | bonus / telemetri primi / anlık kazanç vurgusu | Kilit veya tehlike anlamı |
| rose `#f43f5e` | tehlike / kriz / risk / parazit | Ödül, kutlama, olumlu durum |
| slate/gri | kilitli / devre dışı / nötr ikincil | — |
| emerald, blue, violet, purple | YALNIZ bölüm/katman KİMLİĞİ (lab, botlar, koloni, boyutlar) | "Şimdi alınabilir" gibi DURUM anlamı |

- Durumlar (alınabilir / alınamaz / kısmi) ASLA hue ile anlatılmaz; ramp + ikon + çubuk anlatır.
- Tamamlanma/ödül vurgusu cyan (bonus) veya amber (milestone); emerald "tamamlandı" rozeti olarak kullanılmaz.
- Yeni vurgu gerekiyorsa önce mevcut kanallar tüketilir (ramp, alt çizgi, çubuk, pulse); yeni hue uydurulmaz.

---

## 3. Katman Glifi + Aksan (ZORUNLU)

Boyut/katman görsel olarak anıldığı her yerde `getTierGlyph(tier)` + `getTierAccent(tier)` (`src/game/dimension_identity.ts`) ve `.dim-glyph` sınıfı kullanılır. "D3" yalnız teknik/erişilebilirlik metninde (aria-label, tooltip nüansı) kalır; arayüz glifi gösterir.

- Glif her zaman `.dim-glyph` içinde (sabit genişlik — layout zıplamaz).
- Aksan sınıfı literal map'ten gelir (Tailwind JIT); dinamik sınıf üretilmez.
- Glif tek başına yetersizse `glif + D3` biçimi kullanılır (glif önde, teknik kimlik ikincil).

---

## 4. Oran = Çubuk, Sayı = tabular-nums (ZORUNLU)

"X / Y", "%N", "N adet kaldı / gerekiyor" gibi gereksinim ve ilerleme metinleri İKİNCİL kalır; birincil gösterim çubuktur:

- Mevcut sınıflar: `progress-track` + `progress-fill-*` (mini/sm/md boylar).
- Mutlak sayı çubuğun yanında küçük (`text-[10px]`), sayılar `tabular-nums`.
- Oran 0/1 ise (tamamen kilitli veya tamamen hazır) çubuk yerine rampa durumu yeterlidir.

---

## 5. Hareket 3-Durum + Juice Standardı (ZORUNLU)

- JS animasyonu çalıştıran her yol `motionMode`u dinler: `'off'` → çalıştırmaz; `'reduced'` → sadeleştirir; `'full'` → tam. CSS tarafı kök sınıflarla (`.reduce-anim` / `.motion-off`) zaten ezer; JS kararı ayrıca verilir.
- Dokunma geri bildirimi `pointerdown` anında ≤100 ms: `juice-punch` sınıfı + ses/haptic. Tek impuls + decay; tekrarlayan pulse yasak (WCAG 2.3.1).
- Yükselen "+N" uçan metinleri `rise-float` sınıfını kullanır.
- Parçacık doğuran her yol emisyon tavanına tabidir (JuiceLayer havuzu / mevcut cap'ler).

---

## 6. Yasaklar

- Dinamik Tailwind sınıf birleştirme (`text-${color}-300` gibi) — JIT literal ister; literal ternary/map kullanılır.
- `any`, `// TODO`, geçiştirici gövdeler (AGENTS.md §5).
- Bilgiyi YALNIZ tooltip'te tutmak: her tooltip'ın görsel karşılığı olmalı (ikon/çip/çubuk/renk); tooltip nüans ekler, tek kanal olamaz.
- İngilizce durum anahtarı ("locked", "cost") UI metnine sızdırmak; tüm oyuncu metni Türkçe ve mevcut üslupla tutarlıdır.

---

## 7. Tanım Bitti (Acceptance)

1. Hiçbir satın alma yüzeyi ikili durumda değil — ready/partial/locked tam.
2. Hiçbir yerde amber=dekor, emerald=alınabilirlik, rose=ödül kullanımı yok.
3. Boyutu görsel anan her alanda glif + aksan var.
4. Kritik gereksinim/oran göstergeleri çubuklu.
5. `npm test` + `npm run build` temiz; bağımsız QA denetimi sözleşme ihlali bulamıyor.
