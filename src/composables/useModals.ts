import { onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '../stores/game'

// ADR-0029: bozuk kayıt / gelecek sürüm durumlarını oyuncuya göster
export interface SaveIssue {
  kind: 'future' | 'recovered' | 'lost'
  title: string
  message: string
}

/** Modal durumu + klavye kısayolları (tek yerden). */
export function useModals() {
  const store = useGameStore()
  const showSettings = ref(false)
  const saveIssue = ref<SaveIssue | null>(null)

  function handleKeys(e: KeyboardEvent): void {
    if (e.key === 'Escape') showSettings.value = false
    if (!store.settings.hotkeysEnabled) return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
    if (e.key.toLowerCase() === 'm') store.buyCheapest()
  }

  onMounted(() => window.addEventListener('keydown', handleKeys))
  onUnmounted(() => window.removeEventListener('keydown', handleKeys))

  return { showSettings, saveIssue }
}
