// app/page.tsx
'use client'

import { useState, useRef } from 'react'
import type { ScrapingMethod, ExportFormat } from '@/types'

// ── Tipos locales ─────────────────────────────────────────────
interface ScrapeResponse {
  jobId: string | null
  url: string
  method: ScrapingMethod
  price: number | null
  productName: string | null
  inStock: boolean
  currency: string
  durationMs: number
  suggestedMethod: string
  data: Record<string, unknown>[]
  error?: string
}

// ── Constantes ────────────────────────────────────────────────
const METHODS: { value: ScrapingMethod; label: string; desc: string; color: string }[] = [
  { value: 'hybrid',      label: '🔄 Hybrid',      desc: 'fetch → browser → gemini', color: '#00d4aa' },
  { value: 'fetch-light', label: '⚡ Fetch',        desc: 'Rápido, sin JS',           color: '#3b82f6' },
  { value: 'browserless', label: '🌐 Browserless',  desc: 'JS completo + XHR',        color: '#f59e0b' },
  { value: 'gemini',      label: '✨ Gemini AI',     desc: 'Screenshot + IA',          color: '#8b5cf6' },
]

const PROGRESS_STEPS = [
  [12,  'Resolviendo DNS…'],
  [28,  'Conectando…'],
  [48,  'Renderizando página…'],
  [65,  'Extrayendo selectores…'],
  [82,  'Procesando precio…'],
  [95,  'Guardando resultado…'],
] as [number, string][]

