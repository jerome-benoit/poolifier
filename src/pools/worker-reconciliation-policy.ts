import type { TaskUUID } from '../utility-types.js'
import type {
  LifecycleWorker,
  ReconciliationReservation,
  WorkerCompletionInput,
  WorkerLease,
  WorkerReconciliationInput,
  WorkerReplacementInput,
} from './lifecycle-types.js'
import type { ScheduleResult } from './task-scheduler-types.js'
import type { IWorker, IWorkerNode } from './worker.js'

import { WorkerCrashError, WorkerTerminationError } from './errors.js'
import { getWorkerCrashAttribution } from './worker-crash-attribution.js'
import {
  buildWorkerCrashError,
  buildWorkerReconciliationError,
  buildWorkerTaskCrashError,
  makeUnexpectedExitError,
} from './worker-reconciliation-error-builders.js'
import { WorkerTaskRecovery } from './worker-task-recovery.js'

export interface WorkerReconciliationPolicyHooks<
  WorkerNode extends LifecycleWorker
> {
  readonly apply: (
    result: ScheduleResult<WorkerNode>,
    owner?: WorkerLease
  ) => void
  readonly createDynamic: () => void
  readonly defer: (error: unknown, owner: WorkerLease) => void
  readonly detachQueued: (
    handle: WorkerReplacementInput<WorkerNode>['handle']
  ) => void
  readonly drainPhysical: (
    handle: WorkerReplacementInput<WorkerNode>['handle']
  ) => void
  readonly executionFinished: (owner: WorkerLease) => void
  readonly isRunning: () => boolean
  readonly publishError: (error: unknown, owner?: WorkerLease) => void
  readonly reject: (
    taskId: TaskUUID,
    worker: WorkerNode,
    error: WorkerCrashError | WorkerTerminationError,
    owner: WorkerLease
  ) => boolean
  readonly replenishFixed: () => void
  readonly reserve: (
    taskIds: readonly TaskUUID[],
    owner: WorkerLease
  ) => readonly ReconciliationReservation[]
  readonly restartWorkerOnError: () => boolean
  readonly restore: (
    reservations: readonly ReconciliationReservation[],
    error: (taskId: TaskUUID) => WorkerCrashError | WorkerTerminationError
  ) => readonly ScheduleResult<WorkerNode>[]
  readonly rollbackStartup: (failed: WorkerNode) => void
  readonly taskDequeued: (owner: WorkerLease) => void
  readonly tasksFinishedTimeout: () => number
  readonly waitForDrain: (
    worker: WorkerNode,
    signal: AbortSignal
  ) => Promise<void>
  readonly workers: () => readonly WorkerNode[]
}

export class WorkerReconciliationPolicy<
  Worker extends IWorker,
  Data,
  WorkerNode extends IWorkerNode<Worker, Data> = IWorkerNode<Worker, Data>
