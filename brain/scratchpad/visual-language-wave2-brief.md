# Dalga 2 — Uygulama Brifingi (Görsel Dil Yayılımı)

**Okuyucu:** Uygulama subagent'ları. **Önce oku:** `brain/research/visual-language-adoption-spec-2026-10.md` (sözleşme) ve bu dosyanın tamamı.
**Durum:** Denetimler tamam (2026-10-15). Satır numaraları denetim anına aittir — birebir uymazsa **içerikten bul**.
**Kural:** YALNIZ kendi bölümündeki dosyaları düzenle. `src/style.css`, `brain/**`, `dist/**`, test dosyaları ve başka bölümlerin dosyaları ELLERİNİ SÜRÜLMEZ. `npm run typecheck` temiz olana kadar bitirme.

---

## Ortak Desen Tablosu (herkes)

| Desen | Önce | Sonra |
| :--- | :--- | :--- |
| Satın alma — ready | mevcut kimlik/CTA stili | aynen + `affordance-pulse` yoksa ekle |
| Satın alma — partial | ikili dim / opacity | `ds-ramp-partial` + kısmi ilerleme görünür (bar/sayaç) |
| Satın alma — locked | opacity-40/50 dim | `ds-ramp-locked` (opacity ezme; sınıf haleder) |
| Toggle ON (ayar) | emerald | cyan (`bg-cyan-500/20 border-cyan-500/40 text-cyan-200` vb.) |
| Toggle OFF / seçili değil | karışık | mevcut nötr kalsın (slate/white-10) |
| "Seçili" seçenek çipi | emerald/rose/purple | nötr parlak: `bg-white/[0.10] text-white border-white/25` |
| Başarı/senkron/kaydedildi metni | emerald | cyan |
| Kilitli rozet/panel | amber/cyan/emerald | `ds-badge-slate` ya da `ds-ramp-locked` |
| Tamamlandı/ödül/maxed | emerald | cyan (prestij/milestone kimliği olan yerde amber kalabilir) |
| İyi/kötü stat | emerald/rose | iyi = cyan, nötr = slate, risk/kötü = rose |
| `red-*` | Tailwind red | `rose-*` (token hizası) |
| Amber | dekor/vurgu/açıklık | SADECE prestige/milestone/şafak; şüphede: pozitif→cyan, nötr→slate |
| Emerald | durum/"alınabilir" | SADECE Lab bölüm kimliği (chrome), durum DEĞİL |

**Yeni util'ler (hazır):** `ds-ramp-ready|partial|locked`, `ds-badge-slate`, `dim-glyph`, `progress-track(-mini|-sm|-md)` + `progress-fill-{dawn|purple|emerald|cyan|blue|amber|rose|slate}`, `affordance-pulse`, `juice-punch`, `btn-tactile`, `tabular-nums`.
**Motion kapısı (hazır):** `src/composables/useMotion.ts` → `isMotionOff()`, `isMotionReduced()`, `useMotionMode()`.
**Punch kalıbı (DOM):**

```ts
function punchTap(e: PointerEvent): void {
  if (isMotionOff()) return
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  el.classList.add('juice-punch')
  window.setTimeout(() => el.classList.remove('juice-punch'), 160)
}
```

**Yasak:** dinamik Tailwind sınıfı (`text-${x}`), `any`, TODO, İngilizce oyuncu metni, davranış değişikliği (yalnız sunum + motion kapıları), `style.css` düzenlemesi.

---

## BÖLÜM A — Boyutlar & HUD
**Dosyalar:** `DimensionsTab.vue`, `DimensionRow.vue`, `Header.vue`, `header/CounterDisplay.vue`, `header/SingularityButton.vue`, `FloatingThumbBar.vue`, `App.vue`.

