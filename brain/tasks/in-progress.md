# Aktif Görev (In-Progress)

## 🎯 AKTİF — Zincir-only dilim uygulandı (2026-10-25)

**Durum:** Proje sahibinin talebiyle mini boost, kapı/prestij ve Tanım yükseltmeleri **geçici
olarak oyundan kaldırıldı**. Oyun şu an yalnız zinciri büyütür: 8 halka, tek havuz, +1,
mandallı kilitler, halka → sayı doğrudan katkısı. Sıfırlama ve kapı yok.
Kayıt: [ADR-0082](../decisions/0082-chain-only-slice.md).

**Doğrulama:** npx vue-tsc --noEmit → 0 hata · npx vitest run → **95 test / 6 dosya** ·
npx vite build → başarılı. Tarayıcıda store'da boost/prestij/upgrade alanı yok; sekmeler
number · stats · settings; breathe / gate düğmeleri yok.

### Neden kaldırıldı

- Boost, D3 gereği halkaları 1 birime indiriyordu; oyuncu bunu "aldıklarım sıfırlanmıyor" diye
  okudu. Sıfırlama 0'a çekilince her döngü 8 halka yeniden kuruluyordu (107,7 dk / 1 941 alım).
- Boost tamamen silinince eski sabitlerle kapı **ulaşılamaz** kaldı (24 saatte 3,9e29).
- Sahibin kararı: döngüyü şimdilik çıkar; boost ve diğer güçlendirmeler **ayrı ve uzun bir tasarım
  turunda** planlanıp geri eklenecek.

### Zincir-only ölçüm (gerçek motor, 2 tık/sn)

| Metrik | Sonuç |
| :--- | :--- |
| Halka açılışları | 0 · 1,6 · 4,2 · 6,8 · 9,3 · 11,9 · 14,5 · **17,0 dk** |
| İlk 10 dk alım kararı | 42 |
| 60. dakika sayı | **7,9e15** |
| 120. dakika sayı | **4,3e19** |
| 120. dakika toplam alım | 1 440 |

### Kapanan işler

| # | İş | Nerede |
| :-- | :--- | :--- |
| K1–K4 | 8 halkalı zincir, tek havuz, blok alım, +1, ticker | src/game/number/, src/game/voice/ |
| K5 | Zincir-only denge kilidi (6 test) | balance.test.ts |
| R1 | Boost + prestij + Tanım yükseltmelerinin kaldırılması | ADR-0082 |

### Sıradaki adım

1. **Boost + güçlendirme döngüsünün yeniden tasarımı** — sahibin "uzun uzun düşünüp planlayacağız"
   dediği tur. Yeni döngü gelmeden kayıt şeması değişmeyecek.
2. **2. basamak tasarımı** (E5): rung ilerlemesi + RungScene (G8) bağlantısı.
3. Ses havuzu: boost/prestij satırları silindi (100 satır kaldı); yeni döngü tasarımından sonra
   yeniden genişletilecek.

### Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| 1 | Boost + güçlendirme döngüsü | ⛔ ayrı tasarım turu (ADR-0082) |
| 2 | 2–11. basamak / rung ilerlemesi | ⛔ tasarlanmadı |
| 3 | Zincir-only uzun vadeli hedef (hangi sayıda ne olacak?) | 🟡 açık |
| A4 | Mizah yoğunluğu — RungScene ve başarım kapıları | 🟡 |
| A5 | LNGN final sahnesi | 🟡 en son |
| A6 | Başarımlar + meydan okumalar | 🟡 |
| A7 | Müzik motoru | 🟡 |
| A8 | İngilizce metin hacmi | 🟡 |
| G13 | Mobil dizgi (390 px) | 🟡 |
| G14 | Ticker'ın yeri ve boyu | 🟡 |

### Kod durumu

