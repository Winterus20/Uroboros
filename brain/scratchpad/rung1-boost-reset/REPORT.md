# RUNG 1 BOOST+RESET KALİBRASYONU (task-3)

Tarih: 2026-10-31 · Kaynak: ADR-0086 · Durum: uygulandı, testler yeşil.

## Uygulanan sabitler

| Sabit | Değer |
| :--- | ---: |
| BLOCK_MULT | 5.3 |
| BOOST_MULT | 1.8 |
| BOOST_BASE_REQUIREMENT | 50 |
| BOOST_REQUIREMENT_GROWTH | 1.35 |
| BOOST_PRICE_GROWTH | 1.5 |
| CHALLENGE_FEED_MULT | 0.2 |
| C2 / C8 growth | 1.22 |
| Hedefler (log10) | 10.5, 20.1, 29.8, 39.4, 49.1, 58.7, 68.4, 78.0 |

unlockLog10 = önceki mücadelenin hedefi (C1 = 10).

## Ölçüm (gerçek motor, dt=1 s)

| Yol | Süre | Not |
| :--- | ---: | :--- |
| intended (optimal tohum [4..11]) | **181.0 dk** | 11 boost · koşular 17.1/7.7/8.0/8.8/9.3/18.8/10.5/14.2 · farmlar 9,17,24,32,50,58,66,75,84,103,114 · final push 52.7 |
| intended (0'dan greedy [1..8]) | 195.8 dk | 8 boost (lokal optimum; tohumlu politika daha iyi) |
| challenges-only (0 boost) | **289.6 dk** | 8/8 tamam · 1.60× intended |
| boost-only (optimal k=7) | **672.6 dk** | 3.72× intended · merdiven 8.9/16.9/24.4/32.3/39.4/47.6/55.0 · final@k7 617.5 |
| base (no meta) | 1031.9 dk | boost-only k=0 |

Projeksiyon: 181.0 × 26.4 = **79.6 sa**; × 42.6 = 128.5 sa.

## Teşhis satırları

- C1 boostsuz: 36 dk (10 dk altına inmiyor; hedef 1e10.5).
- Karma politika (C1 boostsuz, sonra greedy): 199.0 dk.
- 5-boost floor zorlaması: 172.0 dk — kanıt değil, yalnız teşhis.
- Eski 190 dk / tek koşu kalibrasyonu ADR-0086 ile geçersizdir.

## Komutlar

    npx esbuild brain/scratchpad/rung1-boost-reset/final-report.ts --bundle --format=esm --platform=node --outfile=brain/scratchpad/rung1-boost-reset/final-report.mjs
    node brain/scratchpad/rung1-boost-reset/final-report.mjs
    npx vue-tsc --noEmit            # 0
    npx vitest run                  # 10 dosya, 230/230

## Dosyalar

- brain/scratchpad/rung1-boost-reset/model.ts — bağımsız referans model (B, boost, reset).
- brain/scratchpad/rung1-boost-reset/harness.ts — gerçek motor harness'i (nihai ölçüm).
- brain/scratchpad/rung1-boost-reset/final-report.ts — nihai tablo.
- src/game/number/tuning.ts · challenges.ts — sabitler/hedefler.
- src/game/number/balance.test.ts · rung1.integration.test.ts — reset+boost politika testleri.
