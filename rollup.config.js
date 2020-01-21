import path from 'path'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import builtinModules from 'builtin-modules'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const plugins = [
  alias({
    entries: {
      // TODO: Remove aliasing if rollup bug was fixed
      // @see https://github.com/rollup/plugins/issues/102
      '@marp-team/marp-core/browser': require.resolve(
        '@marp-team/marp-core/lib/browser.cjs'
      ),
    },
  }),
  json({ preferConst: true }),
  nodeResolve({ mainFields: ['module', 'jsnext:main', 'main'] }),
  commonjs(),
  typescript({ resolveJsonModule: false }),
  !process.env.ROLLUP_WATCH && terser(),
]

const sourcemap = !!process.env.ROLLUP_WATCH

export default [
  {
    external: [...Object.keys(pkg.dependencies), ...builtinModules, 'vscode'],
    input: `src/${path.basename(pkg.main, '.js')}.ts`,
    output: { exports: 'named', file: pkg.main, format: 'cjs', sourcemap },
    plugins,
  },
  {
    input: 'preview.js',
    output: { file: 'lib/preview.js', format: 'iife', sourcemap },
    plugins,
  },
]
