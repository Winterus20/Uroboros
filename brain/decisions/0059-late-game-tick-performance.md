# ADR-0059: Geç Oyun Tick Performansı — Reaktivite Muafiyeti, Memoizasyon ve Deterministik Perf Bench

- **Tarih:** 2026-10-15
- **Durum:** Kabul edildi ve uygulandı (v0.38.1)
- **Kapsam:** `src/core/math.ts`, `src/core/format.ts`, `src/game/balance.ts`, `src/stores/game/` (cache, getters-dimensions, actions-dimensions)
- **İlgili Belgeler:** ADR-0029 (memoizasyon), ADR-0051 (Maliyet İvmelenmesi), ADR-0055 (Faz 0 Stabilizasyonu), ADR-0056 (Planck Duvarı Hard-Cap)

---

## 1. Bağlam ve Problem

Termux/Android (ölçüm cihazı) üzerinde geç oyun durumu yeniden üretildiğinde (tüm özellikler açık, 12 bot 0.1 sn + "max" modda, derin koşu) tick süreleri kabul edilemezdi:

- **churn senaryosu** (break_singularity sonrası; shift/galaksi botları koşuyu sürekli prestige eder — oyuncunun gerçekte yaşadığı ağır durum): **mean ~20.5 ms, p50 ~14 ms, p95 ~62 ms**.
- CPU profili (V8 `--prof`): tick bütçesinin **~%25'i Vue reaktivite proxy `get` tuzağında** eriyordu — Pinia state'i derin reaktif olduğu için her Decimal örneği proxy'ye sarılıyor ve tick döngüsündeki her Decimal metodu (mul/add/normalize/pow) tuzaktan geçiyordu. Tek bir proxy'li çarpım ~4 µs, proxy'siz ~0.8 µs.
- Diğer kanıtlanmış sıcak noktalar: `dimensionCostForBucket` çağrı başına ~18.2 µs (iki `Decimal.pow`), her çağrıda yeni `Intl` formatter kuran `toLocaleString` ~73 µs, `format()` karışık senaryoda ~23 µs, satın alma yollarında gereksiz `matterPerSecond` okuması ve `completedChallenges.join(',')` tekrarı (tick başına onlarca kez).

Ayrıca eski perf ölçüm kurgusu güvenilir değildi: senaryoda `singularity`/`shift`/`galaksi` botlarının tetiklediği resetler farkında olunmadan "reset sonrası ara durum" ölçülmesine yol açıyordu (ölçüm ile durum zinciri ayrışıyor, A/B karşılaştırması kirletiliyordu).

---

## 2. Ölçüm Kurgusu (Deterministik Perf Bench)

Kalıcı altyapı: `brain/scratchpad/harness/perf-tick.ts` + `build-perf.mjs` → `npm run harness:perf`.

**İki senaryo (argv ile seçilir):**

1. `churn` — Derin endgame: `break_singularity` var; shift/galaksi botları aktif ve koşuyu periyodik sıfırlar; her sıfır sonrası yeniden alım taraması döner. **Ağır, birincil iş yükü.**
2. `wall` — Planck Duvarı: `break_singularity` yok; kütle `D_INFINITY`'de kilitli; alımlar maliyet aşımından başarısız olur. **Doygun/hafif durum, regresyon kontrolü.**

**Determinizm sözleşmesi:** `Math.random` sabitlenir, `Date.now()` sanallaştırılır. Oyun mantığı duvar saati/zamanlamaya bağlı olmadığı için A ve B derlemeleri **birebir aynı durum zincirini** işler; tek fark kod hızıdır. Çıktıdaki `warmupState`/`endState`/`workload` alanları (shift/galaksi sayıları, bought toplamı, alım çağrı/başarı sayaçları) iki derlemede **birebir eşit çıktı** — davranış değişmediğinin kanıtı.

**A/B yöntemi:** `git stash push` → baseline derle → ölç → `git stash pop` → optimize derle → ölç. Her senaryo 3 koşu, uçlar raporlanır (Android/Termux gürültüsü ~±%15).

---

## 3. Alınan Kararlar

