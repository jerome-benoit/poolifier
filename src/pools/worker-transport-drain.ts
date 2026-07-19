import type { LifecycleWorker } from './lifecycle-types.js'

export interface WorkerTransportDrain {
  readonly waitForTransportDrain: () => Promise<void>
}

/**
 * Waits for the worker transport when that internal capability is available.
 * @param worker - Worker whose optional transport capability is inspected.
 */
export async function waitForWorkerTransportDrain (
  worker: LifecycleWorker
): Promise<void> {
  if (hasWorkerTransportDrain(worker)) {
    await worker.waitForTransportDrain()
  }
}

/**
 * Checks whether a worker exposes the internal transport drain capability.
 * @param worker - Worker to inspect.
 * @returns Whether the worker can wait for transport drain.
 */
function hasWorkerTransportDrain (
  worker: LifecycleWorker
): worker is LifecycleWorker & WorkerTransportDrain {
  return (
    'waitForTransportDrain' in worker &&
    typeof worker.waitForTransportDrain === 'function'
  )
}
