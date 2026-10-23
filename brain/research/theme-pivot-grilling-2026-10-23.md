# TEMA PİVOTU — GRILLING OTURUMU TAM KAYDI (2026-10-23)

> **Amaç:** "Kozmik Oburluk" → `Hold That Number` pivotunun soru-cevap oturumunda kilitlenen
> kararlarını, gerekçelerini, açık maddelerini ve **devam edilecek soruyu** tek yerde tutmak.
> **Durum:** ▶️ oturum açık (2026-10-23 · **38 karar kilitli**) — **devam noktası §6** (sıra kodda).
> **İlgili:** [ADR-0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) ·
> [narrative-voice.md](../context/narrative-voice.md) ·
> [number-ladder-script-2026-10.md](number-ladder-script-2026-10.md) ·
> [theme-pivot-open-questions-2026-10.md](theme-pivot-open-questions-2026-10.md)
> **Kod durumu:** hiçbir `.ts` / `.vue` dosyası değişmedi. Bu oturum yalnız **karar** üretti;
> `npm run build` gerekmedi.

---

## 0. Bu belge nasıl okunur

Üç kullanım biçimi var:

| Durum | Nereden başla |
| :--- | :--- |
| **Oturuma devam** | §6 — orada tek bir soru ve üç seçenek var |
| **Bir kararı değiştir** | §2 — kimliğiyle bul (`S5`, `E2`…), sonra §3-§4 etkilerini kontrol et |
| **Yeni ajan / yeni oturum** | §0 → §1 (protokol) → §2 (kararlar) → §10 (sözlük) |

**Karar kimlikleri sabittir.** Bir kararı tartışırken kimliğiyle an: *"S5'i değiştirelim"*.
Kimlikler yeniden numaralanmaz; iptal edilen bir karar silinmez, **❌ iptal** olarak işaretlenir.
Bu belge kararların *tutarlı* hâlini tutar, tarihçesini değil — tarihçe §9'da.

---

## 1. Protokol — bu soru-cevap nasıl işledi

Oturum **grilling** modunda yürüdü: kullanıcıya tek tek soru sormak, her soruda bir öneri
sunmak, cevabı beklemeden sonraki soruya geçmemek. Amaç, tek bir "evet"le kapanmayacak
tasarım kararlarını bağımlılık sırasına göre çözmek.

### 1.1 Roller

| Rol | Kim | Ne yapar |
| :--- | :--- | :--- |
| **Karar verici** | Proje sahibi (kullanıcı) | Her sorunun cevabı. Hiçbir karar ajan tarafından "varsayılan" olarak kapatılmaz |
| **Sorgulayıcı** | Ajan | Soruyu kurar, seçenekleri ve her seçeneğin *sonucunu* yazar, birini önerir |
| **Araştırmacı** | Ajan | Olguları kendisi bulur (kod, dosya, internet) — olgu sorusu sorulmaz |
| **Kâtip** | Ajan | Her turda kilitlenenleri özetler; oturum sonunda bu belgeyi yazar |

### 1.2 Kurallar

