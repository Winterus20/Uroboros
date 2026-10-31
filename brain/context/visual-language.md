# GÖRSEL DİL SÖZLEŞMESİ — "LABORATUVAR"

> **BAĞLAYICI BELGE — HER AGENT GÖRSEL/STİL İŞİNE BAŞLAMADAN ÖNCE OKUR.**
> ADR: [`../decisions/0085-laboratuvar-ui-shell.md`](../decisions/0085-laboratuvar-ui-shell.md)
> (kabuk, kayıt defterleri, vurgu). Basamak yayı, tipografi, dizgi ve sahne kararları
> [`../decisions/0078-pure-number-visual-language.md`](../decisions/0078-pure-number-visual-language.md)'den
> (`G4`, `G5`, `G6`, `G8`, `G9`, `G10`) devralınır.
> Onaylanan konsept: `brain/scratchpad/ui-concepts-2026-10-31/a-laboratuvar.html`.

**Bu belge 2026-10-31'de BAŞTAN YAZILDI.** Önceki sürüm ("Saf Sayı", ADR-0078) kartsız/köşesiz tek
sütun ve `AlgorithmicSwirl` ortamı üstüne kuruluydu. Sahip arayüzü "oyun gibi değil" buldu; dört
konsept tam ekran karşılaştırıldı ve **A — Laboratuvar** seçildi. Swirl (ADR-0084 dâhil) kaldırıldı.

---

## 1. Tez

Ekran bir **ölçüm aletidir**: sakin, koyu, ızgaralı; üzerinde tek bir büyüklük okunur. Sayı hâlâ
ekranın en büyük nesnesidir ve basamak rengini taşır; çevresindeki her şey bir laboratuvar
paneli gibi düzenlidir: çizgili tablolar, mono veri, küçük kontroller.

| Kural | Kaynağı |
| :--- | :--- |
| Sayı ekranın en büyük nesnesidir; hiçbir basamakta küçülmez | `S1` · `S5` |
| Arayüz modern ve oyun gibidir ama **çocukça değildir**: süs, parıltı, kutlama yok | sahip, 2026-10-31 |
| Yeni katman/mekanik = veri + bir sayfa; kabuk yeniden tasarlanmaz | sahip, 2026-10-31 (ADR-0085) |
| Dünyada hiçbir şey yoktur; her şey **ilişkidedir** (oyun ↔ sen) | `V2` sessiz meta |

Kimlik üç yerden gelir: **(1)** notasyonun kendi tipografisi, **(2)** basamak rengi (artık
arayüzün vurgusu), **(3)** ticker'ın sesi. Süs dördüncü bir kanal açmaz.

---

## 2. Palet

### 2.1 Yüzeyler, çizgiler, metin (`src/style.css`)

| Token | Değer | Rol |
| :--- | :--- | :--- |
| `--pn-bg` | `#08090c` | Tuval (ana alan) |
| `--pn-s1` | `#0e1015` | Kabuk: üst çubuk, menü, durum çubuğu, modal paneli, satır üstü |
| `--pn-s2` | `#14161d` | Kontrol: çip, düğme, aktif menü öğesi |
| `--pn-s3` | `#1b1e27` | Basılı/dolgu: seçili segment, çubuk izi, boş blok göstergesi |
| `--pn-line` | `#1d2029` | 1px ayırıcı (satır, kabuk kenarı) |
| `--pn-line-strong` | `#2a2e3a` | Kontrol kenarı, aktif öğe kenarı |
| `--pn-text` | `#ecebe6` | Birincil metin: 16,7:1 |
| `--pn-text-dim` | `#8e8d88` | İkincil metin, etiket: 6,0:1 |
| `--pn-text-faint` | `#5a5b63` | Pasif ton (mikro başlık, sıra no, kilitli ad): 2,95:1 |
| `--pn-locked` | = `faint` | Kilitli (ayrı ad, aynı değer) |

Kontrastlar `#08090c` üzerinde ölçüldü (2026-10-31); `text`/`dim` `s3` üstünde bile ≥ 5,0:1.
`faint` AA altıdır: **bilgi taşıyan metin (kilit gerekçesi, fiyat, şartlar) asla `faint`'e düşmez**,
en az `dim`'dir. Eski `--pn-hairline(-strong)` adları yeni çizgilere bağlı takma addır.

**Biçim:** köşe `--pn-r-xs 3` · `--pn-r-sm 4` · `--pn-r 6` (kontrol) · `--pn-r-lg 8` (panel).
**Yasak:** gölge (drop shadow), `backdrop-blur`, gradyan dolgu, neon glow, hero'da `text-shadow`.
Odak halkası, aktif satırın 2 px iç çizgisi ve canlı nokta halesi gibi **çizgi/halka** gölge sayılmaz.

