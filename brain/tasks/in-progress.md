# Aktif Görev (In-Progress)

## 🔄 AKTİF: Tempo & Ekonomi Yeniden Tasarımı — Faz 0 + Faz 1 (2026-10-19)

**Plan:** [pacing-economy-shift-redesign-plan-2026-10.md](../research/pacing-economy-shift-redesign-plan-2026-10.md)
**Orchestrator:** ana ajan · **Dalga 1 (4 paralel subagent):** H1 · H2+H3 · §8A · P0
**Sıra kararı (orchestrator, plandan sapma):** *yapı önce, sayı son* → P2/P3 yapısal, P1 sayısal en sonda.
Gerekçe: P1 ve P2 aynı kabul metriğini (ADR-0023 altın standardı 3s30dk) oynatıyor; ikisini ayrı ayrı
tune etmek aynı eğriyi iki kez kilitlemek demek. P2'nin kabulü zaten yapısal, P1'e numerik bağımlılığı yok.

### Dalga 1 — dosya sahipliği (çakışmasız bölündü)
- [x] **A** `e164f49e` — **H1:** ikiz ADR-0033 çözümü (cloud-sync → `0070`) + `brain/decisions/README.md` indeksi + link düzeltmeleri
- [x] **B** `05b082b8` — **H2+H3:** `simulate-economy.js` sabit drifti → gerçek `src/game/*` importu; `run.ts.broken-backup` silinir
- [x] **C** `b74c4110` — **§8A:** `singularityGain` pre-break `1 → 1 + singularities` + `ADR-0071` + testler
- [x] **D** `d7949dc8` — **P0:** `pacing-p0-baseline-2026-10.md` + `unlock-timeline.mjs`
- [x] **E** `c1c9f696` — **H1 devamı:** 19 kaynak yorumu `ADR-0033` → `ADR-0070` (auth/bulut katmanı) + 2 yanlış atıf `ADR-0013`'e çevrildi
- [x] **Orchestrator:** `package.json` `harness:sim` / `harness:sim:verify` scriptleri · ADR indeksine `0071` satırı · `todo.md` Faz 0 işaretlemesi

**Dalga 1 sonucu:** H1 ✅ H2 ✅ H3 ✅ P0 ✅ §8A ✅ — `typecheck 0` · `test 397/397` · `build 0`

