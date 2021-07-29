import fetch from 'node-fetch'
import { FileType, Uri, workspace } from 'vscode'
import {
  createWorkspaceProxyServer,
  WorkspaceProxyServer,
} from './workspace-proxy-server'

jest.mock('vscode')

describe('Workspace Proxy Server', () => {
  let server: WorkspaceProxyServer | undefined

  const wsUri: Uri = Object.assign(Uri.parse('untitled:untitled'), {
    with: jest.fn(() => wsUri),
  })
  const wsFolder: any = { uri: wsUri }

  beforeEach(() => {
    ;(wsUri.with as any).mockReset()
    server = undefined
  })

  afterEach(() => server?.dispose())

  it('listens proxy server', async () => {
    server = await createWorkspaceProxyServer(wsFolder)
    expect(server.port).toBeGreaterThanOrEqual(8192)

    const response = await fetch(
      `http://127.0.0.1:${server.port}/test.png?query`
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toMatchInlineSnapshot(`"readFile"`)

    expect(response.headers.get('content-type')).toContain('image/png')
    expect(wsUri.with).toHaveBeenCalledWith({
      path: '/test.png',
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
