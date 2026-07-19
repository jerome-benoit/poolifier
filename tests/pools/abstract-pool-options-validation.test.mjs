import { describe, expect, FixedThreadPool, it, numberOfWorkers } from './abstract-pool-test-support.mjs'

describe('Abstract pool test suite', () => {
  it('Verify that pool options are validated', () => {
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            workerChoiceStrategy: 'invalidStrategy',
          }
        )
    ).toThrow(new Error("Invalid worker choice strategy 'invalidStrategy'"))
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            workerChoiceStrategyOptions: { weights: {} },
          }
        )
    ).toThrow(
      new Error(
        'Invalid worker choice strategy options: must have a weight for each worker node'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            workerChoiceStrategyOptions: { measurement: 'invalidMeasurement' },
          }
        )
    ).toThrow(
      new Error(
        "Invalid worker choice strategy options: invalid measurement 'invalidMeasurement'"
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: 'invalidTasksQueueOptions',
          }
        )
    ).toThrow(
      new TypeError('Invalid tasks queue options: must be a plain object')
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { concurrency: 0 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks concurrency: 0 is a negative integer or zero'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { concurrency: -1 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks concurrency: -1 is a negative integer or zero'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { concurrency: 0.2 },
          }
        )
    ).toThrow(
      new TypeError('Invalid worker node tasks concurrency: must be an integer')
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { size: 0 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks queue size: 0 is a negative integer or zero'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { size: -1 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks queue size: -1 is a negative integer or zero'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { size: 0.2 },
          }
        )
    ).toThrow(
      new TypeError('Invalid worker node tasks queue size: must be an integer')
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { tasksStealingRatio: '' },
          }
        )
    ).toThrow(
      new TypeError(
        'Invalid worker node tasks stealing ratio: must be a number'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { tasksStealingRatio: 1.1 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks stealing ratio: must be between 0 and 1'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { agingFactor: '' },
          }
        )
    ).toThrow(
      new TypeError(
        'Invalid worker node tasks queue aging factor: must be a number'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { agingFactor: -1 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks queue aging factor: must be greater than or equal to 0'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { loadExponent: '' },
          }
        )
    ).toThrow(
      new TypeError(
        'Invalid worker node tasks queue load exponent: must be a number'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { loadExponent: 0 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks queue load exponent: must be greater than 0'
      )
    )
    expect(
      () =>
        new FixedThreadPool(
          numberOfWorkers,
          './tests/worker-files/thread/testWorker.mjs',
          {
            enableTasksQueue: true,
            tasksQueueOptions: { loadExponent: -1 },
          }
        )
    ).toThrow(
      new RangeError(
        'Invalid worker node tasks queue load exponent: must be greater than 0'
      )
    )
  })
})
