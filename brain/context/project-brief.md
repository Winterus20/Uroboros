# Project Brief: Hold That Number

> **Durum:** tema pivotu uygulandı (ADR-0077) · görsel dil kilitli (ADR-0078) · 1. basamak v2
> uygulanıyor (ADR-0083: tek koşu, 190 dk, 8 sıfırlamasız mücadele). Eski "Kozmik Oburluk / UROBOROS" teması ve kütle ekonomisi **koddan
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
| 2 | **Tek havuz** | Cüzdan sayının kendisidir. Alım sayıyı düşürür; eşikler mandallıdır, geri gitmez |
| 3 | **Döngü** | Tek koşu: sıfırlama yok. 8 sıfırlamasız mücadele (ceza → ödül) → kapı `1.79e308` → prestij (`+1 Tanım`) |
| 4 | **Ses** | Sahne · ticker · başarım · açıklama. Tooltip ve sayısal etiket **asla** şaka yapmaz |
| 5 | **Görsel** | "Laboratuvar" (ADR-0085): sakin ölçüm aleti kabuğu, vurgu = basamak rengi. Gölge/blur/süs yok |

## 4. İlerleme ve ölçek

- **11 basamak**, süreler **×1,25** geometrik eğri; 1. basamak **190 dk**, toplam **~135 saat** (85 saat hedefi için çarpan ×1.165).
- **1–5** gerçek aritmetik (`break_eternity`, 4 için `OmegaNum`), **6–11** kadran (`rank` + `mag`).
- **Prestij para birimi `Tanım`**; kapıda `+1 Tanım` (ADR-0083). Eski `log10(1+A)` / `Birikim`
  formülü arşivde; 2. basamak tanımı geldiğinde yeniden ele alınacak.
- **Çevrimdışı** üretim 12 saatte tavan yapar.

## 5. Ses (tek cümle)

Oyun kendisinin oyun olduğunu **bilir**, bunu **asla söylemez**; mizah dünyada değil, oyun ile
oyuncu arasındaki ilişkidedir. Sözleşme: [`narrative-voice.md`](narrative-voice.md).

## 6. Bugünkü durum (2026-10-27)

- 🟡 **1. basamak v2 uygulanıyor** (ADR-0083): tek koşu 190 dk, `B = 5.5`, 8 sıfırlamasız
  mücadele, C8 ×2, save v23. Kalibrasyon: **188,8 dk** (Max All) / **189,1 dk** (idle).
- ✅ 8 halka, tek havuz, 10 birim kilidi, `+1`, İngilizce ticker altyapısı korunuyor.
- ✅ Altyapı: kayıt (LZ-String + 3 slot + karantina), 20 TPS loop, audio + müzik, Firebase,
  "Laboratuvar" arayüz kabuğu (bölüm/kaynak kayıt defterleri), ayarlar.
- 🟡 2–11. basamaklar tasarlanmadı; prestij `+1 Tanım` verip 2. basamağa geçer (stub).
- ⚠️ Eski v1 planı (4 öğrenme + 6 Math sıfırlaması, 120 dk) **geçersiz**; `rung1-full-sim.ts`
  kanıt değil. Yerine gerçek motor kalibrasyonu: `brain/research/rung-1-190-calibration-2026-10-27.md`.

## 7. Bağlayıcı belgeler

| Belge | Ne |
| :--- | :--- |
| [`GAME_DESIGN.md`](../GAME_DESIGN.md) | Ekonomi formülleri, 11 basamak, 1. basamak spec'i |
| [`narrative-voice.md`](narrative-voice.md) | Ses sözleşmesi (`V1`–`V6`, `A4`, `A8`) |
| [`visual-language.md`](visual-language.md) | "Laboratuvar" görsel sözleşmesi (ADR-0085) |
| [`tech-context.md`](tech-context.md) | Teknoloji yığını ve kısıtlar |
| [`../decisions/0079-number-economy-vertical-slice.md`](../decisions/0079-number-economy-vertical-slice.md) | Uygulanan ekonominin karar kaydı |
| [`../decisions/0083-rung-1-single-run-challenge-model.md`](../decisions/0083-rung-1-single-run-challenge-model.md) | Rung 1 v2: tek koşu, 190 dk, 8 mücadele |
| [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) | 50 kararın tam kaydı |