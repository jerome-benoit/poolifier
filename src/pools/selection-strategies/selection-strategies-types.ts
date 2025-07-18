/**
 * Enumeration of worker choice strategies.
 */
export const WorkerChoiceStrategies: Readonly<{
  FAIR_SHARE: 'FAIR_SHARE'
  INTERLEAVED_WEIGHTED_ROUND_ROBIN: 'INTERLEAVED_WEIGHTED_ROUND_ROBIN'
  LEAST_BUSY: 'LEAST_BUSY'
  LEAST_ELU: 'LEAST_ELU'
  LEAST_USED: 'LEAST_USED'
  ROUND_ROBIN: 'ROUND_ROBIN'
  WEIGHTED_ROUND_ROBIN: 'WEIGHTED_ROUND_ROBIN'
}> = Object.freeze({
  /**
   * Fair share worker selection strategy.
   */
  FAIR_SHARE: 'FAIR_SHARE',
  /**
   * Interleaved weighted round robin worker selection strategy.
   * @experimental
   */
  INTERLEAVED_WEIGHTED_ROUND_ROBIN: 'INTERLEAVED_WEIGHTED_ROUND_ROBIN',
  /**
   * Least busy worker selection strategy.
   */
  LEAST_BUSY: 'LEAST_BUSY',
  /**
   * Least ELU worker selection strategy.
   */
  LEAST_ELU: 'LEAST_ELU',
  /**
   * Least used worker selection strategy.
   */
  LEAST_USED: 'LEAST_USED',
  /**
   * Round robin worker selection strategy.
   */
  ROUND_ROBIN: 'ROUND_ROBIN',
  /**
   * Weighted round robin worker selection strategy.
   */
  WEIGHTED_ROUND_ROBIN: 'WEIGHTED_ROUND_ROBIN',
} as const)

/**
 * Worker choice strategy.
 */
export type WorkerChoiceStrategy = keyof typeof WorkerChoiceStrategies

/**
 * Enumeration of measurements.
 */
export const Measurements: Readonly<{
  elu: 'elu'
  runTime: 'runTime'
  waitTime: 'waitTime'
}> = Object.freeze({
  elu: 'elu',
  runTime: 'runTime',
  waitTime: 'waitTime',
} as const)

/**
 * Worker choice strategy interface.
 * @internal
 */
export interface IWorkerChoiceStrategy {
  /**
   * Chooses a worker node in the pool and returns its key.
   * If no worker nodes are not eligible, `undefined` is returned.
   * If `undefined` is returned, the caller retry.
   * @returns The worker node key or `undefined`.
   */
  readonly choose: () => number | undefined
  /**
   * The worker choice strategy name.
   */
  readonly name: WorkerChoiceStrategy
  /**
   * Removes the worker node key from strategy internals.
   * @param workerNodeKey - The worker node key.
   * @returns `true` if the worker node key is removed, `false` otherwise.
   */
  readonly remove: (workerNodeKey: number) => boolean
  /**
   * Resets strategy internals.
   * @returns `true` if the reset is successful, `false` otherwise.
   */
  readonly reset: () => boolean
  /**
   * Sets the worker choice strategy options.
   * @param opts - The worker choice strategy options.
   */
  readonly setOptions: (opts: undefined | WorkerChoiceStrategyOptions) => void
  /**
   * Strategy policy.
   */
  readonly strategyPolicy: StrategyPolicy
  /**
   * Tasks statistics requirements.
   */
  readonly taskStatisticsRequirements: TaskStatisticsRequirements
  /**
   * Updates the worker node key strategy internals.
   * This is called after a task has been executed on a worker node.
   * @returns `true` if the update is successful, `false` otherwise.
   */
  readonly update: (workerNodeKey: number) => boolean
}

/**
 * Measurement.
 */
export type Measurement = keyof typeof Measurements

/**
 * Measurement options.
 */
export interface MeasurementOptions {
  /**
   * Set measurement median.
   */
  readonly median: boolean
}

/**
 * Measurement statistics requirements.
 * @internal
 */
export interface MeasurementStatisticsRequirements {
  /**
   * Requires measurement aggregate.
   */
  aggregate: boolean
  /**
   * Requires measurement average.
   */
  average: boolean
  /**
   * Requires measurement median.
   */
  median: boolean
}

/**
 * Strategy policy.
 * @internal
 */
export interface StrategyPolicy {
  /**
   * Expects the newly created dynamic worker to be flagged as ready.
   */
  readonly dynamicWorkerReady: boolean
  /**
   * Expects tasks execution on the newly created dynamic worker.
   */
  readonly dynamicWorkerUsage: boolean
}

/**
 * Pool worker node worker usage statistics requirements.
 * @internal
 */
export interface TaskStatisticsRequirements {
  /**
   * Tasks event loop utilization requirements.
   */
  readonly elu: MeasurementStatisticsRequirements
  /**
   * Tasks runtime requirements.
   */
  readonly runTime: MeasurementStatisticsRequirements
  /**
   * Tasks wait time requirements.
   */
  readonly waitTime: MeasurementStatisticsRequirements
}

/**
 * Worker choice strategy options.
 */
export interface WorkerChoiceStrategyOptions {
  /**
   * Event loop utilization options.
   * @defaultValue \{ median: false \}
   */
  readonly elu?: MeasurementOptions
  /**
   * Measurement to use in worker choice strategy supporting it.
   */
  readonly measurement?: Measurement
  /**
   * Runtime options.
   * @defaultValue \{ median: false \}
   */
  readonly runTime?: MeasurementOptions
  /**
   * Wait time options.
   * @defaultValue \{ median: false \}
   */
  readonly waitTime?: MeasurementOptions
  /**
   * Worker weights to use for weighted round robin worker selection strategies.
   * A weight is tasks maximum execution time in milliseconds for a worker node.
   * @defaultValue Weights computed automatically given the CPU performance.
   */
  weights?: Record<number, number>
}
