// types/index.ts

export type ScrapingMethod = 'fetch' | 'browserless' | 'gemini' | 'hybrid' | 'auto'

export type JobStatus = 'pending' | 'running' | 'done' | 'error'

export type UserPlan = 'free' | 'pro'

export type NotifyChannel = 'telegram' | 'email' | 'both' | 'none'

export type CheckInterval = '1 hour' | '6 hours' | '12 hours' | '24 hours'

export type ExportFormat = 'json' | 'csv' | 'xml' | 'xlsx'

// ─── Scraping ────────────────────────────────────────────────────────────────

export interface ScrapeRequest {
  url: string
  method?: ScrapingMethod
  selector?: string
  aiInstruction?: string
}

export interface ScrapeResult {
  success: boolean
  url: string
  method: ScrapingMethod
  data: Record<string, unknown>[]
  price?: number | null
  currency?: string
  inStock?: boolean
  productName?: string
  durationMs: number
  error?: string
}

// ─── Monitor ─────────────────────────────────────────────────────────────────

export interface MonitoredItem {
  id: string
  userId: string
  name: string
  url: string
  priceSelector: string
  method: ScrapingMethod
  currentPrice: number | null
  previousPrice: number | null
  inStock: boolean
  alertThreshold: number       // porcentaje, ej: 10 = avisar si baja más del 10%
  targetPrice: number | null   // precio absoluto objetivo
  checkInterval: CheckInterval
  nextCheck: string            // ISO date
  notifyTelegram: boolean
  notifyEmail: boolean
  active: boolean
  createdAt: string
}

export interface PriceHistoryPoint {
  id: string
  itemId: string
  price: number
  inStock: boolean
  scrapedAt: string
}

export interface PriceChange {
  item: MonitoredItem
  previousPrice: number
  currentPrice: number
  diffPercent: number
  inStock: boolean
}

// ─── Database rows (snake_case) ───────────────────────────────────────────────

export interface ScrapeJobRow {
  id: string
  user_id: string | null
  url: string
  method: ScrapingMethod
  status: JobStatus
  result: Record<string, unknown>[] | null
  rows_count: number | null
  duration_ms: number | null
  created_at: string
}

export interface MonitoredItemRow {
  id: string
  user_id: string
  name: string
  url: string
  price_selector: string
  method: ScrapingMethod
  current_price: number | null
  previous_price: number | null
  in_stock: boolean
  alert_threshold: number
  target_price: number | null
  check_interval: string
  next_check: string
  notify_telegram: boolean
  notify_email: boolean
  active: boolean
  created_at: string
}

export interface PriceHistoryRow {
  id: string
  item_id: string
  price: number
  in_stock: boolean
  scraped_at: string
}

export interface AnonymousUsageRow {
  ip: string
  count: number
  reset_at: string
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string
}

export interface CronRunResult {
  checked: number
  alerts: number
  errors: string[]
}
