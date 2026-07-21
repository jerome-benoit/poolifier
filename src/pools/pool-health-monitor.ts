import type { PoolDegradedEvent, PoolHealthState } from './pool.js'

/**
 * Callbacks the {@link PoolHealthMonitor} depends on to observe the pool and
 * publish health transitions.
 * @internal
 */
export interface PoolHealthMonitorCallbacks {
  readonly emitDegraded: (event: PoolDegradedEvent) => void
  readonly emitDegradedEnd: () => void
  readonly minSize: () => number
  readonly readyWorkerNodes: () => number
  readonly started: () => boolean
  readonly tripped: () => boolean
}

/**
 * Tracks the pool health state and publishes transitions between healthy,
 * degraded and unrecoverable. Degraded means the pool is started but has fewer
 * ready worker nodes than its minimum size; unrecoverable means the worker
 * restart circuit breaker tripped and the pool can no longer replace faulted
 * workers. The unrecoverable state latches, mirroring the circuit breaker.
 * @internal
 */
export class PoolHealthMonitor {
  public get state (): PoolHealthState {
    return this.#state
  }

  public get unrecoverable (): boolean {
    return this.#state === 'unrecoverable'
  }

  readonly #callbacks: PoolHealthMonitorCallbacks

  #state: PoolHealthState = 'healthy'

  public constructor (callbacks: PoolHealthMonitorCallbacks) {
    this.#callbacks = callbacks
  }

  /**
   * Recomputes the pool health state from the current pool topology and
   * publishes a transition when it changes. No-ops once unrecoverable (latched)
   * and when the recomputed state matches the current one.
   */
  public refresh (): void {
    if (this.#state === 'unrecoverable') {
      return
    }
    const readyWorkerNodes = this.#callbacks.readyWorkerNodes()
    const minSize = this.#callbacks.minSize()
    const next: PoolHealthState = this.#callbacks.tripped()
      ? 'unrecoverable'
      : this.#callbacks.started() && readyWorkerNodes < minSize
        ? 'degraded'
        : 'healthy'
    if (next === this.#state) {
      return
    }
    this.#state = next
    if (next === 'healthy') {
      this.#callbacks.emitDegradedEnd()
    } else {
      this.#callbacks.emitDegraded({
        healthyWorkerNodes: readyWorkerNodes,
        minSize,
        reason:
          next === 'unrecoverable' ? 'circuitBreakerTripped' : 'belowMinimum',
        unrecoverable: next === 'unrecoverable',
      })
    }
  }
}
