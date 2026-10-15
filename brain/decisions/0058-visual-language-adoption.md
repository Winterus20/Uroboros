# ADR-0058: Görsel Dil Yayılımı — Tüm Proje (Rezerve Renk, 3-State Ramp, Metin→Görsel, Motion Kapısı)

- **Tarih:** 2026-10-15
- **Durum:** Kabul edildi ve uygulandı
- **Kapsam:** `src/components/**` (58 dosya), `src/composables/useMotion.ts` (yeni), `src/core/celebrate.ts`, `src/stores/game/actions-save.ts`, `src/style.css`
- **İlgili Belgeler:** [Görsel Dil Yayılım Sözleşmesi](../research/visual-language-adoption-spec-2026-10.md) (tek gerçek), [araştırma raporu](../research/visual-language-over-text-research-2026-10.md), kaynak pass `dfa4dce` (ramp/glif/rezerve renk/nav/motion 3-state), ADR-0057 (kart fiziği — motion kontratı ile aynı kök sınıflar), ADR-0049 (okunaklı Balatro dili)

---

## 1. Bağlam ve Problem

`dfa4dce` görsel dili yalnız `DimensionRow` + nav + ayarlarda konuşuyordu; oyunun geri kalanı "yazı yığını" idi. Denetim dalgası (4 paralel subagent) şunları raporladı:

1. **24 satın alma yüzeyi ikili durumdaydı** (açık/kapalı); üçüncü "kısmi" durum ve ramp yalnız kanonik `DimensionRow`'da vardı.
2. **147 renk çakışması / 46 dosyada sapma:** amber dekoratif başlıklarda, rose ödüllerde, farklı renkler "alınabilir" anlamında; satın alma butonlarında ad-hoc renk sınıfları (`btn-primary-*` ailesi tanımsız üyelerle).
3. **19 metin-oran gösterimi** (X/Y, %N) yalnız yazıydı; çubuk karşılığı yoktu.
4. **6 kritik bilgi yalnız tooltip'te** tutuluyordu (Header duruş çipleri, NeuralTree düğüm etkileri) — hover'sız mobilde kayıptı.
5. **Motion kontratı dişsizdi:** legacy kayıtta `motionMode` yok → varsayılan yanlış; ~30 konfeti çağrısı kapısızdı; 18/19 dokunma hedefinde `pointerdown` geri bildirimi yoktu; `CommentTicker` marquee'si `.reduce-anim` altında 0.001s döngüyle sonsuz `animationend` zinciri açabiliyordu.

## 2. Alınan Kararlar ve Çözümler

