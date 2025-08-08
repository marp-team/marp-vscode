/** @jest-environment jsdom */
import { browser } from '@marp-team/marp-core/browser'
import type { MarpCoreBrowser } from '@marp-team/marp-core/browser'
import preview from './preview'
import { OverflowTracker } from './preview/overflow-tracker'

jest.mock('@marp-team/marp-core/browser', () => ({
  browser: jest.fn(() => {
    const browserController = jest.fn()

    return Object.assign(browserController, {
      cleanup: browserController,
      update: jest.fn(),
    }) satisfies MarpCoreBrowser
  }),
}))

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.body.className = ''
})

describe('Preview HTML', () => {
  let debugMock: jest.SpyInstance

  beforeEach(() => {
    debugMock = jest.spyOn(console, 'debug').mockImplementation()
  })

  afterEach(() => {
    debugMock?.mockRestore()
  })

  it('does not call browser context JS when HTML has not Marp slide', () => {
    preview()
    expect(browser).not.toHaveBeenCalled()
  })

  it('calls only browser context JS when HTML has Marp slide', () => {
    document.body.innerHTML = '<div id="__marp-vscode"></div>'

    preview()
    expect(document.body.classList.contains('marp-vscode')).toBe(true)
    expect(browser).toHaveBeenCalled()
  })

  it('makes inactive all styles excepted Marp and user contents when HTML has Marp slide', () => {
    document.head.innerHTML = `
      <style id="_defaultStyles">a {}</style>
      <link rel="stylesheet" href="vscode-resource:/other-extension/defined.css" />
      <link rel="stylesheet" href="vscode-resource:/marp-team.marp-vscode-x.x.x/marp-vscode.css" />
    `.trim()

    document.body.innerHTML = `
      <style id="another-plugin">a {}</style>
      <style id="__marp-vscode-style">a {}</style>
      <div id="__marp-vscode">
        <style id="style-in-markdown-content">a {}</style>
        <link rel="stylesheet" href="vscode-resource:/style/in/markdown/content" />
      </div>
    `.trim()

    expect(document.querySelectorAll('style:not(:empty)')).toHaveLength(4)
    expect(document.querySelectorAll('link[href]')).toHaveLength(3)

    preview()

    expect(document.querySelectorAll('style:not(:empty)')).toHaveLength(3)
    expect(document.querySelector('style:empty')?.id).toBe('another-plugin')
    expect(document.querySelectorAll('link[href]')).toHaveLength(2)
    expect(
      document.querySelector<HTMLLinkElement>('link:not([href])')?.dataset
        .marpVscodeHref,
    ).toContain('/other-extension/defined.css')
    expect(document.getElementById('__marp-vscode-style')).toBeTruthy()
    expect(document.getElementById('_defaultStyles')).toBeTruthy()
  })

  describe('Incremental update', () => {
    const emitUpdateEvent = () =>
      window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'))

    describe('Marp state', () => {
      describe('Marp Core browser context JS', () => {
        it('calls browser script when activated and calls clean-up function when deactivated', () => {
          preview()
          expect(document.body.classList.contains('marp-vscode')).toBe(false)
          expect(browser).not.toHaveBeenCalled()

          document.body.innerHTML = '<div id="__marp-vscode"></div>'
          emitUpdateEvent()
          expect(document.body.classList.contains('marp-vscode')).toBe(true)
          expect(browser).toHaveBeenCalled()

          document.body.innerHTML = ''
          emitUpdateEvent()
          expect(document.body.classList.contains('marp-vscode')).toBe(false)
          expect(browser).toHaveBeenCalled()
        })
      })

      describe('Overflow tracker', () => {
        const updateSpy = jest.spyOn(OverflowTracker.prototype, 'update')
        const vscodeWindow: Window & {
          cspAlerter?: {
            _messaging: { postMessage: (type: string, data: unknown) => void }
          }
          styleLoadingMonitor?: {
            _poster: { postMessage: (type: string, data: unknown) => void }
          }
        } = window

        const cspAlerterGetter = jest.fn()
        const styleLoadingMonitorGetter = jest.fn()

        beforeEach(() => {
          document.body.innerHTML = '<div id="__marp-vscode"></div>'

          Object.defineProperties(window, {
            cspAlerter: { configurable: true, get: cspAlerterGetter },
            styleLoadingMonitor: {
              configurable: true,
              get: styleLoadingMonitorGetter,
            },
          }) satisfies typeof vscodeWindow
        })

        afterEach(() => {
          delete vscodeWindow.cspAlerter
          delete vscodeWindow.styleLoadingMonitor
        })

        it('does not create overflow tracker if the postMessage function in the global context was not available', () => {
          expect(updateSpy).not.toHaveBeenCalled()
          preview()
          expect(updateSpy).not.toHaveBeenCalled()
        })

        it('creates overflow tracker if the postMessage function in window.cspAlerter was available', () => {
          cspAlerterGetter.mockImplementation(() => ({
            _messaging: { postMessage: jest.fn() },
          }))

          expect(updateSpy).not.toHaveBeenCalled()
          preview()
          expect(updateSpy).toHaveBeenCalled()
        })

        it('creates overflow tracker if the postMessage function in window.styleLoadingMonitor was available', () => {
          styleLoadingMonitorGetter.mockImplementation(() => ({
            _poster: { postMessage: jest.fn() },
          }))

          expect(updateSpy).not.toHaveBeenCalled()
          preview()
          expect(updateSpy).toHaveBeenCalled()
        })
      })
    })

    describe('Styles', () => {
      it('tries to activate/deactivate whenever updated Markdown content', () => {
        document.head.innerHTML = '<link id="link" rel="stylesheet" href="x" />'
        document.body.innerHTML = '<style id="style">a {}</style><main></main>'

        const link = document.querySelector<HTMLLinkElement>('link')!
        const style = document.querySelector<HTMLStyleElement>('style')!
        const main = document.querySelector<HTMLElement>('main')!

        preview()
        expect(link.href).toBeTruthy()
        expect(style.textContent).toBeTruthy()

        main.innerHTML = '<div id="__marp-vscode"></div>'
        emitUpdateEvent()
        expect(link.href).toBeFalsy()
        expect(style.textContent).toBeFalsy()

        main.innerHTML = ''
        emitUpdateEvent()
        expect(link.href).toBeTruthy()
        expect(style.textContent).toBeTruthy()
      })
    })

    describe('Custom elements', () => {
      it('forces replacing node if the custom element via "is" attribute is not upgraded', () => {
        const CustomHTMLElement = class extends HTMLElement {}
        customElements.define('custom-element', CustomHTMLElement)

        document.body.innerHTML = `
          <div id="__marp-vscode">
            <custom-element is="custom-element">test</custom-element>
            <div is="custom-element">test</div>
            <p class="klass" data-attribute="test">test</p>
          </div>
        `.trim()

        preview()

        const explicitCustomElement = document.querySelector('custom-element')!
        // const isExplicitCustomElement = document.querySelector('div[is]')!
        const paragraphElement = document.querySelector('p')!
        paragraphElement.setAttribute('is', 'custom-element')

        expect(explicitCustomElement).toBeInstanceOf(CustomHTMLElement)
        // expect(isExplicitCustomElement).toBeInstanceOf(CustomHTMLElement) // JSDOM does not support custom elements via "is"
        expect(paragraphElement).toBeInstanceOf(HTMLParagraphElement)
        expect(paragraphElement.isConnected).toBe(true)

        emitUpdateEvent()
        expect(paragraphElement.isConnected).toBe(false)

        // Keep original attributes in a new element
        const newParagraphElement = document.querySelector('p')!
        expect(newParagraphElement.classList.contains('klass')).toBe(true)
        expect(newParagraphElement.dataset.attribute).toBe('test')
      })
    })
  })
})
