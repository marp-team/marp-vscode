import { lm } from 'vscode'
import { registerLM } from './lm'

const expectedTools = ['export_marp'] as const

describe('#registerLM', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('registers tools to subscriptions', () => {
    jest.spyOn(lm, 'registerTool').mockImplementation((id: any) => id)

    const subscriptions: any[] = []
    registerLM(subscriptions)

    expect(subscriptions).toHaveLength(expectedTools.length)
    expect(subscriptions).toStrictEqual(expect.arrayContaining(expectedTools))
  })
})
