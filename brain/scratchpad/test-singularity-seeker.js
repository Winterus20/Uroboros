import { Simulation, D_INFINITY } from '../harness/out/simulate-economy.mjs'
import Decimal from 'break_eternity.js'

function formatDec(d) {
  if (!(d instanceof Decimal)) d = new Decimal(d)
  if (d.lt(1000)) return d.toFixed(1)
  if (d.lt(1e6)) return d.toFixed(0)
  return d.toExponential(3).replace('+', '')
}

class SingularitySeekerSim extends Simulation {
  constructor(options = {}) {
    super(options)
    this.customGalaxyBase = options.galaxyBase ?? 50
    this.customGalaxyStep = options.galaxyStep ?? 20
    this.sacrificePower = options.sacrificePower ?? 0.05 // if null, uses current
  }

  get galaxyRequirement() {
    return this.customGalaxyBase + this.galaxies * this.customGalaxyStep
  }

  get currentSacrificeReward() {
    const dim1 = this.dimensions[0]
    if (!dim1 || dim1.amount.lt(10)) return new Decimal(1)
    if (this.sacrificePower) {
      if (dim1.amount.lt(1e10)) return new Decimal(1)
      return dim1.amount.div(1e10).pow(this.sacrificePower)
    }
    const logD1 = dim1.amount.log10().toNumber()
    if (logD1 <= 0) return new Decimal(1)
    return Decimal.pow(1 + logD1 / 4, 2.5)
  }
}

function testToSingularity(label, options, maxHours = 6) {
  console.log(`\n========================================================================================`)
  console.log(`SINGULARITY TEST: ${label}`)
  console.log(`Options:`, JSON.stringify(options))
  console.log(`========================================================================================`)

  const sim = new SingularitySeekerSim(options)
  const maxSeconds = maxHours * 3600
  const dt = 0.1
  let reachedSingularity = false
  let singularityTime = null
  let lastExp = 0
  let lastLogTime = -9999

  console.log(`Time(s) | Time(h:m:s) | Dopamine | Shifts | Gal | Hz | D8 (Amnt/Bght) | D8 Cost | Shift Req | Gal Req | Note`)
  console.log(`------------------------------------------------------------------------------------------------------------------`)

  function log(note = '') {
    const hours = Math.floor(sim.simTime / 3600)
    const mins = Math.floor((sim.simTime % 3600) / 60)
    const secs = Math.floor(sim.simTime % 60)
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    const d8 = sim.dimensions[7]
    const d8Str = `${formatDec(d8.amount)}/${d8.bought}`
    const d8Cost = sim.getDimensionCost(8)
    const shiftReq = sim.shiftRequirement
    const shiftReqStr = `T${shiftReq.tier}:${formatDec(shiftReq.amount)}`
    const galReqStr = `D8:${sim.galaxyRequirement}`

    console.log(
      `${String(sim.simTime.toFixed(0)).padStart(7)} | ${timeStr} | ${formatDec(sim.matter).padStart(9)} | ` +
      `${String(sim.dimensionShifts).padStart(6)} | ${String(sim.galaxies).padStart(3)} | ${String(sim.tickspeedBought).padStart(4)} | ` +
      `${d8Str.padStart(14)} | ${formatDec(d8Cost).padStart(9)} | ${shiftReqStr.padStart(10)} | ${galReqStr.padStart(7)} | ${note}`
    )
  }

  log('(START)')

  while (sim.simTime < maxSeconds) {
    sim.manualClick(2)
    sim.maxAll()
    sim.checkUpgrades()
    sim.checkAutobuyersUnlock()

    if (sim.canSacrifice && sim.currentSacrificeReward.gte(sim.sacrificeMultiplier.times(1.5))) {
      sim.sacrifice()
    }

    if (sim.canShift) {
      const prevShifts = sim.dimensionShifts
      const d8 = sim.dimensions[7].amount
      sim.dimensionShift()
      log(`SHIFT ${prevShifts} -> ${sim.dimensionShifts} (had ${formatDec(d8)} D8)`)
    }

    if (sim.canBuyGalaxy) {
      const prevGal = sim.galaxies
      const d8 = sim.dimensions[7].amount
      sim.buyGalaxy()
      log(`GALAXY ${prevGal} -> ${sim.galaxies} (used ${formatDec(d8)} D8)`)
    }

    if (sim.matter.isNan() || Number.isNaN(sim.matter.mag)) {
      console.error(`FATAL: NaN at ${sim.simTime}s!`)
      log('(CRASH: NaN)')
      break
    }

    sim.tick(dt)

    if (!reachedSingularity && sim.matter.gte(D_INFINITY)) {
      reachedSingularity = true
      singularityTime = sim.simTime
      log(`🎉 [SINGULARITY REACHED! 1.79e308 at ${(singularityTime / 3600).toFixed(2)}h (${singularityTime.toFixed(0)}s)] 🎉`)
      break
    }

    const currentExp = sim.matter.gt(1) ? sim.matter.log10().toNumber() : 0
    if (currentExp - lastExp >= 35 || sim.simTime - lastLogTime >= 1200) {
      log()
      lastLogTime = sim.simTime
      lastExp = currentExp
    }
  }

  log('(END)')

  console.log(`\nResults for ${label}:`)
  console.log(`- Time: ${(sim.simTime / 3600).toFixed(2)}h (${sim.simTime.toFixed(1)}s)`)
  console.log(`- Final Dopamine: ${formatDec(sim.matter)}`)
  console.log(`- Singularity: ${reachedSingularity ? `YES at ${(singularityTime / 3600).toFixed(2)}h (${singularityTime.toFixed(0)}s)` : 'NO'}`)
  console.log(`- Shifts: ${sim.dimensionShifts}, Galaxies: ${sim.galaxies}`)
  console.log(`- D8: owned=${formatDec(sim.dimensions[7].amount)}, bought=${sim.dimensions[7].bought}`)

  return { reachedSingularity, singularityTime, matter: sim.matter, shifts: sim.dimensionShifts, galaxies: sim.galaxies }
}

