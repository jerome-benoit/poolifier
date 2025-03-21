import { bench, group, run } from 'tatami-ng'

/**
 *
 * @param numberOfWorkers
 * @returns
 */
function generateWorkersArray (numberOfWorkers) {
  return [...Array(numberOfWorkers).keys()]
}

const workers = generateWorkersArray(60)

let nextWorkerIndex

/**
 * @returns
 */
function roundRobinIncrementModulo () {
  const chosenWorker = workers[nextWorkerIndex]
  nextWorkerIndex++
  nextWorkerIndex %= workers.length
  return chosenWorker
}

/**
 * @returns
 */
function roundRobinTernaryOffByOne () {
  nextWorkerIndex =
    workers.length - 1 === nextWorkerIndex ? 0 : nextWorkerIndex + 1
  return workers[nextWorkerIndex]
}

/**
 * @returns
 */
function roundRobinTernaryWithNegation () {
  nextWorkerIndex =
    !nextWorkerIndex || workers.length - 1 === nextWorkerIndex
      ? 0
      : nextWorkerIndex + 1
  return workers[nextWorkerIndex]
}

/**
 * @returns
 */
function roundRobinTernaryWithPreChoosing () {
  const chosenWorker = workers[nextWorkerIndex]
  nextWorkerIndex =
    workers.length - 1 === nextWorkerIndex ? 0 : nextWorkerIndex + 1
  return chosenWorker
}

group('Round robin tasks distribution', () => {
  bench('Ternary off by one', () => {
    nextWorkerIndex = 0
    roundRobinTernaryOffByOne()
  })
  bench('Ternary with negation', () => {
    nextWorkerIndex = 0
    roundRobinTernaryWithNegation()
  })
  bench('Ternary with pre-choosing', () => {
    nextWorkerIndex = 0
    roundRobinTernaryWithPreChoosing()
  })
  bench('Increment+Modulo', () => {
    nextWorkerIndex = 0
    roundRobinIncrementModulo()
  })
})

await run({ units: true })
