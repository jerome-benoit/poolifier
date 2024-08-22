import type { FastifyPluginCallback } from 'fastify'
import type { TransferListItem } from 'node:worker_threads'

import fp from 'fastify-plugin'
import { availableParallelism, DynamicThreadPool } from 'poolifier'

import type {
  FastifyPoolifierOptions,
  WorkerData,
  WorkerResponse,
} from './types.js'

const fastifyPoolifierPlugin: FastifyPluginCallback<FastifyPoolifierOptions> = (
  fastify,
  options,
  done
) => {
  options = {
    ...{
      maxWorkers: availableParallelism(),
      minWorkers: 1,
    },
    ...options,
  }
  const { maxWorkers, minWorkers, workerFile, ...poolOptions } = options
  const pool = new DynamicThreadPool<WorkerData, WorkerResponse>(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    minWorkers!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    maxWorkers!,
    workerFile,
    poolOptions
  )
  if (!fastify.hasDecorator('pool')) {
    fastify.decorate('pool', pool)
  }
  if (!fastify.hasDecorator('execute')) {
    fastify.decorate(
      'execute',
      async (
        data?: WorkerData,
        name?: string,
        transferList?: readonly TransferListItem[]
      ): Promise<WorkerResponse> => await pool.execute(data, name, transferList)
    )
  }
  done()
}

export const fastifyPoolifier = fp(fastifyPoolifierPlugin, {
  fastify: '4.x',
  name: 'fastify-poolifier',
})
