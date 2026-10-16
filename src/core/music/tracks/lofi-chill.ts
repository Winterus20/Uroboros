import type { SynthContext } from '../types'
import { NOTES } from '../notes'
import { playRhodesNote, playLofiPluck } from '../instruments/keys'
import { playSubBass } from '../instruments/bass'
import {
  playSoftKick,
  playSnare,
  playGhostSnare,
  playHiHat,
  playShaker,
  playTapeStopSweep,
  playVinylClick
} from '../instruments/drums'

interface LofiBank {
  chords: number[][]
  bass: number[]
  approach: number[]
  /** Her ölçüye özgü melodi motifi: { stepInMeasure: frekans } */
  melody: Array<Record<number, number>>
}

/**
 * Auto-DJ Set Bölümleri (her bölüm 1 loop = 4 ölçü ≈ 12.6 sn @ 76 BPM):
 * 0: INTRO       — plak düştü, sadece Rhodes ve nefes alan bas (davul yok)
 * 1: BEAT IN     — davul girdi, groove kuruluyor
 * 2: GROOVE      — tam akış + yürüyen bas + tüm melodi katmanları
 * 3: PEAK        — melodik zirve, üst oktav parıltıları (Nujabes dokunuşu)
 * 4: BREAKDOWN   — gece boşluğu: sadece yumuşak kick ve seyreltik hat
 * 5: SECOND HALF — ikinci seslendirme varyasyonu, groove dönüşü
 * 6: LATE GROOVE — yorgun gece: seyreledilmiş davul ve bas
 * 7: VINYL RESET — davul dışarı, plak yavaşlar, sonraki "parça"ya geçiş
 */
interface PhaseConfig {
  vel: number
  chordSteps: number[]
  chordDur: number
  bass: 'sparse' | 'root' | 'walk' | 'walkApproach' | 'exit'
  drums: 'none' | 'light' | 'full' | 'breakdown' | 'exit'
  melodyChance: number
  altVoicing: boolean
}

const PHASES: PhaseConfig[] = [
  // 0 — INTRO: sessiz giriş, sadece akorlar (step 0 ve 11) ve ince bas kökü
  { vel: 0.9, chordSteps: [0, 11], chordDur: 3.0, bass: 'sparse', drums: 'none', melodyChance: 0.25, altVoicing: false },
  // 1 — BEAT IN: davul girdi, bas kökleri
  { vel: 0.95, chordSteps: [0, 6, 11], chordDur: 2.4, bass: 'root', drums: 'light', melodyChance: 0.4, altVoicing: false },
  // 2 — GROOVE: tam akış, yürüyen bas, senkoplu ara bas
  { vel: 1.0, chordSteps: [0, 6, 11], chordDur: 2.2, bass: 'walk', drums: 'full', melodyChance: 0.6, altVoicing: false },
  // 3 — PEAK: melodi zirvesi + kromatik yaklaşım notaları + üst oktav seslendirme
  { vel: 1.06, chordSteps: [0, 6, 11], chordDur: 2.2, bass: 'walkApproach', drums: 'full', melodyChance: 1.0, altVoicing: true },
  // 4 — BREAKDOWN: gece boşluğu, uzun akor sönümleri
  { vel: 0.82, chordSteps: [0, 8], chordDur: 2.8, bass: 'sparse', drums: 'breakdown', melodyChance: 0.35, altVoicing: false },
  // 5 — SECOND HALF: ikinci yarı, farklı seslendirme ve yürüyen bas
  { vel: 0.98, chordSteps: [0, 6, 11], chordDur: 2.3, bass: 'walk', drums: 'full', melodyChance: 0.75, altVoicing: true },
  // 6 — LATE GROOVE: yorgun gece, hafif davul, kromatik yaklaşımlar
  { vel: 0.92, chordSteps: [0, 6, 11], chordDur: 2.2, bass: 'walkApproach', drums: 'light', melodyChance: 0.5, altVoicing: false },
  // 7 — VINYL RESET: radyo sonraki parçaya dönüyor (plak yavaşlaması)
  { vel: 0.85, chordSteps: [0, 8], chordDur: 3.2, bass: 'exit', drums: 'exit', melodyChance: 0.6, altVoicing: false }
]

