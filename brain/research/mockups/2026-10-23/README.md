# Mockup artefaktları — 2026-10-23 (görsel dil oturumu)

> **Bunlar üretim kodu değildir.** ADR-0078 (`G1`–`G12`) kararlarının görsel kanıtıdır.
> Hiçbiri `src/` ile bağlantılı değil; tarayıcıda açılan tek dosyalık HTML'ler + headless Chrome render'ları.
> Yerel sunucuyla açılır: `python -m http.server 8123 --directory <bu klasör>`.

| Dosya | Ne gösteriyor | Hangi karar |
| :--- | :--- | :--- |
| `typecast.png` (+`.html`) | 9 font adayı, aynı zeminde, oyunun gerçek metinleriyle | `G4` |
| `rung-color-ab.png` | 11 basamak: tek eksen (A) vs 11 ayrı hue (B) | `G5` |
| `rung-arcs.png` | İlk üç yay denemesi — pastel çöktü | `G5` (reddedilen) |
| `rung-arcs2.png` | Sabit parlaklık + tam kroma — neon çıktı | `G5` (reddedilen) |
| `rung-arcs3.png` | **Kabul edilen** parlaklık zarfı (vii/viii/ix) | `G5` |
| `retro-1440.png` (+`.html`) | Retro terminal (C) sitenin gerçek düzeniyle — reddedildi | `G1` |
| `pure-1440.png` (+`.html`) | **Saf sayı (B)** — kabul edilen yön | `G1`–`G3` |

**Not:** `m6x11plus.ttf` yalnız `typecast.html` için buraya kopyalandı (karşılaştırmanın 9. adayı).
Asıl dosya `public/fonts/m6x11plus.ttf`; lisans kaydı `public/fonts/ATTRIBUTION.md`.

Tüm render'lar: Chrome `--headless=new`, 1440×900 (tek sayfa 1500px), `--virtual-time-budget`.
Swirl katmanı `src/components/AlgorithmicSwirl.vue` içindeki GLSL'in birebir kopyasıdır.
