const path = require('node:path')
const { optimize } = require('webpack')
const base = require('./webpack.base.config')

const outputPath = path.resolve(__dirname, './preview/preview.js')

module.exports = (env) => {
  const conf = base({ ...env, outputPath, minimizerFormat: 'iife' })

  return {
    ...conf,
    target: 'web',
    entry: `./preview.js`,
    output: {
      ...conf.output,
      library: undefined,
    },
    optimization: {
      ...conf.optimization,
      splitChunks: false,
    },
    plugins: [
      ...(conf.plugins || []),
      new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
  }
}