### 2.2 Vurgu = basamak rengi

`App.vue` kök elemana `--pn-rung` yazar (`store.rungInfo.color`). Türevler `style.css`'te:

| Token | Formül | Kullanım |
| :--- | :--- | :--- |
| `--pn-rung` | basamak hex'i | hero sayı, aktif menü ikonu, hap metni, dolu blok göstergesi, `+1` yüzen etiketi |
| `--pn-rung-soft` | `color-mix(rung 10%, transparent)` | alım düğmesi dolgusu, hap zemini, birincil düğme zemini |
| `--pn-rung-line` | `color-mix(rung 45%, transparent)` | alınabilir/birincil kontrol kenarı, odak halkası |
| `--pn-rung-hover` | `color-mix(rung 7%, s2)` | alınabilir kontrol üzerine gelme |

**Vurgu yalnız şuralarda yaşar:** hero sayı · eyleme açık durum (alınabilir fiyat, Enter, birincil
düğme) · aktif konum (menü ikonu, aktif mücadele) · ilerleme çubuğu. Pasif metin, başlık ve tablo
verisi vurgu almaz. Basamak değişince arayüz tek değişkenle yeniden boyanır; bileşen kodu basamak
hex'ini **asla** sabit yazmaz.

### 2.3 Basamak yayı: 11 renk, tek formül

```
H(i) = 130 + (330 − 130) · i/10                i = 0..10   (derece)
L(H) = 0.84 − 0.22 · e^(−(H − 265)² / 48²)     parlaklık zarfı (mavi bandında dip)
C(H) = sRGB gamutunda mümkün olan en yüksek kroma
```

| # | Basamak | Hex | Kontrast (eski `#060608`) |
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

Ölçülen aralık **5,4:1 – 13,4:1** (2026-10-23, eski tuval `#060608`). Yeni tuval `#08090c`
üzerinde (2026-10-31): 1. basamak **12,8:1**, 8. basamak `#5a78ff` **5,3:1** (`s2` üstünde 4,8:1,
`s3` üstünde 4,4:1). Vurgu artık küçük metinde de yaşadığı için (hap, "Active", bağlantı) 8. basamak
**sınırdadır**: o basamak tasarlanırken küçük metin tonu yeniden ölçülür. Komşu basamak arası minimum hue farkı **25,1°**. Kroma %85'e çekilmiş "sakin" varyant tek katsayıyla elde edilir;
yerinde çok neon gelirse o katsayı çevrilir — **11 hex elle düzenlenmez.**

### 2.4 Rezerve renkler

| Renk | Hex | Anlam | Sınır |
| :--- | :--- | :--- | :--- |
| **Amber** | `#f59e0b` | Prestij / milestone | Basamak yayının **dışında** (hue 70,1°) |
| **Rose** | `#f43f5e` | Tehlike / kriz | Basamak yayının **dışında** (hue 16,4°) |
| **Gri** | `--pn-locked` (`#5a5b63`) | Kilitli | her zaman kilit ikonu ya da gerekçe metniyle |
| ~~Cyan~~ | ~~`#06b6d2`~~ | ~~Bonus / telemetri~~ | ❌ **emekli** (`G6`): bonus artık beyaz + kıvılcım |

**Durum ≠ hue kuralı korunur:** uygunluk vurgu kenarı + doluluk ile (alım düğmesi), kilitlilik
griyle verilir. Basamak hue'su kimlik taşır; amber/rose anlamlarını hiçbir basamakta kaybetmez.

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

**Ölçek:** hero tabanı sabit bir tablodan gelir (aşağıda), dizeye göre otomatik değil. Küçük
ölçek (üs, üstsimge) tabanın ~%36'sı.

**Gerekçe:** auto-fit sayıyı en büyük olduğu basamakta küçültürdü; `T2` kadranı da aynı
ayrımı kullanır (`rank` küçük, `mag` büyük) — motorun ayrımı ekranda da aynıdır.

**Ölçek tablosu (ADR-0085, `G13` kapandı):** masaüstü taban **104 px** / kuyruk 38 px ·
≤ 900 px **72 / 27** · ≤ 560 px **60 / 22**. Eşikler ekran genişliğine bağlı sabit değerlerdir,
dizeye bağlı değil (auto-fit hâlâ yasak). Taban ve kuyruk aynı satırda kalır; sığmazsa kuyruk alt
satıra sarar.

---

## 5. Ekran anatomisi (ADR-0085)

