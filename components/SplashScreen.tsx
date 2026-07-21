'use client'

import * as React from 'react'

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 550 }: SplashScreenProps) {
  const [exiting, setExiting] = React.useState(false)
  const onCompleteRef = React.useRef(onComplete)

  onCompleteRef.current = onComplete

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const holdDuration = reduceMotion ? 100 : minDuration
    const exitDuration = reduceMotion ? 0 : 280

    const exitTimer = window.setTimeout(() => setExiting(true), holdDuration)
    const completeTimer = window.setTimeout(
      () => onCompleteRef.current(),
      holdDuration + exitDuration
    )

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(completeTimer)
    }
  }, [minDuration])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ${exiting ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role="status"
      aria-live="polite"
      aria-label="OfflineAcademy is opening"
    >
      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-card shadow-2xl shadow-black/30">
          <img
            src="/logo.png"
            alt=""
            className="h-16 w-16 object-contain"
            width="64"
            height="64"
          />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            OfflineAcademy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your private learning library
          </p>
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
