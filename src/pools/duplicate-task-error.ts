import type { TaskUUID } from '../utility-types.js'

export class DuplicateTaskError extends Error {
  override readonly name = 'DuplicateTaskError'

  public constructor (readonly taskId: TaskUUID) {
    super(`Task already registered: '${taskId}'`)
  }
}
