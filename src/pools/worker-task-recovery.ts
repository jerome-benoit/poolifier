import type { TaskUUID } from '../utility-types.js'
import type {
  LifecycleWorker,
  ReconciliationReservation,
  WorkerReconciliationInput,
  WorkerReconciliationPreparation,
} from './lifecycle-types.js'
import type { ScheduleResult } from './task-scheduler-types.js'

export interface WorkerTaskRecoveryHooks<Worker> {
  readonly apply: (result: ScheduleResult<Worker>) => void
  readonly error: (
    taskId: TaskUUID,
    previousState?: ReconciliationReservation['previousState']
  ) => unknown
  readonly finalize: () => void
  readonly prepare: (signal: AbortSignal) => Promise<void>
  readonly reject: (
    reservation: ReconciliationReservation,
    error: unknown
  ) => boolean
  readonly restore: (
    reservations: readonly ReconciliationReservation[],
    error: (taskId: TaskUUID) => unknown
  ) => readonly ScheduleResult<Worker>[]
}

const isRecoverable = (
  classification: WorkerReconciliationInput<LifecycleWorker>['classification'],
  state: ReconciliationReservation['previousState']
): boolean =>
  classification === 'exited' ||
  state === 'registered' ||
  state === 'waitingReady' ||
  state === 'queued' ||
  state === 'detached'

export class WorkerTaskRecovery<Worker>
implements WorkerReconciliationPreparation {
  public readonly prepareTimeoutMs?: number
  readonly #pending = new Map<TaskUUID, ReconciliationReservation>()

  public constructor (
    private readonly transition: WorkerReconciliationInput<LifecycleWorker>,
    reservations: readonly ReconciliationReservation[],
    private readonly hooks: WorkerTaskRecoveryHooks<Worker>,
    prepareTimeoutMs?: number
  ) {
    this.prepareTimeoutMs = prepareTimeoutMs
    for (const reservation of reservations) {
      this.#pending.set(reservation.taskId, reservation)
    }
  }

  public finalizeResidual (signal: AbortSignal): void {
    const failures: unknown[] = []
    for (const reservation of [...this.#pending.values()]) {
      try {
        signal.throwIfAborted()
        this.hooks.reject(
          reservation,
          this.hooks.error(reservation.taskId, reservation.previousState)
        )
        this.#pending.delete(reservation.taskId)
      } catch (error) {
        // no-excuse-ok: catch -- every reservation must be attempted
        failures.push(error)
      }
    }
    try {
      this.hooks.finalize()
    } catch (error) {
      // no-excuse-ok: catch -- settlement failures must remain observable
      failures.push(error)
    }
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'Residual worker tasks could not be settled'
      )
    }
  }

  public async prepare (signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted()
    await this.hooks.prepare(signal)
    signal.throwIfAborted()
    let firstError: unknown
    for (const reservation of [...this.#pending.values()]) {
      if (
        isRecoverable(this.transition.classification, reservation.previousState)
      ) {
        continue
      }
      const error = this.hooks.error(
        reservation.taskId,
        reservation.previousState
      )
      if (this.hooks.reject(reservation, error)) firstError ??= error
      this.#pending.delete(reservation.taskId)
    }
    return firstError
  }

  public restore (signal: AbortSignal): Promise<void> {
    signal.throwIfAborted()
    const recoverable = [...this.#pending.values()]
    if (recoverable.length === 0) return Promise.resolve()
    const results = this.hooks.restore(recoverable, this.hooks.error)
    for (let index = 0; index < recoverable.length; index++) {
      signal.throwIfAborted()
      const reservation = recoverable[index]
      const result = results[index]
      this.#pending.delete(reservation.taskId)
      this.hooks.apply(result)
    }
    return Promise.resolve()
  }
}
