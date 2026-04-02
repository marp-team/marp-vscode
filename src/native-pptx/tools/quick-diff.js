const pixelmatchMod = require('pixelmatch')
const pixelmatch = pixelmatchMod.default || pixelmatchMod
const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')
const FAIL_T = 0.075,
  WARN_T = 0.01 // 7.5%: font-metric noise floor for HTML→PPTX
const dir = 'C:/Temp/compare-test-pptx-export'
const slides = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith('html-slide-'))
  .sort()
const results = []
for (const f of slides) {
  const n = parseInt(f.match(/(\d+)/)[1])
  const hp = path.join(dir, f)
  const pp = path.join(dir, f.replace('html-', 'pptx-'))
  if (!fs.existsSync(pp)) {
    results.push({ n, status: 'MISSING', pct: 1 })
    continue
  }
  const img1 = PNG.sync.read(fs.readFileSync(hp))
  const img2 = PNG.sync.read(fs.readFileSync(pp))
  const w = Math.min(img1.width, img2.width),
    h = Math.min(img1.height, img2.height)
  const diff = new PNG({ width: w, height: h })
  const nd = pixelmatch(img1.data, img2.data, diff.data, w, h, {
    threshold: 0.1,
  })
  const pct = nd / (w * h)
  const status = pct > FAIL_T ? 'FAIL' : pct > WARN_T ? 'WARN' : 'OK'
  results.push({ n, status, pct })
  process.stdout.write(
    'Slide ' +
      String(n).padStart(3, '0') +
      ': ' +
      status +
      ' (' +
      (pct * 100).toFixed(2) +
      '%)\n',
  )
}
const fails = results.filter((r) => r.status === 'FAIL')
const warns = results.filter((r) => r.status === 'WARN')
const oks = results.filter((r) => r.status === 'OK')
console.log('=== SUMMARY ===')
console.log(
  'FAIL:' + fails.length + '  WARN:' + warns.length + '  OK:' + oks.length,
)
if (fails.length)
  console.log(
    'FAILed slides:',
    fails.map((r) => r.n + '(' + (r.pct * 100).toFixed(1) + '%)').join(', '),
  )
if (warns.length)
  console.log(
    'WARNed slides:',
    warns.map((r) => r.n + '(' + (r.pct * 100).toFixed(1) + '%)').join(', '),
  )