| # | Kural | Neden |
| :-- | :--- | :--- |
| 1 | **Tek soru, tek cevap** | İki soru aynı anda sorulursa cevap yarım kalır ve karar kaydı bulanır |
| 2 | **Her soruda öneri + gerekçe** | Boş seçenek listesi karar vermeyi zorlaştırır; ajan bir tavsiye vermek zorunda |
| 3 | **Olgu ≠ karar** | Kodda/repoda/internette bulunabilecek şey **araştırılır**, sorulmaz (ör. AD'nin süresi) |
| 4 | **Kod yazılmaz** | Kararlar oturmadan hiçbir dosyaya dokunulmaz; oturum boyunca 0 kod değişikliği |
| 5 | **Çelişki itiraf edilir** | Kullanıcı iki turda çelişen şey söylerse ajan masaya koyar (bkz. §9, T14-T17) |
| 6 | **Öneri geri alınabilir** | Ajan kendi kuralını savunamazsa kaldırır (bkz. `E2`, %5 kuralının iptali) |
| 7 | **Karar kaydı her turda** | Cevap ne olursa olsun, o ana kadar kilitlenenler listelenir |
| 8 | **Kapsam ayrımı** | Karar → `brain/decisions/` · tasarım gerekçesi → `brain/research/` · görev → `brain/tasks/` |

### 1.3 Tur döngüsü

```
1. Karar kaydı      →  o ana kadar kilitlenenler (kısa liste)
2. Soru             →  tek soru, numaralı, bağlamıyla
3. Seçenekler       →  A / B / C, her birinin SONUCU yazılı
4. Öneri            →  "benim önerim: X" + neden
5. DUR              →  kullanıcı cevabı gelmeden ilerleme yok
```

Cevap geldiğinde döngü başa döner; cevap bir önceki kararı geçersiz kılıyorsa bu açıkça
söylenir ve belgeye "✏️ değişti" olarak işlenir.

### 1.4 Bu oturumda fiilen çalışan üç mekanik

- **Araştırma zorunluluğu.** Üç kez kullanıldı: AD/Cookie Clicker süreleri (HLTB), büyük sayı
  kütüphanelerinin gerçek tavanları (`OmegaNum`, `ExpantaNum`), ve mevcut kodun iddiaları
  (`news.ts` 29 satır mı, `data-corruption` kaç dosyada). Üçünde de dokümanın sayısı yanlış çıktı.
- **Öneri geri alma.** "%5 harcama kuralı" ajan tarafından önerildi, kullanıcı "alım kendini
  finanse ediyor" diye itiraz etti, kural **iptal edildi** ve yerine daha ucuz bir çözüm
  (mandal/latch) kondu. Bu, protokolün en sağlıklı çalıştığı an.
- **Çelişki masaya koyma.** Kullanıcı bir turda "20-25 saat çok uzun", üç tur sonra "20-25 saat
  az" dedi; ajan ikisini yan yana koyup gerçek isteğin ne olduğunu sordu (§9, T14-T17).

### 1.5 Ne yapılmadı

- Kod yazılmadı, dosya taşınmadı, bağımlılık eklenmedi.
- Hiçbir eski doküman **silinmedi** (ADR-0077 ve `narrative-voice.md` yerinde duruyor;
  geçersiz kısımları işaretlendi).
- Görsel dil konuşulmadı — kullanıcı bilinçli olarak ayırdı (`A1`).

---

## 2. Karar günlüğü

Her karar: **ne soruldu → ne seçildi → neden → neyi değiştirir.**

### 2.1 P — Pivot ve kimlik

#### P1 — Tema pivotu onaylandı
- **Soru:** "Kozmik Oburluk" teması gerçekten bırakılıyor mu?
- **Seçilen:** ✅ Evet. Pivot onaylandı; oburluk teması oyundan çıkıyor.
- **Gerekçe:** (a) gözlemlenebilir evrenin kütlesi ~`1.5e56 g`; oyuncu ilk duvara varmadan ~10²⁵²
  evren yutuyor, yani gram `1.79e308`den sonra ölçü değil süs; (b) Akt II (Rayo → LNGN) bir
  *tanımlama* merdiveni — "evreni yiyen tekillik" bunu motive edemez, "en büyük sayıyı merak
  eden insan" eder; (c) `1.79e308` her incremental oyunun en yüksek bırakma noktası ve mevcut
  tasarımda kutlanmıyor.
- **Etki:** ADR-0077 "Önerildi" → "Kabul edildi". Sonraki 28 karar bu kararın altına düşer.

#### P2 — Oyun adı: `Hold That Number`
- **Soru:** Yeni oyunun adı ne?
- **Elenen adaylar:** `Bir Sayı Tut` (Türkçe çift anlam: *sayı seç* / *sayıyı elinde tut*) → dil
  İngilizceye dönünce düştü; `Son Sayı` → oyun tam tersini söylüyor, isim mekanik hakkında yalan
  olurdu; `Kâğıt Yetmiyor` → defter/nesne kararı (`S9`) sonrası olmayan bir motife atıf.
- **Seçilen:** ✅ `Hold That Number` — "hold that thought" deyiminin bozulması: *"dur, o sayı bitmedi."*
- **Gerekçe:** Türkçedeki çift anlamı (tut = bekle / elinde tut) koruyan tek İngilizce aday; hiçbir
  lore vaat etmiyor, hiçbir nesne gerektirmiyor; isim zaten oyunun ilk şakası.
- **Etki:** `package.json`, `<title>`, ikon, auth uygulama adı, Firestore projesi (S13).

#### P3 — Dil: her şey İngilizce
- **Soru:** İsim İngilizce oldu; ekrandaki metinler de İngilizce mi?
- **Seçilen:** ✅ Her şey İngilizce. Metinler **doğrudan İngilizce yazılır, çevrilmez**.
  Türkçe sonradan eklenebilir (söz verilmez).
- **Gerekçe:** (a) janranın keşif kanalı r/incremental_games, dil İngilizce; (b) sessiz metanın gücü
  kelime oyunundan değil **oyuncuyu bilmesinden** geliyor — bu dil-nötr; (c) sesi iki kez yazmak
  (önce TR, sonra EN) en pahalı parçayı iki kez üretmek olurdu.
- **Risk:** Türkçe mizahın kendine has tadı kayboluyor; İngilizce metin "çeviri kokarsa" A
  seçeneği C'den daha pahalıya gelir. `A8` bu yüzden açık.

#### P4 — Eski tema silinir
- **Soru:** ~486 satır oburluk metni, 83 dosya, `--feast` paleti ne olacak?
- **Seçilen:** ✅ **Sil.** Arşiv yok, müze yok, "Eski Kayıtlar" yok.
- **Gerekçe:** Temiz kimlik; yeni oyuncu hiçbir kalıntı görmez. Arşiv seçeneği (B) sessiz metayı
  zorlardı — oyun kendi geçmişinden bahsetmeye başlarsa "ben bir oyunum" kapısı aralanır.
- **İstisna:** `brain/decisions/` **silinmez** — ADR bir karar kaydıdır, içerik değil.
- **Etki:** `--feast` paleti (9 dosya / 40 referans) ve `data-corruption` (2 dosya) kalkıyor;
  yerine ne geleceği `A1`de açık.

#### P5 — Eski save'ler silinir
- **Soru:** 40 saatlik eski temalı save ne olacak?
- **Seçilen:** ✅ Sert temizlik. Sürüm artırılır, eski kayıt "uyumsuz" denir.
- **Gerekçe:** Pivot hem temayı sildi hem ekonomiyi değiştirdi (8 boyut → 13 jeneratör, `mass` →
  sayı). Eski save yüklenemez — teknik olarak da, anlam olarak da. Veda ekranı da yok, çünkü
  arşiv reddedildi (P4).

### 2.2 V — Ses

#### V1 — `SİCİL` iptal
- **Soru:** Konuşan kim? (A) gerçek bir kurum, (B) evrenin kayıt protokolü, (C) kurum gibi görünen
  tek varlık?
- **Kullanıcının cevabı:** *"Aslında oyunun kendisi — ben adına SİCİL demedim, önceki agent öyle
  dedi. Oyun bizimle konuşuyor; mizahı absürt ve ironik olacak."*
- **Seçilen:** ❌ `SİCİL` reddedildi. Konuşan **oyunun kendisi**. Kurum, karakter, lore yok.
- **Etki:** ADR-0077 K1 ve `narrative-voice.md` §1 (SİCİL tablosu, 11 basamaklık karakter yayı)
  geçersiz. `O2` (sistemin adı) tamamen iptal.

#### V2 — Sessiz meta
- **Soru:** Oyun kendisinin oyun olduğunu ne kadar biliyor?
- **Seçilen:** ✅ **B — sessiz meta.** Oyun olduğunu bilir, **asla söylemez**. Absürtlük dünyada
  değil **ilişkide**: oyun oyuncunun ne yapacağını, ne kadar bekleyeceğini, "+1'e yine bastığını" bilir.
- **Reddedilen:** (A) tam meta — 85 saatte tükenir, ayrıca "nasılsa oyun" mazereti büyünün yarısını
  yer; (C) iki katman (oyun + alay ettiği sahte anlatı) — SİCİL sorununa geri döner.
- **Bağlı karar:** 11. basamakta ses **bir kez ciddileşir** (`V6`).

#### V3 — Muhatap: gerçek "sen"
- **Soru:** Oyunun "sen"i kurgusal bir karakter mi, ekranın karşısındaki kişi mi?
- **Seçilen:** ✅ **A — gerçek sen.** Kurmaca aracı yok.
- **Kural:** Oyun yalnızca **kendi içindeki** veriyi kullanabilir: tıklama sayısı, oynama süresi,
  saat, aktif sekme, kayıt geçmişi. Oyun dışı hayata dair çıkarım **yasak** ("işe geç kaldın" gibi) —
  aksi halde ironi gözetlemeye dönüşür.
- **Etki:** Senaryodaki `SEN:` replikleri olduğu gibi kullanılamaz (gerçek oyuncu senaryoda
  konuşamaz) → `V5` doğdu.

#### V4 — Kanallar
- **Soru:** Ses nerede ve ne zaman konuşur?
- **Kullanıcının cevabı:** *"Başarımlarda, haber kısmında ve bazı açıklama kısımlarında kendi tarzını
  katacak"* + sonra *"bu benim dediklerim ve senin B önerin"* → sahne katmanı da kabul edildi.
- **Seçilen:** ✅ **Sahne · ticker · başarım · açıklama.**
- **Sınır:** Tooltip ve sayısal etiketler **asla** şaka yapmaz — mekanik bilgiye güven zorunlu.
- **Etki:** `news.ts` (29 satır → ~400 satır) projenin en yüksek getirili mizah yüzeyi.

#### V5 — Tek ses, çift ritim
- **Soru:** Sahnede oyuncu konuşuyor mu?
- **Seçilen:** ✅ **B — tek ses, çift ritim.** Oyun hem oyuncunun düşündüğünü hem cevabı söyler:
  > **Bitti.** 1.79e308. Bundan sonrası yok.
  > **Var.**
- **Gerekçe:** Eski senaryonun şakası "oyuncunun tekrar eden yanılgısı" üzerine kuruluydu; o
  yanılgıyı oyuncuya söyletmek gerekmiyor — oyunun onu **bilmesi** yeterli. `SEN:` satırları
  silinmez, **oyunun ağzına devredilir**.
- **Reddedilen:** (A) tek ses düz cümle — ritim kaybolur; (C) diyalog — `V3` iptal olur.

#### V6 — 11. basamakta ton kırılması
- **Karar:** 10 basamak ironi; 11. basamakta ses **bir kez** düz konuşur. Oyunun tek ciddi anı.
- **Gerekçe:** Eski tasarımın en iyi fikri (LNGN'de tek kelime) korunuyor, ama sahibi değişiyor:
  ödeme artık bir karakterin değil, **oyunun kendi sesinin** kırılması.

### 2.3 S — Yapı

#### S1 — Çıplak sayı
- **Soru:** 11 basamak anlatıda ne? Dosya mı, kayıt mı, defter sayfası mı?
- **Kullanıcının cevabı:** *"11 basamağın hepsi sayı; ortada sürekli artan bir sayı var."*
- **Seçilen:** ✅ **A — çıplak sayı.** Dosya/kayıt/arşiv dili yok. Her eşiğin bir **sahne başlığı**
  var (bölüm adı), o kadar.
- **Triyaj:** Eski 11 başlıktan 9'u kalıyor; `Evim` (8) ve `Son kayıt` (11) kurum dili taşıdığı için
  yeniden yazılacak.

#### S2 — Prestijde sayı `10`'a döner
- **Soru:** Prestijden hemen sonra sayı kaç? (A) `1`, (B) yeni basamağın tabanı, (C) taban ama
  eski tavanın altında?
- **Kullanıcının cevabı:** *"A olacak ama 10 başlangıç sayısı."*
- **Seçilen:** ✅ Sayı `10`'a döner. Klasik sıfırlama.
- **Görüntü kuralı:** "En basit yeterli biçim" — `10`, `1.2e5`, `1e308`, sonra basamağın notasyonu.
  Yani her prestijde oyuncu notasyon merdivenini baştan hızlıca tırmanır.

#### S3 — Çapa asla düşmez, eşikler mandallı
- **Soru:** Alım sayıyı düşürünce basamak/ok seviyesi geri gidebilir mi?
- **Seçilen:** ✅ Üç değişmez: (1) **çapa asla düşmez** (prestij tek yönlü), (2) **eşikler mandallı**
  (sahne/başarım bir kez tetiklenir), (3) **kadran serbestçe inip çıkabilir**.
- **Gerekçe:** Mandal, gösterim değil **olay** sorununu çözer: kule 12 → 11 → 12 olursa "Kule bitti"
  sahnesi ikinci kez oynamamalı. Bu, ajanın önerdiği "%5 harcama kuralı"nın yerine geçti (`E2`).

#### S4 — `LNGN` = oyunun sonu
- **Kullanıcının cevabı:** *"LNGN OYUNUN SONU DEMEK, yani oradan sonrası yok ve sıfırlanmayacak;
  eğer oyuncu sıfırlamak isterse kaydını sıfırlayacak."*
- **Seçilen:** ✅ Son. **Kuyruk yok, NG+ yok, "temel teori" sıfırlaması yok.**
- **✏️ Geri alınan karar:** Bu oturumun erken turlarında "kuyruk" (LNGN sonrası sonsuz prestij)
  seçilmişti; bu cevapla **iptal edildi** ve 15-20 saatlik bandın yerini 85 saatlik tek koşu aldı.
- **Tematik hediye:** `LNGN` (Large Number Garden Number) googolojide tanımlanmış en büyük sayı —
  oyun matematik bittiği yerde bitiyor. "Daha büyüğü yok" cümlesi hem doğru hem final.
- **Etki:** S10 ("LNGN sonrası") kapandı; final sahnesi yazılmalı (`A5`).

#### S5 — Süre: ~85 saat, ×1,25 eğri
- **Soru:** Oyun kaç saat?
- **Süreç:** 8-11 (A) → 6-8 (A2) → 20-25 (B) → kullanıcı "20-25 bile az" dedi → eğri seçenekleri.
- **Seçilen:** ✅ **~85 saat**, basamak süreleri **artan** geometrik eğri (×1,25), 1. basamak **2 saat**.
- **Gerekçe:** Kullanıcı "sayı büyüdükçe oyuncu bunu hissetmeli, sonraki basamağa geçmesi uzasın"
  dedi; sabit 2 saat (22 saat toplam) reddedildi. ×1,25, Cookie Clicker medyanına (92,5 saat) yakın
  ama AD/NGU/Melvor'un boşluk tuzağına girmiyor.
- **Etki:** `T2` kadran hızı bu eğriden türetilecek; ADR-0075'in "8-11 saat" bandı anlam değiştirir.

#### S6 — Offline ilerleme, 12 saat tavanlı
- **Soru:** Oyun kapalıyken ilerliyor mu?
- **Seçilen:** ✅ **A — sınırlı offline.** Üretim devam eder, 12 saatte tavan yapar.
- **Gerekçe:** 85 saatlik oyunda uyuyan oyuncuyu cezalandırmak düşmanca; ama bir hafta kapatıp
  gelince oyunu atlamış olmak da oyunu anlamsız kılar.

#### S7 — Kapsam: 5 sistem + 4 kural
- **Soru:** 11 basamağın kaçı gerçekten farklı mekanikle oynanacak?
- **Kullanıcının cevabı:** *"B ve C hibriti, ortası olsun."*
- **Seçilen:** ✅ 1 çekirdek jeneratör merdiveni (1-4) + koleksiyon (5) + ortak motor (6,7,8,10,
  her birinde **bir yeni kural**) + **ayrı sistem** 9 ("Kapı") ve 11 (final).
- **Gerekçe (aritmetik):** ×1,25 eğrisinde oynanışın **%81'i** 6-11. basamaklarda geçiyor; dokümanın
  §6.9'u burayı tek sisteme indiriyordu — 68 saat boyunca aynı kural demek olurdu. Yeni *motor*
  pahalı, yeni *kural* ucuz: hibrit, pahalı olanı iki yere koyuyor.

#### S8 — Ok aralığı 3 → 6
- **Soru:** Bir basamakta kaç ok olmalı?
- **Seçilen:** ✅ **3 → 6**, ekranda **`↑⁶`** gibi sayıyla (tekrarlayan oklarla değil).
- **Gerekçe:** 1-2 ok zaten basamak 1-3'te kullanıldı; 6'dan sonra "kaç ok" sorusunun cevabı bir
  *sayı* olur (Graham sayısında ok sayısı `g₁`), yani ok saymak anlamsızlaşır → isimler devralır (5. basamak).
- **Düzeltme:** Doküman §1 "1000 ok", §6.11 "ok 1→6" diyordu — çelişki 6 lehine kapatıldı.

#### S9 — Nesne yok, `+1` gerçek
- **Soru:** Oyuncunun elinde bir nesne var mı (defter, kalem, masa)? Ve `+1` butonu ne yapıyor?
- **Kullanıcının cevabı:** *"Oyun içinde gerçekten +1 butonu olacak ve basınca gerçekten +1 ekleyecek;
  ama üst basamaklarda bu anlamsızlaştığı için buton işlevsiz gibi olacak. İleride biri basmaya devam
  ederse gizli başarım ve onunla dalga geçme."*
- **Seçilen:** ✅ Nesne **yok**. `+1` gerçek: gerçekten 1 ekler. Üst basamaklarda **gösterim
  çözünürlüğünün altında** kaldığı için ekranda hiçbir şey değişmez — bu yalan değil, yuvarlama.
- **Gerekçe:** Sessiz metada oyunun elinde kalan tek şey **sayı ve sen**; araya bir nesne koymak bu iki
  şey arasındaki gerilimi seyreltir. Ayrıca `+1`in anlamını açıklamak, şakayı öldürür.
- **Devamı:** Gizli başarım eşikleri (ör. 100 / 1.000 / 10.000 anlamsız basış) mekanik dalında
  netleştirilecek; her eşikte bant bir kez konuşur.

### 2.4 E — Ekonomi

#### E1 — Cüzdan = sayının kendisi
- **Soru:** Cüzdanda ne var? (A) notasyonun en üst parametresi (üs/kat/ok), (B) sayının kendisi?
- **Kullanıcının cevabı:** *"Direkt sayının kendisi olsa ya cüzdan."*
- **Seçilen:** ✅ **B.** Her basamakta aynı şeyi harcarsın: sayıyı.
- **Sonuç:** Dokümanın "para birimi değişir (Sayı→Üs→Kat→Ok)" fikri **düştü** — artık kozmetik
  bir etiket. Basamakları ayıran üç şey kaldı: **notasyon, jeneratör, kural**.

#### E2 — Tek havuz, alım düşüşü serbest
- **Soru:** Alım yapınca ortadaki sayı düşüyor mu?
- **Süreç:** Ajan önce "tek havuz + %5 sınırı" önerdi; kullanıcı itiraz etti: *"zaten sayılar sürekli
  arttığı için aldığı şeyin parasını daha kısa sürede çıkarıyor"*. Ajan kuralı **iptal etti**.
- **Seçilen:** ✅ Tek havuz, düşüş serbest (AD / Cookie Clicker modeli). Yerine `S3` (mandal) geldi.
- **Araştırma:** Janrada iki okul var — "tek sayı" oyunları (Cookie Clicker, AD, Clicker Heroes) tek
  havuz kullanır; "çok sistemli" oyunlar (Trimps, Melvor, Universal Paperclips) ayrı havuzlar kullanır.
  Biz tek sayı oyunuyuz.

#### E3 — Jeneratörler zincir
- **Soru:** Jeneratörler birbirini besliyor mu?
- **Seçilen:** ✅ **B — zincir.** Her jeneratör bir üsttekini besler; `+1` zincirin kökünde (Parmaklar).
- **Gerekçe:** Zincir, "sayı neden bu kadar hızlı büyüyor?" sorusunun cevabı; ve temanın temeli —
  Abaküs toplama yapar, Kalem üs yazabilir, Bilgisayar astronomik ölçeği işler. Hiyerarşi mekanikle
  aynı yere oturuyor.
- **Yan getiri:** 85. saatte `+1`'e basmak hâlâ zincirin köküne dokunmaktır — şaka ile mekanik aynı.

#### E4 — `Birikim`: prestij zamanlaması
- **Soru:** Prestij ne zaman yapılır? (A) sadece kapıda, (B) kapıdan sonra biriktirerek, (C) otomatik?
- **Seçilen:** ✅ **B.** Kapı aşıldıktan sonra birikim `Tanım` ödülünü büyütür, ama üretim verimi düşer.
- **Gerekçe:** "Şimdi mi, biraz daha mı?" janranın en tatmin edici kararı; aşırı bekleyen cezalanır.
- **Açık:** Verim düşüş eğrisi ve ödül çarpanı (`A3`).

#### E5 — Zincir basamak içinde akar; 1. basamak 7-8 halka
- **Soru:** Zincir hangi yöne akıyor ve basamak başına kaç jeneratör var? (`A2`)
- **Araştırma (olgu, karar değil):** Senaryo §6.3'ün dağılımı dengesiz — 1. basamağa **7**
  (Parmaklar · Çentik · Abaküs · Kalem · Hesap Makinesi · Bilgisayar · Süperbilgisayar), 2/3/4/5'e
  **birer**, 6-11'e bir (`Teorisyen`). Ayrıca kodda "1 paket al → sonraki boyut açılır" zinciri zaten
  var (`ADR-0076`), yani **A'nın motoru kurulu**; B, bu zinciri 8'den 13'e uzatmak olurdu.
- **Kullanıcının cevabı:** *"daha ilk basamak doğru düzgün planlandı, diğer basamaklar sırası gelince
  daha fazla jeneratör veya farklı şeylerle ilerleyecek; şu an ilk basamak için 7 veya 8"*
- **Seçilen:** ✅ **A — zincir basamak içinde akar.** Alt halka üsttekini besler, **en üst halka sayıyı
  üretir**, `+1` zincirin köküdür; basamak geçişinde zincir **yeniden kurulur**, biten zincir "temel"
  olarak kalıcı çarpan verir.
- **Denge itirazı reddedildi:** basamakların eşit dolması gerekmiyor. Her basamak **kendi turunda**
  tasarlanır; 2-11'in listelerinin bugün boş olması bir eksik değil, **bilinçli sıralama** (1. basamak
  oynanabilir olduğunda geri kalanı ölçümle yazılır). Bu, `S7`'nin "5 sistem + 4 kural" kesimiyle aynı
  yönde.
- **1. basamak:** **7-8 halka**. 2 saat ÷ 8 halka ≈ **15 dk/halka** (bugünkü ölçülen ~4 dk/halkaya karşı
  kasıtlı 3-4× yavaşlama — `S5`).
- **Etki:** `A2` kapandı; 8. halkanın kimliği `A10` olarak açıldı; `A3` hâlâ sırada.

#### E6 — Zincir yönü: Parmaklar tepede, her halka bir üsttekini üretir
- **Soru:** (`A10`) 8. halka `Matematikçi` mi, ve zincir hangi yöne akıyor?
- **Kullanıcının cevabı:** *"A olacak ama en tepedeki jeneratör Parmaklar olacak; diğer jeneratörler
  kendinden bir öncekini üretecek — işte AD'deki mantık."*
- **Seçilen:** ✅ **A + yön düzeltmesi.** `Matematikçi` 1. basamağın 8. halkası. Zincir **aşağıdan
  yukarı** besler: halka *n+1*, halka *n*'i üretir; **halka 1 (`Parmaklar`) sayının kendisini üretir**.
  Ekranda liste yukarıdan aşağı `Parmaklar → … → Matematikçi` okunur, üretim **aşağıdan yukarı** akar.

- **Gerekçe:** AD kanonu (D8→D7→…→D1→antimadde) ve senaryo §6.8 zaten böyle yazılmış
  (*"Çentik → Parmaklar'ı besliyor"*, *"Süperbilgisayar → Kule Vinci'yi besliyor"*).
- **✏️ Düzeltme (önceki tur):** sohbette verdiğim dağıtım tablosunda oku ters yazmıştım
  (`Parmaklar → Çentik`); doğrusu budur. `E5`'in "alt halka üsttekini besler" ifadesi doğruydu ama
  numaralandırma belirsizdi — artık **halka 1 = ekranın en üstü = `Parmaklar`**.

  | Halka | Jeneratör | Ne üretir |
  | --: | :--- | :--- |
  | 1 | Parmaklar | **sayı** (`+1` bunun el versiyonu) |
  | 2 | Çentik | Parmaklar |
  | 3 | Abaküs | Çentik |
  | 4 | Kalem | Abaküs |
  | 5 | Hesap Makinesi | Kalem |
  | 6 | Bilgisayar | Hesap Makinesi |
  | 7 | Süperbilgisayar | Bilgisayar |
  | 8 | Matematikçi | Süperbilgisayar |

- **Sonuç:** sayı üretimi zincirin **en altındaki** (en pahalı) halkadan gelir; üst halkalar
  alttakilerin çıktısını çarpar. `+1` = elle `Parmaklar` — `S9` ile tutarlı (gerçekten 1 ekler,
  üst basamakta gösterim çözünürlüğünün altında kalır).
- **Varsayım (yanlışsa düzelt):** "Parmaklar tepede" kuralı **1. basamak zinciri** için kaydedildi;
  2+ basamakların tepesi `E5` uyarınca kendi turunda belirlenir.

### 2.5 T — Teknik

#### T1 — 1-4 gerçek aritmetik, 5-11 kadran
- **Soru:** Kadran (rank+mag) hangi basamakta başlar?
- **Araştırma:** `break_infinity` `1e1e308`, `break_eternity` `10^^1e308`, **`OmegaNum` `10{1000}9e15`**,
  **`ExpantaNum` `{10,9e15,1,2}`**. Yani 4. basamak (6 ok) hâlâ gerçek aritmetikle oynanabilir;
  Graham sayısı ise hiçbir sabit boyutlu temsile sığmaz (ok sayısı `g₁`).
- **Seçilen:** ✅ **B — kadran 5. basamakta başlar.** 1-4 `break_eternity` + `OmegaNum`, 5-11 kadran.
- **Gerekçe:** Geçiş tam olarak "hesaplama bitti, isimlendirme başladı" anına denk geliyor.
- **Bedel:** İkinci bir sayı kütüphanesi ve 4. basamak için ayrı denge eğrisi.

#### T2 — Kadran modeli
- **Karar:** `rank` (ok seviyesi) + `mag ∈ [2.00, 10.00)`. `mag` **asla büyümez**, her hücrede döner.
- **Süreklilik:** `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a` (çünkü `a ↑ⁿ 1 = a`) → hücreler kusursuz birleşir, yama yok.
- **Gerekçe:** `10 ↑³ 4.27` bir sayı değil, bir yazım. Hiçbir değişkende tutulamaz. Oyuncu sayıyı
  görür, motor sayacı tutar (saat: 14:37 gibi).
- **Denge:** Artık "saniyede kaç sayı" değil, **"bir hücre kaç dakika sürer"** tek parametre.

#### T3 — İçerik: ~400 satır
- **Soru:** Ticker kaç satır?
- **Seçilen:** ✅ **~400**: 220 basamak + 100 durum + 40 nadir + 40 başarım. **Bağlama duyarlı** seçim
  + nadirlik ağırlığı.
- **Gerekçe (aritmetik):** 250 satır ÷ 20 sn = **83 dakikada** başa döner; oyun 85 saat → aynı şaka
  ~60 kez. Bağlam (basamak, sayı aralığı, bekleme, tıklama, saat, sekme) aynı satırı binlerce farklı
  durumda anlamlı kılar.
- **Maliyet:** 400 × ~1,5 dk ≈ **10 saat yazım** — kod yazmaktan uzun sürebilecek tek parça.

#### T4 — Sessizlik bir replik
- **Karar:** Bant her 20 saniyede konuşmak zorunda değil; yalnız söyleyecek bir şeyi olduğunda konuşur.
- **Gerekçe:** Tekrar sorununu yarıya indirir; ve "susmak" bu sesin en güçlü hareketi (`V6`).

#### T5 — Görsel dil ertelendi
- **Kullanıcının kararı:** *"Yeni görsel dil için ayrı bir konuşma yapacağız."*
- **Durum:** ❌ Bu oturumda kararlaştırılmadı (`A1`). `--feast` paleti siliniyor, yerine ne geleceği belli değil.

---

## 3. Sayılar ve türetmeleri

### 3.1 Süre eğrisi (×1,25, 1. basamak 2 saat)

| # | Basamak | Süre | Kümülatif |
| :-- | :--- | ---: | ---: |
| 1 | `1.79e308` — Duvar sandım | 2,00 sa | 2,00 |
| 2 | `1e(9e15)` — Rafın sonu | 2,50 sa | 4,50 |
| 3 | `10^^1.79e308` — Kule bitti | 3,13 sa | 7,63 |
| 4 | `6 ok` — Ok bitti | 3,91 sa | 11,54 |
| 5 | `G` — Yazmadı, gösterdi | 4,88 sa | 16,42 |
| 6 | `TREE(3)` — Bilmiyoruz | 6,10 sa | 22,52 |
| 7 | `SSCG(3)` — Oda | 7,63 sa | 30,15 |
| 8 | `Rayo` — (başlık yeniden yazılacak) | 9,54 sa | 39,69 |
| 9 | `Fish 7` — Kapı | 11,92 sa | 51,61 |
| 10 | `BIG FOOT` — Geçerli mi? | 14,90 sa | 66,51 |
| 11 | `LNGN` — (başlık yeniden yazılacak) | 18,63 sa | **85,14** |

**Dağılım:** 1-5 = 16,4 saat (%19) · 6-11 = 68,7 saat (%81). Bu yüzden `S7` (arka altı basamak)
tüm projenin en pahalı kararı.

### 3.2 Hücre ve mag aritmetiği

| Birim | Tanım | Sayı |
| :--- | :--- | ---: |
| Çapa (basamak) | notasyon seviyesi | 11 |
| Hücre | bir ok seviyesi (`mag` 2→10 bir tur) | 6 / çapa |
| Mag adımı | kadranın 1 birimi | 8 / hücre |
| **Kadran basamakları (5-11)** | 7 çapa × 6 hücre | **42 hücre · 336 mag adımı** |
| Tüm merdiven kadran olsaydı | 11 × 6 × 8 | 528 mag adımı |

**Kadran bölgesi süresi:** 73,6 saat ÷ 42 hücre ≈ **1 saat 45 dk/hücre** ≈ 13 dk/mag adımı.

### 3.3 Janra benchmark'ı (HLTB)

| Oyun | Ana hikâye medyanı | Oy | Bırakma |
| :--- | ---: | ---: | ---: |
| Universal Paperclips | ~7 sa | — | — |
| **`Hold That Number` (plan)** | **~85 sa** | — | — |
| Cookie Clicker | 92 sa 30 dk | 70 | %13,7 |
| Antimatter Dimensions | 348 sa | 5 (!) | %11,5 |
| NGU Idle | 1591 sa | 99 | %15,6 |
| Melvor Idle | 1670 sa | — | — |

**Uyarı:** AD sayfasının üst kutusu ("837 Hours") sitenin özet widget'ı ve kendi içinde tutarsız
(ana hikâye 901 > toplam 837). Güvenilir sayı **oylama tablosunun medyanı**.

### 3.4 Kütüphane tavanları

| Kütüphane | Tavan | Bizde nerede |
| :--- | :--- | :--- |
| `break_infinity.js` | `1e1e308` | kullanılmıyor |
| `break_eternity.js` | `10^^1e308` | basamak 1-3 |
| `OmegaNum.js` | `10{1000}9e15` | basamak 4 (6 ok) |
| `ExpantaNum.js` | `{10,9e15,1,2}` | yedek / gerekirse |
| — | `G`, `TREE(3)`, `Rayo`, `LNGN` | **hiçbiri** — kadran zorunlu |

---

## 4. Geçersiz kalanlar

| Eski fikir | Nerede | Durum | Yerine ne geldi |
| :--- | :--- | :--- | :--- |
| `SİCİL` karakteri + 11 basamaklık yay | `narrative-voice.md` §1, ADR-0077 K1 | ❌ iptal | Oyunun kendi sesi (`V1`) |
| "Eski Kayıtlar" arşivi | ADR-0077 K5, senaryo §5 | ❌ iptal | Eski içerik silinir (`P4`) |
| Kuyruk / "temel teori" sıfırlaması | oturumun erken turları | ❌ iptal | `LNGN` = son (`S4`) |
| Para birimi değişimi (Sayı→Üs→Kat→Ok) | ADR-0077 K7 | ❌ iptal | Cüzdan = sayı (`E1`) |
| Kadran tier 4+ | ADR-0077 K8 | ✏️ değişti | Kadran tier 5+ (`T1`) |
| "Orta sayı her zaman artar" | ADR-0077 K3 | ✏️ değişti | Koşu içinde artar; prestijde `10` (`S2`) |
| `SEN:` replikleri | senaryo §2 | ✏️ devredildi | Oyunun ağzı (`V5`) |
| "1000 ok" eşiği | senaryo §1 | ✏️ 6 ok | `S8` |
| 250 satır ticker | senaryo §7 | ✏️ ~400 satır | `T3` |
| `1.79e308` = oyunun sonu | GAME_DESIGN, ADR-0075 | ✏️ 1. basamak | `S1`, `S5` |
| "%5 harcama kuralı" | ajanın önerisi (geçici) | ❌ iptal | Mandal kuralı (`S3`) |
| "13 jeneratör basamaklara dengeli dağılır" | senaryo §6.3 + ajan itirazı | ✏️ değişti | 1. basamak 7-8; diğerleri kendi turunda (`E5`) |

---

## 5. Açık maddeler

Her madde: **soru → seçenekler → ajanın önerisi → bloklayıcı mı.**

### A1 — Görsel dil
- **Soru:** Palet, tipografi, ekran estetiği ne olacak?
- **Seçenekler:** (A) bürokratik/kâğıt, (B) **saf sayı** (karanlık tuval + basamak başına vurgu rengi),
  (C) retro terminal.
- **Öneri:** B. Oyunun tek kahramanı sayı; ne kadar az şey varsa sayı o kadar büyük görünür.
- **Durum:** 🔴 Kullanıcı ayrı konuşma istedi. Karar verilmeden UI yazılmamalı.

### A2 — 13 jeneratörün listesi ve zincir yönü
- **Soru:** Zincir hangi yöne akıyor, her basamakta kaç jeneratör var?
- **Durum:** ✅ **kapandı** → `E5` (zincir basamak içinde; 1. basamak 7-8 halka; 2-11 kendi turunda).

### A10 — 1. basamağın 8. halkası kim?
- **Soru:** 1. basamak 7 halka mı, 8 halka mı? 8 ise 8. halka `Matematikçi` mi, başka biri mi?
- **Seçenekler:** (A) 8 halka, tepede `Matematikçi` · (B) 7 halka, `Matematikçi` 4/5. basamağa kalır ·
  (C) 8 halka ama 8. halka yeni bir jeneratör, `Matematikçi` köprü olarak kalır.
- **Öneri:** A — 1. basamak "hesaplamayı bıraktım, tanımlamaya geçtim" anıyla biter; 2. basamağın
  log-uzayı kuralı bu geçişin doğal devamı olur.
- **Durum:** ✅ **kapandı** → `E6` (A + "Parmaklar tepede, her halka üsttekini üretir").

### A3 — `Birikim` formülü
- **Soru:** Verim düşüş eğrisi ve ödül çarpanı ne?
- **Öneri:** Her 10 kat aşımda %10 verim düşüşü (çarpımsal); ödül `log10(1 + aşım)` ile büyür.
- **Araştırma:** Janra taraması §6.1'de (Cookie Clicker 1/3 · Prestige Tree 1/2 · Egg Inc 0,15 + tavan ·
  Clicker Heroes 1,5 · AD duvar tabanlı). Hiçbirinde bekleme cezası yok; fren eğri veya tavan.