// ── Helpers de estilo ─────────────────────────────────────────
const css = {
  sidebar: {
    width: 220, minHeight: '100vh', background: '#0d1117',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column' as const,
    position: 'sticky' as const, top: 0, height: '100vh', flexShrink: 0,
  },
  main: { flex: 1, minWidth: 0, background: '#0d0f14', display: 'flex', flexDirection: 'column' as const },
  card: {
    background: '#161b22', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  input: {
    background: '#0d1117', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '10px 14px', color: '#e8eaf0',
    fontSize: 13, fontFamily: 'monospace', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  btn: (bg: string, color = '#000') => ({
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: bg, color, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'opacity 0.15s', whiteSpace: 'nowrap' as const,
  }),
}

// ── Componente principal ──────────────────────────────────────
export default function HomePage() {
  const [url,           setUrl]           = useState('')
  const [method,        setMethod]        = useState<ScrapingMethod>('hybrid')
  const [selector,      setSelector]      = useState('')
  const [aiInstruction, setAiInstruction] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result,        setResult]        = useState<ScrapeResponse | null>(null)
  const [error,         setError]         = useState('')
  const [jobId,         setJobId]         = useState<string | null>(null)
  const [activeNav,     setActiveNav]     = useState('extract')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedMethod = METHODS.find(m => m.value === method)!

  async function handleScrape() {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true); setError(''); setResult(null); setProgress(0)

    let step = 0
    timerRef.current = setInterval(() => {
      if (step < PROGRESS_STEPS.length) {
        setProgress(PROGRESS_STEPS[step][0])
        setProgressLabel(PROGRESS_STEPS[step][1])
        step++
      }
    }, 700)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, method, selector: selector || undefined, aiInstruction: aiInstruction || undefined }),
      })
      clearInterval(timerRef.current!)
      setProgress(100); setProgressLabel('Completado ✓')
      const json = await res.json()
      if (!res.ok) setError(json.error ?? 'Error desconocido')
      else { setResult(json); setJobId(json.jobId ?? null) }
    } catch (e) {
      clearInterval(timerRef.current!)
      setError('Error de red al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  function handleExport(format: ExportFormat) {
    if (!jobId) return
    window.open(`/api/export/${format}?jobId=${jobId}`, '_blank')
  }

  const confidence = result?.price != null ? (result.method === 'gemini' ? 85 : result.method === 'browserless' ? 92 : 78) : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={css.sidebar}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#00d4aa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🕸</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0', fontFamily: 'monospace' }}>WebScraper</div>
              <div style={{ fontSize: 10, color: '#555c6e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pro</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { id: 'extract', icon: '⚡', label: 'Extracción', href: '/' },
            { id: 'monitor', icon: '📡', label: 'Monitorización', href: '/dashboard' },
            { id: 'alerts',  icon: '🔔', label: 'Alertas', href: '/dashboard' },
          ].map(item => (
            <a key={item.id} href={item.href}
              onClick={() => setActiveNav(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                textDecoration: 'none',
                background: activeNav === item.id ? 'rgba(0,212,170,0.1)' : 'transparent',
                color: activeNav === item.id ? '#00d4aa' : '#8b909e',
                border: `1px solid ${activeNav === item.id ? 'rgba(0,212,170,0.2)' : 'transparent'}`,
                fontSize: 13, fontWeight: activeNav === item.id ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div style={{ fontSize: 10, color: '#555c6e', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 4px', marginTop: 8 }}>Cuenta</div>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, color: '#8b909e', fontSize: 13, textDecoration: 'none' }}>
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>⚙</span> Configuración
          </a>
        </nav>

        {/* Footer user */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a href="/login" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, textDecoration: 'none', cursor: 'pointer',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>U</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#e8eaf0' }}>Mi cuenta</div>
              <div style={{ fontSize: 10, color: '#00d4aa', fontFamily: 'monospace' }}>Free plan</div>
            </div>
          </a>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={css.main}>
        {/* Topbar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, background: '#0d0f14' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0' }}>Extracción </span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#00d4aa' }}>de datos</span>
          </div>
          <a href="/dashboard" style={{ ...css.btn('#1e2330', '#8b909e'), border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            📡 Monitorizar
          </a>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>

          {/* ── PANEL DE EXTRACCIÓN ── */}
          <div style={{ ...css.card, padding: 20 }}>

            {/* URL + botón */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input
                style={{ ...css.input, flex: 1, fontFamily: 'monospace' }}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="https://www.amazon.es/dp/... o cualquier URL de producto"
              />
              <button
                onClick={handleScrape}
                disabled={loading || !url.trim()}
                style={{ ...css.btn('#00d4aa'), opacity: loading || !url.trim() ? 0.6 : 1, minWidth: 110 }}
              >
                {loading ? '⏳ Extrayendo…' : '⚡ Extraer'}
              </button>
            </div>

            {/* Opciones */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Selector de método */}
              <div style={{ display: 'flex', gap: 4, background: '#0d1117', borderRadius: 8, padding: 3 }}>
                {METHODS.map(m => (
                  <button key={m.value} onClick={() => setMethod(m.value)} title={m.desc}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                      background: method === m.value ? '#161b22' : 'transparent',
                      color: method === m.value ? m.color : '#555c6e',
                      outline: method === m.value ? `1px solid ${m.color}33` : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Selector CSS */}
              <input
                style={{ ...css.input, flex: 1, minWidth: 180, fontSize: 12 }}
                type="text"
                value={selector}
                onChange={e => setSelector(e.target.value)}
                placeholder="Selector CSS opcional (.price, #sku…)"
              />

              {/* Badge método activo */}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                background: `${selectedMethod.color}18`, color: selectedMethod.color,
                border: `1px solid ${selectedMethod.color}33`, whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                {selectedMethod.desc}
              </span>
            </div>

            {/* Campo IA (solo Gemini) */}
            {method === 'gemini' && (
              <div style={{ marginTop: 10 }}>
                <input
                  style={{ ...css.input, borderColor: 'rgba(139,92,246,0.3)', fontSize: 12 }}
                  type="text"
                  value={aiInstruction}
                  onChange={e => setAiInstruction(e.target.value)}
                  placeholder="✨ Instrucción IA: extrae nombre, precio, disponibilidad, rating…"
                />
              </div>
            )}

            {/* Barra de progreso */}
            {loading && (
              <div style={{ marginTop: 14 }}>
                <div style={{ background: '#0d1117', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#00d4aa', borderRadius: 4, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#555c6e' }}>
                  <span>{progressLabel}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, background: 'rgba(255,77,109,0.08)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)', fontFamily: 'monospace' }}>
              ⚠ {error}
            </div>
          )}

          {/* ── RESULTADO ── */}
          {result && !error && (
            <div style={css.card}>

              {/* Header resultado */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0', flex: 1 }}>
                  {result.productName || 'Resultado'}
                </span>

                {/* Precio destacado */}
                {result.price != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#00d4aa' }}>
                      {result.currency === 'EUR' ? '€' : result.currency}{result.price.toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
                      background: result.inStock ? 'rgba(16,185,129,0.12)' : 'rgba(255,77,109,0.12)',
                      color: result.inStock ? '#34d399' : '#ff6b87',
                      border: `1px solid ${result.inStock ? 'rgba(16,185,129,0.25)' : 'rgba(255,77,109,0.25)'}`,
                    }}>
                      {result.inStock ? '✓ En stock' : '✕ Sin stock'}
                    </span>
                  </div>
                )}
              </div>

              {/* Métricas de extracción */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Método',    value: result.method,              color: selectedMethod.color },
                  { label: 'Duración',  value: `${result.durationMs}ms`,   color: result.durationMs > 5000 ? '#f59e0b' : '#555c6e' },
                  { label: 'Registros', value: `${result.data.length}`,     color: '#555c6e' },
                  { label: 'Confianza', value: `${confidence}%`,            color: confidence >= 85 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#ff6b87' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                  </div>
                ))}

                {/* Barra de confianza */}
                <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 10, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Nivel de confianza</div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${confidence}%`,
                      background: confidence >= 85 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#ff6b87',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              </div>

              {/* Tabla de datos */}
              {result.data.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0d1117' }}>
                        {Object.keys(result.data[0]).map(k => (
                          <th key={k} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#555c6e', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {Object.entries(row).map(([k, v], j) => (
                            <td key={j} style={{
                              padding: '10px 16px', fontSize: 12, fontFamily: 'monospace',
                              color: k === 'price' || k === 'precio' ? '#00d4aa'
                                : k === 'productName' || k === 'product_name' ? '#e8eaf0'
                                : '#8b909e',
                              fontWeight: k === 'price' || k === 'precio' ? 700 : 400,
                              maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {typeof v === 'boolean' ? (v ? '✓' : '✕') : String(v ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Export + Monitorizar */}
              <div style={{ padding: '12px 20px', background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderRadius: '0 0 12px 12px' }}>
                <span style={{ fontSize: 11, color: '#555c6e', marginRight: 4 }}>Exportar:</span>
                {(['json', 'csv', 'xml', 'xlsx'] as ExportFormat[]).map(fmt => (
                  <button key={fmt} onClick={() => handleExport(fmt)}
                    disabled={!jobId}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                      background: '#161b22', color: jobId ? '#8b909e' : '#333',
                      border: '1px solid rgba(255,255,255,0.08)', cursor: jobId ? 'pointer' : 'default',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { if (jobId) { (e.target as HTMLElement).style.color = '#00d4aa'; (e.target as HTMLElement).style.borderColor = 'rgba(0,212,170,0.3)' } }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.color = '#8b909e'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#555c6e', alignSelf: 'center' }}>
                    {result.url.length > 40 ? result.url.slice(0, 40) + '…' : result.url}
                  </span>
                  <a href="/dashboard"
                    style={{ ...css.btn('#00d4aa'), fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    📡 Monitorizar
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {!result && !loading && !error && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔍</div>
                <p style={{ fontSize: 15, color: '#8b909e', marginBottom: 8 }}>Introduce una URL de producto para extraer su precio</p>
                <p style={{ fontSize: 12, color: '#555c6e', lineHeight: 1.7 }}>
                  Soporta Amazon, Zara, Primor, MediaMarkt, PC Componentes y miles de tiendas más.
                  El motor híbrido detecta automáticamente el mejor método de extracción.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                  {['amazon.es', 'primor.eu', 'zara.com', 'mediamarkt.es'].map(site => (
                    <span key={site} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: '#555c6e', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace' }}>
                      {site}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
