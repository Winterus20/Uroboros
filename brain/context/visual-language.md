# GÖRSEL DİL SÖZLEŞMESİ — "SAF SAYI" (Pure Number)

> **BAĞLAYICI BELGE — HER AGENT GÖRSEL/STİL İŞİNE BAŞLAMADAN ÖNCE OKUR.**
> Kaynak: 2026-10-23 grilling oturumu (12 karar, `G1`–`G12`). ADR: [`../decisions/0078-pure-number-visual-language.md`](../decisions/0078-pure-number-visual-language.md).
> Oturum kaydı: [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) §12.
> Ölçüm artefaktları: `brain/research/mockups/2026-10-23/`.

**Bu belge 2026-10-23'te BAŞTAN YAZILDI.** Önceki sürüm ("Aç Kumarhane" / The Hungry Parlor)
oburluk temasının üstüne kuruluydu ve tema pivotuyla (ADR-0077) sahibini kaybetti.
ADR-0060 (GIC faz bozulması) ve ADR-0066 (`m6x11plus` + Caveat) **iptal**; ADR-0058
(3-state ramp · rezerve renk · oran=çubuk · motion kapısı), ADR-0069 (CRT yok) ve
ADR-0044 (shake izolasyonu) **geçerli**.

---

## 1. Tez

Oyunun tek kahramanı **sayıdır**. Ekranda ondan büyük hiçbir şey yoktur; onu bir kutunun
içine koyan hiçbir şey yoktur. Ekran bir *oda* değil, bir **gösterge panelidir**: üzerinde
tek bir ölçümün okunduğu alet.

Üç kural, üçü de mekanik kararlardan türetilmiştir:

| Kural | Kaynağı |
| :--- | :--- |
| Sayı ekranın en büyük nesnesidir; hiçbir basamakta küçülmez | `S1` çıplak sayı · `S5` "oyuncu bunu hissetmeli" |
| Sayının dışında hiçbir nesne yoktur (defter, kalem, masa, kart) | `S9` nesne yok · `E1` cüzdan = sayı |
| Dünyada hiçbir şey yoktur; her şey **ilişkidedir** (oyun ↔ sen) | `V2` sessiz meta |

Kimlik üç yerden gelir ve **sadece** üç yerden: **(1)** notasyonun kendi tipografisi,
**(2)** basamak rengi, **(3)** ticker'ın sesi. Süs dördüncü bir kanal açmaz.

---

## 2. Palet

### 2.1 Zemin ve yüzey

| Token | Değer | Rol |
| :--- | :--- | :--- |
| `--pn-bg` | `#060608` | Tuval. Tek zemin kaynağı. |
| `--pn-hairline` | `rgba(255,255,255,0.07)` | Panel/ayırıcı çizgisi (1px, gölge yok) |
| `--pn-hairline-strong` | `rgba(255,255,255,0.14)` | Vurgulu ayırıcı, aktif sekme alt çizgisi |
| `--pn-text` | `#f6f3ec` | Birincil metin (sıcak beyaz) |
| `--pn-text-dim` | `#8d8a80` | İkincil metin, etiket |
| `--pn-text-faint` | `#4e4e58` | Üçüncül metin, mikro etiket |
| `--pn-locked` | `#33333a` | Kilitli satır metni |

**Yasak:** kart yüzeyi (`bg-[var(--ds-panel)]`), `backdrop-blur`, `rounded-xl`, gölge, gradyan
dolgu, neon glow (yalnız sayının kendisinde hafif ışıma serbest). Zemin tek renktir;
tek istisna `AlgorithmicSwirl`'dür — o da §2.4'teki parlaklık tavanının altında kalır.

### 2.2 Basamak yayı — 11 renk, tek formül

```
H(i) = 130 + (330 − 130) · i/10                i = 0..10   (derece)
L(H) = 0.84 − 0.22 · e^(−(H − 265)² / 48²)     parlaklık zarfı (mavi bandında dip)
C(H) = sRGB gamutunda mümkün olan en yüksek kroma
```

| # | Basamak | Hex | Kontrast (`--pn-bg`) |
| --: | :--- | :--- | --: |
| 1 | `1.79e308` | `#98e500` | 13,1:1 |
| 2 | `1e(9e15)` | `#00f272` | 13,4:1 |
| 3 | `10^^1.79e308` | `#00ebb9` | 13,1:1 |
| 4 | `6 ok` | `#00e1d9` | 12,3:1 |
| 5 | `G` | `#00cee7` | 10,6:1 |
| 6 | `TREE(3)` | `#00b1e9` | 8,2:1 |
| 7 | `SSCG(3)` | `#008ff5` | 6,0:1 |
| 8 | `Rayo` | `#5a78ff` | **5,4:1** |
| 9 | `Fish 7` | `#977cff` | 6,4:1 |
| 10 | `BIG FOOT` | `#cf8aff` | 8,4:1 |
| 11 | `LNGN` | `#ff90f6` | 10,2:1 |

