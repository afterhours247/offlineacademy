import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalThumbnailUrl } from '@/lib/thumbnail-index-server'

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const SORT_FIELDS = new Set(['updatedAt', 'createdAt', 'name', 'progress'])

type SortOrder = 'asc' | 'desc'

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now()

  try {
    const { searchParams } = request.nextUrl
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = Math.min(
      parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    )
    const skip = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()
    const filter = searchParams.get('filter') || 'all'
    const tag = searchParams.get('tag') || ''
    const tagFilter = tag || (filter.startsWith('tag:') ? filter.slice(4) : '')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const requestedSort = searchParams.get('sortBy') || 'updatedAt'
    const sortBy = SORT_FIELDS.has(requestedSort) ? requestedSort : 'updatedAt'
    const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const where: Prisma.CourseWhereInput = { hidden: false }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { displayName: { contains: search } },
        { slug: { contains: search } },
      ]
    }

    if (favoritesOnly || filter === 'favorites') {
      where.favorited = true
    }

    if (tagFilter) {
      where.courseTags = { some: { tagId: tagFilter } }
    }

    if (filter === 'in-progress') {
      where.progress = {
        some: { userId: 'local-user', completed: false, lessonId: null },
      }
    } else if (filter === 'completed') {
      where.progress = {
        some: { userId: 'local-user', completed: true, lessonId: null },
      }
    } else if (filter === 'not-started') {
      where.NOT = {
        progress: { some: { userId: 'local-user', lessonId: null } },
      }
    }

    const secondaryOrderBy: Prisma.CourseOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortOrder }
        : { updatedAt: sortOrder }

    const orderBy: Prisma.CourseOrderByWithRelationInput[] = [
      { favorited: 'desc' },
      secondaryOrderBy,
    ]

    const databaseStartedAt = performance.now()
    const [total, courses, tags] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy,
        skip: Math.max(0, skip),
        take: limit,
        include: {
          _count: { select: { modules: true } },
          progress: {
            where: { userId: 'local-user', lessonId: null, moduleId: null },
            orderBy: { lastWatched: 'desc' },
            take: 1,
          },
          courseTags: {
            include: { tag: true },
            orderBy: { tag: { name: 'asc' } },
          },
        },
      }),
      prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { courseTags: true } } },
      }),
    ])
    const initialDatabaseDuration = performance.now() - databaseStartedAt

    const courseIds = courses.map((course) => course.id)
    const enrichStartedAt = performance.now()

    const [modulesWithCounts, completedProgress] = courseIds.length > 0
      ? await Promise.all([
          prisma.module.findMany({
            where: { courseId: { in: courseIds } },
            select: {
              courseId: true,
              _count: { select: { lessons: true } },
            },
          }),
          prisma.progress.groupBy({
            by: ['courseId'],
            where: {
              userId: 'local-user',
              courseId: { in: courseIds },
              lessonId: { not: null },
              completed: true,
            },
            _count: { _all: true },
          }),
        ])
      : [[], []]

    const lessonCountByCourse = new Map<string, number>()
    for (const module of modulesWithCounts) {
      lessonCountByCourse.set(
        module.courseId,
        (lessonCountByCourse.get(module.courseId) || 0) + module._count.lessons
      )
    }

    const completedCountByCourse = new Map<string, number>(
      completedProgress.map((entry) => [entry.courseId, Number(entry._count._all)])
    )

    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const totalLessons = lessonCountByCourse.get(course.id) || 0
        const completedLessons = Math.min(
          completedCountByCourse.get(course.id) || 0,
          totalLessons
        )
        const percentage = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 1000) / 10
          : 0
        const summaryProgress = course.progress[0]
        const thumbnail = course.thumbnail || await getLocalThumbnailUrl(course.slug)
        const { courseTags, progress: _progressRows, ...courseData } = course

        return {
          ...courseData,
          _count: { ...course._count, lessons: totalLessons },
          progress: {
            completedLessons,
            totalLessons,
            percentage,
            lastWatched: summaryProgress?.lastWatched.toISOString() ?? null,
          },
          thumbnail: thumbnail ?? null,
          tags: courseTags.map((connection) => connection.tag),
        }
      })
    )

    if (sortBy === 'progress') {
      coursesWithProgress.sort((a, b) => {
        const difference = a.progress.percentage - b.progress.percentage
        return sortOrder === 'asc' ? difference : -difference
      })
    }

    const enrichDuration = performance.now() - enrichStartedAt
    const totalPages = Math.ceil(total / limit)
    const response = NextResponse.json({
      courses: coursesWithProgress,
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

    response.headers.set(
      'Server-Timing',
      [
        `db;dur=${initialDatabaseDuration.toFixed(1)}`,
        `enrich;dur=${enrichDuration.toFixed(1)}`,
        `total;dur=${(performance.now() - startedAt).toFixed(1)}`,
      ].join(', ')
    )
    response.headers.set('Cache-Control', 'private, no-store')

    return response
  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses', details: String(error) },
      { status: 500 }
    )
  }
}
