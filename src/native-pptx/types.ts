// Type definitions for native editable PPTX export via DOM extraction

export interface SlideData {
  width: number // px
  height: number // px
  background: string // rgb(r, g, b)
  /**
   * Background images extracted from Marp `![bg]` directives or CSS
   * background-image.  Ordered from back to front (first = bottom layer).
   * May include partial-width images for split layouts (e.g. `![bg left]`).
   */
  backgroundImages: BgImageData[]
  elements: SlideElement[]
  notes: string
}

/** A single background image layer for a Marp slide. */
export interface BgImageData {
  /** Absolute image URL, file URL, or data URL. */
  url: string
  /** Slide-relative left position (px). */
  x: number
  /** Slide-relative top position (px). */
  y: number
  width: number
  height: number
  /** Raw CSS filter string (e.g. `"grayscale(1) brightness(0.5)"`), if set. */
  cssFilter?: string
  /**
   * Absolute page (viewport) coordinates of the figure element.
   * Used by the PPTX export tool to take a Puppeteer screenshot of the
   * rendered (filtered) region instead of embedding the raw image URL.
   */
  pageX?: number
  pageY?: number
  /**
   * True when this entry was extracted from the section's own CSS
   * `background-image` / `background-color` (i.e. `_backgroundImage` /
   * `_backgroundColor` Marp directives), rather than from a `![bg]`
   * advanced-background layer.
   *
   * The export tool should rasterise the full slide via Puppeteer in order
   * to faithfully capture `background-size: cover`, `background-position`,
   * and the semi-transparent `background-color` overlay.
   */
  fromCssFallback?: boolean
}

export type SlideElement =
  | HeadingElement
  | ParagraphElement
  | ListElement
  | TableElement
  | CodeElement
  | ImageElement
  | BlockquoteElement
  | HeaderFooterElement
  | ContainerElement

export interface ElementBase {
  x: number // px (slide top-left origin)
  y: number
  width: number
  height: number
}

export interface HeadingElement extends ElementBase {
  type: 'heading'
  level: number // 1-6
  runs: TextRun[]
  style: TextStyle
  /** CSS border-bottom rendered as a decorative line below the heading. */
  borderBottom?: { width: number; color: string }
  /** CSS border-left rendered as a decorative bar to the left of the heading. */
  borderLeft?: { width: number; color: string }
}

export interface ParagraphElement extends ElementBase {
  type: 'paragraph'
  runs: TextRun[]
  style: TextStyle
  /** Vertical alignment for the text box. Defaults to 'top'. */
  valign?: 'top' | 'middle' | 'bottom'
}

export interface ListElement extends ElementBase {
  type: 'list'
  ordered: boolean
  items: ListItem[]
  style: TextStyle
}

export interface TableElement extends ElementBase {
  type: 'table'
  rows: TableRow[]
  /** Per-column widths in pixels, derived from first-row cell offsetWidths. */
  colWidths?: number[]
  style: TextStyle
}

export interface CodeElement extends ElementBase {
  type: 'code'
  text: string
  language: string
  runs: TextRun[]
  style: TextStyle & { backgroundColor: string }
}

export interface ImageElement extends ElementBase {
  type: 'image'
  src: string
  naturalWidth: number
  naturalHeight: number
  /** CSS filter string (e.g. from a Marp image directive), if present. */
  cssFilter?: string
  /**
   * Absolute page (viewport) coordinates of the image element.
   * Stored when cssFilter is set so the PPTX export tool can take a
   * Puppeteer screenshot of the rendered (filtered) region.
   */
  pageX?: number
  pageY?: number
  /**
   * When true, the export tool should rasterize this element via Puppeteer
   * screenshot rather than embedding the SVG data URL (e.g. Mermaid diagrams
   * use SVG <foreignObject> for text which PowerPoint cannot render).
   */
  rasterize?: boolean
}

export interface BlockquoteElement extends ElementBase {
  type: 'blockquote'
  runs: TextRun[]
  style: TextStyle
  borderLeft?: { width: number; color: string }
}

export interface HeaderFooterElement extends ElementBase {
  type: 'header' | 'footer'
  runs: TextRun[]
  style: TextStyle
}

export interface ContainerElement extends ElementBase {
  type: 'container'
  children: SlideElement[]
  /** Text runs for badge/chip shapes (inline-block/-flex/-grid with background). */
  runs?: TextRun[]
  style: {
    backgroundColor: string
    /** CSS border width in px (uniform — uses top-border value). */
    borderWidth?: number
    /** CSS border color as a computed color string. */
    borderColor?: string
    /** CSS border-radius in px. When > 0, renders as a rounded rectangle. */
    borderRadius?: number
    /** CSS border-left as a separate decoration (bar). */
    borderLeft?: { width: number; color: string }
    /** True when the element has a visible CSS box-shadow. */
    boxShadow?: boolean
  }
}

export interface TextRun {
  text: string
  /** Explicit line-break marker. When true, `text` must be empty string. */
  breakLine?: true
  /** Background color (e.g. from <mark> or <strong> with CSS background). */
  backgroundColor?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  hyperlink?: string
  /** Character spacing in px (from CSS letter-spacing). */
  charSpacing?: number
}

export interface TextStyle {
  color: string
  fontSize: number
  fontFamily: string
  fontWeight: number
  textAlign: 'left' | 'center' | 'right'
  lineHeight: number
  /** CSS letter-spacing in px (0 = normal). */
  letterSpacing?: number
  /** CSS padding-top in px (inline-only container div). Used as text box top inset. */
  paddingTop?: number
  /** CSS padding-right in px. */
  paddingRight?: number
  /** CSS padding-bottom in px. */
  paddingBottom?: number
  /** CSS padding-left in px. */
  paddingLeft?: number
}

export interface ListItem {
  text: string
  level: number // nesting depth (0-based)
  runs: TextRun[]
}

export interface TableRow {
  cells: TableCell[]
}

export interface TableCell {
  text: string
  runs: TextRun[]
  isHeader: boolean
  style: {
    color: string
    backgroundColor: string
    fontSize: number
    fontFamily: string
    fontWeight: number
    textAlign: string
    borderColor: string
  }
}
