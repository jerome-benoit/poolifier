import { KillBehaviors, ThreadWorker } from '../../../lib/index.cjs'
import { sleepTaskFunction } from '../../test-utils.cjs'

/**
 *
 * @param data
 * @returns
 */
async function error (data) {
  return sleepTaskFunction(
    data,
    2000,
    true,
    'Error Message from ThreadWorker:async'
  )
}

export default new ThreadWorker(error, {
  killBehavior: KillBehaviors.HARD,
  maxInactiveTime: 500,
})
