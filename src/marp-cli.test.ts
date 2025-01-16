import { tmpdir } from 'node:os'
import path from 'node:path'
import * as marpCliModule from '@marp-team/marp-cli'
import { workspace } from 'vscode'
import * as marpCli from './marp-cli'
import { textEncoder } from './utils'

jest.mock('vscode')

describe('Marp CLI integration', () => {
  const runMarpCli = marpCli.default

  let errorMock: jest.SpyInstance
  let infoMock: jest.SpyInstance
  let logMock: jest.SpyInstance

  beforeEach(() => {
    errorMock = jest.spyOn(console, 'error').mockImplementation()
    infoMock = jest.spyOn(console, 'info').mockImplementation()
    logMock = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    errorMock?.mockRestore()
    infoMock?.mockRestore()
    logMock?.mockRestore()
  })

  it('runs Marp CLI with passed args', async () => {
    const marpCliSpy = jest.spyOn(marpCliModule, 'marpCli').mockResolvedValue(0)
    await runMarpCli(['--version'])

    expect(marpCliSpy).toHaveBeenCalledWith(['--version'], undefined)
  })

  it('throws MarpCLIError when returned error exit code', async () => {
    const marpCliMock = jest
      .spyOn(marpCliModule, 'marpCli')
      .mockResolvedValue(1)

    try {
      await expect(runMarpCli(['--version'])).rejects.toThrow(
        marpCli.MarpCLIError,
      )
    } finally {
      marpCliMock.mockRestore()
    }
  })
})

describe('#createWorkFile', () => {
  const { createWorkFile } = marpCli

  it('returns to use an original when passed a clean file', async () => {
    const workFile = await createWorkFile({
      isDirty: false,
      uri: { scheme: 'file', fsPath: '/tmp/clean.md' },
    } as any)

    expect(workFile.path).toBe('/tmp/clean.md')

    await workFile.cleanup()
    expect(workspace.fs.delete).not.toHaveBeenCalled()
  })

  it('creates tmpfile to same directory of file when passed a dirty file', async () => {
    const workFile = await createWorkFile({
      getText: jest.fn(() => 'example'),
      isDirty: true,
      uri: { scheme: 'file', fsPath: '/tmp/dirty.md' },
    } as any)

    expect(
      workFile.path.startsWith(path.join('/tmp', '.marp-vscode-tmp')),
    ).toBe(true)

    expect(workspace.fs.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: workFile.path }),
      textEncoder.encode('example'),
    )

    await workFile.cleanup()
    expect(workspace.fs.delete).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: workFile.path }),
      expect.any(Object),
    )
  })

  it('creates tmpfile to workspace root when failed creating to same dir', async () => {
    // Simulate that creation to same directory is not permitted
    const writeFileMock = jest
      .spyOn(workspace.fs, 'writeFile')
      .mockRejectedValueOnce(new Error())

    const getWorkspaceFolderMock = jest
      .spyOn(workspace, 'getWorkspaceFolder')
      .mockImplementationOnce((): any => ({
        uri: { scheme: 'file', fsPath: '/workspace/' },
      }))

    try {
      const workFile = await createWorkFile({
        getText: jest.fn(),
        isDirty: true,
        uri: { scheme: 'file', fsPath: '/workspace/tmp/dirty.md' },
      } as any)

      expect(
        workFile.path.startsWith(path.join('/workspace', '.marp-vscode-tmp')),
      ).toBe(true)
    } finally {
      writeFileMock.mockRestore()
      getWorkspaceFolderMock.mockRestore()
    }
  })

  it('creates tmpfile to os specific directory when failed all creations', async () => {
    const workFile = await createWorkFile({
      getText: jest.fn(),
      isDirty: true,

      // Untitled document cannot detect belonged workspace
      uri: { scheme: 'untitled', fsPath: 'Untitled-1' },
    } as any)

    expect(workFile.path).toContain(tmpdir())
  })
})
