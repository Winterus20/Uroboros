<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { SaveSystem } from '../core/save'
import type { HumorLevel, MotionMode, MusicTrackId } from '../models/settings'
import type { NotationType } from '../core/format'
import { X } from 'lucide-vue-next'

const store = useGameStore()
const auth = useAuthStore()
const emit = defineEmits<{ close: [] }>()

const importText = ref('')
const status = ref('')

/** Bulut kayıt girişi: altyapı korunuyor (A şıkkı) — erişim ayarlardan açık kalmalı. */
const cloudBusy = computed(() => auth.isSyncing || auth.authActionLoading)

const cloudStatus = computed(() => {
  if (!auth.isConfigured) return 'Cloud saves are not set up in this build.'
  if (!auth.isAuthenticated) return 'Not signed in. The number lives in this browser only.'
  if (auth.isSyncing) return 'Syncing…'
  if (auth.syncStatus === 'error') return 'Sync failed.' + (auth.error ? ' ' + auth.error : '')
  if (auth.syncStatus === 'success') return 'Up to date — ' + (auth.userDisplayName || auth.userEmail)
  return 'Signed in — ' + (auth.userDisplayName || auth.userEmail)
})

function openSignIn(): void {
  auth.openAuthModal()
}

async function signOut(): Promise<void> {
  await auth.signOut()
  status.value = 'Signed out of the cloud save.'
}

async function pushToCloud(): Promise<void> {
  const ok = await auth.saveToCloud(true)
  status.value = ok ? 'Save copied to the cloud.' : 'Cloud save failed.'
}

const NOTATIONS: NotationType[] = ['standard', 'scientific', 'engineering', 'logarithm']
const HUMOR: HumorLevel[] = ['off', 'measured', 'full']
const MOTION: MotionMode[] = ['full', 'reduced', 'off']
const TRACKS: MusicTrackId[] = ['lofi_chill', 'synthwave', 'ambient_drone', 'subway_groove']

function exportSave(): void {
  const text = SaveSystem.exportSave(store.serialize())
  void navigator.clipboard?.writeText(text)
  status.value = 'Save copied to clipboard.'
}

function importSave(): void {
  const parsed = SaveSystem.importSave(importText.value)
  if (!parsed) {
    status.value = 'That string is not a save from this game.'
    return
  }
  store.deserialize(parsed)
  status.value = 'Save loaded.'
}

function hardReset(): void {
  if (store.settings.confirmDialogs && !window.confirm('Erase everything? There is no undo.')) return
  SaveSystem.hardReset()
  store.resetGame()
  status.value = 'Everything erased.'
  emit('close')
}
</script>

