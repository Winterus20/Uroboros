# Aktif Görev (In-Progress)

## 🎯 AKTİF — 1. basamak kapandı, sıradaki iş 2. basamak tasarımı (2026-10-23)

**Durum:** 1. basamak dikey dilimi **kodda tamam** (`K1`–`K5`, ADR-0079). Denge ölçüldü,
sabitler `tuning.ts`'e işlendi ve `balance.test.ts` ile **regresyon altına alındı**. Kalan iş bir
**belge borcu** (hedef 4b revizyonunun yazılı kaydı) ve **2. basamak tasarımı**.

**Kayıtlar:**
[ADR-0079](../decisions/0079-number-economy-vertical-slice.md) (uygulama) ·
[ADR-0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) (pivot) ·
[ADR-0078](../decisions/0078-pure-number-visual-language.md) (görsel dil) ·
[grilling §11](../research/theme-pivot-grilling-2026-10-23.md) (spec) ·
[denge raporu](../scratchpad/balance-2026-10-23/report.md) (ölçüm) ·
[GAME_DESIGN.md](../../GAME_DESIGN.md) (formüller)

### Kapanan işler (`K1`–`K4`)

| # | İş | Nerede |
| :-- | :--- | :--- |
| `K1` | 8 halkalı zincir, tek havuz, ×1,4 fiyat, 10 birim kilidi | `src/game/number/` |
| `K2` | Kapı `1,79e308`, `Tanım = log10(1+A)`, verim `0,9^log10 A`, 4 yükseltme | `economy.ts` + `upgrades.ts` |
| `K3` | Mini boost (8. halka, tam sıfırlama, `(zirve/başlangıç)^0,2`) | `economy.ts` |
| `K4` | `+1` gerçek, İngilizce ticker çekirdeği, `humor` kapısı | `TapButton.vue`, `src/game/voice/`, `TickerBar.vue` |

### Kapanan iş — `K5` denge

| Konu | Sonuç |
| :--- | :--- |
| Set A simülasyonu | kapı **119,8 dk** · **23** boost · **121** alım · döngü **3,69 dk** |
| Gerçek motor (20 TPS) | kapı **119,6 dk** · 23 boost · 121 alım · ilk 10 dk 9 alım → hedef tutuyor |
| Sabitler | `tuning.ts` (tek kaynak): `c₁=25`, `p₁=0,071`, `g=1,4`, boost üssü 0,2 |
| Regresyon | `src/game/number/balance.test.ts` → 6 test (kapı 110–130 dk, boost 20–26, alım 100–150, ilk 10 dk ≥6, 8 halka <45 dk, tıklamasız başlangıç imkânsız) |
| Yapısal düzeltmeler | `D1` boost yalnız sayıya · `D3` boost sonrası halkalar 1 birim · `D6` kilitler mandallı |

### Kalan belge borcu

| Konu | Durum |
| :--- | :--- |
| Hedef 4b: "son halka ≥ 90. dk" | ✏️ ölçümle **revize edildi** (test: "8 halka <45 dk"); yazılı karar kaydı güncellenmeli |
| Ses havuzu hacmi | 🟡 1. basamak ~120 satıra ulaştı (110 ticker + 11 sahne); 2–11 boş, genel hedef ~400 (`T3`) |

### Sıradaki adım

1. **2. basamak tasarım turu** (`E5`): jeneratör listesi, kural değişikliği, süre; `OmegaNum`
   adaptörü + kadran (`T1`, `T2`) burada devreye girer.
2. `RungScene` (`G8`) bağlantısı: basamak ilerlemesi + sahne havuzunun gösterimi + `humor` kapısı.
3. `G11` boost nefesi (400 ms) — sahne diliyle karışmadan.
4. Metin dalgası: 2. basamak ses havuzu + başarım metinleri (`A6`).

### Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `A4` | Mizah yoğunluğu — ticker kapısı var; `RungScene` ve başarım kapıları yok | 🟡 |
| `A5` | `LNGN` final sahnesi (ton kırılması, `G8` motoru) | 🟡 en son |
| `A6` | Başarımlar + meydan okumalar (eski 86 + 13 silindi) | 🟡 sıfırdan yazılacak |
| `A7` | Müzik motoru (`src/core/music/*`) | 🟡 uyarlama mı yeniden yazım mı |
| `A8` | İngilizce metin hacmi (~400 satır hedefi) | 🟡 kural yazıldı; hacim 1. basamakta (~120) |
| `G13` | Mobil dizgi (390 px'te uzun notasyon) | 🟡 UI yazılırken |
| `G8` | Sahne motoru hazır (`RungScene.vue`) — tetiklenmiyor + `humor` kapısı bağlı değil | 🟡 |
| `G14` | Ticker'ın yeri ve boyu | 🟡 UI yazılırken |

### Kod durumu (doğrulama)

- Commit `07c45b3` (ölçülmüş sabitler + K5 regresyon testi + 120 satırlık ses havuzu).
- Commit `013c4b2` anındaki doğrulama: typecheck 0 hata · build başarılı · **50 test** (tarihsel).
- **Belge dalgası sonunda yeniden koşuldu (2026-10-23):** `npm run verify` → **0** (typecheck 0 hata
  + `npm test` **86 test** / 5 dosya) · `npm run build` → **başarılı**.
- `src/` üzerinde yetki **kod dalgasında**; belge dalgası yalnız kök belgeler + `brain/**` yazar.
