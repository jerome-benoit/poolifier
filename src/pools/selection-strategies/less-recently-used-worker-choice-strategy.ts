import type { IPoolWorker } from '../pool-worker'
import { AbstractWorkerChoiceStrategy } from './abstract-worker-choice-strategy'

/**
 * Selects the less recently used worker.
 *
 * @typeParam Worker - Type of worker which manages the strategy.
 * @typeParam Data - Type of data sent to the worker. This can only be serializable data.
 * @typeParam Response - Type of response of execution. This can only be serializable data.
 */
export class LessRecentlyUsedWorkerChoiceStrategy<
  Worker extends IPoolWorker,
  Data,
  Response
> extends AbstractWorkerChoiceStrategy<Worker, Data, Response> {
  /** {@inheritDoc} */
  public reset (): boolean {
    return true
  }

  /** {@inheritDoc} */
  public choose (): Worker {
    let minNumberOfRunningTasks = Infinity
    // A worker is always found because it picks the one with fewer tasks
    let lessRecentlyUsedWorker!: Worker
    for (const worker of this.pool.workers) {
      const workerRunningTasks = this.pool.getWorkerRunningTasks(
        worker
      ) as number
      if (!this.isDynamicPool && workerRunningTasks === 0) {
        return worker
      } else if (workerRunningTasks < minNumberOfRunningTasks) {
        lessRecentlyUsedWorker = worker
        minNumberOfRunningTasks = workerRunningTasks
      }
    }
    return lessRecentlyUsedWorker
  }
}
