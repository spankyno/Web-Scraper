// components/MonitorCard.tsx
'use client'

import { useState } from 'react'
import type { MonitoredItem, PriceHistoryPoint } from '@/types'
import {
  formatPrice, priceDiffPercent, formatPct,
  relativeTime, getEffectivePrice, getEffectivePrev,
  getEffectiveActive, statusConfig, methodLabel, confidenceColor,
} from '@/lib/format'

interface Props {
  item: MonitoredItem
  history?: PriceHistoryPoint[]
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onCheckNow: (item: MonitoredItem) => Promise<boolean>
  onEdit: (item: MonitoredItem) => void
}

// ── Sparkline SVG inline ─────────────────────────────────────────────────────
function Sparkline({ points, status }: { points: number[]; status: string }) {
  if (points.length < 2) {
    return (
      <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#555c6e' }}>Sin historial aún</span>
      </div>
    )
  }

  const W = 260
  const H = 44
  const PAD = 4

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
    // Invertir Y: precio alto = posición baja en SVG
    const y = PAD + ((max - p) / range) * (H - PAD * 2)
    return [x, y] as [number, number]
  })

  const lineColor = status === 'price_drop' ? '#00d4aa'
    : status === 'price_rise' ? '#f59e0b'
    : status === 'out_of_stock' ? '#ff4d6d'
    : '#555c6e'

  const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Área de relleno
  const last = coords[coords.length - 1]
  const first = coords[0]
  const area = `${polyline} ${last[0].toFixed(1)},${H} ${first[0].toFixed(1)},${H}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: H, display: 'block' }}
    >
      <defs>
        <linearGradient id={`sg-${status}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Área */}
      <polygon
        points={area}
        fill={`url(#sg-${status})`}
      />
      {/* Línea */}
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Punto final */}
      <circle
        cx={last[0].toFixed(1)}
        cy={last[1].toFixed(1)}
        r="3"
        fill={lineColor}
      />
    </svg>
  )
}

