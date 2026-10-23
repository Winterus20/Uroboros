# TEMA PİVOTU — AÇIK SORULAR VE BOŞLUK LİSTESİ

> **Amaç:** ADR-0077 tema pivotunun **henüz kapatılmamış** bütün tasarım/uygulama
> boşluklarını tek yerde tutmak. Kod yazılmadan önce bu listedeki 🔴 maddeler kapanmalı.
> **İlişkili:** [ADR-0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) ·
> [Ses sözleşmesi](../context/narrative-voice.md) ·
> [Senaryo](../research/number-ladder-script-2026-10.md)
> **Tarih:** 2026-10-23 · **Durum:** ⚠️ **TARİHSEL** — okuma kaydı, güncel değil
>
> **Bu belge AŞILDI (2026-10-23).** Aynı gün yapılan grilling oturumu maddelerin çoğunu
> kapattı ya da iptal etti (`SİCİL` iptal, kuyruk yok, 1. basamak dikey dilim uygulandı).
> **Güncel tek gerçek:** [`theme-pivot-grilling-2026-10-23.md`](theme-pivot-grilling-2026-10-23.md)
> · ses: [`../context/narrative-voice.md`](../context/narrative-voice.md) ·
> uygulama: [ADR-0079](../decisions/0079-number-economy-vertical-slice.md).
> Aşağıdaki `S#` listesi **karar girdisi** olarak saklanır; mevcut durumu anlatmaz.

## Nasıl kullanılır

- Her maddenin bir kimliği (`S#`) ve önerilen bir duruşu var. Duruş = yazarın tavsiyesi,
  karar değil.
- 🔴 = kod yazımını bloke eder · 🟡 = tasarımı var, detayı yok · 🟢 = sonra.
- Kullanıcı kararları (`D#`) ayrı bölümde: bunlar yalnızca proje sahibinin verebileceği
  kararlar.

---

## 🔴 Bloklayıcılar

### S1 — `mag` / hücre modeli ✅ KAPANDI
**Soru:** `mag` kaça kadar büyür, hücre boyutu nedir?
**Çözüm (ADR-0077 K8):** `mag` bir sayı değil kadrandır; her hücrede `[2.00, 10.00)`
arasında döner, asla büyümez. Süreklilik `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a` özdeşliğiyle garanti.
**Detay:** senaryo §6.11.

### S2 — Fraksiyonel kule dürüstlüğü ✅ KAPANDI (çözüm biçimi)
**Soru:** `10^^1.47` matematiksel olarak tanımlı değil; topluluk bunu fark eder.
**Çözüm:** `mag` üs değil ilerleme göstergesi. Ekranda `TREE(3) ↑↑ 1.47*` ve dipnot:
*"Kesirli kule diye bir şey yok. Uydurduk. Çalışıyor."*
**Kalan iş:** dipnotun UI'da nereye konacağı (tooltip mi, kalıcı mı).

### S3 — Prestij reset kapsamı ❌ AÇIK
**Soru:** Notasyon atlayınca ne sıfırlanır, ne kalır? Geri düşmek mümkün mü?
**Neden önemli:** Geri düşüş varsa "rekor asla düşmez" sözleşmesi **basamak seviyesinde**
kırılır. Yoksa yanlış yatırım oyuncuyu kilitler.
**Önerilen duruş:** Sayı + jeneratörler sıfırlanır; `Tanım` ve `En Büyük Sayı` rekoru
kalır; **geri düşüş yok** (tek yönlü merdiven).

### S4 — Save göçü (geri dönüşü olmayan) ❌ AÇIK
**Soru:** 40 saatlik eski temalı save ne olacak?
**Neden önemli:** Kullanıcıya dokunan tek geri dönüşü olmayan karar. ADR-0037 sürüm
mekanizması var ama "oyunun anlamı değişti" başka bir göç türü.
**Seçenekler:** (a) sert silme / minimum sürüm zorlaması, (b) "Eski Kayıtlar" olarak
salt-okunur içe aktarma, (c) legacy modu.
**Karar:** D2.

### S5 — Görsel dil sözleşmesi çakışması ❌ AÇIK
**Soru:** `visual-language.md` (ADR-0060…0067) bağlayıcı ve **tamamen oburluk temalı**:
`--feast #ff3355`, K0-K5 bozulma fazları, Wrinkler, feast-shower partikülleri.
**Ölçek:** 8 ADR + kodda 11 dosya `data-corruption` kullanıyor.
**Neden önemli:** Yeni tema bürokratik/mizahi; kozmik-korku paleti uymuyor.
**Seçenekler:** (a) sözleşme yeniden yazılır, (b) iki görsel dil yan yana (pahalı),
(c) eski dil "Eski Kayıtlar" arşivinde yaşar, canlı UI yeni dile geçer.
**Karar:** D5.

### S6 — `Tanım` isim çakışması ❌ AÇIK
**Soru:** `Tanım` hem prestij para birimi hem "tanım gücü" olarak kullanıldı (ADR-0077 K7).
**Neden önemli:** Aynı kelime iki kaynak = oyuncu için anlaşılmaz, kod için kâbus.
**Önerilen duruş:** Para birimi `Tanım` kalsın; tanım gücü **`Kapsam`** veya **`İfade`**
olarak yeniden adlandırılsın.
**Ayrıca:** `Tutarlılık` hâlâ sadece isim — başlangıç değeri, harcama, yenilenme ve
çöküşün tam davranışı tanımsız.

