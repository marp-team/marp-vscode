const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')
const { version: mathjaxVersion } = require('mathjax-full/package.json')
const { DefinePlugin } = require('webpack')

module.exports = ({ outputPath, production, minimizerFormat }) => ({
  mode: production ? 'production' : 'none',
  resolve: { extensions: ['.ts', '.js'] },
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
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2019',
        format: minimizerFormat,
        keepNames: true,
      }),
    ],
  },
  performance: {
    hints: false,
  },
  plugins: [
    // Workaround for https://github.com/mathjax/MathJax/issues/2880
    // @see https://github.com/mathjax/MathJax-src/issues/818
    new DefinePlugin({
      PACKAGE_VERSION: JSON.stringify(mathjaxVersion),
    }),
  ],
  devtool: production ? false : 'nosources-source-map',
})
