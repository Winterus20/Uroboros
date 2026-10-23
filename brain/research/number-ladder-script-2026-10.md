# SAYI MERDİVENİ — TAM SENARYO VE MİZAH TASLAĞI

> **Amaç:** ADR-0077 tema pivotunun bütün yazılı içeriğini tek yerde toplamak.
> **Sözleşme:** [`brain/context/narrative-voice.md`](../context/narrative-voice.md) — bu
> dosya sözleşmeye uymak zorundadır, sözleşmeyi değiştirmez.
> **Durum:** taslak (yazım aşaması). Kod karşılığı `src/game/script.ts` **henüz yok**.

---

## 1. Ölçek Tablosu (gösterim + eşik)

Ekranın ortasındaki sayı üç katmanlıdır: **çapa · ok · büyüklük**.
`büyüklük` her tick artar; `ok` doldukça yükselir; `çapa` yalnız prestij anında değişir.

| # | Eşik (sayısal) | Gösterim öncesi | Gösterim sonrası | Sahne adı |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `1.79e308` | `1.79e308` | `1e1e10` | Duvar sandım |
| 2 | `1e(9e15)` | `1e1e308` | `10^^12` | Rafın sonu |
| 3 | `10^^1.79e308` | `10^^1.79e308` | `10 ↑↑↑ 2` | Kule bitti |
| 4 | `1000 ok` | `10 ↑↑↑ 4` | `G ↑↑ 1` | Ok bitti |
| 5 | `G` (Graham) | `G ↑↑ 3.2` | `G ↑↑↑ 1` | Yazmadı, gösterdi |
| 6 | `TREE(3)` | `G ↑↑↑↑ 9` | `TREE(3) ↑↑ 1` | Bilmiyoruz |
| 7 | `SSCG(3)` | `TREE(3) ↑↑↑ 9` | `SSCG(3) ↑↑ 1` | Oda |
| 8 | `Rayo` | `SSCG(3) ↑↑↑ 9` | `Rayo ↑↑ 1` | Evim |
| 9 | `Fish 7` | `Rayo ↑↑↑ 9` | `F7 ↑↑ 1` | Kapı |
| 10 | `BIG FOOT` / `Sasquatch` | `F7 ↑↑↑ 9` | `BIG FOOT ↑↑ 1` | Geçerli mi? |
| 11 | `LNGN` | `BIG FOOT ↑↑↑ 9` | `LNGN` | Son kayıt |

**Monotonluk garantisi:** her satırda ya `büyüklük` artar, ya `ok` yükselir, ya `çapa`
değişir — üçü de tek yönlü. Hiçbir an gerçek değer hesaplanmaz.

---

## 2. Eşik Sahneleri (tam diyalog)

> Biçim: `SEN:` ikinci şahıs, `SİCİL:` kurum sesi. Köşeli parantez = sahne talimatı.
> Her sahne **yalnız ilk karşılaşmada** tam oynar (bkz. §4 seyreltme).

### Eşik 1 — `1.79e308` · "Duvar sandım"

```
[ Sayı 1.79e308'e ulaşır. Ekran bir an donar, ardından "Infinity" yanıp söner. ]

SEN:    Tamam. Bu kadar.
        1.79e308. Bundan sonrası yok. Bunu okulda öğretmişlerdi.

SİCİL:  Hayır.

SEN:    ...Hayır mı?

SİCİL:  O bir duvar değildi. Bir yazı tipiydi.

[ Sayı titrer. Sonra yazılmaya devam eder: 1.8e308 → 4.2e308 → 1e1e10 ]

SEN:    Bu... bu legal mi?

SİCİL:  Değil.
```

### Eşik 2 — `1e(9e15)` · "Rafın sonu"

```
SEN:    Üs de taştı. Artık sayıyı yazamıyorum.
        Sadece "kaç katlı" diyebiliyorum.

SİCİL:  Kabul edilebilir.

SEN:    Bu iyi bir şey mi?

SİCİL:  Kaydedilebilir bir şey.
```

### Eşik 3 — `10^^1.79e308` · "Kule bitti"

```
SEN:    Kule bitti. Kat sayısı bile taştı.
        Bu sefer gerçekten.

SİCİL:  Kule bitmedi. Kat sayısını sen yazamıyorsun.

SEN:    Aynı şey değil mi?

SİCİL:  Değil.
        İlk duvarda da aynısını demiştin.
```