Ölçülen aralık **5,4:1 – 13,4:1** (2026-10-23, hesaplanmış). En düşük 8. basamak `#5a78ff`;
hero sayı büyük punto olduğu için AA eşiği 3:1'dir ve rahat geçer — ama bu ton **küçük puntoda metin
olarak kullanılmaz**. Komşu basamak arası minimum hue farkı **25,1°**. Kroma %85'e çekilmiş "sakin" varyant tek katsayıyla elde edilir;
yerinde çok neon gelirse o katsayı çevrilir — **11 hex elle düzenlenmez.**

**Basamak rengi nerede yaşar:** (1) hero sayının kendisi, (2) `AlgorithmicSwirl`'ün renk uniformları.
**Başka hiçbir yerde.** Buton, rozet, çubuk, uyarı, sekme basamak rengini almaz.

### 2.3 Rezerve renkler

| Renk | Hex | Anlam | Sınır |
| :--- | :--- | :--- | :--- |
| **Amber** | `#f59e0b` | Prestij / milestone | Basamak yayının **dışında** (hue 70,1°) |
| **Rose** | `#f43f5e` | Tehlike / kriz | Basamak yayının **dışında** (hue 16,4°) |
| **Gri** | `#33333a` | Kilitli | — |
| ~~Cyan~~ | ~~`#06b6d2`~~ | ~~Bonus / telemetri~~ | ❌ **emekli** (`G6`): bonus artık beyaz + kıvılcım |

**Durum ≠ hue kuralı korunur:** uygunluk `ds-ramp-ready / partial / locked` üçlüsüyle (parlaklık),
kilitlilik griyle verilir. Hue kimlik taşır, durum taşımaz.

### 2.4 Swirl parlaklık tavanı (ADR-0084)

Swirl bir **ortam**dır, ikinci bir kahraman değil: sayının ve metnin arkasında fısıldar.
Kural ölçülebilir olsun diye renk shader'da son hâliyle üretilir: `--pn-bg + tint × gölge`
(gölge ∈ [0,1]). Opaklık, `mix-blend` ve beyaz ışık eklemesi **yoktur**.

| Kural | Değer | Gerekçe |
| :--- | :--- | :--- |
| En parlak swirl pikselinin göreli parlaklığı | **L ≤ 0,03** (tüm ekran, tek kural) | `--pn-text-dim` ≥ **3,8:1** · `--pn-text` ≥ 11,8:1 — yalnız girdap tepelerinde; çoğu piksel çok daha koyu |
| Tint | basamak rengi, doygunluk **%80**'e çekilmiş | basamak kimliği okunur, neon kalmaz |
| Menü zemini | `.panel` (liste · mücadele · istatistik sütunu, ≤ 720 px) düz `--pn-bg` + 1px `--pn-hairline` kenar | menü metni hiçbir zaman swirl üstüne düşmez; kart değil — ayrı yüzey rengi, gölge, köşe yok |
| Tint ölçeği | JS'te WCAG parlaklığına göre ikiye bölmeyle çözülür | tavan 11 basamağın hepsinde aynı kodla tutar |
| Basamak geçişi | iki tavanlı tint arasında lineer karışım | sRGB→lineer konveks: karışım tavanı aşamaz |
| Çözünürlük | CSS pikselinin 0,5× (dengeli) / 0,75× (yüksek), viewport ile **aynı en-boy oranı**, bilinear büyütme | piksel kuantizasyonu + `image-rendering: pixelated` Balatro mirasıydı (piksel font `G4`, retro/CRT ADR-0069 ile ölü) |
| Kapalı / azaltılmış hareket / WebGL yok | düz `--pn-bg` | gradyan dolgu yok (§2.1) |

Ölçüm (2026-10-31, GPU `readPixels`, 1600×900 ve 390×844, 1. basamak): en parlak piksel
`rgb(30,36,20)`, L = 0,0159. Önceki sürüm: `rgb(89,107,55)`, L = 0,130 → `--pn-text-dim` **1,7:1**,
hero 3,8:1; ekranın ~%10'unda `dim` metin AA altındaydı.

**Sınırlar:** `--pn-text-faint` (2,5:1) ve `--pn-locked` (1,6:1) düz zeminde bile AA altıdır —
ikisi bilinçli *pasif* tondur; bilgi taşıyan metin (kilit gerekçesi, satır verisi) `dim` ya da
üstündedir. Swirl'ün en parlak pikseli üzerinde bu iki ton 1,9:1 / 1,3:1'e iner. Bilgi taşıyan
bir metin bu tonlara düşürülecekse önce bu belge değişir. Tavanın üstüne çıkan her efekt
(ör. "nefes" için `filter: brightness()`) bu tabloyu bozar ve ADR ister.

