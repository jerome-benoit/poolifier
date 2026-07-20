import { expect, it, vi } from 'vitest'

import { WorkerTaskRecovery } from '../../../lib/pools/worker-task-recovery.mjs'

const signal = new AbortController().signal

it('never restores non-recoverable tasks when the prepare phase throws', async () => {
  const lease = { generation: 1, id: 7 }
  const running = {
    lease,
    previousState: 'running',
    taskId: '00000000-0000-0000-0000-000000000a01',
  }
  const queued = {
    lease,
    previousState: 'queued',
    taskId: '00000000-0000-0000-0000-000000000a02',
  }
  const apply = vi.fn()
  const reject = vi.fn(() => true)
  const restore = vi.fn(reservations =>
    reservations.map(() => ({ kind: 'committed' }))
  )
  const recovery = new WorkerTaskRecovery(
    {
      classification: 'faulted',
      handle: { lease, worker: { info: { dynamic: false } } },
      ownedTaskIds: [running.taskId, queued.taskId],
      previousState: 'ready',
    },
    [running, queued],
    {
      apply,
      error: () => new Error('crash'),
      finalize: vi.fn(),
      prepare: () => Promise.reject(new Error('drain failed')),
      reject,
      restore,
    }
  )

  await expect(recovery.prepare(signal)).rejects.toThrow('drain failed')

  await recovery.restore(signal)

  expect(restore).toHaveBeenCalledOnce()
  const restored = restore.mock.calls[0][0]
  expect(restored).toStrictEqual([queued])
  expect(apply).toHaveBeenCalledOnce()

  recovery.finalizeResidual(signal)
  expect(reject).toHaveBeenCalledOnce()
  expect(reject.mock.calls[0][0]).toStrictEqual(running)
})
