import { PoolEvents, type PoolType, PoolTypes } from '../pool.js'
import { checkDynamicPoolSize } from '../utils.js'
import { type ClusterPoolOptions, FixedClusterPool } from './fixed.js'

/**
 * A cluster pool with a dynamic number of workers, but a guaranteed minimum number of workers.
 *
 * This cluster pool creates new workers when the others are busy, up to the maximum number of workers.
 * When the maximum number of workers is reached and workers are busy, an event is emitted. If you want to listen to this event, use the pool's `emitter`.
 * @typeParam Data - Type of data sent to the worker. This can only be structured-cloneable data.
 * @typeParam Response - Type of execution response. This can only be structured-cloneable data.
 * @author [Christopher Quadflieg](https://github.com/Shinigami92)
 * @since 2.0.0
 */
export class DynamicClusterPool<
  Data = unknown,
  Response = unknown
> extends FixedClusterPool<Data, Response> {
  /** @inheritDoc */
  protected override get backPressure (): boolean {
    return this.full && this.internalBackPressure()
  }

  /** @inheritDoc */
  protected override get busy (): boolean {
    return this.full && this.internalBusy()
  }

  /** @inheritDoc */
  protected override get type (): PoolType {
    return PoolTypes.dynamic
  }

  /**
   * Whether the pool empty event has been emitted or not
   */
  private emptyEventEmitted: boolean

  /**
   * Whether the pool full event has been emitted or not.
   */
  private fullEventEmitted: boolean

  /**
   * Whether the pool is empty or not.
   * @returns The pool emptiness boolean status.
   */
  private get empty (): boolean {
    return (
      this.minimumNumberOfWorkers === 0 &&
      this.workerNodes.length === this.minimumNumberOfWorkers
    )
  }

  /**
   * Whether the pool is full or not.
   * @returns The pool fullness boolean status.
   */
  private get full (): boolean {
    return (
      this.workerNodes.length >=
      (this.maximumNumberOfWorkers ?? this.minimumNumberOfWorkers)
    )
  }

  /**
   * Constructs a new poolifier dynamic cluster pool.
   * @param min - Minimum number of workers which are always active.
   * @param max - Maximum number of workers that can be created by this pool.
   * @param filePath - Path to an implementation of a `ClusterWorker` file, which can be relative or absolute.
   * @param opts - Options for this dynamic cluster pool.
   */
  public constructor (
    min: number,
    max: number,
    filePath: string,
    opts: ClusterPoolOptions = {}
  ) {
    super(min, filePath, opts, max)
    checkDynamicPoolSize(
      this.minimumNumberOfWorkers,
      this.maximumNumberOfWorkers
    )
    this.emptyEventEmitted = false
    this.fullEventEmitted = false
  }

  /** @inheritDoc */
  protected override checkAndEmitDynamicWorkerCreationEvents (): void {
    if (this.emitter != null) {
      if (!this.fullEventEmitted && this.full) {
        this.emitter.emit(PoolEvents.full, this.info)
        this.fullEventEmitted = true
      }
      if (this.emptyEventEmitted && !this.empty) {
        this.emptyEventEmitted = false
      }
    }
  }

  /** @inheritDoc */
  protected override checkAndEmitDynamicWorkerDestructionEvents (): void {
    if (this.emitter != null) {
      if (this.fullEventEmitted && !this.full) {
        this.emitter.emit(PoolEvents.fullEnd, this.info)
        this.fullEventEmitted = false
      }
      if (!this.emptyEventEmitted && this.empty) {
        this.emitter.emit(PoolEvents.empty, this.info)
        this.emptyEventEmitted = true
      }
    }
  }

  /** @inheritDoc */
  protected override shallCreateDynamicWorker (): boolean {
    return (
      this.started &&
      !this.destroying &&
      ((!this.full && this.internalBusy()) || this.empty)
    )
  }
}