> {
  public constructor (
    private readonly hooks: WorkerReconciliationPolicyHooks<WorkerNode>
  ) {}

  public buildCrashError (
    cause: Error,
    workerNode: WorkerNode,
    taskId?: TaskUUID
  ): WorkerCrashError {
    return buildWorkerCrashError(cause, workerNode.info.id, taskId)
  }

  public buildTaskCrashError (
    cause: Error,
    workerNode: WorkerNode,
    taskId: TaskUUID,
    isCrashAttributed: boolean
  ): WorkerCrashError {
    return buildWorkerTaskCrashError(
      cause,
      workerNode.info.id,
      taskId,
      isCrashAttributed
    )
  }

  public complete (
    input: WorkerCompletionInput<WorkerNode>,
    signal: AbortSignal
  ): Promise<void> {
    const firstError =
      input.reconciliationValue instanceof WorkerCrashError ||
      input.reconciliationValue instanceof WorkerTerminationError
        ? input.reconciliationValue
        : undefined
    signal.throwIfAborted()
    this.#publishCompletionError(input, firstError)
    return Promise.resolve()
  }

  public makeUnexpectedExitError (
    context: 'lifecycle' | 'teardown',
    exitCode: null | number,
    signal: NodeJS.Signals | null | undefined,
    workerId: number | undefined
  ): WorkerCrashError {
    return makeUnexpectedExitError(context, exitCode, signal, workerId)
  }

  public reconcile (
    input: WorkerReconciliationInput<WorkerNode>,
    signal: AbortSignal
  ): WorkerTaskRecovery<WorkerNode> {
    signal.throwIfAborted()
    const { handle } = input
    const reserved = this.hooks.reserve(input.ownedTaskIds, handle.lease)
    const { attributedTaskId } = getWorkerCrashAttribution(reserved)
    return new WorkerTaskRecovery(
      input,
      reserved,
      {
        apply: result => {
          this.hooks.apply(result, handle.lease)
        },
        error: taskId =>
          buildWorkerReconciliationError(
            input,
            taskId,
            taskId === attributedTaskId
          ),
        finalize: () => {
          this.hooks.executionFinished(handle.lease)
        },
        prepare: async phaseSignal => {
          phaseSignal.throwIfAborted()
          if (
            input.classification === 'faulted' &&
            input.previousState === 'awaitingReady' &&
            input.ownedTaskIds.length === 0 &&
            !handle.worker.info.dynamic
          ) {
            this.hooks.rollbackStartup(handle.worker)
          }
          this.hooks.detachQueued(handle)
          this.hooks.drainPhysical(handle)
          this.hooks.taskDequeued(handle.lease)
          if (input.classification === 'draining') {
            await this.hooks.waitForDrain(handle.worker, phaseSignal)
            phaseSignal.throwIfAborted()
          }
        },
        reject: (reservation, error) =>
          this.hooks.reject(
            reservation.taskId,
            handle.worker,
            error instanceof WorkerCrashError ||
              error instanceof WorkerTerminationError
              ? error
              : buildWorkerReconciliationError(
                input,
                reservation.taskId,
                reservation.taskId === attributedTaskId
              ),
            handle.lease
          ),
        restore: (reservations, error) =>
          this.hooks.restore(reservations, taskId => {
            const failure = error(taskId)
            return failure instanceof WorkerCrashError ||
              failure instanceof WorkerTerminationError
              ? failure
              : new WorkerTerminationError(
                failure instanceof Error
                  ? failure.message
                  : 'Worker task could not be restored',
                {
                  taskId,
                  workerId: handle.lease.id,
                }
              )
          }),
      },
      input.classification === 'draining'
        ? this.hooks.tasksFinishedTimeout()
        : undefined
    )
  }

  public replace (
    input: WorkerReplacementInput<WorkerNode>,
    signal: AbortSignal
  ): Promise<void> {
    try {
      signal.throwIfAborted()
      const existingWorkers = new Set(this.hooks.workers())
      input.handle.worker.info.dynamic
        ? this.hooks.createDynamic()
        : this.hooks.replenishFixed()
      const replacement = this.hooks
        .workers()
        .find(worker => !existingWorkers.has(worker))
      signal.throwIfAborted()
      if (replacement != null) {
        replacement.usage.tasks.executed +=
          input.handle.worker.usage.tasks.executed
        replacement.usage.tasks.failed += input.handle.worker.usage.tasks.failed
      }
      return Promise.resolve()
    } catch (error) {
      try {
        this.hooks.publishError(error, input.handle.lease)
      } catch (reportingError) {
        this.hooks.defer(reportingError, input.handle.lease)
      }
      return Promise.resolve().then(() => {
        throw error
      })
    }
  }

  public restore (
    reservations: readonly ReconciliationReservation[],
    source: WorkerLease
  ): void {
    const results = this.hooks.restore(
      reservations,
      taskId =>
        new WorkerTerminationError(
          'Worker node terminated by pool (detached queued task could not be restored)',
          { taskId, workerId: source.id }
        )
    )
    for (const result of results) this.hooks.apply(result, source)
  }

  public shouldReplace (input: WorkerReplacementInput<WorkerNode>): boolean {
    if (!this.hooks.isRunning()) return false
    return input.handle.worker.info.dynamic
      ? input.classification === 'faulted' && this.hooks.restartWorkerOnError()
      : input.classification !== 'faulted' || this.hooks.restartWorkerOnError()
  }

  #publishCompletionError (
    input: WorkerCompletionInput<WorkerNode>,
    firstError: undefined | WorkerCrashError | WorkerTerminationError
  ): void {
    const { transition } = input
    if (transition.classification === 'faulted') {
      const crashError =
        transition.cause instanceof WorkerCrashError
          ? transition.cause
          : transition.cause instanceof Error
            ? new WorkerCrashError(
                `Worker node crashed: ${transition.cause.message}`,
                {
                  cause: transition.cause,
                  exitCode: transition.exit?.code ?? null,
                  signal: transition.exit?.signal ?? null,
                  workerId: transition.handle.worker.info.id,
                }
            )
            : this.makeUnexpectedExitError(
              'lifecycle',
              transition.exit?.code ?? null,
              transition.exit?.signal,
              transition.handle.worker.info.id
            )
      this.hooks.publishError(crashError, transition.handle.lease)
    } else if (firstError != null) {
      this.hooks.publishError(firstError, transition.handle.lease)
    }
  }
}
