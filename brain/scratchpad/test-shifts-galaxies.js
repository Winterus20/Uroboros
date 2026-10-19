import { Simulation, D_INFINITY } from '../harness/out/simulate-economy.mjs'
import Decimal from 'break_eternity.js'

function formatDec(d) {
  if (!(d instanceof Decimal)) d = new Decimal(d)
  if (d.lt(1000)) return d.toFixed(1)
  if (d.lt(1e6)) return d.toFixed(0)
  return d.toExponential(3).replace('+', '')
}

function runSim(name, options, maxHours = 5) {
  console.log(`\n========================================================================================`)
  console.log(`TEST: ${name}`)
  console.log(`Options:`, JSON.stringify(options))
  console.log(`========================================================================================`)

  const sim = new Simulation(options)
  const maxSeconds = maxHours * 3600
  const dt = 0.1 // 10 TPS for faster execution
  let lastLogTime = -9999
  let lastMatterExp = 0

  let reachedSingularity = false
  let singularityTime = null

  console.log(`Time(s) | Time(h:m:s) | Dopamine | Shifts | Gal | Hz | D1 | D8 (Amnt/Bght) | D8 Cost | Shift Req | Gal Req | Note`)
  console.log(`-------------------------------------------------------------------------------------------------------------------------`)

  function logRow(note = '') {
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
      `${String(sim.simTime.toFixed(1)).padStart(7)} | ${timeStr} | ${formatDec(sim.matter).padStart(9)} | ` +
      `${String(sim.dimensionShifts).padStart(6)} | ${String(sim.galaxies).padStart(3)} | ${String(sim.tickspeedBought).padStart(4)} | ` +
      `${formatDec(sim.dimensions[0].amount).padStart(6)} | ${d8Str.padStart(14)} | ` +
      `${formatDec(d8Cost).padStart(9)} | ${shiftReqStr.padStart(10)} | ${galReqStr.padStart(7)} | ${note}`
    )
  }

  logRow('(START)')

  let lastProgressCheck = 0
  let lastProgressMatter = sim.matter
  let stallDuration = 0

  while (sim.simTime < maxSeconds) {
    sim.manualClick(2) // 2 clicks per 0.1s tick = 20 clicks/s
    sim.maxAll()
    sim.checkUpgrades()
    sim.checkAutobuyersUnlock()

    if (sim.canSacrifice && sim.currentSacrificeReward.gte(sim.sacrificeMultiplier.times(1.5))) {
      sim.sacrifice()
    }

    if (sim.canShift) {
      const prevShifts = sim.dimensionShifts
      const d8Owned = sim.dimensions[7].amount
      sim.dimensionShift()
      logRow(`SHIFT ${prevShifts} -> ${sim.dimensionShifts} (had ${formatDec(d8Owned)} D8)`)
    }

    if (sim.canBuyGalaxy) {
      const prevGal = sim.galaxies
      const d8Owned = sim.dimensions[7].amount
      sim.buyGalaxy()
      logRow(`GALAXY ${prevGal} -> ${sim.galaxies} (used ${formatDec(d8Owned)} D8)`)
    }

    // Check NaN
    if (sim.matter.isNan() || Number.isNaN(sim.matter.mag)) {
      console.error(`ERROR: NaN detected at ${sim.simTime}s!`)
      logRow('(CRASH: NaN)')
      break
    }

    sim.tick(dt)

    if (!reachedSingularity && sim.matter.gte(D_INFINITY)) {
      reachedSingularity = true
      singularityTime = sim.simTime
      logRow(`🎉 [SINGULARITY REACHED! 1.79e308] 🎉`)
      break
    }

    const currentExp = sim.matter.gt(1) ? sim.matter.log10().toNumber() : 0
    if (currentExp - lastMatterExp >= 25 || sim.simTime - lastLogTime >= 900) {
      logRow()
      lastLogTime = sim.simTime
      lastMatterExp = currentExp
    }

    if (sim.simTime - lastProgressCheck >= 300) {
      if (sim.matter.lt(lastProgressMatter.times(1.05))) {
        stallDuration += 300
        if (stallDuration >= 1800) { // 30 min stall
          logRow(`⚠️ [STALL: No growth in 30 min]`)
          break
        }
      } else {
        stallDuration = 0
      }
      lastProgressCheck = sim.simTime
      lastProgressMatter = sim.matter
    }
  }

  logRow('(END)')

  console.log(`\nResults for ${name}:`)
  console.log(`- Time: ${(sim.simTime / 3600).toFixed(2)}h (${sim.simTime.toFixed(1)}s)`)
  console.log(`- Dopamine: ${formatDec(sim.matter)}`)
  console.log(`- Singularity: ${reachedSingularity ? `YES at ${(singularityTime / 3600).toFixed(2)}h (${singularityTime.toFixed(1)}s)` : 'NO'}`)
  console.log(`- Shifts: ${sim.dimensionShifts}, Galaxies: ${sim.galaxies}`)
  console.log(`- D8: owned=${formatDec(sim.dimensions[7].amount)}, bought=${sim.dimensions[7].bought}, cost=${formatDec(sim.getDimensionCost(8))}`)
  console.log(`- Next Shift Req: T${sim.shiftRequirement.tier}:${formatDec(sim.shiftRequirement.amount)}`)
  console.log(`- Next Galaxy Req: D8:${sim.galaxyRequirement}`)

  return {
    simTime: sim.simTime,
    reachedSingularity,
    singularityTime,
    matter: sim.matter,
    shifts: sim.dimensionShifts,
    galaxies: sim.galaxies,
    d8Amount: sim.dimensions[7].amount,
    d8Bought: sim.dimensions[7].bought,
    d8Cost: sim.getDimensionCost(8)
  }
}

// 1. Current code
runSim('1. Current Code (25 * 100^(shifts-4))', {
  shiftFormula: 'current',
  galaxyFormula: 'current',
  shiftPowerBase: 1.07
}, 4)

// 2. Linear shift: 20 + 15*(shifts-4) with shiftPower=1.07
runSim('2. Linear Shift: 20 + 15*(shifts-4), shiftPower=1.07', {
  shiftFormula: 'linear_20',
  galaxyFormula: 'current',
  shiftPowerBase: 1.07
}, 4)

// 3. Linear shift: 25 + 15*(shifts-4) with shiftPower=1.07
runSim('3. Linear Shift: 25 + 15*(shifts-4), shiftPower=1.07', {
  shiftFormula: 'linear_25',
  galaxyFormula: 'current',
  shiftPowerBase: 1.07
}, 4)

// 4. Linear shift: 20 + 15*(shifts-4) with Galaxy 80+60*g
runSim('4. Linear Shift: 20 + 15*(shifts-4), Galaxy 80+60*g', {
  shiftFormula: 'linear_20',
  galaxyFormula: 'ad_80_60',
  shiftPowerBase: 1.07
}, 4)

// 5. Linear shift + Standard AD shiftPower=2.0
runSim('5. Linear Shift: 20 + 15*(shifts-4), shiftPower=2.0 (AD standard)', {
  shiftFormula: 'linear_20',
  galaxyFormula: 'current',
  shiftPowerBase: 2.0
}, 4)
