const path = require('path')
const pkg = require('./package.json')
const base = require('./webpack.base.config')

const outputPath = path.resolve(__dirname, pkg.main)
const dependencies = Object.keys(pkg.dependencies)

module.exports = (env) => {
  const conf = base({ ...env, outputPath })

  return {
    ...conf,
    name: 'node',
    dependencies: ['views'],
    target: 'node',
    externals: {
      ...conf.externals,
      ...dependencies.reduce((externals, dependency) => {
        externals[dependency] = `commonjs ${dependency}`
        return externals
      }, {}),
    },
  }
}
