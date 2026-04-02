#!/usr/bin/env node
/**
 * Quick PPTX generator for fidelity testing.
 *
 * Usage:
 *   node src/native-pptx/tools/gen-pptx.js <html-path> [output-pptx-path] [chrome-path]
 *
 * Requires: npm run build (to compile lib/native-pptx.cjs)
 *
 * This is a thin CLI wrapper around the production generateNativePptx()
 * pipeline.  All slide extraction, rasterization, and PPTX building logic
 * lives in src/native-pptx/ and is bundled into lib/native-pptx.cjs by
 * src/native-pptx/scripts/build-native-pptx-bundle.js.
 */
const fs = require('node:fs')
const path = require('node:path')

/** Auto-detect Chrome/Chromium on the host system. */
function findChrome() {
  try {
    const {
      computeSystemExecutablePath,
      Browser,
      ChromeReleaseChannel,
    } = require('@puppeteer/browsers')
    const platforms = { win32: 'win64', darwin: 'mac', linux: 'linux' }
    const platform = platforms[process.platform]
    if (!platform) return undefined
    const p = computeSystemExecutablePath({
      browser: Browser.CHROME,
      platform,
      channel: ChromeReleaseChannel.STABLE,
    })
    if (fs.existsSync(p)) return p
  } catch {
    /* not found */
  }
  return undefined
}

async function main() {
  const htmlPath = path.resolve(process.argv[2])
  const outPath = path.resolve(
    process.argv[3] ?? htmlPath.replace(/\.html?$/i, '-native.pptx'),
  )
  const browserPath = process.argv[4] ?? process.env.CHROME_PATH ?? findChrome()

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file not found:', htmlPath)
    process.exit(1)
  }
  if (!browserPath) {
    console.error(
      'Chrome not found. Set CHROME_PATH env var or pass as 3rd argument.',
    )
    process.exit(1)
  }

  const bundlePath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'lib',
    'native-pptx.cjs',
  )
  if (!fs.existsSync(bundlePath)) {
    console.error('lib/native-pptx.cjs not found. Run: npm run build')
    process.exit(1)
  }

  const { generateNativePptx } = require(bundlePath)

  console.log(`HTML:    ${htmlPath}`)
  console.log(`Browser: ${browserPath}`)

  const debugJsonPath = process.env.MARP_PPTX_DEBUG
    ? outPath.replace(/\.pptx$/i, '.json')
    : undefined

  const buffer = await generateNativePptx({
    htmlPath,
    browserPath,
    debugJsonPath,
  })

  fs.writeFileSync(outPath, buffer)
  console.log(`Written: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
