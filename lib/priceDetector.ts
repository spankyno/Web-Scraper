// lib/priceDetector.ts
// Utilidades para comparar precios — usa MonitoredItem del esquema real

import type { MonitoredItem, PriceComparison } from '@/types'

export function comparePrice(
  item: MonitoredItem,
  newPrice: number,
): PriceComparison {
  // Leer precio actual de las columnas canónicas o legacy
  const prev = item.price_current ?? item.pricecurrent ?? 0

  if (!prev || prev === 0) {
    return { direction: 'same', diffAbsolute: 0, diffPercent: 0, shouldAlert: false }
  }

  const diffAbsolute = newPrice - prev
  const diffPercent  = (diffAbsolute / prev) * 100
  const direction    = diffAbsolute < 0 ? 'down' : diffAbsolute > 0 ? 'up' : 'same'

  // Alerta si bajó más del umbral % (threshold) O bajó del precio objetivo (alert_price)
  const droppedEnoughPct = direction === 'down' && item.threshold > 0 && Math.abs(diffPercent) >= item.threshold
  const hitTargetPrice   = item.alert_price != null && newPrice <= item.alert_price && prev > item.alert_price

  return {
    direction,
    diffAbsolute,
    diffPercent,
    shouldAlert: droppedEnoughPct || hitTargetPrice,
  }
}

export function formatPriceDiff(diff: number): string {
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}€`
}

export function formatPctDiff(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}