- **Durum:** ✅ **kapandı** → `E7` (log ödül + %10/10× çarpımsal ceza; katsayılar simülasyonla).

### A4 — Mizah yoğunluğu ayarı
- **Soru:** Oyuncu sistemi susturabilmeli mi?
- **Öneri:** `kapalı / ölçülü (varsayılan) / tam` üç kademesi.
- **Durum:** 🟡 Ayar olmadan yayınlanmamalı (bazı oyuncular "sistem konuşuyor" mizahını sevmez).

### A5 — `LNGN` final sahnesi
- **Soru:** Son basamakta ne oluyor?
- **Öneri:** Tek cümle, ironisiz (`V6`); ardından ekran sadeleşir ve hiçbir şey olmaz.
- **Durum:** 🟡 En son yazılmalı; gerekirse basitleştirilir.

### A6 — Başarımlar (86) + meydan okumalar (13)
- **Soru:** Metinler yeniden mi yazılacak, mekanikler değişecek mi?
- **Durum:** 🟡 İçerik hacmi tahmin edilenden büyük; SİCİL diliyle yazılmışlardı.

### A7 — Müzik motoru
- **Soru:** Kozmik tema üzerine kurulu `src/core/music/*` ne olacak?
- **Durum:** 🟡 Yeniden yazım mı, uyarlama mı belirsiz.

