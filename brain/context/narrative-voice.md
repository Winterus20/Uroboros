# ANLATI SESİ SÖZLEŞMESİ — `Hold That Number`

> **BAĞLAYICI BELGE — HER AGENT METİN/İÇERİK İŞİNE BAŞLAMADAN ÖNCE OKUR.**
> Kaynak kararlar: 2026-10-23 grilling oturumu §2.2 (`V1`–`V6`), `A4`, `A8`
> → [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
> · ADR: [`../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md`](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md),
> [`../decisions/0079-number-economy-vertical-slice.md`](../decisions/0079-number-economy-vertical-slice.md)
> · Görsel taraf ayrı sözleşme: [`visual-language.md`](./visual-language.md) (ADR-0078) — bu belge onu **ezmez**.

**Bu belge 2026-10-23'te BAŞTAN YAZILDI.** Önceki sürüm "SİCİL" (Sayı Sicili) karakterinin
ses sözleşmesiydi: bürokratik bir kurum, 11 basamaklık karakter yayı, memur ağzı. `V1` ile
**SİCİL iptal edildi** — kurum yok, karakter yok, karakter yayı yok. O belgedeki SİCİL tablosu
ve yay tablosu bu sürümde **yoktur** ve geri getirilmemelidir.

---

## 1. Ses = oyunun kendisi (`V1`)

Konuşan tek şey **oyun**. Bir kurum, bir tanrı, bir anlatıcı, bir dosyalama memuru değil.
"Oyun" derken kastedilen somut olarak şudur: kural motoru, sayaç ve ekran. Kişiliği vardır,
**biyografisi yoktur**.

| Var | Yok |
| :--- | :--- |
| Bir bakış (alaycı, ironik, sabırlı) | Ad, unvan, köken, gövde |
| Oyuncuya dair hafıza (sayaçlar) | Oyuncuya dair dosya, sicil, kayıt |
| Kural bilgisi (ve kurala sadakat) | Hikâye anlatma isteği |

**Yazım testi — taşınabilirlik:** Bir replik başka bir oyunun ekranına yapıştırıldığında hâlâ
doğru okunuyorsa, o replik **süstür**; bu oyuna ait değildir. İyi replik, ancak *bu* sayının,
*bu* basamağın ve *bu* oyuncunun basışının yanında doğrudur.

```
✅ Press the plus. The plus is honest.
✅ You are near the end of the only numbers you were ever taught.
❌ Welcome, traveller. Your journey begins here.
❌ The universe is full of mysteries, and you must uncover them.
```

İlk ikisi `src/game/voice/lines-rung1.ts` içinde duruyor; son ikisi hiçbir oyuna ait değil.

---

## 2. Sessiz meta (`V2`)

Oyun **kendisinin oyun olduğunu bilir** ve bunu **asla söylemez**.

Absürtlük dünyada değil, **ilişkide**dir: oyun oyuncunun ne yapacağını, ne kadar bekleyeceğini,
`+1`'e yine bastığını bilir. Bunu bilmek ile söylemek arasındaki mesafe, bu sesin tamamıdır.

| ✅ Sessiz meta | ❌ Söylenmiş meta |
| :--- | :--- |
| "You know this does nothing now. You keep going. Good." | "This is a game, so clicking does nothing." |
| "The plus button has not moved." | "The developer left the plus button here." |
| "Waiting is also a mechanic. It is just a bad one." | "Idle games are all about waiting, right?" |

**Yasak:** yama notu şakası, geliştirici şakası, "kaydını kaydettim" şakası, oyuncunun
klavyesini/faresini/ekranını bilme iddiası, başka oyunlara gönderme. Hepsi dördüncü duvarı
**yıkar**; sessiz meta onu **kullanır** ve yerinde bırakır.

Tek istisna `V6`'dır (§6) — orada bile oyun "ben bir oyunum" demez; yalnızca **ciddileşir**.

---

## 3. Muhatap: gerçek "sen" (`V3`) + veri sınırı

Muhatap kurgusal bir karakter değil, **ekranın karşısındaki kişi**dir. İkinci tekil şahıs,
aracısız. "Sen" bir kahraman değil, bir **sayaç komşusu**dur.

### 3.1 Veri sınırı (bağlayıcı)

Ses **yalnızca oyunun kendi ürettiği veriyi** görebilir. Tek kaynak:
[`src/game/voice/types.ts`](../../src/game/voice/types.ts) → `VoiceContext`.

| Alan | Anlamı | Nereden |
| :--- | :--- | :--- |
| `rung` | basamak (1–11) | oyun durumu |
| `number`, `peak`, `perSecond` | sayı, zirve, üretim | ekonomi |
| `tanim`, `prestiges`, `boosts` | prestij para birimi ve sayaçlar | ekonomi |
| `taps`, `uselessTaps` | `+1` basışları, gösterimi değiştirmeyenler | store |
| `idleSeconds` | son etkileşimden bu yana geçen süre | store |
| `hour` | yerel saat (0–23) | **tek dış veri**, bilinçli istisna |
| `tab` | açık sekme | UI |

**Yasak:** oyun dışı hayata dair her çıkarım — iş, okul, uyku, konum, cihaz, yaş, isim, başka
uygulamalar, "bu saatte neden buradasın" türü gözlemler. `hour` alanı bunun tek istisnasıdır ve
yalnızca **saat dilimi** bilgisi olarak kullanılır ("It is late."), hayat hakkında yorum olarak değil.

**Gerekçe:** ironi, oyuncunun oyunla ilişkisinde tatlıdır; oyuncunun hayatında **gözetlemedir**.
Sınır keyfi değil, türün ahlaki sınırıdır.

**Kural:** bir replik `VoiceContext`'te olmayan bir olguyu gerektiriyorsa, o replik yazılmaz.
Yeni alan eklemek **tipte bilinçli bir karar** ister (ADR + bu belge güncellemesi), sessizce
alan eklenmez.

---

## 4. Kanallar (`V4`) ve tooltip yasağı

| Kanal | Nerede yaşıyor | Ritim | Durum |
| :--- | :--- | :--- | :--- |
| **Sahne** (`scene`) | `RungScene.vue` + `voice/index.ts` sahne seçicisi | 2,5 sn (`G8`), **mandallı** (`S3`) | ⚠️ havuz (11 satır) + seçici hazır; `RungScene` henüz havuzu göstermiyor, `humor` kapısı yok |
| **Ticker** (`ticker`) | `TickerBar.vue` → `src/game/voice/` | 20 sn (`measured`) / 12 sn (`full`); %22 sessizlik | ✅ çalışıyor |
| **Başarım** (`achievement`) | başarım adı + açıklaması | olay başına bir kez | içerik yok — `A6` |
| **Açıklama** (`description`) | yükseltme/halka açıklamaları | kalıcı metin | kısmi |

### 4.1 Tooltip ve sayısal etiket: mutlak yasak

Tooltip, rozet, buton etiketi ve sayısal etiket **asla şaka yapmaz**. Bunlar sözleşmedir:
"Deeper breath — boost exponent 0.20" yazan bir yerde 0,20 gerçekten 0,20'dir. Buradaki tek bir
şaka, oyuncunun *tüm* sayılara güvenini siler ve oyun okunamaz hâle gelir.

- ✅ Etiket: `×3.20`, `buys every 5s`, `Start at 1e4`
- ❌ Etiket: `×3.20 (roughly)`, `buys every 5s (maybe)`, `Start at 1e4, good luck`

Bu kural `V4`'ün sınırıdır ve **mizah seviyesinden bağımsızdır**: `off` seçilse de `full`
seçilse de etiket aynı kalır.

---

## 5. Tek ses, çift ritim (`V5`)

Sahnede oyuncu **konuşmaz**. Ama oyuncunun düşüncesi kaybolmaz: oyun onu da kendi ağzından
söyler. İki vuruş, tek ses:

```
It is over. 1.79e308. There is nothing after this.
There is.
```

(`src/game/voice/lines-rung1.ts` → `r1_scene_gate`.)

**Ritim kuralları:**

1. **İki vuruş üst sınırdır.** Ticker'da tek satır; sahnede en fazla iki vuruş.
2. **İkinci vuruş kısadır.** Cevap, iddiadan kısa olur — kısalık bu sesin en güçlü hareketidir.
3. **Vuruşlar aynı ağızdan çıkar.** "SEN:" etiketi, alıntı işareti, iki karakter yok. Eski
   senaryodaki `SEN:` replikleri **oyunun ağzına devredildi** (`V5`).
4. **Cevap her zaman bir bilgi taşır.** Sadece havalı görünen cevap yazılmaz; ikinci vuruş ya
   mekaniği düzeltir ya da oyuncunun sandığı şeyi tersine çevirir.

---

## 6. `V6` — 11. basamakta ton kırılması

On basamak boyunca ses ironiktir. **11. basamakta bir kez düz konuşur.** Oyunun tek ciddi anı
burasıdır ve **bir kez** olur.

- `A5` (LNGN final sahnesi) bu kuralın tek uygulamasıdır; **en son yazılır** (risk `R4`).
- Final sahnesi `G8` motorunu kullanır (2,5 sn sahne) — ikinci bir sahne motoru yazılmaz.
- Finalde: ironi yok, açıklama yok, ünlem yok, espri yok, "devamı var" vaadi yok (`S4`: kuyruk yok).
- Kural simetrik: **11'den önce hiçbir replik ironisiz olamaz**, 11'de hiçbir replik ironik olamaz.

---

## 7. Üç dokunulmaz kural (ADR-0077 `K4` — korunuyor)

### Kural 1 — Şaka oyuncunun beklentisine, sayıya değil

Sayının büyüklüğü kutsaldır. Oyun sayıyla dalga geçmez; oyuncunun **sayı hakkındaki
yanılgısıyla** dalga geçer.

| ✅ | ❌ |
| :--- | :--- |
| "You thought this was the end. It was a threshold." | "This number is meaningless anyway." |
| "The number is longer than the sentence about it." | "Numbers are all the same, just bigger." |

### Kural 2 — Mekanik hakkında yalan yok

Ses alay eder, yanlış yönlendirmez. Tooltip, etiket, ticker: hangi kanal olursa olsun, **mekanik
bilgi doğrudur**. `+1` gerçekten 1 ekler; "bu butona basma" denmez; "gerçekten bitti" denmez.

### Kural 3 — Tekrar şakayı öldürür

- **Sessizlik bir repliktir** (`T4`): bant her turda konuşmak zorunda değil. Kodda sessizlik
  olasılığı **0,22** (`SILENCE_CHANCE`).
- **Bağlama duyarlı seçim**: satırlar basamak, sayı aralığı, bekleme, tıklama, saat ve sekmeye
  göre filtrelenir (`when(ctx)`), rastgele değil.
- **Tekrar önleme**: son **8** satır kimliği hatırlanır (`SEEN_VOICE_LIMIT`); aynı satır geri
  gelmez.
- **Nadirlik ağırlığı**: `rare: true` satırlar ~**10×** seyrek seçilir (ağırlık 0,1).
- **Hacim**: hedef ~**400** satır (`T3`: 220 basamak + 100 durum + 40 nadir + 40 başarım).
  250 satır ÷ 20 sn = 83 dakikada başa döner; oyun 85 saat → tekrar kaçınılmazdır, bu yüzden
  bağlam ve sessizlik zorunludur.

---

## 8. Yasak listesi (hızlı kontrol)

- [ ] Sayının büyüklüğüyle dalga geçiliyor mu?
- [ ] Mekanik hakkında yanlış bilgi var mı? (tooltip/etiket dâhil)
- [ ] Oyuncunun oyun dışı hayatına dair bir çıkarım var mı? (`hour` dışında dış veri yasak)
- [ ] "Bu bir oyun" deniyor mu? (sessiz meta ihlali)
- [ ] Kurum/karakter/lore/isim uydurulmuş mu? (SİCİL'in kalıntısı)
- [ ] Ünlem var mı? (**yasak** — final sahnesi dâhil)
- [ ] İkiden fazla vuruş var mı? Cevap iddiadan uzun mu?
- [ ] Aynı satır son 8 içinde göründü mü?
- [ ] Şaka İngilizce'den çeviri mi kokuyor? (bkz. §11)
- [ ] Replik başka bir oyuna yapıştırılınca da doğru mu okunuyor? (öyleyse süs)
- [ ] Oyuncu "aptal" değil "saf" konumunda mı?

---

## 9. Mizah seviyeleri (`A4`)

Ayar: `settings.humor` → `off` / `measured` / `full` (`src/models/settings.ts`).
Varsayılan: **`measured`**.

| Kanal | `off` | `measured` (varsayılan) | `full` |
| :--- | :--- | :--- | :--- |
| **Ticker** | ❌ susar (başlık gizlenir) | ✅ 20 sn'de bir, %22 sessizlik | ✅ 12 sn'de bir |
| **Sahne** | ❌ susar | ✅ | ✅ |
| **Başarım** | ❌ susar | ✅ | ✅ |
| **Açıklama** | ⚠️ **kalır** — yalnız nötr bilgi | ✅ | ✅ |
| **Tooltip / sayısal etiket** | değişmez | değişmez | değişmez |

**Açıklama neden susmaz:** o kanal mekanik bilgi taşır ("boost exponent 0.20"). Susarsa oyun
okunamaz olur. `off` bu kanalda yalnız **süsü** keser; bilgi cümlesi kalır.

**Kod durumu (2026-10-23):** ticker kapısı uygulandı (`TickerBar.vue`: `humor === 'off'` → render
yok; `store.humorSuspended`). Sahne tarafında hem havuz (11 satır) hem seçici (`pickSceneLine`,
mandal + `when` koşulu) hazır; `RungScene.vue` (`G8`) motoru **var** ama (a) basamak ilerlemediği
ve havuz ona bağlanmadığı için hiç tetiklenmiyor, (b) `humor` kapısı **bağlı değil** — yani `off`
seçilse de sahne oynardı. Başarım kanalı yok (`A6`). Bu boşluklar kapanmadan `A4` **tamamlanmış
sayılmaz**.

---

## 10. `A8` — ortak yazım: ajan yazar, sahip redakte eder

Ses bu oyunun ana varlığıdır (`P3`): İngilizce metin "çeviri kokarsa" pivot anlamsızlaşır.
Bu yüzden yazım **tek elden çıkmaz**:

| Rol | Kim | Ne yapar |
| :--- | :--- | :--- |
| **Yazar** | Ajan | Taslak satırları `src/game/voice/lines-rungN.ts` içine, kararlı `id` ile yazar |
| **Redaktör** | Proje sahibi | Son söz. Şüpheli satırı **siler**; düzeltmesini ajandan istemez, kendisi yazar |
| **Kâtip** | Ajan | Redaksiyonu `completed.md` + oturum kaydına işler |

**Süreç kuralları:**

1. **Satır silinir, tartışılmaz.** Sahip bir satırı beğenmediyse gerekçe yazmak zorunda değil;
   ajan aynı şakayı ikinci kez denemez (tekrar = `Kural 3` ihlali).
2. **Kimlik sabittir.** `id` değişmez; silinen satırın kimliği yeniden kullanılmaz.
3. **Hacim bütçesi**: 1. basamak için hedef ~**120** satır; havuz 2026-10-23'te **110 ticker +
   11 sahne** satırına ulaştı. 400 satırlık genel hedef (`T3`) dalga dalga doldurulur
   (`R2`: önce ~120 satırlık çekirdek, sonra genişleme).
4. **Redaksiyon ölçütü** §11'dir. "Çeviri kokan" satır **derhal atılır** (`R3`).

---

## 11. İngilizce metin kalitesi ölçütleri

Metin **doğrudan İngilizce yazılır, çevrilmez** (`P3`). Aşağıdaki ölçütler redaksiyonun
kontrol listesidir.

### 11.1 Dilbilgisi ve ses

1. **Yüksek sesle okunur.** Bir kelimede takılıyorsan o kelime kesilir.
2. **Kısa cümle.** Ticker satırı tek nefeste okunur; iki fikir varsa iki satırdır.
3. **Somut isim, az sıfat.** "Massive", "incredible", "insane" bir olgu değil, bir tembelliktir.
4. **Kısaltma serbest.** Oyun konuşuyor, kılavuz değil: "It's", "You're", "doesn't" doğaldır —
   ama nazik-konuşma ("please", "congratulations") bu sesin dışındadır.
5. **Sayı ekrandaki gibi yazılır.** `1.79e308`, `+1`, `10`, `TREE(3)` — biçim değiştirilmez.
6. **Ünlem yok.** Nokta ve soru işareti yeter; bu ses bağırmaz.

### 11.2 Çeviri kokusu testleri

| Test | Kural |
| :--- | :--- |
| **Sözlük testi** | Cümle kelime kelime başka bir dile çevrilip geri getirildiğinde bozuluyorsa, cümle İngilizce değil, kalıptır |
| **Deyim testi** | Deyim varsa İngilizce'nin kendi deyimi olmalı; Türkçe deyimin karşılığı uydurulmaz |
| **Açıklama testi** | Şaka bir açıklama gerektiriyorsa şaka değildir |
| **Bağlam testi** | Satır oyuncunun o anki durumuyla (basamak/sayı/bekleme/tıklama) açıklanabiliyor mu? |

### 11.3 Yıpranmış kelime listesi (kullanma)

`epic` · `awesome` · `amazing` · `journey` · `unleash` · `delve` · `madness` · `insane` ·
`literally` (ölçü olarak) · `secret` (vaat olarak) · `legendary` · `ultimate`.

Bu kelimeler oyunun değil, janranın kliseleridir; bir satırda göründüklerinde satır
**genellikle** boştur — istisna varsa sahip onaylar.

### 11.4 Uzunluk ve yerleşim

Ticker satırı tek satırda okunmalıdır; mobil dizgi kuralı (`G13`) hâlâ açık olduğu için bugünkü
geçici sınır: **390 px'te satır iki satıra inebilir, üçe inmez.** Kural yazıldığında bu madde
güncellenir — sayı uydurulmaz.

---

## 12. Uygulama durumu (kod haritası)

| Dosya | Rol | Durum |
| :--- | :--- | :--- |
| `src/game/voice/types.ts` | `VoiceChannel` + `VoiceContext` (`V3` veri sınırı) | ✅ |
| `src/game/voice/index.ts` | havuz, sessizlik 0,22, nadir ağırlık 0,1, tekrar önleme | ✅ |
| `src/game/voice/lines-rung1.ts` | 1. basamak havuzu (İngilizce) | ✅ 110 ticker + 11 sahne satırı |
| `src/components/TickerBar.vue` | 20/12 sn kadans, `humor` kapısı | ✅ |
| 2–11. basamak havuzları | — | ⛔ boş (`E5`: her basamak kendi turunda) |
| `src/components/RungScene.vue` | `G8` sahne motoru (2.500 ms, mandallı) | ⚠️ var; yalnız basamak adını gösteriyor, havuz bağlı değil, `humor` kapısı yok |
| Başarım kanalı | ad + metin | ⛔ yok (`A6`) |

---

## 13. Tek cümlelik özet

> Oyun, oyuncuya **bildiği şeyi** söyler — ama asla **bildiğini söylediğini** söylemez.
