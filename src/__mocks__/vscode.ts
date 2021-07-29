import { TextEncoder } from 'util'

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
    const uri = { path, scheme: 'file', fsPath: path, with: jest.fn(() => uri) }
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

export enum CodeActionTriggerKind {
  Invoke = 1,
  Automatic = 2,
}

export class CompletionList {
  constructor(readonly items: any[]) {}
}

export enum CompletionItemKind {
  EnumMember,
  Property,
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
  translate(lineDelta?: number, characterDelta?: number): Position
  translate(change: { lineDelta?: number; characterDelta?: number }): Position
  translate(...args: any[]): Position {
    if (args[0]?.lineDelta || args[0]?.characterDelta) {
      return this.translate(args[0].lineDelta, args[0].characterDelta)
    }
    return new Position(
      this.line + (args[0] ?? 0),
      this.character + (args[1] ?? 0)
    )
  }

  isEqual(other: Position) {
    return this.line === other.line && this.character === other.character
  }

  constructor(readonly line: number, readonly character: number) {}
}

export const ProgressLocation = {
  Notification: 'notification',
}

export class Range {
  constructor(readonly start: Position, readonly end: Position) {}

  contains(position: Position) {
    return !(
      position.line < this.start.line ||
      position.line > this.end.line ||
      (position.line === this.start.line &&
        position.character < this.start.character) ||
      (position.line === this.end.line &&
        position.character > this.end.character)
    )
  }

  with(start?: Position, end?: Position): Range
  with(change: { start?: Position; end?: Position }): Range
  with(...args: any[]): Range {
    if (args[0]?.start || args[0]?.end) {
      return this.with(args[0].start, args[0].end)
    }
    return new Range(args[0] ?? this.start, args[1] ?? this.end)
  }
}

export class Selection extends Range {}

export const RelativePattern = jest.fn()

export const ThemeColor = jest.fn(() => '#000000ff')

export const Uri = {
  file: uriInstance,
  parse: uriInstance,
}

export const commands = {
  executeCommand: jest.fn(async () => {
    // no ops
  }),
  registerCommand: jest.fn(),
}

export const env = {
  openExternal: jest.fn(),
}

export const FileSystem = {
  stat: jest.fn(async () => ({
    ctime: 0,
    mtime: new Date().getTime(),
    size: 0,
    type: FileType.File,
  })),
  readFile: jest.fn().mockResolvedValue(new TextEncoder().encode('readFile')),
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export class Hover {
  constructor(public contents: string, public range?: Range) {}
}

export const languages = {
  createDiagnosticCollection: jest.fn((name) => ({
    name,
    delete: jest.fn(),
    set: jest.fn(),
  })),
  registerCodeActionsProvider: jest.fn(),
  registerCompletionItemProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
  setTextDocumentLanguage: jest.fn(),
}

export class MarkdownString {
  constructor(public value: string) {}

  toString() {
    return this.value
  }
}

export let version: string = defaultVSCodeVersion
export const _setVSCodeVersion = (value: string) => {
  version = value
}

export const window = {
  activeTextEditor: undefined,
  createTextEditorDecorationType: jest.fn((t) => t),
  onDidChangeActiveTextEditor: jest.fn(),
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showSaveDialog: jest.fn(),
  showTextDocument: jest.fn(async () => ({})),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
}

export const workspace = {
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
  })),
  fs: FileSystem,
  getConfiguration: jest.fn((section?: string) => ({
    get: jest.fn(
      (subSection?: string) =>
        currentConf[[section, subSection].filter((s) => s).join('.')]
    ),
  })),
  getWorkspaceFolder: jest.fn(),
  get isTrusted() {
    return true
  },
  onDidChangeConfiguration: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidGrantWorkspaceTrust: jest.fn(),
  openTextDocument: jest.fn(),
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
