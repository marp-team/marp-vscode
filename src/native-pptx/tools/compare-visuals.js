#!/usr/bin/env node
/**
 * Visual fidelity comparison tool for native PPTX.
 *
 * Usage:
 *   node src/native-pptx/tools/compare-visuals.js <marp-html-path> <pptx-path> [chrome-path]
 *
 * Outputs (in a folder next to the HTML):
 *   html-slide-NNN.png  — screenshot of each Marp HTML slide
 *   pptx-slide-NNN.png  — screenshot via PPTX → PowerPoint COM → PNG
 *   compare-NNN.png     — side-by-side diff image (HTML left | PPTX right)
 *   compare-report.md   — textual summary of diff areas
 */
const { execSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

/** Auto-detect Chrome/Chromium on the host system. */
function findChrome() {
  const {
    computeSystemExecutablePath,
    Browser,
    ChromeReleaseChannel,
  } = require('@puppeteer/browsers')
  const platforms = { win32: 'win64', darwin: 'mac', linux: 'linux' }
  const platform = platforms[process.platform]
  if (!platform) return undefined
  try {
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

const WIDTH = 1280
const HEIGHT = 720

async function main() {
  const htmlPath = path.resolve(process.argv[2])
  const pptxPath = path.resolve(process.argv[3])
  const chromePath = process.argv[4] ?? process.env.CHROME_PATH ?? findChrome()

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML not found:', htmlPath)
    process.exit(1)
  }
  if (!fs.existsSync(pptxPath)) {
    console.error('PPTX not found:', pptxPath)
    process.exit(1)
  }

  const outDir = path.join(
    path.dirname(htmlPath),
    'compare-' + path.basename(htmlPath, '.html'),
  )
  fs.mkdirSync(outDir, { recursive: true })
  console.log('Output dir:', outDir)

  // ─── Step 1: HTML slide screenshots via Puppeteer ───────────────────────
  const puppeteer = require('puppeteer-core')
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

  let htmlSlideCount = 0
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: WIDTH, height: HEIGHT })
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' })

    // Let bespoke.js finish initializing
    await new Promise((r) => setTimeout(r, 500))

    // Force all bespoke fragments visible so screenshots show full slide content
    await page.addStyleTag({
      content:
        '[data-bespoke-marp-fragment=inactive]{visibility:visible!important;opacity:1!important}',
    })
    // Hide bespoke On-Screen Controller (navigation arrows/buttons) so they
    // never appear in screenshots. No-op for static non-bespoke HTMLs.
    await page.addStyleTag({
      content:
        '[data-bespoke-marp-osc]{display:none!important}.bespoke-marp-osc{display:none!important}',
    })

    // Count slides via bespoke or fallback DOM query
    const slideCount = await page.evaluate(() => {
      if (window.bespoke && window.bespoke.slides)
        return window.bespoke.slides.length
      const svgSections = document.querySelectorAll(
        'svg[data-marpit-svg] foreignobject section:not([data-marpit-advanced-background])',
      )
      if (svgSections.length > 0) return svgSections.length
      return document.querySelectorAll('section[data-marpit-pagination]').length
    })

    console.log(`HTML slide count: ${slideCount}`)
    htmlSlideCount = slideCount

    for (let i = 0; i < slideCount; i++) {
      // Navigate directly to slide N via URL hash — skips fragment animation offsets
      await page.evaluate((n) => {
        window.location.hash = '#' + n
      }, i + 1)
      // Wait for hash navigation to settle
      await new Promise((r) => setTimeout(r, 300))

      const slidePng = path.join(
        outDir,
        `html-slide-${String(i + 1).padStart(3, '0')}.png`,
      )
      await page.screenshot({
        path: slidePng,
        clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
      })
      process.stdout.write(`  HTML slide ${i + 1}/${slideCount} saved\r`)
    }
    console.log('\n  HTML slides done.')
  } finally {
    await browser.close()
  }

  // ─── Step 2: PPTX slide screenshots via PowerPoint COM ──────────────────
  console.log('Exporting PPTX slides via PowerShell/PowerPoint COM...')

  // Write a PS1 that takes paths via parameters to avoid escaping issues
  const psScriptPath = path.join(outDir, '_export-pptx.ps1')
  const psScript = `param(
  [string]$PptxPath,
  [string]$OutDir,
  [int]$Width = ${WIDTH},
  [int]$Height = ${HEIGHT}
)
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint
$app = New-Object -ComObject PowerPoint.Application
$app.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
try {
  $pres = $app.Presentations.Open($PptxPath, $true, $false, $false)
  $slideCount = $pres.Slides.Count
  Write-Host "PPTX slide count: $slideCount"
  for ($i = 1; $i -le $slideCount; $i++) {
    $slide = $pres.Slides($i)
    $outPath = Join-Path $OutDir ("pptx-slide-" + $i.ToString("D3") + ".png")
    $slide.Export($outPath, "PNG", $Width, $Height)
    Write-Host ("  PPTX slide $i/$slideCount saved")
  }
  $pres.Close()
} finally {
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
  [System.GC]::Collect()
}
`
  fs.writeFileSync(psScriptPath, psScript, 'utf-8')

  const psResult = spawnSync(
    'powershell',
    [
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      psScriptPath,
      '-PptxPath',
      pptxPath,
      '-OutDir',
      outDir,
    ],
    {
      encoding: 'utf-8',
      timeout: 300000, // 5 minutes (increased from 2 min for large decks)
    },
  )
  if (psResult.stdout) console.log(psResult.stdout)
  if (psResult.stderr) console.error('  PS STDERR:', psResult.stderr)

  // ─── Step 3: Pixel diff + Side-by-side comparison HTML report ──────────
  const pixelmatchMod = require('pixelmatch')
  const pixelmatch = pixelmatchMod.default ?? pixelmatchMod
  const { PNG } = require('pngjs')

  /**
   * Threshold for classifying a slide as failed/warned (fraction of pixels).
   *
   * HTML → PPTX conversion cannot be pixel-perfect: Chrome and PowerPoint use
   * different font rendering engines (Blink vs GDI+), causing heading heights
   * and line-break positions to differ by a few pixels.  These differences
   * cascade vertically, producing ~5-7% diff on text-heavy slides even when
   * the content is entirely correct.  7.5% is calibrated to the observed
   * font-metric noise floor; anything above it indicates a real layout defect.
   */
  const FAIL_THRESHOLD = 0.075 // >7.5% different pixels → FAIL (content defect)
  const WARN_THRESHOLD = 0.01 // >1% → WARN (font rendering noise)

  const htmlSlides = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('html-slide-'))
    .sort()
  const pptxSlides = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('pptx-slide-'))
    .sort()

  const maxSlides = Math.max(htmlSlides.length, pptxSlides.length)
  if (maxSlides === 0) {
    console.error('No slides found in output dir')
    process.exit(1)
  }

  console.log('\nRunning pixel diff...')

  /** @type {{ n: number, status: 'FAIL'|'WARN'|'OK'|'MISSING', diffPct: number }[]} */
  const slideResults = []

  for (let i = 0; i < maxSlides; i++) {
    const n = i + 1
    const pad = String(n).padStart(3, '0')
    const htmlImgPath = path.join(outDir, `html-slide-${pad}.png`)
    const pptxImgPath = path.join(outDir, `pptx-slide-${pad}.png`)
    const diffImgPath = path.join(outDir, `diff-slide-${pad}.png`)

    if (!fs.existsSync(htmlImgPath) || !fs.existsSync(pptxImgPath)) {
      slideResults.push({ n, status: 'MISSING', diffPct: 1 })
      continue
    }

    try {
      const img1 = PNG.sync.read(fs.readFileSync(htmlImgPath))
      const img2 = PNG.sync.read(fs.readFileSync(pptxImgPath))

      // Ensure both images are the same size (use the smaller dimensions)
      const w = Math.min(img1.width, img2.width)
      const h = Math.min(img1.height, img2.height)
      const diff = new PNG({ width: w, height: h })

      // Crop to common size if needed
      let data1 = img1.data,
        data2 = img2.data
      if (img1.width !== w || img1.height !== h) {
        // Reallocate with correct size
        const tmp = new PNG({ width: w, height: h })
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const s = (y * img1.width + x) * 4,
              d = (y * w + x) * 4
            tmp.data[d] = img1.data[s]
            tmp.data[d + 1] = img1.data[s + 1]
            tmp.data[d + 2] = img1.data[s + 2]
            tmp.data[d + 3] = img1.data[s + 3]
          }
        data1 = tmp.data
      }
      if (img2.width !== w || img2.height !== h) {
        const tmp = new PNG({ width: w, height: h })
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const s = (y * img2.width + x) * 4,
              d = (y * w + x) * 4
            tmp.data[d] = img2.data[s]
            tmp.data[d + 1] = img2.data[s + 1]
            tmp.data[d + 2] = img2.data[s + 2]
            tmp.data[d + 3] = img2.data[s + 3]
          }
        data2 = tmp.data
      }

      const numDiff = pixelmatch(data1, data2, diff.data, w, h, {
        threshold: 0.1,
      })
      const diffPct = numDiff / (w * h)
      const status =
        diffPct > FAIL_THRESHOLD
          ? 'FAIL'
          : diffPct > WARN_THRESHOLD
            ? 'WARN'
            : 'OK'

      fs.writeFileSync(diffImgPath, PNG.sync.write(diff))
      slideResults.push({ n, status, diffPct })
      process.stdout.write(
        `  Slide ${pad}: ${status} (${(diffPct * 100).toFixed(2)}% diff)\n`,
      )
    } catch (e) {
      slideResults.push({ n, status: 'FAIL', diffPct: 1 })
      console.warn(`  Slide ${pad}: pixel diff failed — ${e.message}`)
    }
  }

  // Print summary
  const fails = slideResults.filter((r) => r.status === 'FAIL')
  const warns = slideResults.filter((r) => r.status === 'WARN')
  const oks = slideResults.filter((r) => r.status === 'OK')
  console.log(`\n=== DIFF SUMMARY ===`)
  console.log(
    `  FAIL: ${fails.length}  WARN: ${warns.length}  OK: ${oks.length}  MISSING: ${slideResults.filter((r) => r.status === 'MISSING').length}`,
  )
  if (fails.length > 0)
    console.log(`  FAILed slides: ${fails.map((r) => r.n).join(', ')}`)
  if (warns.length > 0)
    console.log(`  WARNed slides: ${warns.map((r) => r.n).join(', ')}`)

  // Generate an HTML comparison report
  const STATUS_COLOR = {
    FAIL: '#f44',
    WARN: '#fa0',
    OK: '#4c4',
    MISSING: '#aaa',
  }
  const rows = []
  for (let i = 0; i < maxSlides; i++) {
    const n = i + 1
    const pad = String(n).padStart(3, '0')
    const htmlImg = htmlSlides[i] ? `html-slide-${pad}.png` : null
    const pptxImg = pptxSlides[i] ? `pptx-slide-${pad}.png` : null
    const diffImg = fs.existsSync(path.join(outDir, `diff-slide-${pad}.png`))
      ? `diff-slide-${pad}.png`
      : null
    const result = slideResults.find((r) => r.n === n) ?? {
      status: 'MISSING',
      diffPct: 1,
    }
    const bgColor = STATUS_COLOR[result.status]
    const diffLabel =
      result.status === 'MISSING'
        ? 'MISSING'
        : `${result.status} (${(result.diffPct * 100).toFixed(2)}%)`
    rows.push(`
    <tr>
      <td style="padding:4px;font-weight:bold;vertical-align:middle;background:${bgColor};color:#fff;text-align:center">
        ${n}<br><small>${diffLabel}</small>
      </td>
      <td style="padding:4px">
        ${htmlImg ? `<img src="${htmlImg}" width="426" style="border:1px solid #ccc" alt="HTML ${n}">` : '<em>missing</em>'}
        <br><small>Marp HTML</small>
      </td>
      <td style="padding:4px">
        ${pptxImg ? `<img src="${pptxImg}" width="426" style="border:1px solid #ccc" alt="PPTX ${n}">` : '<em>missing</em>'}
        <br><small>PPTX (native)</small>
      </td>
      <td style="padding:4px">
        ${diffImg ? `<img src="${diffImg}" width="426" style="border:1px solid #ccc" alt="DIFF ${n}">` : '<em>—</em>'}
        <br><small>Pixel diff</small>
      </td>
    </tr>`)
  }

  const reportHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Native PPTX Fidelity Comparison — ${path.basename(htmlPath)}</title>
