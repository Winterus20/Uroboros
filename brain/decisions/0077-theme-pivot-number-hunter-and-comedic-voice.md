# ADR-0077: Tema Pivotu — "Kozmik Oburluk" → "Sayı Avcısı" + Mizahi Sistem Sesi

## Durum
**Önerildi (Proposed)** — kullanıcı onayı bekliyor. Karar kesinleştiğinde "Kabul Edildi"ye
çekilir ve uygulama dalgaları `brain/tasks/in-progress.md` altında açılır.
Bu ADR **yalnızca doküman** üretir; hiçbir `.ts` / `.vue` dosyası değişmemiştir.

## Bağlam ve Problem

Projenin mevcut kimliği **"UROBOROS (The Cosmic Feast)"**: masum bir bilim insanının
Planck ölçeğinde mikro-karadelik yaratıp Dünya'yı, Güneş'i ve Samanyolu'nu yutması.
Ana kaynak **Yutulan Kütle (g)**, ana fiil **YUT!** (ADR-0039 bu pivota karar vermişti).

Sayı merdiveni çalışması (TREE(3) → LNGN hedefi) bu temayı üç noktadan kırıyor:

1. **Birim tavansız, tema tavanlı.** Gözlemlenebilir evrenin toplam kütlesi ≈ `1.5e56 g`.
   İlk prestij duvarı `1.79e308 g`. Yani oyuncu **ilk çöküşe varmadan ~10^252 evren**
   yutuyor. "Kütle" bu noktadan sonra ölçü değil, süs. Gram, `TREE(3)` ölçeğinde
   anlamsızdır; **sayı** ise tavansızdır.
2. **Akt II temayla taşınamıyor.** 6-11. basamaklar bir *tanımlama* merdivenidir
   (Rayo, Fish 7, BIG FOOT, LNGN). Googolojist tam olarak şunu yapar: sayıyı **hesaplamaz,
   tanımlar**. "Evreni yiyen tekillik" bu davranışı motive edemez; "en büyük sayıyı merak
   eden bir insan" eder. Tema ile mekanik ilk kez aynı yönü gösterir.
3. **`1.79e308` duvarı ölü bir an.** Her incremental oyunun en yüksek bırakma noktası
   burasıdır: oyuncu "sayı bitti" der, kapatır. Mevcut tasarımda bu an kutlanmıyor,
   sadece bir prestij ekranı açılıyor.

## Karar

### K1 — Yeni tema: Sayı Avcısı
Oyuncu, **en büyük sayıyı merak eden sıradan bir insan**dır. Elinde bir defter ve giderek
saçmalayan sayı jeneratörleri vardır. Amaç sayıyı *yutmak* değil, **bir üst basamağa
taşımaktır**. Ana kaynak `Yutulan Kütle (g)` yerine **`Sayı (değer)`**; ana fiil **YUT!**
yerine **`ÜRET!`** (veya jeneratör başına fiil). Birim sembolü `g` kalkar.

### K2 — Ölçek merdiveni iki motora ayrılır
| Akt | Basamaklar | Gerçek eksen | Motor |
| :--- | :--- | :--- | :--- |
| **I — Büyüme hızı** | 1-5 | FGH: `f_2` → `f_{ω+1}(64)` | Number → break_infinity → break_eternity → ok motoru |
| **II — Tanımlanabilirlik** | 6-11 | Ölçek dışı ("hangi teoride tanımlanabilir") | Terim yeniden yazma motoru |

Akt I'in tavanı **kendi hiperoperatör temsilimizdir**: `{çapa, ok sayısı, büyüklük}`.
Akt II'de kütle yoktur; kaynak **Tutarlılık (Consistency)** ve **Tanım Gücü**'dür.

### K3 — Orta sayı her zaman artar (gösterim sözleşmesi)
Ekranın ortasındaki sayı **hiçbir zaman durmaz**. Gösterim üç katmanlıdır:

```
TREE(3)  ↑↑  1.47
  │       │    └── canlı büyüklük: her tick artar, sürekli ve kesirli
  │       └─────── hiperoperatör katmanı: ↑↑ → ↑↑↑ → … (tavan ~10 ok)
  └─────────────── çapa: yalnız prestij anında yükselir (isimlendirilmiş dev)
```

**Monotonluk bir teorem değil, inşaat garantisidir:** çapa sırası sabit tablo, ok sırası
sabit tablo, `büyüklük` tek yönlü Decimal → bileşke her zaman artar. Hiçbir an gerçek
değerin hesaplanması gerekmez.