export function getLofiBank(bank: number): LofiBank {
  const banks: LofiBank[] = [
    {
      // Bank 0: Sunday Rain (Fmaj9 -> Em9 -> Dm9 -> Cmaj9)
      chords: [
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4], // Fmaj9 (rootless 3-5-7-9)
        [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.Fs4], // Em9
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4] // Cmaj9
      ],
      bass: [NOTES.F2, NOTES.E2, NOTES.D2, NOTES.C2],
      approach: [NOTES.Fs2, NOTES.Eb2, NOTES.Db2, NOTES.E2],
      melody: [
        { 2: NOTES.F5, 5: NOTES.G5 }, // Soru motifi
        { 4: NOTES.A5, 10: NOTES.G5 }, // Nefes
        { 2: NOTES.C6, 6: NOTES.B5, 9: NOTES.A5, 12: NOTES.G5 }, // Cevap
        { 4: NOTES.F5, 12: NOTES.E5 } // Kadans
      ]
    },
    {
      // Bank 1: 3AM Thoughts (Am9 -> Dm9 -> Db9 tritone sub -> Cmaj9)
      chords: [
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4], // Am9
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.F3, NOTES.Ab3, NOTES.B3, NOTES.Eb4], // Db9 (G7 tritone substitution)
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4] // Cmaj9
      ],
      bass: [NOTES.A1, NOTES.D2, NOTES.Db2, NOTES.C2],
      approach: [NOTES.Eb2, NOTES.D2, NOTES.Db2, NOTES.Gs1],
      melody: [
        { 2: NOTES.E5, 6: NOTES.G5 }, // Soru motifi (karanlık)
        { 2: NOTES.F5, 10: NOTES.E5 },
        { 4: NOTES.D5, 8: NOTES.E5, 12: NOTES.F5 }, // Cevap
        { 2: NOTES.E5, 9: NOTES.A5 } // Kadans
      ]
    },
    {
      // Bank 2: Tokyo Highway (Fmaj9 -> G13 -> Em7 -> Am9)
      chords: [
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4], // Fmaj9
        [NOTES.B3, NOTES.E4, NOTES.F4, NOTES.A4], // G13
        [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.G4], // Em7
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4] // Am9
      ],
      bass: [NOTES.F2, NOTES.G2, NOTES.E2, NOTES.A1],
      approach: [NOTES.Fs2, NOTES.F2, NOTES.Gs1, NOTES.E2],
      melody: [
        { 4: NOTES.A4, 8: NOTES.C5 }, // Soru motifi (alçak, sakin)
        { 2: NOTES.C5, 7: NOTES.B4 },
        { 4: NOTES.G4, 8: NOTES.A4, 12: NOTES.B4 }, // Cevap
        { 6: NOTES.C5, 10: NOTES.E5 } // Kadans
      ]
    },
    {
      // Bank 3: Midnight Cafe (Dm9 -> G13 -> Cmaj9 -> A7b13)
      chords: [
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.F3, NOTES.B3, NOTES.E4, NOTES.A4], // G13
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4], // Cmaj9
        [NOTES.G3, NOTES.Cs4, NOTES.F4, NOTES.A4] // A7b13 (secondary dominant)
      ],
      bass: [NOTES.D2, NOTES.G2, NOTES.C2, NOTES.A1],
      approach: [NOTES.Fs2, NOTES.B1, NOTES.Ab1, NOTES.Cs2],
      melody: [
        { 2: NOTES.F5, 6: NOTES.E5 }, // Soru motifi
        { 4: NOTES.D5, 10: NOTES.C5 },
        { 2: NOTES.A4, 6: NOTES.B4, 9: NOTES.D5, 12: NOTES.F5 }, // Cevap
        { 4: NOTES.E5, 12: NOTES.D5 } // Kadans
      ]
    },
    {
      // Bank 4: Paper Cranes (Bm7b5 -> E7b9 -> Am9 -> Fmaj7#11) — orta register'a çekildi
      chords: [
        [NOTES.F3, NOTES.A3, NOTES.D4, NOTES.F4], // Bm7b5 (5-7-3-11)
        [NOTES.D4, NOTES.Gs4, NOTES.B4, NOTES.C5], // E7b9 (b7-3-5-b9)
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4], // Am9
        [NOTES.C4, NOTES.E4, NOTES.A4, NOTES.B4] // Fmaj7#11 (5-7-3-#11)
      ],
      bass: [NOTES.B1, NOTES.E2, NOTES.A1, NOTES.F2],
      approach: [NOTES.Ds2, NOTES.Gs1, NOTES.E2, NOTES.Bb1],
      melody: [
        { 2: NOTES.D5, 8: NOTES.F5 }, // Soru motifi (geniş sıçramalar)
        { 2: NOTES.E5, 6: NOTES.F5 },
        { 4: NOTES.E5, 8: NOTES.G5, 12: NOTES.F5 }, // Cevap
        { 2: NOTES.D5, 14: NOTES.B4 } // Kadans
      ]
    },
    {
      // Bank 5: Window Raindrops (Bbmaj9 -> Am7 -> Gm9 -> Fmaj9)
      chords: [
        [NOTES.D4, NOTES.F4, NOTES.A4, NOTES.C5], // Bbmaj9
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5], // Am7
        [NOTES.Bb3, NOTES.D4, NOTES.F4, NOTES.A4], // Gm9
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4] // Fmaj9
      ],
      bass: [NOTES.Bb1, NOTES.A1, NOTES.G2, NOTES.F2],
      approach: [NOTES.B1, NOTES.Ab1, NOTES.Fs2, NOTES.A1],
      melody: [
        { 2: NOTES.D5, 6: NOTES.C5 }, // Soru motifi (yumuşak)
        { 4: NOTES.B4, 10: NOTES.C5 },
        { 2: NOTES.B4, 8: NOTES.C5, 12: NOTES.D5 }, // Cevap
        { 4: NOTES.D5, 12: NOTES.C5 } // Kadans
      ]
    }
  ]
  return banks[bank % banks.length]
}