- A+ dalgası (arşiv): e564d0a (UI), a5c09c1 (halka fiyatlandırması), e9a4528 + 2f9b10e.
- Zincir-only dalgası: ADR-0082 — boost/prestij/upgrade kaldırıldı, kayıt v22, 95 test / 6 dosya.

---

## 🔬 Ölçüm turu — zincir büyüme katmanı (2026-10-27)

**Durum:** Boost + güçlendirme döngüsü tasarım turu için **ölçüm tamamlandı**, karar sahibin.
Rapor: [`chain-growth-layer-2026-10-27.md`](../research/chain-growth-layer-2026-10-27.md).
Hiçbir oyun kodu değişmedi (`src/` dokunulmadı); yalnız belge kaymaları düzeltildi.

### Yanıtlanan sorular

| Soru | Cevap |
| :--- | :--- |
| Zincir tek başına kapıya ulaşır mı? | **Hayır.** 96 saatte 2,76e34; kalan ~274 basamak ~200 gün eder |
| Kaldırılan boost neden patlıyordu? | Ödül zirveye bağlıydı → log uzayında çift üstel → 43 boost un 28 i son 5 dakikada |
| Sabit ödüllü boost (AD modeli) olur mu? | Kararlı ama 300-1 000 boost gerekiyor; oyuncuya aynı düğmeyi 1 000 kez bastırmak |
| Aynı anda 2 saat + 8 halka + 1,79e308 mümkün mü? | **Hayır** — aritmetik kısıt (rapor §4). En az biri değişmeli |

### Öneri (rapor §6)

1. Önce aritmetik kısıtı sahiplen.
2. Boost u **eski haliyle** geri getirme.
3. Önce **M6 / seçenek C** (sıfırlamasız milestone + yavaş boost) dene; tutmazsa **seçenek A**
   (kapıyı halka kilometre taşına çevir).

### Sıradaki adım

🟡 **Sahip kararı bekleniyor:** seçenek A / B / C / D. C onaylanırsa iki katmanlı eğri
birlikte ölçülecek (bu raporun kapsamı dışında kaldı).
---

## 📋 AKTİF — 1. basamak tasarım planı (2026-10-27)

**Durum:** 🟡 **TASLAK hazır, karar bekleniyor.** Kapı (`1,79e308`) hedefi sahibin
kararıyla **bırakıldı**; odak yalnız **zincir + güçlendirme** katmanı.
Plan: [`rung-1-plan-2026-10-27.md`](../research/rung-1-plan-2026-10-27.md).

### Planın cevapladığı soru

> "1. basamak iki saat boyunca ne yaptırır?"

### İçindekiler

| Bölüm | İçerik |
| :--- | :--- |
| §1 | Bugünkü durum + **beş teşhis** (T1–T5) |
| §3–4 | Neler olacak / **neler olmayacak** |
| §5 | Mekanikler: halka rolleri (R1–R3) · alım · ritim · kilometre taşları |
| §6 | Güçlendirmeler: 8 kalıcı yükseltme · halka seviyeleri · `+1` ikinci iş · boost dersi |
| §7 | 1. basamak bitişi (B1–B3) |
| §9 | Ölçüm planı (kod yazmadan önce) |
| §10 | **Açık kararlar D1–D8** |

### Bekleyen kararlar (sahip)

| # | Karar | Seçenekler |
| :- | :--- | :--- |
| D1 | Halka rolü | R1 çarpan · R2 dönüşümlü · R3 dokunma |
| D2 | 1. basamak bitişi | B1 · B2 · B3 |
| D3 | Ritim hedefi | ~105 dk · 120 dk |

### Sıradaki adım

1. Sahip **D1 + D2** yi seçer.
2. Ajan o karara göre **1–4 ölçümünü** yapar (kod yazmadan).
3. Sayılar plana işlenir → kilitli spec `GAME_DESIGN.md` §8 e taşınır.
4. Kod dalgası + `balance.test.ts` yeniden yazımı.
