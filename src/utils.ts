import { TextDocument, workspace } from 'vscode'

export const frontMatterRegex = /^(-{3,}\s*$\n)([\s\S]*?)^(\s*-{3})/m

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

export const marpConfiguration = () =>
  workspace.getConfiguration('markdown.marp')