**`TREE(3) + 1` reddedilir.** Üç gerekçe: (a) `TREE(3)` bir değişkende tutulamaz, üstüne
`+1` eklenemez; (b) `TREE(3)+1` ile `TREE(3)+1e100` oyuncunun gözünde aynıdır — sayı
artar, algı donar; (c) "devasa sayının üstüne bir tane daha koydum" tüm ölçek temasını
iptal eder. Oyuncu değeri değil **en üst katmanı** okur (`10^^5.2`'de `5.2`'yi okuduğu
gibi); `↑↑ 1.47` aynı okuma deneyimini verir.

### K4 — Mizah bir mekaniktir, süs değil
Sistem (`SİCİL` — Sayı Sicili) oyuncuyla dalga geçer. Üç bağlayıcı kural:

1. **Şaka hep oyuncuya, asla sayıya.** Sayı kutsal kalır. "Bu sayı bir şey ifade etmiyor"
   denmez; "sen bitti sandın" denir. Sayının büyüklüğüne gülünürse dopamin ölür.
2. **Sistem mekanik olarak yalan söylemez.** Alay eder, yanlış yönlendirmez. Yalan yalnız
   *hikâyede* olur, *kurallarda* asla. Oyuncunun bilgiye güveni kaybolursa oyun kaybolur.
3. **Tekrar şakayı öldürür.** Her eşik 4 kademeli seyreltme ile sunulur (bkz. §Etki).

Sözleşme: [`brain/context/narrative-voice.md`](../context/narrative-voice.md)
Tam senaryo: [`brain/research/number-ladder-script-2026-10.md`](../research/number-ladder-script-2026-10.md)

### K5 — Eski lore silinmez, arşivlenir
"Kozmik Oburluk" çağındaki 486 tema satırı (83 dosya) **silinmez**. SİCİL'in
**"Eski Kayıtlar"** bölümü olur: eski boyut isimleri, eski başarımlar, eski haber bandı
girdileri, hikâye içi bir arşiv olarak yaşar. Böylece:
- sıfır içerik israfı,
- tema geçişi *anlatı içinde* gerekçelenir ("sicil, bu gezegeni yiyen kaydı da tutuyor"),
- yeni tema eski temayı yok etmek yerine yutar — oyunun kendi oburluk motifi korunur.

### K6 — Mühendislik kuralı: önce gösterim, sonra isim
İç değişken adları (`mass`, `matterPerSecond`) **değiştirilmez**. Önce yalnız UI
metinleri değişir. Bu, 83 dosyalık riski tek ekrana indirir ve **save migrasyonu
gerektirmez**. İç yeniden adlandırma ayrı ve isteğe bağlı bir iştir (ADR-0037 kayıt
sürümleme mekanizması varsa değerlendirilir).

### K7 — Üretim modeli: iki çark, altı para birimi, on üç jeneratör
Sayıyı **jeneratörler** yükseltir. İki ayrı çark vardır:

| Çark | Ne yapar | Ritim |
| :--- | :--- | :--- |
| **Üretim çarkı** | Jeneratör üretir, sayı jeneratör satın alır | ~5 dakika |
| **Notasyon çarkı** | Eşik geçilir, yazım biçimi değişir, yeni jeneratör sınıfı açılır | ~2 saat |

**Değişmeyen kural:** jeneratörün tek görevi, *mevcut notasyonun en üst parametresini*
artırmaktır. Basamak yükseldikçe hedef değişir, davranış değişmez:

| Basamak | Sayı = | Jeneratörün artırdığı | **Harcanan para birimi** |
| :--- | :--- | :--- | :--- |
| 1 | `10^n` | hane | **Sayı** |
| 2 | `10^10^n` | üs | **Üs** |
| 3 | `10^^n` | kat | **Kat** |
| 4 | `10↑↑↑n` | ok | **Ok** |
| 5 | `G`, `TREE(3)`… | isim sırası | **İsim** (koleksiyon) |
| 6-11 | `Rayo`…`LNGN` | teorinin gücü | **Tutarlılık** |

Döngü **biçim olarak aynı** kalır (harca → üret → büyüt), **içerik olarak değişir**.
Bu, K6 ile birlikte kritik bir mühendislik sonucu doğurur: basamak 2-4 için yeni motor
yazılmaz; **para birimi parametreleştirilir** (`{ad, birim, kaynak jeneratör}`).

Jeneratör merdiveni basamak başına **bir halka uzar** (8 → 13):

`Parmaklar · Çentik · Abaküs · Kalem · Hesap Makinesi · Bilgisayar · Süperbilgisayar ·
Matematikçi` → `+ Logaritma Makinesi` → `+ Kule Vinci` → `+ Ok Dökümcüsü` →
`+ Adlandırıcı` → `+ Teorisyen`

