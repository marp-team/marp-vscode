/**
 * Bundle the native-pptx module as a standalone CJS module for CLI tools.
 *
 * The webpack build bundles everything into lib/extension.js (VS Code entry
 * point) which depends on the 'vscode' module.  CLI scripts like gen-pptx.js
 * and compare-visuals.js need the native-pptx pipeline without VS Code.
 *
 * This script uses esbuild to produce lib/native-pptx.cjs — a self-contained
 * Node.js module that exports { generateNativePptx }.  External dependencies
 * (puppeteer-core, pptxgenjs) are kept external so they resolve from
 * node_modules at runtime.
 */
const path = require('node:path')
const esbuild = require('esbuild')

esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../index.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: path.resolve(__dirname, '../../../lib/native-pptx.cjs'),
  external: ['puppeteer-core', 'pptxgenjs'],
  logLevel: 'info',
})
