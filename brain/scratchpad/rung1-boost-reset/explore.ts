import { CHALLENGES, BOOST_TUNING, CHALLENGE_FEED_MULT, simulate, fmt, type Policy } from './model'

const CAP = 3000

function policy(enter: boolean, targets: number[], maxBoosts: number): Policy {
  return { enterChallenges: enter, boostTargets: targets, maxBoosts }
}

function line(name: string, r: ReturnType<typeof simulate>): string {
  const phases = r.phases.map((p) => p.id + ':' + p.entryMin.toFixed(0) + '-' + p.endMin.toFixed(0) + (p.completed ? '' : '(x)')).join(' ')
  const boosts = r.boostEvents.map((b) => b.min.toFixed(0)).join(',')
  return name.padEnd(22) + ' gate=' + fmt(r.gateMin).padStart(6) + ' log=' + r.finalLog.toFixed(1).padStart(6) +
    ' boost=' + r.boostCount + ' [' + boosts + '] ' + phases + (r.error ? ' ERR=' + r.error : '')
}

console.log('B=' + 5.5 + ' boost=' + JSON.stringify(BOOST_TUNING) + ' feed=' + CHALLENGE_FEED_MULT)
const base = simulate({ B: 5.5, policy: policy(false, [], 0), maxMinutes: CAP })
console.log(line('base (no meta)', base))

const chal = simulate({ B: 5.5, policy: policy(true, [], 0), maxMinutes: CAP })
console.log(line('challenges-only', chal))

for (let k = 0; k <= 6; k++) {
  const r = simulate({ B: 5.5, policy: policy(false, [], k), maxMinutes: CAP })
  console.log(line('boost-only k=' + k, r))
}
