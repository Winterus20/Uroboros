# ADR-0069: CRT Katmanının Kaldırılması (visual-language §3 L1 iptali)

- **Tarih:** 2026-10-18
- **Durum:** Kabul edildi (kullanıcı kararı) — kod temizliği F3/F4'te tamamlanacak
- **Kapsam:** Fullscreen CRT kaplaması (`style.css` `.crt-*` + `--crt-*`), `CrtOverlay.vue` (uçuşta zaten silinmiş), `crtEffect` ayarı, `crt-off` kök sınıfı, `visual-language.md` §1/§3/§4/§6
- **Önceller:** ADR-0061 (statik CRT kaplaması) + ADR-0062 (K0–K5 CRT şiddet eğrisi) — **bu ADR onların CRT ayağını iptal eder**; substrat/motif/glitch ayakları ve zemin/vinyet/motion kazanımları **korunur**
- **Bağlayıcı kopya:** `brain/context/visual-language.md` §3 (L1) · §4 (merdiven) · §1 (kaynak tablosu)
- **Kaynak denetim:** [`visual-language-compliance-audit-2026-10-18.md`](../research/visual-language-compliance-audit-2026-10-18.md) (§1.1 R1, §2)

## 1. Bağlam

Sözleşme §3 L1 *"CRT KAPLAMA (Balatro): scanline + curvature vignette + hafif fosfor (HEP AÇIK, frenli)"*
diyordu ve §4 K0–K5 için bir CRT opaklık eğrisi (—plan O3: %10 → %35 → %45) tanımlıyordu. ADR-0061 ile
`CrtOverlay.vue` (kök kardeşi, z=40) uygulandı ve ADR-0062 ile `[data-corruption]` altında
`--crt-intensity` / `--crt-scanline-alpha` / `--crt-vignette-alpha` / `--crt-glow-alpha` eğrisi bağlandı.

Sonraki bir uçuşta (commit edilmemiş) fullscreen şerit dokusu **istenmedi** gerekçesiyle:

- `style.css:516-524` beş sınıfı `display: none !important` ile susturdu,
- `useNavigation.ts:325-326` köke **koşulsuz** `crt-off` eklemeye başladı,
- `CrtOverlay.vue` silindi (DOM'da `.crt-layer` taşıyan **0** bileşen),
- `GameplaySettings` CRT toggle'ı kaldırıldı.

**2026-10-18 uyum denetimi** bu değişikliğin `brain/` içinde **hiçbir kaydı olmadığını** ortaya koydu
(§8 ihlali: "sapma gerekiyorsa önce bu belge güncellenir"). Denetim kararı kullanıcıya bıraktı;
kullanıcı **Yol B**'yi seçti: *"CRT'yi resmen kaldır — sözleşmeyi güncelle."*

## 2. Karar

1. **CRT kaplaması (L1) kaldırılır.** Fullscreen scanline / curvature / fosfor katmanı geri gelmeyecek;
   `CrtOverlay` yeniden yazılmayacak.
2. **Katman numaraları korunur.** L1 "iptal" olarak işaretlenir; `L2 = substrat`, `L3 = motif bandı`,
   `L4 = olay şöleni` etiketleri **değişmez** (kod yorumları ve ADR-0063/0064 bu numaralara atıf yapar).
3. **Bozulma merdiveni (§4) CRT ayağını kaybeder.** Derinleşme yalnız **substrat (L2) + motif bandı (L3) +
   bölgesel glitch** üzerinden yaşar. `--glitch-intensity` ve K4 `chromatic aberration` **sözleşmede kalır**
   ve gerçek tüketici kazanır (kullanıcı kapsam kararı: F4'te uygulanacak).
4. **Silinecekler (F3/F4):**
   - `style.css`: `.crt-layer/.crt-scanlines/.crt-vignette/.crt-glow/.layer-crt` blokları +
     `--crt-intensity`, `--crt-scanline-alpha/period`, `--crt-vignette-alpha`, `--crt-glow-alpha`
     tanımları + `.crt-scanlines-removed` + `.crt-off`/`.battery-saver` CRT kapıları (~56 satır);
   - `useNavigation.ts:325-326` koşulsuz `crt-off` eklemesi (kök sınıfı tamamen düşer);
   - `crtEffect`: `models/settings.ts:26`, `stores/game/state.ts:229`,
     `stores/game/actions-save.ts:804`, `core/__tests__/save.test.ts:73`;
   - `GameplaySettings` CRT kalıntıları (toggle uçuşta kaldırıldı).
5. **Kayıt uyumu:** `crtEffect` alanının kaldırılması **save version bump'ı gerektirmez**;
   eski kayıtlardaki fazla alan yok sayılır (deserialize bilinen anahtarları okur). `actions-save.ts`'teki
   "undefined ise true ata" migrasyon satırı silinir.

## 3. Reddedilenler

- **Yol A — CRT'yi geri getir:** kullanıcı fullscreen şerit dokusunu istemiyor; getirmek ürün kararına aykırı.
- **L1'i sessizce ölü bırakmak:** sözleşme "HEP AÇIK" demeye devam eder, ~56 satır erişilemez CSS ve
  5 tüketicisiz token kalır — denetimin bulduğu durumun ta kendisi.
- **"Hafif scanline"ı yalnız vinyetle taklit etmek:** `.cosmic-vignette` zaten sıcak vinyeti taşıyor;
  ikinci bir taklit katman katman mimarisini yeniden karmaşıklaştırırdı.

## 4. Sonuçlar

- **+** Sözleşme ile kod aynı gerçeği söyler; ~56 satır ölü CSS + 5 token + 1 zombi ayar kalkar.
- **+** Zer bir GPU/kompozit maliyeti düşer; "dünya filtrenin değil" ilkesi vinyet + substrat ile sürer.
- **−** Faz A'nın en görünür "CRT kimliği" kaybolur; Balatro bağı artık yalnız vinyet + kart fiziği + roll-up
  sayaç + "her sayının tavanı görünür" disiplininden gelir.
- **−** §4 merdiveninin K1 ayağı zayıflar → K1 görünürlüğü **substrat tabanı** ile telafi edilmeli
  (denetim T8: `.collage-torn` efektif α 0.0042 → görünür taban şart). Bu iş F4'ün kabul kriteridir.
- **−** "CRT" kelimesi birçok yorum/ADR'de tarihsel referans olarak kalır (silinmez; tarih kaydıdır).

## 5. Doğrulama

F4 sonunda: `--crt-*`/`.crt-*`/`crt-off`/`crtEffect` için `src` ve `dist`'te **0 referans**;
`npm run typecheck` 0 · `npm test` yeşil · `npm run build` 0 · `harness:smoke` baseline sabit
(`log10=90.72 shifts=8`) · `harness:perf` regresyon yok · `harness:contrast` AA.
