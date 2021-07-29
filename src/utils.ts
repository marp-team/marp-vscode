import { AbortController } from 'abort-controller'
import nodeFetch from 'node-fetch'
import { TextDocument, workspace } from 'vscode'

interface FetchOption {
  timeout?: number
}

export const frontMatterRegex = /^(-{3,}\s*$\n)([\s\S]*?)^(\s*[-.]{3})/m

export const marpDirectiveRegex = /^(marp\s*: +)(.*)\s*$/m

export const detectFrontMatter = (markdown: string): string | undefined => {
  const m = markdown.match(frontMatterRegex)
  return m?.index === 0 ? m[2] : undefined
}

export const detectMarpDocument = (doc: TextDocument): boolean =>
  doc.languageId === 'markdown' && detectMarpFromMarkdown(doc.getText())

export const detectMarpFromMarkdown = (markdown: string): boolean => {
  const frontmatter = detectFrontMatter(markdown)
  if (!frontmatter) return false

  const matched = marpDirectiveRegex.exec(frontmatter)
  return matched ? matched[2] === 'true' : false
}

export const fetch = (url: string, { timeout = 5000 }: FetchOption = {}) => {
  const controller = new AbortController()
  const timeoutCallback = setTimeout(() => controller.abort(), timeout)

  return nodeFetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok)
        throw new Error(`Failured fetching ${res.url} (${res.status})`)

      return res.text()
    })
    .finally(() => {
      clearTimeout(timeoutCallback)
    })
}

export const marpConfiguration = () =>
  workspace.getConfiguration('markdown.marp')
