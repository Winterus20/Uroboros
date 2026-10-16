# Faz D — İnternet Araştırması (VS Şöleni / Juice / Canvas / CC Kombo)

**Tarih:** 2026-10-16 · **Faz:** D (VS şöleni) · **Yöntem:** doğrudan kaynak çekme (webfetch)
**Durum:** Tamamlandı — bulgular `phase-d-feast-shower-deep-spec-2026-10.md` §1'e işlendi

> Not: genel web araması (search entegrasyonu) bu ortamda sonuç döndürmedi;
> araştırma bunun yerine birincil kaynaklara doğrudan `webfetch` ile yapıldı.
> Her bulgunun altında kaynağı ve Faz D kararına etkisi verilir.

---

## 1. MDN — Optimizing canvas (birincil teknik kaynak)

**URL:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas

**Bulgular (Faz D'yi ilgilendirenler):**
1. Benzer ilkelleri her karede yeniden çizme; offscreen canvas'a ön-render yap, ana canvas'a `drawImage` ile bas.
2. Kesirli koordinatlar sub-pixel anti-aliasing maliyeti doğurur (`Math.floor` ile tamsayıya yuvarla).
3. `drawImage` içinde ölçekleme yapma; boyut varyantlarını yükleme anında önbelleğe al.
4. Karmaşık sahnelerde **katmanlı canvas**: sık değişen / seyrek değişen / statik ayrımı.
5. Büyük statik arka planı canvas'ta değil düz CSS `background` ile çiz (her tick'te arka planı yeniden boyama).
6. CSS transform ile ölçekleme GPU'dan gelir (canvas'ı büyütüp küçültmekten iyidir).
7. Saydamlık gerekmiyorsa `getContext('2d', { alpha: false })` — tarayıcı içi optimizasyon.
8. Yüksek DPR: canvas nitelik boyutu × DPR, `ctx.scale(dpr, dpr)`, CSS boyutu sabit.
9. Çizim çağrılarını grupla (tek polyline > N çizgi); gereksiz state değişiminden kaçın; yalnız farkı çiz.
10. `shadowBlur`'dan mümkünse kaçın; **metin render'ından mümkünse kaçın**; temizlemede `clearRect` / `fillRect` / yeniden boyutlandırmayı dene.
11. Animasyonda `setInterval` değil **`requestAnimationFrame`**; ağır fizik kütüphanelerine dikkat.

**Faz D kararlarına etkisi:**
- (4)+(5) → M4'ün gerekçesi güçlendi: ikinci tam-ekran canvas = 2× overdraw; mevcut **tek canvas** (`JuiceLayer`) + statik zemin CSS'te kalır. Knock-down, canvas'a değil CSS sınıfına yazılır.
- (8) → mevcut DPR ≤2 cap + `ctx.scale(dpr,dpr)` korunur; büyütülmez.
- (9)+(10) → sahne bütçesi: halka ≤8, kıvılcım ≤220, metin ≤60; `shadowBlur` hiç kullanılmaz (mevcut kodda da yok — halka `strokeStyle+globalAlpha`, kıvılcım `arc+fill`); metin sayıca tavanlı tutulur (MDN'in "metinden kaçın" uyarısı yüzen sayıların neden cap'li olduğunu açıklar).
- (11) → idle-safe rAF korunur (spawn ile başlar, boşalınca kapanır); fizik elle, kütüphanesiz (mevcut `0.94 sürtünme + 0.08 yerçekimi` disciplini).

---

## 2. MDN — `requestAnimationFrame` (zamanlama sözleşmesi)

**URL:** https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

**Bulgular:**
- rAF **tek atımlıktır** (one-shot): callback her karede yeniden kaydetmelidir.
- Callback'e verilen `timestamp`, önceki karenin render bitişidir; tüm aynı-kare callback'leri **aynı timestamp'i** alır.
- Arka plan sekmesinde rAF çoğu tarayıcıda **duraklatılır** (pil/performans).
- Yüksek yenileme hızlı ekranda animasyon hızlanmasın diye ilerleme **timestamp farkından** hesaplanmalıdır.

