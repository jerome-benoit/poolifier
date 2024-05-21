import { ThreadWorker } from 'poolifier'

import type { DataPayload, WorkerData, WorkerResponse } from './types.js'

class RequestHandlerWorker<
  Data extends WorkerData<DataPayload>,
  Response extends WorkerResponse<DataPayload>
> extends ThreadWorker<Data, Response> {
  private static readonly factorial = (n: number | bigint): bigint => {
    if (n === 0 || n === 1) {
      return 1n
    } else {
      n = BigInt(n)
      let factorial = 1n
      for (let i = 1n; i <= n; i++) {
        factorial *= i
      }
      return factorial
    }
  }

  public constructor () {
    super({
      echo: (workerData?: Data) => {
        return workerData as unknown as Response
      },
      factorial: (workerData?: Data) => {
        return {
          data: {
            number: RequestHandlerWorker.factorial(workerData!.data.number!)
          }
        } as unknown as Response
      }
    })
  }
}

export const requestHandlerWorker = new RequestHandlerWorker<
WorkerData<DataPayload>,
WorkerResponse<DataPayload>
>()
