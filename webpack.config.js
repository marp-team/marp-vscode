// Webpack is used to bundle the code for Web extension.
const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')
const { ProvidePlugin } = require('webpack')
const pkg = require('./package.json')

const output = path.resolve(__dirname, pkg.browser)

module.exports = ({ production }) => ({
  mode: production ? 'production' : 'none',
  target: 'webworker',
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],
    alias: {
      [path.resolve(__dirname, './src/commands/export')]: path.resolve(
        __dirname,
        './src/web/commands/export'
      ),

      // Provides alternate implementation for node module and source files
      'abort-controller': require.resolve('abort-controller/browser'),
    },
    fallback: {
      // Node.js polyfills
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
    },
  },
  entry: `./src/${path.basename(output, '.js')}.ts`,
  output: {
    filename: path.basename(output),
    path: path.dirname(output),
    libraryTarget: 'commonjs',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          implementation: esbuild,
          loader: 'ts',
          target: 'es2019',
        },
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  optimization: {
    minimizer: [new ESBuildMinifyPlugin({ target: 'es2019' })],
  },
  performance: {
    hints: false,
  },
  plugins: [new ProvidePlugin({ process: 'process/browser.js' })],
  devtool: production ? false : 'nosources-source-map',
})
