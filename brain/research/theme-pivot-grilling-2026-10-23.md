# TEMA PİVOTU — GRILLING OTURUMU KAYDI (2026-10-23)

> **Amaç:** "Kozmik Oburluk" → `Hold That Number` pivotunun soru-cevap oturumunda kilitlenen
> kararlarını, açık kalan maddelerini ve **devam edilecek soruyu** tek yerde tutmak.
> **Durum:** ⏸️ oturum duraklatıldı — **devam noktası §6**.
> **İlgili:** [ADR-0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) ·
> [narrative-voice.md](../context/narrative-voice.md) ·
> [number-ladder-script-2026-10.md](number-ladder-script-2026-10.md) ·
> [theme-pivot-open-questions-2026-10.md](theme-pivot-open-questions-2026-10.md)
> **Kod durumu:** hiçbir `.ts` / `.vue` dosyası değişmedi. Bu oturum yalnız karar üretti.

---

## 0. Bu belge nasıl kullanılır

1. **Devam etmek için:** §6'daki tek sorudan başla. Başka hiçbir yeri okumak zorunda değilsin.
2. **Karar kimlikleri sabittir** (`P#`, `V#`, `S#`, `E#`, `T#`). Bir kararı tartışırken
   kimliğiyle an: *"S5'i değiştirelim"* gibi.
3. **Yeni karar** alınırsa: §2'ye satır ekle, §5'ten çıkar, sonra ilgili ADR'yi güncelle.
4. **Çelişki görülürse** yaz: bu belge kararların *tutarlı* hâlini tutar, tarihçesini değil.

---

## 1. Soru-cevap nasıl işledi (protokol)

Bu oturum **grilling** modunda yürüdü. Kurallar:

| Kural | Ne demek |
| :--- | :--- |
| **Tek soru, tek cevap** | Aynı anda birden fazla soru sorulmaz; cevap gelmeden sonrakine geçilmez. |
| **Her soruda öneri** | Ajan bir tavsiye ve gerekçe verir; **karar kullanıcınındır**. |
| **Olgu ≠ karar** | Olgu (kod, dosya, internet) ajan tarafından **araştırılır**; karar sorulur. |
| **Kod yazılmaz** | Kararlar oturmadan hiçbir dosyaya dokunulmaz. |
| **Çelişki itiraf edilir** | Kullanıcı iki turda çelişen şey söylerse ajan bunu masaya koyar. |
| **Karar kaydı** | Her turun başında o ana kadar kilitlenenler listelenir. |
| **Yanlış öneri geri alınır** | Ajan kendi kuralını savunamazsa kaldırır (bkz. %5 kuralının iptali). |

**Kapsam ayrımı:** kararlar → `brain/decisions/` (ADR) · tasarım gerekçesi → `brain/research/` ·
görev durumu → `brain/tasks/in-progress.md`.

---

## 2. Kilitlenen kararlar

### P — Pivot ve kimlik

| # | Karar | Not / gerekçe |
| :-- | :--- | :--- |
| **P1** | Tema pivotu **onaylandı**; "Kozmik Oburluk" bırakıldı | Kütle `1.79e308`den sonra ölçü değil süs; Akt II tanımlama merdiveni oburlukla motive edilemiyor |
| **P2** | Oyun adı: **`Hold That Number`** | "hold that thought" bozması; sayının bitmediğini isimde söylüyor |
| **P3** | Dil: **her şey İngilizce** | Metinler doğrudan İngilizce yazılır, çevrilmez; Türkçe sonradan opsiyonel |
| **P4** | Eski tema **silinir** | Arşiv yok, müze yok. `brain/decisions/` geçmişi silinmez (karar kaydı, içerik değil) |
| **P5** | Eski **save'ler silinir** | Yeni ekonomi (13 jeneratör, sayı) eski kaydı yükleyemez |

### V — Ses

| # | Karar | Not / gerekçe |
| :-- | :--- | :--- |
| **V1** | **`SİCİL` iptal** — konuşan kurum/karakter yok | SİCİL önceki ajanın icadıydı; kanona girmedi |
| **V2** | Konuşan = **oyunun kendisi**, **sessiz meta** | Oyun olduğunu bilir, asla söylemez; absürt + ironik |
| **V3** | Muhatap = **gerçek oyuncu** | Kurmaca aracı yok. Yalnız oyun içi veri kullanılır (tıklama, süre, saat, sekme, kayıt) |
| **V4** | Kanallar: **sahne · ticker · başarım · açıklama** | Tooltip ve sayısal etiketler **asla** şaka yapmaz |
| **V5** | **Tek ses, çift ritim** | Oyuncunun düşüncesi de oyunun ağzından: *"Bitti. 1.79e308."* / *"Var."* |
| **V6** | 11. basamakta ses **bir kez ciddileşir** | 10 basamak ironi, sonra tek düz cümle |