Son sıradaki `Matematikçi` kasıtlıdır: hesaplanabilirin bittiği yerde tek üretici
tanımdır. Akt I'in sonu ile Akt II'nin başı aynı jeneratörde düğümlenir.

**Orta sayı = rekor.** Ekranın ortasındaki sayı harcanmaz; `En Büyük Sayı` (highest ever)
gösterir ve asla düşmez (K3 garantisi korunur). Harcama ayrı bir "kullanılabilir" havuzdan
yapılır. Eski temada "en yüksek kütle" tuhaf bir istatistikti; yeni temada **rekor oyunun
amacıdır** — kural değil, temanın zorunlu sonucu.

**Manuel buton `+1`'dir.** Süslemesiz. `TREE(3)` seviyesinde de hâlâ `+1` yazar ve SİCİL
bunu görür ("Hâlâ basıyorsun."). K3'te gösterim olarak reddedilen fikir, buton olarak
oyunun kalıcı şakasına dönüşür.

**Prestij = notasyon atlama.** Para birimi `SP` → **`Tanım`**. Oyuncu "daha hızlı sayı"
değil, **daha güçlü ifade biçimi** satın alır.

**Pragmatik kesim (kapsam kararı):** 11 basamağın tamamına ayrı jeneratör sistemi
yazılmaz. Basamak 1-4 gerçek jeneratör merdiveni; basamak 5 koleksiyon sistemi;
basamak 6-11 tek ortak sistem (`Teorisyen` + Tutarlılık, basamak başına yalnız eşik/isim).

Tam detay (13 jeneratörün listesi, basamak başına kural değişikliği, ekran örnekleri):
[`brain/research/number-ladder-script-2026-10.md`](../research/number-ladder-script-2026-10.md) §6.

### K8 — Hibrit motor ve karışık tetikleme

**Motor seçimi: kadran yalnız zorunlu olduğu yerde.**

| Basamak | Motor | Gösterim | Gerekçe |
| :--- | :--- | :--- | :--- |
| 1-3 | `break_eternity` **gerçek aritmetik** | `1.23e45`, `10^^4.2` | Faz 0'ın dengelenmiş ekonomisi (ADR-0021/0023/0024) aynen korunur |
| 4+ | **Kadran** (`rank` + `mag`) | `10 ↑↑↑ 2.00` … `LNGN` | Bu noktadan sonra hiçbir motor değeri hesaplayamaz |

Değerlendirilen alternatifler (saf kadran, gerçek sayı + isim, sıra + bar, kesirli
operatör `10 ↑^h 10`, iki eksen) karşılaştırıldı; hibrit seçildi çünkü **denge riski
oyunun ilk 6 saatine taşınmıyor** ve geçiş "notasyon değişimi" olduğu için anlatısal
olarak gerekçeli.

**Hücre modeli.** `mag` bir sayı değil **kadrandır**: her hücrede `[2.00, 10.00)` arasında
döner, asla büyümez. Sayı büyür, kadran döner. Süreklilik özdeşliği sayesinde hücreler
kusursuz birleşir:

> `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a`  (çünkü `a ↑ⁿ 1 = a` her `n` için)

Yani `10 ^ 10.00 = 100 = 10 ^^ 2.00`. Özel durum, yama veya düzeltme yok.

**Karışık tetikleme.** Her sınır aynı şekilde geçilmez:

| Sınır | Tetik |
| :--- | :--- |
| `mag` adımı | otomatik (sürekli) |
| **Ok yükselmesi** | **otomatik** — 15 dk'da bir ödül, akış kesilmez |
| **Çapa değişimi (prestij)** | **manuel buton** — prestij bir karardır, sürpriz değil |
| Motor geçişi (3→4) | manuel + tam sahne (tek seferlik) |
| `LNGN` | manuel, tek |

**Zaman karışımı:** ilk çapa değişimi **zorunlu manuel** (mekanik öğretilir, sahne
yaşanır); bir kez yapıldıktan sonra **"otomatik yükselt"** seçeneği açılır (varsayılan
kapalı). Böylece ilk seferin draması korunur, 11 kez butona basma işkencesi doğmaz.

**Birikim.** Çapanın son ok hücresinde `mag` 10'u aşabilir; aşan kısım `Birikim` olarak
birikir ve çapa primini büyütür. Oyuncu "şimdi mi, biraz daha mı" gerilimini yaşar.
Beklemenin fırsat maliyeti için tavan aşımında üretim verimi düşer.

