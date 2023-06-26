const { expect } = require('expect')
const { ClusterWorker } = require('../../lib')

describe('Cluster worker test suite', () => {
  let numberOfMessagesSent = 0
  const send = function () {
    ++numberOfMessagesSent
  }
  class SpyWorker extends ClusterWorker {
    getMainWorker () {
      return { send }
    }
  }

  it('Verify worker has default maxInactiveTime', () => {
    const worker = new ClusterWorker(() => {})
    expect(worker.opts.maxInactiveTime).toStrictEqual(60000)
  })

  it('Verify that handleError() method works properly', () => {
    const errorMessage = 'Error as a string'
    const worker = new ClusterWorker(() => {})
    expect(worker.handleError(errorMessage)).toStrictEqual(errorMessage)
  })

  it('Verify worker invoke the getMainWorker() and send() methods', () => {
    const worker = new SpyWorker(() => {})
    worker.sendToMainWorker({ ok: 1 })
    expect(numberOfMessagesSent).toBe(1)
  })
})
