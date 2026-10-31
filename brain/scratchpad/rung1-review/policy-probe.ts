import { advance, checkGate, createNumberState, manualTap, maxAll } from '../../../src/game/number/economy'
import { completeChallengeIfReady, enterChallenge, isChallengeUnlocked, nextChallenge } from '../../../src/game/number/challenges'

interface Phase { id: string; startMin: number; endMin: number; entryLog: number; goalLog: number; span: number; duration: number }

function run(policy: 'unlock' | 'wait', capMinutes = 400) {
  const s = createNumberState()
  let t = 0
  let tapAcc = 0
  let activeStart: number | null = null
  let activeEntry = 0
  let activeGoal = 0
  const phases: Phase[] = []
  let firstBuyMin: number | null = null

  while (t < capMinutes * 60 && !s.gateReached) {
    s.playTime = t
    advance(s, 0.5)
    t += 0.5

    if (t <= 100000) { // kalibrasyon politikasi: kosu boyunca 2 tik/sn
      tapAcc += 0.5
      while (tapAcc >= 0.5) {
        tapAcc -= 0.5
        manualTap(s)
      }
    }

    const done = completeChallengeIfReady(s)
    if (done && activeStart !== null) {
      phases.push({ id: done.id, startMin: activeStart, endMin: t / 60, entryLog: activeEntry, goalLog: activeGoal, span: activeGoal - activeEntry, duration: t / 60 - activeStart })
      activeStart = null
    }

    if (!s.challenges.active) {
      const next = nextChallenge(s)
      if (next && isChallengeUnlocked(s, next)) {
        const log = s.number.log10().toNumber()
        const enter = policy === 'unlock' ? true : log >= next.goalLog10 - 1
        if (enter && enterChallenge(s, next.id)) {
          activeStart = t / 60
          activeEntry = s.challenges.entryLog10 ?? 0
          activeGoal = s.challenges.goalLog10 ?? 0
        }
      }
    }

    maxAll(s)
    if (firstBuyMin === null && s.totalBuys > 0) firstBuyMin = t / 60
    checkGate(s)
  }

  const challengeMinutes = phases.reduce((sum, p) => sum + p.duration, 0)
  return { policy, totalMin: t / 60, gate: s.gateReached, phases, challengeMinutes, normalMinutes: t / 60 - challengeMinutes, log: s.number.log10().toNumber(), buys: s.totalBuys, firstBuyMin }
}

for (const policy of ['unlock', 'wait'] as const) {
  const r = run(policy)
  console.log('')
  console.log('=== ' + policy + ' | total ' + r.totalMin.toFixed(1) + ' dk | gate ' + r.gate + ' | log ' + r.log.toFixed(1) + ' | buys ' + r.buys + ' ===')
  console.log('mucadele ' + r.challengeMinutes.toFixed(1) + ' dk / normal ' + r.normalMinutes.toFixed(1) + ' dk | ilk alim ' + (r.firstBuyMin === null ? 'yok' : r.firstBuyMin.toFixed(1) + ' dk'))
  for (const p of r.phases) {
    console.log(p.id.padEnd(3) + ' ' + p.startMin.toFixed(1).padStart(5) + '-' + p.endMin.toFixed(1).padStart(5) + '  ' + p.duration.toFixed(1).padStart(5) + ' dk  ' + p.entryLog.toFixed(1).padStart(6) + ' -> ' + p.goalLog.toFixed(1).padStart(6) + '  span ' + p.span.toFixed(1))
  }
}