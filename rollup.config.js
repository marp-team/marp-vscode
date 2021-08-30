// Rollup is used to bundle the code for Node.js extension.
import path from 'path'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import builtinModules from 'builtin-modules'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const compact = !process.env.ROLLUP_WATCH
const sourcemap = !compact

const plugins = [
  json({ preferConst: true }),
  nodeResolve({ mainFields: ['module', 'jsnext:main', 'main'] }),
  commonjs(),
  typescript(),
  compact && terser(),
]

export default [
  {
    external: [...Object.keys(pkg.dependencies), ...builtinModules, 'vscode'],
    input: `src/${path.basename(pkg.main, '.js')}.ts`,
    output: {
      compact,
      exports: 'named',
      file: pkg.main,
      format: 'cjs',
      sourcemap,
    },
    plugins,
  },
  {
    input: 'preview.js',
    output: { compact, file: 'lib/preview.js', format: 'iife', sourcemap },
    plugins,
  },
]
