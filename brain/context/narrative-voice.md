# ANLATI SESİ SÖZLEŞMESİ — "SİCİL" VE MİZAH KURALLARI

> **BAĞLAYICI BELGE — HER AGENT METİN/İÇERİK İŞİNE BAŞLAMADAN ÖNCE OKUR.**
> Bu belge, ADR-0077 tema pivotunun **yazım ve ton sözleşmesidir**.
> Tam senaryo: [`brain/research/number-ladder-script-2026-10.md`](../research/number-ladder-script-2026-10.md)
> Görsel taraf için ayrı ve bağımsız sözleşme geçerlidir:
> [`visual-language.md`](./visual-language.md) (ADR-0060) — bu belge onu **ezmez**.

---

## 1. Oyuncu ve SİCİL

### Oyuncu
**İkinci tekil şahıs ("SEN").** Adı yok, yüzü yok, geçmişi yok. Elinde bir defter var.
Motivasyonu tek ve saf: **en büyük sayıyı görmek.** Açgözlü değil, meraklı. Oyuncunun
tek karakteristik özelliği, her eşikte "bu sefer gerçekten bitti" diye inanmasıdır.

> Oyuncu asla aptal değildir. **Saftır.** Fark net: aptallıkla dalga geçilir, saflıkla
> dalga geçilir ama sevilir. Her şaka oyuncunun *çabasına* değil, *beklentisine* yönelir.

### SİCİL (Sayı Sicili)
Evrenin sayıları kaydeden bürokratik kurumu. Tek karakter, tek ses.

| Özellik | Değer |
| :--- | :--- |
| **Biliş** | Kendisine kaydedilmiş her sayıyı bilir. Kaydedilmemişi bilmez ve **bilmediğini söyler**. |
| **Motivasyon** | Düzen. Dosyalama. Protokol. Sayıların kayıt altında olması. |
| **Duygu** | Hiçbir şeyi beğenmez. Beğendiğini asla kabul etmez. |
| **Zayıflık** | Oyuncunun ısrarı. 11 basamak boyunca kırılır. |
| **Yalan** | Mekanik hakkında **asla**. Hikâye hakkında **her zaman**. |
| **Ses tonu** | Kısa cümle. Kuru. Memur ağzı. Noktalama disiplinli. Ünlem yok (bir kez hariç). |

**Karakter yayı (11 basamak):**

| Basamak | SİCİL'in hâli | Örnek ton |
| :--- | :--- | :--- |
| 1-3 | Kendinden emin büro. Oyuncuyu prosedür sanıyor. | "Kayıt tamamlandı. Sıradaki." |
| 4-5 | İlk kez şaşırır, şaşırdığını inkâr eder. | "Bu… kayıt dışı. Şimdilik." |
| 6-7 | Yorgun memur. Oyuncudan bıkmış ama işini yapıyor. | "Yine mi. Tamam. Otur." |
| 8-9 | Prosedürü bırakır, insan gibi konuşur. | "Bunu ben de merak ediyorum. Söylemem." |
| 10 | Sessizlik. Tek kelime. | "…" |
| 11 | Protokolü bozar. Tek ünlem. Oyunun tek ünlemi. | "Tamam." |

**Kritik kural:** SİCİL hiçbir zaman "vay canına" demez. Hayranlığı **kısalma** ile
gösterir. Ne kadar etkilenirse o kadar az konuşur. `LNGN`'de tek kelime konuşması,
11 basamağın duygusal ödemesidir.

---

## 2. Üç Dokunulmaz Kural

### Kural 1 — Şaka oyuncuya, sayıya değil
Sayının büyüklüğü **kutsaldır**. SİCİL sayıyla dalga geçmez; oyuncunun *sayı hakkındaki
yanılgısıyla* dalga geçer.

| ✅ Doğru | ❌ Yanlış |
| :--- | :--- |
| "O bir duvar değildi. Bir yazı tipiydi." | "Bu sayı zaten hiçbir anlam ifade etmiyordu." |
| "Kütüphane bitmedi. Sen onun ne kadarını gördüğünü biliyorsun." | "Sayılar sonunda hep aynı. Hepsi büyük işte." |
| "Yazmadı. Gösterdi." | "Graham sayısı aslında sadece bir gösterim." |

Sayının büyüklüğüne gülünürse oyuncunun ulaşma motivasyonu ölür. **Sayı her zaman
gerçekten büyüktür.** Şaka, oyuncunun onu *kavrayamaması* üzerinedir.

### Kural 2 — Sistem mekanik olarak yalan söylemez
SİCİL alay eder, yanlış yönlendirmez.

- ❌ "Evet, gerçekten bitti." (yalan — oyun devam ediyor)
- ❌ "O butona basma." (yalan — basılabilir ve faydalı)
- ✅ "Hayır." (doğru ve yeterince sinir bozucu)

