import { advance, checkGate, createNumberState, manualTap, maxAffordableRing, buyRing, ringUnlocked } from '../../../src/game/number/economy'
import { completeChallengeIfReady, enterChallenge, isChallengeUnlocked, nextChallenge } from '../../../src/game/number/challenges'

function buySmart(s: ReturnType<typeof createNumberState>): number {
  let total = 0
  // En derin halkadan başla; blok beklemeden alınabildiği kadar al (tekli dahil).
  for (let i = 7; i >= 0; i--) {
    if (!ringUnlocked(s, i)) continue
    const n = maxAffordableRing(s, i)
    if (n > 0) total += buyRing(s, i, n)
  }
  return total
}

function run(policy: 'unlock' | 'wait', capMinutes = 400) {
  const s = createNumberState()
  let t = 0
  let tapAcc = 0
  let activeStart: number | null = null
  let activeEntry = 0
  let activeGoal = 0
  let firstBuy: number | null = null
  const phases: { id: string; start: number; end: number; duration: number; span: number; entry: number; goal: number }[] = []

  while (t < capMinutes * 60 && !s.gateReached) {
    s.playTime = t
    advance(s, 0.5)
    t += 0.5
    tapAcc += 0.5
    while (tapAcc >= 0.5) { tapAcc -= 0.5; manualTap(s) }

    const done = completeChallengeIfReady(s)
    if (done && activeStart !== null) {
      phases.push({ id: done.id, start: activeStart, end: t / 60, duration: t / 60 - activeStart, span: activeGoal - activeEntry, entry: activeEntry, goal: activeGoal })
      activeStart = null
    }
    if (!s.challenges.active) {
      const next = nextChallenge(s)
      if (next && isChallengeUnlocked(s, next)) {
        const log = s.number.log10().toNumber()
        const go = policy === 'unlock' ? true : log >= next.goalLog10 - 1
        if (go && enterChallenge(s, next.id)) {
          activeStart = t / 60
          activeEntry = s.challenges.entryLog10 ?? 0
          activeGoal = s.challenges.goalLog10 ?? 0
        }
      }
    }
    buySmart(s)
    if (firstBuy === null && s.totalBuys > 0) firstBuy = t / 60
    checkGate(s)
  }
  const ch = phases.reduce((a, p) => a + p.duration, 0)
  return { total: t / 60, gate: s.gateReached, phases, ch, firstBuy, log: s.number.log10().toNumber(), buys: s.totalBuys }
}

for (const p of ['unlock', 'wait'] as const) {
  const r = run(p)
  console.log('')
  console.log('=== ' + p + ' (tekli alim) | toplam ' + r.total.toFixed(1) + ' dk | kapi ' + r.gate + ' | ilk alim ' + (r.firstBuy === null ? '-' : r.firstBuy.toFixed(2)) + ' dk | alim ' + r.buys + ' ===')
  console.log('mucadele ' + r.ch.toFixed(1) + ' dk | normal ' + (r.total - r.ch).toFixed(1) + ' dk')
  for (const x of r.phases) console.log(x.id.padEnd(3) + ' ' + x.start.toFixed(1).padStart(5) + '-' + x.end.toFixed(1).padStart(5) + '  ' + x.duration.toFixed(1).padStart(5) + ' dk  span ' + x.span.toFixed(1))
}
