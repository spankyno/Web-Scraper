// app/api/cron/route.ts
// GET /api/cron
// Ejecutado por Vercel Cron (vercel.json) cada hora
// También puede ser disparado por el worker de Cloudflare

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scrape } from '@/lib/scrapers/hybrid'
import { comparePrice } from '@/lib/priceDetector'
import { sendTelegramAlert } from '@/lib/telegram'
import type { MonitoredItemRow, CronRunResult } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60   // segundos (plan Pro Vercel)

export async function GET(req: NextRequest) {
  // Proteger el endpoint con un token secreto
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  // Vercel Cron incluye automáticamente el header; Cloudflare debe enviarlo
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const isAuthorized = isVercelCron || authHeader === expectedToken

  if (!isAuthorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  console.log('[cron] Iniciando verificación de precios...')

  // ── Obtener items que toca verificar ──────────────────────────
  const { data: items, error } = await supabaseAdmin
    .from('monitored_items')
    .select('*')
    .eq('active', true)
    .lte('next_check', new Date().toISOString())
    .limit(50)  // máx 50 por ejecución para no superar timeout

  if (error) {
    console.error('[cron] Error obteniendo items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron] ${items?.length ?? 0} items para verificar`)

  const result: CronRunResult = {
    checked: 0,
    alerts: 0,
    errors: [],
  }

  // ── Procesar cada item ────────────────────────────────────────
  for (const item of (items ?? []) as MonitoredItemRow[]) {
    try {
      const scrapeResult = await scrape({
        url: item.url,
        method: item.method as 'fetch' | 'browserless' | 'gemini' | 'hybrid',
        selector: item.price_selector,
      })

      const newPrice = scrapeResult.price
      const inStock = scrapeResult.inStock ?? true

      // Guardar en price_history siempre
      await supabaseAdmin.from('price_history').insert({
        item_id: item.id,
        price: newPrice,
        in_stock: inStock,
      })

      // Calcular próximo check
      const nextCheck = new Date()
      const [amount, unit] = item.check_interval.split(' ')
      if (unit?.includes('hour')) nextCheck.setHours(nextCheck.getHours() + parseInt(amount))
      else if (unit?.includes('day')) nextCheck.setDate(nextCheck.getDate() + parseInt(amount))

      // Actualizar item con nuevo precio
      const updates: Record<string, unknown> = {
        previous_price: item.current_price,
        current_price: newPrice,
        in_stock: inStock,
        next_check: nextCheck.toISOString(),
      }

      // Comparar precios si tenemos precio actual
      if (newPrice !== null && item.current_price !== null) {
        const monitoredItem = {
          id: item.id,
          userId: item.user_id,
          name: item.name,
          url: item.url,
          priceSelector: item.price_selector,
          method: item.method as 'hybrid',
          currentPrice: item.current_price,
          previousPrice: item.previous_price,
          inStock: item.in_stock,
          alertThreshold: item.alert_threshold,
          targetPrice: item.target_price,
          checkInterval: item.check_interval as '6 hours',
          nextCheck: item.next_check,
          notifyTelegram: item.notify_telegram,
          notifyEmail: item.notify_email,
          active: item.active,
          createdAt: item.created_at,
        }

        const comparison = comparePrice(monitoredItem, newPrice)

        if (comparison.shouldAlert) {
          console.log(`[cron] Alerta para "${item.name}": ${item.current_price} → ${newPrice}`)

          // Telegram
          if (item.notify_telegram) {
            await sendTelegramAlert(monitoredItem, comparison, newPrice)
            result.alerts++
          }

          // Email (placeholder — integrar SendGrid/Resend aquí)
          if (item.notify_email) {
            console.log(`[cron] Email pendiente de implementar para "${item.name}"`)
          }
        }
      }

      await supabaseAdmin
        .from('monitored_items')
        .update(updates)
        .eq('id', item.id)

      result.checked++
    } catch (err) {
      const msg = `"${item.name}": ${(err as Error).message}`
      console.error('[cron] Error procesando item', msg)
      result.errors.push(msg)

      // Aún así actualizar next_check para no bloquear el item indefinidamente
      const nextCheck = new Date()
      nextCheck.setHours(nextCheck.getHours() + 6)
      await supabaseAdmin
        .from('monitored_items')
        .update({ next_check: nextCheck.toISOString() })
        .eq('id', item.id)
    }
  }

  console.log(`[cron] Completado: ${result.checked} verificados, ${result.alerts} alertas`)
  return NextResponse.json(result)
}
