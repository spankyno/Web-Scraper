// lib/format.ts
// Helpers de presentación compartidos por todos los componentes

import type { MonitoredItem, ItemStatus } from '@/types'

export function formatPrice(value: number | null | undefined, currency = 'EUR'): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function priceDiffPercent(current: number, previous: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

export function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function formatInterval(interval: string): string {
  const map: Record<string, string> = {
    '1h': 'Cada hora',
    '6h': 'Cada 6 horas',
    '12h': 'Cada 12 horas',
    '24h': 'Cada 24 horas',
    '48h': 'Cada 2 días',
  }
  return map[interval] ?? interval
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

export function getEffectivePrice(item: MonitoredItem): number | null {
  // price_current es el campo canónico; pricecurrent es legacy
  return item.price_current ?? item.pricecurrent ?? null
}

export function getEffectivePrev(item: MonitoredItem): number | null {
  return item.price_previous ?? item.priceprevious ?? null
}

export function getEffectiveActive(item: MonitoredItem): boolean {
  return item.is_active ?? item.isactive ?? true
}

export function statusConfig(status: ItemStatus | string): {
  label: string
  color: string
  bg: string
  border: string
  dot: string
} {
  switch (status) {
    case 'price_drop':
      return { label: '↓ Bajó', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', dot: '#10b981' }
    case 'price_rise':
      return { label: '↑ Subió', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', dot: '#f59e0b' }
    case 'out_of_stock':
      return { label: 'Sin stock', color: '#ff6b87', bg: 'rgba(255,77,109,0.1)', border: 'rgba(255,77,109,0.25)', dot: '#ff4d6d' }
    case 'error':
      return { label: 'Error', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)', dot: '#f97316' }
    default:
      return { label: 'Sin cambios', color: '#555c6e', bg: 'rgba(139,147,166,0.08)', border: 'rgba(255,255,255,0.07)', dot: '#555c6e' }
  }
}

export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    'fetch-light': '⚡ fetch',
    'browserless': '🌐 browser',
    'gemini': '✨ gemini',
    'hybrid': '🔄 hybrid',
    'auto': '🤖 auto',
  }
  return map[method] ?? method
}

export function confidenceColor(n: number | null): string {
  if (n == null) return '#555c6e'
  if (n >= 80) return '#34d399'
  if (n >= 50) return '#fbbf24'
  return '#ff6b87'
}
