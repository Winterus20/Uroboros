# ADR-0055: Faz 0 Kapsamlı Stabilizasyon, Tematik Uyum ve Mimari İyileştirme

- **Tarih:** 2026-10-14
- **Durum:** Kabul edildi ve uygulandı (v0.39.0)
- **Kapsam:** `src/core/`, `src/game/`, `src/stores/game/`, `src/components/`
- **İlgili Belgeler:** ADR-0039 (Tematik Dönüşüm), ADR-0051 (Maliyet İvmelenmesi), ADR-0052 (Ölçek Sıçrama Motoru), ADR-0054 (Yumuşak Tavan)

---

## 1. Bağlam ve Problem

Yapılan Faz 0 ($0 \to 1.79 \times 10^{308}\text{ g}$) çok boyutlu uzman incelemesinde aşağıdaki kritik sorunlar tespit edilmiştir:
1. **Tematik Uyuşmazlık:** ADR-0039 ile oyun UROBOROS'a evrilmesine rağmen, Autobuyer isimleri (`state.ts`) eski Doomscroll parodisinde kalmıştı ("Kedi Videoları", "Subway Surfers"). Nöral Ağaç (`NEURAL_TREE`) "Göz Damlası", "120W GaN Adaptör" gibi eski telefon memeleri içeriyordu. Header'daki gece saati 02:47 çalar saati gösteriyordu.
2. **Kavram Karmaşası:** `DimensionsTab.vue` içinde Antimatter Galaxy kartının adı "Kozmik Çöküş" idi ve 1.79e308 Tekillik prestijiyle isim çakışması yaratıyordu.
3. **Anomali Kütle Patlaması Çelişkisi:** UI ve GDD 777× derken arka plandaki kodda (`actions-neural.ts`) çarpan `100` olarak bırakılmıştı.
4. **Wrinkler İade Oranı:** GDD %120 vaat ederken kod tabanında ilk koşuda %105 iade uygulanıyordu.
5. **Web Audio RangeError:** Ses sıfırlandığında `exponentialRampToValueAtTime(0)` çağrısı tarayıcıda fatal RangeError fırlatıyordu.
6. **Game Loop 250ms İlerleme Sızıntısı:** 250ms ile 5000ms arasındaki duraklamalarda accumulator 250ms'ye clamp'lendiği için aradaki saniyeler buharlaşıyordu.
7. **Çevrimdışı Autobuyer Felci:** 300 saniyelik çevrimdışı kaba adımlarda botlar biriken 37 alım yerine `timer % interval` ile sadece 1 alım yapıyordu.
8. **WebGL Shader Bellek Sızıntısı ve rAF Aşırı Yükü:** `AlgorithmicSwirl.vue` her karede ağır `store.tickspeedMultiplier` getter'ını hesaplatıyor ve unmount'ta shader/buffer'ları silmiyordu.

---

## 2. Alınan Kararlar ve Çözümler

1. **Tematik Senkronizasyon (P0):**
   - `state.ts`: D1-D8 botları "Moleküler Ayırıcı", "Orbital Vakum", "Çekirdek Sıyırıcı", "Kuark Emici", "Makro Çöküş", "Gezegen Tuzağı", "Yıldız Yutucu", "Samanyolu Tekillik" ve "Kozmik Kümeler", "Kozmik Çöküş" olarak yeniden adlandırıldı.
   - `DimensionsTab.vue`: Galaksi kartı "Kozmik Kümeler" (`Cosmic Galaxies`), butonu "Küme Kur" yapıldı. D4 ile D5 arasına özel neon "Planck Yırtılması / Mikro Karadelik" bariyeri eklendi.
   - `Header.vue`: 02:47 gece saati kaldırıldı; yerine `1eX g` logaritmik kozmik telemetri ve ilerleme çubuğu konuldu.
   - `neural-data.ts`: `NEURAL_TREE` düğümleri `SINGULARITY_UPGRADES` ile senkronlandı ("Tekillik Çekirdeği", "Optik Soğutucu", "Kozmik Parazit Filtresi", "Kuantum Rölanti Reaktörü", "Kuantum Güç Kaynağı", "Taktil Çekim Katalizörü" vb.). Tüm ID'ler %100 geriye dönük uyumlu bırakıldı.
2. **Matematik ve Denge Senkronizasyonu (P0):**
   - `actions-neural.ts`: `heart_frenzy` anomali çarpanı ve açıklamaları 777× olarak eşitlendi.
   - `actions-neural.ts`: Parazit (Wrinkler) taban iade oranı 1.05'ten 1.20'ye (%120) yükseltildi.
   - `AnomalyOverlay.vue`: Kombo banner metni `Süper Rezonans: 7× Kütle + 777× Çekim Aktif` olarak güncellendi.
3. **Mimari ve Performans Düzeltmeleri (P0):**
   - `manager.ts`: `safeVolume()` tabanı `0.0001` ile sınırlandırıldı; ses kapalıyken AudioContext çağrısı bypass edilerek `RangeError` engellendi.
   - `game-loop.ts`: 1 saniye ve üzeri duraklamalar doğrudan `simulateOfflineProgress`'e devredildi. 1 saniye altındaki duraklamalar için 1000ms tampon ve 20 adıma kadar accumulator desteği sağlandı; `store` referansı döngü dışına alındı.
   - `actions-misc.ts`: Autobuyer döngüsünde `deltaSeconds >= bot.interval` olduğunda birikimli alım (`runCount = min(triggers, 30)`) desteği eklendi.
   - `math.ts`: `D_INFINITY` sabiti `Object.freeze` ile donduruldu.
   - `unlocks.ts`: `unlockProgressFraction` içinde `Math.log10(toNumber())` yerine güvenli `log10Of(Decimal)` kullanıldı.
   - `AlgorithmicSwirl.vue`: `tickspeedMultiplier` okuması 500ms ile throttle edildi; `onUnmounted` kancasında `vsShader`, `fsShader` ve `positionBuffer` serbest bırakıldı.

---

## 3. Doğrulama ve Sonuç

- **Testler:** `npm test` çalıştırıldı — **17 dosya, 257/257 test yeşil**.
- **Derleme:** `npm run build` (`vue-tsc && vite build`) — **0 tip hatası, 0 derleme hatası**.
- **Pacing:** Faz 0 ($0 \to 1.79\times 10^{308}\text{ g}$) matematiksel stabilitesi, taktil doyum seviyesi ve tema tutarlılığı en üst düzeye ulaştı.
