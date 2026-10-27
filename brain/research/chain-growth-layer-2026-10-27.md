# Zincir büyüme katmanı — ölçüm raporu (2026-10-27)

> **Soru:** ADR-0082 zincir-only dilimi bıraktı. Sıradaki iş "boost + güçlendirme döngüsünün
> yeniden tasarımı". O döngü nasıl olmalı? Bu belge **karar değil ölçümdür**: yedi aday mekanik
> aynı oyuncu politikasıyla gerçek zincir matematiği üzerinde koşturuldu.
>
> **Durum:** `brain/tasks/in-progress.md` → "Boost + güçlendirme döngüsü, ayrı tasarım turu".
> Bu rapor o turun **girdisi**dir; hiçbir oyun kodu değişmedi (`src/` dokunulmadı).

---

## 0. Yöntem

- **Motor:** `src/game/number/tuning.ts` sabitleri birebir kullanıldı (`c = 25·8ⁱ`, `g = 1,20`,
  `p₁ = 1`, `p₂₋₈ = 0,11`, `BLOCK_SIZE = 10`, `RING_DIRECT_SHARE = 1`).
- **Oyuncu politikası:** `balance.test.ts` ile aynı — en derin açık halkayı bir bloğa tamamla;
  hepsi bloktaysa en ucuz bloğu al. 2 tık/sn, `dt = 0,5`.
- **Araçlar:** `brain/scratchpad/chain-only-probe/` (`probe.ts`, `boost-loop.ts`, `boost-sweep.ts`,
  `ladder.ts`, `ad-boost.ts`, `milestone.ts`, `candidates.ts`, `levels.ts`, `compounding.ts`).
- **Uyarı:** bu bir *oyuncu* simülasyonudur; politika dışı stratejiler sayıları değiştirebilir.
  Aşağıdaki tablolar **aynı politika içinde** karşılaştırılabilir.

---

## 1. Temel bulgu: zincirin bir hedefi yok

Zincir-only oyun, gerçek motorla:

| Saat | Sayı | /sn | Alım |
| --: | :--- | :--- | --: |
| 1 | 7,27e15 | 4,67e14 | 1 100 |
| 2 | 4,23e19 | 4,78e17 | 1 440 |
| 4 | 1,39e22 | 1,86e20 | 1 740 |
| 8 | 2,13e25 | 4,58e22 | 2 010 |
| 12 | 1,88e26 | 1,02e24 | 2 170 |
| 24 | 3,94e29 | 1,83e26 | 2 420 |
| 48 | 4,91e31 | 3,00e28 | 2 680 |
| 96 | **2,76e34** | 4,64e30 | 2 930 |

**Büyüme hızı düşüyor:** 1→2. saat +3,77 basamak/sa · 48→96. saat **+0,057 basamak/sa**.

**Sonuç:** kapı `1,79e308` bu eğriyle **ulaşılamaz**. 96 saatte 2,76e34 teyiz; kalan ~274
basamak, son ölçülen hızda **~4 800 saat (200 gün)** eder ve hız düşmeye devam eder. Sebep yapısal:
zincir 7 katlı bir integraldir, `N(t) ∝ t⁸/8!` — polinom büyüme, üstel hedefe yetişmez.

