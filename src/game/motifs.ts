/**
 * Faz C — GIC motif slot kütüphanesi ("Aç Kumarhane" kimlik katmanı).
 *
 * Sözleşme: brain/context/visual-language.md §5 + ADR-0060 §2.4
 * Plan: visual-language-hungry-parlor-implementation-plan §6 (C1)
 *
 * Slot kontratı: **motif adı = dosya adı** (`src/assets/motifs/<ad>.svg`).
 * İlk dalga agent-üretimi SVG; ileride elle çizilen asset'ler birebir
 * değiştirilebilir (yalnız dosya değişir, kod değişmez). SVG'ler Vite `?raw`
 * ile string olarak gömülür; renklendirme `currentColor` üzerinden CSS'ten gelir.
 *
 * Grup = labirent teması (GIC kuralı: her faz tek tema): planck (K1),
 * cosmic (K2), collapse (K3), nightwatch (K4).
 *
 * Ton disiplini (ADR-0058 rezerve renkler + okunabilirlik kanonu): motifler
 * ambient/dekoratif katmanda yaşar; durum anlatan rezerve hue'lar (rose ikaz,
 * cyan bonus, amber prestij, purple katman) KULLANILMAZ. Tonlar yalnız
 * oburluk enerjisi + sıcak nötrlerdir: feast (olay enerjisi), bone (sıcak kemik),
 * ember (derin kor).
 */
import type { CorruptionLevel } from './corruption'

import delikRaw from '../assets/motifs/delik.svg?raw'
import gozRaw from '../assets/motifs/goz.svg?raw'
import disRaw from '../assets/motifs/dis.svg?raw'
import zincirRaw from '../assets/motifs/zincir.svg?raw'
import tekerlekRaw from '../assets/motifs/tekerlek.svg?raw'
import gulRaw from '../assets/motifs/gul.svg?raw'
import damaRaw from '../assets/motifs/dama.svg?raw'
import yirtikRaw from '../assets/motifs/yirtik.svg?raw'
import bantRaw from '../assets/motifs/bant.svg?raw'
import karalamaRaw from '../assets/motifs/karalama.svg?raw'
import vidaRaw from '../assets/motifs/vida.svg?raw'
import catlakRaw from '../assets/motifs/catlak.svg?raw'
import ayRaw from '../assets/motifs/ay.svg?raw'
import yildizRaw from '../assets/motifs/yildiz.svg?raw'
import saatRaw from '../assets/motifs/saat.svg?raw'
import perdeRaw from '../assets/motifs/perde.svg?raw'

/** Motif grubu → açıldığı minimum bozulma seviyesi. */
export type MotifGroup = 'planck' | 'cosmic' | 'collapse' | 'nightwatch'

export const MOTIF_GROUPS: Record<MotifGroup, { minCorruption: CorruptionLevel; label: string }> = {
  planck: { minCorruption: 1, label: 'Planck Aşınması' },
  cosmic: { minCorruption: 2, label: 'Kozmik Yutuş' },
  collapse: { minCorruption: 3, label: 'Çöküş Sonrası' },
  nightwatch: { minCorruption: 4, label: 'Gece Nöbeti' }
}

export const MOTIF_GROUP_ORDER: MotifGroup[] = ['planck', 'cosmic', 'collapse', 'nightwatch']

/** Dekoratif ton — rezerve durum renkleriyle çakışmaz (yukarıdaki nota bak). */
export type MotifTone = 'feast' | 'bone' | 'ember'

export interface MotifSlot {
  /** Dosya adıyla birebir aynı (`<id>.svg`). Kontrat — test kilitli. */
  id: string
  /** Türkçe görünen ad. */
  name: string
  group: MotifGroup
  tone: MotifTone
  /** Ham SVG stringi (`?raw`). */
  svg: string
  /** Seçim ağırlığı (tekrar eden korku kökü `delik` daha sık görünür). */
  weight: number
}

