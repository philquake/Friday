import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FloatingOrb } from './components/zen/FloatingOrb'
import { ErrorBoundary, AppErrorFallback } from './components/common/ErrorBoundary'

const isOrbWindow = new URLSearchParams(window.location.search).get('mode') === 'orb'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<AppErrorFallback />}>
      {isOrbWindow ? <FloatingOrb /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
