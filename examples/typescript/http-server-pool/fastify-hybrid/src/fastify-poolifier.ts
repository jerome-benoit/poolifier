import type { TransferListItem } from 'worker_threads'
import { DynamicThreadPool, availableParallelism } from 'poolifier'
import { type FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import {
  type FastifyPoolifierOptions,
  type ThreadWorkerData,
  type ThreadWorkerResponse
} from './types.js'

const fastifyPoolifierPlugin: FastifyPluginCallback<FastifyPoolifierOptions> = (
  fastify,
  options,
  done
) => {
  options = {
    ...{
      minWorkers: 1,
      maxWorkers: availableParallelism()
    },
    ...options
  }
  const pool = new DynamicThreadPool<ThreadWorkerData, ThreadWorkerResponse>(
    options.minWorkers as number,
    options.maxWorkers as number,
    options.workerFile,
    options
  )
  if (!fastify.hasDecorator('pool')) {
    fastify.decorate('pool', pool)
  }
  if (!fastify.hasDecorator('execute')) {
    fastify.decorate(
      'execute',
      async (
        data?: ThreadWorkerData,
        name?: string,
        transferList?: TransferListItem[]
      ): Promise<ThreadWorkerResponse> =>
        await pool.execute(data, name, transferList)
    )
  }
  if (!fastify.hasDecorator('listTaskFunctions')) {
    fastify.decorate('listTaskFunctions', (): string[] =>
      pool.listTaskFunctions()
    )
  }
  done()
}

export const fastifyPoolifier = fp(fastifyPoolifierPlugin, {
  fastify: '4.x',
  name: 'fastify-poolifier'
})
