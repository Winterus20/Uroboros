# ADR-0056: Planck Duvarı Sert Kilit (Hard-Cap) ve Break Singularity Ritüeli

- **Tarih:** 2026-10-14
- **Durum:** Kabul edildi ve uygulandı (v0.39.0)
- **Kapsam:** `src/core/`, `src/stores/game/`, `src/components/`
- **İlgili Belgeler:** ADR-0013 (Singularity Autobuyer), ADR-0023 (3.5 saat bandı), ADR-0034 (SP yalnızca şafakta), ADR-0051 (Maliyet İvmelenmesi), ADR-0054 (Yumuşak Tavan), ADR-0055 (Faz 0 Stabilizasyonu)

---

## 1. Bağlam ve Problem

1. **Sert Kilit (Hard-Cap) Yokluğu:**
   Önceki sistemde `break_singularity` yükseltmesi satın alınmamış olsa bile kütle $1.797 \times 10^{308}\text{ g}$ (`D_INFINITY`) sınırını aşabiliyor ve $10^{500}$'e kadar serbestçe tırmanabiliyordu. Bu durum:
   - "Planck Duvarı"nın gerçek bir engel veya sınır olma anlamını yok ediyordu.
   - Oyuncuda aşılması gereken bir "duvar" ve duvarı aşınca gelen "kırılma (break)" dopaminini öldürüyordu.
2. **Kırılma Ritüelinin Zayıflığı:**
   `break_singularity` alındığında oyun sadece SP formülündeki böleni 100'den 45'e düşüren sıradan bir pasif yükseltme gibi davranıyordu; oyuncu sınırın kalktığını taktil olarak hissedemiyordu.
3. **UI ve State Uyuşmazlığı:**
   `SingularityTab.vue` içinde `singularityBroken` sadece `store.singularityUpgrades?.break_singularity` kontrol ederken, `getters-misc.ts` hem dükkan hem ağaç (`neuralNodesBought`) kayıtlarını kontrol ediyordu. Ayrıca kütle doyuma ulaştığında sayaç bunu bildirmiyordu.

---

## 2. Alınan Kararlar ve Çözümler

1. **Matematiksel Sert Kilit (Hard-Cap Contract):**
   - `miscActions.addMatter(amount, trackTotal)` ve `update()` içindeki ana tick döngüsüne Planck Duvarı garantisi eklendi:
     ```ts
     if (!this.hasBreakSingularity && this.matter.gte(D_INFINITY)) {
       this.matter = D_INFINITY
       return
     }
     ```
   - `isMatterCapped` getter'ı tanımlandı (`!this.hasBreakSingularity && state.matter.gte(D_INFINITY)`).
2. **SP ve Sonraki Eşik Sözleşmesi:**
   - `singularityGain`: Planck Duvarı kırılmamışken kütle $1.79 \times 10^{308}\text{ g}$'de kilitli kalır ve ilk çöküş tam olarak **1 SP** verir (ADR-0034 ile tam uyumlu).
   - `nextSingularityPointAt`: Planck Duvarı kırılmadığı sürece bir sonraki hedef kilitlidir (`D_INFINITY` döner). Kırıldıktan sonra $10^{318}$ (5 SP), $10^{332}$ (10 SP) merdiveni açılır.
3. **Taktil Kırılma Ritüeli ve Geri Bildirim:**
   - `buyNeuralNode` ve `buySingularityUpgrade` içinde `break_singularity` satın alındığı an:
     - `sounds.playSingularity()` derin kozmik ses tonu tetiklenir.
     - 160 parçacıklı geniş açılı kozmik konfeti (`safeConfetti`) patlar.
     - `doomscroll:screen-shake` (level: `hard`) ekran sarsıntısı tetiklenir.
4. **UI Entegrasyonu:**
   - `CounterDisplay.vue`: Kütle tavana dayandığında (`isMatterCapped`) sayacın üstünde kırmızı neon uyarı belirir:  
     `⚠️ PLANCK DUVARI KİLİTLİ: OLAY UFKU DOYDU (1.79e308 g) — ÇÖKÜŞ ZORUNLU`
   - Saniyelik üretim göstergesi `0 g/s [Olay Ufku Kilitli]` olarak netleşir.
   - `SingularityTab.vue`: Hero rozeti duvar kilitliyken `⚠️ Planck Duvarı Kilitli`, kırıldıktan sonra `⚡ Planck Sınırı Yıkıldı` olarak senkronize edilir.

---

## 3. Doğrulama ve Sonuç

- **Birim Testleri:** `src/stores/balance.test.ts` güncellendi ve genişletildi (259/259 test yeşil).
- **Harness Doğrulaması:** `npm run harness:smoke` çalıştırıldı — 30 dakikalık aktif oyunda log10=90.72, 8 sıçrama, ekonomi donmasız çalıştı.
- **Pacing:** İlk koşu ~2 saat 28 dakikalık matematiksel bandını korur; $1.79 \times 10^{308}\text{ g}$'ye ulaşıldığında kütle durur, oyuncu ilk çöküşünü yapar (1 SP), birkaç koşu sonra `break_singularity`'i kırarak $10^{350}-10^{4000}$ evresine adım atar.

---

## 4. Bağımsız QA Denetimi & Su Geçirmezlik Güçlendirmeleri (Post-Audit)

Bağımsız QA Subagent denetimi sonrasında aşağıdaki kritik sertleştirmeler tamamlanmıştır:
1. **Event Senkronizasyonu:** `actions-neural.ts` ve `actions-prestige.ts` içindeki event adı `doomscroll:shake` olarak düzeltildi; `JuiceLayer.vue` geriye dönük uyum için `doomscroll:screen-shake` takma adını da dinler hale getirildi.
2. **Kütle Kaçaklarının Kapatılması:** `actions-crisis.ts` (soğutma ve 3 ikilem ödülü), `actions-lab.ts` (hasat ve viral boşalım), `actions-dimensions.ts` (alım nabzı) ve `CommentTicker.vue` (haber tıklamaları) doğrudan kütle atamalarından `this.addMatter(amount, true)` metoduna geçirildi.
3. **Global Koruma (Universal Guard):** `actions-misc.ts` (`update()` en başı) ve `actions-save.ts` (`deserialize()` sonu) içerisine Break Singularity öncesi kütleyi `D_INFINITY`'e sabitleyen global koruyucu yerleştirildi.
4. **Tooltip Netliği:** `SingularityButton.vue` içindeki tooltip, Break Singularity öncesinde kütlenin Planck Duvarı'nda kilitli olduğunu oyuncuya dürüstçe açıklar.
