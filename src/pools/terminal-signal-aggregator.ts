import type {
  ReconcileClassification,
  ReconcileResult,
  WorkerExit,
} from './lifecycle-types.js'

export type TerminalObservation = Readonly<{
  cause: unknown
  classification: Exclude<ReconcileClassification, 'draining'>
  exit?: WorkerExit
}>

interface TerminalSignalCallbacks {
  readonly quarantine: (observation: TerminalObservation) => void
  readonly reconcile: (observation: TerminalObservation) => Promise<ReconcileResult>
  readonly waitForTransportDrain: () => Promise<void>
}

export class TerminalSignalAggregator {
  readonly #callbacks: TerminalSignalCallbacks
  #error?: Error
  #exit?: { code: null | number; signal?: NodeJS.Signals | null }
  #exitCause?: unknown
  #exitFaulted = false
  #reconciliation?: Promise<ReconcileResult>

  public constructor (callbacks: TerminalSignalCallbacks) {
    this.#callbacks = callbacks
  }

  public error (error: Error): Promise<ReconcileResult> {
    this.#error ??= error
    return this.#observe()
  }

  public exit (
    exit: WorkerExit,
    faulted: boolean,
    cause: unknown
  ): Promise<ReconcileResult> {
    const observedExit = this.#exit
    this.#exit = {
      code: observedExit?.code ?? exit.code,
      signal: observedExit?.signal ?? exit.signal,
    }
    this.#exitCause ??= cause
    this.#exitFaulted = faulted
    return this.#observe()
  }

  async #drainAndReconcile (): Promise<ReconcileResult> {
    await this.#callbacks.waitForTransportDrain()
    return await this.#callbacks.reconcile(this.#snapshot())
  }

  #observe (): Promise<ReconcileResult> {
    this.#callbacks.quarantine(this.#snapshot())
    this.#reconciliation ??= this.#drainAndReconcile()
    return this.#reconciliation
  }

  #snapshot (): TerminalObservation {
    return Object.freeze({
      cause: this.#error ?? this.#exitCause ?? this.#exit,
      classification:
        this.#error != null || this.#exitFaulted ? 'faulted' : 'exited',
      ...(this.#exit != null && { exit: Object.freeze({ ...this.#exit }) }),
    })
  }
}