> **Not:** bu geri çağırma kasıtlıdır — oyuncunun tekrar eden yanılgısı, mizahın
> taşıyıcısıdır (bkz. sözleşme §3).

### Eşik 4 — `1000 ok` · "Ok bitti"

```
SEN:    Bin ok. Ok sayısı da bitti.

SİCİL:  Ok sayısı bitmedi.
        Ok sayısını sayan sistem bitti.

SEN:    Yani?

SİCİL:  Yani artık ok saymıyorsun.
        Ok sayısını adlandırıyorsun.
```

> **Not:** bu sahne Akt I → Akt II geçişinin hikâye içi gerekçesidir. Motorda da tam
> burada sayısal aritmetik biter, terim yeniden yazma başlar.

### Eşik 5 — `G` · "Yazmadı, gösterdi"

```
SEN:    Graham sayısı.
        Bunu bir insan yazmış. Demek yazılabiliyormuş.

SİCİL:  Yazmadı. Gösterdi.

SEN:    Fark ne?

SİCİL:  Fark şu: sen artık hiçbir şeyi bir daha yazamayacaksın.
```

### Eşik 6 — `TREE(3)` · "Bilmiyoruz"

```
SEN:    TREE(3).

SİCİL:  Evet.

SEN:    Kaç?

SİCİL:  Bilmiyoruz.

SEN:    NASIL BİLMİYORUZ?

SİCİL:  Kaydedildi. Hesaplanmadı.
        İkisi ayrı işlemler.
```

> **Gerçek kontrolü:** `TREE(3)`'ün tam değeri gerçekten bilinmiyor (yalnız alt sınırlar
> var). Şaka doğru olduğu için çalışıyor — sözleşme §2 Kural 2.

### Eşik 7 — `SSCG(3)` · "Oda"

```
SEN:    Sayı büyüdü ama farkı göremiyorum.

SİCİL:  Göremezsin. Aradaki fark da bir sayı.

SEN:    Kaç?

SİCİL:  Onu da bilmiyoruz.

SEN:    Sizin hiçbir şeyi bilmediğiniz bir iş mi bu?

SİCİL:  Hayır.
        Bilmediğimizi bilmek de bir kayıt türü.
```

### Eşik 8 — `Rayo` · "Evim"

```
SEN:    Sayıyı yazamıyorum.
        Sadece "en büyük" diyebiliyorum.

SİCİL:  Hoş geldin. Burası benim evim.

SEN:    Sen hiç buraya ulaşan gördün mü?

SİCİL:  Hayır.

SEN:    Ben ilk miyim?

SİCİL:  Sen, elinde defterle gelen ilk kişisin.
```

> **Not:** karakter yayının kırılma noktası. SİCİL buradan sonra prosedürü bırakır.

### Eşik 9 — `Fish 7` · "Kapı"

```
SEN:    Bu sayı Rayo'yu aşıyor. Nasıl?

SİCİL:  Rayo'nun dili bir oda.
        Fish 7 odaya bir kapı ekliyor.

SEN:    Odanın dışında ne var?

SİCİL:  Oda.
```

### Eşik 10 — `BIG FOOT` / `Sasquatch` · "Geçerli mi?"

```
SEN:    Bu sayı geçerli mi?

SİCİL:  Tartışılıyor.

SEN:    Tartışılıyorsa kaydetmeyeyim.

SİCİL:  Kaydettim bile. Silmek protokol dışı.

SEN:    Ama geçerli olmayabilir.

SİCİL:  Geçerlilik benim işim değil.
        Kayıt benim işim.
```

> **Gerçek kontrolü:** BIG FOOT / Little Bigeddon / Sasquatch'in tanımlılığı googolojide
> gerçekten tartışmalıdır. Tartışmalılık burada **mekanik** olur: bu basamak "kararsız"
> sayılır ve run sırasında çökebilir (bkz. ADR-0077 K2, Tutarlılık kaynağı).

### Eşik 11 — `LNGN` · "Son kayıt"

