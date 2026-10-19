import { Simulation } from '../harness/out/simulate-economy.mjs'
import Decimal from 'break_eternity.js'

function formatDec(d) {
  if (!(d instanceof Decimal)) d = new Decimal(d)
  if (d.lt(1000)) return d.toFixed(1)
  if (d.lt(1e6)) return d.toFixed(0)
  return d.toExponential(3).replace('+', '')
}

function runExperiment(name, options, maxSimHours = 10) {
  console.log(`\n=======================================================`)
  console.log(`RUNNING EXPERIMENT: ${name}`)
  console.log(`Options:`, JSON.stringify(options))
  console.log(`=======================================================`)

  const sim = new Simulation(options)
  const maxSimSeconds = maxSimHours * 3600
  const dt = 0.05 // 20 TPS
  let lastLogTime = -9999
  let lastMatterExp = 0

  let reachedSingularity = false
  let singularityTime = null

  console.log(`Time(s) | Time(h:m:s) | Dopamine | Shifts | Gal | Hz | D1 | D4 | D7 | D8 (Amnt/Bght) | D8 Cost | Shift Req | Gal Req`)
  console.log(`-------------------------------------------------------------------------------------------------------------------------`)

  function logRow(label = '') {
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
      `${formatDec(sim.dimensions[0].amount).padStart(6)} | ${formatDec(sim.dimensions[3].amount).padStart(6)} | ` +
      `${formatDec(sim.dimensions[6].amount).padStart(6)} | ${d8Str.padStart(16)} | ` +
      `${formatDec(d8Cost).padStart(9)} | ${shiftReqStr.padStart(11)} | ${galReqStr.padStart(8)} ${label}`
    )
  }

  // Initial log
  logRow('(START)')

  let lastProgressCheckTime = 0
  let lastProgressMatter = sim.matter
  let stalledCount = 0

  while (sim.simTime < maxSimSeconds) {
    // Active player actions
    // 1. Manual clicks (5 clicks/sec)
    sim.manualClick(1)

    // 2. Max all
    sim.maxAll()

    // 3. Upgrades and autobuyers
    sim.checkUpgrades()
    sim.checkAutobuyersUnlock()

    // 4. Sacrifice if beneficial
    if (sim.canSacrifice && sim.currentSacrificeReward.gte(sim.sacrificeMultiplier.times(1.5))) {
      const oldMult = sim.sacrificeMultiplier
      sim.sacrifice()
      // console.log(`[Sacrifice at ${sim.simTime.toFixed(1)}s: ${formatDec(oldMult)} -> ${formatDec(sim.sacrificeMultiplier)}]`)
    }

    // 5. Shift if canShift
    if (sim.canShift) {
      const prevShifts = sim.dimensionShifts
      const prevD8 = sim.dimensions[7].amount
      sim.dimensionShift()
      logRow(`[SHIFT ${prevShifts} -> ${sim.dimensionShifts}] (had D8: ${formatDec(prevD8)})`)
    }

    // 6. Galaxy if canBuyGalaxy
    if (sim.canBuyGalaxy) {
      const prevGal = sim.galaxies
      const prevShifts = sim.dimensionShifts
      sim.buyGalaxy()
      logRow(`[GALAXY ${prevGal} -> ${sim.galaxies}] (shifts reset to 0)`)
    }

    // Check NaN or crash
    if (sim.matter.isNan() || Number.isNaN(sim.matter.mag)) {
      console.error(`FATAL: NaN detected at simTime=${sim.simTime}s!`)
      logRow('(CRASH: NaN)')
      break
    }

    // Advance tick
    sim.tick(dt)

    // Check Singularity
    if (!reachedSingularity && sim.matter.gte(new Decimal('1.7976931348623157e308'))) {
      reachedSingularity = true
      singularityTime = sim.simTime
      logRow(`🎉 [SINGULARITY REACHED! 1.79e308] 🎉`)
      break
    }

    // Periodic telemetry log (e.g. every 10 orders of magnitude or every 300s of stall)
    const currentExp = sim.matter.gt(1) ? sim.matter.log10().toNumber() : 0
    if (currentExp - lastMatterExp >= 20 || sim.simTime - lastLogTime >= 600) {
      logRow()
      lastLogTime = sim.simTime
      lastMatterExp = currentExp
    }

    // Check stall: if matter hasn't increased by at least 1.1x in 600 simulated seconds (10 min)
    if (sim.simTime - lastProgressCheckTime >= 600) {
      if (sim.matter.lt(lastProgressMatter.times(1.1))) {
        stalledCount++
        if (stalledCount >= 3) { // 30 minutes of no progress
          logRow(`⚠️ [STALL DETECTED: 30 minutes with no noticeable growth]`)
          break
        }
      } else {
        stalledCount = 0
      }
      lastProgressCheckTime = sim.simTime
      lastProgressMatter = sim.matter
    }
  }

  logRow('(END OF RUN)')

  console.log(`\n--- SUMMARY FOR: ${name} ---`)
  console.log(`Final Sim Time: ${(sim.simTime / 3600).toFixed(2)} hours (${sim.simTime.toFixed(1)}s)`)
  console.log(`Final Dopamine: ${formatDec(sim.matter)}`)
  console.log(`Singularity Reached: ${reachedSingularity ? `YES at ${(singularityTime / 3600).toFixed(2)}h (${singularityTime.toFixed(1)}s)` : 'NO'}`)
  console.log(`Shifts: ${sim.dimensionShifts}, Galaxies: ${sim.galaxies}, Hz: ${sim.tickspeedBought}`)
  console.log(`D8 Amount: ${formatDec(sim.dimensions[7].amount)}, Bought: ${sim.dimensions[7].bought}, Cost: ${formatDec(sim.getDimensionCost(8))}`)
  console.log(`Next Shift Req: T${sim.shiftRequirement.tier} : ${formatDec(sim.shiftRequirement.amount)}`)
  console.log(`Next Galaxy Req: D8 : ${sim.galaxyRequirement}`)
  console.log(`Sacrifice Multiplier: ${formatDec(sim.sacrificeMultiplier)} (count: ${sim.sacrificeCount})`)
  console.log(`Algorithm Upgrades:`, Array.from(sim.algorithmUpgrades))

  return {
    simTime: sim.simTime,
    reachedSingularity,
    singularityTime,
    matter: sim.matter,
    shifts: sim.dimensionShifts,
    galaxies: sim.galaxies,
    d8Bought: sim.dimensions[7].bought,
    d8Amount: sim.dimensions[7].amount
  }
}

// 1. Current code simulation
console.log('--- TEST 1: CURRENT CODE (25 * 100^(shifts - 4)) ---')
const res1 = runExperiment('Current Code (Exponential Shift 5+)', {
  shiftFormula: 'current',
  galaxyFormula: 'current'
}, 4) // max 4 hours

// 2. Experiment with linear shift: 20 + 15 * (shifts - 4)
console.log('\n--- TEST 2: LINEAR SHIFT 20 + 15*(shifts-4) ---')
const res2 = runExperiment('Linear Shift: 20 + 15*(shifts-4)', {
  shiftFormula: 'linear_20',
  galaxyFormula: 'current'
}, 6)

// 3. Experiment with linear shift: 25 + 15 * (shifts - 4)
console.log('\n--- TEST 3: LINEAR SHIFT 25 + 15*(shifts-4) ---')
const res3 = runExperiment('Linear Shift: 25 + 15*(shifts-4)', {
  shiftFormula: 'linear_25',
  galaxyFormula: 'current'
}, 6)
