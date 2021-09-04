const path = require('path')
const base = require('./webpack.base.config')

const outputPath = path.resolve(__dirname, './preview/preview.js')

module.exports = (env) => ({
  ...base({ ...env, outputPath }),
  target: 'web',
  entry: `./preview.js`,
})
