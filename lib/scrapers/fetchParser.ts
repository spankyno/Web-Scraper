// lib/scrapers/fetchParser.ts
// Motor ligero: fetch + cheerio
// No ejecuta JavaScript → rápido pero limitado a HTML estático

import * as cheerio from 'cheerio'
import type { ScrapeResult } from '@/types'

// Selectores heurísticos para detectar precios sin configuración manual
const PRICE_SELECTORS = [
  '[itemprop="price"]',
  '[class*="price"]:not([class*="was"]):not([class*="old"])',
  '[id*="price"]:not([id*="was"]):not([id*="old"])',
  '.a-price-whole',          // Amazon
  '.price-box .price',       // Magento
  '.product-price',
  '[data-price]',
  '[data-product-price]',
  'meta[property="product:price:amount"]',
  'meta[itemprop="price"]',
]

const STOCK_SELECTORS = [
  '[class*="stock"]',
  '[class*="availability"]',
  '[id*="availability"]',
  '[itemprop="availability"]',
  '.a-size-medium.a-color-success',  // Amazon "En stock"
  '.in-stock',
  '.out-of-stock',
]

const NAME_SELECTORS = [
  'h1[itemprop="name"]',
  '#productTitle',            // Amazon
  '.product-title',
  '.product-name',
  'h1',
]

function parsePrice(raw: string): number | null {
  if (!raw) return null
  // Elimina símbolos de moneda y espacios, normaliza separadores
  const cleaned = raw
    .replace(/[€$£¥\s]/g, '')
    .replace(/\.(?=\d{3})/g, '')  // separador de miles con punto
    .replace(',', '.')             // coma decimal → punto
    .trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function detectStock($: cheerio.CheerioAPI, selector?: string): boolean {
  if (selector) {
    const text = $(selector).text().toLowerCase()
    return !text.includes('agotado') && !text.includes('sin stock') && !text.includes('out of stock')
  }
  for (const sel of STOCK_SELECTORS) {
    const el = $(sel)
    if (el.length) {
      const text = el.text().toLowerCase()
      const cls = (el.attr('class') ?? '').toLowerCase()
      if (cls.includes('out-of-stock') || text.includes('agotado') || text.includes('out of stock')) {
        return false
      }
      return true
    }
  }
  return true // asume en stock si no detecta
}

export async function fetchParser(
  url: string,
  selector?: string,
): Promise<ScrapeResult> {
  const t0 = Date.now()

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al acceder a ${url}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // ── Precio ──────────────────────────────────────────────────
  let priceRaw = ''

  if (selector) {
    priceRaw = $(selector).first().text()
      || $(selector).first().attr('content')
      || $(selector).first().attr('data-price')
      || ''
  }

  if (!priceRaw) {
    for (const sel of PRICE_SELECTORS) {
      const el = $(sel).first()
      if (el.length) {
        priceRaw = el.attr('content') ?? el.attr('data-price') ?? el.text()
        if (priceRaw) break
      }
    }
  }

  const price = parsePrice(priceRaw)

  // ── Nombre ──────────────────────────────────────────────────
  let productName = ''
  for (const sel of NAME_SELECTORS) {
    productName = $(sel).first().text().trim()
    if (productName) break
  }

  // ── Stock ───────────────────────────────────────────────────
  const inStock = detectStock($, selector)

  // ── Datos genéricos de la página ────────────────────────────
  const data: Record<string, unknown>[] = [{
    url,
    productName,
    price: price ?? priceRaw,
    inStock,
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') ?? '',
  }]

  return {
    success: true,
    url,
    method: 'fetch',
    data,
    price,
    inStock,
    productName,
    durationMs: Date.now() - t0,
  }
}