```
SEN:    Kaç oldu?

SİCİL:  Bilmiyorum. Bu bir kayıt değil.

SEN:    Ee?

SİCİL:  Bitti.

SEN:    ...Ne?

SİCİL:  Bitti. Kayıt kapandı.

SEN:    Ama—

SİCİL:  TAMAM.
```

> **Not:** yapı burada tersine döner. On basamak boyunca **oyuncu** "bitti" dedi,
> **SİCİL** "hayır" dedi. Son basamakta "bitti" diyen SİCİL olur. Oyunun tek büyük harf
> repliği budur (sözleşme §1).
>
> Ardından ekran `LNGN` gösterir ve **döngü açılır** (Ouroboros): otomasyon durmaz,
> daha güçlü bir temel teoriyle yeni koşu başlar.

---

## 3. Haber Bandı (ticker) — SİCİL'in sürekli sesi

`src/game/news.ts` projenin en yüksek getirili mizah yüzeyidir: tek dosya, tüm oyuna
kişilik. Manşet üslubu, üçüncü şahıs, gazete dili.

### 3a. `+1` esprisi (kalıcı favori)
`TREE(3) + 1` fikri gösterim olarak reddedildi (ADR-0077 K3) ama **şaka olarak** altın:

- "Matematikçiler TREE(3) + 1'in TREE(3)'ten büyük olduğunu kanıtladı. İspat 6 yıl sürdü."
- "Yeni araştırma: TREE(3) + 2 de TREE(3)'ten büyük. Ekip heyecanlı."
- "TREE(3) + 1 hâlâ hesaplanamadı. Ekip, '+1'i biz yapmadık' dedi."
- "Sicil, TREE(3) + 1 için yeni bir dosya açtı. Dosya boş."
- "Bir okuyucu 'neden sadece TREE(3) yazmıyorsunuz' diye sordu. Sicil cevap vermedi."

### 3b. Erken oyun (basamak 1-3)
- "Sicil, bugün 1.79e308'e ulaşan ilk kişiyi kaydetti. Kişi, bunun son olduğunu sandı."
- "Uzmanlar uyardı: sayılar büyümeye devam ediyor. Halk tepkisiz."
- "Defter üreticileri talebe yetişemiyor."
- "Bir vatandaş 'kaç tane var' diye sordu. Sicil 'hepsi' dedi."
- "Sayı sayma rekoru kırıldı. Rekoru kıran kişi, saymayı bıraktığını açıkladı."

### 3c. Orta oyun (basamak 4-7)
- "Ok sayısı binin üzerine çıktı. Ok üreticileri grevde."
- "Graham sayısı hâlâ yazılamıyor. Yazma girişimi 14. yılında."
- "Sicil, TREE(3) dosyasını 'hesaplanmadı' notuyla kapattı. Dosya 40 ton."
- "Bir matematikçi 'TREE(3)'ü kafamda canlandırabiliyorum' dedi. Doğrulanamadı."

### 3d. Geç oyun (basamak 8-11)
- "Rayo sayısı kaydedildi. Kaydı okuyan memur, kaydı okumayı bıraktı."
- "Sicil'de bu hafta: 0 yeni sayı, 3 yeni tanım, 1 istifa."
- "BIG FOOT'un geçerliliği tartışılıyor. Sicil, tartışmayı da kaydetti."
- "Soru: en büyük sayı var mı? Cevap: dosya açık."
- "Sicil, bu sabah ilk kez erken çıktı."

---

## 4. Seyreltme (tekrar önleme)

| Karşılaşma | Sunum |
| :--- | :--- |
| 1. | Tam sahne: diyalog + ekran efekti + duraklama + ses |
| 2-4. | Havuzdan tek satır, ticker'da (her eşik için ≥5 varyant) |
| 5+ | Tek kısa cümle |
| Ayar | `Sistem konuşsun mu?` → kapalı / ölçülü / tam |

Son 3 gösterilen varyant kimliği saklanır; art arda tekrar yasak.

**Varyant havuzu durumu:** her eşik için hedef 5, yazılan 0 (bu belge yalnız iskeleti
kurar; varyantlar `script.ts` yazım dalgasında üretilir).

---

## 5. Eski tema → "Eski Kayıtlar" arşivi

ADR-0077 K5 gereği silinmez, arşivlenir. Hikâye içi gerekçe:

> SİCİL yalnız sayı kaydetmez. Bu gezegeni yiyen kaydı da tutar.

