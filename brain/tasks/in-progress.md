# Aktif Görev (In-Progress)

## 🎭 AKTİF — `Hold That Number` · 1. basamak dikey dilimi (2026-10-23)

**Durum:** tasarım kapandı (**38 karar**), sıra **kodda**. Dikey dilim, proje sahibi "bitti" diyene kadar sürer (`E9`).

**Tek gerçek kayıt:** [`theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
— §2 karar günlüğü · §11 1. basamak spec + `E7`–`E14` · §6 devam noktası.
**ADR:** [0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) ·
**Ses sözleşmesi:** [narrative-voice.md](../context/narrative-voice.md) ·
**Senaryo:** [number-ladder-script-2026-10.md](../research/number-ladder-script-2026-10.md)

### 1. basamak spec (kilitli)

| Alan | Karar |
| :--- | :--- |
| Zincir | Parmaklar → Çentik → Abaküs → Kalem → Hesap Makinesi → Bilgisayar → Süperbilgisayar → Matematikçi |
| Yön | Aşağıdan yukarı; Parmaklar sayıyı üretir; `+1` = elle Parmaklar (`E6`) |
| Alım | Sınırsız, fiyat ×1,3-1,5, 2 saatte ~100-150 alım (`E10`) |
| Kilit | Bir halkadan 10 birim → sonraki halka (`E11`) |
| Döngü | 8. halkada mini boost: tam sıfırlama + `(zirve/10)^0,2` çarpan (`E12`–`E14`) |
| Kapı | 1,79e308 → prestij: sayı `10`, `Tanım = log10(1+A)`, verim `0,9^log10 A` (`E7`) |

### Sıradaki adım — kod (dikey dilim)

1. **Sayı ekonomisi:** 8 halka, sınırsız alım, 10 birim kilidi, `Parmaklar` sayıyı üretir.
2. **Prestij + `Birikim`:** `1,79e308` kapısı, sayı `10`'a döner, `Tanım` hesabı, verim cezası.
3. **Mini boost:** tam sıfırlama + zirveye bağlı çarpan, 8. halka koşulu.
4. **`+1` butonu** + 1. basamak ticker satırları.

Görsel dil (`A1`) ve İngilizce metin sahipliği (`A8`) hâlâ açık; 1-2. adımlar bunlara bağlı değil.

### Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `A1` | Görsel dil (palet/tipografi/estetik) | 🔴 ayrı konuşma — UI yazılmadan önce kapılmalı |
| `A4` | Mizah yoğunluğu ayarı (kapalı/ölçülü/tam) | 🟡 yayından önce |
| `A5` | `LNGN` final sahnesi | 🟡 en son |
| `A6` | Başarımlar (86) + meydan okumalar (13) metinleri | 🟡 hacim büyük |
| `A7` | Müzik motoru (`src/core/music/*`) | 🟡 uyarlama mı yeniden yazım mı |
| `A8` | İngilizce metni kim yazıyor | 🟡 yazım dalgasından önce |

### Temizlik notu (2026-10-23)

- Eski tema dönemi kayıtları (**2026-09 → 2026-10-20**) ve ölçüm artefaktları silindi: eski ekonominin
  harness çıktıları, oyun içi ekran görüntüleri, tamamlanmış görsel-dil fazlarının derin spec'leri.
  Hepsi git geçmişinde duruyor.
- **Silinmeyenler:** `brain/decisions/` (ADR = karar kaydı, içerik değil), `brain/context/`,
  `completed.md` (tarihçe), janra/matematik referansları, pivot belgeleri.
