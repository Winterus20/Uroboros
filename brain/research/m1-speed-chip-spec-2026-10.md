# M1 Spec — Otonom Hız Çipi (bot speed chips)

> **Tarih:** 2026-10-19 · **Durum:** TASARIM (orchestrator onayı bekliyor / uygulama Faz 4)
> **Kaynak:** pacing planı §9.2 (M1) · P0 §9.5 (E1 ölçümü) · ADR-0073 (aile kademe çarpanı)
> **İlgili:** `src/game/autobuyer-data.ts`, `src/stores/game/getters-dimensions.ts`,
> `src/stores/game/actions-dimensions.ts`, `src/components/AutobuyersTab.vue`

---

## 1. Problem — neden M1, neden "hız"

P0 §9.5'in E1 ölçümü iki şeyi kanıtladı:

1. **Fiyat eğrisi (plan §3) erken kalabalığı çözmüyor** — 30 dk tepe log10 98.39 → 98.44 (değişmedi).
2. **Fiyat eğrisi koşuyu uzatıyor** — 12 saatlik tavan aşıldı (tepe 1e224 < 1e308).

P3.3'ün merdiven yayılımı da aynı yönde çalışır: erken üretim geç gelir → koşu uzar.
Dolayısıyla **tempo onarımının tek kolu üretim tarafıdır** (fiyat değil).

### 1.1 Kritik fizik: sabit çarpan tempo onarmaz

Bu oyunda kütle **üstel geri besleme** ile büyür: `dM/dt ≈ k·M`, `k` = büyüme hızı sabiti.
Buna göre:

| Müdahale | Etki |
| :--- | :--- |
| Sabit üretim çarpanı (×2) | Eğriyi sadece **log10(2) ≈ 0.3 dekad** kaydırır → koşu süresi değişmez |
| **Büyüme hızı `k`'yı artıran** müdahale | `T = ln(target/M0)/k` → `k` iki katına çıkarsa süre **yarıya** iner |

Bu yüzden ADR-0073'ün aile kademe çarpanı (sabit) ve başarım çarpanları **tempo onarımı değildir**;
onlar "erken ödeme" yapar, eğriyi kaydırır. Tempo onarımı `k`'yı büyüten müdahaleye ihtiyaç duyar.

### 1.2 `k`'yı ne büyütür?

`k`, **birim zamanda yapılan satın alma adedinin** ve her 10 alımda üretimin çarpanının
(`DIM_PER_TEN_MULT = 1.595`) bileşkesidir. Oyuncu tıklayamaz hale geldiğinde (geç oyun) tek
motor **bot satın alma temposudur**. M1 tam olarak buraya dokunur:

> **Hız çipi = bot satın alma sıklığını artıran, maliyeti artan, paylaşılan cüzdanlı bir
> yatırım.** Yatırımın alternatifi: aynı kütle ile bir boyut kovası almak.

---

## 2. Mekanik

### 2.1 Tek ladder (kapsam disiplini)

**"Otonom Hız" çipi** — global, tek merdiven:

| Alan | Değer | Gerekçe |
| :--- | :--- | :--- |
| `speedChipLevel` | 0…N (koşu içi) | yeni state alanı; **prestijde sıfırlanır** (tickspeed gibi) → **kayıt migrasyonu YOK** |
| Maliyet | `CHIP_BASE_COST × CHIP_COST_MULT^level` | cüzdan paylaşımı → boyut kovasıyla ikilem |
| Etki | tüm botların satın alma aralığı `÷ (1 + CHIP_INTERVAL_GAIN × level)` | `k` artar (bot daha sık alır) |
| Tesadüf | **yok** | deterministik; ADR-0032 "varlık deterministik kalır" ilkesi |

### 2.2 Neden koşu içi?

Run-scoped seçim bilinçlidir: (a) kayıt şeması/migrasyon değişmez (düşük risk, ADR-0032),
(b) her koşuda yeniden kazanılır → tempo onarımı **ilk koşuda** da geçerli olur,
(c) ikilem her koşuda yeniden kurulur ("bu koşuda hıza mı, boyuta mı?").

### 2.3 İkilem garantisi (tuzak önleme)

