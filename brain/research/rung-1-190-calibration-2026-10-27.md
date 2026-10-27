# 190 DK KALİBRASYONU — Rung 1 (v2)

> **Durum:** TAMAMLANDI (2026-10-27). Subagent rapor yazımına geçmeden düştü; nihai `final.ts`/`final.mjs` çıktısı Lead tarafından yeniden çalıştırıldı ve bu rapor ona göre yazıldı.
> **Model:** Tek koşu, sıfırlama yok, `B = 5.5`, 8 sıfırlamasız mücadele, C8 ×2 bitirici.
> **Sonuç:** **188,8 dk (Max All)** / **189,1 dk (idle)**; son itiş **9,2 / 9,4 dk**. 8 mücadele 21,0–22,3 dk; 20 dk'dan uzun boşluk yok.

---

## 1. Yöntem

- Motor: `brain/scratchpad/chain-only-probe/190-calibration/engine.ts`.
- Gerçek sabitler: `src/game/number/tuning.ts` + `src/core/math.ts`; `src/` değişmedi.
- Üretim: `amount_i × baseRate_i × B^⌊bought/10⌋ × ödül/ceza`; besleme `0.11/sn × feedMult`, B beslemeye uygulanmaz.
- Cüzdan N; alım N'den düşer; halka *i+1* 10 alımda açılır.
- Mücadele sırasında **global besleme ×0,2** (`FEED_SEVERITY`); açılış ve final tam besleme.
- `goal = max(planHedefi, giriş + Δ)`, Δ=2 (log10); girişte hedef kilitlenir.
- Politikalar: **Max All** (0,5 sn, en derin halkadan 10'lu blok) ve **idle** (1,0 sn, manuel tık yok; ilk alıma kadar 2 tık).
- Tık: 0,5 sn (Max All) / 1,0 sn (idle).

---

## 2. Nihai değerler (Max All)

| # | Halka | Kilit | Hedef | Ceza | Ödül | Süre |
| :- | :--- | --: | --: | :--- | :--- | --: |
| C1 | Fingers | 1e10 | 1e33,242 | Fingers ≤10 alım · fiyat 1,22 · besleme ×0,2 | **Tam El:** Fingers ×10 · besleme ×1,5 | 21,1 dk |
| C2 | Notch | 1e33,242 | 1e37,376 | Fiyat 1,45 · besleme ×0,2 | **Beşli Çentik:** tüm halkalar ×5 | 21,0 dk |
| C3 | Abacus | 1e37,376 | 1e95,157 | Doğrudan katkı kapalı · fiyat 1,22 · besleme ×0,2 | **Basamak Taşması:** tüm halkalar ×3 | 21,0 dk |
| C4 | Pencil | 1e95,157 | 1e104,688 | Çürüme (τ=20 sn, taban %10) · fiyat 1,22 · besleme ×0,2 | **Uzun Çarpma:** ilk 3 halka ×5 | 22,0 dk |
| C5 | Calculator | 1e104,688 | 1e119,334 | Yalnız ilk 5 halka · fiyat 1,22 · besleme ×0,2 | **Anlık Sonuç:** doğrudan ×5 · besleme ×1,5 | 21,0 dk |
| C6 | Computer | 1e119,334 | 1e122,271 | Besleme /5 · fiyat 1,22 · besleme ×0,2 | **Overclock:** besleme ×1,5 | 21,1 dk |
| C7 | Supercomputer | 1e122,271 | 1e125,573 | Yalnız son alınan halka %100 (diğerleri ×0,25) · fiyat 1,22 · besleme ×0,2 | **Paralel Küme:** tüm halkalar ×4 | 22,0 dk |
| C8 | Mathematician | 1e125,573 | 1e128,967 | Fiyat 1,35 · besleme /2 · besleme ×0,2 | **Teorem:** üretim **×2** | 22,0 dk |

- Açılış: 0–8,3 dk (C1 kilidi 1e10).
- C8 sonrası final: **9,2 dk**; kapı **188,8 dk**.
- Idle: C1 8,4–29,5; C8 158,1–179,7; final **9,4 dk**; kapı **189,1 dk**.

---

## 3. Faz logu (Max All, 5 dk örnek)

```
  5 | 1e2.79  | -  | alim7 0    | /sn -
 10 | 1e11.51 | C1 | 30         | 1e10.54
 15 | 1e14.88 | C1 | 70         | 1e13.69
 20 | 1e21.76 | C1 | 150        | 1e21.46
 25 | 1e28.38 | C1 | 230        | 1e27.53
 30 | 1e33.75 | C2 | 280        | 1e32.69
 35 | 1e34.50 | C2 | 280        | 1e33.50
 40 | 1e36.36 | C2 | 280        | 1e34.15
 45 | 1e37.04 | C2 | 280        | 1e34.69
 50 | 1e37.30 | C2 | 280        | 1e35.14
 55 | 1e83.73 | C3 | 870        | 1e83.62
 60 | 1e88.24 | C3 | 920        | 1e87.72
 65 | 1e91.69 | C3 | 960        | 1e91.03
 70 | 1e94.19 | C3 | 990        | 1e93.57
 75 | 1e97.80 | C4 | 1030       | 1e95.64
 80 | 1e99.38 | C4 | 1050       | 1e99.02
 85 | 1e101.91| C4 | 1080       | 1e100.32
 90 | 1e103.67| C4 | 1100       | 1e101.91
 95 | 1e108.36| C5 | 1110       | 1e108.60
100 | 1e112.70| C5 | 1110       | 1e112.51
105 | 1e115.70| C5 | 1110       | 1e114.93
110 | 1e116.98| C5 | 1110       | 1e116.59
115 | 1e118.99| C6 | 1280       | 1e117.50
120 | 1e120.23| C6 | 1290       | 1e118.29
125 | 1e121.06| C6 | 1300       | 1e119.08
130 | 1e121.62| C6 | 1310       | 1e119.87
135 | 1e121.51| C6 | 1310       | 1e120.66
140 | 1e122.64| C7 | 1320       | 1e120.38
145 | 1e122.79| C7 | 1320       | 1e121.44
150 | 1e123.79| C7 | 1330       | 1e122.47
155 | 1e124.78| C7 | 1340       | 1e123.49
160 | 1e127.76| C8 | 1350       | 1e125.62
165 | 1e128.31| C8 | 1350       | 1e125.74
170 | 1e128.59| C8 | 1350       | 1e125.86
175 | 1e128.81| C8 | 1350       | 1e125.97
180 | 1e244.40| -  | 3000       | 1e246.41
185 | 1e297.65| -  | 3650       | 1e297.66
```

---

## 4. Sıkmama sözleşmesi — geçti/kaldı

| Kural | Sonuç | Durum |
| :--- | :--- | :--- |
| Toplam 190 ± 10 dk | 188,8 / 189,1 | ✅ |
| Her mücadele 15–24 dk | 21,0–22,3 | ✅ |
| 20 dk'dan uzun boşluk yok | Fazlar bitişik; açılış 8,3; final 9,2 | ✅ |
| Son itiş 8–12 dk | 9,2 / 9,4 | ✅ |
| Her ödül hissedilir | C5 +7,7% (en zayıf); diğerleri +31–101%; C8 +2,0 dk | ✅ (C5 sınırda) |
| Max All + idle | 188,8 / 189,1 | ✅ |
| NaN/taşma yok | — | ✅ |
| C8 ×100 (plan) | 181,7 dk; son itiş **2,1 dk** | ❌ final kuralı |

**Kritik:** Planın C8 ×100'ü bu kalibrasyonda son itişi 2,1 dk'ya düşürüyor; 8–12 dk kuralını ihlal ediyor. Önerilen **C8 ×2** (9,2 dk). ×1,5 → 10,0 dk; ×3 → 8,1 dk; ×4 → 7,4 dk (kural dışı).

| C8 | Toplam | Son itiş |
| --: | --: | --: |
| ×1 | 190,8 | 11,2 |
| ×1,5 | 189,6 | 10,0 |
| **×2** | **188,8** | **9,2** |
| ×3 | 187,7 | 8,1 |
| ×4 | 186,9 | 7,4 |
| ×5 | 186,4 | 6,8 |

---

## 5. Ödül hissedilirliği (Max All, ödül atlanınca sonraki mücadele)

| Ödül | Sonraki | Süre etkisi |
| :--- | :--- | --: |
| C1 fingers10 | C2 | 21,0 → 28,8 dk (**+37,2%**) |
| C2 all5 | C3 | 21,0 → 32,3 dk (**+53,8%**) |
| C3 all3 | C4 | 22,0 → 33,1 dk (**+50,4%**) |
| C4 first3x5 | C5 | 21,0 → 39,3 dk (**+87,0%**) |
| C5 direct5 | C6 | 21,1 → 22,8 dk (**+7,7%**) |
| C6 feed15 | C7 | 22,0 → 29,0 dk (**+31,7%**) |
| C7 all4 | C8 | 22,0 → 44,2 dk (**+101,2%**) |
| C8 finisher ×2 | final | 9,2 → 11,2 dk (×1 ile) |

C5 en zayıf halka; istenirse `direct5` ×5 → ×7 yapılıp yeniden ölçülebilir (toplam 190 ± 10 içinde kalır).

---

## 6. Uyarılar

1. **Hedefler süre odaklı çapalandı:** C1 1e33, C2 1e37, C3 1e95, C4 1e105, C5 1e119, C6 1e122, C7 1e126, C8 1e129. C3'te 58 basamaklık sıçrama var; sayı merdiveni pürüzsüz değil. Oyun içi his test edilmeli.
2. **Global besleme ×0,2** her mücadelede; açılış/final tam. Bu, 190 dk'yı tutan kalibrasyon kaldıracı; oyuncuya "mücadele sırasında zincir yavaşlar" olarak görünür.
3. **Final 179 basamak:** C8 sonrası 9 dk'da 1e129 → 1e308; logaritmik bar son anda çok hızlı dolar. Kapı anı bunu kapatmalı.
4. **C5 ödülü zayıf** (+7,7%); C8 ödülü "bitirici" değil, +2 dk hızlandırıcı. Daha dramatik final istenirse C8 hedefi düşürülüp × büyütülmeli; ama 8–12 dk kuralı sınırlıyor.
5. **v2 no-reset varsayımı:** Kullanıcının "boost alınca sayı sıfırlansın" modeli seçilirse bu kalibrasyon geçersiz; yeniden ölçülmeli.

---

## 7. Yeniden üretim

```powershell
npx esbuild brain/scratchpad/chain-only-probe/190-calibration/final.ts --bundle --platform=node --format=esm --outfile=brain/scratchpad/chain-only-probe/190-calibration/final.mjs
node brain/scratchpad/chain-only-probe/190-calibration/final.mjs
node brain/scratchpad/chain-only-probe/190-calibration/final-check.mjs
node brain/scratchpad/chain-only-probe/190-calibration/probe-c8mult.mjs
```
