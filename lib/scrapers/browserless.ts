// lib/scrapers/browserless.ts
// Browserless v2 API — endpoint: /chrome/function
// Timeout ajustado a 8s para caber en el límite de 10s de Vercel Hobby

import type { ScrapeResult } from '@/types'

const API_KEY  = process.env.BROWSERLESS_API_KEY ?? ''
// Browserless v2 usa /chrome/function (v1 usaba /function)
const ENDPOINT = `https://production-sfo.browserless.io/chrome/function?token=${API_KEY}`

const BROWSER_FN = /* js */`
export default async function({ page, context }) {
  const { url, selector } = context;

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Selectores de precio por orden de confianza
  const priceSelectors = [
    selector,
    '[itemprop="price"]',
    'meta[property="product:price:amount"]',
    '[data-price]',
    '.a-price-whole',
    '[class*="price--current"]',
    '[class*="current-price"]',
    '[class*="precio"]',
    '[class*="price"]:not([class*="was"]):not([class*="old"]):not([class*="original"])',
  ].filter(Boolean);

  let price = null;
  let priceText = '';

  for (const sel of priceSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const raw = await page.evaluate(
        el => el.getAttribute('content') ?? el.getAttribute('data-price') ?? el.innerText,
        el
      );
      if (raw && raw.trim()) { priceText = raw.trim(); break; }
    } catch {}
  }

  if (priceText) {
    const cleaned = priceText.replace(/[^0-9.,]/g, '')
      .replace(/\\.(?=\\d{3})/g, '')
      .replace(',', '.');
    price = parseFloat(cleaned) || null;
  }

  const productName = await page.$eval(
    'h1[itemprop="name"], h1.product-title, h1.product_title, #productTitle, h1',
    el => el.innerText.trim()
  ).catch(() => '');

  const title = await page.title();

  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const inStock = !bodyText.includes('agotado') &&
    !bodyText.includes('sin stock') &&
    !bodyText.includes('out of stock') &&
    !bodyText.includes('no disponible') &&
    !bodyText.includes('not available');

  return { price, priceText, productName, title, inStock, url };
}
`

export async function browserlessScrape(
  url: string,
  selector?: string,
): Promise<ScrapeResult> {
  const t0 = Date.now()

  if (!API_KEY) throw new Error('BROWSERLESS_API_KEY no configurada')

  const res = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      code:    BROWSER_FN,
      context: { url, selector: selector ?? null },
    }),
    signal: AbortSignal.timeout(25_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Browserless ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json()

  // Browserless v2 devuelve el resultado directamente (no anidado en .data)
  const data = json?.data ?? json

  const { price, productName, title, inStock } = data

  return {
    success: true,
    url,
    method:      'browserless',
    data:        [{ url, productName: productName || title, price, inStock }],
    price:       price ?? null,
    inStock:     inStock ?? true,
    productName: productName || title || '',
    durationMs:  Date.now() - t0,
  }
}