---

## 3. Tipografi

| Rol | Font | Ağırlık | Kullanım |
| :--- | :--- | :--- | :--- |
| `--font-hero` | **Space Grotesk** | 300 | hero sayı, basamak adı |
| `--font-ui` | **Space Grotesk** | 400 / 500 | ticker, etiket, başlık, buton |
| `--font-data` | **Space Mono** | 400 | zincir satırı, oran, maliyet, rozet |

**Kırılmaz kurallar:**

1. **`tabular-nums` zorunlu** — sayı saniyede 20 kez yenilenir; rakam genişliği titreyemez.
   (Ölçüldü: iki aile de tabular; `font-variant-numeric: tabular-nums` yine de açıkça yazılır.)
2. **Hero asla `font-bold` almaz.** 300 sabittir; ağırlıkla vurgu yapılmaz, punto ve renkle yapılır.
3. **Veri asla Grotesk'e, prose asla Mono'ya geçmez.** Zincir sayıları Mono; ticker cümlesi Grotesk.
4. **Ölen fontlar:** `m6x11plus` (piksel) · Caveat (el yazısı) · "font-size 18'in katı" ızgarası.
   `public/fonts/ATTRIBUTION.md` **silinmez** (lisans kaydı; font kullanılmasa da dosya durur).
5. Yeni font eklemek ADR gerektirir; bu üç rol dışında aile yoktur.

---

## 4. Dizgi — sayı ekrana nasıl sığar

**Auto-fit yasak.** Punto dizeye göre küçülmez; sayının *yapısı* iki ölçeğe ayrılır.

| Basamak | Dizgi kuralı | Örnek |
| :--- | :--- | :--- |
| 1–2 | taban büyük (hero puntosu), üs küçük (~%34) | `1.79` + `e308` |
| 3 | taban büyük, kule küçük | `10` + `^^1.79e308` |
| 4 | taban büyük, ok sayısı üstsimge, büyüklük küçük | `10` + `↑6` + `4.27` |
| 5–11 | isim tek başına **tam punto** | `G` · `TREE(3)` · `BIG FOOT` · `LNGN` |

**Sayı merdiveni (`ADR-0080`):** 1000 altı düz **tam sayı** (`12`, `649`); yalnız 1'in
altındaki oranlar ondalık taşır (`0.11/sn`). 1e3–1e12 kısaltma (`1.23` + küçük `K` · `4.5` + `M` ·
`2` + `B` · `7` + `T`); 1e15 ve üstü e-notasyonu (`1.23` + `e15`). Kısaltma tükenince otomatik
e'ye düşer; ekranda asla `1000 K` görünmez (yuvarlama taşarsa kısaltma büyür: 999 999 → `1 M`,
999.6 → `1 K`).

**Ölçek:** hero tabanı masaüstünde 96–120px aralığında; basamak başına sabit (elle tablo),
dizeye göre otomatik değil. Küçük ölçek (üs, üstsimge) tabanın ~%32-36'sı.

**Gerekçe:** auto-fit sayıyı en büyük olduğu basamakta küçültürdü; `T2` kadranı da aynı
ayrımı kullanır (`rank` küçük, `mag` büyük) — motorun ayrımı ekranda da aynıdır.

> ⚠️ **`G13` açık:** mobil (390px) davranışı yazılmadı. Kural gelene kadar mobilde
> uzun notasyon **iki satıra** iner (taban üstte, notasyon altta), punto küçültülmez.

---

## 5. Ekran anatomisi

Yukarıdan aşağı, tek sütun, maks. ~1000px genişlik:

```
┌ ticker ─────────────────────────────── düz metin, hairline altında
│ hero: basamak etiketi (mikro) · SAYI · telemetri satırı
│ +1  (değişmez)
│ zincir: 8 satır — hairline ayırıcı, kutu yok
│ dock: metin sekmeler, aktif olan alt çizgiyle
└ mikro footer
```

**Var:** ticker · hero sayı · `+1` · zincir listesi · tek telemetri satırı · metin dock.
**Yok:** kart, panel arkaplanı, blur, yuvarlak köşe, ikon-only sekme, süsleme çubuğu,
motif bandı, kolaj katmanı, CRT, tarama çizgisi, partikül canvas'ı.

**Hiyerarşi araçları:** punto · kontrast (`--pn-text` → `dim` → `faint` → `locked`) · boşluk.
Başka araç yok.

---

## 6. Anlar (motion)

