/** @jest-environment jsdom */
import browserCjs from '@marp-team/marp-core/lib/browser.cjs'
import { webkit } from '@marp-team/marpit-svg-polyfill'
import preview from './preview'

jest.mock('@marp-team/marp-core/lib/browser.cjs')
jest.mock('@marp-team/marpit-svg-polyfill')

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.body.className = ''
})

describe('Preview HTML', () => {
  it('does not call browser context JS when HTML has not Marp slide', () => {
    preview()
    expect(browserCjs).not.toBeCalled()
    expect(webkit).not.toBeCalled()
  })

  it('calls browser context JS when HTML has Marp slide', () => {
    document.body.innerHTML = '<div id="marp-vscode"></div>'

    preview()
    expect(document.body.classList.contains('marp-vscode')).toBe(true)
    expect(browserCjs).toBeCalled()
    expect(webkit).toBeCalled()
  })

  it('removes all styles excepted Marp when HTML has Marp slide', () => {
    document.head.innerHTML = `
      <style id="_defaultStyles"></style>
      <link rel="stylesheet" href="vscode-resource:/user/defined.css" />
      <link rel="stylesheet" href="vscode-resource:/marp-team.marp-vscode-x.x.x/style.css" />
    `.trim()

    document.body.innerHTML = `
      <style id="another-plugin"></style>
      <style id="marp-vscode-style"></style>
      <div id="marp-vscode"></div>
    `.trim()

    expect(document.querySelectorAll('style')).toHaveLength(3)
    expect(document.querySelectorAll('link')).toHaveLength(2)

    preview()

    expect(document.querySelectorAll('style')).toHaveLength(2)
    expect(document.getElementById('marp-vscode-style')).toBeTruthy()
    expect(document.getElementById('_defaultStyles')).toBeTruthy()
    expect(document.querySelectorAll('link')).toHaveLength(1)
    expect(document.querySelector('link')!.href).toContain('marp-vscode')
  })
})
