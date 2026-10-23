<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { SaveSystem } from '../core/save'
import type { HumorLevel, MotionMode, MusicTrackId } from '../models/settings'
import type { NotationType } from '../core/format'

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

const NOTATIONS: NotationType[] = ['scientific', 'standard', 'engineering', 'logarithm']
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
  <div class="overlay" role="dialog" aria-modal="true" @click.self="emit('close')">
    <div class="sheet">
      <header class="sheet__head">
        <h2>Settings</h2>
        <button type="button" class="x" @click="emit('close')">Close</button>
      </header>

      <label class="field">
        <span>Notation</span>
        <select :value="store.settings.notation" @change="store.setSetting('notation', ($event.target as HTMLSelectElement).value as NotationType)">
          <option v-for="n in NOTATIONS" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <label class="field">
        <span>Decimals</span>
        <input type="range" min="0" max="4" :value="store.settings.decimalPlaces" @input="store.setSetting('decimalPlaces', Number(($event.target as HTMLInputElement).value))" />
      </label>

      <label class="field">
        <span>Humour</span>
        <select :value="store.settings.humor" @change="store.setSetting('humor', ($event.target as HTMLSelectElement).value as HumorLevel)">
          <option v-for="h in HUMOR" :key="h" :value="h">{{ h }}</option>
        </select>
      </label>

      <label class="field">
        <span>Motion</span>
        <select :value="store.settings.motionMode" @change="store.setSetting('motionMode', ($event.target as HTMLSelectElement).value as MotionMode)">
          <option v-for="m in MOTION" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>

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
        <select :value="store.settings.musicTrack" @change="store.setMusicTrack(($event.target as HTMLSelectElement).value as MusicTrackId)">
          <option v-for="t in TRACKS" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>

      <label class="field">
        <span>Swirl</span>
        <select :value="store.settings.swirlShaderQuality" @change="store.setSetting('swirlShaderQuality', ($event.target as HTMLSelectElement).value as 'off' | 'balanced' | 'high')">
          <option value="off">off</option>
          <option value="balanced">balanced</option>
          <option value="high">high</option>
        </select>
      </label>

      <div class="block">
        <button type="button" class="ghost" @click="exportSave">Copy save</button>
        <textarea v-model="importText" class="area" placeholder="Paste a save string" />
        <button type="button" class="ghost" @click="importSave">Load save</button>
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
            class="ghost"
            :disabled="!auth.isConfigured"
            @click="openSignIn"
          >
            Sign in
          </button>
          <template v-else>
            <button type="button" class="ghost" :disabled="cloudBusy" @click="pushToCloud">Save to cloud</button>
            <button type="button" class="ghost" :disabled="cloudBusy" @click="signOut">Sign out</button>
          </template>
        </div>
      </div>

      <div class="block">
        <button type="button" class="danger" @click="hardReset">Hard reset</button>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(3,3,5,0.86); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 40; }
.sheet { width: min(560px, 100%); max-height: 86vh; overflow-y: auto; border: 1px solid var(--pn-hairline); background: var(--pn-bg); padding: 22px 22px 26px; }
.sheet__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
h2 { margin: 0; font-family: var(--font-ui); font-weight: 400; font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase; }
.x, .ghost, .danger { appearance: none; background: transparent; border: 1px solid var(--pn-hairline); color: var(--pn-text-dim); font-family: var(--font-data); font-size: 12px; padding: 6px 12px; cursor: pointer; }
.danger { color: var(--pn-rose); border-color: color-mix(in srgb, var(--pn-rose) 40%, transparent); }
.field { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0; border-top: 1px solid var(--pn-hairline); font-family: var(--font-ui); font-size: 13px; color: var(--pn-text-dim); }
select, input[type='range'] { background: transparent; color: var(--pn-text); border: 1px solid var(--pn-hairline); font-family: var(--font-data); font-size: 12px; padding: 4px 6px; }
.block { display: flex; flex-direction: column; gap: 8px; padding: 14px 0 0; }
.area { min-height: 76px; background: transparent; border: 1px solid var(--pn-hairline); color: var(--pn-text-dim); font-family: var(--font-data); font-size: 11px; padding: 8px; resize: vertical; }
.status { margin: 12px 0 0; font-family: var(--font-data); font-size: 11px; color: var(--pn-amber); }
.block--cloud { border-top: 1px solid var(--pn-hairline); margin-top: 14px; }
.block__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.block__title { margin: 0; font-family: var(--font-ui); font-size: 13px; color: var(--pn-text-dim); }
.block__state { margin: 0; font-size: 11px; line-height: 1.5; color: var(--pn-text-dim); text-align: right; max-width: 60%; }
.block__state--on { color: var(--pn-text); }
.cloud__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.ghost:disabled { color: var(--pn-locked); cursor: default; }
</style>
