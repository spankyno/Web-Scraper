// lib/priceDetector.ts
// Utilidades para comparar precios y detectar bajadas

import type { MonitoredItem, PriceChange } from '@/types'

export interface PriceComparison {
  changed: boolean
  direction: 'up' | 'down' | 'same'
  diffAbsolute: number
  diffPercent: number
  shouldAlert: boolean
}

export function comparePrice(
  item: MonitoredItem,
  newPrice: number,
): PriceComparison {
  const prev = item.currentPrice ?? newPrice

  if (prev === 0) {
    return { changed: false, direction: 'same', diffAbsolute: 0, diffPercent: 0, shouldAlert: false }
  }

  const diffAbsolute = newPrice - prev
  const diffPercent = ((newPrice - prev) / prev) * 100

  const direction = diffAbsolute < 0 ? 'down' : diffAbsolute > 0 ? 'up' : 'same'
  const changed = Math.abs(diffPercent) >= 0.01  // cambio mínimo de 0.01%

  // Alertar si:
  // 1. Bajó más del umbral configurado (%), O
  // 2. Bajó del precio objetivo absoluto
  const droppedEnough = direction === 'down' && Math.abs(diffPercent) >= item.alertThreshold
  const hitTarget = item.targetPrice !== null && newPrice <= item.targetPrice && (prev > item.targetPrice)

  return {
    changed,
    direction,
    diffAbsolute,
    diffPercent,
    shouldAlert: droppedEnough || hitTarget,
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
