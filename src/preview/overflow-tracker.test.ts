/** @jest-environment jsdom */
import { dataStartLine, dataEndLine } from '../plugins/content-section'
import { OverflowTracker, eventType } from './overflow-tracker'

jest.useFakeTimers()

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('OverflowTracker', () => {
  it('sends the result with passed postMessage function after delay', () => {
    const postMessage = jest.fn()
    new OverflowTracker(postMessage)

    // Delay
    jest.advanceTimersByTime(149)
    expect(postMessage).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(postMessage).toHaveBeenCalledWith(eventType, {
      overflowElements: [],
    })
  })

  it('detects the overflow content from <section> with assigned data attributes about line number', () => {
    document.body.innerHTML = `
      <section id="1" ${dataStartLine}="1" ${dataEndLine}="1">No overflow</section>
      <section id="2" ${dataStartLine}="2" ${dataEndLine}="2">Overflow X</section>
      <section id="3" ${dataStartLine}="3" ${dataEndLine}="3">Overflow Y</section>
      <section id="4" ${dataStartLine}="4" ${dataEndLine}="4">Both</section>
      <section id="5" ${dataStartLine}="5" ${dataEndLine}="5">Changeable</section>
    `

    // No overflow
    Object.defineProperties(document.getElementById('1'), {
      clientWidth: { configurable: true, get: () => 1280 },
      clientHeight: { configurable: true, get: () => 720 },
      scrollWidth: { configurable: true, get: () => 1280 },
      scrollHeight: { configurable: true, get: () => 720 },
    })

    // Overflow X
    Object.defineProperties(document.getElementById('2'), {
      clientWidth: { configurable: true, get: () => 1280 },
      clientHeight: { configurable: true, get: () => 720 },
      scrollWidth: { configurable: true, get: () => 1281 },
      scrollHeight: { configurable: true, get: () => 720 },
    })

    // Overflow Y
    Object.defineProperties(document.getElementById('3'), {
      clientWidth: { configurable: true, get: () => 1280 },
      clientHeight: { configurable: true, get: () => 720 },
      scrollWidth: { configurable: true, get: () => 1280 },
      scrollHeight: { configurable: true, get: () => 721 },
    })

    // Both
    Object.defineProperties(document.getElementById('4'), {
      clientWidth: { configurable: true, get: () => 1280 },
      clientHeight: { configurable: true, get: () => 720 },
      scrollWidth: { configurable: true, get: () => 1281 },
      scrollHeight: { configurable: true, get: () => 721 },
    })

    // Changeable
    const contentSize = { width: 1280, height: 720 }

    Object.defineProperties(document.getElementById('5'), {
      clientWidth: { configurable: true, get: () => 1280 },
      clientHeight: { configurable: true, get: () => 720 },
      scrollWidth: { configurable: true, get: () => contentSize.width },
      scrollHeight: { configurable: true, get: () => contentSize.height },
    })

    const postMessage = jest.fn()
    const tracker = new OverflowTracker(postMessage)
    jest.runOnlyPendingTimers()

    expect(postMessage).toHaveBeenCalledWith(eventType, {
      overflowElements: [
        { startLine: 2, endLine: 2 },
        { startLine: 3, endLine: 3 },
        { startLine: 4, endLine: 4 },
      ],
    })

    // Update
    postMessage.mockClear()

    contentSize.height = 1281
    tracker.update()
    jest.runOnlyPendingTimers()

    expect(postMessage).toHaveBeenCalledWith(eventType, {
      overflowElements: [
        { startLine: 2, endLine: 2 },
        { startLine: 3, endLine: 3 },
        { startLine: 4, endLine: 4 },
        { startLine: 5, endLine: 5 },
      ],
    })
  })
})