// ── Barra de confianza ────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number | null }) {
  if (value == null) return null
  const color = confidenceColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        flex: 1, height: 3, background: 'rgba(255,255,255,0.07)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${value}%`, height: '100%',
          background: color, borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 10, color, fontFamily: 'monospace', minWidth: 28 }}>
        {value}%
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MonitorCard({ item, history, onToggle, onDelete, onCheckNow, onEdit }: Props) {
  const [checking, setChecking] = useState(false)
  const [justChecked, setJustChecked] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const current = getEffectivePrice(item)
  const previous = getEffectivePrev(item)
  const active = getEffectiveActive(item)
  const currency = item.pricecurrency ?? 'EUR'
  const st = statusConfig(item.status ?? 'stable')

  const pct = current != null && previous != null && previous !== 0
    ? priceDiffPercent(current, previous)
    : null

  const sparkPoints = history
    ? history.slice(-20).map(h => h.price).filter(Boolean)
    : (current != null ? [current] : [])

  async function handleCheck() {
    setChecking(true)
    const ok = await onCheckNow(item)
    setChecking(false)
    if (ok) {
      setJustChecked(true)
      setTimeout(() => setJustChecked(false), 3000)
    }
  }

  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', '') }
    catch { return item.url.slice(0, 30) }
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: '#1e2330',
        border: `1px solid ${active ? (item.status === 'price_drop' ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 14,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: active ? 1 : 0.55,
        transition: 'border-color 0.2s, opacity 0.2s',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

        {/* Thumbnail / favicon */}
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: '#0d0f14', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {item.image_url
            ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 18 }}>🛒</span>
          }
        </div>

        {/* Título + URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 500, color: '#e8eaf0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 2,
          }}>
            {item.title ?? domain}
          </p>
          <p style={{
            fontSize: 11, color: '#555c6e', fontFamily: 'monospace',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {domain}
          </p>
        </div>

        {/* Badge estado */}
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {st.label}
        </span>
      </div>

      {/* ── Precio principal ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 24, fontWeight: 700,
          color: item.status === 'out_of_stock' ? '#ff6b87'
            : (current != null && current > 0) ? '#00d4aa'
            : '#555c6e',
        }}>
          {(current != null && current > 0) ? formatPrice(current, currency) : 'Sin precio aún'}
        </span>

        {previous != null && previous > 0 && previous !== current && (
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#555c6e', textDecoration: 'line-through' }}>
            {formatPrice(previous, currency)}
          </span>
        )}

        {pct != null && Math.abs(pct) >= 0.01 && (
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: pct < 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: pct < 0 ? '#34d399' : '#fbbf24',
          }}>
            {formatPct(pct)}
          </span>
        )}
      </div>

      {/* ── Precio objetivo ── */}
      {item.alert_price != null && item.alert_price > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555c6e' }}>🎯 Objetivo:</span>
          <span style={{
            fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
            color: (current != null && current > 0 && current <= item.alert_price) ? '#34d399' : '#8b5cf6',
          }}>
            {formatPrice(item.alert_price, currency)}
          </span>
          {current != null && current > 0 && current > item.alert_price && (
            <span style={{ fontSize: 10, color: '#555c6e' }}>
              (faltan {formatPrice(current - item.alert_price, currency)})
            </span>
          )}
        </div>
      )}

      {/* ── Sparkline ── */}
      <div style={{
        background: '#0d0f14', borderRadius: 8,
        padding: '8px 8px 4px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <Sparkline points={sparkPoints} status={item.status ?? 'stable'} />
      </div>

      {/* ── Confidence + meta ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {item.price_confidence != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#555c6e', minWidth: 70 }}>Confianza</span>
            <ConfidenceBar value={item.price_confidence} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Frecuencia destacada */}
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20,
            background: 'rgba(0,212,170,0.08)',
            color: '#00d4aa',
            border: '1px solid rgba(0,212,170,0.2)',
          }}>
            ⏱ {formatInterval(item.check_interval ?? '24h')}
          </span>
          <span style={{ fontSize: 11, color: '#555c6e' }}>
            🕐 {relativeTime(item.last_checked ?? item.lastchecked ?? item.created_at)}
          </span>
          <span style={{ fontSize: 11, color: '#555c6e' }}>
            {methodLabel(item.method)}
          </span>
          {item.notification_channel && item.notification_channel !== 'none' && (
            <span style={{ fontSize: 11, color: '#555c6e' }}>
              {item.notification_channel === 'telegram' ? '📱 TG'
               : item.notification_channel === 'email' ? '📧 Email'
               : '📱📧 Ambos'}
            </span>
          )}
        </div>
      </div>

      {/* ── Error badge ── */}
      {item.last_error && (
        <div style={{
          fontSize: 11, color: '#fb923c',
          background: 'rgba(251,146,60,0.08)',
          border: '1px solid rgba(251,146,60,0.2)',
          borderRadius: 6, padding: '5px 10px',
        }}>
          ⚠ {item.last_error.slice(0, 100)}
        </div>
      )}

      {/* ── Detalles expandibles ── */}
      {expanded && (
        <div style={{
          background: '#0d0f14', borderRadius: 8,
          padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11, color: '#555c6e',
          display: 'flex', flexDirection: 'column', gap: 5,
          fontFamily: 'monospace',
        }}>
          <div><span style={{ color: '#8b909e' }}>URL: </span>{item.url}</div>
          {item.price_selector && (
            <div><span style={{ color: '#8b909e' }}>Selector: </span>{item.price_selector}</div>
          )}
          {item.price_extraction_method && (
            <div><span style={{ color: '#8b909e' }}>Extracción: </span>{item.price_extraction_method}</div>
          )}
          {item.next_check && (
            <div><span style={{ color: '#8b909e' }}>Próximo check: </span>{relativeTime(item.next_check)}</div>
          )}
          {Array.isArray(item.custom_selectors) && item.custom_selectors.length > 0 && (
            <div>
              <span style={{ color: '#8b909e' }}>Selectores custom: </span>
              {item.custom_selectors.map(s => s.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* ── Acciones ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleCheck}
          disabled={checking}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 11,
            fontWeight: 600, cursor: checking ? 'default' : 'pointer',
            background: justChecked ? 'rgba(16,185,129,0.15)' : 'rgba(0,212,170,0.08)',
            color: justChecked ? '#34d399' : '#00d4aa',
            border: `1px solid ${justChecked ? 'rgba(16,185,129,0.3)' : 'rgba(0,212,170,0.2)'}`,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {checking ? '⏳ Verificando…' : justChecked ? '✓ Actualizado' : '🔄 Verificar'}
        </button>

        <button
          onClick={() => onEdit(item)}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
            background: '#0d0f14', color: '#8b909e',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title="Editar"
        >✏</button>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
            background: expanded ? 'rgba(255,255,255,0.05)' : '#0d0f14',
            color: '#8b909e',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title="Ver detalles"
        >⋯</button>

        <button
          onClick={() => onToggle(item.id, !active)}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
            background: '#0d0f14', color: active ? '#8b909e' : '#00d4aa',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title={active ? 'Pausar' : 'Activar'}
        >
          {active ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => {
            if (confirm(`¿Eliminar "${item.title ?? item.url}"?`)) onDelete(item.id)
          }}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(255,77,109,0.05)', color: '#ff6b87',
            border: '1px solid rgba(255,77,109,0.2)',
          }}
          title="Eliminar"
        >✕</button>
      </div>
    </div>
  )
}
