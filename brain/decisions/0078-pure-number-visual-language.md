# ADR-0078: Görsel Dil — "Saf Sayı" (Pure Number)

## Durum

**Kabul edildi (2026-10-23)** — 12 karar kilitli (`G1`–`G12`). Bu ADR **yalnız sözleşme** üretir;
hiçbir `.ts` / `.vue` dosyası değişmedi, `npm run build` gerekmedi.

- **Bağlayıcı sözleşme:** [`../context/visual-language.md`](../context/visual-language.md) — bu ADR ile **baştan yazıldı**.
- **Oturum kaydı (soru-cevap):** [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) §12.
- **Ölçüm artefaktları:** `brain/research/mockups/2026-10-23/` (tipografi karşılaştırması, renk yayları, iki tam ekran mockup).

### Geçersiz kıldığı kararlar

| ADR / belge | Ne ölüyor | Yerine ne geldi |
| :--- | :--- | :--- |
| **ADR-0060** (§4 K0–K5 merdiveni) | Faz-temelli GIC bozulma merdiveni, substrat, motif bandı | **Hiçbiri** — `G7`: merdiven tamamen ölür |
| **ADR-0066** | `m6x11plus` display + Caveat el yazısı + 18px ızgara kuralı | `G4`: Space Grotesk hero + UI, Space Mono veri |
| **ADR-0049** (Balatro dilinin yüzey kimliği) | Kart, blur, yuvarlak köşe, reels/sıralı vuruş dili | `G3`: kemik kalır, süs gider |
| **ADR-0067** | — | ✏️ **genişledi**: Space Grotesk artık yalnız UI değil, **hero sayının da fontu** |
| `visual-language.md` §2–§7 | `--feast` / `--bicycle` paleti, L2/L3 katmanları, motif slot'ları, tipografi tablosu | Bu ADR + yeni sözleşme |

### Koruduğu kararlar

| ADR / bölüm | Neden hâlâ geçerli |
| :--- | :--- |
| **ADR-0069** (CRT katmanı yok) | `G1`'de `C` (retro terminal) tam bu yüzden reddedildi |
| **ADR-0058** (3-state ramp · rezerve renk · oran=çubuk · motion kapısı) | Janradan bağımsız; okunabilirlik kanonu |
| **ADR-0044** (screen-shake izolasyonu) | Yapısal, görsel dille ilgisiz |
| `visual-language.md` §9 (yazı değil görsel anlatım, juice bütçesi) | `G12` ile **daraltılarak** korunur: canvas juice ölür, CSS + ses kalır |

---

## Bağlam

Tema pivotu (ADR-0077) "Kozmik Oburluk"u sildi. Ama mevcut görsel sözleşmenin **tamamı** o temanın
üstüne kuruluydu: `--feast` oburluk kırmızısı (10 dosyada **40 referans**), GIC kolaj substratı,
faz-temelli bozulma (7 dosyada **22 referans**), Balatro piksel fontu, 32 `.vue` bileşeni.

Yani `A1` bir "yeni palet seçelim" işi değildi: **sahibi ölmüş bir sözleşmenin mirasçısını seçmekti.**
`A1` kapalıyken UI yazılamazdı — bu ADR o kapıyı kapatır.

---

## Karar

### G1 — Yön: saf sayı (`B`)

Karanlık tuval, chrome yok, ekranın tek büyük nesnesi sayı; basamak başına vurgu rengi.
Mekanik kararlarla aynı yönü gösterir: `S1` (çıplak sayı), `E1` (cüzdan = sayı), `S9` (nesne yok),
`V2` (dünyada hiçbir şey yok).

**Reddedilen:** (A) bürokratik kâğıt — kâğıt/form/damga = **kurum**, `V1`'de kurum reddedilmişti.
(C) retro terminal — ADR-0069'u geri alır, bir *dönem* vaat eder, ve "bunu bilgisayar yapıyor" şakası
zincirde zaten var (Abaküs → … → Süperbilgisayar): meta katman mekaniğin söylediğini tekrar ederdi.

### G2 — Swirl kalır

`AlgorithmicSwirl` (WebGL GLSL boya girdabı) oyunun **tek ortamı** ve basamak rengini taşıyan yüzey.
Kullanıcı kararı: *"arkada swirl var ya o kalsın, onu seviyorum."*

### G3 — Kemik kalır, süs gider

İskelet korunur: ticker · sayı · zincir · telemetri satırı · ince dock.
Ölen dekor: kart (`bg-[var(--ds-panel)]`), `backdrop-blur`, `rounded-xl`, gölge, ikon-only sekme.
Kalan dil: **1px hairline + tipografi + boşluk**. Hiyerarşi kutuyla değil, punto ve kontrastla kurulur.
Gerekçe: kart bir *dünyadır* — sayıyı kutunun içine koyar. Kutu kalkınca sayı ekranın kendisi olur.

### G4 — Tipografi: Space Grotesk + Space Mono

