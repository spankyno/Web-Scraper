// app/api/auth/reset-password/route.ts
// POST /api/auth/reset-password
// Actualiza la contraseña usando el access_token del email de recuperación.
// El cliente envía el token que Supabase pone en el hash de la URL (#access_token=...).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { accessToken, password } = await req.json()

  if (!accessToken || !password) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Mínimo 8 caracteres' }, { status: 400 })
  }

  // Crear cliente autenticado con el token del email
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  )

  // Establecer la sesión con el token recibido
  const { error: sessionError } = await supabase.auth.setSession({
    access_token:  accessToken,
    refresh_token: '',
  })
  if (sessionError) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Contraseña actualizada correctamente' })
}