### S7 — Ticker hacmi matematiği ❌ AÇIK
**Soru:** 250 satır ÷ 20 sn = **83 dakika** sonra tekrar. Oyun 20-40 saat.
**Neden önemli:** Aynı şaka 30 kez görülecek. Şu anki plan matematiksel olarak yetersiz.
**Önerilen duruş:** (a) basamak bazlı kapılama (yalnız o basamağın satırları görünür),
(b) nadirlik ağırlığı (nadir satırlar 10× seyrek), (c) hedef ~600 satır.

---

## 🟡 Sırada (tasarımı var, detayı yok)

### S8 — Basamak 5 "koleksiyon" sistemi ❌ AÇIK
İsim toplamak nasıl çalışır? Kart mı, başarım mı, nadirlik mi? Tek cümle bile yazılmadı.

### S9 — Ordinal okunabilirliği ❌ AÇIK
Akt II'de oyuncu Cantor normal formu görecek. Matematikçi olmayan biri `ψ(Ω^Ω^ω)` görünce
ne anlar? UI'ın en zor problemi.

### S10 — LNGN sonrası (Ouroboros döngüsü) ❌ AÇIK
New Game+ hiç tanımlanmadı. Idle oyunların öldüğü yer tam burası.

### S11 — Anlatı boşluğu: oyuncu nasıl set teorisyeni oldu? ❌ AÇIK
Akt I'de defterli bir insan, Akt II'de sonsuz kümeler teorisi genişletiyor. Geçiş yok.
Ayrıca **SİCİL'in oyuncuya neden ihtiyacı var?** Bürokrasi her şeyi kaydediyorsa rolü ne?

### S12 — Akt I'de hiç risk yok ❌ AÇIK
Klasik norm, sorun değil — ama Akt II `Tutarlılık` çöküşü getirince oyuncu ilk kez
kaybetmeyi öğrenmek zorunda. Öğretilmemiş mekanik = şok.

### S13 — İsim değişikliğinin teknik maliyeti ❌ AÇIK
`package.json` = `uroboros-cosmic-feast` (**2026-10-23: `hold-that-number` · 0.40.0 yapıldı**),
`<title>UROBOROS</title>` (**→ `Hold That Number`**), Firestore projesi, auth uygulama adı,
cloud save anahtarları. O1 kararı ADR-0030 güvenlik kurallarına dokunuyor.

### S14 — 13 meydan okuma + 88 başarım ❌ AÇIK
`challenges.ts` (13 kayıt) ve `achievements.ts` (88 kayıt) yeniden yazılacak. İçerik
hacmi tahmin edilenden büyük.

### S15 — Müzik motoru ❌ AÇIK
`src/core/music/tracks` kozmik tema üzerine kurulu. Yeni ton (bürokratik/komik) için
yeniden yazım mı, yeniden kullanım mı?

---

## 🟢 Sonra

### S16 — Test stratejisi ❌ AÇIK
Hesaplanamaz sayı test edilmez ama **sıralama** edilir: `rank ↑ ⇒ değer ↑`, `mag ↑ ⇒ değer ↑`.
İki property test. Ayrıca denge için bir "notation harness" tanımlanmalı.

### S17 — Onboarding ❌ AÇIK
`10^^` kavramı ilk göründüğünde nasıl öğretilecek? SİCİL'in açıklaması hem komik hem
işlevsel olabilir (§6.12 bunun bir örneği).

### S18 — Dil stratejisi ❌ AÇIK
Türkçe mizah çevrilmez. Oyun TR-only mi? Öyleyse r/incremental_games kitlesi (niş kitlenin
merkezi) kaybediliyor. Stratejik karar, hiç konuşulmadı. → D3

### S19 — Liderlik tablosu ❌ AÇIK
"En büyük sayı" oyunu için en bariz sosyal özellik; cloud altyapısı (Firestore + auth)
zaten var ama hiç tasarlanmadı.

---

## Kullanıcı Kararları (yalnızca proje sahibi verebilir)

| # | Karar | Neyi etkiler |
| :-- | :--- | :--- |
| **D1** | Oyun kaç saat? 3 saat (niş, sıkı) mi 40 saat (AD ölçeği) mi? | 11 basamağın süresi, hücre süreleri |
| **D2** | Mevcut oyuncular feda edilebilir mi? | S4 save göçü |
| **D3** | Oyun Türkçe mi kalacak? | S18 dil stratejisi, hedef kitle |
| **D4** | 11 basamak gerçekten oynanacak mı, yoksa 4 oynanır + 7 anlatı mı? | Bütün kapsam |
| **D5** | Eski görsel dil (K0-K5, feast) tamamen gidiyor mu? | S5, 8 ADR |

---

## Durum özeti

| Durum | Sayı | Maddeler |
| :--- | :-- | :--- |
| ✅ Kapandı | 2 | S1, S2 |
| 🔴 Bloklayıcı | 5 | S3, S4, S5, S6, S7 |
| 🟡 Sırada | 8 | S8-S15 |
| 🟢 Sonra | 4 | S16-S19 |
| **Karar bekleyen** | **5** | D1-D5 |

**Sıradaki öneri:** D1 + D4 birlikte cevaplanırsa S3 ve S7 kendiliğinden büyük ölçüde
çözülür (oyun süresi → hücre süresi → ticker hacmi zinciri).
