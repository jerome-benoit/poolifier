import type { WorkerLease } from './lifecycle-types.js'

export type TaskFunctionTransactionFailure = Readonly<{
  cause: unknown
  lease?: WorkerLease
  phase: 'compensation' | 'forward' | 'replay' | 'topology' | 'validation'
}>

export class TaskFunctionTransactionError extends Error {
  public override readonly name = 'TaskFunctionTransactionError'

  public constructor (
    public readonly operationId: string,
    public readonly failures: readonly TaskFunctionTransactionFailure[]
  ) {
    super(`Task function transaction '${operationId}' failed`, {
      cause: failures[0]?.cause,
    })
  }
}
