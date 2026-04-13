// middleware.ts
// 1. Páginas privadas (/dashboard, /settings…) → redirige a /login si no hay sesión
// 2. Páginas de auth (/login, /signup…)        → redirige a /dashboard si ya hay sesión
// 3. /api/scrape sin sesión                     → añade IP real y delega rate-limit al handler
// 4. /api/monitor sin sesión                    → 401 directamente

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rutas que requieren sesión activa
const PRIVATE_PAGES = ['/dashboard', '/settings', '/profile']

// Rutas de auth que no deben verse si ya hay sesión
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token?.userId

  // ── Páginas privadas → redirigir a login si no hay sesión ────
  if (PRIVATE_PAGES.some(p => pathname.startsWith(p))) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // ── Páginas de auth → redirigir a dashboard si ya hay sesión ─
  if (AUTH_PAGES.some(p => pathname.startsWith(p))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // ── /api/monitor → requiere sesión ───────────────────────────
  if (pathname.startsWith('/api/monitor')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── /api/scrape → añadir IP real para el rate limiter ────────
  if (pathname.startsWith('/api/scrape')) {
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '0.0.0.0'
    const res = NextResponse.next()
    res.headers.set('x-client-ip', ip)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/api/scrape',
    '/api/monitor/:path*',
  ],
}
