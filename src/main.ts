import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { vHold } from './core/hold'
import { vTilt } from './core/tilt'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.directive('hold', vHold)
app.directive('tilt', vTilt)
app.mount('#app')

