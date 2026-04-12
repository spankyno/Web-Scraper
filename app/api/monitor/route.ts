// app/api/monitor/route.ts
// GET    /api/monitor          → listar items del usuario
// POST   /api/monitor          → crear item
// DELETE /api/monitor?id=xxx   → eliminar item

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id
  if (!userId) return null
  return userId
}

// ── GET: listar items ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('monitored_items')
    .select(`
      *,
      price_history (
        price, in_stock, scraped_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data })
}

// ── POST: crear item ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await getUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    name,
    url,
    priceSelector,
    method = 'hybrid',
    alertThreshold = 5,
    targetPrice = null,
    checkInterval = '6 hours',
    notifyTelegram = true,
    notifyEmail = false,
  } = body

  if (!name || !url || !priceSelector) {
    return NextResponse.json(
      { error: 'Faltan campos: name, url, priceSelector' },
      { status: 400 },
    )
  }

  // Límite de items para plan free (3 items)
  const { count } = await supabaseAdmin
    .from('monitored_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (profile?.plan === 'free' && (count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Plan free: máximo 3 items monitorizados. Actualiza a Pro.' },
      { status: 403 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('monitored_items')
    .insert({
      user_id: userId,
      name,
      url,
      price_selector: priceSelector,
      method,
      alert_threshold: alertThreshold,
      target_price: targetPrice,
      check_interval: checkInterval,
      next_check: new Date().toISOString(),  // verificar ahora mismo
      notify_telegram: notifyTelegram,
      notify_email: notifyEmail,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data }, { status: 201 })
}

// ── DELETE: eliminar item ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const userId = await getUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Falta parámetro id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('monitored_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)  // seguridad: solo el dueño puede borrar

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── PATCH: actualizar (pausar, editar) ────────────────────────
export async function PATCH(req: NextRequest) {
  const userId = await getUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Falta parámetro id' }, { status: 400 })
  }

  const body = await req.json()

  // Solo permitir ciertos campos editables
  const allowed = [
    'name', 'price_selector', 'method', 'alert_threshold',
    'target_price', 'check_interval', 'notify_telegram',
    'notify_email', 'active',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('monitored_items')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