| Rol | Font | Ağırlık | Kullanım |
| :--- | :--- | :--- | :--- |
| Hero sayı | **Space Grotesk** | 300 | ekranın ortasındaki sayı, basamak adı |
| UI / gövde | **Space Grotesk** | 400–500 | etiketler, başlıklar, ticker |
| Veri | **Space Mono** | 400 | zincir satırları, oranlar, rozetler (`tabular-nums`) |

**Ölçüm (2026-10-23, `mockups/2026-10-23/typecast.png`):** dokuz adayın (Space Grotesk, Space Mono,
IBM Plex Sans/Mono, JetBrains Mono, Inter, DM Mono, Archivo, m6x11plus) **hepsi tabular** ve hepsinde
`↑ ³ ^ ( ) e G` glifleri var. Yani teknik eleme yoktu; karar estetikti.

**Gerekçe:** Space Grotesk, Space Mono'dan türetilmiş bir ailedir (Florian Karsten / Colophon) —
hero ile veri "iki font" değil, **tek ailenin iki ucu**. İkisi de kurulu, OFL, sıfır yeni bağımlılık.
Eleme: IBM Plex = kurumsal kimlik (`V1`), JetBrains/Space Mono hero'da her glifi eşitler (sayı "kod"
gibi okunur), Inter/Archivo hiçbir şey söylemez, **m6x11plus = C'nin kuzeni** (piksel = retro oyun).

**Ölen:** `m6x11plus` + `@font-face` + "font-size 18'in katı" kuralı · Caveat (el yazısı) ·
Balatro tipografik kimliği. `public/fonts/ATTRIBUTION.md` **silinmez** (lisans kaydı).

### G5 — Renk: 11 basamak, amber ve rose yayları boş

Tek **formül**, 11 elle seçilmiş renk değil:

```
H(i)  = 130 + (330 − 130) · i/10              i = 0..10
L(H)  = 0.84 − 0.22 · e^(−(H − 265)² / 48²)   // mavi bandında dibe inen parlaklık zarfı
C(H)  = sRGB'de mümkün olan en yüksek kroma
```

| # | Basamak | Hex | L |
| --: | :--- | :--- | --: |
| 1 | `1.79e308` | `#98e500` | 0.84 |
| 2 | `1e(9e15)` | `#00f272` | 0.84 |
| 3 | `10^^1.79e308` | `#00ebb9` | 0.84 |
| 4 | `6 ok` | `#00e1d9` | 0.82 |
| 5 | `G` | `#00cee7` | 0.78 |
| 6 | `TREE(3)` | `#00b1e9` | 0.71 |
| 7 | `SSCG(3)` | `#008ff5` | 0.64 |
| 8 | `Rayo` | `#5a78ff` | 0.62 |
| 9 | `Fish 7` | `#977cff` | 0.67 |
| 10 | `BIG FOOT` | `#cf8aff` | 0.75 |
| 11 | `LNGN` | `#ff90f6` | 0.80 |

**Ölçüm (hesaplanmış, 2026-10-23):** `#060608` üzerinde kontrast aralığı **5,4:1 – 13,4:1**
(en düşük: 8. basamak `#5a78ff`);
komşu basamak arası minimum hue farkı **25,1°**; amber `#f59e0b` (hue 70,1°) ve rose `#f43f5e`
(hue 16,4°) yayların **dışında**. Kroma %85'e çekilmiş "sakin" varyant (`ix`) tek katsayıyla elde edilir.

**Neden tek eksen değil, 11 kimlik:** `A1`'in ilk önerisi (tek sürekli yay) 11 basamağı 3-4 kümeye
sıkıştırıyordu; oyuncu rengi görünce basamağı bilemez. 11 ayrı hue bunu çözer — bedeli, rezerve
renklerle aynı çemberde yaşamak zorunda olması; o bedel `G5` + `G6` ile ödenir.

### G6 — Cyan emekli

Bonus/telemetri artık **beyaz + kıvılcım**. Renk çemberi basamakların tekelinde.
Gerekçe: `B` "ekranda daha az şey" demekti; cyan'ın taşıdığı anlam (`S7`'de bir sistem değil,
bir süsleme) nötr kanalla taşınabilir. Alternatif (katman ayrımı) her basamakta "bu ton şu anlama
gelmiyor" istisnası biriktirecekti.

### G7 — `K0–K5` bozulma merdiveni ölür

`corruption.ts`, `MotifBand`, `ScreenOverlay`, `data-corruption` mührü, `--substrate-opacity`,
`--motif-band-opacity`, `--glitch-intensity` — hepsi silinir.
85 saatte ekranda **biriken hiçbir şey yok**; görsel yay yalnız renkte ve anlarda yaşar.

