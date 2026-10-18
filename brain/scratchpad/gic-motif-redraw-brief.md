# GIC MOTİF YENİDEN ÇİZİM BRIEF'İ (16 SVG)

> Her motif subagent'ı bu dosyayı **okumak zorundadır**. Ortak dil buradan gelir,
> motif özeline dair kompozisyon talimatı ayrıca verilir.
> Bağlayıcı sözleşme: `brain/context/visual-language.md` §1/§5 · ADR-0060 · ADR-0063.

---

## 0. Neden yeniden çiziyoruz (mevcut durumun teşhisi)

Mevcut 16 SVG bir **tek tip çizgi ikon seti** gibi duruyor, kolaj değil:

- Mükemmel daireler (`r="11"`, `r="10"`), eşit aralıklı ızgara (8 kol tam 45°),
  tam 5×5 dama.
- Her dosyada aynı `stroke-width="2"` → parça ağırlığı hiyerarşisi yok.
- Sıfır doku, sıfır asimetri, sıfır oyuk (delik), sıfır dikiş izi, sıfır serpinti.
- Birkaçı UI ikonu gibi okunuyor (hedef/nisangâh, parıltı, şimşek) — dekoratif motif değil.

Gekidan Inu Curry dili bunun tam tersidir: **elle kesilmiş kâğıt kolajı**.

---

## 1. KESİN TEKNİK KONTRAT (ihlal = test/build kırılır)

- Dosya yolu: `src/assets/motifs/<id>.svg` — **id değişmez** (slot kontratı, test kilitli).
- `viewBox="0 0 32 32"`, **tek satır** gövde (mevcut 16 dosyayla aynı biçim).
- Kök etiket şablonu:

```
<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">…</svg>
```

