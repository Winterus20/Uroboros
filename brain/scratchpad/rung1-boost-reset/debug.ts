import { CHALLENGES, createModelState, advance, enterChallenge, maxAll, manualTap, log10 } from './model'
import { D } from '../../../src/core/math'

const ids = CHALLENGES.map((c) => c.id)

function trace(id: string, B: number, b: number, minutes: number, growth?: number) {
  const i = ids.indexOf(id)
  const def = CHALLENGES[i]
  ;(def as { unlockLog10: number }).unlockLog10 = 10
  if (growth !== undefined) ;(def as { growth: number }).growth = growth
  const s = createModelState()
  s.completed = ids.slice(0, i)
  s.bestNumber = D('1e11')
  s.boostCount = b
  enterChallenge(s, id)
  ;(s as { goalLog10: number | null }).goalLog10 = 1e30
  let t = 0
  let tapAcc = 0
  console.log('--- ' + id + ' B=' + B + ' b=' + b + ' growth=' + (growth ?? def.growth) + ' rewards=' + s.completed.join(',') + ' ---')
  while (t < minutes * 60) {
    s.playTime = t
    advance(s, 1, B)
    t += 1
    if (s.rings[0].bought === 0) { tapAcc += 1; if (tapAcc >= 0.5) { tapAcc -= 0.5; manualTap(s) } }
    maxAll(s)
    if (Math.abs(t / 60 - Math.round(t / 60)) < 1e-9 && Math.round(t / 60) % 10 === 0) {
      console.log('t=' + (t / 60).toString().padStart(3) + ' log=' + log10(s).toFixed(2).padStart(6) + ' bought=' + JSON.stringify(s.rings.map((r) => r.bought)) + ' amt=' + JSON.stringify(s.rings.map((r) => (r.amount.lte(0) ? 0 : Number(r.amount.log10().toNumber().toFixed(1))))))
    }
  }
}

trace('C5', 5.5, 0, 120)
trace('C5', 5.5, 7, 90)
trace('C8', 5.5, 7, 90, 1.22)