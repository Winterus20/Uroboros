import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/** Her test izole bir Pinia ile başlar; bir testin store'a yazdığı durum sızmaz. */
beforeEach(() => {
  setActivePinia(createPinia())
})
