const path = require('node:path')
const esbuild = require('esbuild')
const { EsbuildPlugin } = require('esbuild-loader')
const { NormalModuleReplacementPlugin } = require('webpack')

module.exports = ({ outputPath, production, minimizerFormat }) => ({
  mode: production ? 'production' : 'none',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: `./src/${path.basename(outputPath, '.js')}.ts`,
  output: {
    filename: path.basename(outputPath),
    path: path.dirname(outputPath),
    clean: !!production,
    library: { type: 'commonjs' },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'esbuild-loader',
        options: {
          implementation: esbuild,
          target: 'es2021',
        },
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  optimization: {
    minimizer: [
      new EsbuildPlugin({
        target: 'es2021',
        format: minimizerFormat,
        keepNames: true,
      }),
    ],
  },
  plugins: [
    // Remove 'node:' prefix
    new NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, '')
    }),
  ],
  performance: {
    hints: false,
  },
  devtool: production ? false : 'nosources-source-map',
})
