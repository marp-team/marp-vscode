#!/usr/bin/env node
/**
 * Convert a Marp markdown file to standalone HTML using marp-core.
 * Usage: node src/native-pptx/tools/md-to-html.js <input.md> <output.html>
 */
const { readFileSync, writeFileSync } = require('node:fs')
const { resolve, dirname } = require('node:path')

const [, , inputArg, outputArg] = process.argv
if (!inputArg || !outputArg) {
  console.error('Usage: node src/native-pptx/tools/md-to-html.js <input.md> <output.html>')
  process.exit(1)
}

const inputPath = resolve(inputArg)
const outputPath = resolve(outputArg)

// Dynamically load Marp to avoid issues with different module formats
async function main() {
  // Try require for CJS, fallback to dynamic import for ESM
  let Marp
  try {
    const mod = require('@marp-team/marp-core')
    Marp = mod.Marp ?? mod.default?.Marp ?? mod.default
  } catch {
    const mod = await import('@marp-team/marp-core')
    Marp = mod.Marp ?? mod.default?.Marp ?? mod.default
  }

  if (!Marp) {
    console.error('Could not load Marp from @marp-team/marp-core')
    process.exit(1)
  }

  const marp = new Marp({ html: true })
  const markdown = readFileSync(inputPath, 'utf-8')
  const { html, css } = marp.render(markdown)

  const standalone = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,height=device-height,initial-scale=1.0">
<style>
${css}
body { margin: 0; }
</style>
</head>
<body>
${html}
</body>
</html>`

  writeFileSync(outputPath, standalone, 'utf-8')
  console.log(`Written: ${outputPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