### A8 — İngilizce metni kim yazacak
- **Soru:** 400 satırı kim yazıyor — proje sahibi mi, ajan mı, ikisi mi?
- **Neden önemli:** Ses bu oyunun ana varlığı; çeviri kokan mizah `P3`'ü anlamsız kılar.
- **Durum:** 🟡 Yazım dalgası başlamadan netleşmeli.

### A9 — Uygulama sırası
- **Öneri:** (1) gösterim katmanı (çapa/ok/büyüklük) → (2) iskelet ekonomi (13 jeneratör, prestij)
  → (3) metin dalgası (`script.ts` + `news.ts`) → (4) UI metinleri → (5) final sahnesi.
- **Durum:** ✅ **kapandı** → `E8` (dikey dilim: 1. basamak uçtan uca, sonra 2-11).

---

## 6. DEVAM NOKTASI — ▶️ tasarım kapandı, sıra kodda

**1. basamak spec'i tamam** (§11, `E7`–`E14`). Sıradaki adım **dikey dilim** (`E8`): 1. basamağın
uçtan uca çalışan hâli — ve `E9` uyarınca **proje sahibi "bitti" diyene kadar** sürer.

**Kod sırası:** (1) sayı ekonomisi (8 halka · 10 birim kilidi · sınırsız alım) → (2) prestij +
`Birikim` → (3) mini boost → (4) `+1` + 1. basamak ticker satırları. Görsel dil (`A1`) ve metin
sahipliği (`A8`) hâlâ açık; ilk iki adım bunlara bağlı değil.

