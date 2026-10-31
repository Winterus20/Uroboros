# ADR-0085: "Laboratuvar" Arayüz Kabuğu — Uygulama Kabuğu, Bölüm Kayıt Defteri, Basamak Vurgusu

## Durum

**Kabul edildi & uygulandı (2026-10-31).** Sözleşme: [`visual-language.md`](../context/visual-language.md)
(baştan yazıldı). Onaylanan konsept: `brain/scratchpad/ui-concepts-2026-10-31/a-laboratuvar.html`.

Kısmen geçersiz kılar: [ADR-0078](0078-pure-number-visual-language.md) (`G2` swirl, `G3` kart/köşe
yasağı, §5 tek sütun anatomi, "basamak rengi yalnız hero + swirl" sınırı) ve
[ADR-0084](0084-swirl-luminance-cap.md) (swirl artık yok; tavan kuralı konusuz kaldı).
ADR-0078'in tipografi (`G4`), basamak yayı/formülü (`G5`), rezerve renkler (`G6`), sahne (`G8`),
dizgi (`G9`), `+1` değişmezliği (`G10`) ve hareket kapısı kararları **geçerli**.

---

## Bağlam

Sahip 1. basamak oyun testinden sonra arayüzü tatmin edici bulmadı: "Saf Sayı" tek sütunu (ticker ·
hedef satırı · hero · `+1` · zincir · metin dock) sakin ama **oyun gibi değil**di; swirl ise ya
sayıyla yarışıyor ya da görünmüyordu (ADR-0084 ve eki). İstek üç maddeydi:

1. **Modern, oyun hissi veren ama çocukça olmayan** bir arayüz (Exponential Idle / Swiss grid tonu).
2. **Genişletilebilir:** ileride prestij katmanları ("Definitions") ve yeni mekanikler gelecek; her
   biri yeni bir yeniden tasarım değil, **veri + bir sayfa** olmalı.
3. Sayı yine ekranın kahramanı kalmalı.

Dört konsept (`a-laboratuvar`, `b-grafik`, `c-agac`, `d-terminal`) tam ekran yan yana karşılaştırıldı;
sahip **A — Laboratuvar**'ı seçti. Turlar boyunca iki ek karar verdi:

- **Sağ istatistik/yan panel reddedildi** — geri gelmez.
- **`+1` küçük, normal bir tuş** olmalı: ne dev, ne gizli; yine de gerçek bir mekanik gibi hissettirmeli
  (basış sayacı, yüzen "+1", sayıda küçük vuruş).

## Karar

### 1. Kabuk (grid)

```
┌ üst çubuk 52 px ── marka · kaynak çipleri · hedef · ayarlar ─────────────┐
│ sol menü 232 px │ ana alan (içerik ≤ 1040 px, ortalı)                     │
│  RUNG 1         │  hero: basamak hapı + ad · SAYI · /sn · "Next …" · [+1] │
│  Chain          │  bölüm başlığı + açıklama · eylemler                    │
│  Challenges 3/8 │  veri tablosu                                           │
│  ??? (kilit)    │                                                         │
│  …              │                                                         │
│  Statistics     │                                                         │
└ durum çubuğu 30 px ── ● ticker ……………………………… 20 tps · autosave 10s ┘
```

≤ 900 px: menü **aynı kayıt defterinden** alt sekme çubuğu olur, tek sütun; hero 72/60 px sabit
ölçeğe iner (auto-fit değil), tablolar iki-üç satırlık ızgaraya katlanır.

### 2. Bölüm kayıt defteri (`src/ui/sections.ts`)

Menü ve aktif sayfa tek listeden çizilir: `{ id, label, icon, page, placement, hero?, visible?,
unlocked?, badge? }`. Sayfası olmayan (`page: null`) ya da `unlocked` false olan kayıt adını
söylemez: **"???" + kilit ikonu**, tıklanamaz. Bugün iki yer tutucu var (gelecek katmanlar).
Yeni katman = bir kayıt + bir sayfa bileşeni; App/NavRail değişmez.

### 3. Kaynak çipleri (`src/ui/resources.ts`)

Üst çubuktaki para birimleri de listedir: bugün sayı (`+X/s` ile); `tanim > 0` olunca amber
"Definitions" çipi. Yeni birim = bir kayıt.

### 4. Vurgu = basamak rengi

