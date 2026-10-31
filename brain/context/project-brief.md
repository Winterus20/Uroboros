# Project Brief: Hold That Number

> **Durum:** tema pivotu uygulandı (ADR-0077) · görsel dil kilitli (ADR-0078) · 1. basamak v3
> uygulanıyor (ADR-0086: boost + sıfırlamalı 8 mücadele, süreler geçici). Eski "Kozmik Oburluk / UROBOROS" teması ve kütle ekonomisi **koddan
> silindi**; bu brief yeni oyunun gerçeğidir.

## 1. Vizyon

Tek bir sayı. Oyuncu onu büyütür, 11 basamaklık bir notasyon merdiveninde yukarı taşır ve
merdivenin sonunda — `LNGN`'de — oyun biter. Bir kuyruk, bir NG+, bir "temel teori" sıfırması
yoktur; son, sondur.

Oyunun kahramanı oyuncu değil, **sayıdır**. Oyuncunun elinde bir nesne, bir defter, bir maskot
yoktur; yalnızca bir sayı ve bir `+1` butonu vardır — ve o buton 85. saatte de gerçekten `+1`
ekler.

## 2. Neden bu tema

1. **Birim tavansız.** Kütle `1.79e308`'den sonra ölçü değil süstü; sayı tavansızdır ve
   `TREE(3)`, `Rayo`, `LNGN` gerçekten sayıdır.
2. **Akt II tema ile taşınamıyordu.** 6–11. basamaklar bir *tanımlama* merdivenidir: googolojist
   sayıyı hesaplamaz, **tanımlar**. "En büyük sayıyı merak eden insan" bu davranışı motive eder.
3. **`1.79e308` ölü bir an değil.** Her incremental oyunun en yüksek bırakma noktası burasıdır;
   bu oyunda o duvar **1. basamağın sonu**, yani oyunun ilk büyük ödülü.

## 3. Sütunlar

| # | Sütun | İçerik |
| :-- | :--- | :--- |
| 1 | **Zincir** | 8 halka: Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician. Halka *n+1* halka *n*'i üretir; halka 1 sayıyı üretir; `+1` zincirin köküdür |
| 2 | **Tek havuz** | Cüzdan sayının kendisidir. Alım sayıyı düşürür; kilitler koşu içinde mandallıdır, boost/mücadele sıfırması zinciri yeniden kurar |
| 3 | **Döngü** | AD tarzı sıfırlama: boost güç kaynağıdır ve önce açılır; boost alımı veya mücadele girişi sayıyı + zinciri sıfırlar, boost ve ödüller kalır. `B = 5.3`, boost `1,8^n`; 8 mutlak hedefli mücadele (log10 10,5–78,0, **≥4 boost**, her biri besleme `×0,2`) → kapı `1.79e308` → prestij (`+1 Tanım`, boost sayacı sıfırlanır) |
| 4 | **Ses** | Sahne · ticker · başarım · açıklama. Tooltip ve sayısal etiket **asla** şaka yapmaz |
| 5 | **Görsel** | "Laboratuvar" (ADR-0085): sakin ölçüm aleti kabuğu, vurgu = basamak rengi. Gölge/blur/süs yok |

## 4. İlerleme ve ölçek

- **11 basamak**, süreler **×1,176** geometrik eğri; 1. basamak **181 dk** (2026-10-31 kalibrasyonu). Projeksiyon **79,6 sa** (×1,165); 85 saat hedefi için eğri **×1,176** (84,8 sa). Eski 190 dk tabanı yalnız tarihsel referanstır.
- **1–5** gerçek aritmetik (`break_eternity`, 4 için `OmegaNum`), **6–11** kadran (`rank` + `mag`).
- **Prestij para birimi `Tanım`**; kapıda `+1 Tanım` ve `boostCount = 0` (ADR-0086). Eski
  `log10(1+A)` / `Birikim` formülü arşivde; 2. basamak tanımı geldiğinde yeniden ele alınacak.
- **Çevrimdışı** üretim 12 saatte tavan yapar.

## 5. Ses (tek cümle)

Oyun kendisinin oyun olduğunu **bilir**, bunu **asla söylemez**; mizah dünyada değil, oyun ile
oyuncu arasındaki ilişkidedir. Sözleşme: [`narrative-voice.md`](narrative-voice.md).

## 6. Bugünkü durum (2026-10-31)

- ✅ **1. basamak v3 uygulandı ve kalibre edildi** (ADR-0086 + ADR-0087): boost + sıfırlamalı
  8 mücadele, `B = 5.3`, boost `1,8^n`, save v24. Hedefler log10 10,5 · 20,1 · 29,8 · 39,4 · 49,1 ·
  58,7 · 68,4 · 78,0; **mücadeleler `boostCount >= 4` ister**. Ölçüm: intended **181,0 dk**
  (11 boost, 8/8) · boost-only 672,6 dk (3,72×) · base 1031,9 dk (5,70×). İlk mücadele ~32 dk
  farm + 17,1 dk C1; C1 0 boostta 36 dk (erişilemez). Boost kapısı: 3 → 184,2 · **4 → 181,0** ·
  5 → 174,5 (7/8) · 6 → 4/8. Challenges-only yolu kaldırıldı. 181 × 26,4 ≈ 79,6 sa; 85 saat için ×1,176.
- ✅ 8 halka, tek havuz, 10 birim kilidi, `+1`, İngilizce ticker altyapısı korunuyor.
- ✅ Altyapı: kayıt (LZ-String + 3 slot + karantina), 20 TPS loop, audio + müzik, Firebase,
  "Laboratuvar" arayüz kabuğu (bölüm/kaynak kayıt defterleri), ayarlar.
- 🟡 2–11. basamaklar tasarlanmadı; prestij `+1 Tanım` verip 2. basamağa geçer (stub).
- ⚠️ Eski v1 planı (4 öğrenme + 6 Math sıfırlaması, 120 dk) **geçersiz**; `rung1-full-sim.ts`
  kanıt değil. Eski 190 dk / 188,8 / 189,1 dk ölçümleri de geçersiz; yürürlükteki kalibrasyon
  ADR-0086 ve `brain/scratchpad/rung1-boost-reset/` ölçümleridir.

## 7. Bağlayıcı belgeler

| Belge | Ne |
| :--- | :--- |
| [`GAME_DESIGN.md`](../GAME_DESIGN.md) | Ekonomi formülleri, 11 basamak, 1. basamak spec'i |
| [`narrative-voice.md`](narrative-voice.md) | Ses sözleşmesi (`V1`–`V6`, `A4`, `A8`) |
| [`visual-language.md`](visual-language.md) | "Laboratuvar" görsel sözleşmesi (ADR-0085) |
| [`tech-context.md`](tech-context.md) | Teknoloji yığını ve kısıtlar |
| [`../decisions/0079-number-economy-vertical-slice.md`](../decisions/0079-number-economy-vertical-slice.md) | Uygulanan ekonominin karar kaydı |
| [`../decisions/0086-run-reset-and-boost.md`](../decisions/0086-run-reset-and-boost.md) | Rung 1 v3: boost + sıfırlamalı koşu, 8 mücadele, 181 dk kalibrasyonu, save v24 |
| [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) | 50 kararın tam kaydı |