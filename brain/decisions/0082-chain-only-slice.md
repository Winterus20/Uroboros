# ADR-0082: Zincir-Only Dilim — Boost, Prestij ve Tanım Yükseltmelerinin Kaldırılması

## Durum

**Kabul edildi & uygulandı (2026-10-25)** — proje sahibinin doğrudan talebi üzerine.

- **Talep:** *"boosta bastığımda hepsi bir kalıyor, aldıklarım tamamen sıfırlanmıyor"* → ardından
  *"kaldır sadece bu zincir kalsın; boost ve diğer güçlendirmeleri daha sonra üzerinde uzun uzun
  düşünerek nasıl yapacağımızı planlayacağız, öyle ekleyeceğiz."*
- **Üst kararlar:** [ADR-0079](0079-number-economy-vertical-slice.md) (E6 zincir, E11 kilitler),
  [ADR-0081](0081-ring-direct-number-contribution.md) (halka → sayı doğrudan katkısı),
  [ADR-0078](0078-pure-number-visual-language.md) (görsel dil).

---

## Bağlam

Boost, D3 kararı gereği halkaları **1 birime** indiriyordu (zincir canlı kalsın diye). Oyuncu
ekranda her satırda **1** görünce "aldıklarım sıfırlanmadı" diye okudu; satın alma sayaçları
(bought) ise gerçekten 0'a dönüyordu. Bu, tasarım dili ile oyuncunun beklentisi arasındaki
ilk çatlak değildi: boost/prestij/Tanım döngüsü, tema pivotundan (ADR-0077) devralınan tek
karmaşık katmandı ve zincirin kendisi henüz yalnız 1. basamakta.

Sahibin kararı: **döngüyü şimdilik tamamen çıkar; oyun yalnız zinciri büyütsün.** Boost ve
güçlendirmeler geri gelecekse önce ayrı bir tasarım turunda planlanacak.

Kaldırmadan önce iki ölçüm alındı:

| Senaryo | Sonuç |
| :--- | :--- |
| Boost sıfırlaması 0 birime (zincir her döngü yeniden kurulur) | Eski 2 saatlik hedefle uyumsuz: 107,7 dk kapı ama **1 941 alım**; oyuncu her döngü 8 halkayı yeniden alır |
| Boost tamamen yok, eski sabitler | Kapı **ulaşılamaz**: 24 saatte sayı yalnız **3,9e29** (kapı 1,79e308) |

Yani boost'u tek başına silmek, kapı/prestij döngüsünü de fiilen öldürüyordu. Bu yüzden kaldırma
**birlikte** yapıldı: boost + kapı/prestij + Tanım yükseltmeleri + otomasyon.

---

## Karar

### 1. Oyunda kalan tek ekonomik katman zincirdir

```
number        = 10 ile başlar
Fingers       = 1 sayı/sn (birim başına, S9)
halka 2–8     = 0,11 birim/sn aşağı + 0,11 sayı/sn sayıya (RING_DIRECT_SHARE = 1)
kilit         = bir halkadan 10 birim → sonraki halka (mandal, D6)
alım          = sayıdan düşer; bestNumber ve kilitler geri gitmez (S3)
```

Sıfırlama yoktur; resetRun, applyBoost, applyPrestige, gateReady, tanimReward,
productionEfficiency, canBoost ve boostMultiplier koddan çıktı.

### 2. Kaldırılan katmanlar

| Katman | Kaldırılan |
| :--- | :--- |
| Mini boost | breathe düğmesi, B kısayolu, boostMult/boosts/totalBoosts, boost görsel dili (400 ms nefes, rozet) |
| Kapı / prestij | gate, gateReached, tanim/tanimTotal/prestiges, gate düğmesi, P kısayolu, verim cezası |
| Tanım yükseltmeleri | upgrades.ts (start · chain · boost · autobuy), upgrades sekmesi, otomasyon |
| Ses | boost/prestij/kapı satırları; havuz **100 satır** (92 ticker + 8 sahne, 14 nadir) |
| Kayıt | v22: boostMult, boosts, tanim, tanimTotal, prestiges, totalBoosts, gateReached, upgrades |

