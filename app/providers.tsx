'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/ThemeToggle'
import { ToastProvider } from '@/hooks/use-toast'
import { SplashScreen } from '@/components/SplashScreen'

const SPLASH_SESSION_KEY = 'offlineacademy:splash-seen'

export function Providers({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = React.useState(true)

  React.useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY) === 'true') {
        setShowSplash(false)
      }
    } catch {
      setShowSplash(false)
    }
  }, [])

  React.useEffect(() => {
    if (!showSplash) return
    const timer = window.setTimeout(() => setShowSplash(false), 2500)
    return () => window.clearTimeout(timer)
  }, [showSplash])

  const completeSplash = React.useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true')
    } catch {
      // Storage can be unavailable in hardened/private browser modes.
    }
    setShowSplash(false)
  }, [])

  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        {showSplash && (
          <SplashScreen onComplete={completeSplash} minDuration={550} />
        )}
      </ToastProvider>
    </ThemeProvider>
  )
}
