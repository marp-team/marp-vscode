const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')

module.exports = ({ outputPath, production, minimizerFormat }) => ({
  mode: production ? 'production' : 'none',
  resolve: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
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
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          implementation: esbuild,
          loader: 'tsx',
          target: 'es2021',
        },
      },
      {
        test: /\.css$/,
        type: 'asset/source',
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2021',
        format: minimizerFormat,
        keepNames: true,
      }),
    ],
  },
  plugins: [],
  performance: {
    hints: false,
  },
  devtool: production ? false : 'nosources-source-map',
})