### ADR numara tahsisi (orchestrator kararı)
- `0070` = cloud-sync (yeniden numaralandırılan ikiz; tarih sırası korunur — plan 0071 öneriyordu, kronoloji bozulmasın diye kaydırıldı)
- `0071` = §8A şafak merdiveni (bu dalga)
- `0072` = P2 boyut kapıları + shift rolü (Faz 2'de yazılacak)

### Ölçüm baseline (orchestrator — `harness:smoke`, active/seed1/dt0.5/cap0.5h)
İlk 8 dakikada **7 özellik kapısı**: 26s `crisis_spawn` · 41s ilk sıçrama · 105s D5 · 190s `autobuyers` ·
262s `stance_spam` · 332s `stance_private` · 348s `colony` · 384s `crisis` · 470s `spell_espresso`;
1183s `first_galaxy`; 1588s `seed_nucleon` → sonrası ölü bölge. log10=90.72 · shifts=8 · gal=1 · bots=11.
→ **Plan §1 teşhisi doğrulandı.**

### Dalga 2 — Faz 2 / P2.1 (2026-10-19 · boyut açılımı sıçramadan koparıldı)
- [x] **F** `b9db218d` — harness boyut açılış telemetrisi: `dimUnlocks` (d4..d8: t + log10). Ölçüm: D4 34s/log10 2.84 · D5 88s/5.38 · D6 182s/8.87 · D7 252s/14.70 · **D8 654s (10:54)/40.90**
- [x] **G** `6a08b592` — **P2.1 çekirdek:** `DIMENSION_UNLOCK_GATES` + `dimensionGateUnlockCount()` + `resolvedUnlockedDimensionCount` artık `lifetimePeakMatter` tabanlı · yeni kayıt alanı YOK · ADR-0072 · cache anahtarı `peakMatter` · test 410/410
- [x] **H** `6eb741f8` — regresyon düzeltmesi: açılış kutlaması tick'e taşınır (`celebrateDimensionUnlocks()`) + DimensionsTab kilitli-boyut metni kütle eşiğine bağlanır

**Dalga 2 kabul durumu:** mekanizma ✅ (sıçrama artık boyut açmıyor) · zamana yayma ❌ ·
`npm run verify` exit 0 · smoke `log10=97.62 shifts=9` (baseline 90.72/8)

**⚠️ AÇIK P0 KOLU (dalga 2 bulgusu):** eşikler hâlâ kümeleniyor — D4 185.5s · D5 191s · D6 197s · D7 204.5s · D8 217s,
yani D4→D8 arası **32 saniye**. Sebep: bu bantta ekonomi çok hızlı büyüyor; 18 dekad (1e8→1e26) saniyeler içinde geçiliyor.
→ *"Açılışları zamana yayma" hedefi PROVISIONAL değerlerle sağlanmadı.* Eşikler P0'da dekad bazında çok daha geniş
aralıklandırılmalı (muhtemelen yavaş-büyüme bölgesine, log10 ≈ 40-150 aralığına). **Kullanıcı kararı bekliyor.**

**Dalga 2 yan etkileri (F/G bulguları):**
- `shift_4` 268.5s → 132.5s (ilk sıçramalar artık D3'ü hedefliyor; açılış tier hedefi gevşedi).
- `celebrateFormatUnlock` normal akışta tetiklenmiyordu → H ile düzeltiliyor.
- Smoke 30 dk `log10` 90.72 → **97.62** (+7 dekad): D8 artık 1e26'da açıldığı için (eski ölçüm 1e41) erken hızlanma.
- `harness/smoke.json` yeniden üretildi (P0 baseline dokümanı `generatedAt`'i güncellenmeli — açık iş).
### Dalga 3 — Faz 2 / P2.2 (2026-10-19 · sıçrama kalıntı temizliği + eşik ölçümü)
- [x] `9b87b7fa` — sıçrama hedef tier kalıntısı; geç dal `tier: 8` → `tier: unlocked`; `isShiftUnlock` ölü etiketi kaldırıldı; parite doğrulandı (eksik değil)
- [x] Orchestrator düzeltmesi: erken dal **zorluk rampası geri alındı** (kaldırılması ölçüldü ve reddedildi: zirve 99.8 → 88.4)
- [x] Testler doğru semantiğe göre yeniden yazıldı (4 test) · ADR-0072 Ek bölümü · P0 §8 eşik ölçümü

**Dalga 3 sonucu:** `typecheck 0` · `test 418/418` · `build 0` · `smoke 6/6` (zirve log10=98.4, shifts=9)

### Dalga 4 — Faz 3 / P3 (2026-10-19 · başarım kapısı + ilk 10 dk)

**Plan §1-2:** omurga deterministik dekad eşiğinde kalır; opsiyonel yatay dallar başarım ailesiyle açılır;
aile tamamlama *kademe* çarpanı (çizgisel değil); silüet teaserlar; ilk oturumda ≤4 yeni sistem.

**Orchestrator tasarım kararları (faz başlamadan sabitlendi):**
1. **Kapı seviyesi = özellik (feature), dal değil.** Neden: `lab` ve `guilt` aileleri *kendini kilitler*
   (`lab_seed` için lab açılmış, `gui_seen` için parazitler açılmış olmalı) → bu iki ailenin **giriş**
   katmanları (`lab`, `guilt_slackers`) omurgada kalır, **derin** katmanları (tohumlar, mercek/rezonatör)
   aile kapısına girer. Yoksa softlock (plan §2'nin tam olarak uyardığı senaryo).
2. **Softlock koruması kodda test edilir:** her kapı `safeAchievementIds` taşır = dal açılmadan
   kazanılabilen aile başarım listesi. Invariant: `safe.length >= required` (asla false değil).
3. **Kademe çarpanı, eski satır çarpanının tavanını korur:** `1.015^4 = 1.061 ≈ 1.06`/aile,
   yani 8 ailede tavan 1.594 → 1.611 (nötr), ama ödeme %25'te başlar. → plan §6.4 **"aile tamamlama
   kademeleri"** önerisi kabul edildi, çizgisel model (86 nokta) reddedildi.
4. **Omurga =** `crisis_spawn`, `autobuyers`, `stance_spam`, `stance_private`, `lab`, `guilt_slackers`,
   `night_watch`, `challenges`. **Dal =** colony (automation) · crisis+3 büyü (crisis) · seed_nucleon/
   seed_gluon/seed_graviton (lab) · time_clock (singularity) · event_horizon_lens/hawking_resonator/
   cosmic_filament (guilt) → **aile→dal haritası dokümante (P3 kabul maddesi) = ADR-0073.**

- [x] **P3.0** `c855bd33` — erken merdiven *ölçümü* → `brain/scratchpad/p3-early-ladder-candidates.md` (A=10 sistem/10dk · B=10 · C′=1)
- [x] **P3.1a** `7ad1b371` — `branches.ts` + `unlocks.ts` dal kapısı + `checkVisibility` export + invariant testleri
- [x] **P3.1b** `396be41a` — aile kademe çarpanı `achievements.ts` + AchievementsTab kademe göstergesi + sim/verify senkronu
- [ ] **P3.2** — silüet teaserlar (nav sekme silüeti + `LockedFeature` kademe/aile ipucu)
- [ ] **P3.3** — erken merdiven yeniden zamanlaması (P3.0 ölçümüne göre) + ≤4 sistem ölçümü
- [ ] **ADR-0073** + `brain/decisions/README.md` indeks satırı (orchestrator)


### Dalga 5 — Faz 3 / P3.3: Erken Merdiven Yeniden Zamanlaması (2026-10-19)

**Plan §1'in ölçülmüş teşhisi:** ilk 10 dakikada **10 özellik kapısı** (A) — plan "7'ye yakın" diyordu.
Gerçek çarpıklık sayıda değil **kümelenmede**: Botlar 190s · Koloni 201s · Kriz 207s · Tekillik 208s
(4 yüzey 18 saniyede). Plan §1'in "sindirme vadisi" (ardışık yatay açılış arası ≥10-15 dk) ölçümle ihlal.

**P3.0 ölçümü (brain/scratchpad/p3-early-ladder-candidates.md):**
- A (mevcut) = 10 sistem/10dk · B (plan metni, autobuyers 1e12) = **10** → plan §1'in reçetesi sayıyı değiştirmiyor.
- C′ (sentetik 1e68+) = 1 sistem ama otomasyon 13+ dk gecikir, casual/idle'de 30 dk'da bile açılmaz;
  ayrıca `unlockAutobuyer()` feature kapısını kontrol **etmiyor** → harness ölçemiyor (ölçüm körlüğü).
- **P3.1'in dal kapısı tek başına 10 → 5-6 sektöre indirdi** (Kriz sekmesi artık 10 anomali istiyor:
  anomali aralığı 40-65 sn → ~810 sn). Ölçüm bunu "fiyat etkisi" sanabilirdi; **değil**.

**Orchestrator deney dizisi (hepsi ölçüldü, tahmin yok):**
| Aday | Boyut eşikleri | 30 dk tepe | 600 sn'deki özellik | Not |
| :--- | :--- | ---: | ---: | :--- |
| A | 1e8/1e11/1e15/1e20/1e26 | 1e98 | 10 | baseline |
| E1 | A + fiyat kolları (75/55/40/34/28/24, B0 20, ivme 0.025) | 1e98 | 6 | **erken eğriyi değiştirmiyor**; 12 sa'te 1e308'e ulaşılamadı (tepe 1e224) → **koşuyu uzatıyor** |
| E2 | 1e8/1e25/1e50/1e75/1e100 | 1e40 | **4** | kalabalığı çözer ama üretimi katliyor |
| E3 | 1e8/1e18/1e32/1e50/1e75 | 1e68 | 5 | |
| E4 | 1e8/1e20/1e35/1e55/1e85 | 1e54 | 5 | |
| E5 | 1e8/1e14/1e24/1e40/1e65 | 1e82 | 5 | **üretim en az zarar gören** |

**Kalan 5'in hepsi aynı yerde:** duruşlar (195s/202s) + koloni (241s) kümesi → yatay kapılar da
dağıtılıyor (autobuyers 1e12, duruşlar 1e26/1e40, koloni 1e30).

**Karar (tempo):** ~11 saat **geçici taban** kabul; onarım kolu **üretim** (M1 bot hız çipleri +
ADR-0073 aile kademe çarpanı), fiyat değil. Gerekçe: E1 ölçümü P1'in fiyat kolunun koşuyu
**uzattığını** gösterdi → onarım fiyattan gelemez. ADR-0023 P1+M1 sonrası yeniden ölçülüp revize edilecek.

- [ ] **P3.3a** `e0f35ada` — ölçülmüş merdivenin uygulanması (boyut + yatay kapılar) + test uyumu + 12 sa ölçümü
- [ ] **P3.3b** `d8f41a37` — beyin tarafı ölçüm raporu (brain/research/p3-ladder-experiment-2026-10.md)
- [ ] **ADR-0074** — ölçülmüş erken merdiven tablosu (orchestrator, P3.3a sonrası)
- [ ] **Faz 4** (P1 + M1) — fiyat kolu M1 ile birlikte, üretim onarımı


### ▶️ DEVAM NOTU (2026-10-20 12:45) — dünkü durdurma notunun yerine

**Kullanıcı kararları (2026-10-20):**
1. **Kilitli şeyler görünmesin; sadece kilidi açıldığında görünsün.** → nav silüetleri kaldırıldı,
   `LockedFeature.vue` silindi, Lab tohumları/Kriz müdahale kartlarında kilitli içerik hiç render
   edilmiyor. Boyut satırları, bot/SP ağacı merdivenleri ve "Sıradaki Açılış" bandı **korunur**
   (band ayrıca dal kapılı hedefler için başarım şartı ipucu veriyor: "… · 2 Kozmik Dalgalanmalar
   başarımı (1/2)").
2. **Tempo:** ADR-0075 → ADR-0023 bandı 150–300 dk yerine **ölçülen 8–11 saat**; P1 (fiyat
   kızıştırma) **ölçümle reddedildi** (patch saklandı, ertelendi).

**Commit edilmiş ve push'lanmış (güvende):**
- `092f399` P3.1 (başarım kapılı dallar + aile kademe çarpanı, ADR-0073) → push `44d38b3..092f399`
- `c0128fb` P3.2 (silüet teaser) → push `c0128fb` sonrası

**Çalışma ağacında, COMMIT EDİLMEMİŞ (kaldığı yer):**
1. **P3.3 ölçülmüş merdiven** — `src/game/balance.ts` (DIMENSION_UNLOCK_GATES 1e8/1e14/1e24/1e40/1e65 = E5),
   `src/game/unlocks.ts` yatay kapılar: crisis_spawn 1e3 · autobuyers 1e12 · stance_spam 1e20 ·
   crisis 1e28 · stance_private 1e32 · **colony 1e66** · spells 1e34/1e42/1e52 · lab 1e70 ·
   seeds 1e80/1e100/1e125 · time_clock 1e120 … + 4 test dosyası + `tests/lab-rebalance.spec.ts`
2. **M1 Otonom Hız Çipi çekirdeği** — `src/game/speed-chip.ts` (yeni) · `state.speedChipLevel` ·
   getter'lar (speedChipCost / speedChipEffectMult / canBuySpeedChip) · `buySpeedChip()` ·
   `layers.ts` reset kancası · `getters-misc.ts` → `autobuyerFleetSpeedMult` çip bölücüsü · 15 test
3. **Harness `--chips` bayrağı** (varsayılan KAPALI) + telemetri (speedChipLevel / speedChipsBought) —
   çalıştığı doğrulandı (küçük koşu: `chip=0/0`), ölçüm karşılaştırılabilirliği korunuyor
4. **Beyin** — `pacing-p0-baseline` §9/§9.5 · `p3-ladder-experiment-2026-10.md` ·
   `m1-speed-chip-spec-2026-10.md` · `p3-final-ladder.md` · `in-progress` Dalga 5

**Bu dalda bitenler:**
- P3.3 ölçülmüş merdiven (ADR-0074) + 12 saatlik ölçüm: **ilk tekillik 9s33dk**, 600 sn'de 4 kapı,
  aynı-tik çakışma 0, D4→D8 penceresi 1191 sn, yüzeyler arası 621/607/~510 sn (hepsi ≥8 dk).
- `colony 1e66` **ölçüldü** (`out/orch-colony166.json`): D8 1e65'ten 40.5 sn sonra açılıyor → çakışma yok.
- Kilitli içerik gizleme (kullanıcı kararı) + kalan ipucu yüzeyleri temizliği.
- **M1 v1'in etkisiz olduğu ölçüldü**: aktif 12 sa (9:33:17 → 9:33:09) ve idle 12 sa (tepe 121.69 →
  121.69) → darboğaz bot hızı değil **KÜTLE**; çip v1 rasyonel oyuncuya **baskılanmış** (dominated).
  → **v2**: çip *boyut üretim çarpanını* 1.1^seviye yükseltir (kovaya denk değerde fayda → ikilem gerçek).
- ADR-0074 + ADR-0075 + indeks satırları + completed.md kayıtları + `_run-head.ts` temizliği.

**Kapanış (2026-10-20 13:55):** tüm dal commit'lendi (`a2786b3` · `c3c6c33` · `294db32`) ve push'landı.
Tam kapı: typecheck 0 · test **484/484** · build 0 · harness:smoke 6/6.

**Çöl kararı (kullanıcı):** "Şimdilik dokunma" → Faz 5 (içerik) ertelendi; ölçüm + mekanizma denetimi
P0 raporuna §10 olarak yazıldı (2. saat yüzeysiz; `event_horizon_lens`/`hawking_resonator`/
`cosmic_filament` kapıları **hiçbir UI'a bağlı değil** → içerik eksik).


### Dalga 6 — Faz 4 / 5 kapanışı (2026-10-20 14:30)

**Tamamlanan ve push'lanan (bu dal):**
| Commit | İçerik |
| :--- | :--- |
| `a2786b3` | P3.3 ölçülmüş merdiven (ADR-0074) + kilitli içerik gizleme + M1 v2 üretim çipi (ADR-0075) |
| `c3c6c33` | M1 ölçüm sonuçları (iki denge noktası kayda geçti) |
| `294db32` | vitest zaman aşımı 60s → 120s (duman testi paralel yükte timeout oluyordu) |
| `4ca6c51` | **O3**: aile kademeleri SP kazancını da güçlendirir (plan §10.1) |

**M1 v2'nin ölçülen denge noktaları (taban 1e40 sabit):**
| Seviye başına | 30 dk tepe | 600 sn kapı | 12 sa ilk tekillik | Kriz→Koloni vadi | Karar |
| :--- | ---: | ---: | ---: | ---: | :--- |
| — (çipsiz) | 1e69.1 | 4 | 9:33:17 | 621.5 sn | taban |
| **+%3** | **1e81.25** | **4** | **4:28:09** | 461 sn | ✅ seçildi |
| +%10 | 1e98.19 | 4 | 1:14:14 | 166.5 sn | ❌ vadi kırık |

**Çalışan dallar:**
- `70eb19e6` — **harness `--dawns N`** modu (P0 §5 spec'i): SP/şafak ekonomisi ölçümü —
  şafak merdiveni (ADR-0071) hiç uçtan uca ölçülmemişti. Oyun kodu değişmez.
- `d5b99e0f` — **P4a**: sistem açılış öğretim içeriği + durum (taughtFeatures / pendingTeaching).
- `e0c269c9` — **P4b**: öğretim toast'u + ayar (kullanıcı kararı: kilitli şeyler görünmesin →
  sistem **açıldığı anda** bir kez anlatılır, sonra bir daha asla).

**Ertelendi (kullanıcı kararı):** dikey çölün içerikle doldurulması (Faz 5) → P0 §10'a ölçümü
yazıldı; ilk aday: `event_horizon_lens`/`hawking_resonator`/`cosmic_filament` kapıları **hiçbir
UI'a bağlı değil** (içeriksiz) → ya gerçek sistem yapılacak ya da 1e160 bandı öne alınacak.

**Dalga 6 kapanışı (2026-10-20 15:25):** `b47aa87` (P4) · `4ca6c51` (O3) · `951a8a3` (`--dawns N`) — hepsi
push'landı. Kapı: typecheck 0 · test **512/512** · build 0 · smoke 6/6. `--dawns` ölçümü: **şafak 1 = 268 dk →
şafak 2 = 49 dk → şafak 3 = 13 dk** (kırılma 3. şafakta) → ADR-0071 doğrulandı, SP/saat 0.22 → 18.29.

**Sana açık:** ADR-0075 — tempo bandı artık ölçülen gerçeği taşıyor (taban oyun 8–11 sa; yatırımla
oynayan oyuncu ~4.5 sa). Onaylıyor musun, yoksa 3s30dk hedefi için ayrı denge projesi mi?

### ▶️ Dalga 7 — ADR-0076: Satın Alma Tabanlı Boyut Açılışı + D8 Çağı Ölçek Sıçraması (2026-10-20)

**Kullanıcı kararı (tek mesaj, iki madde):**
1. "ölçek sıçraması d8'de kullanılmaya başlansın, önceki dimlerde değil"
2. "her dim aldığımızda sonraki dim açılsın"

**Uygulananlar:**
- Açılış kaynağı = SATIN ALMA: bir boyuttan 1 paket (10 adet) alınınca bir sonraki boyut
  açılır. Kalıcı alan `lifetimeMaxDimensionTier` (sıçrama/küme/şafak sıfırlamasından
  etkilenmez). D1–D3 taban olarak açık.
- `shiftRequirement` sabit D8 hedefi; `canShift` hedef açık değilse false. C7'de D6.
- Otobot kademeleri boyut zincirine hizalandı (deadlock kalktı), sıçrama botu D8 ister.
- Kayıt şeması **v19** (`lifetimeMaxDimensionTier`); v18 ve öncesi kayıtlarda legacy kütle
  kapıları yeni tabana çevrilir → **açık boyut kaybı yok**.
- UI: teaser "D3'te 1 paket alınca açılır" + paket çubuğu; sıçrama kartı kilit durumu.

**Ölçüm (smoke 30 dk, active/seed1/dt0.5):** d4 40.5 s · d5 102.5 s · d6 210.5 s ·
d7 350.5 s · **d8 544.5 s** · ilk sıçrama **760.5 s** · 30 dk'da 3 sıçrama · zirve log10 48.8.
(Öncesi: d8 1377 s · ilk sıçrama 41 s · 9 sıçrama · log10 97.6.)
→ **Boyut merdiveni hızlandı** (D8: 23 dk → 9 dk) · **sıçrama döngüye girdi** (41 s → 12.7 dk)
→ ilk 30 dk'da biriken çarpan 60x → 4.6x, ekonomi ~2 kat yavaşladı. Kasıtlı bedel.

**Kapı:** typecheck 0 · test **514/514** · build 0 · smoke 6/6 (eşikler yeni ölçüme göre
yeniden kalibre: log10 ≥ 45, shifts ≥ 3).

**Açık (kullanıcı onayı gerekir):** tempo bandı (ADR-0075) bu değişiklikle yukarı iter —
6 saatlik ölçüm `brain/scratchpad/harness/out/adr0076-6h.json`. Erken oyunu hızlandırmak
istersen iki kol var: (a) sıçrama miktar rampasını yumuşatmak (D8 miktarı yerine D8 satın
alımı), (b) sıçrama gücünü artırmak.

**Kalan işler:**
1. M1 v2 uygulaması (üretim çarpanı + cache anahtarı) + 30 dk ölçüm (çipsiz/cipli tepe karşılaştırması;
   600 sn'deki 4 kapı korunmalı) → AutobuyersTab kartı v2'ye göre.
2. **Tam kapı:** `npm run typecheck` + `npm test` + `npm run build` + `npm run harness:smoke`
3. **TEK commit** → push.
4. Kullanıcı onayı: ADR-0075 (tempo bandı revizyonu + P1'in reddi).
5. Sonraki faz (ayrı proje): altın standardın 3s30dk'ya onarımı — kaldıraç `k`'yı büyüten boyut
   bileşim çarpanı (ADR-0075 §3.3).

**ÖLÇÜLMÜŞ SONUÇLAR (P3.3a, 12 saatlik koşu dahil):**
| Ölçüt | Ölçülen | Durum |
| :--- | :--- | :--- |
| 600 sn'de açılan kapı | 5 (eskisi 10) | ✅ |
| Aynı saniyede boyut+özellik çakışması | 0 | ✅ |
| D4 → D8 penceresi | 1191 sn | ✅ |
| ilk küme / max_mode | 1448.5 sn / 1702 sn | ✅ |
| 12 saatlik koşu | ilk tekillik **9s33dk** (tepe 1e308.25) | ✅ |
| Yüzeyler arası ≥8 dk | 96.5 sn (Botlar→Koloni) | ❌ yapısal: çapalar arası 621.5 sn'de iki 480 sn'lik boşluk sığmıyor |

**KULLANICIYA AÇIK KARARLAR (yanıtlanmadı):**
1. **Tempo:** ADR-0023 bandı 150-300 dk; ölçülen ~9.5 saat → (a) onarım fazı, (b) bandı revize,
   (c) ~10 saat geçici taban kabul. Onarım kolu **üretim** (M1), fiyat değil (ölçümle kanıtlı).
2. **P1:** ölçülebilir faydası (fiyat duvarı hissi) M1'in temposunu karşılıyorsa uygulansın mı?

### Karar bekleyen (P2/P1 kapısı)
1. **Altın standart (§7):** ölçülen ilk koşu ~11 sa vs ADR-0023 3s30dk → 3/3 FAIL. (a) onarım fazı · (b) ADR-0023 revizyonu · (c) kabul.
2. **Eşik yayılımı (§8):** A mevcut (D8 4dk) / C orta (43dk) / B yayılmış (62dk) — tempo kararıyla birlikte.
3. **Plan §6.1/§6.2:** D8 öncesi sıçramalar kaldırılsın mı + sıçrama çarpanı bölüşümü (P2.2'nin silüet kısmını bloke ediyor).
### Sonraki dalgalar
- [ ] **Faz 2 (P2):** boyut kapıları sıçramadan kopar · shift = D8 sonrası hız çarpanı · corruption kaynağı `lifetimePeakUnlockedDims` · save v19 migrasyon · `ADR-0072` (ADR-0033 süperseeded)
- [ ] **Faz 3 (P3):** omurga/opsiyonel dal ayrımı · başarım aile→dal haritası · silüet teaserlar · ilk oturum ≤4 sistem
- [ ] **Faz 4 (P1+M1):** fiyat eğrisi + bot hız çipleri — son yapı üzerinde tek tune turu

### Açık kararlar (plan §6 — Faz 2'nin kapısı)
1. D8 öncesi sıçramalar tamamen kaldırılsın mı? *(plan önerisi: evet, sayaç 0'dan başlar)*
2. Sıçrama çarpanı bölüşümü: üretim / Hz / ikisi? *(plan önerisi: üretim ağırlıklı + Hz'ye sabit küçük katkı)*
3. Küme (galaxy) eşikleri yeni tempoda yeniden ölçülecek mi? *(P1 ölçümüne bağlı)*
4. Başarım çarpanı formülü? *(plan önerisi: aile tamamlama kademeleri, çizgisel değil)*
5. Erken dekad merdiveninde ilk oturumda hangi sistemler kalır? *(smoke sonrası netleşir)*

---

## ✅ Görsel Dil Uyum Turu — "Her Tarafı" (2026-10-18) — TAMAMLANDI

**Kaynak:** kullanıcı talebi — *"oyunu `brain/context/visual-language.md`'ye göre her tarafını düzeltmek istiyorum; önce araştırma yap subagentlarla, sonra uygulayacağız"*.
**Master rapor:** [`brain/research/visual-language-compliance-audit-2026-10-18.md`](../research/visual-language-compliance-audit-2026-10-18.md)
**Kanıt deposu (6 alt rapor):** [`brain/research/visual-audit-2026-10-18/`](../research/visual-audit-2026-10-18/)(a1 renk/token · a2 tipografi · a3 bozulma · a4 katman/hareket · a5 GIC · a6 okunabilirlik)

### Dalga (6 paralel bağımsız denetim ajanı + orchestrator mekanik matrisi) — SALT OKUNUR
- [x] A1 renk/token (26 bulgu) · A2 tipografi (11) · A3 bozulma merdiveni (16) · A4 katman/hareket (19) · A5 GIC kimlik (20) · A6 okunabilirlik/kapsama (46) → **138 ham bulgu (≈110 tekilleştirilmiş)**
- [x] Mekanik kapsam matrisi: 52 `.vue` × token/ramp/çubuk/tabular/motion/glif/hex → **23 bileşen hiç retrofit görmemiş**
- [x] Baseline doğrulama (sessiz regresyon tabanı): `vue-tsc` **0 hata** · `vitest` **27 dosya / 380 test** yeşil

### En kritik keşifler
1. **CRT katmanı öldürüldü, sözleşme hâlâ "HEP AÇIK" diyor** (`style.css:516-524` beş sınıfı `display:none !important` + `useNavigation.ts:325-326` koşulsuz `crt-off` + `.crt-layer` taşıyan 0 `.vue`) → `brain/` içinde karar kaydı **yok** (§8 ihlali). İki yol: **(A)** geri getir · **(B)** ADR + sözleşme güncelle, `--crt-*`/`crtEffect` temizle.
2. **`.planck-collage` tüketicisi silindi** (uçuşta `DimensionsTab`'tan Planck bariyeri bloğu çıkarıldı) → K1 ritüel vinyeti kayıp, 5 kural 0 tüketici.
3. **Ölü bozulma ayakları:** `--crt-intensity` (7 tanım/0 tüketici), `--glitch-intensity` (7/0), K4 chromatic aberration (0 referans), motif bandı `max(...,0.45)` rampası düzleştiriyor, K1 substratı efektif α 0.0042 (≈1.07:1) → görünmez.
4. **12/16 motif hâlâ eski çizgi ikon seti** (brief kolaj reçetesini tam sağlayan yalnız `dama`+`yirtik`); `goz.svg` yasak `var(--ds-bg)` hilesi içeriyor ve `motifs.test.ts` bunu yakalamıyor; bant dizilimi 9/16 motifini hiç göstermiyor.
5. **Okunabilirlik:** tooltip sökümünden sonra `DimensionRow` 9 tier lore'u hiç render edilmiyor; 9 bespoke çubuk; 23 retrofitsiz bileşen.

### Uygulama kaydı
- [x] **Kullanıcı kararları (2026-10-18):** K1 = **CRT Yol B** (resmen kaldır) · K2 = **16/16 motif** · K3 = tek paylaşılan bant dizisi (28) · K4 = glitch+chromatic gerçekten uygulanır · K5 = feast tonu sabit, ayrım disiplinle · K6 = amber tek ton, sözleşme düzeltildi · K7 = **tam kapsam F0→F8**.
- [x] **F0 — Karar & sözleşme senkronu:** ADR-0069 + `visual-language.md` §1/§2/§3/§4/§6/§8 güncellendi.
- [x] **Dalga 1 (7 paralel ajan + orchestrator):** motif redraw ×3 grup (12 SVG) · motif kod katmanı (test kilidi + pencere dizilimi + bant ömrü) · yüzey token hijyeni (9 dosya) · rezerve renk semantiği (6 dosya) · ayarlar/istatistik hijyeni (3 dosya) · orchestrator: CRT sökümü, glitch/chromatic, planck geri, token tek kaynağı, `dark-*` ölçeği kaldırıldı.
- [x] **Dalga 2 (6 paralel ajan + QA gate):** F3 (katman/motion/juice: modal `layer-modal`, OS reduced-motion kök mührü + 8 animasyon, JuiceLayer delta-time, MAX_PARTICLES bütçesi, screen-shake modülü), F6 (okunabilirlik & 23 bileşen retrofit: LabSeedCard 3-state ramp, DimensionRow 9-tier lore, MultipliersPanel glif, bespoke çubuklar `progress-track`'e, gold+ring mühür), F7 (TimeClockOverlay 18px ızgara + font-mono, tabular-nums, font fallback tek kaynak), F8 + T10 (243 çift WCAG AA kontrast, ölü CSS & tanımsız sınıf temizliği).
- [x] **Doğrulama (Tüm 6 Kapı):** typecheck 0 · 27 dosya / **387 test** · build 0 · `harness:smoke` baseline sabit · `harness:perf` churn stabil · `harness:contrast` 243/243 çift WCAG 2.2 AA. Rapor: [completed.md](completed.md) (2026-10-18 girişi).

### Sıradaki adım
Tüm F0–F8 fazları ve dalgalar tamamlandı. Sistem kararlı ve üretim derlemesi hazır.

---
## ✅ Zaman Yayı (Time Clock) (2026-10-17) — TAMAMLANDI

**Sonuç kaydı:** [`brain/tasks/completed.md`](completed.md) (2026-10-17 girişi) · **ADR:** [`brain/decisions/0068-time-clock-rewind-spring.md`](../decisions/0068-time-clock-rewind-spring.md)
**Doğrulama:** `vue-tsc` 0 hata · `vitest` 27 dosya / 380 test · `npm run build` 0 hata · `harness:smoke` baseline değişmedi (`log10=90.72 shifts=8`)

**Kaynak:** kullanıcı talebi — *"oyunda arada çıkacak bir saat olsun ekranın ortasında kocaman
şekilde biz o saatin okunu geriye doğru saralım, onu sararken de diğer her şey geriye doğru aksın,
sonrasında iyice gerilsin; bu ok bıraktığımızda zaman çok daha hızlı akmaya başlasın, çok daha
hızlı kazanalım yutulan kütleyi"* → *"gerçek fizik gibi bir şey yapacağız"*.

**Sözleşme (donmuş, tek doğruluk kaynağı):** [`brain/scratchpad/time-clock-spec.md`](../scratchpad/time-clock-spec.md)

### Tasarım çekirdeği
- Kadran **120 sn'lik** bir oyun-zamanı penceresi. Geri sarılan saniye, kütleden **birebir** düşer
  (gerçek zaman yolculuğu; taban `matter >= 1`).
- Yay sertleşir: `tension = drag / (drag + K)` — hiperbolik doyum, son çeyrek çok daha fazla tur ister.
- **Bedel doğrusal, ödül kuadratik** (yay enerjisi): `%25` sarma = **net zarar (0.78×)**,
  `%100` sarma = **net kâr (3.60×, 16× tepe hız / 75 sn)**. Oyuncu "ya iyice ger, ya hiç dokunma"yı keşfeder.
- Sönüm: yay kendiliğinden gevşer, gevşedikçe kütle geri gelir — yani durup beklemek istismar değil.
- Salgı yalnız **üretimi** hızlandırır (buff süreleri / lab / bot saatleri normal akar) ki zaman
  hızı mevcut buff'ları yakmasın.

### Dalga (4 paralel subagent + orchestrator)
- [x] Keşif dalgası — 3 paralel subagent: tick/üretim boru hattı, UI/kekatman/ses, kayıt+sıfırlama+kilit gelenekleri
- [x] Sözleşme donduruldu + mekanik kararları kullanıcı onayıyla kapatıldı
- [x] **Ajan A** — `models/clock.ts` + `game/clock-data.ts` + saf testler (`clock-data.test.ts` 26, `tests/time-clock.spec.ts` 15)
- [x] **Ajan B** — store: state/getters/actions + `update()` tick bloğu + üretim faktörü (parite: `matterPerSecond` + breakdown) — 19 test
- [x] **Ajan C** — kayıt v18 + uçucu faz yükleme + `applyResetScope` + `time_clock` kilit basamağı (1e120 / order 1200) — 18 test + regresyon 62/62
- [x] **Ajan D** — `TimeClockOverlay.vue` (repoda ilk rotary/dairesel sürükleme girdisi) + `layer-clock` z-index 55 + 3 ses + `time_warp` sahnesi
- [x] Orkestratör kararı: yaşam boyu istatistikler `TimeClockState` → `PlayerStats` (`clockRewinds`/`clockRewoundSeconds`/`clockBestTension`) — belge/kod çelişkisi kapandı
- [x] Ölü sabit temizliği: `TIME_CLOCK_PITY_SECONDS` kaldırıldı (aralık tavanı 330 < 600 → hiç ateşlenemiyordu)
- [x] Entegrasyon + `npm run build` + `npm test` + `harness:smoke` (baseline değişmedi)
- [x] ADR-0068 + `completed.md` reconciliation + conventional commit

---

## 🎭 YENİ ÖNERİ — Tema Pivotu: "Sayı Avcısı" + Mizahi Sistem Sesi
**Durum:** ⏸️ **kullanıcı onayı bekliyor** (doküman aşaması tamam, kod yazılmadı)
- **ADR:** [`brain/decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md`](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md)
- **Ses sözleşmesi (bağlayıcı):** [`brain/context/narrative-voice.md`](../context/narrative-voice.md)
- **Tam senaryo:** [`brain/research/number-ladder-script-2026-10.md`](../research/number-ladder-script-2026-10.md)
- **Açık sorular / boşluk listesi:** [`brain/research/theme-pivot-open-questions-2026-10.md`](../research/theme-pivot-open-questions-2026-10.md)
- **Özet:** Kozmik oburluk → *en büyük sayıyı merak eden insan*; `Kütle (g)` → `Sayı`;
  sistem karakteri `SİCİL` oyuncuyla dalga geçer; `1.79e308`'den LNGN'ye 11 basamak
  (Akt I sayısal motor, Akt II tanımlama motoru).
- **Üretim modeli (K7):** iki çark (üretim ~5 dk / notasyon ~2 saat), 13 jeneratör
  (`Parmaklar` → `Teorisyen`), her basamakta **harcanan para birimi değişir**
  (Sayı → Üs → Kat → Ok → İsim → Tutarlılık), orta sayı = `En Büyük Sayı` rekoru,
  manuel buton `+1`. Detay: senaryo dosyası §6.
- **Motor + tetikleme (K8):** **hibrit** — tier 1-3 `break_eternity` gerçek aritmetik,
  tier 4+ kadran (`rank` + `mag ∈ [2,10)`, asla büyümez; süreklilik `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a`).
  Karışık tetikleme: `mag` sürekli · ok otomatik · **çapa manuel** (+ `Birikim`) ·
  ilk sefer zorunlu sahne, sonra "otomatik yükselt" seçeneği. Detay: senaryo §6.11-6.13.
- **Doküman çıktıları (tamam):** ADR-0077 · `narrative-voice.md` · `number-ladder-script-2026-10.md`
  · `theme-pivot-open-questions-2026-10.md` · `GAME_DESIGN.md` + `project-brief.md` üstüne uyarı bandı.
- **Açık sorular:** 19 madde (S1-S19). **Kapandı:** S1 (hücre modeli), S2 (fraksiyonel kule).
  **Bloklayıcı:** S3 prestij reset · S4 save göçü · S5 görsel dil çakışması · S6 `Tanım`
  çakışması · S7 ticker hacmi. Ayrıntı: `theme-pivot-open-questions-2026-10.md`.
- **Onay bekleyen açık kararlar:** O1 oyun adı · O2 sistem adı · O3 uygulama sırası ·
  O4 mizah yoğunluğu ayarı · O5 eski temanın arşiv statüsü · **D1-D5** (süre, save, dil,
  kapsam, görsel dil) — `theme-pivot-open-questions-2026-10.md`.
- **Onay sonrası sıra:** (1) gösterim katmanı (çapa/ok/büyüklük) → (2) `script.ts` +
  `news.ts` → (3) UI metinleri → (4) Eski Kayıtlar arşivi → (5) iç isimlendirme (opsiyonel).

---

## ✅ Geç Oyun Tick Performansı (2026-10-15) — TAMAMLANDI
**Sonuç kaydı:** `brain/tasks/completed.md` (2026-10-15 girişi) · **ADR:** `brain/decisions/0059-late-game-tick-performance.md`
- A/B kanıtı (git stash, 3 koşu): churn mean **~20.5 ms → ~5.9 ms (~3.5×)**, p95 62 → 13.8 ms; wall ~1.35 → ~0.79 ms. İki derlemede durum zinciri birebir (fingerprint + iş yükü sayaçları eşit).
- Kaynaklar: `math.ts` (`__v_skip`), `balance.ts` (kova memosu + kapalı form), `format.ts` (Intl yeniden kullanımı), `cache.ts` (`memoCompletedJoin`), bot yollarında `matterPerSecond` erken okuması kaldırıldı.
- Kalıcı komut: `npm run harness:perf` (churn + wall, deterministik senaryo). v0.38.1.

## ✅ Görsel Dil Yayılımı — Tüm Proje (2026-10-15) — TAMAMLANDI
**Sözleşme (tek gerçek):** `brain/research/visual-language-adoption-spec-2026-10.md`
**Sonuç kaydı:** `brain/tasks/completed.md` (2026-10-15 girişi) · **ADR:** `brain/decisions/0058-visual-language-adoption.md`

### Dalgalar
- [x] Dalga 1 — Denetim (4 paralel subagent: buton census, renk census, glif/oran/v-tip census, hareket/juice census)
- [x] Dalga 2 — Uygulama (5 paralel subagent, dosya sahipliği bölüşülmüş; paylaşılan dosyalar orchestrator'da)
- [x] Dalga 3 — QA denetimi (bağımsız subagent) + fix dalgası → FINAL QA VERDICT: PASS
- [x] Dalga 4 — `npm test` (263/263) + `npm run build` (0 hata) + `harness:smoke` (log10=90.72, 8 shift), ADR-0058, brain reconciliation, conventional commit

**Aktif dalga: "Aç Kumarhane" faz-temelli görsel dil pivotu** (sözleşme:
`brain/context/visual-language.md`, ADR-0060).

- [x] **Planlama** — fazlı uygulama planı yazıldı ve onaylandı:
      `brain/research/visual-language-hungry-parlor-implementation-plan-2026-10.md`
      (kod denetimi, bozulma sinyalleri, K0–K5 merdiveni, faz-üstü mimari kararlar M1–M7,
      Faz A–E adım+kabul kriterleri, doğrulama protokolü, riskler, açık kararlar O1–O6).
- [x] **Faz A — Zemin & CRT** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0061-phase-a-warm-ground-and-static-crt.md`](../decisions/0061-phase-a-warm-ground-and-static-crt.md) ·
      Derin spec: [`phase-a-ground-crt-deep-spec-2026-10.md`](../research/phase-a-ground-crt-deep-spec-2026-10.md).
      Dalga: orchestrator (`style.css` / `App.vue` / `index.html` / `tailwind.config.js` / `CrtOverlay.vue`) +
      Subagent A (9 hardcoded zemin hex'i) + bağımsız QA subagent (**PASS-with-notes**, 13/13 iddia doğrulandı).
      Kanıt: typecheck 0 hata · test 263/263 · build 0 hata · `harness:contrast` tüm çiftler ≥ AA · `harness:perf` CSS-bağımsız.
      Kalan iki not Faz E'ye işlendi (K-2 `glass-panel` + `bg-*` çakışması; `m6x11` kararı).
- [x] **Faz B — Bozulma altyapısı** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0062-phase-b-corruption-infrastructure.md`](../decisions/0062-phase-b-corruption-infrastructure.md) ·
      Derin spec: [`phase-b-corruption-deep-spec-2026-10.md`](../research/phase-b-corruption-deep-spec-2026-10.md).
      Çıktı: `corruption.ts` (türetme + meta + stamp/parse) + 11 test +
      store `corruptionLevel` getter (yeni state yok) + App kök mührü +
      `[data-corruption]` şiddet eğrisi (meta ile birebir).
      Kanıt: test 294/294 · build 0 hata · `harness:smoke` log10=90.72/8 shift (baseline sabit).
      Kilitli kararlar: O1 (K4 gate'i) + O3 (CRT eğrisi K0 %10/K1 %35/K2 %45) kapandı.
- [x] **Faz C — GIC kimlik kütüphanesi** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0063-phase-c-motif-substrate-identity.md`](../decisions/0063-phase-c-motif-substrate-identity.md) ·
      Derin spec: [`phase-c-motif-substrate-deep-spec-2026-10.md`](../research/phase-c-motif-substrate-deep-spec-2026-10.md).
      Çıktı: 16 SVG + `motifs.ts`/`motifs.test.ts` (7 test) + `MotifBand.vue` (z=45) +
      substrat (ScreenOverlay) + Wrinkler/Planck/Kriz kaplamaları + kolaj CSS bloğu.
      Kanıt: test 301/301 · build 0 hata · `harness:smoke` log10=90.7/8 shift (baseline sabit).
- [x] **Faz D — VS şöleni** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0064-phase-d-feast-shower.md`](../decisions/0064-phase-d-feast-shower.md) ·
      Derin spec: [`phase-d-feast-shower-deep-spec-2026-10.md`](../research/phase-d-feast-shower-deep-spec-2026-10.md) ·
      İnternet araştırması: [`phase-d-internet-research-2026-10.md`](../research/phase-d-internet-research-2026-10.md).
      Çıktı: `particles.ts` (7 sahne + bütçe 60/8/220 + suppression 400 ms) + 13 test +
      `JuiceLayer` genişletmesi (tek canvas, `feast-scene` olayı, knock-down, YUT kıvılcımı) +
      tetikleyici kablosu (anomali/çöküş/dekad) + Faz D CSS bloğu.
      Kanıt: typecheck 0 · test 314/314 · build 0 hata · `harness:smoke` log10=90.72/8 shift
      (baseline sabit) · `harness:perf` churn 6.69/wall 0.77 ms (bant içinde) ·
      `harness:contrast` AA.
- [x] **Faz E — Retrofit & QA** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0065-phase-e-retrofit-qa.md`](../decisions/0065-phase-e-retrofit-qa.md) ·
      Derin spec: [`phase-e-retrofit-qa-deep-spec-2026-10.md`](../research/phase-e-retrofit-qa-deep-spec-2026-10.md) ·
      İnternet araştırması: [`phase-e-internet-research-2026-10.md`](../research/phase-e-internet-research-2026-10.md).
      Çıktı: K-2 `:where()` + `progress-track-lg` + `useMotionReduced` tek kapı
      (CommentTicker/MusicControls) + CrisisTab tabanı + `m6x11` silme.
      Kanıt: typecheck 0 · test 314/314 · build 0 hata · `harness:smoke` log10=90.72/8 shift
      (baseline sabit) · `harness:perf` churn 6.91/wall 0.84 ms · `harness:contrast` AA.
- [x] **Tipografi Pivotu — "Aç Kumarhane" fontları** — ✅ **TAMAMLANDI (2026-10-16)**.
      ADR: [`0066-hungry-parlor-typography-pivot.md`](../decisions/0066-hungry-parlor-typography-pivot.md) ·
      Rapor: [`typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md).
      Çıktı: `public/fonts/m6x11plus.ttf` + `ATTRIBUTION.md` + `@font-face`/preload;
      `display`=m6x11plus (CounterDisplay 36/54/72 + JuiceLayer canvas 18/36, bold yok);
      YENİ `hand`=Caveat + K3 `.collage-scrawl` (ScreenOverlay el yazısı annotasyonlar);
      sans/mono korunur; Chakra Petch sıfır referans.
      Kanıt: test 314/314 · build 0 · contrast AA · smoke log10=90.72/8 shift · dist artifact ✓
      (Playwright/Termux kurulamadı → ekran görüntülü görsel onay KULLANICIDA).
- [x] **Tipografi 2. Dalga — UI fontları (Space Grotesk + Space Mono)** — ✅ **TAMAMLANDI (2026-10-16)**.
      ADR: [`0067-ui-font-wave-space-grotesk-spacemono.md`](../decisions/0067-ui-font-wave-space-grotesk-spacemono.md).
      Tetik: kullanıcı "menüler/tüm yazılar aynı" dedi; 13 aday fonttools TR-doğrulama,
      yön "en stilistik + görsel dil" → sans Space Grotesk + mono Space Mono (ayna aile).
      Çıktı: token swap (`tailwind.config` sans/mono/display-fallback) + `index.html`
      Google Fonts linki + hardcoded yığın hizası (`style.css` body/section-label/hint
      → Space Grotesk; dim-glyph/stat-box/ds-badge/btn-primary/balatro-chip/sticker +
      `tooltip.ts` + `JuiceLayer` fallback → Space Mono).
      Kanıt: test exit 0 (314/314) · build 0 · contrast AA · smoke 90.7/8 shift ·
      dist `.font-sans/.font-mono` ✓ · Inter/JetBrains referansı 0 · latin-ext ✓.

**"Aç Kumarhane" pivotu (Faz A–E + Tipografi) KAPANDI.** Sıradaki adaylar (ayrı işler):
F — Prestige ritüeli · ADR-0033 §3 / ADR-0034 denge soruları.

**Sıradaki adım:** Yok — aktif dalga kapalı (tipografi 1. + 2. dalga tamam). Kullanıcıdan
beklenen: m6x11plus sayaç / Space Grotesk-Space Mono menü / Caveat K3 notlarının
**görsel onayı** (bu ortamda tarayıcı doğrulaması yapılamadı).

**Beklemede (kullanıcı onayı gerektiren adaylar):**
- F — Prestige ritüeli (iki ekran kuralı, sıfırlama anı) — ayrı iş olarak bekliyor.
- Denge kararı: ADR-0033 §3 (koşu süresi bandı) ve ADR-0034 (ilk şafak SP açlığı) açık soruları sürüyor.
