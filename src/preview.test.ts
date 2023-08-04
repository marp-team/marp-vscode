/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { browser } from '@marp-team/marp-core/browser'
import preview from './preview'

jest.mock('@marp-team/marp-core/browser')

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

    describe('Marp Core browser context JS', () => {
      it('calls browser script when activated and calls clean-up function when deactivated', () => {
        const cleanup = jest.fn()
        ;(browser as jest.Mock).mockImplementation(cleanup)

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
        expect(cleanup).toHaveBeenCalled()
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
