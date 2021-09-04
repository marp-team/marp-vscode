const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')

module.exports = ({ outputPath, production }) => ({
  mode: production ? 'production' : 'none',
  resolve: { extensions: ['.ts', '.js'] },
  entry: `./src/${path.basename(outputPath, '.js')}.ts`,
  output: {
    filename: path.basename(outputPath),
    path: path.dirname(outputPath),
    libraryTarget: 'commonjs',
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
    minimizer: [new ESBuildMinifyPlugin({ target: 'es2019', keepNames: true })],
  },
  performance: {
    hints: false,
  },
  devtool: production ? false : 'nosources-source-map',
})
