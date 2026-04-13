// lib/scrapers/hybrid.ts
// Orquestador: intenta fetch → browserless → gemini
// Se detiene en el primer éxito

import { fetchParser } from './fetchParser'
import { browserlessScrape } from './browserless'
import { geminiExtract } from './gemini'
import type { ScrapeRequest, ScrapeResult, ScrapingMethod } from '@/types'

export async function scrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const { url, method = 'hybrid', selector, aiInstruction } = req

  switch (method) {
    case 'fetch-light':
      return fetchParser(url, selector)

    case 'browserless':
      return browserlessScrape(url, selector)

    case 'gemini':
      return geminiExtract(url, aiInstruction)

    case 'hybrid':
    case 'auto':
    default:
      return hybridScrape(url, selector, aiInstruction)
  }
}

async function hybridScrape(
  url: string,
  selector?: string,
  aiInstruction?: string,
): Promise<ScrapeResult> {
  const errors: string[] = []

  // 1. Intento ligero
  try {
    const result = await fetchParser(url, selector)
    if (result.success && result.price !== null) {
      console.log(`[hybrid] fetch OK para ${url}`)
      return result
    }
    errors.push(`fetch: sin precio detectado`)
  } catch (e) {
    errors.push(`fetch: ${(e as Error).message}`)
    console.warn(`[hybrid] fetch falló para ${url}:`, (e as Error).message)
  }

  // 2. Browserless (JS completo + interceptación XHR)
  try {
    const result = await browserlessScrape(url, selector)
    if (result.success && result.price !== null) {
      console.log(`[hybrid] browserless OK para ${url}`)
      return result
    }
    errors.push(`browserless: sin precio detectado`)
  } catch (e) {
    errors.push(`browserless: ${(e as Error).message}`)
    console.warn(`[hybrid] browserless falló para ${url}:`, (e as Error).message)
  }

  // 3. Gemini AI (fallback final)
  try {
    const result = await geminiExtract(url, aiInstruction)
    console.log(`[hybrid] gemini OK para ${url}`)
    return result
  } catch (e) {
    errors.push(`gemini: ${(e as Error).message}`)
    console.error(`[hybrid] todos los motores fallaron para ${url}`)
  }

  // Todos fallaron
  return {
    success: false,
    url,
    method: 'hybrid',
    data: [],
    price: null,
    inStock: false,
    durationMs: 0,
    error: errors.join(' | '),
  }
}

// Auto-detectar el método óptimo según la URL
export function suggestMethod(url: string): ScrapingMethod {
  const u = url.toLowerCase()

  // Sitios conocidos que requieren JS
  const jsRequired = [
    'amazon.', 'zara.com', 'mango.com', 'zalando.',
    'mediamarkt.', 'pccomponentes.', 'elcorteingles.',
    'fnac.', 'carrefour.', 'lidl.', 'ikea.',
  ]

  if (jsRequired.some(d => u.includes(d))) {
    return 'browserless'
  }

  return 'fetch-light'
}