**Açık maddeler:** `A1` görsel dil (ayrı konuşma) · `A4` mizah ayarı · `A5` LNGN finali ·
`A6` başarımlar/meydan okumalar · `A7` müzik · `A8` İngilizce metni kim yazıyor.

### 6.1 Janra taraması (A3 için, 2026-10-23) — kayıt

| Oyun | Eşik | Ödül | Bekleme cezası | Not |
| :--- | :--- | :--- | :--- | :--- |
| Cookie Clicker | 1e12 kurabiye | `⌊(N/1e12)^(1/3)⌋` cennet çipi | yok | her çip kalıcı +%1 CpS |
| The Prestige Tree | 10 puan | `(x/10)^0,5` | yok | ağaç çarpanları |
| Egg, Inc. | prestij kazancı | `∝ (min(x,1e12)/1e6)^0,15` | **tavan** (1e12) | "sık prestiji teşvik eder" |
| Clicker Heroes | boss 100+ | `⌊(((lvl−100)/5+1)/3)^1,5⌋` | yok | üs 1,5 |
| Antimatter Dimensions | 1,79e308 | duvara göre kuvvet yasası | yok | "Break Infinity" eşiği yükseltir |
| Synergism | 1e16 coin | elmas | yok | — |

**Üç bulgu:** (1) ortak reçete eşik + kuvvet yasası, üs 0,15–1,5; (2) bekleme cezası janrada yok —
fren eğriden veya tavandan geliyor; (3) bizde sıfırlama pahalı ve tema cezayı **açıklıyor**
(notasyon sayıyı taşımıyor) → ceza bizde süs değil, mekaniğin adı.

