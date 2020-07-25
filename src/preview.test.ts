/** @jest-environment jsdom */
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
    document.body.innerHTML = '<div id="marp-vscode"></div>'

    preview()
    expect(document.body.classList.contains('marp-vscode')).toBe(true)
    expect(observer).toHaveBeenCalled()
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
    expect(document.querySelector('link')?.href).toContain('marp-vscode')
  })
})
