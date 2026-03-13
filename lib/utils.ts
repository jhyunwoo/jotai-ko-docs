import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  if (pathname === '/docs') {
    return '/'
  }

  if (pathname.startsWith('/docs/')) {
    return pathname.replace(/^\/docs/, '') || '/'
  }

  return pathname
}

export function splitQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

