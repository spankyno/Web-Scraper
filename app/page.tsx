// app/page.tsx
'use client'

import { useState } from 'react'
import type { ScrapeResult, ScrapingMethod, ExportFormat } from '@/types'

const METHODS: { value: ScrapingMethod; label: string; desc: string }[] = [
  { value: 'hybrid', label: '🔄 Hybrid (recomendado)', desc: 'fetch → browserless → gemini' },
  { value: 'fetch-light', label: '⚡ Fetch + Parser', desc: 'Rápido, sin JS' },
  { value: 'browserless', label: '🌐 Browserless',   desc: 'JS completo + XHR' },
  { value: 'gemini', label: '✨ Gemini AI',           desc: 'Screenshot + IA' },
]

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<ScrapingMethod>('hybrid')
  const [selector, setSelector] = useState('')
  const [aiInstruction, setAiInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)

  const PROGRESS_STEPS = [
    [10,  'Validando URL...'],
    [25,  'Conectando...'],
    [45,  'Renderizando página...'],
    [65,  'Extrayendo datos...'],
    [85,  'Procesando resultados...'],
    [100, 'Completado ✓'],
  ] as const

  async function handleScrape() {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setProgress(0)

    // Simular progreso visual mientras espera la API
    let step = 0
    const timer = setInterval(() => {
      if (step < PROGRESS_STEPS.length - 1) {
        setProgress(PROGRESS_STEPS[step][0])
        setProgressLabel(PROGRESS_STEPS[step][1])
        step++
      }
    }, 800)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, selector: selector || undefined, aiInstruction: aiInstruction || undefined }),
      })

      clearInterval(timer)
      setProgress(100)
      setProgressLabel('Completado ✓')

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error desconocido')
      } else {
        setResult(json)
        setJobId(json.jobId ?? null)
      }
    } catch (e) {
      clearInterval(timer)
      setError('Error de red al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  function handleExport(format: ExportFormat) {
    if (!jobId) return
    window.open(`/api/export/${format}?jobId=${jobId}`, '_blank')
  }

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ color: '#00d4aa' }}>
        🕸 WebScraper Pro
      </h1>
      <p className="text-gray-400 mb-8">Extractor y monitor de precios web</p>

      {/* FORMULARIO */}
      <div className="rounded-xl p-6 mb-6 space-y-4" style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.amazon.es/dp/..."
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono outline-none"
            style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.15)', color: '#e8eaf0' }}
            onKeyDown={e => e.key === 'Enter' && handleScrape()}
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
            style={{ background: '#00d4aa', color: '#000' }}
          >
            {loading ? '⏳ Extrayendo...' : '⚡ Extraer'}
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={method}
            onChange={e => setMethod(e.target.value as ScrapingMethod)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.15)', color: '#e8eaf0' }}
          >
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
            ))}
          </select>

          <input
            type="text"
            value={selector}
            onChange={e => setSelector(e.target.value)}
            placeholder="Selector CSS opcional (.price, #sku…)"
            className="flex-1 min-w-48 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.15)', color: '#e8eaf0' }}
          />
        </div>

        {method === 'gemini' && (
          <input
            type="text"
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            placeholder="✨ Instrucción IA: extrae nombre, precio, disponibilidad..."
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: '#0d0f14', border: '1px solid rgba(139,92,246,0.4)', color: '#e8eaf0' }}
          />
        )}

        {/* BARRA DE PROGRESO */}
        {loading && (
          <div>
            <div className="rounded-full h-1.5 overflow-hidden" style={{ background: '#0d0f14' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: '#00d4aa' }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ color: '#555c6e' }}>
              <span>{progressLabel}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-lg p-4 mb-4 text-sm" style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', color: '#ff6b87' }}>
          ⚠️ {error}
        </div>
      )}

      {/* RESULTADOS */}
      {result && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <div className="px-5 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-sm font-medium" style={{ color: '#e8eaf0' }}>Resultados</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: '#0d0f14', color: '#00d4aa' }}>
              {result.data.length} filas
            </span>
            {result.price && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(0,212,170,0.1)', color: '#00d4aa' }}>
                Precio: €{result.price.toFixed(2)}
              </span>
            )}
            <span className="text-xs" style={{ color: '#555c6e' }}>
              {result.method} · {result.durationMs}ms
            </span>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0d0f14' }}>
                  {result.data[0] && Object.keys(result.data[0]).map(k => (
                    <th key={k} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#555c6e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2.5 font-mono text-xs" style={{ color: '#8b909e', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export */}
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ background: '#0d0f14', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-xs mr-1" style={{ color: '#555c6e' }}>Exportar:</span>
            {(['json', 'csv', 'xml', 'xlsx'] as ExportFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="px-3 py-1 rounded text-xs font-mono transition-colors hover:text-teal-400"
                style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', color: '#8b909e' }}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