### S — Yapı

| # | Karar | Not / gerekçe |
| :-- | :--- | :--- |
| **S1** | **Çıplak sayı**: 11 basamak, her basamak bir **prestij katmanı** | Dosya/kayıt/arşiv dili yok; sahne başlıkları sadece bölüm adı |
| **S2** | Prestijde sayı **`10`**'a döner | Klasik sıfırlama; gösterim "en basit yeterli biçim" kuralıyla çalışır |
| **S3** | **Çapa asla düşmez**; eşikler **mandallı** | Kadran serbestçe inip çıkar; sahne/başarım bir kez tetiklenir |
| **S4** | **`LNGN` = oyunun sonu** | Kuyruk yok, NG+ yok, sıfırlama yok. Oyuncu isterse kaydını siler |
| **S5** | Süre: **~85 saat**, eğri **×1,25**, 1. basamak **2 saat** | 2s → 2,5s → … → 18,6s; toplam 85,1 saat |
| **S6** | **Offline ilerleme var, 12 saat tavanlı** | Uyuyan oyuncu cezalanmaz; bir hafta kapatan oyunu atlamaz |
| **S7** | Kapsam: **5 sistem + 4 kural** | Ayrı sistemler basamak **9** ve **11**'de; 6,7,8,10 ortak motora birer kural |
| **S8** | Ok aralığı **3 → 6**, ekranda **`↑⁶`** gibi sayıyla | 1-2 ok zaten basamak 1-3'te; 6'dan sonra ok saymak anlamsızlaşır (Graham) |

### E — Ekonomi

| # | Karar | Not / gerekçe |
| :-- | :--- | :--- |
| **E1** | Cüzdan = **sayının kendisi**, her basamakta | "Para birimi değişir" fikri düştü; basamakları notasyon + jeneratör + kural ayırır |
| **E2** | **Tek havuz**; alım düşüşü serbest | AD/Cookie Clicker modeli; üretim düşüşü saniyeler içinde kapatır. %5 kuralı **iptal edildi** |
| **E3** | Jeneratörler **zincir** | Her jeneratör bir üsttekini besler; `+1` zincirin kökünde (Parmaklar) |
| **E4** | Prestij **kapıdan sonra** da mümkün: `Birikim` | Fazlası `Tanım` ödülünü büyütür, üretim verimi düşer → "şimdi mi, biraz daha mı" |

### T — Teknik

| # | Karar | Not / gerekçe |
| :-- | :--- | :--- |
| **T1** | Basamak **1-4 gerçek aritmetik**, **5-11 kadran** | `break_eternity` + `OmegaNum` (1000 ok); geçiş tam "hesaplama bitti" anında |
| **T2** | Kadran: `rank` + `mag ∈ [2.00, 10.00)`, asla büyümez | Süreklilik `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a`; basamak başına 6 hücre |
| **T3** | İçerik: **~400 satır** | 220 basamak + 100 durum + 40 nadir + 40 başarım; **bağlama duyarlı** seçim + nadirlik |
| **T4** | Bant her 20 sn konuşmak zorunda değil | **Sessizlik bir replik**; tekrar sorunu yarıya iner |
| **T5** | Görsel dil **ayrı konuşmaya ertelendi** | Palet ve estetik bu oturumda kararlaştırılmadı |

---

## 3. Değişen sayılar (tek bakışta)

