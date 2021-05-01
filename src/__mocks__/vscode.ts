type MockedConf = Record<string, any>

const defaultVSCodeVersion = 'v1.36.0'
const defaultConf: MockedConf = {
  'markdown.marp.breaks': 'on',
  'markdown.marp.chromePath': '',
  'markdown.marp.enableHtml': false,
  'markdown.marp.exportType': 'pdf',
  'markdown.marp.outlineExtension': true,
  'window.zoomLevel': 0,
}

let currentConf: MockedConf = {}

const uriInstances: Record<string, any> = {}
const uriInstance = (path: string) =>
  uriInstances[path] ||
  (() => {
    const uri = { fsPath: path, with: jest.fn(() => uri) }
    return uri
  })()

export class CodeAction {
  // command?: Command
  diagnostics?: Diagnostic[]
  edit?: WorkspaceEdit
  isPreferred?: boolean

  constructor(public title: string, public kind?: CodeActionKind) {}
}

export class CodeActionKind {
  static readonly QuickFix = new CodeActionKind('QuickFix')

  constructor(readonly value: string) {}
}

export class Diagnostic {
  code?: string
  source?: string

  constructor(
    public range: Range,
    public message: string,
    public severity?: DiagnosticSeverity
  ) {}
}

export enum DiagnosticSeverity {
  Error,
  Warning,
  Information,
  Hint,
}

export class Position {
  translate(lineDelta = 0, characterDelta = 0) {
    return new Position(this.line + lineDelta, this.character + characterDelta)
  }

  constructor(readonly line: number, readonly character: number) {}
}

export const ProgressLocation = {
  Notification: 'notification',
}

export class Range {
  constructor(readonly start: Position, readonly end: Position) {}
}

export const RelativePattern = jest.fn()

export const Uri = {
  file: uriInstance,
  parse: uriInstance,
}

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
}

export const env = {
  openExternal: jest.fn(),
}

export const languages = {
  createDiagnosticCollection: jest.fn((name) => ({
    name,
    delete: jest.fn(),
    set: jest.fn(),
  })),
  registerCodeActionsProvider: jest.fn(),
  setTextDocumentLanguage: jest.fn(),
}

export let version: string = defaultVSCodeVersion
export const _setVSCodeVersion = (value: string) => {
  version = value
}

export const window = {
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: jest.fn(),
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showSaveDialog: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
}

export const workspace = {
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
  })),
  getConfiguration: jest.fn((section?: string) => ({
    get: jest.fn(
      (subSection?: string) =>
        currentConf[[section, subSection].filter((s) => s).join('.')]
    ),
  })),
  getWorkspaceFolder: jest.fn(),
  onDidChangeConfiguration: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  textDocuments: [] as any,

  _setConfiguration: (conf: MockedConf = {}) => {
    currentConf = { ...defaultConf, ...conf }
  },
}

export class WorkspaceEdit {
  readonly delete = jest.fn()
}

beforeEach(() => {
  window.activeTextEditor = undefined
  workspace.textDocuments = []
  workspace._setConfiguration()
  _setVSCodeVersion(defaultVSCodeVersion)
})
