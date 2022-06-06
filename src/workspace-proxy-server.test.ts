import fetchPonyfill from 'fetch-ponyfill'
import { FileType, Uri, workspace } from 'vscode'
import { textEncoder } from './utils'
import {
  createWorkspaceProxyServer,
  WorkspaceProxyServer,
} from './workspace-proxy-server'

jest.mock('vscode')

describe('Workspace Proxy Server', () => {
  let server: WorkspaceProxyServer | undefined

  const { fetch } = fetchPonyfill()
  const wsUri: Uri = Uri.file('/test/path/subdir')
  const wsFolder: any = { uri: wsUri }

  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    server = undefined
  })

  afterEach(() => server?.dispose())

  it('listens proxy server', async () => {
    jest
      .spyOn(workspace.fs, 'readFile')
      .mockResolvedValue(textEncoder.encode('readFile'))

    const wsUriWithSpy = jest.spyOn(wsUri, 'with')

    server = await createWorkspaceProxyServer(wsFolder)
    expect(server.port).toBeGreaterThanOrEqual(8192)

    const response = await fetch(
      `http://127.0.0.1:${server.port}/test.png?query`
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toMatchInlineSnapshot(`"readFile"`)

    expect(response.headers.get('content-type')).toContain('image/png')
    expect(wsUriWithSpy).toHaveBeenCalledWith({
      path: '/test/path/subdir/test.png',
      query: '?query',
      fragment: '',
    })
    expect(workspace.fs.readFile).toHaveBeenCalled()
  })

  it('returns 404 when FileSystem.stat throws error', async () => {
    jest.spyOn(workspace.fs, 'stat').mockRejectedValue(new Error('err'))
    server = await createWorkspaceProxyServer(wsFolder)

    const response = await fetch(`http://127.0.0.1:${server.port}/test`)
    expect(response.status).toBe(404)
  })

  it('returns 404 when FileSystem.stat returns with directory type', async () => {
    jest.spyOn(workspace.fs, 'stat').mockResolvedValue({
      ctime: 0,
      mtime: new Date().getDate(),
      size: 0,
      type: FileType.Directory,
    })
    server = await createWorkspaceProxyServer(wsFolder)

    const response = await fetch(`http://127.0.0.1:${server.port}/test`)
    expect(response.status).toBe(404)
  })
})
