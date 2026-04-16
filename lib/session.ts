// lib/session.ts
// Helpers para leer la sesión de Supabase en rutas de servidor (App Router).
// Reemplaza por completo a getServerSession(authOptions) de NextAuth.

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ?? ''

/**
 * Extrae el JWT de Supabase desde las cookies de la request
 * y devuelve el userId si la sesión es válida.
 *
 * Supabase guarda el token en la cookie "sb-<project-ref>-auth-token"
 * o en "supabase-auth-token" (versión legacy).
 * También aceptamos el header Authorization: Bearer <token> para llamadas API.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1. Intentar desde Authorization header (útil para llamadas API directas)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  // 2. Intentar desde cookies de Supabase
  const cookieHeader = req.headers.get('cookie') ?? ''
  const cookieToken = extractSupabaseToken(cookieHeader)

  const accessToken = bearerToken ?? cookieToken
  if (!accessToken) return null

  // Verificar el token con Supabase
  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}

/**
 * Extrae el access_token de la cadena de cookies.
 * Supabase v2 guarda la sesión en formato JSON bajo distintas claves.
 */
function extractSupabaseToken(cookieStr: string): string | null {
  // Buscar cualquier cookie que empiece por "sb-" y termine en "-auth-token"
  const cookies = Object.fromEntries(
    cookieStr.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), decodeURIComponent(v.join('='))]
    })
  )

  for (const [key, value] of Object.entries(cookies)) {
    if (key.includes('auth-token') || key === 'supabase-auth-token') {
      try {
        // v2: el valor es un array JSON [access_token, refresh_token]
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed) && parsed[0]) return parsed[0]
        // v2 alternativa: objeto { access_token, ... }
        if (parsed?.access_token) return parsed.access_token
      } catch {
        // Puede ser el token directamente (sin JSON)
        if (value && !value.includes(' ')) return value
      }
    }
  }
  return null
}