<template>
  <div class="modal settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" @click.self="emit('close')">
    <div class="modal__panel">
      <header class="modal__head">
        <h2 id="settings-title" class="modal__title">Settings</h2>
        <button type="button" class="settings__x" aria-label="Close" @click="emit('close')">
          <X :size="16" :stroke-width="1.6" aria-hidden="true" />
        </button>
      </header>

      <div class="modal__body">
        <p class="modal__kicker">Display</p>
        <label class="field">
          <span>Notation</span>
          <select class="field-input" :value="store.settings.notation" @change="store.setSetting('notation', ($event.target as HTMLSelectElement).value as NotationType)">
            <option v-for="n in NOTATIONS" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>

        <label class="field">
          <span>Decimals</span>
          <span class="field__range">
            <input type="range" min="0" max="4" :value="store.settings.decimalPlaces" @input="store.setSetting('decimalPlaces', Number(($event.target as HTMLInputElement).value))" />
            <span class="field__value data">{{ store.settings.decimalPlaces }}</span>
          </span>
        </label>

        <label class="field">
          <span>Humour</span>
          <select class="field-input" :value="store.settings.humor" @change="store.setSetting('humor', ($event.target as HTMLSelectElement).value as HumorLevel)">
            <option v-for="h in HUMOR" :key="h" :value="h">{{ h }}</option>
          </select>
        </label>

        <label class="field">
          <span>Motion</span>
          <select class="field-input" :value="store.settings.motionMode" @change="store.setSetting('motionMode', ($event.target as HTMLSelectElement).value as MotionMode)">
            <option v-for="m in MOTION" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>

        <p class="modal__kicker settings__group">Audio</p>
        <label class="field">
          <span>Sound</span>
          <input type="checkbox" :checked="store.settings.soundEnabled" @change="store.setSetting('soundEnabled', ($event.target as HTMLInputElement).checked)" />
        </label>

        <label class="field">
          <span>Music</span>
          <input type="checkbox" :checked="store.settings.musicEnabled" @change="store.setSetting('musicEnabled', ($event.target as HTMLInputElement).checked)" />
        </label>

        <label class="field">
          <span>Track</span>
          <select class="field-input" :value="store.settings.musicTrack" @change="store.setMusicTrack(($event.target as HTMLSelectElement).value as MusicTrackId)">
            <option v-for="t in TRACKS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>

        <p class="modal__kicker settings__group">Save</p>
        <div class="block">
          <button type="button" class="btn btn--solid" @click="exportSave">Copy save</button>
          <textarea v-model="importText" class="field-input" placeholder="Paste a save string" />
          <button type="button" class="btn" @click="importSave">Load save</button>
        </div>

        <div class="block block--cloud">
          <div class="block__head">
            <p class="block__title">Cloud save</p>
            <p class="block__state data" :class="{ 'block__state--on': auth.isAuthenticated }">{{ cloudStatus }}</p>
          </div>
          <div class="cloud__actions">
            <button
              v-if="!auth.isAuthenticated"
              type="button"
              class="btn"
              :disabled="!auth.isConfigured"
              @click="openSignIn"
            >
              Sign in
            </button>
            <template v-else>
              <button type="button" class="btn" :disabled="cloudBusy" @click="pushToCloud">Save to cloud</button>
              <button type="button" class="btn" :disabled="cloudBusy" @click="signOut">Sign out</button>
            </template>
          </div>
        </div>

        <div class="block block--danger">
          <button type="button" class="btn btn--danger" @click="hardReset">Hard reset</button>
        </div>

        <p v-if="status" class="status data" role="status">{{ status }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings { z-index: 40; }

.settings__x {
  appearance: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: var(--pn-r);
  background: transparent;
  color: var(--pn-text-dim);
  cursor: pointer;
}
.settings__x:hover { border-color: var(--pn-line-strong); color: var(--pn-text); }

.settings__group { margin-top: 20px; }
.modal__kicker { margin-bottom: 6px; }

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 46px;
  border-top: 1px solid var(--pn-line);
  font-size: 13px;
  color: var(--pn-text-dim);
}
.field .field-input { min-width: 150px; }
.field__range { display: inline-flex; align-items: center; gap: 10px; }
.field__value { min-width: 12px; font-size: 12px; color: var(--pn-text); text-align: right; }
input[type='range'],
input[type='checkbox'] { accent-color: var(--pn-rung); }
input[type='checkbox'] { width: 16px; height: 16px; margin: 0; cursor: pointer; }

.block { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding-top: 10px; }
.block textarea { width: 100%; font-size: 11px; color: var(--pn-text-dim); }
.block--cloud { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--pn-line); align-items: stretch; }
.block--danger { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--pn-line); }
.block__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.block__title { margin: 0; font-size: 13px; color: var(--pn-text-dim); }
.block__state { margin: 0; font-size: 11px; line-height: 1.5; color: var(--pn-text-dim); text-align: right; max-width: 60%; }
.block__state--on { color: var(--pn-text); }
.cloud__actions { display: flex; gap: 8px; flex-wrap: wrap; }

.status { margin: 14px 0 0; font-size: 11px; color: var(--pn-text); }
</style>