`App.vue` kök elemana `--pn-rung` yazar (`store.rungInfo.color`); `--pn-rung-soft/-line/-hover`
`style.css`'te `color-mix` ile türer. Basamak değişince tüm arayüz tek değişkenle yeniden boyanır.
Vurgu **yalnız eyleme açık durumda** (alınabilir fiyat, Enter, aktif menü ikonu, aktif mücadele) ve
hero sayıda kullanılır; amber prestij/milestone, rose tehlike, gri kilitli olarak rezerve kalır.

### 5. Yüzeyler ve biçim

Tuval `#08090c` → `s1 #0e1015` (kabuk) → `s2 #14161d` (kontrol) → `s3 #1b1e27` (basılı/dolgu);
çizgiler `#1d2029` / `#2a2e3a`; metin `#ecebe6` / `#8e8d88` / `#5a5b63`. Köşe 6–8 px (işaret 3–4).
**Gölge, blur, gradyan dolgu yok.** Fontlar değişmedi (Space Grotesk + Space Mono).

### 6. Ortak yapı taşları

`components/shell/` (TopBar · NavRail · StatusBar), `components/ui/` (SegmentedControl · BuyButton ·
BlockPips · SectionHeader · ProgressBar), `HeroNumber` (sayfa başlığı) ve `style.css`'teki ortak
sınıflar (`.dt` veri tablosu, `.btn`, `.pill`, `.kbd`, `.field-input`, `.modal`, `.notice`).
Yeni mekanik sayfası bunları kullanır, kendi dilini kurmaz.

### 7. `+1`

36 px yüksekliğinde mono "+1" + `space` kbd ipucu; altında "N presses"; her basışta 600 ms yükselen
küçük "+1" ve hero sayıda 160 ms vuruş. Geri bildirim `store.taps` izlenerek doğar → fare ve klavye
aynı. Etiket/davranış asla değişmez (`G10`).

### 8. Swirl kaldırıldı

`AlgorithmicSwirl.vue` silindi, Ayarlar'daki "Swirl" seçimi kalktı. `settings.swirlShaderQuality`
alanı **kayıt şeklini korumak için modelde durur** (okunmaz); `SAVE_VERSION` değişmedi (23).

### 9. Durum çubuğu teknik satırı

Yalnız gerçek sabitler: `TICK_MS` ve `AUTOSAVE_MS` (`core/game-loop.ts`'ten dışa açıldı).
"saved 4s ago" gibi izlenmeyen değer yazılmaz (V4).

## Reddedilen seçenekler

- **Sağ istatistik paneli** (konsept turlarında vardı) — sahip reddetti: dikkati sayıdan böler,
  dar ekranda yer yoktur.
- **B (grafik), C (ağaç), D (terminal) konseptleri** — tam ekran karşılaştırmada seçilmedi.
- **Dev `+1` / gizli `+1`** — sahip açıkça "normal bir tuş" istedi.
- **Swirl'ü kabukta tutmak** — yüzeyli kabukta zemin görünmez; ADR-0084'ün okunabilirlik
  sorunu da kendiliğinden kalkar.

## Sonuçlar

- Ekonomi çekirdeği, store mantığı ve kayıt şeması **değişmedi**. Kısayollar (space/+, 1–8, Escape)
  ve `growthStopped` koruması aynı.
- Modal katman sırası korundu: sahne 30 · ayarlar 40 · çevrimdışı 45 · kapı 50 · çakışma 55 · giriş 60.
  Auth/Conflict modalları Tailwind slate/cyan/blur/gölge dilinden yeni tokenlara taşındı (metinleri
  değişmedi — Türkçe kopyaları ayrı bir P3 işi).
- Kontrast (ölçüldü, `#08090c` üzerinde): metin 16,7:1 · dim 6,0:1 · faint 2,95:1 (pasif ton) ·
  1. basamak vurgusu 12,8:1 · 8. basamak `#5a78ff` 5,3:1 (s2 üstünde 4,8:1). Vurgu artık küçük
  metinde de (hap, "Active", bağlantı) kullanıldığından 8. basamak sınırdadır — o basamak
  tasarlanırken yeniden ölçülmeli.
- Zincir tablosu kilitli halkalardan yalnız ilk ikisini satır olarak çizer; kalanlar "+N more rings"
  sayacında toplanır (gizleme değil, sayaç gerçek sayıyı yazar).
- Zincir PRODUCES sütunu doğrudan katkıyı "+X/s to number" olarak ayrı satırda gösterir; BLOCK
  sütunu `bought % 10` göstergesi + mevcut blok çarpanı (çarpan 1 iken metin susar).
