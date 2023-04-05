import type { IPoolInternal } from '../pool-internal'
import { PoolType } from '../pool-internal'
import type { IPoolWorker } from '../pool-worker'
import type {
  IWorkerChoiceStrategy,
  RequiredStatistics
} from './selection-strategies-types'

/**
 * Worker choice strategy abstract base class.
 *
 * @typeParam Worker - Type of worker which manages the strategy.
 * @typeParam Data - Type of data sent to the worker. This can only be serializable data.
 * @typeParam Response - Type of response of execution. This can only be serializable data.
 */
export abstract class AbstractWorkerChoiceStrategy<
  Worker extends IPoolWorker,
  Data = unknown,
  Response = unknown
> implements IWorkerChoiceStrategy<Worker, Data, Response> {
  /** {@inheritDoc} */
  public readonly isDynamicPool: boolean
  /** {@inheritDoc} */
  public requiredStatistics: RequiredStatistics = {
    runTime: false,
    avgRunTime: false
  }

  /**
   * Constructs a worker choice strategy bound to the pool.
   *
   * @param pool - The pool instance.
   */
  public constructor (
    public readonly pool: IPoolInternal<Worker, Data, Response>
  ) {
    this.isDynamicPool = this.pool.type === PoolType.DYNAMIC
    this.choose.bind(this)
  }

  /** {@inheritDoc} */
  public abstract reset (): boolean

  /** {@inheritDoc} */
  public abstract choose (): number

  /** {@inheritDoc} */
  public abstract remove (workerKey: number): boolean
}
