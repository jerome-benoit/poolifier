import type { TaskUUID } from '../utility-types.js'
import type { AbortDecision, TaskRecord } from './lifecycle-types.js'

export const getTaskAbortDecision = <Data, Response>(
  record: Readonly<TaskRecord<Data, Response>>,
  taskId: TaskUUID
): AbortDecision => {
  switch (record.state) {
    case 'assigned':
    case 'detached':
    case 'queued':
    case 'registered':
    case 'waitingReady':
      return {
        error:
          record.abortSignal?.reason ??
          new Error(
            `Task '${record.task.name ?? 'default'}' id '${taskId}' aborted`
          ),
        kind: 'settle-local',
        ...(record.currentLease != null && { lease: record.currentLease }),
        state: record.state,
      }
    case 'cancelling':
      return { kind: 'noop', reason: 'already_cancelling' }
    case 'dispatching':
      return { kind: 'defer-dispatch' }
    case 'reconciling':
      return { kind: 'noop', reason: 'reconciling' }
    case 'running':
      return record.currentLease == null
        ? { kind: 'noop', reason: 'missing' }
        : { kind: 'send-running-abort', lease: record.currentLease }
    case 'settled':
      return { kind: 'noop', reason: 'settled' }
  }
}