// Test Configuration 1:
// Linear shift: 20 + 15*(s-4)
// Galaxy: 40 + 20*galaxies (Allows Galaxy 1 at 40 D8, Gal 2 at 60 D8, Gal 3 at 80 D8, Gal 4 at 100 D8)
// Shift power: 2.0
// Sacrifice power: 0.05
testToSingularity('Config 1: GalReq = 40 + 20*g, shiftPower = 2.0, sacPower = 0.05', {
  shiftFormula: 'linear_20',
  galaxyBase: 40,
  galaxyStep: 20,
  shiftPowerBase: 2.0,
  sacrificePower: 0.05
}, 5)

// Test Configuration 2:
// Linear shift: 20 + 15*(s-4)
// Galaxy: 50 + 20*galaxies (Gal 1 at 50 D8, Gal 2 at 70 D8, Gal 3 at 90 D8)
// Shift power: 2.0
// Sacrifice power: 0.08
testToSingularity('Config 2: GalReq = 50 + 20*g, shiftPower = 2.0, sacPower = 0.08', {
  shiftFormula: 'linear_20',
  galaxyBase: 50,
  galaxyStep: 20,
  shiftPowerBase: 2.0,
  sacrificePower: 0.08
}, 5)

// Test Configuration 3:
// What if we keep current sacrifice formula (log10/4)^2.5,
// but GalReq = 40 + 20*g, and shiftPower = 2.0?
testToSingularity('Config 3: Current Sacrifice, GalReq = 40 + 20*g, shiftPower = 2.0', {
  shiftFormula: 'linear_20',
  galaxyBase: 40,
  galaxyStep: 20,
  shiftPowerBase: 2.0,
  sacrificePower: null // keep current
}, 5)
