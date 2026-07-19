import { WORKER_TERMINATION_GRACE_MS } from './worker-termination.js'

type DrainEvent = 'close' | 'disconnect'
type DrainSource = Readonly<{
  once: (event: DrainEvent, listener: () => void) => unknown
}>

export class TransportDrainBarrier {
  readonly #drained: Promise<void>
  #resolveDrain?: () => void

  public constructor (source: DrainSource, event: DrainEvent) {
    this.#drained = new Promise(resolve => {
      this.#resolveDrain = resolve
    })
    source.once(event, this.#markDrained)
  }

  public async wait (): Promise<void> {
    let timeout: NodeJS.Timeout | undefined
    const observationExpired = new Promise<void>(resolve => {
      timeout = setTimeout(resolve, WORKER_TERMINATION_GRACE_MS)
    })
    try {
      await Promise.race([this.#drained, observationExpired])
    } finally {
      if (timeout != null) clearTimeout(timeout)
    }
  }

  readonly #markDrained = (): void => {
    this.#resolveDrain?.()
    this.#resolveDrain = undefined
  }
}
