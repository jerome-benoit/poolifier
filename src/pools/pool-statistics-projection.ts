import type { PoolInfo } from './pool.js'
import type { TaskStatisticsRequirements } from './selection-strategies/selection-strategies-types.js'
import type { WorkerUsage } from './worker.js'

import { average, max, median, min, round } from '../utils.js'

export type PoolStatisticsProjection = Pick<
  PoolInfo,
  'elu' | 'runTime' | 'waitTime'
>

const projectMeasurement = (
  usages: readonly WorkerUsage[],
  measurement: 'runTime' | 'waitTime',
  requirements: TaskStatisticsRequirements['runTime']
): NonNullable<PoolInfo['runTime']> => {
  const history = usages.reduce<number[]>(
    (values, usage) => values.concat(usage[measurement].history.toArray()),
    []
  )
  return {
    maximum: round(
      max(
        ...usages.map(
          usage => usage[measurement].maximum ?? Number.NEGATIVE_INFINITY
        )
      )
    ),
    minimum: round(
      min(
        ...usages.map(
          usage => usage[measurement].minimum ?? Number.POSITIVE_INFINITY
        )
      )
    ),
    ...(requirements.average && { average: round(average(history)) }),
    ...(requirements.median && { median: round(median(history)) }),
  }
}

const projectEluMeasurement = (
  usages: readonly WorkerUsage[],
  measurement: 'active' | 'idle',
  requirements: TaskStatisticsRequirements['elu']
): NonNullable<PoolInfo['elu']>['active'] => {
  const history = usages.reduce<number[]>(
    (values, usage) => values.concat(usage.elu[measurement].history.toArray()),
    []
  )
  return {
    maximum: round(
      max(
        ...usages.map(
          usage => usage.elu[measurement].maximum ?? Number.NEGATIVE_INFINITY
        )
      )
    ),
    minimum: round(
      min(
        ...usages.map(
          usage => usage.elu[measurement].minimum ?? Number.POSITIVE_INFINITY
        )
      )
    ),
    ...(requirements.average && { average: round(average(history)) }),
    ...(requirements.median && { median: round(median(history)) }),
  }
}

export const projectPoolStatistics = (
  usages: readonly WorkerUsage[],
  requirements: TaskStatisticsRequirements | undefined
): PoolStatisticsProjection => {
  return {
    ...(requirements?.runTime.aggregate === true && {
      runTime: projectMeasurement(usages, 'runTime', requirements.runTime),
    }),
    ...(requirements?.waitTime.aggregate === true && {
      waitTime: projectMeasurement(usages, 'waitTime', requirements.waitTime),
    }),
    ...(requirements?.elu.aggregate === true && {
      elu: {
        active: projectEluMeasurement(usages, 'active', requirements.elu),
        idle: projectEluMeasurement(usages, 'idle', requirements.elu),
        utilization: {
          average: round(
            average(usages.map(usage => usage.elu.utilization ?? 0))
          ),
          median: round(
            median(usages.map(usage => usage.elu.utilization ?? 0))
          ),
        },
      },
    }),
  }
}
