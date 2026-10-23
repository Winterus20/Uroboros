# Yapılacaklar (Backlog)

> Tek gerçek kayıt: [`theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
> (50 karar + §11 spec + §12 görsel dil). Görev sahipliği: kod dalgası `src/`, belge dalgası
> kök + `brain/`.
>
> **Durum (2026-10-23):** 1. basamak dikey dilimi **kodda tamam** (`K1`–`K5`); denge ölçüldü ve
> regresyon testine bağlandı; ekonomi **A+** turunda yeniden ölçüldü (parmak 1/sn, 10'lu blok).
> Sıradaki iş **2. basamak tasarımı**. Uygulama kaydı:
> [ADR-0079](../decisions/0079-number-economy-vertical-slice.md).

## ✅ Tamamlanan — 1. basamak dikey dilimi (E8)

- [x] **K1 — Sayı ekonomisi:** 8 halka (Fingers → Mathematician), sınırsız alım (birim fiyatı
      ×1,20, 10'lu blok), bir halkadan 10 birim → sonraki halka (mandallı); `Fingers` sayıyı üretir,
      `+1` elle Fingers. → `src/game/number/` (tuning · economy · upgrades · rungs)
- [x] **K2 — Prestij + `Tanım`:** `1,79e308` kapısı; prestijde sayı başlangıca döner,
      `Tanım = log10(1+A)`, verim `0,9^log10 A`; 4 `Tanım` yükseltmesi (start · chain · boost · autobuy).
- [x] **K3 — Mini boost:** 8. halka koşulu, tam sıfırlama (halkalar 1 birime), `(zirve/başlangıç)^0,2`
      basamak içi kalıcı çarpan; `Tanım` vermez.
- [x] **K4 — `+1` butonu + ticker:** `+1` gerçekten 1 ekler; İngilizce ticker çekirdeği
      (`src/game/voice/`), `humor` kapısı, tekrar önleme.

## 🟡 Devam eden — `K5` denge ölçümü

- [x] **K5 — Denge (ölçüm):** 2 saatlik basamak ölçüldü, sabitler `tuning.ts`'e işlendi.
      - **Fiyat revizyonu (2026-10-23):** halka fiyatları tek değişmezden türetildi — her halka
        0,08/sn üretir, her halka bir öncekinin 3,2 katı eder, **her halka 40 sn'de kendini öder**.
        Yeni merdiven **25 · 80 · 250 · 800 · 2 500 · 8 000 · 25 000 · 80 000**; geri ödeme bandı
        39–40 sn; koşu **121,9 dk · 23 boost · 122 alım**. Çalışma:
        [`ring-pricing-2026-10-23.md`](../research/ring-pricing-2026-10-23.md).
        *(A+ revizyonuyla geçersiz — aşağıdaki madde.)*
      - Set A simülasyonu: kapı **119,8 dk** · **23** boost · **121** alım · halka açılışları
        **12,2–37,3 dk** · ilk 10 dk **9** alım · döngü **3,69 dk**.
      - **Gerçek motor (20 TPS) doğrulaması:** kapı **119,6 dk** · 23 boost · 121 alım · ilk 10 dk 9
        alım → hedef birebir tutuyor; naif Euler'in %17 farkı motorun sırasında oluşmuyor.
      - `src/game/number/balance.test.ts` → **6 regresyon testi** (kapı 110–130, boost 18–24,
        halka başına en az bir blok, ilk 10 dk ≥6 karar, 8 halka <45 dk, tıklamasız başlangıç
        imkânsız).
      - **Kalan açık (belge borcu):** "son halka ≥ 90. dk" hedefi ölçümle **revize edildi**
        (test "8 halka <45 dk" diyor). Bu revizyon yazılı karar kaydına geçirilmeli.
      - Araç: `node brain/scratchpad/balance-2026-10-23/sim.mjs --all` · rapor: `report.md` §11.
- [x] **K5/A+ — Ekonomi revizyonu (2026-10-23, üçüncü tur):** halka 1 `1` sayı/sn
      (`NUMBER_RATE`), halka 2–8 `0,11` birim/sn (`CHAIN_RATE`), fiyat `×8` merdiveni
      (25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 · 52 428 800), birim büyümesi
      `g = 1,20`, **10'lu blok = bir halka** (`BLOCK_SIZE = 10`; blok fiyatı
      `c·g^b·(g^10−1)/(g−1)`), kilit eşiği 10 birim = tek blok. Ölçüm (gerçek motor, 20 TPS,
      2 tık/sn): kapı **119,0 dk** · **21** boost · **371** birim alımı · ilk 10 dk **42** karar ·
      halka açılışları 0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · **17,1** dk. Belgeler:
      `GAME_DESIGN.md` §4/§7 · [ADR-0079](../decisions/0079-number-economy-vertical-slice.md)
      "A+ revizyonu" eki. Çalışma:
      [`ad-pricing-and-chain-math-2026-10-23.md`](../research/ad-pricing-and-chain-math-2026-10-23.md) §6.

## ⏭️ Sıradaki işler

1. **2. basamak tasarımı** (`E5`: kendi turunda). `OmegaNum` adaptörü + kadran (`T1`, `T2`)
   burada devreye girer; `A5` finali de aynı turda konuşulmaz.
2. **`A5` — `LNGN` final sahnesi:** tek cümle, ironisiz (`V6`), `G8` motorunu kullanır, **en son**.
3. **`A6` — başarımlar + meydan okumalar:** eski 86 + 13 silindi; yeni metinler sıfırdan.
4. **`A7` — müzik motoru:** `src/core/music/*` eski temanın parçalarını taşıyor; uyarlama mı
   yeniden yazım mı kararı verilmedi.
5. **`G13` / `G14` kapanışı:** mobil dizgi (390 px) ve ticker'ın yeri/boyu — UI yazılırken.
6. **`A4` mizah kapısı:** ticker hazır; `RungScene`'e ve başarım kanalına kapı eklenmeli.
7. **Sahne motorları:** `G8` yazıldı (`RungScene.vue`, 2.500 ms) ama basamak ilerlemediği için
   tetiklenmiyor ve `humor` kapısı bağlı değil; `G11` (400 ms boost nefesi) yok.

## 🟡 Açık tasarım maddeleri

- [x] `A1` **Görsel dil** — ✅ kapandı → ADR-0078 ("Saf Sayı", `G1`–`G12`)
- [ ] `A4` **Mizah yoğunluğu ayarı** — sözleşme yazıldı (`narrative-voice.md` §9); ticker kapısı var,
      sahne (`RungScene`) ve başarım kapıları eksik
- [ ] `A5` **`LNGN` final sahnesi** — en son yazılır
- [ ] `A6` **Başarımlar + meydan okumalar** — hacim büyük
- [ ] `A7` **Müzik motoru** — uyarlama mı yeniden yazım mı
- [ ] `P1` **Açılış fiyatı (`c_1`)** — uygulanan 25 (15 tık, 121,9 dk). Yumuşak alternatif 20
      (10 tık, 113,3 dk) ölçüldü, uygulanmadı. Karar proje sahibinde; tek satır + test alt sınırı.
      **A+ sonrası hâlâ geçerli:** birim fiyatı 1,20 ile artıyor ama ilk parmak yine 25, yani açılış
      yine 15 tık; 20 alternatifi de yine 10 tık. A+ koşusunda ölçülen kapı 119,0 dk.
- [ ] `A8` **İngilizce metin sahipliği** — kural yazıldı (ajan yazar, sahip redakte eder);
      hacim tamamlanmadı (`R2`)
