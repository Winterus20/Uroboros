// Konsept sayfaları için ortak, sahte ekonomi. Oyun koduna bağlı değil; yalnız mockup'ları canlı tutar.
export const RING_NAMES = ['Fingers', 'Notch', 'Abacus', 'Pencil', 'Calculator', 'Computer', 'Supercomputer', 'Mathematician']

export function createSim() {
  const s = {
    number: 4.2e5,
    taps: 214,
    buyMode: 1,
    rings: RING_NAMES.map((name, i) => ({ name, i, amount: 0, bought: 0 }))
  }
  ;[23, 12, 3].forEach((b, i) => { s.rings[i].bought = b; s.rings[i].amount = b })
  return s
}

export const cost = (r) => 25 * 8 ** r.i * 1.2 ** r.bought
export const block = (r) => 5.5 ** Math.floor(r.bought / 10)
export const unlocked = (s, r) => r.i === 0 || s.rings[r.i - 1].bought >= 10
export const produces = (r) => r.amount * block(r) * 0.6

export function perSecond(s) {
  return s.rings.reduce((sum, r) => sum + (r.i === 0 ? produces(r) : produces(r) * 0.05), 0)
}

export function tick(s, dt) {
  for (let i = 1; i < s.rings.length; i++) s.rings[i - 1].amount += produces(s.rings[i]) * dt * 0.1
  s.number += perSecond(s) * dt
}

export function buy(s, idx) {
  const r = s.rings[idx]
  if (!unlocked(s, r)) return false
  let n = 0
  const want = s.buyMode === 'max' ? Infinity : s.buyMode
  while (n < want && s.number >= cost(r)) { s.number -= cost(r); r.bought++; r.amount++; n++ }
  return n > 0
}

export function goalPct(s) {
  return Math.max(0, Math.min(100, (Math.log10(Math.max(1, s.number)) / 308.25) * 100))
}

const SUFFIX = ['', 'K', 'M', 'B', 'T']
export function fmt(x, dec = 2) {
  if (x < 1000) return x < 10 && x % 1 ? x.toFixed(dec) : String(Math.floor(x))
  const e = Math.floor(Math.log10(x))
  if (e < 15) { const k = Math.floor(e / 3); return (x / 10 ** (k * 3)).toFixed(dec) + SUFFIX[k] }
  return (x / 10 ** e).toFixed(dec) + 'e' + e
}
export function heroParts(x) {
  const t = fmt(x)
  const m = t.match(/^([\d.]+)(.*)$/)
  return { base: m[1], tail: m[2] }
}

export const TICKER = [
  'Nothing here is hidden. That is the problem.',
  'The number does not know you are watching. Probably.',
  'You pressed +1 again. It noticed.',
  'Fingers were the first abacus. Nobody thanks them.',
  'Somewhere, a larger number is waiting.'
]
