import { compact, sourcemap, plugins } from './rollup.setup'

export default {
  input: 'preview.js',
  output: { compact, file: 'preview/preview.js', format: 'iife', sourcemap },
  plugins: plugins({ browser: true }),
}
