const path = require('path')
const esbuild = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

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
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                auto: true,
                exportLocalsConvention: 'camelCase',
                localIdentName: production
                  ? '[hash:base64]'
                  : '[path][name]__[local]',
              },
            },
          },
          'postcss-loader',
        ],
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
  plugins: [new MiniCssExtractPlugin()],
  performance: {
    hints: false,
  },
  devtool: production ? false : 'nosources-source-map',
})