**Motor geçiş sahnesi** (tier 3→4, SİCİL'in mekaniği öğrettiği an):
> **SEN:** Sayı hesaplanmıyor artık. / **SİCİL:** Hesaplanmıyor. Bundan sonra kadrana
> bakacaksın. / **SEN:** Kadran neyi ölçüyor? / **SİCİL:** Seni.

Bu, "neden gösterim değişti" sorusunu cevaplar, mekaniği öğretir ve şaka yapar — üçü
tek replikte.

Detay: senaryo dosyası §6.11-6.13.

## Sonuçlar ve Etki

### Olumlu
- Akt II (TREE(3)+) ilk kez anlatısal olarak mümkün hale gelir.
- `1.79e308` duvarı, oyunun en akılda kalıcı sahnesine dönüşür (retention).
- Motorun tamamı (Decimal, accumulator loop, save, prestij, otobuyer) **dokunulmadan** kalır.
- Eski içerik arşiv olarak değer kazanır; hiçbir yazım emeği çöpe gitmez.

### Olumsuz / Maliyet
- **Yazım maliyeti gerçek**: mizahi oyun, ciddi oyundan 3-4× fazla metin ister
  (tahmini ~250 satır senaryo + ~200 satır ticker, varyant havuzlarıyla).
- **Yarım pivot en kötü sonuçtur**: kod "kütle" derken ton komikse oyuncu yamalı hisseder.
  Ya tamamen geçilir ya hiç.
- **Zamanlama**: Faz 2 içeriği eski tema üstüne kurulursa maliyet katlanır. Pivot
  Faz 2'den **önce** yapılmalıdır.
- Bazı oyuncular "sistem konuşuyor" mizahını sevmez → **kapatma ayarı zorunlu**.

### Duyarlılık
- Mizahın hedefi oyuncunun *çabası* değil, *beklentisidir*. "Aptal" değil "saf".
- Sistem asla küçümsemez; sonunda **saygı duyar**. Yay: kendinden emin büro → yorgun
  memur → sessizlik → (LNGN'de) protokolü bozan tek cümle.
- Türkçe mizah doğal konuşma diline dayanır; çeviri esprisi yok, ansiklopedi esprisi var.

## Alternatifler (değerlendirildi, reddedildi)

| Alternatif | Neden reddedildi |
| :--- | :--- |
| Temayı koru, sadece sayı merdivenini ekle | Akt II'de "kütle" anlamsız; 1e308'den sonra tema çelişki üretir |
| Temayı değiştir, mizahı sonraya bırak | Mizah tam olarak duvar anlarında gerekiyor; sonra = hiç |
| `TREE(3) + 1` gösterimi | Algısal donma + temsil edilemezlik (bkz. K3) |
| Eski lore'u tamamen sil | 486 satır emek çöpü; ayrıca geçiş anlatı içinde gerekçesiz kalır |
| İç değişkenleri de yeniden adlandır | Save migrasyonu riski, 83 dosya, sıfır oyuncu faydası |

## Açık Kararlar (kullanıcı onayı bekliyor)

- **O1 — Oyun adı.** Adaylar: `Bir Sayı Tut` (çift anlam: *sayı seç* / *sayıyı elinde tut* —
  önerilen), `Son Sayı` (güvenli), `Kâğıt Yetmiyor` (en komik, en niş).
  `UROBOROS` alt başlık olarak sonda korunabilir (döngü motifi hâlâ geçerli).
- **O2 — Sistemin adı.** `SİCİL` (Sayı Sicili — bürokratik, yorgun, bilgili) öneriliyor.
  Alternatifler: `ARŞİV`, `KAYIT`, isimsiz (`SİSTEM`, en nötr).
- **O3 — Uygulama sırası.** Öneri: (1) gösterim katmanı + orta sayı, (2) senaryo/ticker,
  (3) UI metinleri, (4) arşiv bölümü, (5) iç yeniden adlandırma (opsiyonel).
- **O4 — Mizah yoğunluğu ayarı.** `kapalı / ölçülü (varsayılan) / tam` üç kademesi.
- **O5 — Eski temanın statüsü.** Öneri: K5 gereği "Eski Kayıtlar" arşivi (silme).

## Takip
- Sözleşme: [`brain/context/narrative-voice.md`](../context/narrative-voice.md)
- Senaryo: [`brain/research/number-ladder-script-2026-10.md`](../research/number-ladder-script-2026-10.md)
- Karar kesinleşince: `brain/tasks/in-progress.md` → uygulama dalgaları
- Uygulama bitince: `brain/tasks/completed.md` + `GAME_DESIGN.md` başlığı + `project-brief.md`
