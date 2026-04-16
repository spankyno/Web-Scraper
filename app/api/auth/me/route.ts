// app/api/auth/me/route.ts
// GET /api/auth/me — devuelve el usuario autenticado (nombre y email)
import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/session'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''

export async function GET(req: NextRequest) {
  const res = new NextResponse()
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return req.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({
    user: {
      id:    user.id,
      email: user.email,
      name:  user.user_metadata?.name ?? user.email,
    }
  })
}
