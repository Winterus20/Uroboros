# ADR-0057: Balatro Sütun 3 — Taktil Kart Fiziği (Spring Damping & Push Dynamics)

- **Tarih:** 2026-10-15
- **Durum:** Kabul edildi ve uygulandı
- **Kapsam:** `src/core/`, `src/components/DimensionRow.vue`, `src/style.css`
- **İlgili Belgeler:** [Balatro UI/UX Sentez Yol Haritası §Sütun 3](../research/balatro-uiux-synthesis-roadmap.md), ADR-0049 (Okunaklı Balatro Dil), ADR-0044 (Screen Shake İzolasyonu), ADR-0056 (Faz 0 sertleştirme), görsel dil geçişi `dfa4dce` (motion 3-state kontratı)

---

## 1. Bağlam ve Problem

Yol haritasının son uygulanmamış taktil sütunu Sütun 3 idi (Sütun 1/2/5 v0.27–v0.29'da tamamlanmıştı). Mevcut durum:

1. **v-tilt zayıflıkları:** `holoCardsEnabled` ayarı yalnızca `mounted` anında okunuyordu — ayar değişimi remount gerektiriyordu. Dokunmatik cihazlarda `pointermove` tilt tetikleyerek kaydırma jank'ı üretiyordu. Bırakış düz `ease` idi (yay hissi yok). Oyun içi `motionMode` kontratına (`.reduce-anim` / `.motion-off`) hiç bağlı değildi; yalnız OS `prefers-reduced-motion` okunuyordu.
2. **Bas-bırak geri bildirimi yoktu:** `buy-bounce` yalnızca 220ms'lik tek ölçek animasyonuydu ve v-hold spam'inde her 100ms yeniden başlıyordu → titreşen çift hareket; "lastik gerilmesi → yay fırlaması" (roadmap spec: `scaleY(0.92) scaleX(1.04)` → elastic bounce) yoktu.
3. **Push Dynamics yoktu:** Satın alma anında komşu kartların manyetik açılması (2-3px) uygulanmamıştı.

## 2. Alınan Kararlar ve Çözümler

1. **Saf çekirdek modülü — `src/core/card-physics.ts`:**
   `pushDirectionFor(tier, boughtTier)` (D1-D8 sınır korumalı komşu yönü) ve `isPressFeedbackFresh(pressReleaseAt, now)` (300ms bas-bırak penceresi) DOM'suz, node-vitest ile test edilebilir. Süre sabitleri (`CARD_RELEASE_MS` 420, `CARD_PUSH_MS` 240) CSS ile senkron; `card-physics.test.ts` ile pinlenir.
2. **v-tilt sertleştirme (`core/tilt.ts`):**
   - `updated` kancası: `disabled` canlı uygulanır (attach/detach).
   - Dokunmatik koruması: `pointerType === 'touch'` tilt'i tetiklemez (hover metaforu).
   - Yay bırakışı: `cubic-bezier(0.34, 1.56, 0.64, 1)` / 500ms (overshoot'lu geri oturma).
   - Merkezi hareket kontratı: `motionBlocked()` etkileşim anında `.reduce-anim` / `.motion-off` kök sınıflarını ve OS tercihini okur; ayar değişimi sayfa yenilemeden etkili olur, hover sırasında kısıt gelirse tilt anında geri oturur.
3. **Bas-bırak lastik gerilmesi (`DimensionRow.vue` + `style.css`):**
   - Yeni `.card-physics-shell` sarmalayıcı katmanı: squash/release/push transform'ları dışta yaşar; v-tilt inline transform'u iç kartta kalır (transform çakışması mimari olarak imkânsız).
   - `pointerdown` (sol tık) → `.card-squash` (`scale3d(1.04, 0.92, 1)`, 90ms); `pointerup/cancel/leave` → `.card-released` yayı (420ms). Basılı tutarken buton "yetersiz kütle" ile `disabled` olursa `pointerup` kaçabilir: pencere seviyesinde güvenlik ağı gerilmenin takılı kalmasını önler.
4. **Push Dynamics:** Başarılı manuel satın almada `doomscroll:dimension-buy` CustomEvent'i (mevcut `doomscroll:*` veri kanalı deseniyle uyumlu) yayınlanır; ±1 tier komşu satırlar 2.5px / 240ms açılır. **Yalnız tek tık alımlarında** — v-hold spam'inde titreşim üretmez; autobuyer alımları bu yolu zaten kullanmaz.
5. **buy-bounce bastırma kuralı:** Bas-bırak penceresi (300ms) tazeyken eski bounce çalışmaz (çift hareket yığılması biter). Klavye aktivasyonunda damga boş kaldığı için bounce korunur.
6. **Hareket kontratı:** JS tarafında `reduceAnimations` kapısı; CSS tarafında OS `prefers-reduced-motion` kapsamı (push animasyonları `animation: none` listesine, squash/release `transform: none !important` bloğuna eklendi).

## 3. Doğrulama

- `npm test`: **18 dosya, 263/263 test yeşil** (4 yeni card-physics testi; sınır testi tier 0/9 korumasını yakalattı).
- `npm run typecheck`: 0 hata. `npm run build`: 1782 modül, 0 hata.
- `npm run harness:smoke`: 30 dk aktif koşu **log10=90.72, 8 shift — ADR-0056 tabanıyla birebir aynı** (denge regresyonu yok).
- Not (ortam): Termux'ta `node_modules/.bin` shebang'leri `termux-fix-shebang` ile düzeltildi (node_modules dışına taşmaz).

## 4. Kapsam Dışı ve Sonraki Adımlar

- Lab hücreleri ve diğer kart yüzeyleri (roadmap'te adı geçer) bilinçli olarak dışarıda; şimdilik yalnız D1-D8 format kartları.
- Görsel dil geçişinin kalanları: F — Prestige ritüeli (iki ekran kuralı), B — DimensionsTab shift/galaxy metin sadeleştirmesi, v-tip azaltma. Sütun 4 (özel sürümler) zaten milestone rozetleriyle kısmen mevcut; oyun etkisi gerektiren kısmı ayrı değerlendirilmeli.