Arşivde yaşayanlar: eski D1-D8 boyut isimleri (Moleküler Bağlar → Samanyolu), "YUT!",
Kozmik Parazitler, Planck Baskı Matrisi, eski başarımlar, 486 satırlık eski ticker metni.
Erişim: yeni bir **"Arşiv"** sekmesi veya SİCİL'in bir ticker repliği ("Eski kayıtlara
bakmak ister misin?").

Faydası: sıfır içerik israfı + tema geçişi *anlatı içinde* gerekçelenir.

---

## 6. Üretim Modeli — Sayıyı Ne İle Yükseltiyoruz?

> Bu bölüm ADR-0077 **K7**'nin detayıdır. Tasarım henüz tartışmaya açık; burada
> "yeterince somut, kodlanabilir" seviyede tutulmuştur.

### 6.1 İki çark

| Çark | Ne yapar | Ne sıklıkta döner | Oyuncuya hissi |
| :--- | :--- | :--- | :--- |
| **Üretim çarkı** | Jeneratör sayı üretir, sayı jeneratör satın alır | ~5 dakika | "sayı hızlanıyor" |
| **Notasyon çarkı** | Eşik geçilir, yazım biçimi değişir, yeni jeneratör sınıfı açılır | ~2 saat | "sayı artık başka türlü büyüyor" |

Birincisi zaten kodda (`D1-D8` + otobuyer). İkincisi 11 basamaklık merdivenin kendisi.

### 6.2 Değişmeyen kural

> **Jeneratörün tek görevi, mevcut notasyonun en üst parametresini artırmaktır.**

| Basamak | Notasyon | Sayı = | Jeneratörün artırdığı | Harcanan para birimi |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Rakam | `10^n` | hane / n | **Sayı** |
| 2 | Üs | `10^10^n` | üs | **Üs** |
| 3 | Kule | `10^^n` | **kat sayısı** | **Kat** |
| 4 | Ok | `10↑↑↑n` | **ok seviyesi** | **Ok** |
| 5 | İsim | `G`, `TREE(3)`… | **isim sırası** | **İsim** (koleksiyon) |
| 6-11 | Tanım | `Rayo`…`LNGN` | **teorinin gücü** | **Tutarlılık** |

Döngü **biçim olarak aynıdır** (harca → üret → büyüt), **içerik olarak değişir**.
Bu yüzden üç katmanlı gösterim (`çapa · ok · büyüklük`) vardır: jeneratör hep
`büyüklük`'ü artırır; `büyüklük` dolunca `ok` yükselir; `ok` dolunca `çapa` değişir.

### 6.3 On üç jeneratör (basamak başına bir halka uzar)

| # | Jeneratör | Basamak | Ürettiği | Not |
| :-- | :--- | :-- | :--- | :--- |
| 1 | **Parmaklar** | 1 | hane | Saymanın başlangıcı; `+1` butonunun kaynağı |
| 2 | **Çentik** | 1 | hane | On parmak yetmediğinde sopaya çentik |
| 3 | **Abaküs** | 1 | hane | Toplama/çıkarma |
| 4 | **Kalem** | 1 | hane | **Üs yazabilmek** — ilk ifade gücü sıçraması |
| 5 | **Hesap Makinesi** | 1 | hane | Büyük sayıyı hızlı işleme |
| 6 | **Bilgisayar** | 1 | hane | Astronomik ölçek |
| 7 | **Süperbilgisayar** | 1 | hane | Hesaplanabilirin sınırı |
| 8 | **Matematikçi** | 1 → 5 | hane | **Hesaplamaz, tanımlar.** Akt I/II köprüsü |
| 9 | **Logaritma Makinesi** | 2 | üs | Sayı yerine üssü yönetir |
| 10 | **Kule Vinci** | 3 | kat | Yüksekliği tam sayı adımlarla artırır |
| 11 | **Ok Dökümcüsü** | 4 | ok | Oklar sayılı ve pahalı |
| 12 | **Adlandırıcı** | 5 | isim | Hesaplanamayanı isimlendirir |
| 13 | **Teorisyen** | 6-11 | tanım | Basamak başına yeni jeneratör değil, yükseltme |