export const MOTIFS: MotifSlot[] = [
  // K1 — Planck Aşınması
  { id: 'delik', name: 'Tekillik Deliği', group: 'planck', tone: 'feast', svg: delikRaw, weight: 2 },
  { id: 'goz', name: 'Gözetleyen Göz', group: 'planck', tone: 'bone', svg: gozRaw, weight: 1 },
  { id: 'dis', name: 'Obur Diş', group: 'planck', tone: 'bone', svg: disRaw, weight: 1 },
  { id: 'zincir', name: 'Bağ Zinciri', group: 'planck', tone: 'ember', svg: zincirRaw, weight: 1 },
  // K2 — Kozmik Yutuş
  { id: 'tekerlek', name: 'Yörünge Tekeri', group: 'cosmic', tone: 'bone', svg: tekerlekRaw, weight: 1 },
  { id: 'gul', name: 'Olay Ufku Gülü', group: 'cosmic', tone: 'feast', svg: gulRaw, weight: 1 },
  { id: 'dama', name: 'Damalı Şerit', group: 'cosmic', tone: 'bone', svg: damaRaw, weight: 1 },
  { id: 'yirtik', name: 'Yırtık Kâğıt', group: 'cosmic', tone: 'ember', svg: yirtikRaw, weight: 1 },
  // K3 — Çöküş Sonrası
  { id: 'bant', name: 'Yapışkan Bant', group: 'collapse', tone: 'bone', svg: bantRaw, weight: 1 },
  { id: 'karalama', name: 'El Karalaması', group: 'collapse', tone: 'feast', svg: karalamaRaw, weight: 1 },
  { id: 'vida', name: 'Vida Başı', group: 'collapse', tone: 'ember', svg: vidaRaw, weight: 1 },
  { id: 'catlak', name: 'Uzay-Zaman Çatlağı', group: 'collapse', tone: 'feast', svg: catlakRaw, weight: 1 },
  // K4 — Gece Nöbeti
  { id: 'ay', name: 'Nöbet Ayı', group: 'nightwatch', tone: 'bone', svg: ayRaw, weight: 1 },
  { id: 'yildiz', name: 'Kayan Kıvılcım', group: 'nightwatch', tone: 'feast', svg: yildizRaw, weight: 1 },
  { id: 'saat', name: 'Uykusuz Saat', group: 'nightwatch', tone: 'ember', svg: saatRaw, weight: 1 },
  { id: 'perde', name: 'Olay Perdesi', group: 'nightwatch', tone: 'bone', svg: perdeRaw, weight: 1 }
]

/**
 * Bozulma seviyesinde açık motifler (gruplar kümülatif açılır — labirent derinleşir).
 * K0 steril: boş dizi döner (bant gizlenir).
 */
export function motifsForCorruption(level: CorruptionLevel): MotifSlot[] {
  return MOTIFS.filter((m) => MOTIF_GROUPS[m.group].minCorruption <= level)
}

/**
 * Bant dizilimi: ağırlıklı deterministik döngü (RNG yok — test edilebilir,
 * tekrarsız his için ağırlık kadar tekrarla genişletilir).
 *
 * Pencere kaydırması (A5-05): dizi her zaman 0. indeksten başlarsa K1..K4
 * bantları havuzun aynı ön ekini gösterir ve 16 motifin 9'u hiç görünmez.
 * cycle her yeni tetiklemede 1 artar; başlangıç indeksi ağırlıklı havuz
 * uzunluğu (periyot) üzerinden kaydırılır → sonlu döngüde tüm havuz görünür.
 * İmza geriye uyumludur: cycle verilmezse eski davranış (0. indeks) korunur.
 *
 * @param level Bozulma seviyesi (K0 → boş dizi).
 * @param count Pencere uzunluğu (glif sayısı).
 * @param cycle Deterministik kaydırma adımı (negatif/NaN → 0'a indirgenir).
 */
export function buildMotifStrip(level: CorruptionLevel, count: number, cycle = 0): MotifSlot[] {
  const pool = motifsForCorruption(level)
  if (pool.length === 0 || count <= 0) return []
  const weighted: MotifSlot[] = []
  for (const m of pool) {
    const w = Math.max(1, Math.floor(m.weight))
    for (let i = 0; i < w; i++) weighted.push(m)
  }
  const period = weighted.length
  const shift = Number.isFinite(cycle) ? Math.floor(cycle) : 0
  const start = ((shift % period) + period) % period
  const strip: MotifSlot[] = []
  for (let i = 0; i < count; i++) strip.push(weighted[(start + i) % period])
  return strip
}
