/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { observer } from '@marp-team/marp-core/browser'
import preview from './preview'

jest.mock('@marp-team/marp-core/browser')

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.body.className = ''
})

describe('Preview HTML', () => {
  it('does not call browser context JS when HTML has not Marp slide', () => {
    preview()
    expect(observer).not.toHaveBeenCalled()
  })

  it('calls only browser context JS when HTML has Marp slide', () => {
    document.body.innerHTML = '<div id="__marp-vscode"></div>'

    preview()
    expect(document.body.classList.contains('marp-vscode')).toBe(true)
    expect(observer).toHaveBeenCalled()
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
        .marpVscodeHref
    ).toContain('/other-extension/defined.css')
    expect(document.getElementById('__marp-vscode-style')).toBeTruthy()
    expect(document.getElementById('_defaultStyles')).toBeTruthy()
  })

  describe('Incremental update', () => {
    const emitUpdateEvent = () =>
      window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'))

    describe('Marp Core browser context JS', () => {
      it('calls observer when activated and calls clean-up function when deactivated', () => {
        const cleanup = jest.fn()
        ;(observer as jest.Mock).mockImplementation(cleanup)

        preview()
        expect(document.body.classList.contains('marp-vscode')).toBe(false)
        expect(observer).not.toHaveBeenCalled()

        document.body.innerHTML = '<div id="__marp-vscode"></div>'
        emitUpdateEvent()
        expect(document.body.classList.contains('marp-vscode')).toBe(true)
        expect(observer).toHaveBeenCalled()

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
  })
})