**Kural (kalıcı):** kuvvet yasası kullanılırsa **ceza üssü > ödül üssü** olmalı; log ödülde `p ≈ 0`
olduğu için her ceza yeterli. → Seçilen: `E7`.

---


## 7. Belge etkileri (uygulamada yapılacaklar)

| Belge | Ne yapılacak | Durum |
| :--- | :--- | :--- |
| `decisions/0077-…` | Durum "Kabul edildi" + geçersiz kalanlar tablosu | ✅ yapıldı |
| `decisions/README.md` | 0077 satırı yeni ad + durum | ✅ yapıldı |
| `tasks/in-progress.md` | Pivot bloğu "AKTİF" + oturum kaydı linki | ✅ yapıldı |
| `context/narrative-voice.md` | **Baştan yazılacak**: SİCİL → oyunun sesi, sessiz meta, gerçek "sen", tek ses çift ritim | ⏳ |
| `research/number-ladder-script-2026-10.md` | `SEN:` replikleri devredilecek; 6 ok, 2s→18,6s, ~400 satır | ⏳ |
| `research/theme-pivot-open-questions-2026-10.md` | S1-S19 listesi `A1-A9` ile birleştirilecek | ⏳ |
| `GAME_DESIGN.md` | Başlık + içerik: kütle yerine sayı, 11 basamak, 85 saat | ⏳ |
| `context/project-brief.md` | Aynı | ⏳ |
| `decisions/0075-…` | "8-11 saat" artık tüm oyun değil, tarihsel ölçüm | ⏳ |
| Kod | Hiçbiri — `A9` kararı bekliyor | ⏳ |

