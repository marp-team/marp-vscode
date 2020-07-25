import * as marpCliModule from '@marp-team/marp-cli'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { workspace } from 'vscode'
import * as marpCli from './marp-cli'

jest.mock('fs')
jest.mock('vscode')

const setConfiguration: (conf?: object) => void = (workspace as any)
  ._setConfiguration

describe('Marp CLI integration', () => {
  const runMarpCli = marpCli.default

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
  })

  it('runs Marp CLI with passed args', async () => {
    const marpCliSpy = jest.spyOn(marpCliModule, 'marpCli')
    await runMarpCli('--version')

    expect(marpCliSpy).toBeCalledWith(['--version'])
  })

  it('throws MarpCLIError when returned error exit code', async () => {
    jest.spyOn(marpCliModule, 'marpCli').mockResolvedValue(1)
    await expect(runMarpCli('--version')).rejects.toThrow(marpCli.MarpCLIError)
  })

  it('throws error with helpful message when outputed error about Chrome', async () => {
    jest
      .spyOn(marpCliModule, 'marpCli')
      .mockRejectedValue(
        new marpCliModule.CLIError(
          'mocked error',
          marpCliModule.CLIErrorCode.NOT_FOUND_CHROMIUM
        )
      )

    await expect(runMarpCli('--version')).rejects.toThrow(/Google Chrome/)
  })

  describe('with markdown.marp.chromePath preference', () => {
    it('runs Marp CLI with overridden CHROME_PATH environment', async () => {
      const { CHROME_PATH } = process.env
      expect(process.env.CHROME_PATH).toBe(CHROME_PATH)

      setConfiguration({ 'markdown.marp.chromePath': __filename })

      const marpCliSpy = jest
        .spyOn(marpCliModule, 'marpCli')
        .mockImplementation(async () => {
          expect(process.env.CHROME_PATH).toBe(__filename)
          return 0
        })

      await runMarpCli('--version')
      expect(marpCliSpy).toBeCalled()
      expect(process.env.CHROME_PATH).toBe(CHROME_PATH)
    })
  })
})

describe('#createWorkFile', () => {
  const { createWorkFile } = marpCli

  it('returns to use an original when passed a clean file', async () => {
    const workFile = await createWorkFile({
      isDirty: false,
      uri: { scheme: 'file', fsPath: '/tmp/clean.md' },
    } as any)

    expect(workFile.path).toEqual('/tmp/clean.md')

    await workFile.cleanup()
    expect(fs.unlink).not.toBeCalled()
  })

  it('creates tmpfile to same directory of file when passed a dirty file', async () => {
    const workFile = await createWorkFile({
      getText: jest.fn(() => 'example'),
      isDirty: true,
      uri: { scheme: 'file', fsPath: '/tmp/dirty.md' },
    } as any)

    expect(
      workFile.path.startsWith(path.join('/tmp', '.marp-vscode-tmp'))
    ).toBe(true)

    expect(fs.writeFile).toBeCalledWith(
      workFile.path,
      'example',
      expect.any(Function)
    )

    await workFile.cleanup()
    expect(fs.unlink).toBeCalledWith(workFile.path, expect.any(Function))
  })

  it('creates tmpfile to workspace root when failed creating to same dir', async () => {
    // Simulate that creation to same directory is not permited
    const err = (fs as any).writeFile.mockImplementationOnce((_, __, cb) =>
      cb(new Error())
    )

    jest
      .spyOn(workspace, 'getWorkspaceFolder')
      .mockImplementationOnce((): any => ({
        uri: { scheme: 'file', fsPath: '/workspace/' },
      }))

    const workFile = await createWorkFile({
      getText: jest.fn(),
      isDirty: true,
      uri: { scheme: 'file', fsPath: '/workspace/tmp/dirty.md' },
    } as any)

    expect(
      workFile.path.startsWith(path.join('/workspace', '.marp-vscode-tmp'))
    ).toBe(true)
  })

  it('creates tmpfile to os specific directory when failed all creations', async () => {
    ;(fs as any).writeFile.mockImplementationOnce((_, __, cb) =>
      cb(new Error())
    )

    const workFile = await createWorkFile({
      getText: jest.fn(),
      isDirty: true,

      // Untitled document cannot detect belonged workspace
      uri: { scheme: 'untitled', fsPath: 'Untitled-1' },
    } as any)

    expect(workFile.path).toContain(tmpdir())
  })
})
