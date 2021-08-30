import path from 'path'
import builtinModules from 'builtin-modules'
import pkg from './package.json'
import { compact, sourcemap, plugins } from './rollup.setup'

export default {
  external: [...Object.keys(pkg.dependencies), ...builtinModules, 'vscode'],
  input: `src/${path.basename(pkg.main, '.js')}.ts`,
  output: {
    compact,
    exports: 'named',
    file: pkg.main,
    format: 'cjs',
    sourcemap,
  },
  plugins: plugins(),
}
