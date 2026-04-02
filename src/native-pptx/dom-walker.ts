import type {
  BgImageData,
  SlideData,
  SlideElement,
  ImageElement,
  TextRun,
  TextStyle,
  ListItem,
  TableRow,
  TableCell,
} from './types'

/**
 * Extract structured slide data from the rendered DOM.
 *
 * **All helper functions are nested inside this function** so that Puppeteer's
 * `page.evaluate(extractSlides)` can serialise the entire function body in one
 * shot.  Because `page.evaluate` calls `Function.prototype.toString()` on the
 * argument, any references to module-scope variables would be lost after
 * serialisation.  Keeping everything inside a single closure avoids this
 * problem and remains safe even after webpack/esbuild minification (all
 * identifiers within the function body are renamed consistently).
 *
 * The function relies only on browser globals (`document`,
 * `getComputedStyle`, `Node`) and has no Node.js runtime imports.
 */
export function extractSlides(root: ParentNode = document): SlideData[] {
  // -----------------------------------------------------------------
  // Helper: find effective background color for a slide section
  // -----------------------------------------------------------------
  function findBackgroundColor(section: Element): string {
    // 1. Check section's own background-color
    const style = getComputedStyle(section)
    const bg = style.backgroundColor
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg
    }

    // 2. If background-color is transparent, try to extract a dominant color
    //    from CSS gradients in background-image
    const bgImage = style.backgroundImage
    if (bgImage && bgImage !== 'none') {
      const colorMatches = bgImage.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g)
      if (colorMatches && colorMatches.length > 0) {
        // Use the last non-transparent color from the gradient stops
        for (let i = colorMatches.length - 1; i >= 0; i--) {
          const c = colorMatches[i]
          if (c !== 'rgba(0, 0, 0, 0)') {
            // Check alpha for rgba colors
            const alphaMatch = c.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/)
            if (!alphaMatch || parseFloat(alphaMatch[1]) > 0.1) {
              return c
            }
          }
        }
      }
    }

    // 3. Default to white — do NOT walk up to body/html because Marp's
    //    HTML uses black body background for the "between slides" area
    return 'rgb(255, 255, 255)'
  }

  // -----------------------------------------------------------------
  // Helper: extract text style from CSSStyleDeclaration
  // -----------------------------------------------------------------
  function extractTextStyle(style: CSSStyleDeclaration): TextStyle {
    // Normalize CSS text-align: "start" → "left", "end" → "right"
    let textAlign = style.textAlign || 'left'
    if (textAlign === 'start') textAlign = 'left'
    else if (textAlign === 'end') textAlign = 'right'
    // Flex containers use justify-content for horizontal item alignment.
    // Map justify-content:center → textAlign:center so badge/label text is
    // horizontally centred in the PPTX text box.
    if (textAlign === 'left' && style.justifyContent === 'center') textAlign = 'center'

    return {
      color: style.color,
      fontSize: parseFloat(style.fontSize) || 16,
      fontFamily: style.fontFamily,
      fontWeight: parseInt(style.fontWeight, 10) || 400,
      textAlign: textAlign as TextStyle['textAlign'],
      lineHeight: parseFloat(style.lineHeight) || 0,
      letterSpacing: parseFloat(style.letterSpacing) || 0,
    }
  }

  // -----------------------------------------------------------------
  // Helper: detect emoji <img> elements
  //
  // Emoji libraries (e.g. Twemoji) replace emoji characters with <img>
  // elements. The original emoji character(s) are preserved in `alt`.
  // Detect by: explicit emoji class, Twemoji/emoji URL patterns, or
  // alt text that consists of Unicode Extended Pictographic characters.
  // -----------------------------------------------------------------
  function isEmojiImg(imgEl: HTMLImageElement): boolean {
    const alt = imgEl.alt ?? ''
    return !!(
      imgEl.classList?.contains('emoji') ||
      (imgEl.src && (imgEl.src.includes('twemoji') || imgEl.src.includes('/emoji/'))) ||
      (alt.length > 0 && alt.length <= 8 && /\p{Extended_Pictographic}/u.test(alt))
    )
  }

  // -----------------------------------------------------------------
  // Helper: extract text runs from an element's child nodes.
  //
  // Design principles:
  //   - Inline elements (display:inline*) are flattened into the run    stream
  //     directly; their background-color is propagated to child runs.
  //   - Block-level elements (display:block/flex/grid/list-item/table) act as
  //     paragraph boundaries: a breakLine run is inserted between adjacent
  //     blocks so presentation software renders them on separate lines.
  //   - Text nodes containing '\n' are split at each newline so soft line-
  //     breaks in the source HTML (common in Marp blockquotes) become proper
  //     break runs instead of literal newline characters in outgoing text.
  //   - Trailing break runs are trimmed so callers receive a clean run list.
  // -----------------------------------------------------------------
  function extractTextRuns(element: Element, skipInlineBadges = false): TextRun[] {
    const runs: TextRun[] = []

    const elementStyle = getComputedStyle(element)
    const elementBg = elementStyle.backgroundColor
    const elementHasBg =
      !!elementBg &&
      elementBg !== 'transparent' &&
      elementBg !== 'rgba(0, 0, 0, 0)'

    function lastIsBreak(): boolean {
      return runs.length > 0 && runs[runs.length - 1].breakLine === true
    }

    // Push one or more text runs from a raw text string, splitting on '\n'
    // to convert soft line-breaks into explicit breakLine runs.
    function pushText(
      text: string,
      style: CSSStyleDeclaration,
      bg: string | undefined,
    ): void {
      const segments = text.split('\n')
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (seg !== '') {
          const run: TextRun = {
            text: seg,
            color: style.color,
            fontSize: parseFloat(style.fontSize) || 16,
            fontFamily: style.fontFamily,
            bold: parseInt(style.fontWeight, 10) >= 600,
            italic: style.fontStyle === 'italic',
            underline: style.textDecorationLine?.includes('underline'),
            strikethrough: style.textDecorationLine?.includes('line-through'),
          }
          if (bg) run.backgroundColor = bg
          runs.push(run)
        }
        // Insert a break between segments, but never double-up
        if (i < segments.length - 1 && !lastIsBreak()) {
          runs.push({ text: '', breakLine: true })
        }
      }
    }

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (text.trim() === '') {
          // Preserve \n line breaks from whitespace-only text nodes.
          // These occur in <pre><code> between syntax-highlighted spans and
          // represent real line breaks (including blank lines).
          // Normal paragraph text in marp-core HTML has no \n text nodes
          // between inline elements, so this is safe for all element types.
          const newlineCount = (text.match(/\n/g) ?? []).length
          for (let i = 0; i < newlineCount; i++) {
            runs.push({ text: '', breakLine: true })
          }
          continue
        }
        pushText(text, elementStyle, elementHasBg ? elementBg : undefined)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tag = el.tagName.toLowerCase()

        if (tag === 'br') {
          if (!lastIsBreak()) runs.push({ text: '', breakLine: true })
          continue
        }

        if (tag === 'a') {
          const href = (el as HTMLAnchorElement).href
          const childRuns = extractTextRuns(el)
          childRuns.forEach((r) => {
            if (!r.breakLine) r.hyperlink = href
          })
          runs.push(...childRuns)
          continue
        }

        if (tag === 'img') {
          const imgEl = el as HTMLImageElement
          const alt = imgEl.alt ?? ''
          if (isEmojiImg(imgEl) && alt) {
            pushText(alt, getComputedStyle(el), undefined)
          }
          continue
        }

        const elStyle = getComputedStyle(el)
        // Block-level elements act as paragraph separators
        if (/^(block|flex|grid|list-item|table)/.test(elStyle.display)) {
          if (!lastIsBreak() && runs.length > 0) {
            runs.push({ text: '', breakLine: true })
          }
          runs.push(...extractTextRuns(el))
        } else {
          // Inline element — recurse and propagate background-color.
          // Exception: inline-block/-flex/-grid elements with a non-transparent
          // background are rendered as separate badge/chip shapes by
          // extractInlineBadgeShapes, with their text rendered directly inside
          // the shape.  Skip them here to avoid duplicating the text in the
          // parent paragraph's text flow.
          const bg = elStyle.backgroundColor
          const hasBg = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)'
          const alphaZero = hasBg && (() => {
            const m = bg.match(/,\s*([\d.]+)\s*\)$/)
            return m ? parseFloat(m[1]) === 0 : false
          })()
          const isBadge = hasBg && !alphaZero &&
              (elStyle.display === 'inline-block' || elStyle.display === 'inline-flex' || elStyle.display === 'inline-grid')
          if (isBadge) {
            if (skipInlineBadges) {
              // Isolated badge — text is rendered inside the badge shape, skip here
              continue
            }
            // Mixed badge (co-existing with other text):
            // Include badge text in the parent text flow with background-color
            // so the badge appears as an inline highlight in PPTX.
            const childRuns = extractTextRuns(el, false)
            childRuns.forEach((r) => {
              if (!r.breakLine && !r.backgroundColor) r.backgroundColor = bg
            })
            runs.push(...childRuns)
            continue
          }
          const childRuns = extractTextRuns(el, skipInlineBadges)
          if (hasBg && !alphaZero) {
            childRuns.forEach((r) => {
              if (!r.breakLine && !r.backgroundColor) r.backgroundColor = bg
            })
          }
          runs.push(...childRuns)
        }
      }
    }

    // Trim trailing break runs so callers get a clean list
    while (runs.length > 0 && runs[runs.length - 1].breakLine) {
      runs.pop()
    }
    // Trim leading break runs caused by HTML whitespace text nodes
    // (e.g. a newline after a block element's opening tag).  In HTML these do
    // not create visual space, but in PPTX a leading breakLine occupies a full
    // lineHeight, pushing the content down unexpectedly.
    while (runs.length > 0 && runs[0].breakLine) {
      runs.shift()
    }

    return runs
  }

  // -----------------------------------------------------------------
  // Helper: determine if an element has non-badge text content mixed with
  // inline badges.  Returns true when the element contains visible text
  // that is NOT exclusively from inline-block/-flex/-grid badge children.
  // -----------------------------------------------------------------
  // Helper: compute how far to shift a text element's left edge to clear
  // any inline badge shapes that sit flush at the container's left edge.
  // "Leading" badges are those whose x position is within 8 px of the
  // container's slide-relative left edge (tolerates border/padding offsets).
  //
  // For step-guide patterns like <h3><span.step>1</span>. heading</h3>,
  // the step badge sits at the heading's left → the heading text box is
  // shifted right by the badge width so it starts after the badge circle,
  // preventing textual overlap with the badge shape.
  // -----------------------------------------------------------------
  function computeLeadingOffset(
    badgeShapes: SlideElement[],
    containerRect: DOMRect,
    slideRect: DOMRect,
  ): number {
    if (badgeShapes.length === 0) return 0
    const containerSSLeft = containerRect.left - slideRect.left
    const leading = badgeShapes.filter((b) => b.x <= containerSSLeft + 8)
    if (leading.length === 0) return 0
    const rightEdge = leading.reduce((max, b) => Math.max(max, b.x + b.width), containerSSLeft)
    return Math.max(0, rightEdge - containerSSLeft)
  }

  // -----------------------------------------------------------------
  // Helper: extract list items recursively
  // -----------------------------------------------------------------
  function extractListItems(
    list: Element,
    level: number = 0,
  ): ListItem[] {
    const items: ListItem[] = []

    for (const child of Array.from(list.children)) {
      const tag = child.tagName.toLowerCase()

      if (tag === 'li') {
        const runs: TextRun[] = []
        const nestedItems: ListItem[] = []

        for (const node of Array.from(child.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent ?? ''
            if (text.trim() === '') continue
            const liStyle = getComputedStyle(child)
            const liBg = liStyle.backgroundColor
            const liHasBg = !!liBg && liBg !== 'transparent' && liBg !== 'rgba(0, 0, 0, 0)'
            // Split on newlines so soft line-breaks in the markdown become breaks
            const segments = text.split('\n')
            for (let i = 0; i < segments.length; i++) {
              const seg = segments[i]
              if (seg !== '') {
                const run: TextRun = {
                  text: seg,
                  color: liStyle.color,
                  fontSize: parseFloat(liStyle.fontSize) || 16,
                  fontFamily: liStyle.fontFamily,
                  bold: parseInt(liStyle.fontWeight, 10) >= 600,
                  italic: liStyle.fontStyle === 'italic',
                }
                if (liHasBg) run.backgroundColor = liBg
                runs.push(run)
              }
              if (i < segments.length - 1) {
                runs.push({ text: '', breakLine: true })
              }
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            const childTag = el.tagName.toLowerCase()

            if (childTag === 'ul' || childTag === 'ol') {
              nestedItems.push(...extractListItems(el, level + 1))
            } else if (childTag === 'img') {
              // Emoji img in a tight list item (no <p> wrapper).
              const imgEl = el as HTMLImageElement
              const alt = imgEl.alt ?? ''
              if (isEmojiImg(imgEl) && alt) {
                const liStyle = getComputedStyle(child)
                runs.push({
                  text: alt,
                  color: liStyle.color,
                  fontSize: parseFloat(liStyle.fontSize) || 16,
                  fontFamily: liStyle.fontFamily,
                  bold: parseInt(liStyle.fontWeight, 10) >= 600,
                  italic: liStyle.fontStyle === 'italic',
                })
              }
            } else {
              runs.push(...extractTextRuns(el))
            }
          }
        }

        if (runs.length > 0) {
          const combinedText = runs.map((r) => r.text).join('')
          items.push({ text: combinedText.trim(), level, runs })
        }
        items.push(...nestedItems)
      }
    }

    return items
  }

  // -----------------------------------------------------------------
  // Helper: extract syntax-highlighted code runs from a code element
  // -----------------------------------------------------------------
  function extractCodeRuns(codeEl: Element): TextRun[] {
    const runs: TextRun[] = []
    const defaultStyle = getComputedStyle(codeEl)

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (text === '') return
        const parent = node.parentElement ?? codeEl
        const style = getComputedStyle(parent)
        runs.push({
          text,
          color: style.color,
          fontSize: parseFloat(style.fontSize) || parseFloat(defaultStyle.fontSize) || 16,
          fontFamily: style.fontFamily || defaultStyle.fontFamily,
          bold: parseInt(style.fontWeight, 10) >= 600,
          italic: style.fontStyle === 'italic',
        })
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) {
          walk(child)
        }
      }
    }

    walk(codeEl)
    return runs
  }

  // -----------------------------------------------------------------
  // Helper: extract table data with inline text runs
  // -----------------------------------------------------------------
  function extractTableData(
    table: Element,
  ): { rows: TableRow[]; colWidths: number[] } {
    const rows: TableRow[] = []
    let colWidths: number[] = []

    for (const tr of Array.from(table.querySelectorAll('tr'))) {
      const cells: TableCell[] = []
      const isFirstRow = rows.length === 0

      for (const td of Array.from(tr.querySelectorAll('th, td'))) {
        const style = getComputedStyle(td)
        if (isFirstRow) {
          // Capture rendered column widths from first row for proportional layout
          colWidths.push((td as HTMLElement).offsetWidth)
        }
        cells.push({
          text: td.textContent ?? '',
          runs: extractTextRuns(td),
          isHeader: td.tagName.toLowerCase() === 'th',
          style: {
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontSize: parseFloat(style.fontSize) || 16,
            fontFamily: style.fontFamily,
            fontWeight: parseInt(style.fontWeight, 10) || 400,
            textAlign: style.textAlign || 'left',
            borderColor: style.borderColor,
          },
        })
      }

      rows.push({ cells })
    }

    return { rows, colWidths }
  }

  // -----------------------------------------------------------------
  // Helper: extract inline-block badge / chip shapes from a text container.
  //
  // Elements styled as `display: inline-block` with a non-transparent
  // background (e.g. `.step { display:inline-block; border-radius:999px;
  // background: var(--brand) }`) act as visual pill badges.  PPTX cannot
  // place a rounded-rectangle shape inside a text flow, so we extract the
  // badge as a separate positioned ContainerElement and emit it BEFORE the
  // parent text element so the text box sits on top.
  //
  // extractTextRuns intentionally omits propagating backgroundColor for
  // inline-block children so the text runs stay clean (no PPTX highlight);
  // the shape provides the background colour visually.
  // -----------------------------------------------------------------
  function extractInlineBadgeShapes(
    container: Element,
    slideRect: DOMRect,
  ): SlideElement[] {
    const badges: SlideElement[] = []
    for (const el of Array.from(container.querySelectorAll('*'))) {
      const s = getComputedStyle(el as Element)
      if (s.display !== 'inline-block' && s.display !== 'inline-flex' && s.display !== 'inline-grid') continue
      const bg = s.backgroundColor
      if (!bg || bg === 'transparent') continue
      // Reject rgba() with alpha === 0 — handles both 'rgba(0, 0, 0, 0)' and
      // 'rgba(0,0,0,0)' (browser formatting varies).
      const alphaMatch = bg.match(/,\s*([\d.]+)\s*\)$/)
      if (alphaMatch && parseFloat(alphaMatch[1]) === 0) continue
      const iRect = (el as HTMLElement).getBoundingClientRect()
      if (iRect.width === 0 || iRect.height === 0) continue
      const br = parseFloat(s.borderRadius) || 0
      // Capture badge text so it can be rendered directly inside the shape.
      const badgeRuns = extractTextRuns(el as Element)
      // Strip backgroundColor from badge runs: the container shape provides the
      // visual background.  Keeping highlight on the text creates a visible
      // artefact (the highlight bleeds outside the shape) when font metrics
      // cause a slight positioning mismatch between the shape and the text box.
      badgeRuns.forEach((r) => { if (!r.breakLine) r.backgroundColor = undefined })
      const hasBadgeText = badgeRuns.some((r) => !r.breakLine && r.text.trim() !== '')
      badges.push({
        type: 'container',
        children: [],
        ...(hasBadgeText ? { runs: badgeRuns } : {}),
        x: iRect.left - slideRect.left,
        y: iRect.top - slideRect.top,
        width: iRect.width,
        height: iRect.height,
        style: {
          backgroundColor: bg,
          ...(br > 0 ? { borderRadius: br } : {}),
        },
      })
    }
    return badges
  }

  // -----------------------------------------------------------------
  // Helper: collect IMG descendants of a container as ImageElements.
  // Called after processing text-bearing block elements (paragraph,
  // heading, blockquote, list, table) whose content is handled by
  // extractTextRuns / extractListItems, which skip <img> tags.
  // -----------------------------------------------------------------
  function extractNestedImages(
    el: Element,
    slideRect: DOMRect,
  ): ImageElement[] {
    const images: ImageElement[] = []
    for (const img of Array.from(el.querySelectorAll('img'))) {
      const imgEl = img as HTMLImageElement
      const rect = imgEl.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const s = getComputedStyle(imgEl)
      if (s.display === 'none' || s.visibility === 'hidden') continue
      // Skip emoji images — they are converted to text runs by extractTextRuns
      if (
        imgEl.classList?.contains('emoji') ||
        imgEl.src?.includes('twemoji') ||
        imgEl.src?.includes('/emoji/')
      ) continue
      const cssFilter =
        s.filter && s.filter !== 'none' ? s.filter : undefined
      images.push({
        type: 'image',
        src: imgEl.src,
        naturalWidth: imgEl.naturalWidth,
        naturalHeight: imgEl.naturalHeight,
        x: rect.left - slideRect.left,
        y: rect.top - slideRect.top,
        width: rect.width,
        height: rect.height,
        ...(cssFilter ? { cssFilter, pageX: rect.left, pageY: rect.top } : {}),
      })
    }
    return images
  }

  // -----------------------------------------------------------------
  // Helper: walk child elements and classify them
  // -----------------------------------------------------------------
  function walkElements(
    parent: Element,
    slideRect: DOMRect,
  ): SlideElement[] {
    const elements: SlideElement[] = []

    for (const child of Array.from(parent.children)) {
      const style = getComputedStyle(child)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      if ((child as HTMLElement).dataset?.marpitPresenterNotes !== undefined)
        continue

      // Skip Marp advanced background container (handled at slide level)
      if ((child as HTMLElement).dataset?.marpitAdvancedBackgroundContainer !== undefined)
        continue

      const rect = child.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      const tag = child.tagName.toLowerCase()

      // Skip display:inline elements — their text content is captured by
      // extractTextRuns on the containing element.
      // <img> and <svg> are intentionally excluded: visual elements must be
      // captured even when their computed display is 'inline'.
      // In flex/grid containers, all direct children become block-like items
      // regardless of their display property, so inline children must also be
      // walked (otherwise flex-row text spans would be silently dropped).
      const parentIsFlexOrGrid = /^(flex|inline-flex|grid|inline-grid)/.test(
        getComputedStyle(parent).display,
      )
      if (!parentIsFlexOrGrid && tag !== 'img' && tag !== 'svg' && style.display === 'inline') continue

      const base = {
        x: rect.left - slideRect.left,
        y: rect.top - slideRect.top,
        width: rect.width,
        height: rect.height,
      }

      if (/^h[1-6]$/.test(tag)) {
        // Capture CSS border decorations (border-bottom for h1 rules, border-left
        // for h2 side bars). These are set by the theme's stylesheet and are not
        // visible in the DOM tree, only in computed styles.
        const borderBottomWidth = parseFloat(style.borderBottomWidth) || 0
        const borderLeftWidth = parseFloat(style.borderLeftWidth) || 0
        // Extract inline badge shapes (pill/circle steps, status chips, etc.).
        // Shapes are ALWAYS emitted so badges render as rounded shapes in PPTX.
        // For badges at the container's left edge ("leading badges", e.g. step
        // numbers like <span.step>1</span>. heading), the heading text box is
        // shifted right by the badge width to prevent textual overlap with the
        // badge shape.
        const headingBadgeShapes = extractInlineBadgeShapes(child, slideRect)
        const headingLeadingOffset = computeLeadingOffset(headingBadgeShapes, rect, slideRect)
        if (headingBadgeShapes.length > 0) elements.push(...headingBadgeShapes)
        const headingRuns = extractTextRuns(child, headingBadgeShapes.length > 0)
        // For isolated badges (no surrounding text), omit the empty heading.
        if (headingBadgeShapes.length === 0 || headingRuns.some((r) => !r.breakLine && r.text.trim() !== '')) {
          elements.push({
            type: 'heading',
            level: parseInt(tag[1], 10),
            runs: headingRuns,
            ...base,
            x: base.x + headingLeadingOffset,
            width: Math.max(10, base.width - headingLeadingOffset),
            style: extractTextStyle(style),
            ...(borderBottomWidth > 0
              ? { borderBottom: { width: borderBottomWidth, color: style.borderBottomColor } }
              : {}),
            ...(borderLeftWidth > 0
              ? { borderLeft: { width: borderLeftWidth, color: style.borderLeftColor } }
              : {}),
          })
        }
        elements.push(...extractNestedImages(child, slideRect))
      } else if (tag === 'p') {
        // Extract inline badge shapes. Shapes are always emitted so badges
        // render as rounded pill/circle elements in PPTX.  For leading badges
        // (at the paragraph's left edge), the paragraph text box is shifted
        // right to avoid overlap with the badge shape.
        const paraBadgeShapes = extractInlineBadgeShapes(child, slideRect)
        const paraLeadingOffset = computeLeadingOffset(paraBadgeShapes, rect, slideRect)
        if (paraBadgeShapes.length > 0) elements.push(...paraBadgeShapes)
        const runs = extractTextRuns(child, paraBadgeShapes.length > 0)
        // Only emit a paragraph if it has visible text; images are extracted below.
        if (runs.some((r) => !r.breakLine && r.text.trim() !== '')) {
          elements.push({
            type: 'paragraph',
            runs,
            ...base,
            x: base.x + paraLeadingOffset,
            width: Math.max(10, base.width - paraLeadingOffset),
            style: extractTextStyle(style),
          })
        }
        elements.push(...extractNestedImages(child, slideRect))
      } else if (tag === 'ul' || tag === 'ol') {
        // List badges (e.g. <span class="badge"> inside <li>) are handled by
        // extractTextRuns called from extractListItems.  Badge text is kept in
        // the list run flow as inline highlights (backgroundColor) rather than
        // extracted as separate shapes, because badges inside list items are
        // always mixed with surrounding text.
        elements.push({
          type: 'list',
          ordered: tag === 'ol',
          items: extractListItems(child),
          ...base,
          style: extractTextStyle(style),
        })
        elements.push(...extractNestedImages(child, slideRect))
      } else if (tag === 'table') {
        const { rows: tableRows, colWidths } = extractTableData(child)
        elements.push({
          type: 'table',
          rows: tableRows,
          ...(colWidths.length > 0 ? { colWidths } : {}),
          ...base,
          style: extractTextStyle(style),
        })
        elements.push(...extractNestedImages(child, slideRect))
      } else if (tag === 'pre') {
        // If the <pre> contains a rendered SVG (e.g. Mermaid diagram), treat
        // it as an SVG image rather than a code block.
        const innerSvg = child.querySelector('svg')
        if (innerSvg) {
          try {
            const svgStr = new XMLSerializer().serializeToString(innerSvg)
            const b64 = btoa(unescape(encodeURIComponent(svgStr)))
            const dataUrl = `data:image/svg+xml;base64,${b64}`
            elements.push({
              type: 'image',
              src: dataUrl,
              naturalWidth: base.width,
              naturalHeight: base.height,
              ...base,
              // Request rasterization: Mermaid SVGs may use <foreignObject>
              // for text labels which PowerPoint cannot render from SVG data.
              // pageX/pageY are intentionally omitted: rasterizeSlideTargets
              // computes the absolute clip from the slide-relative x/y after
              // navigating to the correct slide (avoids stale bespoke-transform
              // coordinates).
              rasterize: true,
            })
          } catch (_e) {
            // Fall through to code block if SVG serialization fails
            const code = child.querySelector('code')
            const codeTarget = code ?? child
            elements.push({
              type: 'code',
              text: codeTarget.textContent ?? '',
              language: code?.className?.replace('language-', '') ?? '',
              runs: extractCodeRuns(codeTarget),
              ...base,
              style: { ...extractTextStyle(style), backgroundColor: style.backgroundColor },
            })
          }
        } else {
          const code = child.querySelector('code')
          const codeTarget = code ?? child
          elements.push({
            type: 'code',
            text: codeTarget.textContent ?? '',
            language: code?.className?.replace('language-', '') ?? '',
            runs: extractCodeRuns(codeTarget),
            ...base,
            style: {
              ...extractTextStyle(style),
              backgroundColor: style.backgroundColor,
            },
          })
        }
      } else if (tag === 'img') {
        const img = child as HTMLImageElement
        // Emoji library images (Twemoji etc.) are captured as text by
        // extractTextRuns via the alt attribute — skip here to avoid
        // rendering them as a separate image element (which would duplicate).
        if (
          img.classList?.contains('emoji') ||
          img.src?.includes('twemoji') ||
          img.src?.includes('/emoji/')
        ) continue
        const imgFilter = style.filter && style.filter !== 'none' ? style.filter : undefined
        elements.push({
          type: 'image',
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          ...base,
          // Store page-absolute coords when cssFilter is set so the export
          // tool can screenshot the rendered (filtered) region via Puppeteer.
          ...(imgFilter ? { cssFilter: imgFilter, pageX: rect.left, pageY: rect.top } : {}),
        })
      } else if (tag === 'blockquote') {
        const borderWidth = parseFloat(style.borderLeftWidth) || 0
        const borderColor = style.borderLeftColor
        const bqBadgeShapes = extractInlineBadgeShapes(child, slideRect)
        const bqLeadingOffset = computeLeadingOffset(bqBadgeShapes, rect, slideRect)
        if (bqBadgeShapes.length > 0) elements.push(...bqBadgeShapes)
        elements.push({
          type: 'blockquote',
          runs: extractTextRuns(child, bqBadgeShapes.length > 0),
          ...base,
          x: base.x + bqLeadingOffset,
          width: Math.max(10, base.width - bqLeadingOffset),
          style: extractTextStyle(style),
          ...(borderWidth > 0 ? { borderLeft: { width: borderWidth, color: borderColor } } : {}),
        })
        elements.push(...extractNestedImages(child, slideRect))
      } else if (tag === 'svg') {
        // Serialize SVG to a data URL for embedding as an image.
        // Use base64 encoding (not percent-encoding) because PptxGenJS and
        // Office require base64-encoded SVG in the PPTX XML <a:blip> element.
        // btoa(unescape(encodeURIComponent(...))) is the browser-safe way to
        // base64-encode a UTF-8 string without TextEncoder dependency.
        try {
          const svgStr = new XMLSerializer().serializeToString(child)
          const b64 = btoa(unescape(encodeURIComponent(svgStr)))
          const dataUrl = `data:image/svg+xml;base64,${b64}`
          elements.push({
            type: 'image',
            src: dataUrl,
            naturalWidth: base.width,
            naturalHeight: base.height,
            ...base,
          })
        } catch (_e) {
          // Skip if serialization fails
        }
      } else if (tag === 'header' || tag === 'footer') {
        const hfBadgeShapes = extractInlineBadgeShapes(child, slideRect)
        const hfLeadingOffset = computeLeadingOffset(hfBadgeShapes, rect, slideRect)
        if (hfBadgeShapes.length > 0) elements.push(...hfBadgeShapes)
        elements.push({
          type: tag,
          runs: extractTextRuns(child, hfBadgeShapes.length > 0),
          ...base,
          x: base.x + hfLeadingOffset,
          width: Math.max(10, base.width - hfLeadingOffset),
          style: extractTextStyle(style),
        })
        elements.push(...extractNestedImages(child, slideRect))
      } else {
        const borderTopWidth = parseFloat(style.borderTopWidth) || 0
        const borderTopStyle = style.borderTopStyle
        const hasBorder = borderTopWidth > 0 && borderTopStyle !== 'none'
        const borderRadius = parseFloat(style.borderRadius) || 0
        // Detect CSS border-left (used for note-box bar decorations)
        const borderLeftWidth = parseFloat(style.borderLeftWidth) || 0
        const borderLeftStyle = style.borderLeftStyle
        const hasBorderLeft = borderLeftWidth > 0 && borderLeftStyle !== 'none' && !hasBorder
        // Detect visible box-shadow (used for card / elevated components)
        const boxShadow = style.boxShadow
        const hasBoxShadow = !!boxShadow && boxShadow !== 'none'
        const hasBackground =
          !!style.backgroundColor &&
          style.backgroundColor !== 'transparent' &&
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          !style.backgroundColor.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)/)
        const blockChildren = walkElements(child, slideRect)

        const containerStyle = {
          backgroundColor: style.backgroundColor,
          ...(hasBorder
            ? { borderWidth: borderTopWidth, borderColor: style.borderTopColor }
            : {}),
          ...(borderRadius > 0 ? { borderRadius } : {}),
          ...(hasBorderLeft
            ? { borderLeft: { width: borderLeftWidth, color: style.borderLeftColor } }
            : {}),
          ...(hasBoxShadow ? { boxShadow: true } : {}),
        }

        if (blockChildren.length > 0) {
          // Block-level children → normal container element
          elements.push({
            type: 'container',
            children: blockChildren,
            ...base,
            style: containerStyle,
          })
        } else {
          // Inline-only content (e.g. div with text, strong, br).
          // Emit a background/border box first (container with no children),
          // then the text as a paragraph element on top.
          if (hasBackground || hasBorder || hasBorderLeft || hasBoxShadow) {
            elements.push({
              type: 'container',
              children: [],
              ...base,
              style: containerStyle,
            })
          }
          const runs = extractTextRuns(child)
          if (runs.some((r) => !r.breakLine && r.text.trim() !== '')) {
            // When the element uses flexbox/grid vertical centering, emit
            // valign:'middle' so badge-style elements render correctly in PPTX.
            const valign: 'top' | 'middle' | 'bottom' =
              style.alignItems === 'center' ||
              style.justifyContent === 'center' ||
              style.verticalAlign === 'middle'
                ? 'middle'
                : 'top'
            // Extract CSS padding so the text box inset matches the div's
            // rendered padding.  For inline-only containers, both container and
            // paragraph share the same bounding rect (the div's outer rect); the
            // padding tells PptxGenJS how far to inset the text from the edges.
            const paddingTop = parseFloat(style.paddingTop) || 0
            const paddingRight = parseFloat(style.paddingRight) || 0
            const paddingBottom = parseFloat(style.paddingBottom) || 0
            const paddingLeft = parseFloat(style.paddingLeft) || 0
            elements.push({
              type: 'paragraph',
              runs,
              ...base,
              style: {
                ...extractTextStyle(style),
                ...(paddingTop || paddingRight || paddingBottom || paddingLeft
                  ? { paddingTop, paddingRight, paddingBottom, paddingLeft }
                  : {}),
              },
              valign,
            })
          }
          elements.push(...extractNestedImages(child, slideRect))
        }
      }
    }

    return elements
  }

  // -----------------------------------------------------------------
  // Helper: extract visible ::before / ::after pseudo-elements as
  // coloured rectangle shapes.
  //
  // CSS pseudo-elements are not part of the DOM tree and cannot be
  // queried via querySelectorAll.  However, getComputedStyle(el, '::before')
  // returns their computed styles.  When a pseudo-element has a non-
  // transparent background-color and non-zero dimensions, we emit a
  // ContainerElement so it appears as a filled rectangle in the PPTX.
  // -----------------------------------------------------------------
  function extractPseudoElements(
    section: Element,
    slideRect: DOMRect,
  ): SlideElement[] {
    const shapes: SlideElement[] = []

    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(section, pseudo)
      // Pseudo-elements without content:'...' don't render, but
      // getComputedStyle still returns data.  Skip non-rendered pseudo-elements.
      // Also skip content:'""' — empty-string pseudo-elements (common in theme
      // CSS for decorative bars via background-color) should NOT be extracted
      // because they appear in HTML/preview but the user has not explicitly placed
      // them as content.  Extracting them creates phantom banners in PPTX that
      // don't match the user's intent.
      const rawContent = ps.content
      if (!rawContent || rawContent === 'none' || rawContent === 'normal') continue
      // Skip empty-string content (e.g. content: '""', "''", or '' wrapped in quotes)
      const stripped = rawContent.replace(/^["']|["']$/g, '').trim()
      if (stripped === '') continue
      const bg = ps.backgroundColor
      if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')
        continue
      // Parse dimensions — pseudo-elements use width/height from CSS
      const w = parseFloat(ps.width) || 0
      const h = parseFloat(ps.height) || 0
      if (w === 0 && h === 0) continue

      // Position: pseudo-elements with position:absolute or fixed use
      // top/left/right/bottom.  For bars that span the full width,
      // width is often 100% (resolved to the section width).
      const position = ps.position
      let x = 0
      let y = 0

      if (position === 'absolute' || position === 'fixed') {
        const top = parseFloat(ps.top)
        const left = parseFloat(ps.left)
        const bottom = parseFloat(ps.bottom)
        if (!isNaN(top)) y = top
        else if (!isNaN(bottom)) y = slideRect.height - bottom - h
        if (!isNaN(left)) x = left
      }

      const effectiveW = w || slideRect.width
      const effectiveH = h || 0

      if (effectiveH <= 0) continue

      shapes.push({
        type: 'container',
        children: [],
        x,
        y,
        width: effectiveW,
        height: effectiveH,
        style: {
          backgroundColor: bg,
        },
      })
    }

    return shapes
  }

  // -----------------------------------------------------------------
  // Main logic — handle Marp Inline SVG mode with 3-layer sections
  //
  // When ![bg] is used, Marp generates 3 sections per slide:
  //   - data-marpit-advanced-background="background" (bg images)
  //   - data-marpit-advanced-background="content" (actual content)
  //   - data-marpit-advanced-background="pseudo" (page numbers etc.)
  // Without ![bg], there's just one section per slide.
  //
  // Note: `data-marpit-pagination` is present only when pagination is enabled.
  // For `paginate: false`, Marp still emits one top-level <section> per slide
  // under <svg data-marpit-svg><foreignObject>..., but without pagination data.
  // -----------------------------------------------------------------
  const allSections = Array.from(
    root.querySelectorAll('section'),
  ).filter((section) => {
    // Ignore nested sections inside slide content. Slide root sections are the
    // outermost section elements in the rendered Marp document.
    if (section.parentElement?.closest('section')) return false

    // Standard Marp output: section under svg > foreignObject
    if (section.parentElement?.tagName.toLowerCase() === 'foreignobject') {
      return true
    }

    // Test fixtures and simple DOMs may place the slide section directly.
    return section.hasAttribute('data-marpit-pagination')
  })

  // Group sections by pagination number, tracking layers
  const slideGroups = new Map<
    string,
    { content?: Element; background?: Element }
  >()

  for (const [index, section] of allSections.entries()) {
    const key =
      section.getAttribute('data-marpit-pagination') ??
      section.getAttribute('id') ??
      String(index)
    const layer = section.getAttribute('data-marpit-advanced-background')

    if (!slideGroups.has(key)) slideGroups.set(key, {})
    const entry = slideGroups.get(key)!

    if (layer === 'content') {
      entry.content = section
    } else if (layer === 'background') {
      entry.background = section
    } else if (!layer) {
      // Non-inline-SVG mode or slide without ![bg]
      entry.content = section
    }
    // Skip 'pseudo' layer
  }

  return Array.from(slideGroups.values()).map(
    ({ content, background }, slideIdx) => {
      const section = content ?? background!
      const sectionRect = section.getBoundingClientRect()
      const sectionStyle = getComputedStyle(section)

      // -----------------------------------------------------------------
      // Extract background images from ![bg] directive's background layer.
      // Each <figure> in the background layer corresponds to one background
      // image. Multiple figures occur for split layouts (e.g. ![bg left]).
      // -----------------------------------------------------------------
      const backgroundImages: BgImageData[] = []

      if (background) {
        const figures = background.querySelectorAll('figure')
        for (const fig of Array.from(figures)) {
          const figStyle = getComputedStyle(fig)
          if (!figStyle.backgroundImage || figStyle.backgroundImage === 'none')
            continue

          // Extract URL from background-image CSS value
          const urlMatch = figStyle.backgroundImage.match(
            /url\(["']?([^"')]+)["']?\)/,
          )
          if (!urlMatch) continue

          const figRect = fig.getBoundingClientRect()
          const cssFilter =
            figStyle.filter && figStyle.filter !== 'none'
              ? figStyle.filter
              : undefined

          backgroundImages.push({
            url: urlMatch[1],
            x: figRect.left - sectionRect.left,
            y: figRect.top - sectionRect.top,
            width: figRect.width || sectionRect.width,
            height: figRect.height || sectionRect.height,
            ...(cssFilter ? { cssFilter } : {}),
            pageX: figRect.left,
            pageY: figRect.top,
          })
        }
      }

      // Fallback: section's own background-image (non-![bg] CSS background)
      // This is produced by `_backgroundImage` / `_backgroundColor` Marp
      // directives.  Mark with `fromCssFallback` so the export tool knows
      // it must rasterise the full slide to capture background-size/position
      // and any background-color overlay faithfully.
      if (backgroundImages.length === 0) {
        const bgImg = sectionStyle.backgroundImage
        if (bgImg && bgImg !== 'none') {
          const urlMatch = bgImg.match(/url\(["']?([^"')]+)["']?\)/)
          if (urlMatch) {
            backgroundImages.push({
              url: urlMatch[1],
              x: 0,
              y: 0,
              width: sectionRect.width,
              height: sectionRect.height,
              pageX: sectionRect.left,
              pageY: sectionRect.top,
              fromCssFallback: true,
            })
          } else if (/gradient\s*\(/.test(bgImg)) {
            // CSS gradient (linear-gradient, radial-gradient, etc.) — cannot
            // be reproduced natively in PPTX.  Mark for rasterization so the
            // export tool screenshots the rendered section background.
            backgroundImages.push({
              url: '', // placeholder — will be replaced by rasterized data URL
              x: 0,
              y: 0,
              width: sectionRect.width,
              height: sectionRect.height,
              pageX: sectionRect.left,
              pageY: sectionRect.top,
              fromCssFallback: true,
            })
          }
        }
      }

      return {
        width: sectionRect.width,
        height: sectionRect.height,
        background: findBackgroundColor(section),
        backgroundImages,
        elements: [
          // Pseudo-element bars (::before/::after) go behind content
          ...extractPseudoElements(section, sectionRect),
          ...walkElements(section, sectionRect),
        ],
        notes:
          (
            section.querySelector('[data-marpit-presenter-notes]') ??
            root.querySelector(`.bespoke-marp-note[data-index="${slideIdx}"]`)
          )?.textContent?.trim() ?? '',
      }
    },
  )
}