- Dosya **`currentColor` string'ini ve `<svg` içermek zorundadır** (`motifs.test.ts` kilitler).
- İzinli elemanlar: `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `g`,
  ve `transform`/`fill`/`stroke`/`opacity`/`stroke-width`/`stroke-dasharray`/`fill-rule` öznitelikleri.
- **YASAK:** `id=`, `url(#…)`, `<defs>`, `<style>`, `<filter>`, gradient, `mask`,
  `clipPath`, `<text>`, `<image>`, `<script>`, harici referans, `var(--ds-bg)` gibi
  arka plan rengi hilesi.
  - Sebep: aynı glif DOM'da **28 kez** tekrarlanıyor; id çakışır ve renk yalnız
    `currentColor` üzerinden tek hue'dan gelir.

---

## 2. RENDER BAĞLAMI (neden böyle çiziyoruz)

| Öge | Değer |
| :--- | :--- |
| Gerçek boyut | **24×24 px** (mobil ≤767px: 17×17 px) |
| Yan şerit genişliği | 46px (mobil 28px) |
| Renk | tek hue (`currentColor`), opaklık 0.45–0.85 |
| Zemin | `#0a0608` (sıcak ink-black) |
| Ek dönüşüm | glif ±9–18° döner, dikey sürüklenir, üst/alt maskeyle solar |
| Tekrar | şeritte 8–14 glif × 2 yarım = aynı anda 28 kopyaya kadar |

**Okunabilirlik tabanı:**
- En küçük ayırt edilebilir öge ≈ **2.2 birim** (24px'te ≈1.65px).
- Saç teli çizgi en az **1.4 birim**; 1.4'ün altı 24px'te toza döner.
- İki öge arası boşluk 1 birimin altına inerse çamura döner.
- **Squint testi:** glif 24px'te göz kısılarak bakıldığında **silüetten** tanınmalı.
  Tanınmıyorsa kütleyi büyüt, süsü azalt.

---

## 3. GIC ÇİZİM KURALLARI (araştırma sentezi)

Kaynak: Sakuga Blog ("Collage of Collages") + Puella Magi Wiki + Wikipedia +
ADR-0060/0063. Öz: *"dikkatlice bakınca çürüyen sevimli masal"*. Teknik: kâğıt kolaj +
stop-motion + karışık malzeme; etki: Rus/Çek animasyonu (Trnka, Švankmajer) ve
Terry Gilliam kesme kâğıt ara sahneleri. Her cadının **tek temalı** labirenti vardır.

1. **Makas cetvel değildir.** Kontur elle kesilmiş: 8–12 köşeli, yarıçapları **eşit
   olmayan** çokgen. Mükemmel daire ve tam simetri YASAK. Kesilen kenar hafif dalgalı.
2. **Kütle hiyerarşisi.** Bazı parçalar dolu kütle (`fill="currentColor"`), bazıları
   ince çizgi. Kalınlık motife göre bilinçli oynar: **1.4–2.8**.
3. **Oyuk (tekrar eden korku kökü: delik).** Silüetin içinde **gerçek boşluk**.
   Tek hue'da oyuk yalnız iki yolla olur:
   - (a) **açık path** (kapalı değil) — kopmuş/kesilmiş kenar,
   - (b) **`fill-rule="evenodd"`** ile alt-path çıkarımı — kütleden oyulmuş delik.
   Arka plan rengi boyayan hile YASAK.
4. **Yanlış anatomi / yanlış sayı.** Göz bebeği fazla büyük, diş fazla veya eksik,
   tırnak fazla, ızgarada bir kare kayık, saatte bir tırnak çift. Sevimli ama bozuk.
5. **Kayma (off-register).** İkincil parça 0.8–2 birim kaymış / kaçık yapışmış;
   eşmerkezli olmayan halkalar; iki yarının kenarı birbirini tutmaz.
6. **Dikiş / eklem izi.** Stop-motion kukla eklemi: 2–4 kısa çizgi
   (`stroke-dasharray` 1.5–2.6), kesik kontur, kopmuş veya açık halka.
7. **Mikro doku.** Dama, tarama (2–3 paralel kısa çizgi), nokta — kâğıt dokusunun
   tek hue karşılığı.
8. **Kırıntı & serpinti.** Okunmayan küçük not/etiket izi, uçuşan 1–3 kâğıt parçası.
   Kolaj kaosu; **ama abartma** — serpinti glifin okunuşunu bozmasın.

### Kolaj reçetesi (her glif için iskelet)

```
1 ana kütle  +  1 oyuk  +  1 kayma/katman  +  1 dikiş izi  +  (isteğe bağlı) serpinti
```

5–6 parçadan fazlasına çıkma; 24px'te çamur olur.

---

## 4. YASAKLI OKUMA (semantik çakışma)

Bunlar UI ikonu gibi okunur, dekoratif motif olmaz — yeniden çizimde **hepsi düzelir**:

| Motif | Eski hata | Doğru okuma |
| :--- | :--- | :--- |
| `vida` | artı + çember + ışın = hedef/nisangâh ikonu | tek yiv (slot) bandı, çıkıntılı göbek, yiv tırtıkları |
| `yildiz` | 4 uçlu parıltı = sparkle/success ikonu | elle kesilmiş 5 uçlu, uçları eşit olmayan yıldız + kuyruk |
| `catlak` | şimşek/yıldırım = enerji ikonu | iki ayrı yırtık kenar arasında kama şeklinde boşluk + kopan parça |
| `goz`, `ay`, `tekerlek`, `saat` | Lucide/Feather oranları | organik, kesilmiş, fazla büyük bebek; halka yerine kütle |

Kural: motif **"X'in kesilmiş kâğıt hali"** olmalı, **"X için UI ikonu"** değil.

---

## 5. ŞEFFAFLIK KANONU (kırılmaz)

- Renk tek `currentColor`; ton `motifs.ts` kaydından (`feast` / `bone` / `ember`)
  ve CSS'ten gelir — **motifin içine renk gömülmez**.
- Rezerve durum hue'ları (rose/cyan/amber/purple) dekorasyonda kullanılmaz.
- Motif sayı/etiket okumaz, tıklanamaz, `aria-hidden` kalır.

---

## 6. İŞİ BİTİRME (zorunlu self-check)

- [ ] `<svg` ve `currentColor` dosyada var; `id=` / `url(` / `<style>` / `<defs>` **yok**.
- [ ] `viewBox="0 0 32 32"`; tüm içerik **2 birim marj** içinde (kırpılma yok).
- [ ] 24px'te silüetten tanınır (squint testi geçti).
- [ ] Kütle + oyuk + kayma + dikiş izi mevcut.
- [ ] Simetrik/mükemmel geometri, dairesel ızgara, eşit aralıklı kol yok.
- [ ] `npm test` / `npm run build` **çalıştırılmaz** — merkezî doğrulama yapılacak.
      Yalnız `grep -c` ile yasaklı token kontrolü yapılır.