<style>
  body { font-family: sans-serif; margin: 16px; background: #f5f5f5; }
  h1 { font-size: 18px; }
  .summary { background:#fff; border:1px solid #ccc; padding:8px 16px; margin-bottom:12px; border-radius:4px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:3px; color:#fff; font-weight:bold; margin:2px; }
  .FAIL  { background: #f44; }
  .WARN  { background: #fa0; }
  .OK    { background: #4c4; }
  .MISSING { background: #aaa; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #333; color: #fff; padding: 6px 12px; text-align: left; }
  tr:nth-child(even) { background: #eee; }
  td { vertical-align: top; }
  img { display: block; }
</style>
</head>
<body>
<h1>Native PPTX Fidelity: ${path.basename(htmlPath)}</h1>
<p>Generated: ${new Date().toLocaleString('ja-JP')}</p>
<div class="summary">
  <span class="badge FAIL">FAIL ${fails.length}</span>
  <span class="badge WARN">WARN ${warns.length}</span>
  <span class="badge OK">OK ${oks.length}</span>
  ${fails.length > 0 ? `<br><strong>Failed slides:</strong> ${fails.map((r) => `<a href="#slide-${r.n}">${r.n}</a>`).join(', ')}` : ''}
  ${warns.length > 0 ? `<br><strong>Warning slides:</strong> ${warns.map((r) => `<a href="#slide-${r.n}">${r.n}</a>`).join(', ')}` : ''}
</div>
<table>
  <thead>
    <tr>
      <th style="width:80px"># / Score</th>
      <th>Source (Marp HTML)</th>
      <th>Output (Native PPTX)</th>
      <th>Pixel Diff</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('\n')}
  </tbody>
</table>
</body>
</html>`

  const reportPath = path.join(outDir, 'compare-report.html')
  fs.writeFileSync(reportPath, reportHtml, 'utf-8')
  console.log('\nComparison report:', reportPath)
  console.log(
    `  ${maxSlides} slides compared (HTML: ${htmlSlides.length}, PPTX: ${pptxSlides.length})`,
  )

  // Exit with non-zero code if any FAIL so CI/loops can detect regressions
  if (fails.length > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
