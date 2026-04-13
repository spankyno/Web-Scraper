// app/auth/callback/route.ts
// Supabase redirige aquí tras verificar el email con el token en la URL.
// Intercambia el code por una sesión y redirige al login con mensaje de éxito.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    const msg = encodeURIComponent(errorDescription ?? error)
    return NextResponse.redirect(`${origin}/login?error=${msg}`)
  }

  if (code) {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
    )
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Enlace inválido o expirado')}`,
      )
    }
  }

  // Email verificado correctamente → redirigir al login con mensaje
  return NextResponse.redirect(
    `${origin}/login?verified=1`,
  )
}
