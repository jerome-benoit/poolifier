import type { AddressInfo } from 'node:net'
import { ClusterWorker } from 'poolifier'
import Fastify, { type FastifyInstance } from 'fastify'
import type { ClusterWorkerData, ClusterWorkerResponse } from './types.js'
import { fastifyPoolifier } from './fastify-poolifier.js'

class FastifyWorker extends ClusterWorker<
ClusterWorkerData,
ClusterWorkerResponse
> {
  private static fastify: FastifyInstance

  private static readonly startFastify = async (
    workerData?: ClusterWorkerData
  ): Promise<ClusterWorkerResponse> => {
    const { port } = workerData as ClusterWorkerData
    FastifyWorker.fastify = Fastify({
      logger: true
    })

    await FastifyWorker.fastify.register(fastifyPoolifier, workerData)

    FastifyWorker.fastify.all('/api/echo', async (request) => {
      return (
        await FastifyWorker.fastify.execute({ body: request.body }, 'echo')
      ).body
    })

    FastifyWorker.fastify.get<{
      Params: { number: number }
    }>('/api/factorial/:number', async (request) => {
      const { number } = request.params
      return (
        await FastifyWorker.fastify.execute({ body: { number } }, 'factorial')
      ).body
    })

    await FastifyWorker.fastify.listen({ port })
    return {
      status: true,
      port: (FastifyWorker.fastify.server.address() as AddressInfo).port
    }
  }

  public constructor () {
    super(FastifyWorker.startFastify, {
      killHandler: async () => {
        await FastifyWorker.fastify.close()
      }
    })
  }
}

export const fastifyWorker = new FastifyWorker()
