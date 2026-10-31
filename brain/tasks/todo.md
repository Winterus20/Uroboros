# Yapılacaklar (Backlog)

> Bağlayıcı kaynaklar: [ADR-0083](../decisions/0083-rung-1-single-run-challenge-model.md) (güncel
> 1. basamak modeli) · [`theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
> (50 karar + §11 spec + §12 görsel dil) · [`GAME_DESIGN.md`](../../GAME_DESIGN.md) §8.
> Görev sahipliği: kod dalgası `src/`, belge dalgası kök + `brain/`.
>
> **Durum (2026-10-31):** 1. basamak **v2 kodda tamam** — 1,79e308'e kadar tek koşu, sıfırlama
> yok, 8 sıfırlamasız mücadele, kapıda prestij (`+1 Tanım`, `rung = 2`). Kalibrasyon 188,8 dk
> (Max All) / 189,1 dk (idle). Sıradaki büyük iş **2. basamak tasarımı**.

## ✅ Uygulanan — 1. basamak v2 (ADR-0083)

- [x] **Zincir:** 8 halka (Fingers → Mathematician), `c_i = 25·8^i`, birim fiyatı ×1,20, 10'lu blok,
      10 birim → sonraki halka (mandallı). Fingers sayıyı üretir, halka 2–8 doğrudan katkı da yazar
      (`RING_DIRECT_SHARE`), `+1` elle Fingers. → `src/game/number/tuning.ts` · `economy.ts`
- [x] **Blok çarpanı:** `B = 5.5`, halka başına `B^⌊bought/10⌋`; yalnız üretime, beslemeye asla.
- [x] **8 sıfırlamasız mücadele (C1–C8):** giriş/çıkış/tamamlama sayıyı, halkaları ve B'yi
      değiştirmez; ceza overlay + kalıcı ödül; mücadelede global besleme ×0,2; C8 ödülü üretim ×2.
      → `challenges.ts` · `ChallengePanel.vue` · `GoalBar.vue`
- [x] **Kapı + prestij:** `1,79e308` → `GateModal`, `+1 Tanım`, `rung = 2` (2. basamak henüz yok;
      koşu korunur). `RungScene` (G8) basamak değişiminde tetiklenir, `humor` kapısına bağlı.
- [x] **Kayıt v23:** `challenges`, `gateReached`, `tanim`; v20–v22 kayıtları açılır.
- [x] **Ses:** ticker çekirdeği + 8 mücadele başlangıcı / 8 tamamlanma / kapı satırları
      (`src/game/voice/lines-rung1.ts`).
- [x] **Denge kilidi:** `balance.test.ts` + `rung1.integration.test.ts` (190 dk bandı).

### ⛔ ADR-0083 ile geçersiz (tarihsel)

- ~~K2 — `Tanım = log10(1+A)` prestiji + 4 `Tanım` yükseltmesi~~ → prestij yalnız `+1 Tanım`;
  yükseltme yok (ADR-0082'de silindi, geri gelmedi).
- ~~K3 — Mini boost (`(zirve/başlangıç)^0,2`)~~ → kaldırıldı (ADR-0082); yerine sıfırlamasız mücadeleler.
- ~~K5 — 2 saatlik / 121,9 dk / 119,0 dk koşu ölçümleri~~ → 190 dk tek koşu kalibrasyonu
  ([`rung-1-190-calibration-2026-10-27.md`](../research/rung-1-190-calibration-2026-10-27.md)).
- ~~v1 planı — 4 öğrenme + 6 Math sıfırlaması, 120 dk~~ → gerçek motorla çürütüldü (ADR-0083 §Bağlam).
- ~~P1 — açılış fiyatı 25 mi 20 mi~~ → 190 dk kalibrasyonu `c_1 = 25` üzerine kuruldu; değişirse
  yeniden kalibrasyon gerekir.

## ⏭️ Sıradaki işler

1. **2. basamak tasarımı** (`E5`, kendi turunda): `1e(9e15)` hedefi, `OmegaNum` adaptörü + kadran
   (`T1`, `T2`), `Tanım`ın ne işe yaradığı, prestij sonrası koşunun nasıl başladığı. Şu an
   prestij yalnız `rung = 2` yazar; koşu aynı 1. basamak zinciriyle sürer, 2. basamak içeriği yok.
2. **Rung 1 his testi** (sahip, oyun içi): `R2` / `R3` / `R4` (aşağıda). Sonuca göre ADR-0083 eki
   veya yeniden kalibrasyon.
3. **`A6` — başarımlar:** mücadeleler artık var (C1–C8); başarım sistemi ve metinleri sıfırdan.
4. **`A7` — müzik motoru:** `src/core/music/*` eski temadan kalma parçaları taşıyor (lofi · synthwave
   · ambient · subway); uyarlama mı yeniden yazım mı kararı verilmedi.
5. **Bulut/hesap ekranlarının dili ve görünümü:** `AuthModal` ve `CloudConflictModal` hâlâ Türkçe
   metinli ve eski kart/gölge diliyle çiziliyor — P3 (İngilizce) ve "Saf Sayı" (ADR-0078) ile
   uyumlu hale getirilmeli.
6. **`G13` / `G14`:** mobil dizgi (390 px) ve ticker'ın yeri/boyu.
7. **`G11`:** 400 ms nefes sahnesi — boost kalktığı için tetikleyicisi yok; yeni bir ana
   bağlanacak mı, silinecek mi kararı.
8. **`A5` — `LNGN` final sahnesi:** tek cümle, ironisiz (`V6`), `G8` motorunu kullanır, **en son**.

## 🟡 Açık tasarım maddeleri

- [x] `A1` **Görsel dil** — ✅ kapandı → ADR-0078 ("Saf Sayı", `G1`–`G12`)
- [ ] `R2` **Boost reset modeli** — sahibin "boost alınca sayı sıfırlansın" açıklaması tek koşu
      modeliyle çelişiyor; seçilirse ADR-0083 kalibrasyonu yenilenir
- [ ] `R3` **Mücadele hissi** — C5 ödülü en zayıf (+%7,7); C3'te 58 basamak sıçrama; final 9 dk'da
      179 basamak
- [ ] `R4` **Toplam süre** — 135 saat (×1,25) mi, 85 saat (×1,165) mi
- [ ] `A4` **Mizah yoğunluğu** — ticker ve `RungScene` kapısı bağlı; başarım kanalı yok (A6 ile)
- [ ] `A5` **`LNGN` final sahnesi** — en son yazılır
- [ ] `A6` **Başarımlar** — hacim büyük
- [ ] `A7` **Müzik motoru** — uyarlama mı yeniden yazım mı
- [ ] `A8` **İngilizce metin sahipliği** — kural yazıldı (ajan yazar, sahip redakte eder);
      hacim tamamlanmadı
