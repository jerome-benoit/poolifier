import type {
  LifecycleWorker,
  ReconcileClassification,
  ReconcileResult,
  WorkerHandle,
  WorkerLease,
  WorkerLifecycleSlot,
  WorkerReconcileInput,
  WorkerState,
} from './lifecycle-types.js'

export const synchronousPhaseSignal = new AbortController().signal

type WorkerReconcileTransition = Readonly<{
  classification: ReconcileClassification
  previousState: WorkerState
}>

export const compareWorkerHandles = <Worker>(
  left: WorkerHandle<Worker>,
  right: WorkerHandle<Worker>
): number =>
    left.lease.id - right.lease.id ||
  left.lease.generation - right.lease.generation

export const createWorkerReconcileInput = <Worker extends LifecycleWorker>(
  slot: WorkerLifecycleSlot<Worker>,
  transition: WorkerReconcileTransition,
  ownedTaskIds: WorkerReconcileInput<Worker>['ownedTaskIds']
): WorkerReconcileInput<Worker> => {
  const exit = slot.exit == null ? undefined : Object.freeze({ ...slot.exit })
  return Object.freeze({
    cause: slot.cause,
    classification: transition.classification,
    ...(exit != null && { exit }),
    handle: slot.handle,
    ownedTaskIds,
    previousState: transition.previousState,
  })
}

export const missingReconcileResult = (
  lease: WorkerLease
): ReconcileResult => ({ cause: undefined, committed: false, lease })

export const workerHasActiveWork = (
  worker: LifecycleWorker & {
    readonly usage?: { readonly tasks?: { readonly executing?: number } }
  }
): boolean => (worker.usage?.tasks?.executing ?? 0) > 0
