/* tslint:disable: variable-name */
type MockedConf = Record<string, any>

const defaultConf: MockedConf = {
  'markdown.marp.breaks': 'on',
  'markdown.marp.chromePath': '',
  'markdown.marp.enableHtml': false,
  'window.zoomLevel': 0,
}

let currentConf: MockedConf = {}

export const ProgressLocation = {
  Notification: 'notification',
}

export const Uri = {
  file: (path: string) => ({ fsPath: path }),
}

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
}

export const env = {
  openExternal: jest.fn(),
}

export const window = {
  activeTextEditor: undefined,
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showSaveDialog: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
}

export const workspace = {
  getConfiguration: jest.fn((section?: string) => ({
    get: jest.fn(
      (subSection?: string) =>
        currentConf[[section, subSection].filter(s => s).join('.')]
    ),
  })),
  getWorkspaceFolder: jest.fn(),
  onDidChangeConfiguration: jest.fn(),

  _setConfiguration: (conf: MockedConf = {}) => {
    currentConf = { ...defaultConf, ...conf }
  },
}

beforeEach(() => {
  window.activeTextEditor = undefined
  workspace._setConfiguration()
})
