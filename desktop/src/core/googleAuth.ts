import { getGoogleAuth } from './api'

export function connectGoogle(
  onAuthenticated: () => void,
  onError: (message: string) => void,
) {
  const popup = window.open('about:blank', 'google-auth', 'popup,width=500,height=650')
  if (!popup) {
    onError('Allow popups for Friday to connect Google Calendar and Gmail.')
    return
  }

  const checkAuthentication = async () => {
    try {
      const auth = await getGoogleAuth()
      if (auth.status === 'authenticated') {
        onAuthenticated()
      } else {
        onError('Google sign-in was not completed.')
      }
    } catch {
      onError('Could not verify Google sign-in. Please try again.')
    }
  }

  getGoogleAuth().then(auth => {
    if (auth.status === 'missing_credentials') {
      popup.close()
      onError('Add Google OAuth credentials at memory_store/google_credentials.json to connect.')
      return
    }
    if (auth.status === 'authenticated') {
      popup.close()
      onAuthenticated()
      return
    }
    if (!auth.url) {
      popup.close()
      onError(auth.message || 'Could not start Google sign-in.')
      return
    }

    popup.location.href = auth.url
    const timer = window.setInterval(() => {
      if (!popup.closed) return
      window.clearInterval(timer)
      void checkAuthentication()
    }, 500)
  }).catch((error: unknown) => {
    popup.close()
    onError(error instanceof Error ? error.message : 'Could not start Google sign-in.')
  })
}
