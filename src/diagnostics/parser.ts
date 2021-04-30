import rehypeParse from 'rehype-parse'
import remarkParse from 'remark-parse'
import unified from 'unified'
import yaml from 'yaml'

export const parseHtml = unified().use(rehypeParse).parse
export const parseMd = unified().use(remarkParse).parse
export const parseYaml = (yamlBody: string) =>
  yaml.parseDocument(yamlBody, { schema: 'failsafe' })
