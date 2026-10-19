# ADR-0070: Bulut Kaydetme Karar Katmanının Yeniden Tasarımı — Referans Tabanlı Çakışma Tespiti ve Saat Bağımsız Yazma Koruması

- **Tarih:** 2026-10-03
- **Durum:** Kabul Edildi (Accepted) & Uygulandı (Implemented)
- **Sürüm:** v0.26.1
- **İlgili ADR:** [ADR-0029](0029-guest-mode-google-auth-and-cloud-save-system.md) (bulut mimarisi), [ADR-0030](0030-firestore-security-rules-and-cloud-write-guards.md) (güvenlik kuralları ve yazma korumaları)
- **Eklenen dosyalar:** [src/core/auth/cloud-conflict.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/auth/cloud-conflict.ts), [src/core/auth/cloud-conflict.test.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/auth/cloud-conflict.test.ts)

---

## 1. Bağlam (Context)

ADR-0029 bulut yedeklemeyi, ADR-0030 ise sunucu tarafı güvenliğini ekledi. İkisi de
doğru çalışıyordu. Ancak bulut kaydetme katmanı, ADR-0029'un Playwright
doğrulamasından sonra **kimse tarafından tekrar elle çalıştırılmamıştı** ve üç
kritik davranış bozuktu. Üçü de aynı kök nedenden geliyordu: karar mantığı,
ağ ve depolama detaylarıyla iç içe geçmişti ve test edilebilir değildi.

### P0-1 — `force` bayrağı tüm uygulamada ölü koddu

`src/stores/auth.ts` ve `src/core/auth/cloud-save-service.ts` üzerindeki JSDoc'lar
şunu vaat ediyordu: *"Oyuncu bilinçli olarak üzerine yazmak istediğinde yaş
koruması atlanır."* Fiilen **hiçbir çağrı noktası `force: true` geçmiyordu**.

Bunun en kötü sonucu çakışma ekranıydı:

```
resolveConflict('local')
  └─ saveToCloud(force = false)
       └─ guard: bulut yeni  ->  CloudWriteConflictError
            └─ catch: showConflictFor()  ->  modal YENIDEN açılır
  this.conflictData = null         <- koşulsuz
  this.showConflictModal = false   <- koşulsuz
```

Çakışmanın varlık sebebi zaten bulutun daha yeni olması olduğu için, "Bu
Cihazdakini Sakla" butonu **her zaman** sessizce başarısızdı: modal kapanır,
buluta hiçbir şey yazılmaz, ekranda tek bir hata yoktur. Sağdaki "Buluttakini
Yükle" butonu çalıştığı için ekran **asimetrik** ve bu davranış kolayca
fark edilemiyordu. Aynı şekilde "tarayıcı verilerimi silmek üzereyim, şimdi
yedekle" diyen oyuncunun manuel yedekleme butonu da boşa dönüyordu.

### P0-2 — 5 dakikalık otomatik senkronizasyon tek seferlik çalışıyordu

`checkConflict()` bulut anlık görüntüsünü **şu anki yerel durumla** karşılaştırıyordu.
Oyuncu 5 dakika oynayınca dopamin, oynama süresi ve `lastUpdate` zaten değiştiği
için `sameMatter` her zaman `false` oluyordu:

| An | Durum | Sonuç |
| :-- | :-- | :-- |
| t₀ | Bulut boş | Yazılır |
| t₀+5dk | Oyun 5 dk oynandı | **Çakışma** → modal, yazılmaz |
| t₀+10dk | Aynı | Çakışma → modal, yazılmaz |

