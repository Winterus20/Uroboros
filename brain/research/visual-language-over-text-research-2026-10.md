# Görsel Dille Anlatım — "Yazı Yığınından Oyun Diline" Geçiş Araştırması
**Tarih:** 2026-10-15  
**Problem:** UI ağırlıkla yazı/tooltip ile bilgi veriyor (v-tip: Header 14, NeuralTreeTab 11, DimensionsTab 8, DimensionRow 7...). Hedef: AD, Cookie Clicker, Synergism gibi **renk, ikon, çubuk, animasyon ve ritimle** anlatmak.

---

## 1. Kanıt: Türe özgü kurallar

### 1.1 Juice Bütçesi Kanunu (teemo.dev — Game feel & juice)
> "Spend the juice budget where the finger goes: dokunma anı anında, ortam sakin. Ortamı juicellemek idle oyunları yorucu yapar."

- Bas → görünür değişim **≤100 ms**; görsel tepki **pointerdown'da**, state commit **pointerup'ta**.
- Hareketler timestamp-driven, asla frame-counted (120 Hz'de 2x hızlanma tuzağı).
- Tıklama yığını 5 katman: `scale punch 1.06 (140 ms) + haptic + %18 bloom + yükselen "+N" (28 px)`.
- Büyük ödül (set-piece) 9 katman alır (günde 1 kez); dokunma 5 katman (günde 40 kez).

### 1.2 Cookie Clicker sayısal disiplini
- **Sabit 64 parçacık havuzu**, eskisi kovulur — CpS ∞ olsa bile 65. parçacık olmaz.
- **Emisyon 10 Hz cap**: `min(10, cookiesPs)` — "VFX'i üstel eğriden DECOUPLE etmek zorunludur."
- 5 oyuncu-ayarlı görsel anahtar: `particles, animate, wobbly, fancy, filters`.
- 600+ upgrade = **16 CSS keyframe**: pucker, wobble, bounce, riseUp, riseAway, riseUpLinger, flashRed, rainbowCycle, pointGlowBump, parentLinkPulse, appear, blink, loadSpin...

### 1.3 Antimatter Dimensions — reserved renk sözleşmesi
Glyph tablosu TEK yerde (`glyph-types.js`): Time `#b241e3`, Effarig `#e21717`, Dilation `#64dd17`, **Cursed `#000000`** (siyah yalnız ceza — hue'su olmayan tek şey "kötü"), Infinity `#b67f33`, Power `#22aa48`, Replication `#03a9f4`, Companion `#feaec9`.
- **Tip = hue, rarity = ayrı rampa** (`getRarityColor` 4 rampa: light/dark × normal/highContrast) — asla çakışmaz.
- Glyph'ler çizilmiş ikon değil **dizgi karakterleri**: Ω ∞ Ξ Δ Ψ Ϙ Ϟ ⸸ ♥ — sıfır art saati, sonsuz çözünürlük.
- Animasyon bütçesinin TAMAMI reset geçişlerine: `a-implode`, `a-eternify`, `a-dilate`, `a-realize`.

### 1.4 Progression renk disiplini (teemo.dev)
- **Rezerve renkler:** altın = SADECE progression/prestige/milestone; kırmızı = tehlike (XP'de asla); gri = kilitli; cyan = bonus. **Boş hue bırak geleceğe.**
- **Renk körü ikinci kanal** ilk günden: pip sayısı, çerçeve kalınlığı, köşe glifi; bitişik tier arası **≥15 L\* luminans adımı**.
- **Meşgul kare okunabilirliği:** suppression window (400 ms sayı/ışın üretme, kuyruğa al — kare sessizleşir), background knock-down (120 ms'de %40 desatürasyon), flash güvenliği (tek impuls + decay, tekrarlayan pulse yok — WCAG 2.3.1).
- **Bir semantik = bir görsel:** beyaz tick = kazanç, cyan+kıvılcım = bonus, gri düşen = clamp, altın radial = seviye, altın+ring = milestone.
- Çubuk = "asset maliyeti tier sayısından bağımsız OLAN TEK form."
- **Tabular figures zorunlu** — sayaç zıplaması en yaygın önlenebilir craft hatası. Kısaltma merdiveni: <10K tam; 10K–999K 1 ondalık; ≥1M 2 ondalık.

### 1.5 Clicker UI state'leri (SEELE) & Signal Decay
- Upgrade üç durum: **affordable parlak / kısmi sarı / unaffordable gri** — "uygunluğu HER ZAMAN renk-kodlayın."
- Tıklama hedefi ≥100 px, tepki <50 ms, scale 100-150 ms; progressive disclosure.
- Signal Decay: aktif sekmede ikon+yazı, pasifte sade ikon + 2 px üst çizgi; **renk-kodlu sol kenarlıklar** ("başlık okumayı kesersin, renkten tanırsın"); bildirim kenarlığı tipine göre renkli.

---

## 2. UROBOROS mevcut durum

**Var:** style.css'te anlamlı renk sözlüğü (cyan=telemetri, purple=katman, amber=prestige, emerald=lab, rose=parazit); DimensionRow'da pack çubuğu + affordance-pulse + tilt; JuiceLayer/HeartBurst/SequentialStrike katmanları; 3 boy × 8 renk progress sistemi.

**Sorun:**
1. v-tip bağımlılığı (Header 14, NeuralTreeTab 11...) — mobilde tamamen görünmez.
2. Renkler eşit yoğunlukta — **rezerve kural yok**, her şey eşit parlıyor, hiçbir şey öne çıkmıyor.
3. İlerleme/oran çoğu yerde yazı ("0/40 D8", "+150/s") — çubuk/gradient yerine metin.
4. Buton durumları ikili (affordable/unaffordable) — kısmi/sarı durum yok.
5. Sekme/section renk-lengüajı eksik.

---

## 3. ÖNERİLER (etkiye göre sıralı)

**A. Rezerve Renk Sözleşmesi** — amber=sadece progression; cyan=telemetri/bonus; purple=katman kimliği (durum sinyali DEĞİL); rose=ceza/kriz; gri=kilitli. **Durum ≠ hue:** uygunluk rampa ile (parlak→sarı→gri), hue kimlikle verilir. D1-D8'e sabit glif (AD dizgi taktiği) → renk körü uyumu ilk günden.

**B. Metni Çubuğa Çevir** — tüm X/Y requirement'lar oransal çubuk + yanında küçük mutlak sayı; oranlara mini sparkline/egim; tabular-nums; kısaltma merdiveni.

**C. Tooltip→At-a-Glance** — Header'daki 14 v-tip çoğu inline ikon + renkli chip'e; kalanlar tap-to-reveal. Kural: her tooltip'ın görsel karşılığı olmalı; tooltip yalnız nüans ekler.

**D. Juice Standardı** — alım pointerdown'da 5 katman ≤100 ms; parçacık havuzu + emisyon cap (ekonomi ∞ büyür, görsel boğulmasın); büyük anlarda impuls+decay + suppression + desatürasyon; reduced-motion 3 durumlu kontrol.

**E. Section Renk-Lengüajı** — sekmelere sol kenarlık rengi; aktif sekmede ikon+yazı, pasifte ikon-only.

**F. Prestige Ritüeli** — iki ekran kuralı: sıfırlamada run ekranı sert kesilir, yeni katman farklı register'da kurulur; her prestij eşiğine 1 imza animasyonu.

**Öncelik:** A → B → C → E → D → F.

## Kaynaklar
teemo.dev (Game feel & juice; Art direction & visual language ×2), hayao.dev Design Codex: Incremental/Idle, SEELE Clicker Game UI, Signal Decay devlog 2026-03-22, fguillen juiciness checklist, GitHub HexaVault/AD-breaketernity.
