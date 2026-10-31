import { CHALLENGES, run, brief, fmt, type Policy } from './harness'

const CAP = 2000
const DT = 1
const noChal = (k: number): Policy => ({ enterChallenges: false, boostTargets: [], maxBoosts: k })
const t = (v: number[]): Policy => ({ enterChallenges: true, boostTargets: v, maxBoosts: 99 })

console.log('=== GERCEK MOTOR, dt=' + DT + 's, cap ' + CAP + ' dk ===')
console.log('-- base (no boost, no challenge) --')
const base = run({ policy: noChal(0), maxMinutes: CAP, dt: DT })
console.log(brief(base) + ' maxBought=' + JSON.stringify(base.maxBought))

console.log('-- boost-only merdiveni (k boost + final kosu) --')
console.log('k  ladder  final  total')
for (let k = 0; k <= 8; k++) {
  if (k === 0) {
    const fin = run({ policy: noChal(0), maxMinutes: CAP, dt: DT })
    console.log('0     0.0  ' + fmt(fin.gateMin).padStart(5) + '  ' + fmt(fin.gateMin))
    continue
  }
  const lad = run({ policy: noChal(99), maxMinutes: CAP, dt: DT, stopAfterBoost: k })
  const fin = run({ policy: noChal(0), maxMinutes: CAP, dt: DT, preBoost: k })
  const reached = lad.boostCount >= k
  const total = reached && fin.gateMin !== null ? lad.totalMin + fin.gateMin : null
  console.log(String(k).padEnd(2) + ' ' + fmt(lad.totalMin).padStart(6) + '  ' + fmt(fin.gateMin).padStart(5) + '  ' + (total === null ? 'erisilemedi' : total.toFixed(1)))
}

console.log('-- challenges-only (no boost) --')
console.log(brief(run({ policy: t([0,0,0,0,0,0,0,0]), maxMinutes: CAP, dt: DT })))

console.log('-- boost+challenges: baslangicta k boost sonra sirali mucadele --')
for (const k of [0, 1, 2, 3, 4, 5, 6, 7]) {
  const pol = t(new Array(8).fill(k))
  console.log('preBoost=' + k + ' ' + brief(run({ policy: pol, maxMinutes: CAP, dt: DT })))
}
