import { expect, it } from 'vitest'

import {
  WorkerCrashError,
  WorkerTerminationError,
} from '../../../lib/index.mjs'
import { WorkerReconciliationPolicy } from '../../../lib/pools/worker-reconciliation-policy.mjs'
import { createHooks, signal } from './worker-reconciliation-policy-fixture.mjs'

it('keeps lease ownership outside replacement policy', () => {
  const hooks = createHooks()
  const policy = new WorkerReconciliationPolicy(hooks)
  const worker = { info: { dynamic: true }, usage: { tasks: {} } }
  const input = {
    classification: 'faulted',
    handle: { lease: { generation: 3, id: 9 }, worker },
  }

  expect(policy.shouldReplace(input)).toBe(true)
  expect(hooks.createDynamic).not.toHaveBeenCalled()
})

it.each([
  ['dynamic', true, 'createDynamic'],
  ['fixed', false, 'replenishFixed'],
])(
  'publishes and rethrows the exact %s replacement failure',
  async (_kind, dynamic, replacementHook) => {
    const failure = { replacement: replacementHook }
    const hooks = createHooks()
    hooks[replacementHook].mockImplementation(() => {
      throw failure
    })
    const policy = new WorkerReconciliationPolicy(hooks)
    const lease = { generation: 3, id: 9 }
    const worker = {
      info: { dynamic },
      usage: { tasks: { executed: 1, failed: 2 } },
    }

    const rejected = await Promise.resolve()
      .then(() =>
        policy.replace(
          {
            classification: 'faulted',
            handle: { lease, worker },
          },
          signal
        )
      )
      .catch(error => error)

    expect(hooks.publishError).toHaveBeenCalledWith(failure, lease)
    expect(rejected).toBe(failure)
  }
)

it('preserves the replacement failure when error publication also throws', async () => {
  const primary = { replacement: 'failed' }
  const publicationFailure = new Error('publication failed')
  const lease = { generation: 1, id: 1 }
  const hooks = createHooks()
  hooks.replenishFixed.mockImplementation(() => {
    throw primary
  })
  hooks.publishError.mockImplementation(() => {
    throw publicationFailure
  })
  const policy = new WorkerReconciliationPolicy(hooks)

  const rejected = await Promise.resolve()
    .then(() =>
      policy.replace(
        {
          classification: 'faulted',
          handle: {
            lease,
            worker: {
              info: { dynamic: false },
              usage: { tasks: { executed: 0, failed: 0 } },
            },
          },
        },
        signal
      )
    )
    .catch(error => error)

  expect(hooks.publishError).toHaveBeenCalledExactlyOnceWith(primary, lease)
  expect(rejected).toBe(primary)
  expect(hooks.defer).toHaveBeenCalledExactlyOnceWith(publicationFailure, lease)
})

it('publishes and rethrows replacement accounting failures', async () => {
  const failure = new Error('replacement accounting failed')
  const hooks = createHooks()
  const source = {
    info: { dynamic: false },
    usage: { tasks: { executed: 1, failed: 2 } },
  }
  const replacementTasks = { failed: 0 }
  Object.defineProperty(replacementTasks, 'executed', {
    get: () => 0,
    set: () => {
      throw failure
    },
  })
  const replacement = {
    info: { dynamic: false },
    usage: { tasks: replacementTasks },
  }
  hooks.workers
    .mockReturnValueOnce([source])
    .mockReturnValue([source, replacement])
  const policy = new WorkerReconciliationPolicy(hooks)
  const lease = { generation: 1, id: 1 }

  const rejected = await Promise.resolve()
    .then(() =>
      policy.replace(
        {
          classification: 'faulted',
          handle: { lease, worker: source },
        },
        signal
      )
    )
    .catch(error => error)

  expect(hooks.publishError).toHaveBeenCalledWith(failure, lease)
  expect(rejected).toBe(failure)
})

it('commits reconciliation preparation before physical drain', async () => {
  const hooks = createHooks()
  const policy = new WorkerReconciliationPolicy(hooks)
  const worker = { info: { dynamic: false } }
  const handle = { lease: { generation: 1, id: 2 }, worker }

  const recovery = policy.reconcile(
    {
      classification: 'faulted',
      handle,
      ownedTaskIds: ['task'],
      previousState: 'ready',
    },
    signal
  )
  await recovery.prepare(signal)
  expect(hooks.reserve).toHaveBeenCalledBefore(hooks.drainPhysical)
  expect(hooks.drainPhysical).toHaveBeenCalledBefore(hooks.reject)
  expect(hooks.taskDequeued).toHaveBeenCalledWith(handle.lease)
  expect(hooks.executionFinished).not.toHaveBeenCalled()

  recovery.finalizeResidual(signal)

  expect(hooks.reject).toHaveBeenCalledBefore(hooks.executionFinished)
  expect(hooks.executionFinished).toHaveBeenCalledOnce()
  expect(hooks.executionFinished).toHaveBeenCalledWith(handle.lease)
})