| Sayı | Değer | Nerede kullanılıyor |
| :--- | :--- | :--- |
| Toplam süre | **~85 saat** | 11 basamak, ×1,25 eğri |
| 1. basamak | **2 saat** | İlk duvar `1.79e308` |
| Son basamak | **18,6 saat** | `LNGN` |
| Basamak sayısı | **11** | her biri prestij katmanı |
| Hücre/basamak | **6** | ok 1→6 (basamak 4'te 3→6) |
| Kadran aralığı | **2.00 → 10.00** | 8 adım/hücre |
| Offline tavan | **12 saat** | |
| Ticker satırı | **~400** | 220 + 100 + 40 + 40 |

---

## 4. Eski dokümanlarda artık geçersiz olanlar

| Eski | Nerede | Durum |
| :--- | :--- | :--- |
| `SİCİL` karakteri + 11 basamaklık karakter yayı | `narrative-voice.md` §1 | ❌ iptal |
| "Eski Kayıtlar" arşivi (K5) | ADR-0077, senaryo §5 | ❌ iptal |
| Kuyruk / "temel teori" sıfırlaması | bu oturumun erken turları | ❌ iptal |
| Para birimi değişimi (Sayı→Üs→Kat→Ok) | ADR-0077 K7 | ❌ iptal (cüzdan = sayı) |
| Kadranın tier 4'te başlaması (K8) | ADR-0077 K8 | ✏️ tier 5'e kaydı |
| "Orta sayı her zaman artar" (K3) | ADR-0077 K3 | ✏️ "koşu içinde artar" |
| `SEN:` replikleri | senaryo §2 | ✏️ oyunun ağzına devredildi |
| "1000 ok" eşiği | senaryo §1 | ✏️ 6 ok |
| 250 satır ticker | senaryo §7 | ✏️ ~400 satır, bağlama duyarlı |
| `1.79e308` = oyunun sonu | GAME_DESIGN, ADR-0075 | ✏️ artık 1. basamak |

---

## 5. Açık maddeler

| # | Konu | Neden açık | Not |
| :-- | :--- | :--- | :--- |
| **A1** | Görsel dil | Kullanıcı ayrı konuşma istedi | Eski `--feast` paleti silinecek; yerine ne geleceği belli değil |
| **A2** | 13 jeneratörün listesi + zincir sırası | Konuşulmadı | **Sıradaki soru (§6)** |
| **A3** | `Birikim` formülü | E4'ün detayı | Verim düşüş eğrisi, ödül çarpanı |
| **A4** | Mizah yoğunluğu ayarı | Konuşulmadı | `kapalı / ölçülü / tam` |
| **A5** | `LNGN` final sahnesi | Konuşulmadı | V6'nın tek ciddi anı |
| **A6** | Başarım (86) + meydan okuma (13) yeniden yazımı | İçerik hacmi | SİCİL diliyle yazılmıştı |
| **A7** | Müzik motoru | Kozmik tema üzerine kurulu | Yeniden mi, uyarlama mı |
| **A8** | İngilizce metni kim yazacak | Süreç | 400 satır ≈ 10 saat yazım |
| **A9** | Uygulama sırası | Konuşulmadı | Öneri: gösterim → iskelet ekonomi → metin |

---

## 6. DEVAM NOKTASI — sıradaki soru

> **Soru (A2): 13 jeneratörün listesi ve zincir sırası ne olacak?**
>
> Dokümandaki liste (senaryo §6.3) şu sırayla: Parmaklar · Çentik · Abaküs · Kalem ·
> Hesap Makinesi · Bilgisayar · Süperbilgisayar · Matematikçi · Logaritma Makinesi ·
> Kule Vinci · Ok Dökümcüsü · Adlandırıcı · Teorisyen.
>
> Zincir kararı (E3) alındığı için soru şu hâle geldi: **zincir hangi yöne akıyor ve her
> basamakta kaç jeneratör var?**
>
> - **A (öneri):** Zincir basamak içinde akar — her basamak kendi 3-4 jeneratörünü getirir,
>   en üstteki jeneratör sayıyı üretir, alttakiler onu besler. Basamak geçişinde zincir
>   **yeniden kurulur** (eski jeneratörler "temel" olur, çarpan verir).
> - **B:** Zincir oyun boyunca tek ve uzar — her yeni basamak zincirin başına bir halka ekler
>   (13 jeneratör = 13 halka, tek zincir).
> - **C:** Hibrit — basamak 1-4 tek zincir (8 → 11 halka), basamak 5+ koleksiyon/teorisyen
>   sistemine devreder.

---

## 7. Belge etkileri (uygulamada yapılacaklar)

| Belge | Ne yapılacak |
| :--- | :--- |
| `decisions/0077-…` | Durum "Kabul edildi" + §Durum altına "grilling sonrası geçersiz kalanlar" tablosu (yapıldı) |
| `context/narrative-voice.md` | **Baştan yazılacak**: SİCİL → oyunun sesi, sessiz meta, gerçek "sen", tek ses çift ritim |
| `research/number-ladder-script-2026-10.md` | `SEN:` replikleri devredilecek; eşikler (6 ok), süreler (2s→18,6s) güncellenecek |
| `research/theme-pivot-open-questions-2026-10.md` | S1-S19 listesi bu belgedeki A1-A9 ile birleştirilecek |
| `GAME_DESIGN.md` | Başlık + içerik: kütle yerine sayı, 11 basamak, 85 saat |
| `context/project-brief.md` | Aynı |
| `decisions/0075-…` | "8-11 saat" bandı artık **tüm oyun** değil, tarihsel ölçüm; yeni bant 85 saat |
| Kod | Henüz hiçbiri. Uygulama sırası A9'da kararlaştırılacak |

---

## 8. Oturum özeti

- **~25 soru**, hepsi tek tek soruldu ve cevaplandı.
- **Kilitlenen:** 5 kimlik + 6 ses + 8 yapı + 4 ekonomi + 5 teknik = **28 karar**.
- **Açık:** 9 madde (A1-A9).
- **Kod değişikliği:** 0. `npm run build` gerekmedi.
- **Geri alınan öneriler:** %5 harcama kuralı (E2), kuyruk/NG+ fikri (S4), cüzdan = üst parametre (E1).
