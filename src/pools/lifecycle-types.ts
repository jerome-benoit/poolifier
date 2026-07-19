/* eslint-disable perfectionist/sort-intersection-types, perfectionist/sort-modules, perfectionist/sort-object-types, perfectionist/sort-union-types */
import type { AsyncResource } from 'node:async_hooks'

import type { Task, TaskUUID } from '../utility-types.js'

export type WorkerLease = Readonly<{ id: number; generation: number }>

export type WorkerHandle<Worker> = Readonly<{
  lease: WorkerLease
  worker: Worker
}>

export type DispatchPermit<Worker> = Readonly<{
  handle: WorkerHandle<Worker>
  readiness: 'awaitingReady' | 'ready'
}>

export interface LifecycleWorker {
  readonly info: Readonly<{ dynamic: boolean; id?: number }>
}

export type ReconcileClassification = 'draining' | 'exited' | 'faulted'

export type ReconcileResult = Readonly<{
  cause: unknown
  classification?: ReconcileClassification
  committed: boolean
  exit?: WorkerExit
  lease: WorkerLease
}>

export type WorkerCompletionInput<Worker extends LifecycleWorker> = Readonly<{
  reconciliationValue: unknown
  transition: WorkerReconcileInput<Worker>
}>

export type ReconciliationReservation = Readonly<{
  lease: WorkerLease
  previousState: Exclude<TaskState, 'reconciling' | 'settled'>
  taskId: TaskUUID
}>

export interface WorkerReconciliationPreparation {
  readonly finalizeResidual: (signal: AbortSignal) => unknown
  readonly prepare: (signal: AbortSignal) => Promise<unknown>
  readonly prepareTimeoutMs?: number
  readonly restore: (signal: AbortSignal) => Promise<void>
}

export type WorkerExit = Readonly<{
  code: null | number
  signal?: NodeJS.Signals | null
}>

export type WorkerTerminalObservation = Readonly<{
  cause: unknown
  classification: Exclude<ReconcileClassification, 'draining'>
  exit?: WorkerExit
}>

export interface WorkerLifecycleCallbacks<Worker extends LifecycleWorker> {
  readonly complete: (
    input: WorkerCompletionInput<Worker>,
    signal: AbortSignal
  ) => Promise<void>
  readonly drain: (
    handle: WorkerHandle<Worker>,
    signal: AbortSignal
  ) => Promise<void>
  readonly exclude: (handle: WorkerHandle<Worker>, signal: AbortSignal) => unknown
  readonly isPoolRunning: (signal: AbortSignal) => boolean
  readonly reconcile: (
    input: WorkerReconcileInput<Worker>,
    signal: AbortSignal
  ) => unknown
  readonly remove: (handle: WorkerHandle<Worker>, signal: AbortSignal) => unknown
  readonly replace: (
    input: WorkerReplacementInput<Worker>,
    signal: AbortSignal
  ) => Promise<void>
  readonly shouldReplace: (
    input: WorkerReplacementInput<Worker>,
    signal: AbortSignal
  ) => boolean
  readonly snapshotOwnedWork: (lease: WorkerLease) => readonly TaskUUID[]
  readonly terminate: (
    input: WorkerReconcileInput<Worker>,
    signal: AbortSignal
  ) => Promise<void>
}

export type TopologyChangeListener = (epoch: number) => void

export type WorkerReconcilerInput<Worker extends LifecycleWorker> = Readonly<{
  baseTransition: WorkerReconcileInput<Worker>
  command: WorkerLifecycleCommand<Worker>
  finalize: (signal: AbortSignal) => unknown
  transition: () => WorkerReconcileInput<Worker>
}>

export type WorkerReconcileInput<Worker extends LifecycleWorker> = Readonly<{
  cause: unknown
  classification: ReconcileClassification
  exit?: WorkerExit
  handle: WorkerHandle<Worker>
  ownedTaskIds: readonly TaskUUID[]
  previousState: WorkerState
}>

export type WorkerReplacementInput<Worker extends LifecycleWorker> = Readonly<{
  classification: ReconcileClassification
  handle: WorkerHandle<Worker>
}>

export type WorkerState =
  | 'awaitingReady'
  | 'draining'
  | 'exited'
  | 'faulted'
  | 'provisioning'
  | 'ready'
  | 'removed'

export interface WorkerLifecycleCommand<Worker> {
  readonly allowReplacement: boolean
  readonly cause: unknown
  readonly classification: ReconcileClassification
  readonly excluded?: boolean
  readonly exclusionError?: unknown
  readonly handle: WorkerHandle<Worker>
}

export interface WorkerLifecycleSlot<Worker> {
  cause?: unknown
  exclusionError?: unknown
  exit?: { code: null | number; signal?: NodeJS.Signals | null }
  readonly handle: WorkerHandle<Worker>
  reconciliation?: Promise<ReconcileResult>
  reconciliationPreviousState?: WorkerState
  state: WorkerState
  terminalClassification?: ReconcileClassification
}

export type TaskState =
  | 'registered'
  | 'waitingReady'
  | 'queued'
  | 'assigned'
  | 'dispatching'
  | 'running'
  | 'cancelling'
  | 'detached'
  | 'reconciling'
  | 'settled'

export type TaskSettlement<Response = unknown> = Readonly<
  { kind: 'resolved'; value: Response } | { kind: 'rejected'; error: unknown }
>

export type TransitionResult = Readonly<{
  committed: boolean
  previous: TaskState
  current: TaskState
}>

export type TransitionFailure = 'missing' | 'state_mismatch'

export type RegistryTransition =
  | Readonly<{ ok: true; previous: TaskState; current: TaskState }>
  | Readonly<{ ok: false; reason: TransitionFailure }>

export type AccountingEffect = Readonly<{
  activeLease?: WorkerLease
  executionStarted: boolean
  selectedLease?: WorkerLease
  taskName: string
  outcome?: 'executed' | 'failed'
}>

export type SettlementResult =
  | Readonly<{ settled: false }>
  | Readonly<{
    effect: AccountingEffect
    secondaryErrors: readonly unknown[]
    settled: true
  }>

export type AbortDecision =
  | Readonly<{
    kind: 'noop'
    reason: 'missing' | 'settled' | 'already_cancelling' | 'reconciling'
  }>
  | Readonly<{
    kind: 'defer-dispatch'
  }>
  | Readonly<{
    kind: 'settle-local'
    state: 'registered' | 'waitingReady' | 'queued' | 'assigned' | 'detached'
    error: unknown
    lease?: WorkerLease
  }>
  | Readonly<{ kind: 'send-running-abort'; lease: WorkerLease }>

export interface RegisterTaskInput<Data, Response> {
  readonly abortSignal?: AbortSignal
  readonly asyncResource?: AsyncResource
  readonly onAbort: (taskId: TaskUUID) => void
  readonly reject: (reason?: unknown) => void
  readonly resolve: (value: PromiseLike<Response> | Response) => void
  readonly selectedLease?: WorkerLease
  readonly task: Task<Data> & Readonly<{ taskId: TaskUUID }>
}

export interface TaskRecord<Data, Response> {
  readonly abortListener?: () => void
  readonly abortSignal?: AbortSignal
  activeOnReconciliation?: boolean
  readonly asyncResource?: AsyncResource
  currentLease?: WorkerLease
  readonly reject: (reason?: unknown) => void
  readonly resolve: (value: PromiseLike<Response> | Response) => void
  selectedLease?: WorkerLease
  state: TaskState
  readonly task: Task<Data> & Readonly<{ taskId: TaskUUID }>
}