it('does not finish execution after a timed-out drain preparation resumes', async () => {
  const hooks = createHooks()
  const gate = Promise.withResolvers()
  hooks.waitForDrain.mockReturnValue(gate.promise)
  const policy = new WorkerReconciliationPolicy(hooks)
  const controller = new AbortController()
  const recovery = policy.reconcile(
    {
      classification: 'draining',
      handle: {
        lease: { generation: 1, id: 2 },
        worker: { info: { dynamic: false } },
      },
      ownedTaskIds: [],
      previousState: 'ready',
    },
    controller.signal
  )
  const preparation = recovery
    .prepare(controller.signal)
    .catch(reason => reason)

  controller.abort(new Error('prepare timeout'))
  gate.resolve()
  await preparation

  expect(hooks.executionFinished).not.toHaveBeenCalled()
})

it('T13b: publishes a transition crash without a task separately from task rejection', async () => {
  const taskId = '00000000-0000-0000-0000-000000000abc'
  const rawCause = new Error('queued transition raw crash')
  const hooks = createHooks()
  const policy = new WorkerReconciliationPolicy(hooks)
  const worker = { info: { dynamic: false, id: 7 }, usage: { tasks: {} } }
  const handle = { lease: { generation: 1, id: 7 }, worker }
  hooks.reserve.mockReturnValue([
    { lease: handle.lease, previousState: 'running', taskId },
  ])

  const recovery = policy.reconcile(
    {
      cause: rawCause,
      classification: 'faulted',
      handle,
      ownedTaskIds: [taskId],
      previousState: 'ready',
    },
    signal
  )
  const firstError = await recovery.prepare(signal)
  await recovery.restore(signal)
  await policy.complete(
    {
      reconciliationValue: firstError,
      transition: {
        cause: rawCause,
        classification: 'faulted',
        handle,
        ownedTaskIds: [taskId],
        previousState: 'ready',
      },
    },
    signal
  )

  expect(hooks.reject).toHaveBeenCalledOnce()
  const taskError = hooks.reject.mock.calls[0][2]
  expect(taskError).toBeInstanceOf(WorkerCrashError)
  expect(taskError.taskId).toBe(taskId)
  expect(taskError.workerId).toBe(handle.lease.id)

  expect(hooks.publishError).toHaveBeenCalledOnce()
  const published = hooks.publishError.mock.calls[0][0]
  expect(published).toBeInstanceOf(WorkerCrashError)
  expect(published).not.toBe(taskError)
  expect(published.message).toBe(
    'Worker node crashed: queued transition raw crash'
  )
  expect(published.cause).toBe(rawCause)
  expect(published.workerId).toBe(handle.lease.id)
  expect(published.workerId).toBe(taskError.workerId)
  expect(published.taskId).toBeUndefined()
  expect(hooks.publishError.mock.calls[0][1]).toBe(handle.lease)
})

it('T13h: full pool drain rejects reserved queued work without redistribution', async () => {
  const taskId = '00000000-0000-0000-0000-000000000d13'
  const hooks = createHooks()
  hooks.isRunning.mockReturnValue(false)
  hooks.reserve.mockReturnValue([
    {
      lease: { generation: 1, id: 9 },
      previousState: 'running',
      taskId,
    },
  ])
  const policy = new WorkerReconciliationPolicy(hooks)
  const worker = { info: { dynamic: false, id: 9 }, usage: { tasks: {} } }

  const recovery = policy.reconcile(
    {
      classification: 'draining',
      handle: { lease: { generation: 1, id: 9 }, worker },
      ownedTaskIds: [taskId],
      previousState: 'ready',
    },
    signal
  )
  await recovery.prepare(signal)

  expect(hooks.reject.mock.calls[0][2]).toBeInstanceOf(WorkerTerminationError)
  expect(hooks.reject.mock.calls[0][2].taskId).toBe(taskId)
})

it('T13i: single worker drain restores reserved queued work through recovery', async () => {
  const taskId = '00000000-0000-0000-0000-000000000d14'
  const lease = { generation: 1, id: 11 }
  const hooks = createHooks()
  hooks.reserve.mockReturnValue([{ lease, previousState: 'queued', taskId }])
  hooks.restore.mockReturnValue([
    { kind: 'committed', state: 'queued', taskId },
  ])
  const policy = new WorkerReconciliationPolicy(hooks)
  const worker = { info: { dynamic: false, id: 11 }, usage: { tasks: {} } }

  const recovery = policy.reconcile(
    {
      classification: 'draining',
      handle: { lease, worker },
      ownedTaskIds: [taskId],
      previousState: 'ready',
    },
    signal
  )
  await recovery.prepare(signal)
  await recovery.restore(signal)
  recovery.finalizeResidual(signal)

  expect(hooks.restore).toHaveBeenCalledOnce()
  expect(hooks.reject).not.toHaveBeenCalled()
  expect(hooks.apply).toHaveBeenCalledOnce()
  expect(hooks.apply).toHaveBeenCalledBefore(hooks.executionFinished)
  expect(hooks.executionFinished).toHaveBeenCalledOnce()
  expect(hooks.executionFinished).toHaveBeenCalledWith(lease)
})
