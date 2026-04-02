import { existsSync } from 'node:fs'
import { detectBrowserPath } from './browser'

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}))

jest.mock('@puppeteer/browsers', () => ({
  Browser: { CHROME: 'chrome' },
  BrowserPlatform: {
    WIN64: 'win64',
    WIN32: 'win32',
    MAC: 'mac',
    LINUX: 'linux',
  },
  ChromeReleaseChannel: { STABLE: 'stable' },
  computeSystemExecutablePath: jest.fn(),
}))

const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const { computeSystemExecutablePath: mockedCompute } = jest.requireMock(
  '@puppeteer/browsers',
) as {
  computeSystemExecutablePath: jest.Mock
}

describe('detectBrowserPath', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns explicit path when it exists', () => {
    mockedExistsSync.mockReturnValue(true)
    const result = detectBrowserPath('auto', '/path/to/chrome')
    expect(result).toBe('/path/to/chrome')
  })

  it('falls back to auto-detection when explicit path does not exist', () => {
    mockedExistsSync.mockImplementation((p) => {
      if (p === '/path/to/missing') return false
      return true
    })
    mockedCompute.mockReturnValue('/detected/chrome')

    const result = detectBrowserPath('auto', '/path/to/missing')
    expect(result).toBe('/detected/chrome')
  })

  it('returns path from computeSystemExecutablePath', () => {
    mockedExistsSync.mockReturnValue(true)
    mockedCompute.mockReturnValue('/usr/bin/google-chrome')

    const result = detectBrowserPath('chrome')
    expect(result).toBe('/usr/bin/google-chrome')
    expect(mockedCompute).toHaveBeenCalled()
  })

  it('returns undefined when no browser is found', () => {
    mockedExistsSync.mockReturnValue(false)
    mockedCompute.mockReturnValue('/nonexistent/chrome')

    const result = detectBrowserPath('chrome')
    expect(result).toBeUndefined()
  })

  it('returns undefined when computeSystemExecutablePath throws', () => {
    mockedExistsSync.mockReturnValue(false)
    mockedCompute.mockImplementation(() => {
      throw new Error('Not found')
    })

    const result = detectBrowserPath('chrome')
    expect(result).toBeUndefined()
  })
})