---

## 8. Riskler

| # | Risk | Neden gerçek | Önlem |
| :-- | :--- | :--- | :--- |
| R1 | **85 saatte yoğunluk düşer** | 42 hücre × 1s45dk = uzun beklemeler | Otomasyon erken açılmalı; her basamakta bir kural değişimi (`S7`) |
| R2 | **400 satır yazımı bitmez** | ~10 saat yazım, tek kişi | Yazım ayrı dalga; önce 120 satırlık çekirdek, sonra genişleme |
| R3 | **İngilizce mizah tutmaz** | Ses oyunun ana varlığı (`P3`) | `A8`: yazım sahibi netleşmeli; "çeviri kokan" satır derhal atılır |
| R4 | **Basamak 11 (18,6 saat)** en pahalı ve en riskli parça | Ayrı sistem + final | En son yazılır; gerekirse basitleştirilir |
| R5 | **İki sayı kütüphanesi** (`break_eternity` + `OmegaNum`) | Tip karmaşası, iki API | 4. basamak için ince bir adaptör katmanı; `Decimal` dışarı sızmaz |
| R6 | **Yarım pivot** | Kod "kütle" derken ton komikse oyuncu yamalı hisseder | Ya tamamen geçilir ya hiç (ADR-0077 zaten söylüyor) |

---

## 9. Kronoloji (tur günlüğü)

| # | Soru | Cevap | Sonuç |
| :-- | :--- | :--- | :--- |
| 1 | Pivot onayı | evet + "temayı detaylandıralım" | `P1` |
| 2 | SİCİL kim? | "ben adına SİCİL demedim; oyun bizimle konuşuyor" | `V1` |
| 3 | Dördüncü duvar | sessiz meta | `V2` |
| 4 | Muhatap | gerçek sen | `V3` |
| 5 | Kanallar | başarım + ticker + açıklama | `V4` |
| 6 | Sahne ritmi | tek ses çift ritim | `V5` |
| 7 | Basamak çerçevesi | çıplak sayı | `S1` |
| 8 | Nesne | yok; `+1` gerçek, üstte anlamsız | `S9` |
| 9 | Eski içerik | sil | `P4` |
| 10 | İsim | `Bir Sayı Tut` → İngilizce → `Hold That Number` | `P2` |
| 11 | Dil | her şey İngilizce | `P3` |
| 12 | Süre | "20-25 çok uzun" | (çelişki) |
| 13 | Süre | "6-8 az" | (çelişki) |
| 14 | Süre | "20-25 az" | (çelişki) |
| 15 | Süre | AD araştırması (348 sa medyan) | veri |
| 16 | Süre | kuyruk (C) | sonra iptal |
| 17 | Süre | "LNGN = son, kuyruk yok" | `S4` |
| 18 | Süre | ×1,25, 1. basamak 2 saat → ~85 sa | `S5` |
| 19 | Prestij sonrası sayı | `10` | `S2` |
| 20 | Prestij zamanlaması | `Birikim` | `E4` |
| 21 | Ticker | bağlam + nadir + 400 satır | `T3` |
| 22 | Jeneratörler | zincir | `E3` |
| 23 | Cüzdan | sayının kendisi | `E1` |
| 24 | Üretim birimi | kadran | `T2` |
| 25 | Kütüphane araştırması | OmegaNum 1000 ok | `T1` |
| 26 | Ok sayısı | 3→6 | `S8` |
| 27 | %5 kuralı | iptal, mandal | `E2`/`S3` |
| 28 | Offline | 12 saat tavan | `S6` |
| 29 | Zincir topolojisi (A2) | "ilk basamak planlandı; diğerleri sırası gelince; şu an 1. basamak 7-8" | `E5` |
| 30 | Zincir yönü (A10) | "A; ama tepede Parmaklar, her jeneratör kendinden öncekini üretir — AD mantığı" | `E6` |

**Çelişki notu (12-14):** Kullanıcı "20-25 çok uzun" → "6-8 az" → "20-25 bile az" dedi. Ajan
çelişkiyi masaya koydu; gerçek isteğin **uzun ama boş olmayan** bir oyun olduğu ortaya çıktı.
Bu, oturumun en öğretici anı: *"çok uzun"* bazen *"çok boş"* demektir.

---

## 10. Sözlük

| Terim | Anlam |
| :--- | :--- |
| **Basamak / çapa** | 11 notasyon seviyesinden biri (`1.79e308` → … → `LNGN`) |
| **Prestij** | İki basamak arasındaki geçiş: sayı `10`'a döner, `Tanım` kazanılır, çapa yükselir |
| **Hücre** | Bir ok seviyesi; `mag` 2.00→10.00 bir tur döner |
| **Mag** | Kadranın konumu, `[2.00, 10.00)`. Asla büyümez, döner |
| **Ok** | Hiperoperatör seviyesi; `10 ↑³ 4.27` = 3 ok, mag 4.27. Ekranda `↑³` gibi sayıyla |
| **Kadran** | Basamak 5+ için sayı yerine tutulan sayaç (`rank` + `mag`) |
| **`Tanım`** | Prestij para birimi; kalıcı yükseltmelere harcanır |
| **`Birikim`** | Kapı aşıldıktan sonra biriken fazlalık; `Tanım` ödülünü büyütür, verimi düşürür |
| **Mandal (latch)** | Bir kez tetiklenen sahne/başarımın bir daha tetiklenmemesi |
| **Bağlama duyarlı bant** | Ticker satırlarının rastgele değil, oyuncunun durumuna göre seçilmesi |
| **Sessiz meta** | Oyun olduğunu bilen ama bunu asla söylemeyen anlatı sesi |
| **Tek ses, çift ritim** | Oyuncunun düşüncesinin de oyunun ağzından söylenmesi |

