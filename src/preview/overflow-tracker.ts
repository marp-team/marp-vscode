import { dataStartLine, dataEndLine } from '../plugins/content-section'

export type PostMessage = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  type: string,
  data: T,
) => void

export const eventType = 'marp-vscode.overflowTracker'

export interface OverflowTrackerEvent {
  type: typeof eventType
  overflowElements: OverflowElementData[]
}

export interface OverflowElementData {
  startLine: number
  endLine: number
  message?: string
}

export const isOverflowTrackerEvent = (
  value: unknown,
): value is OverflowTrackerEvent =>
  typeof value === 'object' &&
  value != null &&
  'type' in value &&
  value.type === eventType &&
  'overflowElements' in value &&
  Array.isArray(value.overflowElements)

export class OverflowTracker {
  constructor(private postMessage: PostMessage) {
    this.update()
  }

  update() {
    const overflowElements: OverflowElementData[] = []

    for (const element of document.querySelectorAll(
      `section[${dataStartLine}][${dataEndLine}]`,
    )) {
      const overflowPx = element.scrollHeight - element.clientHeight
      if (overflowPx <= 0) continue

      const startLine = parseInt(element.getAttribute(dataStartLine) || '', 10)
      const endLine = parseInt(element.getAttribute(dataEndLine) || '', 10)

      if (!(Number.isNaN(startLine) || Number.isNaN(endLine)))
        overflowElements.push({ startLine, endLine })
    }

    this.postMessage<Omit<OverflowTrackerEvent, 'type'>>(eventType, {
      overflowElements,
    })
  }

  cleanup() {
    // TODO: Currently it does no ops but implement cleaning up observers if used.
  }
}
