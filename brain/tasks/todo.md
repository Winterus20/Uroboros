# Yapılacaklar (Backlog)

> Bağlayıcı kaynaklar: [ADR-0086](../decisions/0086-run-reset-and-boost.md) (güncel
> 1. basamak modeli) · [`theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
> (50 karar + §11 spec + §12 görsel dil) · [`GAME_DESIGN.md`](../../GAME_DESIGN.md) §8.
> Görev sahipliği: kod dalgası `src/`, belge dalgası kök + `brain/`.
>
> **Durum (2026-10-31):** 1. basamak **v3 uygulandı ve kalibre edildi** (ADR-0086). Boost güç
> kaynağıdır ve mücadelelerden önce açılır; boost alımı veya mücadele girişi sayıyı ve zinciri
> sıfırlar, boost sayacı ile ödüller kalır. `B = 5.3`, hedefler log10 10,5–78,0, intended
> **181,0 dk**. Eski 190 dk kalibrasyonu (188,8 / 189,1 dk) **geçersiz**. Final kapı
> (`npm run verify`, 230/230) ve commit tamam; 2. basamak tasarımı sırada.

## ✅ 1. basamak v3 dalgası (ADR-0086)

- [x] **Zincir:** 8 halka (Fingers → Mathematician), `c_i = 25·8^i`, birim fiyatı ×1,20, 10'lu blok,
      10 birim → sonraki halka. Fingers sayıyı üretir, halka 2–8 doğrudan katkı da yazar
      (`RING_DIRECT_SHARE`), `+1` elle Fingers. → `src/game/number/tuning.ts` · `economy.ts`
- [x] **Blok çarpanı:** `B = 5.3`, halka başına `B^⌊bought/10⌋`; yalnız üretime, beslemeye asla.
- [x] **Boost ekonomisi:** `BOOST_MULT = 1.8`, `boostRequirement = ceil(50·1,35^n)`, fiyat
      `blok(son halka)·1,5^n`; alımda sayı + zincir sıfırlanır, sayaç kalır; kapı/prestijde sayaç
      sıfırlanır. → `tuning.ts` · `economy.ts` · `stores/game.ts`
- [x] **Sıfırlamalı mücadele (C1–C8):** girişte sayı `10`, halkalar 0, kilitler yalnız Fingers;
      hedefler log10 10,5 · 20,1 · 29,8 · 39,4 · 49,1 · 58,7 · 68,4 · 78,0; kilit `bestNumber`;
      sıra zorunlu; çıkış sıfır koşuyu korur; global besleme ×0,2, fiyat büyümesi 1,22.
- [x] **Kayıt v24:** `boostCount`; v20–v23 kayıtları `boostCount: 0` ile açılır.
- [x] **Çevrimdışı:** mücadele hedefi aşıldığı adımda tamamlanır, blok sonunda değil.
- [x] **Ses:** ticker çekirdeği + 8 mücadele başlangıcı / 8 tamamlanma / kapı + 3 boost sahnesi
      (`src/game/voice/lines-rung1.ts`).
- [x] **Belgeler:** ADR-0086 modeli ve final kalibrasyon GDD, AGENTS, README ve `brain/` dosyalarına
      işlendi (2026-10-31).
- [x] **Kalibrasyon (T3):** gerçek motor, `dt = 1 s` — intended **181,0 dk** (11 boost) ·
      0-greedy 195,8 · challenges-only 289,6 (1,60×) · boost-only 672,6 (3,72×) · base 1031,9
      (5,70×). Mücadele koşuları: C1 17,1 · C2 7,7 · C3 8,0 · C4 8,8 · C5 9,3 · C6 18,8 ·
      C7 10,5 · C8 14,2 dk; final itiş 52,7 dk. 181 × 26,4 ≈ 79,6 sa; 85 saat için ×1,176.
- [x] **Denge kilidi:** `balance.test.ts` + `rung1.integration.test.ts` reset modeline göre
      yeniden yazıldı ve kalibre edildi.

### ⛔ ADR-0083/0086 ile geçersiz (tarihsel)

- ~~ADR-0083 v2 — tek koşu, 190 dk, 8 sıfırlamasız mücadele~~ → ADR-0086 sıfırlamalı modele geçti;
  188,8 / 189,1 dk ölçümleri ve 21–22 dk mücadele bantları geçersiz.
- ~~K2 — `Tanım = log10(1+A)` prestiji + 4 `Tanım` yükseltmesi~~ → prestij yalnız `+1 Tanım`;
  yükseltme yok (ADR-0082'de silindi, geri gelmedi).
- ~~K3 — Mini boost (`(zirve/başlangıç)^0,2`)~~ → kaldırıldı (ADR-0082); ADR-0086 boost'u farklı
  formülle (sabit `1,8^n`, fiyat merdiveni) geri getirdi.
- ~~K5 — 2 saatlik / 121,9 dk / 119,0 dk koşu ölçümleri~~ → 190 dk tek koşu kalibrasyonu
  ([`rung-1-190-calibration-2026-10-27.md`](../research/rung-1-190-calibration-2026-10-27.md));
  o kalibrasyon da ADR-0086 ile geçersiz.
- ~~v1 planı — 4 öğrenme + 6 Math sıfırlaması, 120 dk~~ → gerçek motorla çürütüldü (ADR-0083 §Bağlam).
- ~~P1 — açılış fiyatı 25 mi 20 mi~~ → 190 dk kalibrasyonu `c_1 = 25` üzerine kuruldu; değişirse
  yeniden kalibrasyon gerekir.

## ⏭️ Sıradaki işler

1. ~~**Rung 1 v3 final denetimi:** `npm run verify` ve Conventional Commit.~~ → ✅ 2026-10-31:
   typecheck 0, 230/230 test, build OK; commit edildi.
2. **Rung 1 his testi** (sahip, oyun içi): intended 181 dk akışı, boost farmı 9.–114. dk ve
   mücadele sırası. Sonuca göre ADR-0086 eki veya yeniden kalibrasyon.
3. **2. basamak tasarımı** (`E5`, kendi turunda): `1e(9e15)` hedefi, `OmegaNum` adaptörü + kadran
   (`T1`, `T2`), `Tanım`ın ne işe yaradığı, prestij sonrası koşunun nasıl başladığı. Şu an
   prestij yalnız `rung = 2` yazar; koşu aynı 1. basamak zinciriyle sürer, 2. basamak içeriği yok.
4. **Commit + push:** tüm v3 dalgası (kök belgeler + `brain/` + `src/`) tek Conventional Commit.
5. **`A6` — başarımlar:** mücadeleler artık var (C1–C8); başarım sistemi ve metinleri sıfırdan.
6. **`A7` — müzik motoru:** `src/core/music/*` eski temadan kalma parçaları taşıyor (lofi · synthwave
   · ambient · subway); uyarlama mı yeniden yazım mı kararı verilmedi.
7. **Bulut/hesap ekranlarının dili ve görünümü:** `AuthModal` ve `CloudConflictModal` hâlâ Türkçe
   metinli ve eski kart/gölge diliyle çiziliyor — P3 (İngilizce) ve "Saf Sayı" (ADR-0078) ile
   uyumlu hale getirilmeli.
8. **`G13` / `G14`:** mobil dizgi (390 px) ve ticker'ın yeri/boyu.
9. **`G11`:** 400 ms nefes sahnesi — boost artık gerçek bir mekanik; animasyon boost alımına
   bağlanacak mı, arşive mi gidecek kararı.
10. **`A5` — `LNGN` final sahnesi:** tek cümle, ironisiz (`V6`), `G8` motorunu kullanır, **en son**.

## 🟡 Açık tasarım maddeleri

- [x] `A1` **Görsel dil** — ✅ kapandı → ADR-0078 ("Saf Sayı", `G1`–`G12`)
- [x] `R2` **Boost reset modeli** — ✅ kapandı → ADR-0086: boost alımı ve mücadele girişi sayıyı +
      zinciri sıfırlar; boost sayacı kapı/prestijde sıfırlanır
- [x] `R3` **Üç yolun dengesi** — ✅ kalibre: challenges-only 289,6 dk (1,60×), boost-only
      672,6 dk (3,72×), base 1031,9 dk (5,70×); intended 181,0 dk
- [x] `R4` **Toplam süre** — ✅ 85 saat hedefi ×1,176 eğrisiyle korunuyor (projeksiyon 79,6 sa)
- [ ] `A4` **Mizah yoğunluğu** — ticker ve `RungScene` kapısı bağlı; başarım kanalı yok (A6 ile)
- [ ] `A5` **`LNGN` final sahnesi** — en son yazılır
- [ ] `A6` **Başarımlar** — hacim büyük
- [ ] `A7` **Müzik motoru** — uyarlama mı yeniden yazım mı
- [ ] `A8` **İngilizce metin sahipliği** — kural yazıldı (ajan yazar, sahip redakte eder);
      hacim tamamlanmadı
