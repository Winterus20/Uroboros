
import Decimal from 'break_eternity.js'
const cases = ['1.79e308', '1e1e15', '1e9e15']
for (const c of cases) {
  const d = new Decimal(c)
  console.log(c, '->', d.toString(), 'layer', d.layer, 'mag', d.mag)
}
const tet = Decimal.tetrate(10, 1.79e308)
console.log('10^^1.79e308 ->', tet.toString().slice(0, 60), 'layer', tet.layer, 'mag', String(tet.mag).slice(0,20))
const pow = Decimal.pow(10, new Decimal('9e15'))
console.log('10^(9e15) ->', pow.toString().slice(0, 60), 'layer', pow.layer)
const arrows = Decimal.arrow(10, 4, 6)
console.log('10^^^6 ->', arrows.toString().slice(0, 50), 'layer', arrows.layer, 'mag', String(arrows.mag).slice(0,25))

