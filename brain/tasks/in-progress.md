# Aktif Görev (In-Progress)

> Güncel model: [ADR-0083](../decisions/0083-rung-1-single-run-challenge-model.md) — 1. basamak tek
> koşu, 1,79e308'e kadar sıfırlama yok, 8 sıfırlamasız mücadele, ~190 dk, kapıda prestij.
> Eski dalgaların ayrıntılı kayıtları: zincir-only (ADR-0082) ve ölçüm turu (2026-10-27) →
> [`completed.md`](completed.md); v1 planı (4+6 sıfırlama, 120 dk) →
> [`rung-1-plan-2026-10-27.md`](../research/rung-1-plan-2026-10-27.md) — sayıları ADR-0083 ile geçersiz.

## 🟢 Şu an aktif iş yok

Sıradaki iş [`todo.md`](todo.md) → "Sıradaki işler" §1: **2. basamak tasarımı**. Başlarken buraya
taşıyın.

## ✅ Son kapanan — "Laboratuvar" arayüz yeniden tasarımı (2026-10-31)

**Durum:** Uygulama tamam, `npm run verify` yeşil, commit edilmedi (sahip karar verecek).
Kayıt: [ADR-0085](../decisions/0085-laboratuvar-ui-shell.md) · `completed.md` [2026-10-31].

## ✅ Önceki — Rung 1 v2 uygulaması (2026-10-28)

**Durum:** Uygulama tamam, kapılar yeşil. Kayıt: ADR-0083 · `completed.md` [2026-10-28].

- **190 dk tek koşu**, `B = 5.5`, 8 sıfırlamasız mücadele, C8 ×2, save v23.
- **Kalibrasyon:** 188,8 dk (Max All) / 189,1 dk (idle); final 9,2 / 9,4 dk; mücadeleler 21–22 dk.
- **İnceleme probları (2026-10-31):** `brain/scratchpad/rung1-review/` (mücadele giriş politikası,
  akıllı oyun) — yalnız ölçüm, oyun kodu değişmedi.

## 🟡 Sahip kararı bekleyen maddeler

| Konu | Durum |
| :--- | :--- |
| `R2` Boost reset modeli ("boost alınca sayı sıfırlansın") | 🟡 sahip oyun içi testte karar verecek |
| `R3` C5 ödülü (+%7,7) · C3 58 basamak sıçrama · final 179 basamak | 🟡 his testi |
| `R4` Toplam 135 saat mi 85 saat mi | 🟡 sahip kararı |
