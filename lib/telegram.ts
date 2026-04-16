// lib/telegram.ts
// Envío de alertas via Telegram Bot API
// Usa el esquema real de monitored_items: title, url, pricecurrency, etc.

import type { MonitoredItem, PriceComparison } from '@/types'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`

// Escapa caracteres especiales de MarkdownV2
function esc(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => '\\' + c)
}

function shortUrl(url: string): string {
  try {
    const u   = new URL(url)
    const path = u.pathname.length > 25 ? u.pathname.slice(0, 25) + '…' : u.pathname
    return u.hostname.replace('www.', '') + path
  } catch {
    return url.slice(0, 50)
  }
}

export function buildAlertMessage(
  item: MonitoredItem,
  comparison: PriceComparison,
  newPrice: number,
): string {
  const prev      = item.price_current ?? item.pricecurrent ?? 0
  const currency  = item.pricecurrency ?? 'EUR'
  const symbol    = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  const pct       = Math.abs(comparison.diffPercent).toFixed(1)
  const name      = item.title ?? shortUrl(item.url)
  const isDown    = comparison.direction === 'down'

  const lines = [
    `🔔 *Alerta de precio — WebScraper Pro*`,
    ``,
    `📦 *${esc(name)}*`,
    `🔗 ${esc(shortUrl(item.url))}`,
    ``,
    `💰 Precio anterior: ~${symbol}${prev.toFixed(2)}~`,
    `${isDown ? '✅' : '⚠️'} Precio actual: *${symbol}${newPrice.toFixed(2)}*`,
    `${isDown ? '📉' : '📈'} ${isDown ? 'Bajada' : 'Subida'}: ${isDown ? '-' : '+'}${pct}%`,
    ``,
    `👉 [Ver producto](${item.url})`,
  ]

  return lines.join('\n')
}

export async function sendTelegramAlert(
  item: MonitoredItem,
  comparison: PriceComparison,
  newPrice: number,
  chatId?: string,
): Promise<boolean> {
  const target = chatId ?? CHAT_ID

  if (!BOT_TOKEN || !target) {
    console.warn('[telegram] Faltan TELEGRAM_BOT_TOKEN o CHAT_ID')
    return false
  }

  const text = buildAlertMessage(item, comparison, newPrice)

  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:                target,
        text,
        parse_mode:             'MarkdownV2',
        disable_web_page_preview: false,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[telegram] Error:', err)
      return false
    }

    console.log(`[telegram] Alerta enviada: "${item.title ?? item.url}"`)
    return true
  } catch (err) {
    console.error('[telegram] Error de red:', err)
    return false
  }
}

export async function sendTelegramMessage(text: string, chatId?: string): Promise<boolean> {
  const target = chatId ?? CHAT_ID
  if (!BOT_TOKEN || !target) return false
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: target, text, parse_mode: 'MarkdownV2' }),
  })
  return res.ok
}
