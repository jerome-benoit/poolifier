import { describe, expect, it, vi } from 'vitest'

import { TaskStealingController } from '../../../lib/pools/task-stealing-controller.mjs'
import { TaskUsageAccounting } from '../../../lib/pools/task-usage-accounting.mjs'

const worker = queueSize => ({
  info: {
    backPressure: true,
    backPressureStealing: false,
    continuousStealing: false,
    dynamic: false,
    queuedTaskAbortion: false,
    ready: true,
    stealing: false,
    stolen: false,
  },
  tasksQueueSize: () => queueSize,
})

const createFixture = () => {
  const source = { lease: { generation: 1, id: 1 }, worker: worker(3) }
  const destination = { lease: { generation: 1, id: 2 }, worker: worker(0) }
  const handles = [source, destination]
  const task = { name: 'default', taskId: 'task' }
  const scheduler = {
    steal: vi.fn(() => ({
      handle: destination,
      kind: 'committed',
      state: 'queued',
      taskId: 'task',
    })),
  }
  const timers = []
  const hooks = {
    applyResult: vi.fn(),
    cancel: vi.fn(),
    canSteal: () => true,
    defer: callback => callback(),
    handles: () => handles,
    isIdle: vi.fn(() => true),
    onError: vi.fn(),
    onStolen: vi.fn(),
    ratio: () => 1,
    resetSequence: vi.fn(),
    schedule: vi.fn((callback, delay) => {
      const timer = { callback, delay }
      timers.push(timer)
      return timer
    }),
    sequentiallyStolen: vi.fn(() => 0),
    updateSequence: vi.fn(),
  }
  const coordinator = {
    handle: candidate => handles.find(handle => handle.worker === candidate),
    isCurrent: handle => handles.includes(handle),
    isSchedulable: vi.fn(() => true),
  }
  const registry = { get: () => ({ task }) }
  return {
    controller: new TaskStealingController(
      scheduler,
      registry,
      coordinator,
      hooks
    ),
    coordinator,
    destination,
    handles,
    hooks,
    scheduler,
    source,
    task,
    timers,
  }
}