### A1 — DimensionsTab.vue
1. Üç satın alma butonuna rampa:
   - **Sıçrama (~418):** `!canShift` iken `shiftProgressPercent > 0 ? 'ds-ramp-partial' : 'ds-ramp-locked'`; ready'de mevcut purple + `affordance-pulse` korunur (yoksa ekle).
   - **Küme (~462):** `isGalaxyTierLocked` → `ds-ramp-locked`; `!canBuyGalaxy && galaxyProgressPercent > 0` → `ds-ramp-partial`; ready amber + pulse korunur.
   - **Besle (~501):** `!canSacrifice && currentSacrificeReward > store.sacrificeMultiplier` → `ds-ramp-partial`; `!canSacrifice` ve ödül tabanın altında → `ds-ramp-locked`; ready rose + pulse korunur.
2. Glifler (`getTierGlyph`/`getTierAccent` import et, `.dim-glyph` kullan):
   - Kilitli teaser (~376): `D{{ nextLockedTier.tier }}` önüne glif+accent; altına mini bar: `progress-track progress-track-mini progress-fill-purple`, genişlik `min(100, dimensionShifts / nextLockedTier.shiftsNeeded * 100)%`.
   - Sıçrama gereksinimi (~410) ve Küme gereksinimi (~453): `D{{ tier }}` önüne glif+accent.
   - Küme kilit metni (~449): `D{{ galaxyTier }}` → glif+D.
   - D3 pasif çipi (~313): başa `Ω` glif+accent (tier 3). D5 pasif çipi (~401): `Ξ` (tier 5).
   - Besle ödül satırı (~493): `D8` → `◉` glif+accent + D8.
3. Zarar/yatak chip (~323) emerald sınıfları → cyan. Parazit rose panel, cyan banner, amber küme kartı, purple sıçrama kartı DOKUNULMAZ.
4. Slacker chip butonlarına (~329-343) `@pointerdown="punchTap"` + helper (Ortak kalıp).

### A2 — DimensionRow.vue
1. `comboRowGlow` ring-amber → `ring-cyan-400/30` (bonus).
2. Akış hızı emerald → cyan (2 yer: metin + ok).
3. `completesPack` ring-emerald → ring-cyan.
4. `affordableUnits` `text-emerald-400` → `text-cyan-400`.
5. Sinerji ortağı çipi (~427-431): `D{{ partnerTier }}` önüne glif+accent (importlar zaten var).
6. Motion: 3 yerde `if (store.settings.reduceAnimations) return` → `if (isMotionReduced()) return` (`../composables/useMotion`).
7. Purple kimlik, rampa mantığı, buy butonu ve kart fiziği DEĞİŞMEZ (kanonik referans).

### A3 — Header.vue
1. **Hz (~516):** partial computed: `!canAffordTickspeed && matter.gte(tickspeedCost.div(10))` → disabled dala `ds-ramp-partial`, aksi `ds-ramp-locked` (opacity-50 yerine geçer). Ready cyan + pulse korunur (Hz kimliği cyan).
2. **Tümü (~541):** mevcut `canAffordAny` döngüsünü (~100-108) iki computed'a ayır: `canAffordFullPack` (pack) ve `canAffordSingleUnit` (pack/10). Ready = full pack; partial = yalnız single; locked = hiçbiri. Rampla.
3. **Duruş butonları (~421-466):**
   - Inline mikro etiketler: Kuantum Odak `Pasif 2×`, Obur Çekim `Manuel 4× · %50 anomali`, Vakum Kalkanı `Hz −%15` (mevcut ipucu/durum metnindeki sayılarla BİREBİR; uydurma).
   - Kilitli duruşta tooltip'e ek OLARAK satır içi ilerleme çipi: `12/50` + `progress-track progress-track-mini progress-fill-slate`. Tooltip nüans olarak kalır.
