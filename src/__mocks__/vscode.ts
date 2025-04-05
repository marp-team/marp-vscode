import { URI, Utils } from 'vscode-uri'

type MockedConf = Record<string, any>

const defaultVSCodeVersion = 'v1.95.0'
const defaultConf: MockedConf = {
  'markdown.marp.breaks': 'on',
  'markdown.marp.browser': 'auto',
  'markdown.marp.browserPath': '',
  'markdown.marp.html': 'default',
  'markdown.marp.exportAutoOpen': true,
  'markdown.marp.exportType': 'pdf',
  'markdown.marp.outlineExtension': true,
  'markdown.marp.pdf.noteAnnotations': false,
  'markdown.marp.pdf.outlines': 'off',
  'markdown.marp.pptx.editable': 'off',
  'window.zoomLevel': 0,

  // Legacy
  'markdown.marp.chromePath': '',
  'markdown.marp.enableHtml': false,
}

let currentConf: MockedConf = {}

export class CodeAction {
  // command?: Command
  diagnostics?: Diagnostic[]
  edit?: WorkspaceEdit
  isPreferred?: boolean

  constructor(
    public title: string,
    public kind?: CodeActionKind,
  ) {}
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
    public severity?: DiagnosticSeverity,
  ) {}
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

export enum DiagnosticSeverity {
  Error,
  Warning,
  Information,
  Hint,
}

export const lm = {
  registerTool: jest.fn(),
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
      this.character + (args[1] ?? 0),
    )
  }

  isEqual(other: Position) {
    return this.line === other.line && this.character === other.character
  }

  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

export const ProgressLocation = {
  Notification: 'notification',
}

export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position,
  ) {}

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

export const commands = {
  executeCommand: jest.fn(async () => {
    // no ops
  }),
  registerCommand: jest.fn(),
}

export const env = {
  appHost: 'desktop',
  openExternal: jest.fn(),

  _createMemento: () => new Memento(),
}

export const FileSystem = {
  copy: jest.fn(),
  stat: jest.fn(async () => ({
    ctime: 0,
    mtime: new Date().getTime(),
    size: 0,
    type: FileType.File,
  })),
  delete: jest.fn(async () => undefined),
  readFile: jest.fn(async () => undefined),
  writeFile: jest.fn(async () => undefined),
  isWritableFileSystem: jest.fn((scheme: string) => scheme === 'file'),
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export class Hover {
  constructor(
    public contents: string,
    public range?: Range,
  ) {}
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

export class Memento {
  private _map = new Map<string, any>()

  get(key: string) {
    return this._map.get(key)
  }
  keys() {
    return [...this._map.keys()]
  }
  async update(key: string, value: any) {
    this._map.set(key, value)
  }
}

export class TabInputWebview {
  constructor(public readonly viewType: string) {}
}

export class Uri extends URI {
  static joinPath(uri: Uri, ...pathSegments: string[]) {
    return Utils.joinPath(uri, ...pathSegments)
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
  showInformationMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showSaveDialog: jest.fn(),
  showTextDocument: jest.fn(async () => ({})),
  showWarningMessage: jest.fn(async () => undefined),
  withProgress: jest.fn((_, promise) => Promise.resolve(promise())),
  visibleTextEditors: [],
  tabGroups: {
    all: [],
  },
}

export const workspace = {
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn((): any => ({ dispose: jest.fn() })),
    onDidDelete: jest.fn((): any => ({ dispose: jest.fn() })),
  })),
  fs: FileSystem,
  getConfiguration: jest.fn((section?: string) => ({
    get: jest.fn(
      (subSection?: string) =>
        currentConf[[section, subSection].filter((s) => s).join('.')],
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
  readonly insert = jest.fn()
  readonly replace = jest.fn()
}

beforeEach(() => {
  window.activeTextEditor = undefined
  workspace.textDocuments = []
  workspace._setConfiguration()
  _setVSCodeVersion(defaultVSCodeVersion)
})
