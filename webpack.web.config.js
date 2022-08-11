const path = require('path')
const { ProvidePlugin } = require('webpack')
const pkg = require('./package.json')
const base = require('./webpack.base.config')

const outputPath = path.resolve(__dirname, pkg.browser)

module.exports = (env) => {
  const conf = base({ ...env, outputPath })

  return {
    ...conf,
    target: 'webworker',
    resolve: {
      ...conf.resolve,
      mainFields: ['browser', 'module', 'main'],
      alias: {
        [path.resolve(__dirname, './src/commands/export')]: path.resolve(
          __dirname,
          './src/web/commands/export'
        ),
        'abort-controller$': require.resolve('abort-controller/browser.mjs'),
      },
      fallback: {
        // Node.js polyfills
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
      },
    },
    plugins: [
      ...conf.plugins,
      new ProvidePlugin({ process: 'process/browser.js' }),
    ],
  }
}