```
┌ üst çubuk 52 ─ # HOLD THAT NUMBER · [● sayı +X/s] [● Definitions] ···· Goal ▬▬ 4.2% 1.79e308 · ⚙ ┐
│ sol menü 232 │ ana alan: içerik ≤ 1040 px, ortalı                                              │
│  RUNG 1      │  [RUNG 1 / 11] basamak adı                                                      │
│  Chain       │  SAYI (104 px, 300, basamak rengi)                        [+1 space]            │
│  Chall.  3/8 │  +X per second                                             N presses             │
│  ??? (kilit) │  Next C4 · Pencil · opens at 1e40                                               │
│  ??? (kilit) │  ───────────────────────────────────────────────────────────────────            │
│              │  Chain + tek satır açıklama                      [×1|×10|Max] [Max all]         │
│  Statistics  │  01  RING  OWNED  PRODUCES  BLOCK ▪▪▪▫▫▫▫▫▫▫ x5.50             [ ▓▓▓░ 1.2K ]    │
└ durum 30 ─ ● ticker satırı …………………………………………………………… 20 tps · autosave 10s ┘
```

- **Sağ panel yok** (sahip reddetti). Ana alan tek sütundur.
- **Üst çubuk:** marka · kaynak çipleri (`src/ui/resources.ts`) · hedef (logaritmik %, bir ondalık,
  aşağı yuvarlanır; mücadelede `C3 Active ▬ % Goal X [Exit]`) · ayarlar.
- **Menü:** `src/ui/sections.ts` kayıt defterinden. Grup başlığı oyuncunun basamağı. Kilitli kayıt
  **"???" + kilit**, tıklanamaz; adı söylenmez. Aktif öğe: `s2` zemin + `line-strong` kenar + vurgu ikonu.
- **Hero:** basamak hapı + adı (renk tek başına bilgi taşımaz, §8.4), sayı, oran, "Next" satırı
  (yalnız store verisinden: sıradaki mücadele + açılma eşiği / aktif mücadelenin hedefi / kapı).
- **`+1`:** normal küçük tuş (36 px, mono "+1", `space` kbd); altında basış sayısı. **Değişmez** (`G10`).
- **Bölüm:** `SectionHeader` (başlık + tek satır nötr açıklama + sağda eylemler) + `.dt` tablo.
- **Durum çubuğu = ticker** (canlı nokta yalnız ticker konuşurken). Sağda yalnız gerçek sabitler.

### 5.1 Veri tablosu dili (`.dt`)

Başlık mono 10 px, `faint`, harf aralığı .12em · satır 56 px, üst kenar 1px `line`, üzerine gelince
`s1` · sıra no mono `faint` · ad 14 px `text` · veri mono · eylem sütunu sağda. Vurgu yalnız eyleme
açık hücrede; kilitli satır adı `faint`, gerekçesi `dim`. Zincirde kilitli halkalardan yalnız ilk
ikisi satırdır, kalanlar "+N more rings" sayacındadır.

### 5.2 Yapı taşları

| Parça | Dosya | Not |
| :--- | :--- | :--- |
| Kabuk | `components/shell/TopBar · NavRail · StatusBar` | menü ≤ 900 px'te alt sekme çubuğu |
| Hero | `components/HeroNumber.vue` + `TapButton.vue` | kayıtta `hero: false` ile kapatılabilir |
| Segment | `components/ui/SegmentedControl.vue` | tek seçimli durum (aria-pressed) |
| Alım düğmesi | `components/ui/BuyButton.vue` | dolgu = min(1, sayı/fiyat); hazırken vurgu kenarı |
| Blok göstergesi | `components/ui/BlockPips.vue` | `bought % 10` + mevcut çarpan |
| Bölüm başlığı | `components/ui/SectionHeader.vue` | açıklama = "Açıklama" kanalı, şaka yok |
| İlerleme | `components/ui/ProgressBar.vue` | oran = çubuk; ton rung / amber / dim |
| Global sınıflar | `style.css` | `.dt` `.btn(--solid/--accent/--amber/--danger)` `.pill` `.kbd` `.field-input` `.modal` `.notice` |

### 5.3 Duyarlı davranış

≤ 1180 px: menü 200 px, marka adı gizlenir. ≤ 900 px: tek sütun; menü **aynı kayıt defterinden**
alt sekme çubuğu (ikon + ad); hero 72 px; tablolar 2–3 satırlık ızgaraya katlanır (başlık satırı
görsel olarak gizlenir, ekran okuyucuda kalır); kbd ipucu, çip oranı, hedef değeri ve teknik satır
gizlenir. ≤ 560 px: hero 60 px, `+1` sayının altına iner. 390×844'te doğrulandı.

---

## 6. Anlar (motion)