1. **`Decimal.prototype.__v_skip` (en büyük tekil kazanç).** Vue'nun `markRaw` bayrağı prototipe konur; tüm Decimal örnekleri reaktivite proxy'sinden muaf olur.
   - **Güvenlik kanıtı:** Kod tabanında Decimal yerinde mutasyonu YOK (`.mag =`, `.assign()`, `.copyFrom()` taraması — 2026-10-15). Her güncelleme yeni örnek atamasıdır ve o atama reaktif `set`/`trigger` yoluyla UI'ı zaten günceller. Dolayısıyla davranış değişmez; yalnızca `get` tuzağı maliyeti sıfırlanır.
   - Risk notu: Bu karar "Decimal'ler değişmezdir" kuralını kod tabanı sözleşmesi yapar. Gelecekte yerinde mutasyon eklenirse reaktivite sessizce kaybolur; kural `math.ts` başındaki yorumda açıkça yazılıdır.
2. **`dimensionCostForBucket` memoizasyonu** (`src/game/balance.ts`): Tier→kova Map'i; `baseCost`/`fullMult` **referans eşitliği** korumalıdır (farklı referans görülürse cache sıfırlanır; test/göç senaryolarında daima doğru sonuç). **18.2 µs → 0.45 µs (~40×).**
3. **`calcDimensionExactTotal` hizalı kova hızlı yolu:** `take === 10` iken `bucketCost.div(10).times(10)` yerine doğrudan kova fiyatı toplanır; kısmi kovalarda eski yol birebir korunur (uç durum davranışı değişmez).
4. **`calcTickspeedExactTotal` kapalı formu:** `isPrivate`/`hasDiscount` kapalı ve `effMult === 1` iken (yani floor katmanı yokken) geometrik seri kapalı formla toplanır; bu form zaten tahmin (`calcMaxPacks`) formülüyle aynıdır, ileri/geri düzeltme döngüleri de kısalır. Floor katmanı devredeyken eski döngü **birebir** korunur — matematiğe dokunulmaz.
5. **Tek `Intl.NumberFormat` örneği** (`src/core/format.ts`): Küçük sayılar (`<1000`) için `toLocaleString` her çağrıda yeni formatter kuruyordu; sabit seçenekli tek örnek yeniden kullanılır. **73 µs → 1.6 µs (~45×).**
6. **Tekrar eden türev hesaplamalar:**
   - `memoCompletedJoin` (`cache.ts`): `completedChallenges.join(',')` sonucu (referans, uzunluk) anahtarıyla memo'lanır; `memoChallengeEffects` ve `getDimensionMultiplier` aynı önbelleği paylaşır.
   - `buyMaxDimension`/`buyMaxTickspeed`: bot yollarında (`feedbackSurge=false`) tüketilmeyen `matterPerSecond` okuması atlanır (`mpsBefore = feedbackSurge ? this.matterPerSecond : D_0`).

**Reddedilenler:**
- Decimal'leri ham tutup (proxy'siz) yerinde mutasyona izin vermek: reaktif tetikler kaybolur, UI sessizce bayatlar — reddedildi.
- break_eternity fork'u / özel Decimal: bakım maliyeti kazanca değmez; profil kalanı zaten V8/JIT ve GC içinde.

---

## 4. Sonuçlar (A/B Kanıtı)

| Senaryo | Metrik | Baseline | Optimize | Kazanç |
| --- | --- | --- | --- | --- |
| churn | mean | ~20.5 ms | ~5.9 ms | **~3.5×** |
| churn | p50 / p95 / p99 | ~14 / ~62 / ~69 ms | ~5.5 / ~13.8 / ~15 ms | ~2.5× / ~4.5× / ~4.6× |
| wall | mean | ~1.35 ms | ~0.79 ms | ~1.7× |

| mikro | `dimensionCostForBucket` | 18.2 µs | 0.45 µs | ~40× |
| mikro | `toLocaleString` (küçük) | 73 µs | 1.6 µs | ~45× |
| mikro | `format()` karışık | 23 µs | 3.1 µs | ~7× |

- Üç koşunun tamamı tablodaki bantta; `warmupState`/`endState`/`workload` alanları A ve B'de **birebir eşit** (18.159 dim çağrısı / 11.374 başarı, 215 shift, 3 galaksi — churn).
- Kalan profil: süre çoğunlukla break_eternity aritmetiği + V8/JIT (paylaşılan kütüphane ~%72, JS ~%20, GC ~%1.5). Ucuz başka darboğaz kalmadı.

---

## 5. Doğrulama

- `npm test`: **18 dosya, 263/263 yeşil.**
- `npm run build`: **0 tip hatası, 0 derleme hatası** (1783 modül).
- `npm run harness:smoke`: **PASS** (30 dk aktif koşu, log10=90.7, 8 shift — tempo bandı korundu).
- `npm run harness:perf`: yeni kalıcı komut; churn ~6.1 ms / wall ~0.73 ms raporlar.
