// app/api/auth/login/route.ts
// POST /api/auth/login
// El cliente envía email+password → el servidor verifica con Supabase
// y setea las cookies de sesión en la response (httpOnly, secure).
// Esto garantiza que el middleware SSR pueda leer la sesión correctamente.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ?? ''

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  // Creamos la response primero para poder escribir cookies en ella
  const res = NextResponse.json({ ok: true })

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_VERIFIED' },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
  }

  if (!data.user) {
    return NextResponse.json({ error: 'No se pudo autenticar' }, { status: 401 })
  }

  // Las cookies de sesión ya están escritas en `res` por el setAll de arriba
  return res
}