4. **Sıradaki hamle çipi (~393-404):** altına/yanına `progress-track progress-track-mini progress-fill-purple` — genişlik mevcut `nextGoal` yüzdesinden (döngüdeki fiyat hedefi oranı; sayısal kaynağı kullan, yeni hesap uydurma gerekirse `matter / hedefFiyat`).
5. **Telemetri hedefi:** telemetri barının yanına küçük `Hedef: 1.79e308 g` metni (tooltip'teki hedef artık inline da görünür).
6. **Auth noktası (~360)** emerald → cyan. **Kararlılık rozeti (~367-371):** KARARLI emerald → slate (`bg-white/[0.06] text-slate-300 border-white/10`); KARARSIZ rose kalır.
7. **"Sıradaki hamle" purple çip (~395-400):** nötr parlak (`bg-white/[0.08] text-slate-100 border-white/20`) + pulse.
8. **Combo rAF (~236-253):** başlangıçta `if (isMotionReduced()) return` (bar statik kalır; temizlik korunur).
9. **YUT (~495-513)** ve **Hz/Tümü** butonlarına `@pointerdown="punchTap"`.
10. `swipeTip`, Space rozeti, purple shift, rose kriz, cyan rapor DOKUNULMAZ.

### A4 — header/CounterDisplay.vue
1. Buff çipi (~250-254): `📺` yerine `.dim-glyph` + `getTierAccent(store.formatUnlockBuffTier)` + `getTierGlyph(...)`; `D{{tier}}` metni kalır.
2. `dpsSurgeDelta` emerald → cyan.
3. Motion: `motionOff` = `isMotionReduced() || store.settings.batterySaver`; `count-pop`/`dps-surge` sınıf eklemeleri `isMotionOff()` iken atlanır (mevcut reduced davranışı korunur).
4. Rose Planck uyarısı, amber TEKİLLİK bannerı, cyan format çipi, purple DPS DOKUNULMAZ.

### A5 — header/SingularityButton.vue
1. Disabled dal (`inChallenge && !singularityReady`) opacity-60 → `ds-ramp-partial` (meydan okuma ilerlemesi zaten var). Ready amber + pulse; pulse yoksa ekle.

### A6 — FloatingThumbBar.vue
1. Hz (~81-99): Header ile aynı partial mantığı; rampa sınıfları. Fiyat metni: karşılanabilir → `text-slate-200`, değil → `text-slate-500` (cyan sadece kimlik/pulse).
2. Tümü (~102-117): Header'daki gibi `canAffordFullPack`/`canAffordSingleUnit` ayrımı + rampa.
3. Combo rozeti (~140-142) amber → cyan (Header combo dili ile aynı).
4. YUT/Hz/Tümü butonlarına `@pointerdown="punchTap"`.
5. YUT purple, kriz rozeti rose DOKUNULMAZ.

### A7 — App.vue
1. **Nav durum noktaları:**
   - Sıçrama hazır purple → `tab-dot-cyan`; hasat hazır emerald → `tab-dot-cyan`; kriz uyarısı cyan → `tab-dot-rose`; bot alınabilir blue → `tab-dot-cyan`; Toplu Çöküş hazır violet → `tab-dot-cyan`; nöral düğüm alınabilir amber → `tab-dot-cyan`.
   - Amber kalanlar: görülmemiş plaket, çöküş hazır (milestone) — OK. Rose: aktif meydan okuma — OK.
   - Anlam sözleşmesi: cyan = "içeride pozitif fırsat", rose = "risk/uyarı", amber = "milestone".
2. **Sonraki Açılacak bandı (~224-227):** `kilit %N` yanına `progress-track progress-track-mini progress-fill-cyan`, genişlik `nextUnlockPercent`.
3. Şafak yayı, tab ikonları, TEKİLLİK bannerı DOKUNULMAZ.

---

## BÖLÜM B — Lab, Kriz, Koloni
**Dosyalar:** `LabTab.vue`, `lab/ViralGrid.vue`, `lab/TrendReactor.vue`, `lab/LabSeedCard.vue`, `lab/LabRecipeList.vue`, `CrisisTab.vue`, `ColonyTab.vue`.

### B1 — LabTab.vue
1. **Reaktör Çöküşü (~313-330):** rampa: ready → mevcut gradient + pulse; `labCodexDiscoveredCount` 1-3 → `ds-ramp-partial`; 0 → `ds-ramp-locked`. Butonun altına mini bar: `progress-track progress-track-mini progress-fill-cyan`, genişlik `discoveredCount/4*100`.
2. **Mod kartları:** Overdrive rose kart kalsın; "anında 2× Kütle" gibi ÖDÜL metinleri → cyan. Superconductor amber kart/rozet → slate-mavi nötr chrome; ödül metni ("+2.5× kalıcı") → cyan. Fluctuation cyan kalır.
3. **Relic statları:** emerald "-%t Taban Hz", amber "+s İlave", rose "+% hücre ivmesi" → hepsi cyan (ödül). Purple relic panel kalır.
4. `sparkles`/pasif kütle statı emerald → cyan.
5. Kodeks modal amber chrome (~366/389-397) → cyan/slate chrome.
6. Mikro-modlar (Overdrive/Superconductor/Fluctuation) DOKUNULMAZ.

### B2 — lab/ViralGrid.vue
1. **Toplu Hasat (~148-161):** ready emerald → cyan + pulse; `matureCellCount === 0` → `ds-ramp-locked` (partial yok; hasat tek eylem).
2. **Toplu Ek (~162-175):** rampa EKLE: `canAffordSeed(selected) && emptyCellCount > 0` → ready (cyan + pulse); `matter >= effectiveCost` ama `< effectiveCost × emptyCellCount` → `ds-ramp-partial`; `matter < effectiveCost` → `ds-ramp-locked`. Mevcut disabled şartları (kilitli/keşfedilmemiş tohum) korunur; disabled mantığına kütle eşiği EKLENİR (şu an tıklayınca sessizce kısmi ekiliyor — bu davranış korunmalı, görünürlük ekleniyor).
3. Rezonans legend emerald nokta → cyan; emerald metin → cyan. Merkez çekirdek amber ring/rozet → cyan.
4. Cyan ızgara chrome ve hücre bar'ları DOKUNULMAZ.

### B3 — lab/TrendReactor.vue
1. **Vent (~135-155):** ready mevcut cyan gradient + pulse; `!canTriggerViralDrop && labMode !== 'superconductor' && (labHype > 0 || viralCooldownRemaining > 0)` → `ds-ramp-partial`; superconductor (donuk) → `ds-ramp-locked`. Cooldown/hype etiketleri korunur.
2. **Atlas butonu (~60-64):** amber chrome → nötr (`bg-white/5 border-white/10 text-slate-200`); `(N/4)` oranını `progress-track-mini progress-fill-cyan` bar+yazı olarak göster (buton altında ince şerit).
3. "×N Canlı Plazma" emerald → cyan; "3× Kriz Yağmuru" amber → cyan.
4. Rose viral surge kartı, gradient bar DOKUNULMAZ.

### B4 — lab/LabSeedCard.vue
1. Fiyat metni: karşılanabilir → `text-slate-100`, değil → `text-slate-500`. Karşılanabilirliğe göre KENARLIĞI boyayan mantığı kaldır (kenarlık tohum kimliği/seçim halkası olarak kalır).

### B5 — lab/LabRecipeList.vue
1. "Kilitli" amber rozet → `ds-badge-slate`; "+" operatörü amber → `text-slate-400`.

### B6 — CrisisTab.vue
1. **Müdahaleler (~407-417):** rampa: ready purple + pulse; `getCooldown(id) > 0` veya kartuş şarj oluyor → `ds-ramp-partial`; meltdown → `ds-ramp-locked`. Etiketler (`Soğuyor (Xs)` vb.) korunur.
2. **Faz rozetleri:** `dormant` → `ds-badge-slate`; `sweet_spot` → `ds-badge-cyan`; `resonance` → `ds-badge-cyan` + pulse. Faz bar dolguları: sweet_spot gradient → `progress-fill-cyan`; resonance amber → `progress-fill-cyan`. Etiketler ayırt edici kalır.
3. **Reaktör sayacı (~309-310):** meltdown geri sayımı → rose; normal → slate.
4. **Isı değişimi (~360):** artı → rose; eksi → cyan.
5. Rozetler (~372/378/385): soğutma boş rose KALIR; cooldown slate; ısı>30 rose KALIR; nötr slate.
6. **D4 pasif çipi (~204-210):** hardcoded rose → `χ` glif + `getTierAccent(4)` (violet).
7. Meltdown rose panel, purple hero, rose debuff, ısı şeridi gradienti DOKUNULMAZ.

### B7 — ColonyTab.vue
1. **Hatch (~95-103):** `!canAffordCore && matter.gte(COLONY_CORE_COST.div(10))` → `ds-ramp-partial`; aksi `ds-ramp-locked`; ready violet korunur.
2. **Toplu Çöküş (~128-144):** rampa + bar: `progress-track-mini progress-fill-purple`, genişlik `min(100, neuralBots/minNapBots*100)`; canPowerNap → amber + pulse; değilse partial (bot>0) / locked.
3. `+%breed/sn` emerald → cyan; SP yükseltme ipucu emerald (TrendingUp+metin) → cyan.
4. Violet hero, amber ay/SP CTA'ları DOKUNULMAZ.

---

## BÖLÜM C — Botlar, Nöral Ağaç, Tekillik, Meydan, Plaket, LockedFeature
**Dosyalar:** `AutobuyersTab.vue`, `autobuyers/AutobuyerCard.vue`, `autobuyers/AutobuyerBulkControls.vue`, `NeuralTreeTab.vue`, `SingularityTab.vue`, `ChallengesTab.vue`, `AchievementsTab.vue`, `LockedFeature.vue`.

### C1 — AutobuyerCard.vue (en yoğun dosya)
1. **Unlock butonu (~347):** rampa: ready blue + pulse; `requirementMet` ile kütle şartından TAM BİRİ karşılanmışsa → `ds-ramp-partial`; ikisi de yoksa → `ds-ramp-locked`. Etiket ayrımı (`Kilitli: ...` / `Yetersiz Kütle`) korunur.
2. **Durum renkleri → nötr+cyan:** enabled/aktif tüm `ds-badge-emerald` → `ds-badge-cyan`; duran → `ds-badge-slate`; kart chrome'undaki `border-amber-500/40`, `text-amber-400` radio, `ds-badge-amber` (aktif çerçeve) → cyan karşılıkları. `rose` "stop" renkleri → slate (durdurma tehlike değil).
3. **Mod butonları (×1/×10/MAKS):** seçili → `bg-white/[0.10] text-white border-white/25`; seçili değil → `text-slate-400 border-white/10 hover:text-slate-200`. Emerald/amber/blue mod renkleri gider. `modeLabel` rozetleri → `ds-badge-slate` nötr.
4. **Aç/kapa toggles:** açık → cyan; kapalı → slate. 4 toggleda hiç geri bildirim yok: `btn-tactile` veya `active:scale-95` ekle.
5. `requirementMet` metni (~278): karşılandı `text-slate-200`, karşılanmadı `text-slate-500`.
6. Eşik input metni (~186/296) amber → `text-slate-200`.
7. **A11 glif:** `botKey` `dim1..dim8` ile başlıyorsa `tier = Number(botKey.slice(3))`; isim öncesine `.dim-glyph` + `getTierAccent(tier)` glifi (hem dim kartları hem shop varyantı).
8. **B12 bar:** Tekillik şartı `(Şu an: N/3)` altına `progress-track-mini progress-fill-amber`, genişlik `min(100, singularities/3*100)`.

### C2 — AutobuyersTab.vue
1. "Aktif bot" istatistiği emerald → cyan. Master switch: açık cyan, kapalı slate (iki örnek: ~76-78, ~170-171).

### C3 — AutobuyerBulkControls.vue
1. Bulk aksiyon butonu (~51) emerald → blue kimlik + pulse.
2. "HER ZAMAN AÇIK" paneli (~60-63) emerald → cyan.
3. MAX kilit paneli (~85-91) amber → `ds-ramp-locked` + `ds-badge-slate`.
4. Unlock CTA'lar (~37, ~100) amber → blue kimlik + rampa (`canUnlockBulk`/`canUnlockMax` ile).

### C4 — NeuralTreeTab.vue
1. **CARD_STATE_CLASS (~87-92):** `maxed` emerald → `border-cyan-500/40 bg-cyan-950/20`; `available` amber KALIR + `affordance-pulse`; `insufficient` karma amber/opacity → `ds-ramp-partial`; `choice-locked` → `ds-ramp-locked`. (Bu sekme SP prestij kimliğiyle amber taşır; durum farkı rampadan gelir.)
2. **Düğüm butonları (4 şablon):** available amber + pulse; insufficient → `ds-ramp-partial`; `maksimum` metni emerald → cyan + `✓ MAX`.
3. **Dallar:** root rose → amber; hybrid emerald → sky-300 (legend rozeti ~133 ve bölücü ~340 dahil); passive violet / active fuchsia KALIR.
4. **Seviye barları (B7/B8):** `Seviye: N/M` yanına `progress-track-mini progress-fill-purple`, genişlik `N/M*100`.
5. **SEÇİM rozetleri (2 yer):** yanına satır içi mikro metin `Kardeşini kilitler` (küçük, kırmızımsı DEĞİL — slate); tooltip nüans kalır.

### C5 — SingularityTab.vue
1. CTA (~93-105): `!canSingularity && progressToSingularity > 0` → `ds-ramp-partial`; 0 → `ds-ramp-locked`; ready amber + pulse.
2. Sonraki SP eşiği (~108): kilitliyken rose → slate; kırıldıktan sonra amber KALIR.
3. Night watch amber paneli KALIR.

### C6 — ChallengesTab.vue
1. Tamamlanan kart: emerald → cyan sınıfları (kenarlık, başlık, en iyi süre, rozet, `progress-fill-emerald` → `progress-fill-cyan`).
2. Kilitli kart `opacity-45` → `ds-ramp-locked` (kilit ikonu kalır).
3. Kilit ipucu yanına `progress-track-mini progress-fill-slate` bar (B5).
4. Hero rose kimliği, aktif kart/rose bar, BAŞLAT rose DOKUNULMAZ.

### C7 — AchievementsTab.vue
1. `%` tamamlanma emerald → cyan.
2. "Tam satır ✓ ×1.06" rozeti emerald → `ds-badge-amber` (milestone).
3. Ödül sol şeridi emerald → cyan.
4. Kilit durumu rozeti (~259): açık → `ds-badge-amber`, kilitli → `ds-badge-slate`; gizli kilitli purple (~264) → `ds-badge-slate`.
5. Amber hero/"Sıradaki" halkası KALIR.

### C8 — LockedFeature.vue
1. Kök karta `ds-ramp-locked` ekle; ilerleme çubuğu ve kilit ikonu kalır.

---

## BÖLÜM D — Hareket Kontratı & Katmanlar
**Dosyalar:** `composables/useNavigation.ts`, `composables/useCounterHeat.ts`, `JuiceLayer.vue`, `AlgorithmicSwirl.vue`, `HeartBurstLayer.vue`, `SequentialStrikeLayer.vue`, `CommentTicker.vue`, `header/MusicControls.vue`, `ScreenOverlay.vue`, `stores/game/actions-neural.ts`.
**Yapılmayacaklar:** `core/celebrate.ts` (orchestrator tamamladı), `DimensionRow/Header/CounterDisplay` (Bölüm A), `style.css`.
**Ortak kapı:** `isMotionReduced()` / `isMotionOff()` — `../composables/useMotion` (stores'dan `../../composables/useMotion`).

### D1 — useNavigation.ts
1. `transitionName` (~151): `reduceAnimations` yerine `useMotionMode()`; `mode !== 'full'` → `tab-fade`.
2. `scrollActiveTabIntoView` (~285): `behavior: isMotionReduced() ? 'auto' : 'smooth'`.

### D2 — useCounterHeat.ts
1. `motionOff = reduceAnimations || batterySaver` → `isMotionReduced() || batterySaver`.

### D3 — JuiceLayer.vue
1. Hareket predicate'ine (~101-107) `isMotionReduced()` ekle (OS-RM || RA || BS || yeni kapı). Havuz/emisyon tavanları korunur.

### D4 — AlgorithmicSwirl.vue
1. Tam ekran WebGL döngüsü: kapıya `isMotionReduced()` + canlı `matchMedia('(prefers-reduced-motion: reduce)')` ekle (JuiceLayer'daki kalıbı örnek al).
2. Kısıtlı modda: rAF döngüsünü durdur, mevcut statik fallback karesini bırak; ayar değişince canlı uygula (watcher), unmount temizliği korunur.

### D5 — HeartBurstLayer.vue
1. `reduceAnimations` kontrolü → `isMotionReduced()` (davranış aynı: ripple yok, ses + manualClick devam).

### D6 — SequentialStrikeLayer.vue
1. `reduceAnimations || batterySaver` → `isMotionReduced() || batterySaver`.

### D7 — CommentTicker.vue (KRİTİK)
1. `isMotionReduced()` iken marquee BAŞLATILMAZ (sınıf/animasyon yok; `animationend` zinciri yok). Haber metni statik gösterilir ve JS timer ile döndürülür (örn. 9 sn; gizli sekmede duraklar; unmount'ta temizlenir). Full modda mevcut davranış aynen.
2. Gizli haber rozeti/ikonu amber (L373/380) → beyaz/slate vurgu (disco rainbow efektleri kalır).

### D8 — header/MusicControls.vue
1. Ekolayzer `setInterval(100ms)`: `isMotionOff()` → interval çalışmaz (bar statik); `isMotionReduced()` → 300ms.

### D9 — ScreenOverlay.vue
1. Flaş: `batterySaver || isMotionReduced()` iken flaş sınıfı eklenmez; temel katman kalır.

### D10 — stores/game/actions-neural.ts
1. `shouldReduce` (~38): `isMotionReduced() || this.settings.batterySaver` (import ekle).

---

## BÖLÜM E — Sistem Modalleri, Ayarlar ve İstatistik Panelleri
**Dosyalar:** `AnomalyOverlay.vue`, `WelcomeBackModal.vue`, `AchievementToast.vue`, `ConfirmModal.vue`, `CloudConflictModal.vue`, `AuthModal.vue`, `AdminPanel.vue`, `SettingsModal.vue`, `settings/SaveSlots.vue`, `settings/ImportExport.vue`, `settings/AudioSettings.vue`, `settings/GameplaySettings.vue`, `settings/CloudSaveSection.vue`, `StatsTab.vue`, `stats/RecordsPanel.vue`, `stats/MultipliersPanel.vue`, `stats/PastRunsPanel.vue`, `stats/OverviewPanel.vue`, `stats/BiometryPanel.vue`, `stats/TelemetryChart.vue`.
**Genel:** Ortak Desen Tablosu'nu uygula; her dosyada yalnızca sıralanan bulgular.

### E1 — AnomalyOverlay.vue
1. **heart_frenzy (777×) positif olay ama rose:** glow/etiket/bar/halka(`#fb7185`→`#22d3ee`)/ikon/konfeti rengi/shockwave/nokta → cyan ailesi.
2. **sponsor/jenerik anomali amber** (8 nokta) → cyan.
3. Combo banner `Flame` rose → cyan; aktif buff `×mult` amber çip → cyan.
4. void cyan, ≤3.5 sn aciliyet rose KALIR.

### E2 — WelcomeBackModal.vue
1. "Zap + kazanılan kütle" amber → cyan. Purple CTA kalır.

### E3 — AchievementToast.vue
1. Ödül metni emerald → cyan; amber toast çerçevesi (milestone) KALIR.

### E4 — ConfirmModal.vue
1. `red-*` → `rose-*`; tehlike-dışı onay butonu amber → cyan; yıkıcı onay rose KALIR.

### E5 — CloudConflictModal.vue
1. Amber çerçeve/başlık → slate/nötr (uyarı okunabilirliği korunur); emerald "bulut ileride" vurguları → cyan; emerald→teal CTA → cyan ailesi (`bg-cyan-600 hover:bg-cyan-500 text-white`). Cyan yerel kimlik, rose hata KALIR.

### E6 — AuthModal.vue + settings/CloudSaveSection.vue + settings/SaveSlots.vue + settings/ImportExport.vue
1. Tüm emerald durum/başarı/senkron metin ve ikonları → cyan. `SaveSlots` "AKTİF" slotu → cyan kenarlık + `ds-badge-cyan`. `ImportExport` amber içe aktar → cyan/nötr. Rose hatalar KALIR.

### E7 — AdminPanel.vue + SettingsModal.vue
1. AdminPanel: emerald geri bildirim → cyan; `orange` guilt butonları → violet; `red-600` → `rose-600`.
2. SettingsModal: emerald kaydet/otomatik kayıt/son kayıt → cyan; kısayol çipleri (cyan/purple/amber dekor) → nötr (`bg-white/[0.06] text-slate-300 border-white/10`); rose Hard Reset bölgesi KALIR.

### E8 — settings/AudioSettings.vue + settings/GameplaySettings.vue
1. AudioSettings: emerald ses toggle → cyan; amber vinyl toggle → cyan.
2. GameplaySettings: TÜM toggle ON emerald → cyan (OFF nötr kalır); pil paneli emerald chrome → slate/cyan; motion seçili emerald → nötr parlak seçili; screenShake amber → cyan; purple ON-state'ler → cyan; rose "seçili" durumlar (Full Tilt/Kapalı/Lab dokuları) → nötr parlak seçili; cyan holo toggle KALIR; swipe "Düşük (Sert)" amber / "Kapalı" rose seçili → nötr parlak. Ölçüm seçicileri (notasyon `● Aktif` cyan) KALIR.

### E9 — StatsTab.vue + stats/*.vue
1. StatsTab: pink "manuel tıklama" statı → cyan.
2. RecordsPanel: emerald "tamamlanan" → cyan; amber meydan sayısı → rose; pink parazit Flame → rose.
3. MultipliersPanel: `>=1 emerald / <1 rose` → `>1 cyan / <=1 slate`; amber "İstasyon Kademeleri" kategorisi → purple.
4. PastRunsPanel: emerald SP metrikleri → amber (prestij); amber meydan çipi → rose.
5. OverviewPanel: pink→rose "Manuel Yutma" serisi → blue; diğer KPI pink'leri blue/cyan'a hizala.
6. BiometryPanel: kararlılık barı emerald/amber/rose → cyan/slate/rose (iyi/orta/kötü) + başlık %'si cyan; kopyalama butonu emerald → cyan; amber "yazma paradoksu" → slate.
7. TelemetryChart: amber hover DPS değeri → cyan.

---

## Teslim Raporu Formatı (her agent)
Bitirince kısa rapor: (1) dosya başına yapılan değişiklik özeti, (2) `npm run typecheck` sonucu, (3) uygulayamadığın/karar veremediğin madde varsa gerekçesiyle listesi.