1. **Tek sözleşme dosyası:** `brain/research/visual-language-adoption-spec-2026-10.md` — 5 zorunlu kural (3-state ramp, rezerve renk, glif, oran=çubuk, motion+juice) + acceptance kriterleri. Uygulama ve QA bu belgeye karşı koştu.
2. **Durum ≠ Hue:** Ready durumu bölümün kimlik hue'unu korur (kanon `DimensionRow.vue`: `canAfford → '' + affordance-pulse`); `ds-ramp-partial` / `ds-ramp-locked` yalnız bu iki duruma uygulanır. `ds-ramp-ready` sınıfı DOM'a yazılmaz (ready'de kimlik + pulse vardır; 3 ölü `ds-ramp-ready` dönüşü QA bulgusuyla temizlendi).
3. **Rezerve renk sözleşmesi genişledi:** amber = yalnız progression/prestige/milestone; cyan = bonus/pozitif fırsat; rose = tehlike/kriz/risk; emerald/blue/violet/purple = yalnız bölüm kimliği. Nav noktaları bu dile bağlandı (cyan fırsat, rose risk, amber milestone). Sponsor anomalisi amber→cyan (ekran aurası `.crisis-aura-cyan` dahil).
4. **Paylaşılan hareket kapısı — `src/composables/useMotion.ts` (yeni):**
   - `useMotionMode()`: reaktif çözümlenmiş mod (`full|reduced|off`; legacy `reduceAnimations` fallback'i ile).
   - `isMotionReduced()` (reduced+off) / `isMotionOff()` (yalnız off): rAF/pointerdown sıcak yolları için kök-sınıf mührü (`useNavigation.syncEffectClasses` yazar; `core/tilt.ts` ile aynı kontrat).
   - Legacy kayıt migrasyonu (`actions-save.ts`): `motionMode` yoksa `reduceAnimations === true → 'reduced'` (HEAD taban çizgisiyle aynı eşleme; legacy etiket "Azaltıldı" idi — `'off'` daha güçlü bir kullanıcı kararıdır ve zorlanmaz) ve her yazımda `reduceAnimations = motionMode !== 'full'` senkronu — eski RA okuyucuları da doğru kararı görür.
5. **Konfeti kapısı:** `core/celebrate.ts` içinde `safeConfetti(...)` — `.motion-off`/`.reduce-anim` altında atlar; `force` opsiyonu yalnız ritüel anları için. ~30 çağrı noktası bu kapıdan geçirildi.
6. **CommentTicker statik mod:** kısıtlı/devre dışı harekette marquee HİÇ başlatılmaz (0.001s `animationend` zinciri riski yok); haberler 9s JS timer ile döner (gizli sekmede duraklar, unmount'ta temizlenir); full↔reduced geçişleri runtime'da iki yönlü ele alınır.
7. **Metin→çubuk deseni:** `progress-track` + `progress-fill-*`; mutlak sayı `text-[10px] tabular-nums` ikincil kalır. `.progress-track{width:100%}` unlayered kuralı utility'leri ezdiği için yeni sabit-genişlik çubuk yuvaları sarmalayıcı ile sınırlandı.
8. **Tooltip politikası: additive.** Hiçbir tooltip veri tek kanalı olarak kaldırılmadı; Header duruş çipleri ve NeuralTree etkileri görünür karşılık kazandı, tooltip nüans olarak korundu (v-tip sayısı azaldı, bilgi kaybı yok).
9. **Juice standardı:** `juice-punch` (pointerdown, ≤100ms tek impuls — WCAG 2.3.1), `rise-float` uçan "+N" metinleri; `.juice-punch` ilk kez gerçek tüketicilere bağlandı.

## 3. Doğrulama

- İzole QA denetimi (bağımsız subagent, sözleşmeye karşı 58 dosya): ilk tur **CONDITIONAL PASS** → 2 minor fix (sponsor aurası cyan; plaket filtre çipi nötr-parlak) + 3 ölü `ds-ramp-ready` temizliği + 1 gereksinim-yorumu düzeltmesi (legacy eşleme `'reduced'` — kod doğruydu, brief hatalıydı) → doğrulama turu **PASS**.
- `npm test`: **18 dosya, 263/263 yeşil** (baseline ile birebir).
- `npm run build` (`vue-tsc && vite build`): 1783 modül, 0 hata.
- `npm run harness:smoke`: 30 dk aktif koşu **log10=90.72, 8 shift** — ADR-0056/0057 tabanıyla birebir (denge regresyonu yok).
- Not: Bulunan/kabul edilen tek davranış dokunuşu: `ViralGrid` toplu ekim butonu artık "yetersiz kütle"de disabled vakasında görsel olarak locked rampasında (regresyon değil, sözleşme gereği).

## 4. Kapsam Dışı ve Sonraki Adımlar

- **F — Prestige ritüeli** (iki ekran kuralı, sıfırlama anı) bilinçli olarak dışarıda; ayrı iş olarak bekliyor.
- Bilinen, bloklamayan NIT'ler (QA raporu): `CommentTicker`/`MusicControls` kök-sınıf mührü setup anında okunur (reaktif `motionMode` terimi yanında savunma amaçlı — sıradaki düzenlemede tek kaynağa indirilebilir); `progress-track-lg` sınıfı önceden beri tanımsız (bu iş kapsamı dışı); `CrisisTab` faz çubuğu `progress-fill` taban sınıfını kullanmıyor (görsel olarak doğru).
- Gelecek yüzeyler (yeni sekmeler/kartlar) doğrudan sözleşme kurallarıyla doğar; `DimensionRow.vue` kanonik referanstır.
