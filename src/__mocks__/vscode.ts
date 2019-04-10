export const commands = {
  executeCommand: jest.fn(),
}

export const workspace = {
  getConfiguration: jest.fn(() => new Map()),
  onDidChangeConfiguration: jest.fn(),
}
