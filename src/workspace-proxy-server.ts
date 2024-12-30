import type { Server } from 'node:http'
import path from 'node:path'
import express from 'express'
import { getPortPromise } from 'portfinder'
import { FileType, Uri, workspace, WorkspaceFolder } from 'vscode'

export interface WorkspaceProxyServer {
  dispose: () => void
  port: number
}

export const createWorkspaceProxyServer = async (
  workspaceFolder: WorkspaceFolder,
): Promise<WorkspaceProxyServer> => {
  const port = await getPortPromise({
    port: 8192 + Math.floor(Math.random() * 10000),
  })

  const app = express().get('*', async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const vscodeUri = workspaceFolder.uri.with({
      fragment: url.hash,
      path: Uri.joinPath(workspaceFolder.uri, url.pathname).path,
      query: url.search,
    })

    try {
      const urlExt = path.extname(url.pathname)
      if (urlExt) res.type(urlExt)

      const fileStat = await workspace.fs.stat(vscodeUri)

      res
        .header('Content-Length', fileStat.size.toString())
        .header('Last-Modified', new Date(fileStat.mtime).toUTCString())

      if (!(fileStat.type & FileType.Directory)) {
        console.debug(
          `[Proxy request]: ${req.url} -> ${vscodeUri.toString()} (200)`,
        )

        res
          .status(200)
          .send(Buffer.from(await workspace.fs.readFile(vscodeUri)))

        return
      }
    } catch (e) {
      console.warn(e)
    }

    console.debug(
      `[Proxy request]: ${req.url} -> ${vscodeUri.toString()} (404)`,
    )
    res.status(404).send('Not found')
  })

  const server = await new Promise<Server>((res) => {
    const _server = app.listen(port, '127.0.0.1', () => res(_server))
  })

  return { port, dispose: () => server.close() }
}
