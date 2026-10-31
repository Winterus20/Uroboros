import { simulate, fmt, type Policy } from './model'

const CAP = 1600
const p = (enter: boolean, targets: number[], maxBoosts: number): Policy => ({ enterChallenges: enter, boostTargets: targets, maxBoosts })

function brief(r: ReturnType<typeof simulate>): string {
  const phases = r.phases.map((x) => x.id + ':' + x.entryMin.toFixed(0) + '-' + x.endMin.toFixed(0) + (x.completed ? '' : '(x)')).join(' ')
  return 'gate=' + fmt(r.gateMin).padStart(6) + ' log=' + r.finalLog.toFixed(1).padStart(6) + ' ' + phases
}

for (const B of [2, 3, 4, 5, 5.5]) {
  console.log('--- B=' + B + ' ---')
  const base = simulate({ B, policy: p(false, [], 0), maxMinutes: CAP, dt: 1 })
  console.log('base ' + brief(base))
  const chal = simulate({ B, policy: p(true, [], 0), maxMinutes: CAP, dt: 1 })
  console.log('chal ' + brief(chal))
}
