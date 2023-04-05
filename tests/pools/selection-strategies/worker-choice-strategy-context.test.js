const { expect } = require('expect')
const sinon = require('sinon')
const {
  FixedThreadPool,
  DynamicThreadPool,
  WorkerChoiceStrategies
} = require('../../../lib/index')
const {
  WorkerChoiceStrategyContext
} = require('../../../lib/pools/selection-strategies/worker-choice-strategy-context')
const {
  RoundRobinWorkerChoiceStrategy
} = require('../../../lib/pools/selection-strategies/round-robin-worker-choice-strategy')
const {
  LessUsedWorkerChoiceStrategy
} = require('../../../lib/pools/selection-strategies/less-used-worker-choice-strategy')
const {
  LessBusyWorkerChoiceStrategy
} = require('../../../lib/pools/selection-strategies/less-busy-worker-choice-strategy')
const {
  FairShareWorkerChoiceStrategy
} = require('../../../lib/pools/selection-strategies/fair-share-worker-choice-strategy')
const {
  WeightedRoundRobinWorkerChoiceStrategy
} = require('../../../lib/pools/selection-strategies/weighted-round-robin-worker-choice-strategy')

describe('Worker choice strategy context test suite', () => {
  const min = 1
  const max = 3
  let fixedPool, dynamicPool

  before(() => {
    fixedPool = new FixedThreadPool(
      max,
      './tests/worker-files/thread/testWorker.js'
    )
    dynamicPool = new DynamicThreadPool(
      min,
      max,
      './tests/worker-files/thread/testWorker.js'
    )
  })

  afterEach(() => {
    sinon.restore()
  })

  after(async () => {
    await fixedPool.destroy()
    await dynamicPool.destroy()
  })

  it('Verify that execute() return the worker chosen by the strategy with fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const WorkerChoiceStrategyStub = sinon.createStubInstance(
      RoundRobinWorkerChoiceStrategy,
      {
        choose: sinon.stub().returns(0)
      }
    )
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    workerChoiceStrategyContext.workerChoiceStrategies.set(
      workerChoiceStrategyContext.workerChoiceStrategyType,
      WorkerChoiceStrategyStub
    )
    const chosenWorkerKey = workerChoiceStrategyContext.execute()
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        workerChoiceStrategyContext.workerChoiceStrategyType
      ).choose.calledOnce
    ).toBe(true)
    expect(chosenWorkerKey).toBe(0)
  })

  it('Verify that execute() return the worker chosen by the strategy with dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    const WorkerChoiceStrategyStub = sinon.createStubInstance(
      RoundRobinWorkerChoiceStrategy,
      {
        choose: sinon.stub().returns(0)
      }
    )
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    workerChoiceStrategyContext.workerChoiceStrategies.set(
      workerChoiceStrategyContext.workerChoiceStrategyType,
      WorkerChoiceStrategyStub
    )
    const chosenWorkerKey = workerChoiceStrategyContext.execute()
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        workerChoiceStrategyContext.workerChoiceStrategyType
      ).choose.calledOnce
    ).toBe(true)
    expect(chosenWorkerKey).toBe(0)
  })

  it('Verify that setWorkerChoiceStrategy() works with ROUND_ROBIN and fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.ROUND_ROBIN
      )
    ).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.ROUND_ROBIN
      )
    ).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with ROUND_ROBIN and dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.ROUND_ROBIN
      )
    ).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      dynamicPool,
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.ROUND_ROBIN
      )
    ).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.ROUND_ROBIN
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with LESS_USED and fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.LESS_USED
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.LESS_USED
      )
    ).toBeInstanceOf(LessUsedWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.LESS_USED
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with LESS_USED and dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      dynamicPool,
      WorkerChoiceStrategies.LESS_USED
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.LESS_USED
      )
    ).toBeInstanceOf(LessUsedWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.LESS_USED
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with LESS_BUSY and fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.LESS_BUSY
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.LESS_BUSY
      )
    ).toBeInstanceOf(LessBusyWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.LESS_BUSY
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with LESS_BUSY and dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      dynamicPool,
      WorkerChoiceStrategies.LESS_BUSY
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.LESS_BUSY
      )
    ).toBeInstanceOf(LessBusyWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.LESS_BUSY
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with FAIR_SHARE and fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.FAIR_SHARE
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.FAIR_SHARE
      )
    ).toBeInstanceOf(FairShareWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.FAIR_SHARE
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with FAIR_SHARE and dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      dynamicPool,
      WorkerChoiceStrategies.FAIR_SHARE
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.FAIR_SHARE
      )
    ).toBeInstanceOf(FairShareWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.FAIR_SHARE
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with WEIGHTED_ROUND_ROBIN and fixed pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
      )
    ).toBeInstanceOf(WeightedRoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
    )
  })

  it('Verify that setWorkerChoiceStrategy() works with WEIGHTED_ROUND_ROBIN and dynamic pool', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      dynamicPool
    )
    workerChoiceStrategyContext.setWorkerChoiceStrategy(
      dynamicPool,
      WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
    )
    expect(
      workerChoiceStrategyContext.workerChoiceStrategies.get(
        WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
      )
    ).toBeInstanceOf(WeightedRoundRobinWorkerChoiceStrategy)
    expect(workerChoiceStrategyContext.workerChoiceStrategyType).toBe(
      WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
    )
  })

  it('Verify that getWorkerChoiceStrategy() default return ROUND_ROBIN strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy =
      workerChoiceStrategyContext.getWorkerChoiceStrategy(fixedPool)
    expect(strategy).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() can return ROUND_ROBIN strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy = workerChoiceStrategyContext.getWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.ROUND_ROBIN
    )
    expect(strategy).toBeInstanceOf(RoundRobinWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() can return LESS_USED strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy = workerChoiceStrategyContext.getWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.LESS_USED
    )
    expect(strategy).toBeInstanceOf(LessUsedWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() can return LESS_BUSY strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy = workerChoiceStrategyContext.getWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.LESS_BUSY
    )
    expect(strategy).toBeInstanceOf(LessBusyWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() can return FAIR_SHARE strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy = workerChoiceStrategyContext.getWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.FAIR_SHARE
    )
    expect(strategy).toBeInstanceOf(FairShareWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() can return WEIGHTED_ROUND_ROBIN strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    const strategy = workerChoiceStrategyContext.getWorkerChoiceStrategy(
      fixedPool,
      WorkerChoiceStrategies.WEIGHTED_ROUND_ROBIN
    )
    expect(strategy).toBeInstanceOf(WeightedRoundRobinWorkerChoiceStrategy)
  })

  it('Verify that getWorkerChoiceStrategy() throw error on unknown strategy', () => {
    const workerChoiceStrategyContext = new WorkerChoiceStrategyContext(
      fixedPool
    )
    expect(() => {
      workerChoiceStrategyContext.getWorkerChoiceStrategy(
        fixedPool,
        'UNKNOWN_STRATEGY'
      )
    }).toThrowError(
      new Error("Worker choice strategy 'UNKNOWN_STRATEGY' not found")
    )
  })
})