| An | Sıklık | Süre | Ne olur |
| :--- | --: | --: | :--- |
| **Basış (`+1`)** | sürekli | 600 ms | Tuş 1 px iner · küçük "+1" yükselip söner · hero sayı 160 ms `pn-pop` (%2,5). Fare ve klavye aynı (`store.taps` izlenir). **Asla değişmez.** |
| **Alım** | sık | 160 ms | Hero sayı aynı `pn-pop`; alım düğmesi dolgusu doğrusal akar |
| **Mini boost** | ~250 kez | 400 ms | Sayı içeri çöker, çarpan rozeti oturur. Sahne yok, yazı yok. (henüz uygulanmadı) |
| **Basamak geçişi** | 11 kez | 2.500 ms | Ekran söner → basamak adı yeni basamak renginde → arayüz vurgusu yeni renge geçer |

**Kırılmaz ayrım:** boost = yalnız hareket + ses; basamak = renk + isim. İki dil karışmaz.

**Hareket kapısı (ADR-0058):** `reduced`/`off` modunda ve OS azaltılmış harekette tüm animasyon ve
geçişler kapanır; yüzen "+1" hiç doğmaz; sahne anlık geçişe düşer (içerik kaybı yok).

---

## 7. Katman envanteri

| Katman | Kader | Not |
| :--- | :--- | :--- |
| Kabuk (üst · menü · durum) | ✅ | ADR-0085 |
| Ticker | ✅ | Durum çubuğunda; humor `off` → gizli |
| `RungScene` | ✅ | z 30; ad basamak renginde |
| Modallar | ✅ | ayarlar 40 · çevrimdışı 45 · kapı 50 · çakışma 55 · giriş 60; düz karartma + `s1` panel, 8 px |
| `AlgorithmicSwirl` | ❌ | ADR-0085 ile silindi (`swirlShaderQuality` alanı kayıt şekli için modelde durur, okunmaz) |
| Sağ istatistik paneli | ❌ | sahip reddetti |
| `AnomalyOverlay` | 🅿️ | Gece krizi **mekaniğine** bağlı; mekanik kararı bekliyor |

---

## 8. Okunabilirlik kanonu (kırılmaz)

1. **Sayı asla bozulmaz.** Hiçbir efekt, maske, filtre veya renk oyunu sayının okunmasını
   engelleyemez.
2. **Sayısal etiket ve tooltip asla şaka yapmaz** (`V4`). "Next … opens at …", yüzde, fiyat ve
   durum çubuğu teknik satırı yalnız gerçek veriden türer; izlenmeyen değer ("saved 4s ago") yazılmaz.
3. **Kontrast:** hero sayı ≥ 10:1 (1. basamak 12,8:1), gövde metni ≥ 4,5:1 (`text`/`dim` her
   yüzeyde ≥ 5,0:1). `faint` pasif tondur; bilgi taşımaz.
4. **Renk körlüğü ikinci kanalı:** basamak rengi tek başına anlam taşımaz; basamak adı ve
   numarası her zaman yazıyla da vardır, durum sözcüğü (Active/Completed/Unlocks at) her zaman yazılır.
5. **Tek semantik = tek görsel.** Eyleme açık = vurgu kenarı + yumuşak zemin; kilitli = gri + kilit;
   prestij = amber; tehlike = rose. Aynı anlam iki farklı görselle anlatılmaz.

---

## 9. Bu belge ne zaman değişir?

Yeni bir görsel karar alındığında ya da bir katman değiştiğinde **önce bu dosya**, sonra kendi
ADR'si güncellenir. Görsel işler buradan sapan değişiklik yapmaz; sapma gerekiyorsa önce bu belge
değişir. Yeni katman/mekanik sayfası §5.2 yapı taşlarını kullanır ve `src/ui/sections.ts`'e kayıt
olarak eklenir.

### Tarihçe

| Tarih | Olay |
| :--- | :--- |
| 2026-10-16 | "Aç Kumarhane" sözleşmesi yazıldı (Balatro + GIC + VS sentezi, ADR-0060) |
| 2026-10-18 | Tooltip katmanı kaldırıldı · CRT resmen iptal (ADR-0069) |
| 2026-10-23 | Tema pivotu (ADR-0077): oburluk teması silindi; görsel dil ertelendi (`A1`) |
| **2026-10-23** | **Bu belge baştan yazıldı: "Saf Sayı" (ADR-0078, `G1`–`G12`).** ADR-0060 ve ADR-0066 iptal |
| 2026-10-31 | §2.4 swirl parlaklık tavanı (L ≤ 0,016); piksel kuantizasyonu ve fallback gradyanı kaldırıldı (ADR-0084) |
| 2026-10-31 | ADR-0084 eki (sahip): tavan 0,016 → 0,03, doygunluk %55 → %80 (swirl görünmez olmuştu); menü sütununa düz `--pn-bg` zemin |
| **2026-10-31** | **Bu belge baştan yazıldı: "Laboratuvar" (ADR-0085).** Kabuk + kayıt defterleri + vurgu = basamak rengi; swirl ve "kart/köşe yok" yasağı kaldırıldı; sağ panel reddedildi |
