const path = require('path')
const base = require('./webpack.base.config')

const outputPath = path.resolve(__dirname, './views/[name].js')

module.exports = (env) => {
  const conf = base({ ...env, outputPath, minimizerFormat: 'iife' })

  return {
    ...conf,
    name: 'views',
    target: 'web',
    entry: {
      slides: './src/views/scripts/slides.tsx',
    },
    output: {
      ...conf.output,
      library: undefined,
    },
  }
}
