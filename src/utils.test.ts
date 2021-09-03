import { AbortSignal } from 'abort-controller'
import * as utils from './utils'

describe('Utilities', () => {
  describe('#fetch', () => {
    beforeEach(() => jest.useFakeTimers())

    afterEach(() => {
      jest.clearAllTimers()
      jest.useRealTimers()
    })

    it('requests remote URL and returns the body as text', async () => {
      const mocked: Pick<Response, 'ok' | 'text'> = {
        ok: true,
        text: jest.fn(async () => 'result'),
      }

      const fetch = jest
        .spyOn(utils._fetchPonyfillInstance, 'fetch')
        .mockResolvedValue(mocked as any)

      const url = 'https://example.com/'
      const ret = await utils.fetch(url)

      expect(fetch).toHaveBeenCalledWith(url, expect.any(Object))
      expect(ret).toBe('result')
    })

    it('throws error if the response status is not 2xx', async () => {
      const mocked: Pick<Response, 'ok' | 'text' | 'status'> = {
        ok: false,
        text: jest.fn(async () => '404 Not found'),
        status: 404,
      }

      jest
        .spyOn(utils._fetchPonyfillInstance, 'fetch')
        .mockResolvedValue(mocked as any)

      await expect(utils.fetch('https://example.com/')).rejects.toThrow(
        'Failured fetching https://example.com/ (404)'
      )
    })

    it('throws error if timed out response (via AbortController)', () =>
      new Promise<void>((done) => {
        expect.assertions(1)

        const abortError = new Error('Request aborted')
        const timeout = 3000

        const fetch: jest.SpyInstance = jest.spyOn(
          utils._fetchPonyfillInstance,
          'fetch'
        )

        fetch.mockImplementation((_, opts) => {
          const signal = opts?.signal as AbortSignal

          return new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(abortError))
          })
        })

        utils.fetch('https://example.com/', { timeout }).catch((err) => {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(err).toStrictEqual(abortError)
          done()
        })

        jest.advanceTimersByTime(timeout)
      }))
  })

  describe('#hasToString', () => {
    it('returns true if the object has a toString method', () => {
      expect(utils.hasToString({ toString: () => 'test' })).toBe(true)
      expect(utils.hasToString({})).toBe(true)
      expect(utils.hasToString(Object.create(null))).toBe(false)
    })

    it('returns true if the literal has a toString method', () => {
      expect(utils.hasToString(0)).toBe(true)
      expect(utils.hasToString(BigInt(1))).toBe(true)
      expect(utils.hasToString('string')).toBe(true)
      expect(utils.hasToString(Symbol())).toBe(true)
      expect(utils.hasToString(utils.hasToString)).toBe(true)
      expect(utils.hasToString(false)).toBe(true)
      expect(utils.hasToString(true)).toBe(true)
      expect(utils.hasToString(null)).toBe(false)
      expect(utils.hasToString(undefined)).toBe(false)
    })
  })
})
