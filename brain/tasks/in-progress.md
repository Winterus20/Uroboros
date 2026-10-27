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

## 📋 AKTİF — 1. Basamak Kilitli Tasarım Planı ve Simülasyonu (2026-10-27)

**Durum:** 🟢 **KİLİTLENDİ VE SİMÜLASYONLA DOĞRULANDI.** Proje sahibiyle yapılan `/grill-me` oturumunda D1–D8 kararlarının tamamı kilitlendi; 4 Tam Sıfırlamalı öğrenme fazı ve alt-kritik kararlı basamaklarla güncellenen `brain/scratchpad/chain-only-probe/rung1-full-sim.ts` deterministik simülasyonu ile `1,79e308` kapısına **120,63 dakikada (2,01 saat)** kararlı, kesintisiz ve organik biçimde ulaşıldığı kanıtlandı.
Kilitli Plan: [`rung-1-plan-2026-10-27.md`](../research/rung-1-plan-2026-10-27.md).

### Kilitlenen Kararlar Özeti

1. **Öğrenme Fazı (4 Tam Sıfırlama):** Challenge'lar hemen açılmaz; oyuncu önce 4 Tam Sıfırlama boyunca saf zincir + Blok Çarpanı büyümesini sindirerek öğrenir (~34,4 dk).
2. **Kademeli Challenge Açılışı:**
   - 1., 2., 3. Sıfırlama: Sadece Blok Çarpanı büyür (saf zincir).
   - 4. Sıfırlama (Math 40, Sayı $10^{40}$): **C1, C2, C3** açılır.
   - 5. Sıfırlama (Math 55, Sayı $10^{115}$): **C4, C5, C6** açılır.
   - 6. Sıfırlama (Math 70, Sayı $10^{210}$): **C7, C8** açılır.
3. **Pürüzsüz Basamak Tırmanışı:** C1–C8 basamak hedefleri ($10^{55} \rightarrow 10^{75} \rightarrow 10^{100} \rightarrow 10^{135} \rightarrow 10^{165} \rightarrow 10^{195} \rightarrow 10^{240} \rightarrow 10^{275}$) dengeli adımlarla büyütülür; ani $10^{100}$ sıçramaları ve süper-kritik taşmalar engellenmiştir.
4. **Kesintisiz Akış Kuralı:** Challenge hedefi tamamlandığında ceza anında kalkar, ödül anında devreye girer ve zincir sıfırlanmadan koşu kesintisiz devam eder.
5. **Sürekli Logaritmik İlerleme Göstergesi:**
   - Normal mod: `Goal: 1.79e308 · XX% (Next: Reset #N)` — formül: `floor(100 * log10(max(1, N)) / 308.254)%`.
   - Challenge modu: `C<id> Active · XX% · Goal: <goal> · [Exit]` — formül: `floor(100 * log10(max(1, N)) / log10(Goal))%`.

### Simülasyon Ölçüm Özeti (`rung1-full-sim.ts` - 120,6 dk)

| Faz | Süre Aralığı | Olay | Sayı | Blok Çarpanı |
| :--- | :--- | :--- | :--- | :--- |
| **Öğrenme 1** | 0,0 – 11,5 dk | 1. Tam Sıfırlama (Math 10) | $1,000\times 10^{10}$ | $2,00 \rightarrow 2,10\times$ |
| **Öğrenme 2** | 11,5 – 19,4 dk | 2. Tam Sıfırlama (Math 20) | $1,000\times 10^{18}$ | $2,10 \rightarrow 2,20\times$ |
| **Öğrenme 3** | 19,4 – 26,9 dk | 3. Tam Sıfırlama (Math 30) | $1,000\times 10^{28}$ | $2,20 \rightarrow 2,30\times$ |
| **Öğrenme 4** | 26,9 – 34,4 dk | 4. Tam Sıfırlama (Math 40) | $1,000\times 10^{40}$ | $2,30 \rightarrow 2,40\times$ + C1–C3 açık |
| **C1 (Fingers)** | 34,4 – 42,9 dk | Hedef $10^{55}$ (Tam El ödülü) | $1,000\times 10^{55}$ | $2,40\times$ |
| **C2 (Notch)** | 42,9 – 51,4 dk | Hedef $10^{75}$ (Beşli Çentik ödülü) | $1,000\times 10^{75}$ | $2,40\times$ |
| **C3 (Abacus)** | 51,4 – 59,9 dk | Hedef $10^{100}$ (Carry ödülü) | $1,000\times 10^{100}$ | $2,40\times$ |
| **Reset 5** | 59,9 – 67,9 dk | 5. Tam Sıfırlama (Math 55) | $1,000\times 10^{115}$ | $2,40 \rightarrow 2,50\times$ + C4–C6 açık |
| **C4 (Pencil)** | 67,9 – 76,4 dk | Hedef $10^{135}$ (Uzun Çarpma ödülü) | $1,000\times 10^{135}$ | $2,50\times$ |
| **C5 (Calculator)** | 76,4 – 84,6 dk | Hedef $10^{165}$ (Anlık Sonuç ödülü) | $1,000\times 10^{165}$ | $2,50\times$ |
| **C6 (Computer)** | 84,6 – 92,8 dk | Hedef $10^{195}$ (Overclock ödülü) | $1,000\times 10^{195}$ | $2,50\times$ |
| **Reset 6** | 92,8 – 101,1 dk | 6. Tam Sıfırlama (Math 70) | $1,000\times 10^{210}$ | $2,50 \rightarrow 2,60\times$ + C7–C8 açık |
| **C7 (Supercomputer)** | 101,1 – 109,1 dk | Hedef $10^{240}$ (Paralel Küme ödülü) | $1,000\times 10^{240}$ | $2,60\times$ |
| **C8 (Mathematician)** | 109,1 – 117,1 dk | Hedef $10^{275}$ (Teorem ödülü) | $1,000\times 10^{275}$ | $2,60\times$ |
| **Final Kapı İtişi** | 117,1 – 120,6 dk | **1,79e308 KAPISI AÇILDI** | **1,79e308** | **Rung 2 Prestij (+1 Tanım)** |

### Sıradaki Adım

1. Kilitli tasarım spec'ini `GAME_DESIGN.md` §8'e taşımak.
2. `src/` altındaki kod dalgasını başlatmak (tuning, economy, challenge motoru, store ve UI).
3. `balance.test.ts` ve birim testleri yeni kilitli formüllere göre güncellemek.
