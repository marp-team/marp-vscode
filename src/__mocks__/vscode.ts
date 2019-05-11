interface MockedConf {
  [key: string]: any
}

const defaultConf: MockedConf = {
  'markdown.marp.breaks': 'on',
  'markdown.marp.enableHtml': false,
  'window.zoomLevel': 0,
}

let currentConf: MockedConf = {}

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
}

export const workspace = {
  getConfiguration: jest.fn((section?: string) => ({
    get: jest.fn(
      (subSection?: string) =>
        currentConf[[section, subSection].filter(s => s).join('.')]
    ),
  })),
  onDidChangeConfiguration: jest.fn(),

  _setConfiguration: (conf: MockedConf = {}) => {
    currentConf = { ...defaultConf, ...conf }
  },
}

beforeEach(() => workspace._setConfiguration())
