# Project Brief: Hold That Number

> **Durum:** tema pivotu uygulandı (ADR-0077) · görsel dil kilitli (ADR-0078) · 1. basamak
> oynanabilir (ADR-0079). Eski "Kozmik Oburluk / UROBOROS" teması ve kütle ekonomisi **koddan
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
| 3 | **Döngü** | 8. halkada mini boost (tam sıfırlama + zirveye bağlı kalıcı çarpan) → kapı `1.79e308` → prestij (`Tanım`) |
| 4 | **Ses** | Sahne · ticker · başarım · açıklama. Tooltip ve sayısal etiket **asla** şaka yapmaz |
| 5 | **Görsel** | "Saf Sayı": zemin + hairline + tipografi + basamak rengi. Kart/blur/süs yok |

## 4. İlerleme ve ölçek

- **11 basamak**, süreler **×1,25** geometrik eğri, 1. basamak **2 saat**, toplam **~85 saat**.
- **1–5** gerçek aritmetik (`break_eternity`, 4 için `OmegaNum`), **6–11** kadran (`rank` + `mag`).
- **Prestij para birimi `Tanım`**; ödül `log10(1+A)` (`A = sayı/kapı`); bekleme cezası
  `0,9^log10(A)` (`Birikim`).
- **Çevrimdışı** üretim 12 saatte tavan yapar.

## 5. Ses (tek cümle)

Oyun kendisinin oyun olduğunu **bilir**, bunu **asla söylemez**; mizah dünyada değil, oyun ile
oyuncu arasındaki ilişkidedir. Sözleşme: [`narrative-voice.md`](narrative-voice.md).

## 6. Bugünkü durum (2026-10-23)

- ✅ 1. basamak uçtan uca oynanabilir: 8 halka, tek havuz, 10 birim kilidi, mini boost, prestij,
  4 `Tanım` yükseltmesi, autobuy, `+1`, İngilizce ticker çekirdeği.
- ✅ Altyapı korundu: kayıt (LZ-String + 3 slot + karantina), 20 TPS game loop, audio + müzik
  motoru, Firebase auth + bulut kayıt, `AlgorithmicSwirl`, ayarlar.
- ✅ Kayıt şeması **v20**; `MIN_SUPPORTED_SAVE_VERSION = 20` → eski kayıtlar açılmaz (P5).
- 🟡 2–11. basamaklar tasarlanmadı; prestij şimdilik `Tanım` verip 1. basamağı yeniden başlatır
  (kodda belgelenmiş stub).
- ✅ Denge ölçüldü (`K5`): kapı **119,6 dk** (gerçek motor, 20 TPS) · 23 boost · 121 alım ·
  ilk 10 dk 9 alım; `balance.test.ts` içinde 6 regresyon testi. “Son halka ≥ 90 dk” hedefi ölçümle
  revize edildi (8 halka < 45 dk) — yazılı karar kaydı hâlâ bekliyor.

## 7. Bağlayıcı belgeler

| Belge | Ne |
| :--- | :--- |
| [`GAME_DESIGN.md`](../GAME_DESIGN.md) | Ekonomi formülleri, 11 basamak, 1. basamak spec'i |
| [`narrative-voice.md`](narrative-voice.md) | Ses sözleşmesi (`V1`–`V6`, `A4`, `A8`) |
| [`visual-language.md`](visual-language.md) | "Saf Sayı" görsel sözleşmesi (ADR-0078) |
| [`tech-context.md`](tech-context.md) | Teknoloji yığını ve kısıtlar |
| [`../decisions/0079-number-economy-vertical-slice.md`](../decisions/0079-number-economy-vertical-slice.md) | Uygulanan ekonominin karar kaydı |
| [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) | 50 kararın tam kaydı |
