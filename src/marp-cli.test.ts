// tslint:disable-next-line: import-name
import * as marpCliModule from '@marp-team/marp-cli'
import fs from 'fs'
import { tmpdir } from 'os'
import { workspace } from 'vscode'
import * as marpCli from './marp-cli'

jest.mock('vscode')

describe('Marp CLI integration', () => {
  const runMarpCli = marpCli.default

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
  })

  it('runs Marp CLI with passed args and --no-stdin option', async () => {
    const marpCliSpy = jest.spyOn(marpCliModule, 'default')
    await runMarpCli('--version')

    // --no-stdin prevents getting stuck
    expect(marpCliSpy).toBeCalledWith(['--no-stdin', '--version'])
  })

  it('throws MarpCLIError when returned error exit code', async () => {
    jest.spyOn(marpCliModule, 'default').mockResolvedValue(1)
    expect(runMarpCli('--version')).rejects.toThrow(marpCli.MarpCLIError)
  })

  it('throws error with helpful message when outputed error about Chrome', async () => {
    jest.spyOn(marpCliModule, 'default').mockImplementation(() => {
      console.error('Chromium revision is not downloaded.')
      return Promise.resolve(1)
    })

    expect(runMarpCli('--version')).rejects.toThrow(/Google Chrome/)
  })
})

describe('#createWorkFile', () => {
  const { createWorkFile } = marpCli

  let fsMock: Record<string, jest.Mock>

  beforeEach(() => {
    fsMock = {
      unlink: jest.spyOn(fs, 'unlink').mockImplementation((_, cb) => cb(null)),
      writeFile: jest
        .spyOn(fs, 'writeFile')
        .mockImplementation((_, __, cb) => cb(null)),
    }
  })

  it('returns to use an original when passed a clean file', async () => {
    const workFile = await createWorkFile({
      isDirty: false,
      uri: { scheme: 'file', fsPath: '/tmp/clean.md' },
    } as any)

    expect(workFile.path).toEqual('/tmp/clean.md')

    await workFile.cleanup()
    expect(fsMock.unlink).not.toBeCalled()
  })

  it('creates tmpfile to same directory of file when passed a dirty file', async () => {
    const workFile = await createWorkFile({
      getText: jest.fn(() => 'example'),
      isDirty: true,
      uri: { scheme: 'file', fsPath: '/tmp/dirty.md' },
    } as any)

    expect(workFile.path).toMatch(/^\/tmp\/\.marp-vscode-tmp.+$/)
    expect(fsMock.writeFile).toBeCalledWith(
      workFile.path,
      'example',
      expect.any(Function)
    )

    await workFile.cleanup()
    expect(fsMock.unlink).toBeCalledWith(workFile.path, expect.any(Function))
  })

  it('creates tmpfile to workspace root when failed creating to same dir', async () => {
    // Simulate that creation to same directory is not permited
    const err = fsMock.writeFile.mockImplementationOnce((_, __, cb) =>
      cb(new Error())
    )

    jest
      .spyOn(workspace, 'getWorkspaceFolder')
      .mockImplementationOnce(
        (): any => ({ uri: { scheme: 'file', fsPath: '/workspace/' } })
      )

    const workFile = await createWorkFile({
      getText: jest.fn(),
      isDirty: true,
      uri: { scheme: 'file', fsPath: '/workspace/tmp/dirty.md' },
    } as any)

    expect(workFile.path).toMatch(/^\/workspace\/\.marp-vscode-tmp.+$/)
  })

  it('creates tmpfile to os specific directory when failed all creations', async () => {
    fsMock.writeFile.mockImplementationOnce((_, __, cb) => cb(new Error()))

    const workFile = await createWorkFile({
      getText: jest.fn(),
      isDirty: true,

      // Untitled document cannot detect belonged workspace
      uri: { scheme: 'untitled', fsPath: 'Untitled-1' },
    } as any)

    expect(workFile.path).toContain(tmpdir())
  })
})
