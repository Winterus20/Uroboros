# ADR-0080: Sayı Gösterimi — K/M/B/T Kısaltmaları, Sonra e-Notasyonu

## Durum

**Kabul edildi & uygulandı (2026-10-23)** — proje sahibinin oyun içi geri bildirimi üzerine.

- **Geri bildirim:** *"1 10 100'de bu noktadan sonraki sayılar gözükmesi; bir de 1000'de mesela
  `1e3` yazıyor, bunun yerine çoğu insanın anladığı şekilde yazsın — bir yere kadar kısaltmalar,
  sonra e'li sayılara geçsin."*
- **Üst kararlar:** [ADR-0078](0078-pure-number-visual-language.md) (yapısal dizgi `G9`, auto-fit
  yasak), [ADR-0079](0079-number-economy-vertical-slice.md) (sayı ekonomisi, save v20).

---

## Bağlam

Varsayılan notasyon `scientific` idi: ilk bin basamakta ekran `1e3` yazıyordu. `standard`
notasyonu kodda vardı ama tablosu 41 basamağa kadar uzanıyordu (`Qa`, `NoDc`, `UTg`, `NoTg`).
Bunlar Antimatter Dimensions sözlüğünden gelen bileşik kısaltmalar; oyunun kendi oyuncusu için
okunmuyor. Ayrıca 1000 altında `plain()` sondaki sıfırları attığı için `1.001` ekranda `1`
oluyor, yani üretim artışı görünmüyordu.

---

## Karar

### 1. Varsayılan notasyon `standard`
`defaultSettings().notation = 'standard'`; `format()` / `formatParts()` / `heroParts()` varsayılan
parametresi de `standard`. Ayarlar'daki dört seçenek (`standard` · `scientific` · `engineering` ·
`logarithm`) korunur, `standard` listede ilk sıraya alınır.

### 2. Kısaltma merdiveni: K · M · B · T, sonra e
`STANDARD_SUFFIXES = ['', 'K', 'M', 'B', 'T']` → 1e3 … 1e12. `1e15` ve üstünde sayı
e-notasyonuna devredilir (`1.23e15`), `layer >= 2`de break_eternity kulesi aynen kalır.
Gerekçe: "çoğu insanın anladığı" ölçü bin/milyon/milyar/trilyon; `Qa`, `Sx`, `NoTg` o ölçünün
dışında. Kısaltma tükenince e'ye düşmek, uydurma bir sözlük öğrenmekten dürüst.

### 3. Yuvarlama taşması kısaltmayı büyütür
`999 999` ekranda `1000 K` olmaz → `1 M`. `formatStandard()` yuvarlanmış mantisayı denetler ve
gerekirse bir üst kısaltmaya geçer. Aynı kural hero dizgisinde de geçerli.

### 4. 1000 altında TAM sayı (revizyon — aynı gün ikinci geri bildirim)
Sahibi ilk turda "1000 altında ondalık görünsün" dedi, aynı gün ikinci turda vazgeçti:
*"12.35 yerine direkt 12 yazsın."* Sayı büyürken ondalık kuyruk gürültüydü (hero'da her karede
iki basamak titriyordu). Kural artık:

- **1 ve üstü → en yakın tam sayı:** `12.345` → `12`, `12.6` → `13`, `648.97` → `649`.
- **1'in altı → ondalık korunur:** `0.11` → `0.11` (halka üretim oranı "0/sn" görünüp yalan
  söylemesin); `0.004` gibi çok küçükler en fazla 4 basamağa kadar açılır.
- **Sınır:** `999.6` tam sayıya yuvarlanınca `1000` olur; bu durumda gösterim `1 K`ya devreder
  (hero dâhil), yani ekranda ne `1000 K` ne de yalnız `1000` kalır.

### 5. Hero dizgisi yapısal kalır (`G9`)
`heroParts(value, notation)` kısaltmayı **kuyruk** parçasına koyar: taban hero puntosu, kısaltma
~%34 puntoda (`4.57` + `M`). Auto-fit yok; punto dizeye göre küçülmez. Negatif sayı işareti
tabanın önüne eklenir (önceki sürümde negatif değer üs dalına düşüyordu).

### 6. Kayıt: v20 → v21 (yalnız gösterim göçü)
Şema değişmedi. Varsayılan değiştiği için v20 kayıtlarındaki `scientific` değeri *oyuncunun
seçimi değil eski varsayılan* kabul edilir ve `deserialize()` içinde bir kez `standard`'a taşınır.
`MIN_SUPPORTED_SAVE_VERSION = 20` kaldı → v20 kaydı açılır, sıfırlanmaz. Göç sonrası kayıt v21
yazılır, oyuncunun sonraki seçimi korunur.

---

## Sonuçlar

- **Olumlu:** İlk `+1`'den itibaren sayı okunur (`1.02`, `12.35`, `1.23 K`, `4.57 M`); oyuncu
  kısaltma sözlüğü öğrenmek zorunda kalmıyor; e-notasyonu yalnız 1e15 üstünde görünüyor.
- **Olumlu:** Ondalık kuyruk kalktı: hero ve etiketler tam sayı okur (`12`, `649`), yalnız 1'in
  altındaki oranlar (`0.11/sn`) ondalık taşır.
- **Ödün:** `Qa`…`NoTg` basamakları 1e15'te e'ye devredildiği için oyunda kısaltma çeşitliliği
  azaldı — bilinçli: okunurluk > sözlük zenginliği.
- **Açık (kabul):** 0 ile 1 arası değerler tam sayı kuralının dışında; oran etiketleri
  (`0.11/sn`) ondalık gösterir — sayı ile oranın aynı dili konuşmaması bilinçli.

---

## Dosyalar

- [`src/core/format.ts`](../../src/core/format.ts): `STANDARD_SUFFIXES`, `plainSmall()`,
  `formatStandard()`, `formatParts()`, `heroParts(value, notation)`.
- [`src/core/format.test.ts`](../../src/core/format.test.ts): yeni — üç eşiği de pinleyen 9 test.
- [`src/stores/game.ts`](../../src/stores/game.ts): `defaultSettings`, `heroParts` getter'ı,
  v21 göçü.
- [`src/core/save-version.ts`](../../src/core/save-version.ts): `SAVE_VERSION = 21`.
- [`src/components/SettingsModal.vue`](../../src/components/SettingsModal.vue): `standard` ilk sırada.
- Belgeler: `GAME_DESIGN.md` §9 + §12 tablosu · `brain/context/visual-language.md` §4 ·
  `AGENTS.md` · `README.md` · `brain/context/project-brief.md` · `tech-context.md`.

---

## Doğrulama

- `npm run typecheck` → temiz · `npm run test` → **101 test / 6 dosya geçti** · `npm run build` → başarılı.
- Tarayıcı (Playwright, gerçek build, kayıt enjekte edilerek):
  `12.345 → 12` · `0.11 → 0.11` · `999.6 → 1K` · `1234.5 → 1.23K` · `4567000 → 4.57M` ·
  `999999 → 1M` · `1e16 → 1e16` · notasyon `scientific` iken `1234.5 → 1.23e3`.