describe('TaskStealingController', () => {
  it('reports the ratio reached at the exact stealing limit', () => {
    const fixture = createFixture()
    fixture.hooks.ratio = () => 0.5
    fixture.source.worker.info.continuousStealing = true

    expect(fixture.controller.ratioReached()).toBe(true)
  })

  it('steals from the fullest source and schedules the next idle attempt', () => {
    const fixture = createFixture()

    fixture.controller.idle(fixture.destination)

    expect(fixture.scheduler.steal).toHaveBeenCalledWith(
      fixture.source,
      fixture.destination
    )
    expect(fixture.hooks.onStolen).toHaveBeenCalledOnce()
    expect(fixture.timers).toHaveLength(1)
  })

  it('ignores stale idle timer callbacks after cancellation', () => {
    const fixture = createFixture()
    fixture.controller.idle(fixture.destination)
    const timer = fixture.timers[0]
    fixture.controller.cancel(fixture.destination)

    timer.callback()

    expect(fixture.scheduler.steal).toHaveBeenCalledOnce()
  })

  it('does not steal through a stale handle', () => {
    const fixture = createFixture()
    fixture.handles.splice(1, 1)

    fixture.controller.idle(fixture.destination)

    expect(fixture.scheduler.steal).not.toHaveBeenCalled()
  })

  it('does not steal or schedule when a current destination is reconciling', () => {
    const fixture = createFixture()
    fixture.coordinator.isSchedulable.mockReturnValue(false)

    fixture.controller.idle(fixture.destination)

    expect(fixture.scheduler.steal).not.toHaveBeenCalled()
    expect(fixture.timers).toHaveLength(0)
  })

  it('resets continuous stealing without scheduling when destination becomes busy', () => {
    const fixture = createFixture()
    const aggregateUsage = { tasks: { sequentiallyStolen: 25 } }
    const taskFunctionUsage = { tasks: { sequentiallyStolen: 25 } }
    const previousTask = { name: 'default', taskId: 'previous' }
    fixture.destination.worker.usage = aggregateUsage
    fixture.destination.worker.getTaskFunctionWorkerUsage = name =>
      name === previousTask.name ? taskFunctionUsage : undefined
    const accounting = new TaskUsageAccounting({
      getWorkerNodeKeyByLease: vi.fn(),
      shouldUpdateTaskFunctionUsage: () => true,
      workerNodes: () => [fixture.destination.worker],
    })
    fixture.hooks.resetSequence.mockImplementation((_handle, previousName) => {
      accounting.resetSequentiallyStolen(0, previousName)
    })
    fixture.hooks.isIdle.mockReturnValue(false)
    fixture.hooks.sequentiallyStolen.mockReturnValue(25)
    fixture.destination.worker.info.continuousStealing = true

    fixture.controller.idle(fixture.destination, previousTask.name)

    expect(fixture.destination.worker.info.continuousStealing).toBe(false)
    expect(fixture.hooks.resetSequence).toHaveBeenCalledOnce()
    expect(fixture.hooks.resetSequence).toHaveBeenCalledWith(
      fixture.destination,
      previousTask.name
    )
    expect(aggregateUsage.tasks.sequentiallyStolen).toBe(0)
    expect(taskFunctionUsage.tasks.sequentiallyStolen).toBe(0)
    expect(fixture.hooks.updateSequence).not.toHaveBeenCalled()
    expect(fixture.scheduler.steal).not.toHaveBeenCalled()
    expect(fixture.hooks.schedule).not.toHaveBeenCalled()
    expect(fixture.timers).toHaveLength(0)
  })

  it('keeps recursive no-source delays at the operational retry cap', () => {
    const fixture = createFixture()
    const previousTask = { name: 'default', taskId: 'previous' }
    fixture.handles.splice(0, 1)
    fixture.hooks.sequentiallyStolen.mockReturnValue(25)

    fixture.controller.idle(fixture.destination, previousTask.name)

    expect(fixture.scheduler.steal).not.toHaveBeenCalled()
    expect(fixture.hooks.resetSequence).not.toHaveBeenCalled()
    expect(fixture.hooks.updateSequence).toHaveBeenCalledWith(
      fixture.destination,
      undefined,
      previousTask.name
    )
    expect(fixture.hooks.schedule).toHaveBeenLastCalledWith(
      expect.any(Function),
      1_000
    )

    fixture.timers[0].callback()

    expect(fixture.hooks.schedule).toHaveBeenCalledTimes(2)
    expect(fixture.hooks.schedule).toHaveBeenLastCalledWith(
      expect.any(Function),
      1_000
    )
    expect(fixture.hooks.resetSequence).not.toHaveBeenCalled()
  })

  it('resets with the stolen task when a destination becomes busy after a no-source retry', () => {
    const fixture = createFixture()
    const originalTask = fixture.task

    fixture.controller.idle(fixture.destination)

    expect(fixture.scheduler.steal).toHaveBeenCalledWith(
      fixture.source,
      fixture.destination
    )
    const initialTimer = fixture.timers[0]
    fixture.handles.splice(0, 1)

    initialTimer.callback()

    const retryTimer = fixture.timers[1]
    fixture.hooks.isIdle.mockReturnValue(false)
    fixture.hooks.sequentiallyStolen.mockReturnValue(1)
    fixture.destination.worker.info.continuousStealing = true

    fixture.controller.idle(fixture.destination)

    expect(fixture.hooks.resetSequence).toHaveBeenCalledOnce()
    expect(fixture.hooks.resetSequence).toHaveBeenCalledWith(
      fixture.destination,
      originalTask.name
    )
    expect(fixture.hooks.cancel).toHaveBeenCalledWith(retryTimer)
    expect(fixture.destination.worker.info.continuousStealing).toBe(false)
    expect(fixture.hooks.schedule).toHaveBeenCalledTimes(2)

    retryTimer.callback()

    expect(fixture.hooks.schedule).toHaveBeenCalledTimes(2)
  })

  it('resets back-pressure stealing after a failed attempt and retries', () => {
    const fixture = createFixture()
    const stealError = new Error('steal attempt failure')
    fixture.scheduler.steal
      .mockImplementationOnce(() => {
        throw stealError
      })
      .mockReturnValue({ kind: 'retry' })

    fixture.controller.backPressure(fixture.source)

    expect(fixture.hooks.onError).toHaveBeenCalledWith(stealError)
    expect(fixture.destination.worker.info.backPressureStealing).toBe(false)

    fixture.controller.backPressure(fixture.source)

    expect(fixture.scheduler.steal).toHaveBeenCalledTimes(2)
    expect(fixture.destination.worker.info.backPressureStealing).toBe(false)
  })
})