export function renderLofiChill(host: SynthContext, step: number, time: number): void {
  const measure = Math.floor(step / 16)
  const stepInMeasure = step % 16
  const t = host.humanTime(time)

  // Auto-DJ set konumu: 8 bölümlük döngü (intro -> çıkış)
  const phase = host.loopCount % 8
  const cfg = PHASES[phase]

  // Her "parça" 8 loop sürer, sonra 6 caz bankası arasında sıradakine geçilir
  const bank = Math.floor(host.loopCount / 8) % 6
  const { chords, bass: bassRoots, approach, melody: motif } = getLofiBank(bank)

  // ---------------------------------------------------------------
  // 1. RHODES AKORLARI — İnsan Eli Taraması (Rake Strumming)
  // ---------------------------------------------------------------
  if (cfg.chordSteps.includes(stepInMeasure)) {
    const currentChord = chords[measure]
    const velScale = stepInMeasure === 0 ? 1.0 : stepInMeasure === 6 ? 0.65 : 0.48
    const rakeDelay = 0.022 // Her nota arasına 22ms organik insan gecikmesi
    // Vinyl reset bölümünün son akoru: ritardando hissiyle uzun sönümlü kapanış
    const isFinalChord = phase === 7 && step === 56
    const chordDur = isFinalChord ? 3.4 : cfg.chordDur
    // Ara sıra üçüncü nota tembelce geriden gelir (Dilla'nın "uyuyan" elleri)
    const lazyThirdNote = Math.random() > 0.88 ? 0.03 : 0

    currentChord.forEach((freq, idx) => {
      if (idx > 2 && stepInMeasure === 11 && !cfg.altVoicing) return // 11. adımda sadece üst 2-3 notayı tınlat
      const f = cfg.altVoicing && idx >= 2 ? freq * 2 : freq
      const humanDelay = idx * rakeDelay + (idx === 2 ? lazyThirdNote : 0) + (Math.random() - 0.5) * 0.005
      const panSpread = (idx - 1.5) * 0.12 // Tuşlar klavye üzerinde hafifçe sağa-sola yayılır
      const noteVol = host.humanVel(0.16 * velScale * cfg.vel * (idx === 0 ? 0.9 : 1.0))
      playRhodesNote(host, f, t + humanDelay, chordDur, noteVol, panSpread, velScale)
    })

    // Yeni parçanın ilk akorunda iğne yere değdi
    if (phase === 0 && step === 0) {
      playVinylClick(host, t, 0.05)
    }
  }

  // ---------------------------------------------------------------
  // 2. SUB-BAS — Bölüme göre yürüyüş, kök ve kromatik yaklaşım
  // ---------------------------------------------------------------
  if (stepInMeasure === 0) {
    const isSparse = cfg.bass === 'sparse'
    playSubBass(host, bassRoots[measure], t, isSparse ? 1.4 : 1.7, isSparse ? 0.3 : 0.42)
  }
  if (cfg.bass === 'root' && stepInMeasure === 10) {
    // Senkoplu ara bas
    playSubBass(host, bassRoots[measure], t, 0.7, 0.32)
  }
  if (cfg.bass === 'walk' || cfg.bass === 'walkApproach') {
    if (stepInMeasure === 6) {
      // 5'li zıplaması (groove hareketi)
      playSubBass(host, bassRoots[measure] * 1.5, t, 0.6, 0.28)
    }
    if (stepInMeasure === 10) {
      // Senkoplu ara bas
      playSubBass(host, bassRoots[measure], t, 0.7, 0.32)
    }
  }
  if (cfg.bass === 'exit' && stepInMeasure === 12) {
    // Plak yavaşlarken son bas dokunuşu
    playSubBass(host, bassRoots[measure], t, 1.6, 0.26)
  }
  if (cfg.bass === 'walkApproach' && stepInMeasure === 14) {
    // KROMATİK YAKLAŞIM NOTASI (bir sonraki ölçünün köküne yarım ton basarak kayma)
    playSubBass(host, approach[measure], t, 0.45, 0.26)
  }

  // ---------------------------------------------------------------
  // 3. J DILLA "DRUNK" BOOM-BAP DAVUL — bölüme göre yoğunluk
  // ---------------------------------------------------------------
  if (cfg.drums === 'full' || cfg.drums === 'light') {
    const isFull = cfg.drums === 'full'
    // KICK: Step 0 tok downbeat + Step 7/10 hafif sürüklenen sarhoş ikinci kick
    if (stepInMeasure === 0) {
      playSoftKick(host, host.kickTime(t), host.humanVel(0.34 * cfg.vel))
    } else if (stepInMeasure === 7 && isFull) {
      playSoftKick(host, host.kickTime(t + 0.014), host.humanVel(0.24 * cfg.vel)) // +14ms sarhoş gecikme
    } else if (stepInMeasure === 10) {
      playSoftKick(host, host.kickTime(t), host.humanVel(0.28 * cfg.vel))
    }

    // SNARE: +22ms layback arkadan gelen tok trampet
    if (stepInMeasure === 4 || (stepInMeasure === 12 && isFull)) {
      playSnare(host, host.snareTime(t), host.humanVel(0.2 * cfg.vel))
    }

    // GHOST SNARE: Adım 14 veya 15'te fısıltı gibi kasnak/fırça dokunuşu
    if ((stepInMeasure === 14 || stepInMeasure === 15) && isFull) {
      playGhostSnare(host, host.snareTime(t), 0.06)
    }
    // Beat girişine minik bir doldurma (groove'a köprü)
    if (phase === 1 && (stepInMeasure === 14 || stepInMeasure === 15)) {
      playGhostSnare(host, host.snareTime(t), 0.05)
    }

    // HI-HAT: Tekli adımlarda swingli şapka
    if (stepInMeasure % 2 === 1) {
      const isUpbeat = stepInMeasure === 3 || stepInMeasure === 7 || stepInMeasure === 11 || stepInMeasure === 15
      const hatVol = (isUpbeat ? 0.075 : 0.05) * (isFull ? 1.0 : 0.75)
      playHiHat(host, t, host.humanVel(hatVol), false)
    }

    // Açık hat (sizzle nefesi)
    if (stepInMeasure === 6 && isFull && Math.random() > 0.4) {
      playHiHat(host, t, 0.08, true)
    }

    // Shaker: Arka planda organik 16'lık süpürme
    if (stepInMeasure % 2 === 0 && Math.random() > 0.2) {
      playShaker(host, t, host.humanVel(0.06 * (isFull ? 1.0 : 0.8)))
    }
  } else if (cfg.drums === 'breakdown') {
    // BREAKDOWN (Gece Boşluğu): Sadece çok yumuşak bir kick ve seyreltik hat
    if (stepInMeasure === 0) {
      playSoftKick(host, t, 0.2)
    }
    if (stepInMeasure === 8) {
      playGhostSnare(host, t, 0.04)
    }
    if (stepInMeasure % 4 === 2) {
      playHiHat(host, t, 0.04, false)
    }
    // Breakdown sonunda bir sonraki döngüye yumuşak geçiş süpürmesi
    if (step === 62) {
      playGhostSnare(host, t, 0.08)
    }
    if (step === 63) {
      playGhostSnare(host, t + 0.05, 0.12)
    }
  } else if (cfg.drums === 'exit') {
    // VINYL RESET: Davul yavaş yavaş dışarı çıkar, plak durar
    if (stepInMeasure === 0) {
      playSoftKick(host, host.kickTime(t), host.humanVel(0.28))
    }
    if (stepInMeasure === 4) {
      playSnare(host, host.snareTime(t), 0.14)
    }
    if (stepInMeasure % 2 === 1 && step < 24) {
      playHiHat(host, t, 0.04, false)
    }
    if (step === 24) {
      playHiHat(host, t, 0.05, false) // Son şapka vuruşu
    }
    if (step === 36) {
      playSoftKick(host, t, 0.18) // Son tok
    }
    if (step === 52) {
      // Radyo geçişi: bant/plak yavaşlaması süpürmesi
      playTapeStopSweep(host, t, 0.12)
    }
    if (step === 62) {
      playGhostSnare(host, t, 0.06)
    }
    if (step === 63) {
      playGhostSnare(host, t + 0.05, 0.09)
      // İğne kalkıp yeni parçaya iniş
      playVinylClick(host, t + 0.12, 0.08)
    }
  }

  // ---------------------------------------------------------------
  // 4. NOSTALJİK ÇAĞRI-CEVAP MELODİSİ — her banka kendi motifini çalar
  // ---------------------------------------------------------------
  const measureMelody = motif[measure]
  const noteFreq = measureMelody ? measureMelody[stepInMeasure] : undefined

  if (noteFreq) {
    const chance = cfg.melodyChance * (0.75 + host.intensity * 0.25)
    if (Math.random() < chance) {
      const pan = ((stepInMeasure % 5) - 2) * 0.11 // Hafif sağa-sola yayılmış tınılar
      const vol = host.humanVel(0.085 * cfg.vel)
      playLofiPluck(host, noteFreq, t, 0.95, vol, pan)
      // PEAK bölümünde Nujabes tarzı üst oktav parıltısı
      if (phase === 3 && Math.random() > 0.55) {
        playLofiPluck(host, noteFreq * 2, t + 0.055, 0.55, vol * 0.45, -pan)
      }
    }
  }

  // Auto-DJ: Her parça sonunda gece sıcaklığı / filtre nefes alsın (kullanıcı ayarı host.intensity korunur)
  if (step === 63 && host.filterNode && host.ctx) {
    const drift = (Math.random() - 0.5) * 400
    const baseFreq = 3800 + host.intensity * 1800
    const targetFreq = Math.max(2200, Math.min(6500, baseFreq + drift))
    host.filterNode.frequency.setTargetAtTime(targetFreq, t, 1.5)
  }
}