### 3. Kayıt uyumluluğu

SAVE_VERSION = 22, MIN_SUPPORTED_SAVE_VERSION = 20 kaldı. v20/v21 kayıtları açılır; sayı ve
zincir korunur, kaldırılan alanlar yok sayılır. Bulut meta'sındaki prestiges alanı eski
istemcilerle şema uyumu için 0 olarak yazılmaya devam eder.

### 4. Görsel/ses sınırı

Basamak kimliği korunur: hero hâlâ rung 1 / 11, 1.79e308 etiketi ve "I thought it was a
wall" adını taşır. Boost'a ait hareket dili (nefes, rozet) kaldırıldı; ticker'ın boost/prestij
iddiaları silindi. Kalan satırlar yalnız zinciri ve sayıyı anlatır.

---

## Ölçüm (zincir-only, gerçek motor)

src/game/number/balance.test.ts — 2 tık/sn, dt = 0,5:

| Metrik | Sonuç |
| :--- | :--- |
| Halka açılışları | 0 · 1,6 · 4,2 · 6,8 · 9,3 · 11,9 · 14,5 · **17,0 dk** |
| İlk 10 dk alım kararı | **42** |
| 60. dakika sayı | **7,9e15** |
| 120. dakika sayı | **4,3e19** |
| 120. dakika toplam alım | **1 440** |
| Tıklamasız oyuncu | 10'da kalır, ilk alım (25) yapılamaz |

---

## Alternatifler (değerlendirildi)

| Alternatif | Neden reddedildi |
| :--- | :--- |
| Boost'u tutup sıfırlamayı 0 yapmak | Her döngü 8 halka yeniden kurulur (107,7 dk / 1 941 alım); sahibin "sadece zincir" talebiyle çelişir |
| Yalnız düğmeyi gizlemek, motoru bırakmak | Ölü kod + yanıltıcı kayıt alanları; testler ve ses havuzu boost'a bağlı kalır |
| Boost'u kaldırıp kapıyı korumak | Kapı 1,79e308'e 24 saatte bile ulaşılmıyor (3,9e29) — prestij ölü kalır |
| Zincir üretimini kapıya yetecek kadar şişirmek | 2 saatlik hedef için gereken çarpan (~1e279) zinciri anlamsızlaştırır; yeni ekonomi tasarımı gerekir |

---

## Sonuçlar

**Olumlu**

- Tek kural, tek ekran: sayı + 8 halka + `+1`. Boost'un "1 birim" karmaşası tamamen gitti.
- Kayıt şeması ve store sadeleşti; 95 test / 6 dosya, typecheck ve build temiz.
- Döngü geri eklenmek istendiğinde temiz bir zemin var: eski kod ADR-0079/0081'de arşivli.

**Olumsuz / maliyet**

- Oyunun "85 saat / 11 basamak" hedefi için gereken büyüme katmanı şu an yok; zincir tek başına
  saatler içinde 1e15–1e19 bandında kalıyor.
- Boost/prestij geri gelirse kayıt şeması yeniden değişecek (v23) ve denge baştan ölçülecek.
- RungScene motoru duruyor ama rung ilerlemediği için tetiklenmiyor.

---

## Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| 1 | Boost + güçlendirme döngüsünün yeniden tasarımı | ⛔ sahibin "uzun uzun düşünüp planlayacağız" dediği ayrı tur |
| 2 | rung ilerlemesi / 2. basamak | ⛔ tasarlanmadı |
| 3 | Zincir-only ekonominin uzun vadeli hedefi (ne zaman, hangi sayıda duracak?) | 🟡 açık |

---

## Takip

- Motor: [src/game/number/economy.ts](../../src/game/number/economy.ts)
- Sabitler: [src/game/number/tuning.ts](../../src/game/number/tuning.ts)
- Store: [src/stores/game.ts](../../src/stores/game.ts)
- Testler: [src/game/number/economy.test.ts](../../src/game/number/economy.test.ts) ·
  [src/game/number/balance.test.ts](../../src/game/number/balance.test.ts)
- Kayıt: [src/core/save-version.ts](../../src/core/save-version.ts) (v22)
