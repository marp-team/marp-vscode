// PostCSS configuration for view styles
module.exports = {
  plugins: [require('autoprefixer'), require('cssnano')({ preset: 'default' })],
}
