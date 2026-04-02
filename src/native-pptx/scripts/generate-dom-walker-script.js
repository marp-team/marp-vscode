/**
 * Generate a self-contained browser script from dom-walker.ts.
 *
 * The DOM walker functions need to run inside Puppeteer's browser context via
 * page.addScriptTag(). When bundled by webpack's main build, esbuild's
 * keepNames option injects module-scope helper references (e.g. `t(fn, name)`)
 * that don't survive page.evaluate() serialization.
 *
 * This script compiles dom-walker.ts separately using esbuild, producing a
 * standalone IIFE that can be safely injected into any browser context.
 * The compiled code is embedded as a string constant in a TypeScript module.
 */
const fs = require('node:fs')
const path = require('node:path')
const esbuild = require('esbuild')

const result = esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../dom-walker.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'DomWalker',
  target: 'es2021',
  write: false,
  minify: false,
})

const jsCode = result.outputFiles[0].text
const wrappedCode =
  jsCode + '\nglobalThis.extractSlides = DomWalker.extractSlides;\n'

const output = `// AUTO-GENERATED FILE — Do not edit manually.
// Run "npm run generate:dom-walker-script" to regenerate from dom-walker.ts.

export const DOM_WALKER_SCRIPT = ${JSON.stringify(wrappedCode)}
`

const outPath = path.resolve(__dirname, '../dom-walker-script.generated.ts')
fs.writeFileSync(outPath, output)

console.log('Generated: src/native-pptx/dom-walker-script.generated.ts')