> **Bu bir hata değil, ADR-0082 nin bilinçli sonucu** ("oyunun 85 saat / 11 basamak hedefi için
> gereken büyüme katmanı şu an yok" — ADR-0082 "Olumsuz" bölümü). Ama artık **sayıyla** biliniyor:
> eksik olan katman ~274 basamaklık bir çarpandır.

---

## 2. Kaldırılan boost neden patlıyordu (matematik)

`E14` kuralı: `çarpan *= (zirve/10)^0,2`, tam sıfırlama. Mevcut ekonomiyle yeniden ölçüm:

| Üs | Kapı (dk) | Boost | Alım |
| :--- | --: | --: | --: |
| 0,15 | 46,1 | 35 | 2 800 |
| 0,20 | 37,7 | 27 | 2 160 |
| 0,25 | 32,8 | 22 | 1 760 |
| 0,30 | 29,8 | 19 | 1 520 |
| 0,40 | 26,1 | 15 | 1 200 |

Üs 0,12 ile döngü anları (dk):

```
19,6 · 31,6 · 39,3 · 44,2 · 47,6 · 50,0 · 51,5 · 52,5 · 53,2 · 53,6 · 53,8 · 54,0 · …
54,4 · 54,6 · 54,8 · 55,1 · 55,3 · 55,7 · 56,5 · 57,4 · 58,4 · 59,4 · 59,9
```

İlk tur 19,6 dk; **43 boost un 28 i son 5 dakikada**. Tur süresi 12 saniyeye çöküyor.

**Sebep:** ödül zirveye bağlı, zirve de çarpana bağlı. Log uzayında her tur bir öncekinin
(1+e) katı → **çift üstel**. Oyuncunun gördüğü şey "sayı patladı" değil, "oyun bozuldu".

> **Teşhis:** ADR-0082 haklıydı ama gerekçesi eksikti. Sorun "halkalar 1 e iniyor, oyuncu
> sıfırlanmadı sanıyor" değildi; sorun **geri besleme katsayısının ıraksak olmasıydı**.
> Bu yüzden boost u geri getirmek tek başına çözüm değil — **aynı hata tekrar eder**.

---

## 3. Yedi aday mekanik

| # | Mekanik | Ölçülen | Değerlendirme |
| :- | :--- | :--- | :--- |
| M1 | **Sabit ödül** (her tur `×N`, koşul sabit) | ×2 → 1 019 boost / 299 dk · ×5 → 439 / 135 dk · ×10 → 307 / 98 dk | ✅ kararlı · ❌ boost sayısı absürd (oyuncu 300 kez aynı düğmeye basar) |
| M2 | **Gereksinim merdiveni** (`Rᵢ = R₀·kⁱ`, ödül sabit) | R₀=1e6, +3 log, ×1e2 → 19 boost **ama kapı yok** (24 sa); tur süreleri 19,6 → 319 dk düzgün artıyor | ✅ kararlı ve okunur · ❌ 120 dk hedefine oturmuyor |
| M3 | **Yerel bileşik** (`rateᵢ = baseᵢ·r^boughtᵢ`) | r=1,18 → kapı yok · r=1,20 → **35,7 dk** · r=1,25 → 30,1 dk | ⚠️ **bıçak sırtı**: 1,18 ile 1,20 arasında uçurum var |
| M4 | **Milestone çarpanı** (her 10 alımda o halka `k` kat) | k=2 → 5,3e39 @8sa · k=4 → **1,8e99** @8sa | ✅ sıfırlama yok, ADR-0082 ruhuna uygun · ❌ tek başına kapıya yetmiyor |
| M5 | **Seviye katmanı** (halka başına satın alınan seviye) | üç kurulumda da kapı yok (12 sa) | ⚠️ kurulum ölçeği yanlış seçildi; **sonuç kesin değil**, yeniden ölçülmeli |
| M6 | **Sıfırlamasız boost** (M4 + M2 birlikte) | ölçülmedi | 🟡 en umut verici aday (bkz. §5-C) |
| M7 | **Zincir-only (bugünkü)** | 96 sa → 2,76e34 | ❌ hedef yok |

---

## 4. Aritmetik kısıt (tasarımı bu belirliyor)

Kapı `1,79e308` ≈ **308 basamak**. Zincir 2 saatte ~**20 basamak** üretiyor.

```
288 ≈ (tur sayısı) × (tur başına basamak ödülü)
```

| Tur sayısı | Tur başına ödül | Okunur mu? |
| --: | :--- | :--- |
| 12 | ×1e24 | ❌ "her basışta 1e24 kat" saçma |
| 24 | ×1e12 | ❌ hâlâ absürd |
| 48 | ×1e6 | ⚠️ sınırda |
| 144 | ×100 | ✅ okunur, ama 144 tur = 2 saatte 50 saniyede bir |
| ~300-1000 | ×2…×5 | ✅ AD nin gerçek cevabı — ama "85 saat" hedefiyle çelişir |

**Bu tablo tek başına kararı veriyor:** "2 saatlik basamak + 8 halkalı zincir + 1,79e308 kapı"
üçü aynı anda **tutarlı değil**. En az biri değişmeli.

---

## 5. Seçenekler (ölçümle desteklenen)

### A — Kapıyı halka kilometre taşına çevir *(en az kod, en çok denge işi)*

1. basamak, 8. halkadan **N birim** alınınca biter (ör. 100 birim). `1,79e308` etiketi
**basamağın adı** olarak kalır (notasyon merdiveni zaten bir *isim* merdiveni, `S1`).

- ✅ 2 saatlik ritim ve 8 halka aynen korunur; boost gerekmez → ADR-0082 kararı bozulmaz.
- ❌ "Kapı = 1,79e308" tasarım kararı (`E7`, `S2`) gevşer; sayının kendisi hedef olmaktan çıkar.
- ❌ 2. basamak (`1e(9e15)`) ile bağ kopuk kalır.

### B — Kararlı boost döngüsü + uzun 1. basamak *(M2, ölçüldü)*

Gereksinim merdiveni, ödül sabit: `Rᵢ = R₀ · kⁱ`, `çarpan *= ×100`.

- ✅ Kararlı, sıfırlama var, "an" hissi var, döngü asla patlamıyor.
- ❌ Ölçüm: 120 dk değil **269 dk** (R₀=1e6, +2 log, ×1e2) ya da **797 dk**. Yani ya 1. basamak
  uzar (85 saat → 250+ saat) ya da ödül büyütülür (okunmaz hâle gelir).

### C — İki katman: yavaş boost + hızlı halka çarpanı *(M6)*

Halka alımları `k` kat verir (M4, sıfırlama yok); boost turu bu çarpanı toplar.

- ✅ M4 sıfırlamasız → "aldıklarım sıfırlanmıyor" şikayeti **kökten** çözülür (asıl mesele buydu).
- ✅ Boost nadir olur (12-20 tane), her biri gerçek bir eşik.
- ❌ İki eğri birlikte ölçülmedi; bu raporun kapsamı dışında kaldı.

### D — `+1` i yakıta bağla *(radikal, ucuz deneme)*

Boost lar sayıyla değil **tıklamayla** satın alınır. `+1` şu an gerçek ama neredeyse süs;
85 saatlik oyunda tek dokunma noktası o. Bu, `S9` u ("+1 gerçek") gerçekten anlamlı kılar.

- ✅ `+1` canlanır, döngüye oyuncu emeği girer, boost sayısı doğal olarak sınırlanır.
- ❌ Ölçülmedi; "idle oyun" dengesini bozabilir (85 saat tıklama zorunluluğu = düşmanca).

---

## 6. Öneri

1. **Önce aritmetik kısıtı sahiplen** (§4). Aynı anda hem 2 saat, hem 8 halka, hem `1,79e308`
   olamaz. Bu bir zevk meselesi değil, ölçülmüş bir çelişki.
2. **Boost u eski haliyle geri getirme.** Geri besleme ıraksak (§2); aynı hata tekrar eder.
3. **Sırayla dene:** önce **C** (iki katman) — sıfırlama sorununu kökten çözen tek aday ve
   ADR-0082 nin "aldıklarım sıfırlanmıyor" şikayetine doğrudan cevap. C tutmazsa **A** ya düş
   (kapıyı halka taşı) ve 2. basamağı ona göre yeniden bağla.

---

## 7. Bu turda yapılan belge düzeltmeleri

Kod `v22` ye geçmişti ama belgeler `v21` diyordu; silinen `upgrades.ts` hâlâ üç yerde
referanslıydı (`AGENTS.md`, `README.md`, `brain/tasks/todo.md`). Düzeltildi:
`AGENTS.md` §2 + §4 · `README.md` "Teknoloji yığını" + "Kayıt" + "Repo yapısı" ·
`GAME_DESIGN.md` §9 başlığı · `brain/tasks/todo.md` `K1` satırı.
`GAME_DESIGN.md` §6 daki `upgrades.ts` bağlantısı **arşiv bölümünde** olduğu için bırakıldı.
