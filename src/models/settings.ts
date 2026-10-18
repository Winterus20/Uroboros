/** Oyun ayarlari tipleri. */
import type { NotationType } from "../core/format"

export type MusicTrackId = 'lofi_chill' | 'synthwave' | 'ambient_drone' | 'subway_groove' | 'custom'

export interface GameSettings {
  notation: NotationType
  decimalPlaces: number // Ondalık hassasiyet (2 veya 3)
  soundEnabled: boolean
  soundVolume: number
  theme: 'cyberpunk' | 'dark'
  musicEnabled: boolean
  musicVolume: number
  musicTrack: MusicTrackId
  vinylCrackle: boolean
  rainEnabled: boolean
  rainLevel: number
  musicIntensity: number
  sleepTimerMinutes: number
  customAudioUrl?: string
  // QoL ayarları (v10)
  confirmDialogs: boolean // Prestij/sıfırlama onay diyaloğu göster
  reduceAnimations: boolean // Animasyonları ve parçacıkları azalt
  motionMode?: 'full' | 'reduced' | 'off' // 3 durumlu hareket kontrolü (reduceAnimations ile senkron; yoksa ondan türetilir)
  screenShake?: boolean // Taktil ekran sarsıntısı / titremesi açık/kapalı
  juiceMode: 'calm' | 'balanced' | 'tilt' // Balatro juice yoğunluğu
  screenOverlayEffects: boolean // Doomscroll ekran dokuları (parmak izi lekesi ve kriz çatlağı)
  sideHands: boolean // Yan şıklatan eller: ekranın iki yanında 4 karelik el animasyonu
  holoCardsEnabled: boolean // Balatro tarzı 3D kart tilt ve holo kaplamalar
  swirlShaderQuality: 'off' | 'balanced' | 'high' // Balatro tarzı dinamik arka plan girdap shader'ı
  sequentialStrike: boolean // Balatro Sütun 2: Sıralı Reels Vuruşu (Pop-chain cascade)
  // Sistem & Performans QoL (v22 - En İyi Ayarlar)
  batterySaver: boolean // Düşük CPU/GPU tasarruf modu
  floatingTexts: boolean // Tıklama ve kritik uçan yazıları
  newsTickerEnabled: boolean // Üst haber bandı açık/kapalı
  swipeSensitivity?: 'balanced' | 'low' | 'off' // Mobil ekran kaydırma / fiske jesti hassasiyeti
  offlineProgressModal: boolean // Çevrimdışı rapor modalı
  hotkeysEnabled: boolean // Klavye kısayolları (1-9, M vb.)
  activeSlot: number // 1, 2 veya 3
}
