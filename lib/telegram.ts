// lib/telegram.ts
// Envío de alertas via Telegram Bot API

import type { MonitoredItem } from '@/types'
import type { PriceComparison } from './priceDetector'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.length > 30
      ? u.pathname.slice(0, 30) + '...'
      : u.pathname
    return u.hostname + path
  } catch {
    return url.slice(0, 50)
  }
}

function escapeMd(text: string): string {
  // Escapa caracteres especiales de MarkdownV2
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, c => '\\' + c)
}

export function buildAlertMessage(
  item: MonitoredItem,
  comparison: PriceComparison,
  newPrice: number,
): string {
  const prev = item.currentPrice ?? 0
  const pct = Math.abs(comparison.diffPercent).toFixed(1)
  const direction = comparison.direction === 'down' ? '📉 Bajada' : '📈 Subida'
  const emoji = comparison.direction === 'down' ? '✅' : '⚠️'

  const lines = [
    `🔔 *Alerta de precio — WebScraper Pro*`,
    ``,
    `📦 *${escapeMd(item.name)}*`,
    `🔗 ${escapeMd(shortUrl(item.url))}`,
    ``,
    `💰 Precio anterior: ~€${prev.toFixed(2)}~`,
    `${emoji} Precio actual: *€${newPrice.toFixed(2)}*`,
    `${direction}: ${comparison.direction === 'down' ? '-' : '+'}${pct}%`,
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

  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: target,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[telegram] Error enviando alerta:', err)
    return false
  }

  console.log(`[telegram] Alerta enviada para "${item.name}"`)
  return true
}

export async function sendTelegramMessage(
  text: string,
  chatId?: string,
): Promise<boolean> {
  const target = chatId ?? CHAT_ID
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: target,
      text,
      parse_mode: 'MarkdownV2',
    }),
  })
  return res.ok
}
