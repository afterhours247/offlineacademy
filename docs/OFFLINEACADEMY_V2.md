# OfflineAcademy v2

The `dev/offlineacademy-v2` branch focuses on making the existing product feel faster and more deliberate without changing its local-first mission.

## Performance work

- The course API now runs independent database reads in parallel.
- Lesson totals are collected through module relation counts instead of a separate lesson grouping plus module lookup.
- Partial course progress is calculated from completed lesson records, fixing the previous 0-or-100 dashboard behavior.
- Course thumbnails prefer the database value and only fall back to filesystem discovery when needed.
- API responses expose `Server-Timing` metrics for database, enrichment, and total request time.
- The course hook cancels obsolete requests, rejects stale responses, caches recent pages briefly, and prefetches the next page.
- The splash screen renders over already-loaded content, appears once per browser session, and has a much shorter minimum duration.
- Course cards use CSS content visibility to reduce rendering work below the viewport.

## Premium dark interface

The v2 visual layer is intentionally scoped to dark mode. Light mode keeps the established appearance.

- Deep ink background with restrained emerald and warm amber accents.
- Higher-contrast text and quieter secondary labels.
- More substantial cards with subtle elevation instead of heavy neon glow.
- Cleaner controls, inputs, popovers, progress bars, and navigation surfaces.
- Touch-friendly course actions and reduced-motion support.
- Theme bootstrapping before hydration to prevent the light-to-dark flash.

## Product boundary

OfflineAcademy remains a single-user, self-hosted, LAN-first course library. This branch does not add accounts, cloud dependencies, subscriptions, or unrelated workflows.
