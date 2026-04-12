// lib/scrapers/browserless.ts
// Motor JS completo via Browserless API (Puppeteer remoto)
// Intercepta XHR/fetch para capturar datos de variantes de producto

import type { ScrapeResult } from '@/types'

const BROWSERLESS_ENDPOINT = 'https://chrome.browserless.io/function'
const API_KEY = process.env.BROWSERLESS_API_KEY!

// Este código se ejecuta DENTRO del navegador remoto de Browserless
const BROWSER_FN = /* js */ `
export default async function({ page, context }) {
  const { url, selector } = context;

  // Interceptar todas las respuestas XHR/fetch
  const xhrData = [];
  await page.setRequestInterception(true);
  
  page.on('request', req => req.continue());
  
  page.on('response', async (response) => {
    const resUrl = response.url();
    const ct = response.headers()['content-type'] ?? '';
    // Capturar solo respuestas JSON de API (probables datos de producto)
    if (
      ct.includes('application/json') &&
      !resUrl.includes('analytics') &&
      !resUrl.includes('tracking') &&
      !resUrl.includes('gtm')
    ) {
      try {
        const json = await response.json();
        xhrData.push({ url: resUrl, data: json });
      } catch {}
    }
  });

  // Stealth: sobreescribir propiedades que detectan headless
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    window.chrome = { runtime: {} };
  });

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Extraer precio con el selector o con heurísticas
  const priceSelectors = [
    selector,
    '[itemprop="price"]',
    '.a-price-whole',
    '[class*="price"]:not([class*="was"]):not([class*="old"])',
    '[data-price]',
    'meta[property="product:price:amount"]',
  ].filter(Boolean);

  let price = null;
  let priceText = '';

  for (const sel of priceSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        priceText = await page.evaluate(
          el => el.getAttribute('content') ?? el.getAttribute('data-price') ?? el.innerText,
          el
        );
        if (priceText) break;
      }
    } catch {}
  }

  // Limpiar precio
  if (priceText) {
    const cleaned = priceText
      .replace(/[€$£¥\\s]/g, '')
      .replace(/\\.(?=\\d{3})/g, '')
      .replace(',', '.')
      .trim();
    price = parseFloat(cleaned) || null;
  }

  const productName = await page.$eval(
    'h1[itemprop="name"], #productTitle, .product-title, h1',
    el => el.innerText.trim()
  ).catch(() => '');

  const inStock = await page.evaluate(() => {
    const body = document.body.innerText.toLowerCase();
    return !body.includes('agotado') && 
           !body.includes('sin stock') && 
           !body.includes('out of stock') &&
           !body.includes('no disponible');
  });

  return {
    price,
    priceText,
    productName,
    inStock,
    xhrData: xhrData.slice(0, 5), // máx 5 respuestas JSON
    url,
  };
}
`

interface BrowserlessResult {
  data: {
    price: number | null
    priceText: string
    productName: string
    inStock: boolean
    xhrData: Array<{ url: string; data: unknown }>
    url: string
  }
  type: string
}

export async function browserlessScrape(
  url: string,
  selector?: string,
): Promise<ScrapeResult> {
  const t0 = Date.now()

  const res = await fetch(`${BROWSERLESS_ENDPOINT}?token=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: BROWSER_FN,
      context: { url, selector: selector ?? null },
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Browserless error ${res.status}: ${err}`)
  }

  const result: BrowserlessResult = await res.json()
  const { price, productName, inStock, xhrData } = result.data

  // Buscar en las respuestas XHR datos adicionales de precio/variantes
  const variantData = xhrData.flatMap(({ data }) => {
    if (typeof data === 'object' && data !== null) {
      return [data]
    }
    return []
  })

  return {
    success: true,
    url,
    method: 'browserless',
    data: [
      {
        url,
        productName,
        price,
        inStock,
        variantApiData: variantData.length > 0 ? variantData : undefined,
      },
    ],
    price,
    inStock,
    productName,
    durationMs: Date.now() - t0,
  }
}