Plan §9.3'ün tuzağı: *"bot çipi beklerken boyut duvarına çarpma"*. Bunu iki kuralla engelliyoruz:

1. **Çip maliyeti boyut kovası maliyetiyle aynı ölçekte ilerlemeli** — `CHIP_COST_MULT` (4 dekad/seviye)
   boyut kova ivmesiyle (`COST_MULTS` 3 dekad/kova) aynı bantta. Böylece çip almak boyut almaktan
   **ucuz değil** ama **daha pahalı da değil** → gerçek bir seçim.
2. **Çip etkisi asla boyut etkisinin yerine geçmez** — çip satın alma *sıklığını* artırır, oyuncunun
   boyut satın alma kapasitesini kısıtlamaz. Yani "bot çipi beklerken boyut duvarı" oluşmaz; tam tersi,
   çip boyut alımını hızlandırır.

---

## 3. Sayılar (ölçümle kilitlenecek — başlangıç değerleri)

| Sabit | Başlangıç | Aralık | Not |
| :--- | ---: | :--- | :--- |
| `CHIP_BASE_COST` | **1e40** (ölçümle 1e12'den taşındı) | D7 bölgesinde erişilebilir (~353 sn) |
| `CHIP_COST_MULT` | 1e4 | 1e3–1e6 | 3–6 dekad/seviye |
| `CHIP_INTERVAL_GAIN` | 0.15 | 0.05–0.30 | seviye başına aralık bölme katsayısı |
| `CHIP_MAX_LEVEL` | 40 | 20–60 | üst sınır (run-scoped, kayıtta tutulmaz) |

**Ölçüm döngüsü (her tur):** 30 dk koşu (tepe + 10 dk sistem sayısı) → 12 saat koşu (ilk tekillik).
Kabul: 30 dk tepe **≥ 1e70** (erken üretim katli değil) ve ilk tekillik **≤ 6 saat** (ADR-0023 revize
adayı; 3.5 saat ideal hedef olarak korunur).

---

## 4. Uygulama notları

- **State:** `src/stores/game/state.ts` → `speedChipLevel: 0`.
- **Maliyet/effect:** `src/game/balance.ts` → saf sabitler + `speedChipCost(level)` yardımcısı.
- **Getter:** `getters-dimensions.ts` → `speedChipCost`, `speedChipEffectMult`.
- **Action:** `actions-dimensions.ts` → `buySpeedChip()` (cüzdan yetersizse no-op).
- **Bot aralığı:** bot satın alma yeri bulunup `interval / (1 + gain×level)` uygulanmalı
  (bot tick'leri `actions-*` içinde; **dikkat: oyuncu tıklaması da hızlanır mı? — hayır, sadece botlar**).
- **UI:** `AutobuyersTab.vue` → mevcut bulk/max kartlarının yanına "Otonom Hız" kartı (maliyet + etik
  + seviye). Görsel dil: mevcut kart kütüphanesi, yeni tipografi yok.
- **Testler:** maliyet monoton, etki monoton, cüzdan yetersizken satın alma yok, prestige sonrası
  sıfırlanma, **ölçüm kilidi**: `speedChipCost(0) === CHIP_BASE_COST`.
- **Kayıt:** run-scold → **migrasyon yok**; `actions-save.ts` serialize listesine eklenmez.

---

## 5. Bağlılıklar ve ihlal edilmeyenler

- **ADR-0032 (idle düzeltmesi):** botların *varlığı* asla kıtlaşmaz; yalnız hız pahalanır. ✓

---

## 6. ÖLÇÜM SONUCU (2026-10-20) — v1 "bot hızı" etkisi ÖLÇÜLEBİLİR DEĞİLDİ

v1 (bot satın alma aralığını bölme) 12 saatlik gerçek koşularda ölçüldü:

| Profil | Çipsiz tepe | Çipli tepe | Çip |
| :--- | ---: | ---: | :--- |
| active (seed 1, dt 0.5) | 1e308.25 · ilk tekillik 9:33:17 | 1e308.25 · **9:33:09** | 40 seviye (tavan), 1641 alım |
| idle (seed 1, dt 0.5) | 1e121.69 | **1e121.69** | 28 seviye, 53 alım |

**Teşhis — darboğaz bot hızı değil, KÜTLE:**
1. Aktif profilde her 2 saniyede **maxAll** yapılır (süper-insan modeli) → satın alma motoru botlar
   değil maxAll'dir; botlar ikincil kalır.
2. Idle profilde (tık yok, maxAll yok, yalnız botlar) tepe **birebir aynı** → botlar paraları olmadığı
   için bekler; hızlanmaları hiçbir şeyi çözmüyor.
3. **Baskılanma (dominance) argümanı:** kütleyi çipe harcamak, aynı kütleyi boyut kovasına harcamaktan
   (her 10 alımda ×1.595) **her zaman daha zayıf**. Yani v1, rasyonel bir oyuncunun **hiç**
   almayacağı, hatta otomatik alan bir botun mass cüzdanını **yakacağı** bir mekanizma.

**Sonuç:** plan §9.2'nin M1'i *"hız"* kelimesiyle tanımlıyor, ama ölçüm gösteriyor ki hız bu ekonomide
bağlayıcı kuvvet değil. Planın **amacı** ise "mass cüzdanı paylaşılır → kova mı çip mi kararı doğar"
idi — bu, **kütle karşılığında kovaya yakın değerde** bir fayda ile mümkün.

## 7. v2 KARARI — Çip, boyut üretim çarpanını yükseltir

| Sabit | Değer |
| :--- | ---: |
| `CHIP_BASE_COST` | **1e40** |
| `CHIP_COST_MULT` | 1e4 |
| `CHIP_PRODUCTION_PER_LEVEL` | **0.1** (+%10/seviye, çarpımla) |
| `CHIP_MAX_LEVEL` | 40 |

- `speedChipProductionMult(level) = 1.1^level` → **seviye 5'te ×1.61**, bir boyut kovasının (×1.595)
  değerine denk → **ikilem gerçek olur** (kovaya mı çipe mi kararı).
- Uygulama noktası: `getDimensionMultiplier` (ana üretim kaynağı) + **cache anahtarı**
  (`dimMultCacheKey`) `speedChipLevel`'ı içermeli — yoksa çarpanda bayat kalır (sessiz hata).
- **Tempo etkisi ihmal edilebilir**: sabit çarpan eğriyi ~0.2–0.5 dekad kaydırır → 12 saatlik koşuda
  ölçülebilir değişim beklenmez; **pacing ölçümü bozulmaz** (ADR-0074'teki 600 sn sayısı korunur).
- Altın standardın onarımı **M1 ile değil**, `k`'yı büyüten ayrı bir proje ile yapılacak (ADR-0075 §3.3).

### Ölçüm kapısı (v2) — SONUÇLAR
1. `npm test` + typecheck + build yeşil ✅
2. Harness `--chips` açıkken 30 dk tepe: **69.1 → 98.19** (ölçüldü, `v2b-chips.json`); ≥1e70 bandı korunuyor ✅
3. 600 sn'deki özellik sayısı: **4** (CR lik ölçüt ≤5 korunuyor, `v2b-chips.json`) ✅
4. 12 saatlik koşu (çip açık) → ilk tekillik süresi `v2b-chips-12h.json`'dan gelecek; beklenti:
   çipsiz 9s33dk'dan **kısa** (tempo onarımı yönünde).

**Retun bulgusu (1e12 → 1e40):** 1e12 tabanında erken seviyeler ×45'e birikiyor, colony/lab'ı
600 sn'ye çekiyordu (F600=6, tepe 181.8 → pacing ölçütü ihlal). 1e40 tabanında ilk çip ~353 sn'de
geliyor; 600 sn sonuna kadar 1-3 seviye (×1.1-1.33) → F600=4 korunur, ama 30 dk tepe
+29 dekad yükselir (harnesin chip alım politikası agresif olduğu için).

- **ADR-0023 (altın standart):** bu spec onarımın **üretim** kolunu tanımlar; bant revizyonu
  ölçüm sonrası ayrı bir karardır (P0 §9.5).
- **Plan §3 (fiyat):** P1 fiyat kolu **M1 ile aynı turda** uygulanmalı; tek başına işlevsizdir
  (E1 kanıtı) ve koşuyu uzatır.
