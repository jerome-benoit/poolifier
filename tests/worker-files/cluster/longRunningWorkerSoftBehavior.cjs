'use strict'
const { ClusterWorker } = require('../../../lib/index.cjs')
const { sleepTaskFunction } = require('../../test-utils.cjs')

/**
 *
 * @param data
 * @returns
 */
async function sleep (data) {
  return sleepTaskFunction(data, 50000)
}

module.exports = new ClusterWorker(sleep, {
  maxInactiveTime: 500,
})