**Neden bu sıra:** merdiven ham güce göre değil **ifade gücüne** göre dizilir.
`Kalem` (üs yazabilir) `Abaküs`'ten (yazamaz) sonra gelir. `Matematikçi` bir makine
değil insandır — çünkü hesaplanabilirin bittiği yerde tek üretici tanımdır.

### 6.4 Basamak başına kural değişikliği

Sadece parametre değişirse oyuncu 3. basamakta "aynı oyun, farklı sayı" der ve bırakır.
Her basamak döngünün **bir kuralını** değiştirir:

| Basamak | Kural değişikliği | Oyuncunun hissi |
| :-- | :--- | :--- |
| 1 | Klasik: harca → üret → büyüt | Öğrenme |
| 2 | **Log-uzayı.** Sayı değil *üs* yönetilir; sayı yalnız sonuçtur | "Sayıyı bıraktım, üssü tutuyorum" |
| 3 | **Yükseklik tam sayı.** Kesirli ilerleme yok; kat ya artar ya artmaz | "Sıçrama" |
| 4 | **Ok kıtlığı.** Oklar sayılı ve pahalı; her yeni ok bir olay | "Az ama devasa" |
| 5 | **Koleksiyon.** Hesaplanamaz; isim toplanır | "Kart topluyorum" |
| 6+ | **Risk.** Tutarlılık harcanır; aşılırsa sistem çöker | "Kumar" |

Sıra anlamlıdır: **hesap → kayıt → isim → tanım → risk.** Oyuncu farkına varmadan
hesaplamayı bırakıp tanımlamaya geçer. Tema ile mekanik aynı şeyi söyler.

### 6.5 Orta sayı = rekor (`En Büyük Sayı`)

Jeneratör almak için para birimi **harcanır**, ama ekranın ortasındaki sayı harcanmaz:

```
        EN BÜYÜK SAYI
          1.23e456          ← rekor, asla düşmez (K3 garantisi)

      Kullanılabilir: 8.4e455
      Hane/sn:        1.2e12
```

Eski temada "en yüksek kütle" tuhaf bir istatistikti. Yeni temada **rekor oyunun
amacıdır** — kural değil, temanın zorunlu sonucu. Harcama şakası kendi kendine yazılır:
*"Büyük sayı yazmak için büyük sayı gerekir. Sayından harcadın. Sayı azaldı. Bu normal."*

### 6.6 Manuel buton: sadece `+1`

Eski `YUT!` → yeni buton **`+1`**, süslemesiz. `TREE(3)` seviyesinde de hâlâ `+1` yazar:

> **SİCİL:** Hâlâ basıyorsun.

ADR-0077 K3'te *gösterim* olarak reddedilen fikir, *buton* olarak oyunun kalıcı
şakasına dönüşür. Oyuncu onu bırakmaz, çünkü bırakmak pes etmek gibi hissettirir.

### 6.7 Yazma hızı ve prestij

- `Çekim Hızı (Hz)` → **`Yazma Hızı` (`Hane/sn`)**. Aynı mekanik, aynı eğri; tick
  altyapısı olduğu gibi korunur.
- `SP` → **`Tanım`**. Prestij = **notasyon atlama**: oyuncu daha hızlı sayı değil,
  daha güçlü **ifade biçimi** satın alır.

### 6.8 Somut ekran örnekleri

**Basamak 1** — klasik:
```
EN BÜYÜK SAYI  4.82e57        (+1)
Parmaklar       1.0e3 /sn
Çentik          1.4e5 /sn  →  Parmaklar'ı besliyor
Hane/sn: 2.1e6
```

**Basamak 3** — yükseklik:
```
EN BÜYÜK SAYI  10^^4.27
Kule Vinci      x1.8/sn
Süperbilgisayar x3.2/sn  →  Kule Vinci'yi besliyor
Kullanılabilir kat: 3.84
```

**Basamak 6** — tanım:
```
EN BÜYÜK SAYI  TREE(3) ↑↑ 1.47
Teorisyen      +0.004 tanım/sn
Tutarlılık     %78        ⚠ %20'nin altına inerse çöküş
```

### 6.9 Pragmatik kesim (kapsam kararı)

11 basamağın hepsine ayrı jeneratör sistemi yazmak = 11 ayrı oyun. Karar:

| Basamak | Kapsam |
| :-- | :--- |
| 1-4 | **Gerçek jeneratör merdiveni** (13'ün 11'i). Dengelenir, cilalanır. |
| 5 | Koleksiyon sistemi (yeni ama küçük) |
| 6-11 | **Tek ortak sistem**: `Teorisyen` + Tutarlılık. Basamak başına yeni jeneratör yok, yalnız eşik ve isim. |

### 6.10 Mevcut koda eşleme

| Değişen | Değişmeyen |
| :--- | :--- |
| `dimension_identity.ts` isimleri (8 satır) | Tüm üretim/eğri matematiği |
| `YUT!` → `+1` (tek buton) | Otobuyer mantığı |
| `Hz` → `Hane/sn` (etiket) | Tickspeed formülü |
| `SP` → `Tanım` (etiket) | Prestij hesaplaması |
| Orta sayı = rekor (yeni getter) | Save şeması (yeni alan gerekmez) |
| Basamak 2-4: parametreli para birimi | Motor (Decimal/loop/save) |

Üretim çarkı için toplam iş birkaç gün; asıl iş **notasyon çarkında** (yani `format()`
katmanında ve `Giant` tipinde), `mass` hesabında değil.

### 6.11 Hücre modeli ve süreklilik

`mag` **bir sayı değil, kadrandır.** Her hücrede `[2.00, 10.00)` arasında döner ve
**asla büyümez**. Oyunun sonunda da 2→10'dur, başında da.

```
mag:  2.00 → 3.00 → 4.00 → … → 9.99 → 10.00
                                          ↓
                              mag = 2.00, ok++
```

| Katman | Değer | Sınırlı mı |
| :--- | :--- | :--- |
| `mag` | 2.00 → 10.00 | ✅ 8 birim, sabit |
| `ok` | 1 → 6 | ✅ sabit tavan |
| `çapa` | 11 isim | ✅ sabit liste |
| **Sayı** | sınırsız | ❌ büyür |

**Hücre içi yürüyüş** (`10 ^^ x` örneği):

| Ekranda | Gerçek değer |
| :--- | :--- |
| `10 ^^ 2.00` | 10.000.000.000 |
| `10 ^^ 3.00` | 10^(10^10) |
| `10 ^^ 4.00` | 10^(10^(10^10)) |
| `10 ^^ 10.00` | 10 katlı kule |

**Süreklilik özdeşliği.** Hücreler kusursuz birleşir, çünkü:

> `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a`  (∀n, çünkü `a ↑ⁿ 1 = a`)

```
10 × 10.00 = 100      ═  10 ^  2.00 = 100
10 ^ 10.00 = 1e10     ═  10 ^^ 2.00 = 1e10
10 ^^ 10.00 = 10^^10  ═  10 ^^^ 2.00 = 10^^10
10 ^^^ 10.00          ═  10 ↑↑↑↑ 2.00
```

Bu yüzden `mag` **2'den** başlar, 1'den değil. Özel durum, yama, düzeltme yok.

**Fraksiyonel kule sorunu.** `10^^1.47` matematiksel olarak tanımlı değildir; kesirli
tetrasyon keyfî bir interpolasyon gerektirir. Biz böyle bir iddiada bulunmuyoruz — `1.47`
bir **ilerleme göstergesidir**, üs değil. Ekranda yıldızla işaretlenir:

```
TREE(3) ↑↑ 1.47*
```
> `*` Kesirli kule diye bir şey yok. Uydurduk. Çalışıyor. — SİCİL

Böylece topluluğun "bu sahte" eleştirisi, oyunun kendi ağzından yapılmış olur.

**Okunma garantisi.** Oyuncu hep aynı boyutta bir sayı okur (`3.21`, `1.47`, `9.10`),
yalnız solundaki isim değişir. Bu yüzden 11 basamak boyunca hareket hızı aynı
hissettirir — halbuki sayı `1e57`'den `TREE(3)`'e çıkmıştır.

**Save.** İki alan: `rank` (hücre indeksi) + `mag`. Aritmetik yok, taşma yok.

### 6.12 Motor geçiş sahnesi (tier 3 → 4)

Kadran devreye girdiği an. Mekaniği öğreten, gerekçelendiren ve şaka yapan tek sahne:

```
[ 10^^1.79e308 — break_eternity tavanı. Sayı titrer, sonra durur. ]

SEN:    Sayı hesaplanmıyor artık.

SİCİL:  Hesaplanmıyor.

SEN:    Ee? Ne yapacağım?

SİCİL:  Bundan sonra kadrana bakacaksın.

SEN:    Kadran neyi ölçüyor?

SİCİL:  Seni.

[ Ekran 10 ↑↑↑ 2.00 gösterir. Ok sayısı 3'e çıkmıştır. ]
```

**Kural:** bu sahne **zorunlu**dur ve atlanamaz. Çünkü aynı anda üç iş yapıyor:
gösterimin neden değiştiğini açıklıyor, yeni mekaniği öğretiyor, ve oyunun en iyi
şakalarından birini kuruyor.

### 6.13 Tetikleme tablosu

| Sınır | Örnek | Tetik | Neden |
| :--- | :--- | :--- | :--- |
| `mag` adımı | `4.20 → 4.21` | otomatik | Akış bozulmasın |
| **Ok yükselmesi** | `↑↑ 10.00` → `↑↑↑ 2.00` | **otomatik** | 15 dk'da bir ödül; oyuncuyu kesme |
| **Çapa değişimi** | `10 ↑↑↑↑↑↑ 10` → `G ↑↑ 2` | **manuel buton** | Prestij bir karardır, sürpriz değil |
| Motor geçişi | tier 3 → 4 | manuel + sahne | Tek seferlik anlatı anı |
| `LNGN` | son | manuel, tek | Final |

**Zaman karışımı:** ilk çapa değişimi zorunlu manuel; bir kez yapıldıktan sonra
**"otomatik yükselt"** seçeneği açılır (varsayılan kapalı). İlk seferin draması korunur,
11 kez butona basma işkencesi doğmaz.

**Ekran:**

```
        EN BÜYÜK SAYI
       10 ↑↑↑↑↑↑ 7.42

    Birikim: +3.8            ← çapa primi hazırlanıyor

    ┌──────────────────┐
    │     YÜKSELT      │  →  G ↑↑ 2.00
    └──────────────────┘

    ⚠ Sonraki çapa: Graham sayısı
```

**Birikim.** Çapanın son ok hücresinde `mag` 10'u aşabilir; aşan kısım `Birikim` olarak
birikir ve çapa primini büyütür → "şimdi mi, biraz daha mı" gerilimi. Beklemenin fırsat
maliyeti için tavan aşımında üretim verimi düşer (oran dengede belirlenecek).

**Riski ve önlemi.** Manuel tetiklemenin tek tehlikesi oyuncunun basmayı unutması.
Önlemler: buton belirdiğinde SİCİL konuşur (*"Hazır. Basmıyorsun."*), buton nabız atar,
ilk sefer zorunlu sahne, ve `Birikim` geç basmayı cezalandırmaz — yalnız fırsat kaçırtır.

---

## 7. Açık Yazım İşleri

- [ ] Eşik başına 5 varyant (toplam 55 satır) — `script.ts`
- [ ] Ticker havuzunu ~29 satırdan ~250 satıra çıkar (`news.ts`)
- [ ] Başarım adlarını SİCİL'in dosyalama diline çevir (`achievements.ts`)
- [ ] "Eski Kayıtlar" arşiv metinleri
- [ ] Mizah yoğunluğu ayarı (kapalı / ölçülü / tam) — UI
- [ ] Oyun adı kararı (ADR-0077 O1)
- [ ] `GAME_DESIGN.md` başlığı ve `project-brief.md` yeniden yazımı (onay sonrası)

**Üretim modeli (§6) açık işleri:**
- [ ] 13 jeneratörün isim + lezzet metni onayı (ör. `Matematikçi` mi `Araştırmacı` mı)
- [ ] Para birimi parametreleştirme tasarımı (basamak 2-4 için `{ad, birim, kaynak}`)
- [ ] `En Büyük Sayı` rekor getter'ı — mevcut save şemasında yeni alan gerekiyor mu, doğrula
- [ ] Basamak 5 "koleksiyon" sisteminin tanımı (isim kartları nasıl toplanır)
- [ ] Basamak başına 5 dakikalık üretim döngüsü süresi — denge bandı (ADR-0033 §3 ile uyum)

