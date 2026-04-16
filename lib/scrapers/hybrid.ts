// lib/scrapers/hybrid.ts
import { fetchParser } from './fetchParser'
import { browserlessScrape } from './browserless'
import { geminiExtract } from './gemini'
import type { ScrapeRequest, ScrapeResult, ScrapingMethod } from '@/types'

export async function scrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const { url, method = 'hybrid', selector, aiInstruction } = req
  switch (method) {
    case 'fetch-light': return fetchParser(url, selector)
    case 'browserless': return browserlessScrape(url, selector)
    case 'gemini':      return geminiExtract(url, aiInstruction)
    default:            return hybridScrape(url, selector, aiInstruction)
  }
}

async function hybridScrape(url: string, selector?: string, aiInstruction?: string): Promise<ScrapeResult> {
  const errors: string[] = []

  try {
    const r = await fetchParser(url, selector)
    if (r.success && r.price !== null) { console.log(`[hybrid] fetch-light OK`); return r }
    errors.push(`fetch-light: sin precio`)
  } catch (e) { errors.push(`fetch-light: ${(e as Error).message}`) }

  try {
    const r = await browserlessScrape(url, selector)
    if (r.success && r.price !== null) { console.log(`[hybrid] browserless OK`); return r }
    errors.push(`browserless: sin precio`)
  } catch (e) { errors.push(`browserless: ${(e as Error).message}`) }

  try {
    const r = await geminiExtract(url, aiInstruction)
    console.log(`[hybrid] gemini OK`)
    return r
  } catch (e) { errors.push(`gemini: ${(e as Error).message}`) }

  return { success: false, url, method: 'hybrid', data: [], price: null, inStock: false, durationMs: 0, error: errors.join(' | ') }
}

export function suggestMethod(url: string): ScrapingMethod {
  const u = url.toLowerCase()
  const jsRequired = ['amazon.', 'zara.com', 'mango.com', 'zalando.', 'mediamarkt.',
    'pccomponentes.', 'elcorteingles.', 'fnac.', 'carrefour.', 'lidl.', 'ikea.',
    'primor.', 'sephora.', 'asos.']
  return jsRequired.some(d => u.includes(d)) ? 'browserless' : 'fetch-light'
}
