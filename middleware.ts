// middleware.ts
// Intercepta /api/scrape para usuarios no autenticados
// Verifica el límite de uso antes de llegar al handler

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  // Solo aplica a la ruta de scraping
  if (!req.nextUrl.pathname.startsWith('/api/scrape')) {
    return NextResponse.next()
  }

  // Si el usuario está autenticado, pasa sin restricción
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (token?.userId) {
    return NextResponse.next()
  }

  // Usuario anónimo: delegar la verificación al handler
  // (el handler llama a checkAnonLimit internamente)
  // Aquí solo añadimos la IP real como header para que el handler la use
  const ip =
    req.headers.get('cf-connecting-ip') ??     // Cloudflare
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'

  const res = NextResponse.next()
  res.headers.set('x-client-ip', ip)
  return res
}

export const config = {
  matcher: ['/api/scrape', '/api/monitor/:path*'],
}