Yani otomatik senkron ilk yazımdan sonra **hiç çalışmıyor**, bulut kaydı
donuyor ve oyuncu 5 dakikada bir kapatılamayan (Escape handler'ı yok) bir modal
görüyordu. **Normal çalma ile gerçek çakışma bu kontrollerle ayırt edilemiyordu.**

### P0-3 — `updatedAt` çalışma zamanında `Timestamp`, tipi `number`

ADR-0028 bu farkı belgeleyip "ayrı bir iş kalemidir, şimdilik düzeltme" demişti.
Üç tüketici ise sayı muamelesi yapıyordu:

- `lastSyncedAt` alanına bir `Timestamp` **nesnesi** yazılıyordu.
- `AuthModal.vue`'de `Date.now() - Timestamp` → `NaN` → tüm karşılaştırmalar
  `false` → `new Date(Timestamp)` → **"Invalid Date"**.
- Çakışma modalında `updatedAt || clientTimestamp` fallback'i, nesne truthy
  olduğu için hiç devreye girmiyordu → bulut panelinde yine **"Invalid Date"**.

**Kök neden:** mock yol düz `Date.now()` yazıyor, Firestore yolu
`serverTimestamp()`. ADR-0029'un doğrulaması **mock modunda** yapıldığı için
bu sınıf hatalar görünmemişti.

### P1 — Aynı düzeltme turunda kapatılan diğer kusurlar

| # | Kusur | Sonuç |
| :-- | :-- | :-- |
| P1-1 | `beforeunload` içinde Firestore yazımı | En az bir ağ turu gerektirir; tarayıcı isteği iptal eder. Güvence sanılan yol **hiç tamamlanmıyordu**. |
| P1-2 | Yazma koruması **istemci saatine** dayanıyordu | İleri saatli cihaz başka cihazın ilerlemesini sessizce eziyor, geri saatli cihaz hiç yazamıyordu. |
| P1-3 | `withTimeout` transaction'ı iptal etmiyor | Arayüz "hata" derken yazma düşebiliyor; ayrıca her istekten sonra ölü 8 sn timer kalıyordu. |
| P1-4 | Çıkış yarışı | `signOut()` `lastSyncedAt`/`conflictData`'yı temizlemiyor, uçuşta kalan yazma çıkış yapmış kullanıcının state'ini bozuyordu. |
| P1-5 | Hata sınıflandırması | Çevrimdışı oyuncuya "Firestore Veritabanı oluşturun" mesajı gösteriliyordu. |
| P1-6 | Hard Reset | Bulut kaydı silinmediği için sıfırlamadan 5 dakika sonra eski ilerleme çakışma ekranıyla geri geliyordu. |
| P1-7 | Çakışmada **yerel yedek alınmıyordu** | Modal "mevcut slot yedeği tutulur" diyordu ama `resolveConflict('cloud')` yedek almıyordu — söz verilen koruma yoktu. |
| P1-8 | `hardReset()` `saveSuppressed`'ı kalıcı `true` bırakıyordu | `resumeSaves()` hiçbir yerden çağrılmıyordu; sıfırlamadan sonra otomatik kayıt ölüydü. |
| P2-1 | `storage` olayı yalnızca **diğer sekmelerde** tetikleniyordu | Simülasyon modunda "Google ile Devam Et" sonrası hiçbir şey buluta yazılmıyordu. |
| P2-2 | `/mobile/` testi `/iPad/` öncesinde | iPad'ler "Mobil Cihaz" etiketleniyordu. |
| P2-3 | Denetimsiz `as CloudSavePayload` cast'i | `meta`'sı eksik eski belge `checkConflict`'te crash üretiyordu. |
| P2-4 | Kalıcı yerel önbellek yok | Mobilde sekme arka plana atılınca uçuştaki yazma düşüyordu. |

---

## 2. Karar (Decision)

### 2.1 Kararları saf bir katmana ayırma (`cloud-conflict.ts`)

`vitest.config.ts` bilinçli olarak `environment: 'node'` ve DOM shimsiz
çalışıyor; `cloud-save-service.ts` ise Firebase SDK'sını import ediyordu.
Kararlar **hiçbir Firebase/localStorage/DOM bilmeyen** ayrı bir modüle taşındı:

- `toMillis()`, `decimalsEqual()`, `isSameSave()`
- `evaluateWriteGuard()` → `'allow' | 'conflict'`
- `decideSyncAction()` → `'first-backup' | 'push' | 'in-sync' | 'conflict'`
- `cloudRevision()`, `isCloudSavePayload()`

**27 regresyon testi** bu katmana yazıldı; her P0 için "önce şuydu, şimdi böyle"
şeklinde bir kilit test var.

### 2.2 Referans (ETag) tabanlı çakışma tespiti — P0-2'nin kök çözümü

Bu cihazın **en son gördüğü bulut belgesinin revizyonu** slot başına
localStorage'da tutulur (`DOOMSCROLL_CLOUD_REV_SLOT_{1|2|3}`). Soru artık:

> "Bulut, hâlâ benim bildiğim belge mi?"

değil, **"Bulut hâlâ benim bildiğim belge mi?"**

| Karar | Anlamı |
| :-- | :-- |
| `first-backup` | Bulutta kayıt yok → ilk yedek yaz. |
| `push` | Bulut bizim bildiğimiz belge → yerel ilerlemeyi it (çakışma **yok**). |
| `in-sync` | Referans yok ama içerik aynı → sahte çakışma üretme. |
| `conflict` | Bulut bizim bildiğimizden farklı → **gerçek** çakışma, oyuncuya sor. |

Referans yokken **içerik karşılaştırmasına` (`isSameSave`) düşülür; bu, ADR-0029'un
"boş yerel kayıt iyi bulut kaydını ezmesin" korumasını **YAŞATIR**. Yeni bir
cihazda oyuncunun ilerlemesi bulutta varsa çakışma ekranı açılır — koruma zayıflamadı.

### 2.3 Saat bağımsız yazma koruması — P1-2

Yazma kararı artık istemci saatlerini **karşılaştırmaz**. Koruma transaction
içinde, referans eşitliği üzerinden çalışır:

```ts
if (force) return 'allow'                      // bilinçli oyuncu kararı
if (!cloudMeta) return 'allow'                 // ilk yedek
if (baseline !== null)
  return cloudMeta.clientTimestamp === baseline ? 'allow' : 'conflict'
return cloudMeta.clientTimestamp > localMeta.clientTimestamp ? 'conflict' : 'allow'
```

Son satır yalnızca referansı hiç olmayan **son çare** yoldur. Referans **eşitlik**
için kullanıldığından yanlış saatli bir cihazın kararı bozamaz.

Bu, kuralların zorunlu kıldığı güvenilir sunucu saatini (`updatedAt == request.time`)
neden kullanmadığımızı da açıklar: sunucu saati **sıralama** içindir, bizim
ihtiyacımız olan şey **değişiklik tespiti**dir.

### 2.4 `force` artık fiilen kullanılıyor — P0-1

`resolveConflict('local')` → `saveToCloud(true)`. Ek olarak:

- Yazma başarısız olursa **modal kapanmaz**, hata gösterilir; diğer seçenek kullanılabilir kalır.
- `'cloud'` dalında `importSave` null dönerse **sessizce bir şey olmaz**: hata gösterilir.
- `'cloud'` dalı artık `snapshotSlot()` alır — modalin "mevcut slot yedeği tutulur" sözü artık **doğru**.
- Elle tetiklenen yedeklemeler (`AuthModal`, `SettingsModal`, Hard Reset) `force: true` kullanır.

### 2.5 Dürüst tip + tek noktadan normalize — P0-3

`CloudSavePayload.updatedAt` artık `number | Timestamp` birleşimi. Üç tüketicinin
tamamı `toMillis()` kullanıyor. ADR-0028'in erteleme notu `auth-types.ts` içinde
"artık düzeltildi" olarak güncellendi.

### 2.6 `beforeunload` → `visibilitychange` — P1-1

Sekme arka plana geçerken (`hidden`) buluta itilir; sekme tekrar görünür olduğunda
son yedek 2 dakikadan eskiyse gecikme kapatılmadan hemen yakalanır. Yerel kayıt için
`pagehide` + `beforeunload` korunur. Üç dinleyici de `onUnmounted` içinde temizlenir
(HMR'de sızıyordu).

### 2.7 Oturum yarışı koruması — P1-4

Store'a `sessionEpoch` eklendi. Çıkış/girişte artar; uçuşta kalan async işlemler
sonuç geldikten sonra epoch'u kontrol eder ve geçmiş bir oturumun state'ini bozmaz.
Ayrıca `syncInFlight` ile aynı anda tek bulut işlemine izin verilir.

### 2.8 Diğer düzeltmeler

- **Hard Reset:** Firestore kuralları `allow delete: if false` dediği için belge
  **silinmez**; sıfırlanmış durumla **üzerine yazılır** (`force: true`). Referans
  anahtarları ve mock bulut kayıtları temizlenir.
- **Çevrimdışı ayrımı:** `navigator.onLine` ve yeni `CloudTimeoutError` ile
  "geçici hata / tekrar denenecek" ayrıldı. `unavailable` artık veritabanı kurma
  talimatı önermiyor.
- **Kalıcı önbellek:** `initializeFirestore(app, { localCache: persistentLocalCache(...) })`
  — başarısız olursa **sessizce** `getFirestore`'a düşer; önbellek bulut kaydını
  devre dışı bırakmaz.
- **Mock/canlı ayrımı:** Simülasyon modunda aynı sekmeye de bildirim gidiyor;
  giriş sonrası senkron her iki modda da aynı yoldan çalışıyor.
- **Doğrulama:** `isCloudSavePayload()` ile `as CloudSavePayload` cast'leri kalktı.

---

## 3. Firestore kuralları değişmedi — yeniden deploy GEREKMİYOR

Bu ADR veri modeline **hiç dokunmadı**. Yazılan alanlar aynı:
`compressedData`, `meta` (6 zorunlu + opsiyonel `deviceName`), `updatedAt`.
[`firestore.rules`](file:///c:/Users/Yigit/Documents/Incremental/firestore.rules)
içeriği aynen geçerlidir; yalnızca **satır referansları** güncellendi
(`cloud-save-service.ts:54` → `:228`, `save.ts:56-63` → `:95-103` vb.).

Bu, bilinçli bir tercihtir: canlı projede kural değişikliği deploy etmeden bir
istemci sürümü şeması bozmak, çalışmayan bulut kaydına dönmekten daha kötüdür.
Revizyon token'ı olarak `meta.clientTimestamp` seçildiği için **yeni bir alan
eklemeye gerek kalmadı.**

---

## 4. Doğrulama (Verification)

- `npm test` → **5 dosya, 134 test geçti** (27'si yeni `cloud-conflict.test.ts`).
- `npm run build` (`vue-tsc && vite build`) → **0 tip hatası**, 1686 modül.
- Aşağıdaki senaryolar regresyon testleriyle kilitlendi:
  - Normal 5 dakikalık oynanış → çakışma **üretmez** (`'push'`).
  - Başka cihaz bulutu değiştirdi → çakışma **üretir** (`'conflict'`).
  - Yeni cihazdaki boş oyun, iyi bulut kaydını **ezmez** (ADR-0029 koruması).
  - Bilinçli "bulutu güncelle" → korumayı **atlar**.
  - `Timestamp` nesnesi → epoch-ms'ye **çevrilir** (Invalid Date yok).
  - Yanlış saatli yerel cihaz → sessizce ezme **yapmaz**.

---

## 5. Gelecek İçin Not

Bulut kaydetmede artık **iki ayrı sorumluluk** var ve ayrıldı:

1. **Karar** (saf, testli): `cloud-conflict.ts`
2. **Taşıma** (ağ + depolama): `cloud-save-service.ts`

Bundan sonra çakışma davranışını değiştirmek isteyen herkes **yalnızca 1. katmana**
ve testlerine dokunmalıdır. ADR-0029'un doğrulaması mock modunda yapıldığı için
canlı-yol hatalarını göremedi; bundan sonra canlı davranış değişiklikleri için
[Firebase Emulator](file:///c:/Users/Yigit/Documents/Incremental/firestore.rules)
üzerinden doğrulama önerilir.
