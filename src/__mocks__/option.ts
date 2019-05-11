module.exports = new Proxy(require.requireActual('../option'), {
  get: (target, prop) => {
    target.clearMarpCoreOptionCache() // Disable option cache while running test
    return target[prop]
  },
})
