const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')

const builtViewsDir = path.resolve(__dirname, 'tmp/views')

module.exports = ({ outputPath, production, minimizerFormat }) => ({
  mode: production ? 'production' : 'none',
  resolve: {
    alias: {
      // Use a built resulr of view script if the script was loaded through `@view-scripts` aliased namespace
      '@view-scripts': builtViewsDir,
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
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
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          implementation: esbuild,
          loader: 'tsx',
          target: 'es2021',
        },
      },
      {
        test: (path) => path.startsWith(builtViewsDir),
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