## 11. Oturum II — basamak içi döngü (2026-10-23, aynı gün devam)

> §1–§10'daki oturumun devamı. Karar kimlikleri sabit; `E7`–`E14` burada. Bu oturumda **kod
> yazılmadı**; yalnız bir prototip simülasyon denemesi yapıldı (başarısız, sayı üretmedi).

### 11.1 Kararlar

#### E7 — `Birikim`: log ödül + çarpımsal verim cezası
- **Seçilen:** ✅ `Tanım = log10(1+A)`, verim `0,9^log10(A)`, `A = sayı / kapı eşiği`. Ödül yalnız
  prestijde; katsayılar simülasyonla kilitlenecek.
- **Gerekçe:** janra taraması (§6.1) → bekleme cezası yok, fren eğri veya tavan. Log ödül + çarpımsal
  ceza, Egg Inc tavanının **yumuşak** hâli: marjinal kazanç oranı düşer, oyuncu kendi noktasını arar.
- **Etki:** `E4` tamamlandı; ekranda aşım / verim / vaat edilen `Tanım` üçlüsü gösterilmeli.

#### E8 — Uygulama sırası: dikey dilim (✏️ A → B)
- **Seçilen:** ✅ **B — dikey dilim.** 1. basamak uçtan uca; 2-11 sonra.
- **Gerekçe (kullanıcı):** "her katman üstünde düşünmek istiyorum iyice, ona göre diğer katmanları
  yaparız". Yani tasarım, çalışan bir basamağın **üstüne** yazılacak.
- **Yan etki:** `OmegaNum` 2. basamağa ertelendi (1. basamak `1,79e308`'de bitiyor, `break_eternity`
  yeterli) → `R5` riski ötelendi.

#### E9 — "Bitti" tanımı: proje sahibi
- **Kullanıcının cevabı:** *"Benim bitti demem."*
- **Seçilen:** Formel kabul ölçütü **yok**. Dikey dilim, proje sahibi "bitti" diyene kadar sürer;
  ajan ilerlemeyi ölçmez, gösterir.

#### E10 — Tıklama yoğunluğu: AD / Cookie Clicker
- **Seçilen:** ✅ Halka başına **sınırsız alım**, fiyat `×1,3-1,5`; 2 saatte ~100-150 alım.
- **Gerekçe:** 85 saatte oyuncuyu ekrana kilitlemeden "sayı hızlanıyor" hissi.
- **Yan etki:** paket modeli düştü → `ADR-0076`'nın "1 paket → sonraki boyut" kilidi yeniden
  tanımlandı (`E11`).

#### E11 — Halka kilidi: 10 birim
- **Seçilen:** ✅ Bir halkadan **10 birim** alınınca sonraki halka açılır.
- **Gerekçe:** `ADR-0076`'nın ruhu korunur ("aldıkça aç"), yalnız tetikleyici 10'luk paketten
  10 birime iner. `E10` ile aritmetiği tutar (7 geçiş × 10 alım).

#### E12 — Mini boost: tam sıfırlama + basamak içi çarpan
- **Seçilen:** ✅ 8 halka da, sayı da sıfırlanır (`10`'a). Karşılığında **basamak içi kalıcı** üretim
  çarpanı. **`Tanım` vermez** (o yalnız basamak geçişinde).
- **Gerekçe:** 2 saatlik basamağa ritim verir; prestij tek ödül kapısı olarak kalır.

#### E13 — Boost koşulu: 8. halka
- **Seçilen:** ✅ Boost, zincirin son halkası (`Matematikçi`) alındığında açılır.
- **Gerekçe:** koşulsuz boost, "en kısa turda bas" der ve döngüyü 20 saniyeye indirir.

#### E14 — Boost ödülü: zirveye bağlı (`E13`'ün sabit çarpanı ölçümle çürüdü)
- **Ölçüm:** sabit `×1,5` → kapıya **1.717 boost** (86 saat); sabit `×10` → **303 boost** (909 dk).
  Yani sabit çarpan 2 saatlik basamağa sığmaz.
- **Seçilen:** ✅ `çarpan = (zirve / 10)^0,2` → **23 döngü** ≈ 2 saat.
- **Yan kazanç:** her tur "2 dakika daha tırmansam çarpan daha büyük olur" mikro-kararı doğar;
  `E7`'nin küçük kardeşi.

### 11.2 Boost matematiği (hesaplanmış)

| Model | Kapıya (`1,79e308`) ulaşmak için |
| :--- | :--- |
| Sabit `×1,5` | 1.717 boost → 3 dk/tur ile **86 saat** ❌ |
| Sabit `×10` | 303 boost → **909 dakika** ❌ |
| `(zirve/10)^0,15` | 30 döngü ✅ |
| **`(zirve/10)^0,2`** | **23 döngü ✅** (~5 dk/tur = 2 saat) |
| `(zirve/10)^0,25` | 19 döngü ✅ (biraz hızlı) |

### 11.3 1. basamak spec (kilitli)

| Alan | Karar |
| :--- | :--- |
| Zincir | Parmaklar → Çentik → Abaküs → Kalem → Hesap Makinesi → Bilgisayar → Süperbilgisayar → Matematikçi (`E6`) |
| Yön | Aşağıdan yukarı; **Parmaklar sayıyı üretir**; `+1` = elle Parmaklar |
| Alım | Sınırsız, fiyat `×1,3-1,5`, 2 saatte ~100-150 alım (`E10`) |
| Kilit | Bir halkadan 10 birim → sonraki (`E11`) |
| Döngü | 8. halkada mini boost: tam sıfırlama + `(zirve/10)^0,2` çarpan (`E12`–`E14`) |
| Kapı | `1,79e308` → prestij: sayı `10`, `Tanım = log10(1+A)`, verim `0,9^log10 A` (`E7`) |
| Ses | Bu basamakta ticker konuşur (`V4`); tooltip asla şaka yapmaz |

### 11.4 Bu oturumda açılan/kapanan maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `A3` | `Birikim` formülü | ✅ `E7` |
| `A9` | Uygulama sırası | ✅ `E8` (dikey dilim) |
| `A11` | Dilimin kapsamı | ✅ `E9` (kullanıcı kararı) |
| `A12` | Tıklama yoğunluğu | ✅ `E10` |
| `A13` | Halka kilidi | ✅ `E11` |
| `A14` | Mini boost ne sıfırlar | ✅ `E12` |
| `A15` | Boost koşulu ve ödülü | ✅ `E13` + `E14` |
| `A1` `A4` `A5` `A6` `A7` `A8` | Görsel dil · mizah ayarı · final · başarımlar · müzik · metin sahipliği | 🟡 açık |

### 11.5 Kronoloji (devam)

| # | Soru | Cevap | Sonuç |
| :-- | :--- | :--- | :--- |
| 31 | `Birikim` (A3) | "diğer oyunlara bak" → tarama → A | `E7` |
| 32 | Uygulama sırası (A9) | A → sonra "fikrimi değiştirdim, B" | `E8` |
| 33 | Dilim kapsamı (A11) | "benim bitti demem" | `E9` |
| 34 | Tıklama yoğunluğu (A12) | A | `E10` |
| 35 | Halka kilidi (A13) | A | `E11` |
| 36 | Mini boost (A14) | A | `E12` |
| 37 | Boost koşulu (A15) | A | `E13` |
| 38 | Boost ödülü (A15b) | A (sabit çarpan ölçümle çürüdü) | `E14` |

