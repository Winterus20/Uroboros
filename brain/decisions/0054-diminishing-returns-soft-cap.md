# 0054. Azalan Getirili Yumuşak Tavan — Çarpanların Üstel Patlamasının Sınırlandırılması

- **Tarih:** 2026-10-10
- **Durum:** Kabul edildi ve uygulandı (v0.39.0)
- **Tür:** Ekonomi, Pacing, Oyun Tasarımı
- **İlgili Belgeler:** ADR-0051 (Kademeli Maliyet İvmelenmesi), ADR-0052 (Ölçek Sıçrama Motoru), ADR-0032/0033 (erken tempo), ADR-0023 (3.5 saat bandı)

---

## 1. Bağlam ve Ölçüm Kanıtı

Headless harness ile tamamen donanmış bir hesaplandı (`run-fullbuff-active.ts`):
full nöral ağaç + aktif taraf (`dream_lucid`/`frenzy_thumb`) + 8/8 challenge +
relik seviye 5 + 1e6 botla koloni + tüm başarımlar + 6 tekillik + tükenmiş Dekad Yükselişi.

| Senaryo (1 saat) | Fix öncesi |
|---|---|
| Tekilliği görünce reset basan oyun | tepe `1e1650` |
| Resetleri tutup biriktiren oyuncu | `1e6.840.000` |

Kullanıcı gözlemi de ikinci senaryoyu doğruladı: "1e98000 gibi sayılar".

### Neden bu kadar aşırı?

Üç çarpan **"taban^alım sayısı"** ile süresiz büyüyor ve **D8→D1 zinciri her çarpanı 8 kez uyguluyor**:

- Tickspeed: 4.570.000 alım → `(1/galaxyBonus)^alım` ≈ 850.000 basamak
- Zincir amplifikatörü: 8 tier geçişi → etkili üs **8 katına çıkıyor**
  (`log10(kütle) ≈ 8 × log10(1/galaxyBonus) × tickspeed alımı`)
- Per-10 kova çarpanı: 35.000 kova → `1.595^35014` ≈ 7.100 basamak

Maliyet ivmesi (ADR-0051) yalnızca maliyeti, bu iki üstel gücü da besliyordu. Döngü kazancı 1.24 > 1 olduğu için kütle **zamanın içinde ikinci kuvvetine** büyüdü (15. dk 1.19M, 30. dk 3.08M, 60. dk 6.84M).

## 2. Karar

**Eşik altında hiçbir şey değişmeyen, eşik üstünde azalan getirili yumuşak tavan.**
`balance.ts` içinde saf bir yardımcı:

```
eff = threshold + log2(fazlalık + 1) × gain
```

Uygulanan üç kanca (hepsi `diminishingPurchaseCount` üzerinden):

| Motor | threshold | gain | Not |
|---|---|---|---|
| Tickspeed üssü | 500 | 20 | `tickspeedMultiplier` |
| Per-10 kova üssü | 500 | 20 | `getDimensionMultiplier` + breakdown paritesi |
| Sıçrama gücü üssü | 20 | 1 | `shiftPowerMultiplier` + `getDimensionMultiplier` |

Tasarım ilkeleri:
- **Eşik = güvenli bölge.** Normal koşu ~190 tickspeed / ~600 birim alır; threshold 5 kat fazlası. Erken ve orta oyun byte-identical.
- **Yumuşak, sert değil.** Sert tavan döngüyü donardı; logaritmik azalım ek alımları "değersiz" yapmaz, sadece **marjinal** getirisini maliyetin altına çeker. Döngü kazancı 1'in altına inince koşu sonlu bir denge noktasına oturur.
- **Tek kaynak.** `getDimensionMultiplier` ve `getDimensionBreakdown` aynı yardımcıyı kullanır — parite testi (scale-jumps.test.ts) bozulmadı.
- **C6 (Göz Kuruluğu) doğal çalışır.** `buyScale` etkili sayıya uygulandığı için challenge'ın yarım üssü tavanla aynı mantıkta.

## 3. Sonuç (ölçüm, fix sonrası)

| Senaryo | Önce | Sonra |
|---|---|---|
| Reset tutan (1 saat) | `1e6.840.000` | **`1e1.490`** |
| 15 / 30 / 60. dk eğrisi | 1.19M / 3.08M / 6.84M | 1477 / 1484 / 1490 — **15. dakikadan sonra düz** |
| Reset basan oyun (1 saat) | `1e1650` | `1e954` |
| İlk tekilliğe varış (full buff) | 5:28 | 5:28 — **değişmedi** |

Denye noktası gerçek anlamıyla çalışıyor: 15. dakikadan sonra kütle pratikte sabit.
`dt=0.1` ile `dt=0.5` farkı %0.06.

## 4. Doğrulama

- `npm run typecheck` — 0 hata
- `npm test` — **257/257 geçti** (17 dosya)
- `npm run build` — 0 hata, 1781 modül
- `npm run harness:smoke` — 6/6 kapı yeşil (erken bitme regresyonu, ekonomi dönmesi, shift/tickspeed kontrolleri)

## 5. Bilinçli Sonuçlar

- **Tavanın üstündeki koşular daha uzun sürer** — hedef bu. Bir "bekle ve zenginleş" koşusu artık aşırı değil, finit bir tavanı olan bir hesaplamaya dönüştü.
- **`bought` sayacı hâlâ ham büyür** (kost acceleration'ı tetiklemeye devam eder); yalnızca çarpan üssü tavanlı. Yani maliyet eğrisi bozulmadı, üretim tarafı sınırlandı.
- Eşik değerleri (500/20/20/1) **denge tercihidir**, sabit değil. İleride daha agresif kazanç istenirse `TICKSPEED_CAP_GAIN` gibi tek bir sabitten ayarlanır.