| An | Sıklık | Süre | Ne olur |
| :--- | --: | --: | :--- |
| **Basış (`+1`)** | sürekli | ≤100 ms | CSS ölçek vuruşu + ses. **Asla değişmez** — 84. saatte de aynı. |
| **Mini boost** | ~250 kez | 400 ms | Sayı içeri çöker, swirl bir nefes alır, çarpan rozeti oturur. Sahne yok, yazı yok. |
| **Basamak geçişi** | 11 kez | 2.500 ms | Ekran söner → basamak adı tek başına → sayı `10` olarak yeni renkte doğar. |

**Kırılmaz ayrım:** boost = yalnız hareket + ses; basamak = renk + isim. İki dil karışmaz —
karışırsa 5 dakikada bir kutlama yapılıyormuş gibi olur.

**Hareket kapısı (ADR-0058):** `reduced`/`off` modunda ve OS azaltılmış harekette tüm
tekrarlayan animasyonlar `animation: none`; boost ve sahne anlık geçişe düşer (içerik kaybı yok).

---

## 7. Katman envanteri

| Katman | Kader | Not |
| :--- | :--- | :--- |
| `AlgorithmicSwirl` | ✅ | Oyunun **tek ortamı**; basamak rengini taşır |
| `CommentTicker` | ✅ | Katman değil, düz metin — `V4`'ün ses kanalı, `T3`'ün ~400 satırı |
| `AchievementToast` | ✅ | Düz metin bildirim |
| `JuiceLayer` | ❌ | Canvas partikül; basış hissi CSS + ses'e iner |
| `MotifBand` · `ScreenOverlay` · `SideSnapHands` · `HeartBurstLayer` · `SequentialStrikeLayer` · `TimeClockOverlay` | ❌ | Balatro/GIC mirası |
| `AnomalyOverlay` | 🅿️ | Gece krizi **mekaniğine** bağlı; mekanik kararı bekliyor |

Silinecek tokenlar: `--feast`, `--bicycle`, `--substrate-opacity`, `--motif-band-opacity`,
`--glitch-intensity`, `data-corruption` mührü, `src/game/corruption.ts`.

---

## 8. Okunabilirlik kanonu (kırılmaz)

1. **Sayı asla bozulmaz.** Hiçbir efekt, maske, filtre veya renk oyunu sayının okunmasını
   engelleyemez. Sayı katmanı her zaman en üsttedir.
2. **Sayısal etiket ve tooltip asla şaka yapmaz** (`V4`). Mekanik bilgiye güven zorunludur.
3. **Kontrast:** hero sayı ≥ 10:1, gövde metni ≥ 4,5:1 (`--pn-bg` üzerinde **ve** en parlak
   swirl pikseli üzerinde — §2.4 tavanı bunu garanti eder).
4. **Renk körlüğü ikinci kanalı:** basamak rengi tek başına anlam taşımaz — basamak adı
   ve notasyon her zaman yazıyla da vardır (renk kimlik verir, bilgi vermez).
5. **Tek semantik = tek görsel.** Kilitli = gri + soluk; prestij = amber + halka;
   tehlike = rose; bonus = beyaz + kıvılcım. Aynı anlam iki farklı görselle anlatılmaz.

---

## 9. Bu belge ne zaman değişir?

Yeni bir görsel karar alındığında ya da bir katman değiştiğinde **önce bu dosya**, sonra kendi
ADR'si güncellenir. Görsel işler buradan sapan değişiklik yapmaz; sapma gerekiyorsa önce bu belge
değişir. Kararlar `G#` kimlikleriyle ADR-0078'de tutulur; kimlikler yeniden numaralanmaz.

### Tarihçe

| Tarih | Olay |
| :--- | :--- |
| 2026-10-16 | "Aç Kumarhane" sözleşmesi yazıldı (Balatro + GIC + VS sentezi, ADR-0060) |
| 2026-10-18 | Tooltip katmanı kaldırıldı · CRT resmen iptal (ADR-0069) |
| 2026-10-23 | Tema pivotu (ADR-0077): oburluk teması silindi; görsel dil ertelendi (`A1`) |
| **2026-10-23** | **Bu belge baştan yazıldı: "Saf Sayı" (ADR-0078, `G1`–`G12`).** ADR-0060 ve ADR-0066 iptal |
| 2026-10-31 | §2.4 swirl parlaklık tavanı (L ≤ 0,016); piksel kuantizasyonu ve fallback gradyanı kaldırıldı (ADR-0084) |
| 2026-10-31 | ADR-0084 eki (sahip): tavan 0,016 → 0,03, doygunluk %55 → %80 (swirl görünmez olmuştu); menü sütununa düz `--pn-bg` zemin |
