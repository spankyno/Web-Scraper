// components/AlertLog.tsx
'use client'

import { useEffect, useState } from 'react'
import type { ScrapeJob } from '@/types'
import { formatPrice, relativeTime, methodLabel } from '@/lib/format'

interface AlertEntry {
  id: string
  url: string
  domain: string
  method: string
  price: number | null
  priceText: string | null
  inStock: boolean
  confidence: number | null
  duration: number | null
  createdAt: string
  error: string | null
}

function parseJob(job: ScrapeJob): AlertEntry {
  const r = job.result
  const domain = (() => {
    try { return new URL(job.url).hostname.replace('www.', '') }
    catch { return job.url.slice(0, 30) }
  })()

  return {
    id: job.id,
    url: job.url,
    domain,
    method: job.method,
    price: r?.price ?? null,
    priceText: r?.price_text ?? null,
    inStock: r?.in_stock ?? true,
    confidence: r?.confidence ?? null,
    duration: job.duration,
    createdAt: job.created_at,
    error: r?.error ?? null,
  }
}

function ConfidenceDot({ value }: { value: number | null }) {
  if (value == null) return null
  const color = value >= 80 ? '#34d399' : value >= 50 ? '#fbbf24' : '#ff6b87'
  return (
    <span
      style={{
        display: 'inline-block', width: 7, height: 7,
        borderRadius: '50%', background: color,
        marginRight: 5, flexShrink: 0,
      }}
    />
  )
}

export default function AlertLog() {
  const [jobs,    setJobs]    = useState<AlertEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'ok' | 'error'>('all')
  const [page,    setPage]    = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const PAGE_SIZE = 10

  async function load() {
    setLoading(true)
    const res = await fetch('/api/jobs')
    if (res.ok) {
      const { jobs: raw } = await res.json() as { jobs: ScrapeJob[] }
      setJobs((raw ?? []).map(parseJob))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteOne(id: string) {
    setDeleting(id)
    await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' })
    setJobs(prev => prev.filter(j => j.id !== id))
    setDeleting(null)
  }

  async function deleteAll() {
    if (!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')) return
    setLoading(true)
    await fetch('/api/jobs?all=1', { method: 'DELETE' })
    setJobs([])
    setLoading(false)
  }

  const filtered   = jobs.filter(j => filter === 'ok' ? !j.error : filter === 'error' ? !!j.error : true)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const total      = jobs.length
  const errors     = jobs.filter(j => j.error).length
  const avgDuration = jobs.reduce((s, j) => s + (j.duration ?? 0), 0) / (jobs.length || 1)

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#555c6e', fontSize: 13 }}>Cargando historial…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Extracciones totales', value: total, color: '#e8eaf0' },
          { label: 'Con error',            value: errors, color: errors > 0 ? '#ff6b87' : '#34d399' },
          { label: 'Duración media',       value: `${Math.round(avgDuration)}ms`, color: '#00d4aa' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#1e2330',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <p style={{ fontSize: 10, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['all', 'ok', 'error'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0) }}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12,
              fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: filter === f ? 'rgba(0,212,170,0.1)' : '#1e2330',
              color: filter === f ? '#00d4aa' : '#8b909e',
              border: `1px solid ${filter === f ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {{ all: 'Todos', ok: '✓ Exitosos', error: '✕ Errores' }[f]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555c6e' }}>
          {filtered.length} registros
        </span>
        {jobs.length > 0 && (
          <button onClick={deleteAll}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(255,77,109,0.08)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)' }}>
            🗑 Limpiar todo
          </button>
        )}
      </div>

      {/* Tabla de jobs */}
      <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 80px 60px 70px 32px',
          padding: '10px 16px', background: '#0d0f14',
          borderBottom: '1px solid rgba(255,255,255,0.07)', gap: 8,
        }}>
          {['URL', 'Precio', 'Método', 'Duración', 'Stock', 'Fecha', ''].map(h => (
            <span key={h} style={{ fontSize: 10, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>
              {h}
            </span>
          ))}
        </div>

        {paginated.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#555c6e', fontSize: 13 }}>
            Sin registros
          </div>
        ) : (
          paginated.map((job, i) => (
            <div key={job.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 80px 60px 70px 32px',
                padding: '10px 16px', gap: 8, alignItems: 'center',
                borderBottom: i < paginated.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: job.error ? 'rgba(255,77,109,0.03)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = job.error ? 'rgba(255,77,109,0.03)' : 'transparent')}
            >
              {/* URL */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12, color: '#e8eaf0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {job.domain}
                </div>
                {job.error ? (
                  <div style={{ fontSize: 10, color: '#ff6b87', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    ⚠ {job.error.slice(0, 60)}
                  </div>
                ) : (
                  <a
                    href={job.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#555c6e', textDecoration: 'none' }}
                  >
                    {job.url.slice(0, 45)}{job.url.length > 45 ? '…' : ''}
                  </a>
                )}
              </div>

              {/* Precio */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ConfidenceDot value={job.confidence} />
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                  color: job.price != null ? '#00d4aa' : '#555c6e',
                }}>
                  {job.price != null ? formatPrice(job.price) : job.priceText ?? '—'}
                </span>
              </div>

              {/* Método */}
              <span style={{ fontSize: 11, color: '#8b909e', fontFamily: 'monospace' }}>
                {methodLabel(job.method)}
              </span>

              {/* Duración */}
              <span style={{
                fontSize: 11, fontFamily: 'monospace',
                color: (job.duration ?? 0) > 5000 ? '#f59e0b' : '#555c6e',
              }}>
                {job.duration != null ? `${job.duration}ms` : '—'}
              </span>

              {/* Stock */}
              <span style={{ fontSize: 11 }}>
                {job.inStock
                  ? <span style={{ color: '#34d399' }}>✓</span>
                  : <span style={{ color: '#ff6b87' }}>✕</span>
                }
              </span>

              {/* Fecha */}
              <span style={{ fontSize: 10, color: '#555c6e', whiteSpace: 'nowrap' }}>
                {relativeTime(job.createdAt)}
              </span>

              {/* Eliminar */}
              <button
                onClick={() => deleteOne(job.id)}
                disabled={deleting === job.id}
                title="Eliminar registro"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#555c6e', fontSize: 13, padding: '2px 4px',
                  borderRadius: 4, transition: 'color 0.15s',
                  opacity: deleting === job.id ? 0.4 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ff6b87')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555c6e')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12,
              cursor: page === 0 ? 'default' : 'pointer',
              background: '#1e2330', color: '#8b909e',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: page === 0 ? 0.4 : 1, fontFamily: 'inherit',
            }}
          >← Anterior</button>

          <span style={{ fontSize: 12, color: '#555c6e' }}>
            {page + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              background: '#1e2330', color: '#8b909e',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: page >= totalPages - 1 ? 0.4 : 1, fontFamily: 'inherit',
            }}
          >Siguiente →</button>
        </div>
      )}
    </div>
  )
}
