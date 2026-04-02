#!/usr/bin/env node
/**
 * Diagnostic tool for native PPTX generation.
 *
 * Usage:
 *   node src/native-pptx/tools/diagnose-pptx.js <marp-html-path> [chrome-path]
 *
 * Outputs:
 *   <input>.slides.json  — extracted SlideData[] from DOM walker
 *
 * This script runs the DOM walker in Chrome outside of VS Code,
 * allowing quick iteration on fidelity improvements.
 */
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function main() {
  const htmlPath = process.argv[2]
  const chromePath =
    process.argv[3] ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

  if (!htmlPath) {
    console.error(
      'Usage: node src/native-pptx/tools/diagnose-pptx.js <marp-html-path> [chrome-path]',
    )
    process.exit(1)
  }

  const absHtmlPath = path.resolve(htmlPath)
  if (!fs.existsSync(absHtmlPath)) {
    console.error(`File not found: ${absHtmlPath}`)
    process.exit(1)
  }

  // Extract the DOM walker IIFE from the generated TS file
  const domWalkerScriptPath = path.join(
    __dirname,
    '..',
    'dom-walker-script.generated.ts',
  )
  if (!fs.existsSync(domWalkerScriptPath)) {
    console.error('DOM walker script not generated. Run "npm run build" first.')
    process.exit(1)
  }
  const generatedContent = fs.readFileSync(domWalkerScriptPath, 'utf-8')
  // Match both template literal and string literal formats
  let domWalkerScript
  const tmplMatch = generatedContent.match(
    /export const DOM_WALKER_SCRIPT = `([\s\S]+?)`;/,
  )
  if (tmplMatch) {
    domWalkerScript = tmplMatch[1]
  } else {
    const strMatch = generatedContent.match(
      /export const DOM_WALKER_SCRIPT = "([\s\S]+?)"\s*$/,
    )
    if (strMatch) {
      // Unescape the JSON-style string
      domWalkerScript = JSON.parse(`"${strMatch[1]}"`)
    }
  }
  if (!domWalkerScript) {
    console.error('Could not extract DOM_WALKER_SCRIPT from generated file')
    process.exit(1)
  }

  // Use puppeteer-core directly
  const puppeteer = require('puppeteer-core')

  console.log(`HTML: ${absHtmlPath}`)
  console.log(`Chrome: ${chromePath}`)
  console.log('')

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })

    const fileUrl = pathToFileURL(absHtmlPath).href
    console.log(`Loading: ${fileUrl}`)
    await page.goto(fileUrl, { waitUntil: 'networkidle0' })

    // Inject DOM walker and extract
    await page.addScriptTag({ content: domWalkerScript })
    const slides = await page.evaluate(() => globalThis.extractSlides())

    // Save JSON
    const jsonPath = absHtmlPath.replace(/\.html?$/i, '') + '.slides.json'
    fs.writeFileSync(jsonPath, JSON.stringify(slides, null, 2), 'utf-8')
    console.log(`\nSlides JSON: ${jsonPath}`)
    console.log(`  Slides: ${slides.length}`)
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]
      console.log(
        `  Slide ${i + 1}: ${s.elements.length} elements, bg=${s.background}`,
      )
      for (const el of s.elements) {
        const summary =
          el.type === 'heading'
            ? `h${el.level}: "${(el.runs?.[0]?.text ?? '').substring(0, 40)}"`
            : el.type === 'paragraph'
              ? `p: "${(el.runs?.[0]?.text ?? '').substring(0, 40)}"`
              : el.type === 'list'
                ? `list(${el.items?.length ?? 0} items, ordered=${el.ordered ?? false})`
                : el.type === 'table'
                  ? `table(${el.rows?.length ?? 0} rows)`
                  : el.type === 'code'
                    ? `code(${el.language})`
                    : el.type === 'image'
                      ? `image: ${(el.src ?? '').substring(0, 60)}`
                      : el.type === 'container'
                        ? `container(${el.children?.length ?? 0} children)`
                        : el.type
        console.log(
          `    - ${summary}  [${Math.round(el.x)},${Math.round(el.y)} ${Math.round(el.width)}x${Math.round(el.height)}]`,
        )
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
