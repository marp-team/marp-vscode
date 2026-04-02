const j = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf-8'))

// Tables
for (let si = 0; si < j.length; si++) {
  const s = j[si]
  function findTables(elements, prefix) {
    for (const e of elements) {
      if (e.type === 'table') {
        console.log(
          prefix + 'Slide ' + (si + 1) + ': table ' + e.rows.length + ' rows',
        )
        e.rows.forEach((r, ri) => {
          r.cells.forEach((c, ci) => {
            console.log(
              '  [' +
                ri +
                ',' +
                ci +
                '] text="' +
                c.text.substring(0, 50).replace(/\n/g, '\\n') +
                '" runs=' +
                c.runs.length,
            )
          })
        })
      }
      if (e.type === 'container' && e.children) {
        findTables(e.children, prefix + '  ')
      }
    }
  }
  findTables(s.elements, '')
}

// Lists in containers
console.log('\n=== Lists ===')
for (let si = 0; si < j.length; si++) {
  const s = j[si]
  function findLists(elements, prefix) {
    for (const e of elements) {
      if (e.type === 'list') {
        console.log(
          prefix +
            'Slide ' +
            (si + 1) +
            ': list ' +
            (e.ordered ? 'OL' : 'UL') +
            ' ' +
            e.items.length +
            ' items',
        )
        e.items.forEach((it, ii) => {
          const txt = it.runs
            .map((r) => r.text)
            .join('')
            .substring(0, 50)
            .replace(/\n/g, '\\n')
          console.log('  [' + ii + '] level=' + it.level + ' "' + txt + '"')
        })
      }
      if (e.type === 'container' && e.children) {
        findLists(e.children, prefix + '  ')
      }
    }
  }
  findLists(s.elements, '')
}
