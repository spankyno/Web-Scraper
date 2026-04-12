// lib/scrapers/gemini.ts
// Motor IA: toma screenshot con Browserless y lo analiza con Gemini Vision

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScrapeResult } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const BROWSERLESS_ENDPOINT = 'https://chrome.browserless.io/screenshot'
const API_KEY = process.env.BROWSERLESS_API_KEY!

async function takeScreenshot(url: string): Promise<string> {
  const res = await fetch(`${BROWSERLESS_ENDPOINT}?token=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      options: {
        fullPage: false,
        type: 'jpeg',
        quality: 80,
      },
      viewport: { width: 1280, height: 900 },
      gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
    }),
    signal: AbortSignal.timeout(35_000),
  })

  if (!res.ok) throw new Error(`Screenshot falló: ${res.status}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}

const DEFAULT_INSTRUCTION = `
Analiza esta página web de producto y extrae en formato JSON estricto:
{
  "productName": "nombre completo del producto",
  "price": número decimal (solo el número, sin símbolo de moneda),
  "currency": "EUR" | "USD" | "GBP",
  "inStock": true | false,
  "originalPrice": número decimal o null (precio tachado/anterior si existe),
  "rating": número o null,
  "seller": "nombre del vendedor o tienda" o null
}
Responde SOLO con el JSON, sin explicaciones ni markdown.
`

export async function geminiExtract(
  url: string,
  instruction?: string,
): Promise<ScrapeResult> {
  const t0 = Date.now()

  const screenshotB64 = await takeScreenshot(url)

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = instruction ?? DEFAULT_INSTRUCTION

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: screenshotB64,
      },
    },
  ])

  const text = result.response.text().trim()

  // Limpiar posibles backticks de markdown
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini devolvió JSON inválido: ${text.slice(0, 200)}`)
  }

  const price = typeof parsed.price === 'number' ? parsed.price : null
  const productName = typeof parsed.productName === 'string' ? parsed.productName : ''
  const inStock = typeof parsed.inStock === 'boolean' ? parsed.inStock : true

  return {
    success: true,
    url,
    method: 'gemini',
    data: [{ url, ...parsed }],
    price,
    inStock,
    productName,
    currency: (parsed.currency as string) ?? 'EUR',
    durationMs: Date.now() - t0,
  }
}