**Reddedilen:** (B) "seyrelme" — basamak arttıkça arayüzün çekilmesi; (C) geçmiş basamakların soluk
notasyonlarının arka planda birikmesi (`P4`'te reddedilen arşivi görsel olarak geri getirirdi).

### G8 — Basamak geçişi = 2,5 saniyelik sahne

Ekran söner → basamak adı tek başına yazılır → sayı `10` olarak yeni renginde doğar.
11 kez × 2,5 sn = **27 saniye / 85 saat**. `S3` mandalıyla uyumlu: sahne bir kez oynar.
`A5` (LNGN finali) aynı motoru kullanacak — iki kez ödenmez.

### G9 — Yapısal dizgi (notasyon ekrana nasıl sığıyor)

Punto **dizeye göre küçülmez**; sayının *yapısı* iki ölçeğe ayrılır:

| Basamak | Dizgi |
| :--- | :--- |
| 1–2 | taban büyük (`1.79`), üs küçük (`e308`) |
| 3 | taban büyük (`10`), kule küçük (`^^1.79e308`) |
| 4 | taban büyük, ok sayısı üstsimge (`↑6`), büyüklük küçük |
| 5–11 | isim tek başına **tam punto** (`G`, `TREE(3)`, `BIG FOOT`) |

Gerekçe: auto-fit, sayıyı **en büyük olduğu basamakta** küçültürdü — `S5`'in "oyuncu bunu hissetmeli"
iddiasını doğrudan vururdu. `T2` kadranı da aynı ayrımı kullanır (`rank` küçük, `mag` büyük).

### G10 — `+1` hiç değişmez

Hep aynı yerde, aynı boyutta, aynı etiketle (`+1`). 84. saatteki basış 1. saattekiyle **birebir aynı**
hisseder (aynı ölçek vuruşu, aynı ses) — ama sayı kıpırdamaz.
Etiket asla `+8.41e6` gibi bir sayıya dönüşmez: `+1` yazar, `+1` yapar.

**Reddedilen:** (B) butonun sönmesi — oyun şakayı *açıklar*; (C) etkinin butona taşınması — `S9`'un
"ekranda hiçbir şey değişmez" kuralını iptal eder.

### G11 — Mini boost = tek nefes (400 ms)

Sayı içeri çöker (küçülür + solar), swirl bir nefes alır, çarpan rozeti yerine oturur, tek kısa ses.
Sahne yok, yazı yok. ~250 kez × 400 ms ≈ 100 saniye toplam.

**Sınır:** boost hareketi `G8`'in sahne diliyle **karışmaz** — sahne = renk + isim, boost = yalnız
hareket + ses. Karışırsa 5 dakikada bir kutlama yapıyor gibi oluruz.

### G12 — Katman envanteri: yalnız swirl

| Katman | Kader |
| :--- | :--- |
| `AlgorithmicSwirl` | ✅ kalır (tek ortam) |
| `CommentTicker` | ✅ kalır — **katman değil, düz metin** (`V4`'ün ses kanalı, `T3`'ün 400 satırı) |
| `AchievementToast` | ✅ kalır — düz metin bildirim |
| `JuiceLayer` (canvas) | ❌ ölür; basış hissi CSS transform + ses |
| `MotifBand` · `ScreenOverlay` · `SideSnapHands` · `HeartBurstLayer` · `SequentialStrikeLayer` · `TimeClockOverlay` | ❌ ölür (Balatro/GIC mirası) |
| `AnomalyOverlay` | 🅿️ parkta — gece krizi **mekaniğine** bağlı; görsel karar değil |

---

## Sonuçlar

**Olumlu:** Sıfır yeni bağımlılık (iki font da kurulu, palet bir formül). 32 bileşenin ~8'i ölüyor →
kod tabanı küçülüyor. `A1` kapandığı için UI yazımı başlayabilir.

**Olumsuz / bedel:**
1. **`R1` korumasız.** Bozulma merdiveni ve canvas juice öldüğü için 85 saatte ekranda biriken
   hiçbir şey yok. Yoğunluk tamamen ticker metnine ve iki ana (`G8`, `G11`) bağlı.
2. **11 renk, 11 kontrast/ΔE testi** demek — palet bir kez hesaplandı ama her yeni yüzeyde doğrulanmalı.
3. **Ekran çok yalın.** İlk 10 dakikada "boş" görünme riski var; bunu taşıyacak şey sayının kendisi
   ve tipografi — süs değil.

## Açık maddeler (bu ADR kapatmaz)

| # | Konu | Neden açık |
| :-- | :--- | :--- |
| `G13` | **Mobil dizgi** | 390px'te `10^^1.79e308` iki satıra mı iner, üs alt satıra mı? Kural yazılmadı |
| `G14` | **Ticker'ın yeri ve boyu** | Ekranın neresinde, kaç punto, ne kadar kalır |
| `A5` | `LNGN` final sahnesi | `G8` motorunu kullanacak; metin kararı `V6`'ya bağlı |
| `A4` | Mizah yoğunluğu ayarı | Ses kararı; görsel dil değil |
