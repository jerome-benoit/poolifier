import cluster, { Worker as ClusterWorker } from 'node:cluster'
import { Worker as ThreadWorker } from 'node:worker_threads'

import { expect } from 'expect'

import { CircularBuffer } from '../../lib/circular-buffer.cjs'
import { WorkerTypes } from '../../lib/index.cjs'
import {
  createWorker,
  DEFAULT_MEASUREMENT_STATISTICS_REQUIREMENTS,
  getDefaultTasksQueueOptions,
  getWorkerId,
  getWorkerType,
  updateMeasurementStatistics
} from '../../lib/pools/utils.cjs'
import { MeasurementHistorySize } from '../../lib/pools/worker.cjs'

describe('Pool utils test suite', () => {
  it('Verify DEFAULT_MEASUREMENT_STATISTICS_REQUIREMENTS values', () => {
    expect(DEFAULT_MEASUREMENT_STATISTICS_REQUIREMENTS).toStrictEqual({
      aggregate: false,
      average: false,
      median: false
    })
  })

  it('Verify getDefaultTasksQueueOptions() behavior', () => {
    const poolMaxSize = 4
    expect(getDefaultTasksQueueOptions(poolMaxSize)).toStrictEqual({
      concurrency: 1,
      size: Math.pow(poolMaxSize, 2),
      taskStealing: true,
      tasksStealingOnBackPressure: false,
      tasksFinishedTimeout: 2000
    })
  })

  it('Verify updateMeasurementStatistics() behavior', () => {
    // const circularBuffer = new CircularBuffer(MeasurementHistorySize)
    const measurementStatistics = {
      history: new CircularBuffer(MeasurementHistorySize)
    }
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: false, median: false },
      0.01
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.01,
      maximum: 0.01,
      minimum: 0.01
    })
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: false, median: false },
      0.02
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.03,
      maximum: 0.02,
      minimum: 0.01
    })
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: true, median: false },
      0.001
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.031,
      maximum: 0.02,
      minimum: 0.001,
      average: 0.0010000000474974513
    })
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: true, median: false },
      0.003
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.034,
      maximum: 0.02,
      minimum: 0.001,
      average: 0.0020000000367872417
    })
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: false, median: true },
      0.006
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.04,
      maximum: 0.02,
      minimum: 0.001,
      median: 0.003000000026077032
    })
    updateMeasurementStatistics(
      measurementStatistics,
      { aggregate: true, average: true, median: false },
      0.01
    )
    expect(measurementStatistics).toMatchObject({
      aggregate: 0.05,
      maximum: 0.02,
      minimum: 0.001,
      average: 0.004999999975552782
    })
  })

  it('Verify createWorker() behavior', () => {
    expect(
      createWorker(
        WorkerTypes.thread,
        './tests/worker-files/thread/testWorker.mjs',
        {}
      )
    ).toBeInstanceOf(ThreadWorker)
    expect(
      createWorker(
        WorkerTypes.cluster,
        './tests/worker-files/cluster/testWorker.mjs',
        {}
      )
    ).toBeInstanceOf(ClusterWorker)
  })

  it('Verify getWorkerType() behavior', () => {
    expect(
      getWorkerType(
        new ThreadWorker('./tests/worker-files/thread/testWorker.mjs')
      )
    ).toBe(WorkerTypes.thread)
    expect(getWorkerType(cluster.fork())).toBe(WorkerTypes.cluster)
  })

  it('Verify getWorkerId() behavior', () => {
    const threadWorker = new ThreadWorker(
      './tests/worker-files/thread/testWorker.mjs'
    )
    const clusterWorker = cluster.fork()
    expect(getWorkerId(threadWorker)).toBe(threadWorker.threadId)
    expect(getWorkerId(clusterWorker)).toBe(clusterWorker.id)
  })
})
