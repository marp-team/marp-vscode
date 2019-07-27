import { Uri, workspace } from 'vscode'
import * as option from './option'

jest.mock('vscode')

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

describe('Option', () => {
  describe('#marpCoreOptionForCLI', () => {
    const subject: Function = option.marpCoreOptionForCLI
    const untitledUri = Uri.parse('untitled:untitled')

    it('returns basic options', async () => {
      const opts = await subject({ uri: untitledUri })

      // --allow-local-files
      expect(opts.allowLocalFiles).toBe(true)
    })

    it('enables HTML by preference', async () => {
      setConfiguration({ 'markdown.marp.enableHtml': true })
      expect((await subject({ uri: untitledUri })).html).toBe(true)

      setConfiguration({ 'markdown.marp.enableHtml': false })
      expect((await subject({ uri: untitledUri })).html).toBeUndefined()
    })

    it('enables breaks in markdown conversion by preference', async () => {
      setConfiguration({ 'markdown.marp.breaks': 'on' })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(true)

      setConfiguration({ 'markdown.marp.breaks': 'off' })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(false)

      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': true,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(true)

      setConfiguration({
        'markdown.marp.breaks': 'inherit',
        'markdown.preview.breaks': false,
      })
      expect(
        (await subject({ uri: untitledUri })).options.markdown.breaks
      ).toBe(false)
    })
  })
})
