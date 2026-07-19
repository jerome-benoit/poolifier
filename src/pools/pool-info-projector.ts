import type { PoolStatisticsProjection } from './pool-statistics-projection.js'
import type { PoolInfo, PoolType } from './pool.js'
import type { WorkerChoiceStrategy } from './selection-strategies/selection-strategies-types.js'
import type { WorkerType } from './worker.js'

import { round } from '../utils.js'
import { PoolTypes } from './pool.js'

export interface PoolInfoProjectionInput {
  readonly backPressure: boolean
  readonly defaultStrategy: WorkerChoiceStrategy
  readonly enableTasksQueue: boolean
  readonly maxSize: number
  readonly minSize: number
  readonly queuedTasks: number
  readonly ready: boolean
  readonly started: boolean
  readonly statistics: PoolStatisticsProjection
  readonly strategyRetries: number
  readonly type: PoolType
  readonly utilization: number
  readonly version: string
  readonly worker: WorkerType
  readonly workers: readonly PoolInfoWorkerSnapshot[]
}

export interface PoolInfoWorkerSnapshot {
  readonly backPressured: boolean
  readonly busy: boolean
  readonly dynamic: boolean
  readonly idle: boolean
  readonly maxQueued: number
  readonly stealing: boolean
  readonly tasks: Readonly<{
    executed: number
    executing: number
    failed: number
    stolen: number
  }>
}

export const projectPoolInfo = (input: PoolInfoProjectionInput): PoolInfo => {
  const count = (
    predicate: (worker: PoolInfoWorkerSnapshot) => boolean
  ): number =>
    input.workers.reduce(
      (total, worker) => (predicate(worker) ? total + 1 : total),
      0
    )
  const sum = (select: (worker: PoolInfoWorkerSnapshot) => number): number =>
    input.workers.reduce((total, worker) => total + select(worker), 0)

  return {
    defaultStrategy: input.defaultStrategy,
    maxSize: input.maxSize,
    minSize: input.minSize,
    ready: input.ready,
    started: input.started,
    strategyRetries: input.strategyRetries,
    type: input.type,
    version: input.version,
    worker: input.worker,
    ...(input.statistics.runTime != null &&
      input.statistics.waitTime != null && {
      utilization: round(input.utilization),
    }),
    busyWorkerNodes: count(worker => worker.busy),
    executedTasks: sum(worker => worker.tasks.executed),
    executingTasks: sum(worker => worker.tasks.executing),
    failedTasks: sum(worker => worker.tasks.failed),
    idleWorkerNodes: count(worker => worker.idle),
    workerNodes: input.workers.length,
    ...(input.type === PoolTypes.dynamic && {
      dynamicWorkerNodes: count(worker => worker.dynamic),
    }),
    ...(input.enableTasksQueue && {
      backPressure: input.backPressure,
      backPressureWorkerNodes: count(worker => worker.backPressured),
      maxQueuedTasks: sum(worker => worker.maxQueued),
      queuedTasks: input.queuedTasks,
      stealingWorkerNodes: count(worker => worker.stealing),
      stolenTasks: sum(worker => worker.tasks.stolen),
    }),
    ...input.statistics,
  }
}
