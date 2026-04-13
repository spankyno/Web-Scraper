// app/api/auth/signup/route.ts
// POST /api/auth/signup
// Crea usuario en Supabase Auth y envía email de verificación automáticamente.
// Supabase gestiona el hash de la contraseña — nunca la almacenamos en texto plano.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente anon: signUp no requiere service role
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()

  // Validaciones básicas
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  // URL de redirección tras verificar el email
  const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const emailRedirectTo = `${origin}/auth/callback`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { name: name?.trim() || email.split('@')[0] },
    },
  })

  if (error) {
    // Supabase devuelve "User already registered" si el email ya existe
    if (error.message.includes('already registered')) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Si identities está vacío, el usuario ya existía (Supabase comportamiento anti-enumeración)
  if (data.user && data.user.identities?.length === 0) {
    return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
  }

  return NextResponse.json({
    message: 'Registro completado. Revisa tu email para verificar tu cuenta.',
    email: data.user?.email,
  })
}