**Faz D kararlarına etkisi:**
- Mevcut `JuiceLayer.loop` zaten tek-atımlı zincir + boşalınca kapanış yapar; sahne spawn'ı kare-hızından bağımsız **sayı reçetesidir** (zaman-tabanlı hız çarpanı yok) → 60/120/144 Hz'de aynı bütçe. Değişiklik yok, korunur.
- Arka plan sekmesinde rAF durması + `safeConfetti` görünürlük kapısı birlikte çalışır: gizli sekmede şölen birikmez.

---

## 3. MDN `prefers-reduced-motion` + W3C WCAG 2.3.3 (erişilebilirlik sözleşmesi)

**URL'ler:**
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html

**Bulgular:**
- `prefers-reduced-motion: reduce` işletim sistemi seviyesinde "gereksiz hareketi azalt" tercihidir (vestibüler bozukluklarda baş dönmesi/migren/yatak istirahati riski).
- WCAG 2.3.3 (AAA): etkileşimle tetiklenen hareket animasyonu **kapatılabilir** olmalıdır; istisna yalnız işlev/bilgi için **essential** olan animasyondur. Üç kabul yolu: gereksiz animasyonu kullanma / kapatma kontrolü sun / işletim sistemi reduce-motion'a saygı duy.
- MDN örneği: tam animasyon yerine `dissolve` (opaklık) gibi vestibüler-tetikleyici olmayan indirgenmiş sürüm.

**Faz D kararlarına etkisi:**
- Mevcut 3-state motion kapısı (`full/reduced/off` + OS tercihi + pil tasarrufu) WCAG yolunun üçünü de kapatır: `reduced` → %35 emisyon + halka ≤1 + shake/knock yok; `off`/pil → sıfır emisyon. Yeni kapı icat edilmez, mevcut kapılar tüketilir.
- Şölen animasyonu "essential" değildir (aynı bilgi sayaç/rozet/banner'da durur) → bastırılabilir olması zorunludur; test kilidi bunu pinler.

---

## 4. Cookie Clicker Wiki — Golden Cookie (kombo tasarım kanonu)

**URL:** https://cookieclicker.wiki.gg/wiki/Golden_Cookie

**Doğrulanmış sayılar (base değerler):**
- **Frenzy:** ×7 üretim, 77 sn, ~%40.
- **Click Frenzy:** ×777 tıklama başına, 13 sn, ~%3.
- **Lucky:** anında `min(banked×%15+13, CpS×900+13)` (15 dk üretim); banka 100 dk CpS'te tam verim.
- Building special / Dragon Harvest (×15, 60 sn) / Dragonflight (tık başına ×1111, 10 sn) / Cookie Storm (7 sn) / Cookie Chain / Sweet / Blab.
- **Kombo stratejisi (wiki Strategy bölümü):** "Combos are stacking effects… multipliers can quickly become gigantic." En basit kombo **Frenzy + Click Frenzy**; Click Frenzy doğal %3 ama Force the Hand of Fate ile ~%25'e çıkar; **Get lucky** yükseltmesi ikinci kurabiyenin frenzy bitmeden doğmasına izin verir → doğal kombo mümkün olur.

**Oyundaki eşleşme (birebir):**
| CC | UROBOROS | Değer |
| :--- | :--- | :--- |
| Frenzy | `fyp` Süpernova | 7×, 60 sn |
| Click Frenzy | `heart_frenzy` Kütle Patlaması | 777×, 15 sn |
| Lucky | `sponsor` Hawking | anında 2 dk kütle (CC'nin 15 dk'sının mobil-doz karşılığı) |
| FtHoF zorlamalı kombo | `void` | garanti kombo (30 sn 7× + 15 sn 777×) |
| Get lucky çakışması | `isComboActive` | 7× + 777× aynı anda = Süper Rezonans |

**Faz D kararlarına etkisi:**
- Rezonans sahnesi = iki sahnenin üst üste katmanı (mor + cyan + feast çekirdek) — CC'deki "çarpanlar üst üste biner, gigantik olur" hissinin canvas karşılığı. Yoğunluk ~2× (MotifBand'deki 8→14 kararıyla aynı doz).
- Hawking sahnesi ince tutulur (tek halka + hüzme + **gerçek miktar** yüzen yazısı) — CC Lucky'sinin "kasaya giren sayı" anı.
- Spawn/pity matematiği (`Tmin/Tmax`, pity 25) zaten oyunda mevcut; Faz D dengesine dokunmaz, yalnız kutlamayı büyütür.

