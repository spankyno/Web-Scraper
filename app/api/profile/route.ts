// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = (session.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: 'Sin ID' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('telegram_chat_id, email_notif, name')
    .eq('id', userId)
    .single()

  // PGRST116 = fila no encontrada → perfil vacío, no es error real
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ profile: data ?? {} })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = (session.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: 'Sin ID' }, { status: 401 })

  const body = await req.json()
  const allowed = ['telegram_chat_id', 'email_notif', 'name']
  const update: Record<string, unknown> = {}
  for (const k of allowed) { if (k in body) update[k] = body[k] }

  if (!Object.keys(update).length) return NextResponse.json({ ok: true })

  // upsert por si el usuario no tiene fila en profiles todavía
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, ...update }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