**Sebep:** Oyuncu bilgiye güvenmek zorundadır. SİCİL'in söylediği her mekanik bilgi
doğru olmalı; aksi halde oyuncu tooltip'lere de güvenmez ve oyun okunamaz hale gelir.
Mizah **hikâye katmanında** yaşar, **kural katmanında** asla.

### Kural 3 — Tekrar şakayı öldürür
Her eşik sahnesi 4 kademeli seyreltmeyle sunulur:

| Karşılaşma | Sunum |
| :--- | :--- |
| 1. | Tam sahne: diyalog + ekran efekti + duraklama + ses |
| 2-4. | Havuzdan tek satır (her eşik için **en az 5 varyant**), ticker'da |
| 5+ | Tek kısa cümle, ticker'da, varyant havuzundan |
| Ayarlar | **"Sistem konuşsun mu?"** → `kapalı / ölçülü / tam` |

Ayrıca: aynı eşikte art arda **iki kez aynı varyant gösterilmez** (son 3 kayıt hatırlanır).

---

## 3. Tükenmeyen Şaka Motoru: "Sanmıştım Ki" Döngüsü

Tek tek espri yazmak tükenir. Tükenmeyen yapı şudur:

1. Oyuncu bir eşiğe **güvenle** varır ("bu sefer gerçekten bitti").
2. SİCİL reddeder (tek kelime, kuru).
3. Yeni ölçek **görünür** olur (gösterim sıçraması).
4. Oyuncu bir sonraki eşiğe güvenmeye başlar.

Aynı gag 11 kez tekrarlanır ama **değişken oyuncunun güvenidir**: ilk seferde saf, son
seferde alaycı. Bu, karakter gelişimidir — tekrarı affettiren tek şey. 11. basamakta
oyuncu artık "bitti" demez; **SİCİL der**. Yapı tersine döner ve kapanır.

> **Yazım kuralı:** her yeni eşik yazılırken önce şu cümle doldurulur:
> *"Oyuncu bu sefer neye inanıyor?"* Cevap yoksa sahne yazılmaz.

---

## 4. Yazım Kuralları (biçim)

1. **Kısa cümle.** SİCİL'in replikleri ortalama 6 kelime. Oyuncunun replikleri 12 kelimeye kadar.
2. **Ünlem yok.** Tüm oyunda tek ünlem: 11. basamak. (`TAMAM.` — ünlem bile değil, sadece büyük harf.)
3. **Ansiklopedi esprisi serbest, çeviri esprisi yasak.** Kelime oyunu Türkçe'nin kendi
   yapısından doğar; İngilizce'den taşınmış pun yok.
4. **Gerçek matematik şakadır.** En iyi espriler doğru olanlardır: `TREE(3)`'ün değeri
   gerçekten bilinmiyor. Graham gerçekten "yazılmadı, gösterildi". Bu gerçekler
   değiştirilmez — yanlış bilgi mizahı da öldürür.
5. **Sessizlik bir repliktir.** `…` tam bir cevaptır. Kullan.
6. **Ekran metni ≠ ticker metni.** Sahne diyalogları tam cümle; ticker girdileri
   manşet üslubu (kısa, üçüncü şahıs, gazete dili).

---

## 5. Kanallar

| Kanal | Dosya | Rol |
| :--- | :--- | :--- |
| **Sahne diyalogları** | `src/game/script.ts` *(yeni, sonra)* | 11 eşik, tam sahne + varyant havuzları |
| **Haber bandı** | `src/game/news.ts` | SİCİL'in sürekli sesi — mizahın ana kanalı (~250 satıra çıkar) |
| **Eski Kayıtlar** | *(arşiv)* | Eski kozmik oburluk lore'u, hikâye içi arşiv (ADR-0077 K5) |
| **Başarımlar** | `src/game/achievements.ts` | Başarım adları SİCİL'in dosyalama diliyle |
| **Tooltip'ler** | bileşenler | **Kural 2 burada mutlaktır** — tooltip asla şaka yapmaz |

`CommentTicker.vue` bu yüzden projenin en değerli mizah yüzeyidir: tek dosya, tüm oyuna
kişilik. `news.ts` yeniden yazımı, pivotun en yüksek getirili/emek oranlı işidir.

---

## 6. Yasaklar (hızlı kontrol listesi)

- [ ] Sayının büyüklüğüyle dalga geçilmiyor mu?
- [ ] Mekanik hakkında yanlış bilgi verilmiyor mu?
- [ ] Aynı eşikte tekrar eden varyant var mı?
- [ ] Ünlem kullanıldı mı? (11. basamak dışında yasak)
- [ ] Oyuncu "aptal" değil "saf" konumunda mı?
- [ ] Şaka İngilizce'den çeviri mi kokuyor?
- [ ] Matematiksel iddia doğru mu? (yanlışsa ya düzelt ya sil)