---

## 5. Cookie Clicker Wiki — Wrinkler (parazit tasarım kanonu)

**URL:** https://cookieclicker.wiki.gg/wiki/Wrinkler

**Doğrulanmış sayılar:** her wrinkler CpS'nin %5'ini emer (max 10, Elder Spice/Dragon Guts ile +2'şer → 14); tıklama 0.75 hasar, can 2.1, yenilenme 1.2/sn; patlayınca emdiğinin **×1.1**'ini iade eder (kod yorumunda "cookie dough does weird things"); shiny 1/10000, ×3.3 iade; formül `1+N·W·(M·(N+2·S)−1)` (kuadratik ölçek).

**Oyundaki eşleşme:** 5 parazit, %3 emiş, 3 tık, %120–165 primli iade — CC kanonunun mobil-doz uyarlaması (GDD §4.2: %3 emer, %120 iade).

**Faz D kararlarına etkisi:** Wrinkler patlaması Faz D kapsamı DIŞIdır (mevcut konfeti + sayı yeterlidir); sahne tablosuna wrinkler sahnesi eklenmez — bütçe büyük olaylara saklanır. (Gelecek fazda istenirse `particles.ts`'e yeni satır olarak eklenir, mimari hazır.)

---

## 6. Vampire Survivors (sözleşme-içi sentez; doğrudan wiki çekilemedi)

- `vampiresurvivors.wiki.gg` bu ortamda 401 döndürdü; VS ayağı `brain/context/visual-language.md` §1'deki uzlaşmış senteze dayanır: *tutarlı orta fidelity + tek parlak kahraman yerine hipnotik overload + desatüre zeminden gelen okunabilirlik.*
- Faz D karşılığı: aynı canvas/piksel dili (yuvarlak kıvılcım + ince halka + konturlu yazı), olay anında 120–200 ms zemin knock-down, sonra geri. Yeni render stili yok.

---

## 7. Araştırma → uygulama izi (tek bakış)

| # | Kaynak bulgusu | Faz D kararı | Kod yeri |
| :--- | :--- | :--- | :--- |
| R1 | MDN: tek canvas + statik zemin CSS'te | M4 korunur; knock-down CSS sınıfı | `JuiceLayer.vue` + `style.css` Faz D bloğu |
| R2 | MDN: cap + `shadowBlur` yok + metin tavanlı | 60/8/220 cap; kontur-metod metin | `particles.ts` `PARTICLE_BUDGET` |
| R3 | MDN rAF one-shot + arkaplanda durur | idle-safe döngü korunur | `JuiceLayer.vue` `loop()` |
| R4 | WCAG 2.3.3 + reduce-motion | 3-state kapı; şölen essential değil | `particles.ts` `scaleCountForMode` + test |
| R5 | CC: Frenzy ×7 / ClickFrenzy ×777 / Lucky instant | sahne başına reçete + gerçek miktar yazısı | `FEAST_SCENES` + `clickAnomaly` kablosu |
| R6 | CC: kombo = çarpanların üst üste binmesi | rezonans = katmanlı sahne, ~2× yoğunluk | `resonance` spec |
| R7 | CC Wrinkler ×1.1 iade kanonu | wrinkler sahnesi YOK (kapsam dışı) | — (mimari hazır) |
