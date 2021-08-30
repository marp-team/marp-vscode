import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export const compact = !process.env.ROLLUP_WATCH
export const sourcemap = !compact

export const plugins = ({ browser = false } = {}) => [
  json({ preferConst: true }),
  nodeResolve({ browser }),
  commonjs(),
  typescript(),
  compact && terser(),
]
