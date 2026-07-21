'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface CourseTag {
  id: string
  name: string
  color?: string | null
  _count?: { courseTags: number }
}

export interface Course {
  id: string
  name: string
  displayName?: string | null
  slug: string
  thumbnail: string | null
  description: string | null
  path: string
  favorited?: boolean
  tags?: CourseTag[]
  createdAt: string
  updatedAt: string
  _count: { modules: number; lessons: number }
  progress: {
    completedLessons: number
    totalLessons: number
    percentage: number
    lastWatched: string | null
  }
  coverClass?: string
}

interface CoursesResponse {
  courses: Course[]
  tags: CourseTag[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface UseCoursesOptions {
  initialPage?: number
  initialLimit?: number
  initialSearch?: string
  initialFilter?: string
  initialSortBy?: string
  initialSortOrder?: string
}

interface CacheEntry {
  data: CoursesResponse
  expiresAt: number
}

const CACHE_TTL_MS = 20_000
const MAX_CACHE_ENTRIES = 24
const responseCache = new Map<string, CacheEntry>()

function readCache(key: string): CoursesResponse | null {
  const cached = responseCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key)
    return null
  }
  return cached.data
}

function writeCache(key: string, data: CoursesResponse) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value
    if (oldestKey) responseCache.delete(oldestKey)
  }
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function useCourses(options: UseCoursesOptions = {}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [tags, setTags] = useState<CourseTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: options.initialPage || 1,
    limit: options.initialLimit || 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [search, setSearch] = useState(options.initialSearch || '')
  const [filter, setFilter] = useState(options.initialFilter || 'all')
  const [sortBy, setSortBy] = useState(options.initialSortBy || 'updatedAt')
  const [sortOrder, setSortOrder] = useState(options.initialSortOrder || 'desc')
  const [debouncedSearch, setDebouncedSearch] = useState(options.initialSearch || '')
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const hasDataRef = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPagination((previous) => ({ ...previous, page: 1 }))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const applyResponse = useCallback((data: CoursesResponse) => {
    hasDataRef.current = true
    setCourses(data.courses)
    setTags(data.tags || [])
    setPagination((previous) => ({
      ...previous,
      page: data.pagination.page,
      limit: data.pagination.limit,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
      hasNext: data.pagination.hasNext,
      hasPrev: data.pagination.hasPrev,
    }))
  }, [])

  const fetchCourses = useCallback(async (force = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++requestIdRef.current

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      search: debouncedSearch,
      filter,
      sortBy,
      sortOrder,
    })
    const requestKey = params.toString()
    const cached = force ? null : readCache(requestKey)

    if (cached) {
      applyResponse(cached)
      setLoading(false)
      setError(null)
      return
    }

    if (!hasDataRef.current) setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses?${requestKey}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const data = await response.json() as CoursesResponse
      if (requestId !== requestIdRef.current) return

      writeCache(requestKey, data)
      applyResponse(data)

      if (data.pagination.hasNext) {
        const nextParams = new URLSearchParams(params)
        nextParams.set('page', String(data.pagination.page + 1))
        const nextKey = nextParams.toString()

        if (!readCache(nextKey)) {
          window.setTimeout(() => {
            void fetch(`/api/courses?${nextKey}`, {
              headers: { Accept: 'application/json' },
            })
              .then((nextResponse) => nextResponse.ok ? nextResponse.json() : null)
              .then((nextData: CoursesResponse | null) => {
                if (nextData) writeCache(nextKey, nextData)
              })
              .catch(() => undefined)
          }, 150)
        }
      }
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return
      if (requestId !== requestIdRef.current) return
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to fetch courses')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [
    applyResponse,
    pagination.page,
    pagination.limit,
    debouncedSearch,
    filter,
    sortBy,
    sortOrder,
  ])

  useEffect(() => {
    void fetchCourses()
    return () => abortRef.current?.abort()
  }, [fetchCourses])

  const goToPage = (page: number) => {
    setPagination((previous) => ({ ...previous, page: Math.max(1, page) }))
  }

  const nextPage = () => {
    if (pagination.hasNext) {
      setPagination((previous) => ({ ...previous, page: previous.page + 1 }))
    }
  }

  const prevPage = () => {
    if (pagination.hasPrev) {
      setPagination((previous) => ({ ...previous, page: Math.max(1, previous.page - 1) }))
    }
  }

  const changeLimit = (limit: number) => {
    setPagination((previous) => ({ ...previous, limit, page: 1 }))
  }

  const handleSearch = (value: string) => setSearch(value)

  const handleFilter = (value: string) => {
    setFilter(value)
    setPagination((previous) => ({ ...previous, page: 1 }))
  }

  const handleSort = (field: string) => {
    setSortBy(field)
    setPagination((previous) => ({ ...previous, page: 1 }))
  }

  const handleSortOrder = (value: string) => {
    setSortOrder(value === 'asc' ? 'asc' : 'desc')
    setPagination((previous) => ({ ...previous, page: 1 }))
  }

  const toggleSortOrder = () => {
    setSortOrder((previous) => previous === 'asc' ? 'desc' : 'asc')
    setPagination((previous) => ({ ...previous, page: 1 }))
  }

  const refetch = useCallback(() => fetchCourses(true), [fetchCourses])

  return {
    courses,
    tags,
    loading,
    error,
    pagination,
    search,
    setSearch: handleSearch,
    filter,
    setFilter: handleFilter,
    sortBy,
    sortOrder,
    setSortBy: handleSort,
    setSortOrder: handleSortOrder,
    toggleSortOrder,
    goToPage,
    nextPage,
    prevPage,
    changeLimit,
    refetch,
  }
}
