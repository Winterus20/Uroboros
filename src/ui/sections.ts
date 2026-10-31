import type { Component } from 'vue'
import { BarChart3, Flag, Link2 } from 'lucide-vue-next'
import type { useGameStore } from '../stores/game'
import ChainList from '../components/ChainList.vue'
import ChallengePanel from '../components/ChallengePanel.vue'
import StatsPanel from '../components/StatsPanel.vue'

/**
 * Bölüm kayıt defteri (ADR-0085) — sol menü (masaüstü) ve alt sekme çubuğu (≤ 900 px) BURADAN
 * çizilir; App.vue aktif sayfayı da buradan seçer.
 *
 * Yeni bir katman/mekanik eklemek = bu listeye bir kayıt + bir sayfa bileşeni:
 *
 *   {
 *     id: 'definitions',
 *     label: 'Definitions',
 *     icon: Sparkles,
 *     page: DefinitionsPage,
 *     placement: 'main',
 *     visible: (s) => s.gateReached,      // menüde hiç görünür mü?
 *     unlocked: (s) => s.tanim > 0,       // görünür ama kilitliyse "???" + kilit
 *     badge: (s) => String(s.tanim)
 *   }
 *
 * Kurallar:
 * - `unlocked` false olan kayıt adını SÖYLEMEZ ("???" + kilit ikonu) ve tıklanamaz; sayfası
 *   olmayan bir kayıt (`page: null`) her zaman kilitlidir — tasarımı yapılmamış bir şeyin adı
 *   ekrana yazılmaz (V4: vaat yok).
 * - Rozet yalnız gerçek veri yazar (ör. "3/8"); süs rozet yok.
 * - Sıra = dizideki sıra; `placement: 'bottom'` olanlar menünün dibine itilir.
 */

export type GameStore = ReturnType<typeof useGameStore>

export type SectionPlacement = 'main' | 'bottom'

export interface SectionDef {
  /** Kalıcı kimlik (aktif sekme durumu bununla tutulur). */
  id: string
  /** Menüde okunan ad (oyun içi metin — İngilizce, P3). */
  label: string
  /** Lucide ikonu; kilitli kayıtta kilit ikonu kullanılır. */
  icon: Component
  /** Ana alanda çizilen sayfa; `null` = henüz yok (yer tutucu). */
  page: Component | null
  placement: SectionPlacement
  /** Hero (sayı + `+1`) sayfanın üstünde çizilsin mi? Varsayılan: evet. */
  hero?: boolean
  /** Menüde görünür mü (kilitli olarak bile)? Varsayılan: evet. */
  visible?: (store: GameStore) => boolean
  /** Açık mı? Varsayılan: evet (sayfası varsa). */
  unlocked?: (store: GameStore) => boolean
  /** Sağdaki mono rozet (ör. "3/8"); `null` = rozet yok. */
  badge?: (store: GameStore) => string | null
}

/** Menünün okuduğu çözümlenmiş satır. */
export interface NavItem {
  id: string
  label: string
  icon: Component
  placement: SectionPlacement
  locked: boolean
  badge: string | null
}

/** Kilitli kayıtta ad yerine yazılan metin. */
export const LOCKED_LABEL = '???'

export const SECTIONS: readonly SectionDef[] = [
  {
    id: 'chain',
    label: 'Chain',
    icon: Link2,
    page: ChainList,
    placement: 'main'
  },
  {
    id: 'challenges',
    label: 'Challenges',
    icon: Flag,
    page: ChallengePanel,
    placement: 'main',
    badge: (store) => {
      const rows = store.challengeRows
      const done = rows.filter((row) => row.status === 'completed').length
      return done + '/' + rows.length
    }
  },
  /*
   * Gelecek katmanlar için yer tutucular: oyuncu merdivenin devam ettiğini görür, adını değil.
   * Sayfası yazıldığında `page` ve `unlocked` doldurulur (ör. kapıdaki prestij → Definitions).
   */
  {
    id: 'layer-2',
    label: 'Definitions',
    icon: Flag,
    page: null,
    placement: 'main'
  },
  {
    id: 'layer-3',
    label: 'Rung 2',
    icon: Flag,
    page: null,
    placement: 'main'
  },
  {
    id: 'stats',
    label: 'Statistics',
    icon: BarChart3,
    page: StatsPanel,
    placement: 'bottom'
  }
]

export const DEFAULT_SECTION_ID = SECTIONS[0].id

/** Kayıt açık mı: sayfası yoksa asla; varsa yüklem (yoksa açık). */
export function isSectionUnlocked(def: SectionDef, store: GameStore): boolean {
  if (def.page === null) return false
  return def.unlocked ? def.unlocked(store) : true
}

/** Menü satırları: görünür kayıtlar, kilit ve rozet çözülmüş hâlde. */
export function resolveNav(store: GameStore): NavItem[] {
  return SECTIONS.filter((def) => (def.visible ? def.visible(store) : true)).map((def) => {
    const locked = !isSectionUnlocked(def, store)
    return {
      id: def.id,
      label: locked ? LOCKED_LABEL : def.label,
      icon: def.icon,
      placement: def.placement,
      locked,
      badge: !locked && def.badge ? def.badge(store) : null
    }
  })
}

/** Kimlikten kayıt; bilinmeyen ya da kilitli kimlik varsayılan bölüme düşer. */
export function sectionById(id: string, store: GameStore): SectionDef {
  const def = SECTIONS.find((item) => item.id === id)
  if (def && isSectionUnlocked(def, store)) return def
  return SECTIONS[0]
}
