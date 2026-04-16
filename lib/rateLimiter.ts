// lib/rateLimiter.ts
// Control de límite de extracciones para IPs sin cuenta

import { supabaseAdmin } from './supabase'

const ANON_LIMIT = 5            // extracciones máximas
const WINDOW_DAYS = 30          // días de la ventana

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string
}

export async function checkAnonLimit(ip: string): Promise<RateLimitResult> {
  const now = new Date()

  // Buscar registro existente
  const { data, error } = await supabaseAdmin
    .from('anonymous_usage')
    .select('*')
    .eq('ip', ip)
    .single()

  // Si no existe → crearlo
  if (error?.code === 'PGRST116' || !data) {
    const resetAt = new Date(now)
    resetAt.setDate(resetAt.getDate() + WINDOW_DAYS)

    await supabaseAdmin.from('anonymous_usage').upsert({
      ip,
      count: 1,
      reset_at: resetAt.toISOString(),
    })

    return { allowed: true, remaining: ANON_LIMIT - 1, resetAt: resetAt.toISOString() }
  }

  // Si pasó la ventana → resetear
  if (new Date(data.reset_at) < now) {
    const resetAt = new Date(now)
    resetAt.setDate(resetAt.getDate() + WINDOW_DAYS)

    await supabaseAdmin.from('anonymous_usage').update({
      count: 1,
      reset_at: resetAt.toISOString(),
    }).eq('ip', ip)

    return { allowed: true, remaining: ANON_LIMIT - 1, resetAt: resetAt.toISOString() }
  }

  // Verificar límite
  if (data.count >= ANON_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: data.reset_at }
  }

  // Incrementar contador
  await supabaseAdmin.from('anonymous_usage')
    .update({ count: data.count + 1 })
    .eq('ip', ip)

  return {
    allowed: true,
    remaining: ANON_LIMIT - data.count - 1,
    resetAt: data.reset_at,
  }
}
