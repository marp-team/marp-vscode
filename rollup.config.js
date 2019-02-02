import path from 'path'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript'
import pkg from './package.json'

const plugins = [
  json({ preferConst: true }),
  nodeResolve({ jsnext: true }),
  commonjs(),
  typescript({ resolveJsonModule: false }),
  !process.env.ROLLUP_WATCH && terser(),
]

const sourcemap = !!process.env.ROLLUP_WATCH

export default [
  {
    external: [...Object.keys(pkg.dependencies)],
    input: `src/${path.basename(pkg.main, '.js')}.ts`,
    output: { exports: 'named', file: pkg.main, format: 'cjs', sourcemap },
    plugins,
  },
  {
    input: 'src/preview.ts',
    output: { file: 'lib/preview.js', format: 'iife', sourcemap },
    plugins,
  },
]
