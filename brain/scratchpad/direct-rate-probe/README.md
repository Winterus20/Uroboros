# Halka → sayı doğrudan katkısı — ölçüm artefaktları (2026-10-23)

Karar: [ADR-0081](../../decisions/0081-ring-direct-number-contribution.md).
Kod: `RING_DIRECT_SHARE` ([tuning.ts](../../../src/game/number/tuning.ts)).

## Ne ölçüldü

| Soru | Yöntem | Sonuç |
| :--- | :--- | :--- |
| Katkı dengeyi bozuyor mu? | **Gerçek motor** (`src/game/number/economy.ts`), `balance.test.ts` politikası, 20 TPS | kapı **118,85 dk** (taban 119,0) · 21 boost · 371 alım |
| Katkının `/s` içindeki payı | aynı motor, 60/300/600/1800/3600/5400. sn örnekleri | tırmanışta **%1,4–3,6**, boost sonrası ilk saniyede **%52** |
| Daha büyük değerler | `RING_DIRECT_SHARE` = 2 ve 4 | 117,94 dk / 116,72 dk; pay %3–7 / %6–13 |

Gerçek motor ölçümleri **geçici bir vitest dosyasıyla** yapıldı: `balance.test.ts` kopyası +
`const result = simulate({ dt: 0.5, tapsPerSecond: 2 })` satırının altına `console.log('PROBE', ...)`.
Dosya ölçümden sonra silindi (regresyon kilidi `balance.test.ts`'te kalır).

## `probe-variants.mjs`

`k5-sim.mjs`'in (mirror motor) kopyası + `q` dizisi: halka başına doğrudan hız. **Yön bulmak için**
kullanıldı, otorite değil: mirror tabanı 123,7 dk, gerçek motor 119,0 dk (aradaki fark politika
ayrıntısından). Elenen adaylar: düz `q`, `p·0,25`, `8^i` ve `4^i` ölçekleri — `8^i` 60. dakikada
Fingers'ın 28 katına çıkıyor (zinciri ikinci plana atıyor).

```powershell
node brain/scratchpad/direct-rate-probe/probe-variants.mjs
```

## Ekran görüntüleri

| Dosya | Ne gösterir |
| :--- | :--- |
| `chain-rows.png` | Masaüstü zincir satırları: `52 · 6/s · +6/s` |
| `chain-rows-mobile.png` | 390 px: `1 K · 127/s · +127/s` tek satırda, taşma yok |
| `chain-row.png` | Tam sayfa (hero + zincir + dock) |
