import { format } from '../core/format'
import type { GameStore } from './sections'

/**
 * Kaynak çipleri kayıt defteri (ADR-0085) — üst çubuktaki para birimleri buradan çizilir.
 *
 * Bugün tek gerçek kaynak sayının kendisidir; prestij birimi (`tanim`, ekranda "Definitions")
 * kapıdan sonra görünür. Yeni bir birim = bu listeye bir kayıt:
 *
 *   { id: 'x', label: 'X', tone: 'rung', visible: (s) => …, value: (s) => …, rate: (s) => … }
 *
 * Ton anlamı (§2.3): `rung` = basamak vurgusu (sayı) · `amber` = prestij/milestone birimi.
 * Değer ve oran metni oyuncunun notasyonunda yazılır; çip asla tahmin/süs yazmaz (V4).
 */

export type ResourceTone = 'rung' | 'amber' | 'neutral'

export interface ResourceDef {
  id: string
  /** Erişilebilir ad + dar ekranda gizlenen kısa etiket. */
  label: string
  tone: ResourceTone
  visible?: (store: GameStore) => boolean
  value: (store: GameStore) => string
  /** "+1.2K/s" gibi değişim hızı; `null` = hız yazılmaz. */
  rate?: (store: GameStore) => string | null
}

export interface ResourceChip {
  id: string
  label: string
  tone: ResourceTone
  value: string
  rate: string | null
}

export const RESOURCES: readonly ResourceDef[] = [
  {
    id: 'number',
    label: 'Number',
    tone: 'rung',
    value: (store) => store.numberText,
    rate: (store) => '+' + store.perSecondText + '/s'
  },
  {
    id: 'definitions',
    label: 'Definitions',
    tone: 'amber',
    // Kapıdaki prestij +1 Tanım yazar; ondan önce birim yoktur, çip de yoktur.
    visible: (store) => store.tanim > 0,
    value: (store) => format(store.tanim, 0, store.settings.notation)
  }
]

export function resolveResources(store: GameStore): ResourceChip[] {
  return RESOURCES.filter((def) => (def.visible ? def.visible(store) : true)).map((def) => ({
    id: def.id,
    label: def.label,
    tone: def.tone,
    value: def.value(store),
    rate: def.rate ? def.rate(store) : null
  }))
}
