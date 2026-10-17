import { defineStore } from 'pinia'
import { buildInitialState } from './game/state'
import { dimensionGetters } from './game/getters-dimensions'
import { labGetters } from './game/getters-lab'
import { crisisGetters } from './game/getters-crisis'
import { neuralGetters } from './game/getters-neural'
import { miscGetters } from './game/getters-misc'
import { clockGetters } from './game/getters-clock'
import { dimensionActions } from './game/actions-dimensions'
import { prestigeActions } from './game/actions-prestige'
import { labActions } from './game/actions-lab'
import { crisisActions } from './game/actions-crisis'
import { neuralActions } from './game/actions-neural'
import { miscActions } from './game/actions-misc'
import { clockActions } from './game/actions-clock'
import { saveActions } from './game/actions-save'

// Ince Pinia kabugu: tum mantik src/game/* (denge verisi) ve src/stores/game/*
// (state/getter/action parcalari) modullerindedir. Public API birebir korunur.
export const useGameStore = defineStore('game', {
  state: buildInitialState,
  getters: {
    ...dimensionGetters,
    ...labGetters,
    ...crisisGetters,
    ...neuralGetters,
    ...miscGetters,
    ...clockGetters
  },
  actions: {
    ...dimensionActions,
    ...prestigeActions,
    ...labActions,
    ...crisisActions,
    ...neuralActions,
    ...miscActions,
    ...clockActions,
    ...saveActions
  }
})

export {
  BASE_COSTS,
  COST_MULTS,
  EARLY_D1_COST_RATIO,
  EARLY_D1_SOFT_BUCKETS,
  EARLY_D2_COST_RATIO,
  EARLY_D2_SOFT_BUCKETS,
  EARLY_D3_COST_RATIO,
  EARLY_D3_SOFT_BUCKETS,
  EARLY_D4_COST_RATIO,
  EARLY_D4_SOFT_BUCKETS,
  EARLY_D5_COST_RATIO,
  EARLY_D5_SOFT_BUCKETS,
  EARLY_D6_COST_RATIO,
  EARLY_D6_SOFT_BUCKETS,
  BASE_UNLOCKED_DIMENSIONS,
  DIM_PER_TEN_MULT,
  NIGHT_WATCH_THRESHOLD,
  OFFLINE_CAP_SECONDS,
  COLONY_CORE_COST,
  COLONY_MIN_NAP_BOTS,
  COLONY_BREED_RATE,
  COLONY_PASSIVE_LOG_FACTOR,
  ACH_CHECK_INTERVAL,
  UNLOCK_CHECK_INTERVAL,
  SACRIFICE_SHIFT_REQ,
  B0_BUCKET_THRESHOLD,
  COST_ACCEL_DECADES_PER_STEP,
  dimensionCostForBucket,
  MIRROR_PAIRS,
  RESOLUTION_MILESTONES
} from '../game/balance'
export { LAB_SEEDS, LAB_RECIPES } from '../game/lab-data'
export type { LabRecipe } from '../game/lab-data'
export { CRISIS_INTERVENTIONS, CRISIS_SPELLS } from '../game/crisis-data'
export {
  SINGULARITY_UPGRADES,
  NEURAL_TREE,
  NEURAL_LEGACY_UPGRADE_IDS,
  COMBO_THRESHOLDS,
  COMBO_DECAY_MS,
  CPS_SYNC_BASE,
  CPS_SYNC_PER_LEVEL,
  CPS_SYNC_CAP,
  computeNeuralEffects
} from '../game/neural-data'
export {
  AUTOBUYER_COSTS,
  AUTOBUYER_PROGRESS_REQ,
  getAutobuyerRequirementText,
  AUTOBUYER_BULK_COST,
  AUTOBUYER_BULK_SHIFT_REQ,
  AUTOBUYER_MAX_COST,
  AUTOBUYER_MAX_GALAXY_REQ,
  getAutobuyerInterval
} from '../game/autobuyer-data'
export { SAVE_VERSION, SaveVersionError } from '../core/save-version'
export type { GameState } from './game/state'
export type { StoreApi } from './game/store-api'
