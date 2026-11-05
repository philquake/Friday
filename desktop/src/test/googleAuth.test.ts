import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectGoogle } from '../core/googleAuth'
import { getGoogleAuth } from '../core/api'

vi.mock('../core/api', () => ({
  getGoogleAuth: vi.fn(),
}))

const mockedGetGoogleAuth = vi.mocked(getGoogleAuth)

describe('connectGoogle', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('opens the popup synchronously and reports missing credentials', async () => {
    const popup = { close: vi.fn() } as unknown as Window
    const open = vi.spyOn(window, 'open').mockReturnValue(popup)
    const onError = vi.fn()
    mockedGetGoogleAuth.mockResolvedValue({
      status: 'missing_credentials',
      message: 'Put google_credentials.json in memory_store/',
    })

    connectGoogle(vi.fn(), onError)

    expect(open).toHaveBeenCalledWith('about:blank', 'google-auth', 'popup,width=500,height=650')
    await vi.waitFor(() => expect(popup.close).toHaveBeenCalled())
    expect(onError).toHaveBeenCalledWith(
      'Add Google OAuth credentials at memory_store/google_credentials.json to connect.',
    )
  })

  it('refreshes connection state after the OAuth popup closes', async () => {
    vi.useFakeTimers()
    let closed = false
    const popup = {
      close: vi.fn(),
      location: { href: '' },
      get closed() { return closed },
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(popup)
    mockedGetGoogleAuth
      .mockResolvedValueOnce({ status: 'needs_auth', url: 'https://accounts.google.com/oauth' })
      .mockResolvedValueOnce({ status: 'authenticated' })
    const onAuthenticated = vi.fn()

    connectGoogle(onAuthenticated, vi.fn())
    await vi.waitFor(() => expect(popup.location.href).toBe('https://accounts.google.com/oauth'))
    closed = true
    await vi.advanceTimersByTimeAsync(500)

    expect(onAuthenticated).toHaveBeenCalledOnce()
  })
})
