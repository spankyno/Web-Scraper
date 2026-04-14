# 🕸 WebScraper Pro

Monitor de precios y extractor de datos web con múltiples motores de scraping, alertas por Telegram y dashboard en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14 (App Router) + TypeScript |
| **Backend API** | Next.js Route Handlers (Node.js) |
| **Base de datos** | Supabase (PostgreSQL) |
| **Autenticación** | NextAuth.js (Google OAuth + credenciales) |
| **Scraping ligero** | `node-fetch` + `cheerio` |
| **Scraping JS** | Browserless API (Puppeteer remoto) |
| **Scraping IA** | Google Gemini 1.5 Flash |
| **Notificaciones** | Telegram Bot API |
| **Cron Jobs** | Vercel Cron + Cloudflare Worker (backup) |
| **Exportación** | `exceljs` (XLSX), `json2csv` (CSV), nativo (JSON/XML) |
| **Despliegue** | Vercel (CI/CD desde GitHub) |
| **Estilos** | Tailwind CSS |

---

## Variables de entorno

Crea un fichero `.env.local` en la raíz con:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_SECRET=genera_uno_con_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Browserless
BROWSERLESS_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Gemini
GEMINI_API_KEY=

# Cloudflare Worker (cron externo)
CRON_SECRET=tu_token_secreto_para_proteger_el_endpoint
```

---

## Estructura de archivos 

```
webscraper-pro/
│
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Layout raíz (providers, fonts)
│   ├── page.tsx                          # Página principal → /
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                  # Login con Google / email
│   │
│   ├── dashboard/
│   │   └── page.tsx                      # Dashboard de monitorización
│   │
│   └── api/
│       ├── scrape/
│       │   └── route.ts                  # POST /api/scrape — motor híbrido
│       ├── monitor/
│       │   └── route.ts                  # GET/POST/DELETE /api/monitor
│       ├── cron/
│       │   └── route.ts                  # GET /api/cron — job de verificación
│       └── export/
│           └── [format]/
│               └── route.ts              # GET /api/export/[json|csv|xml|xlsx]
│
├── lib/                                  # Lógica de negocio
│   ├── scrapers/
│   │   ├── fetchParser.ts               # Scraping ligero con cheerio
│   │   ├── browserless.ts              # Puppeteer via Browserless API
│   │   ├── gemini.ts                   # Extracción con Gemini AI
│   │   └── hybrid.ts                   # Orquestador: fetch → browser → gemini
│   ├── supabase.ts                      # Cliente Supabase (server)
│   ├── supabaseClient.ts               # Cliente Supabase (browser)
│   ├── telegram.ts                      # sendAlert(), formatMessage()
│   ├── priceDetector.ts                # comparePrice(), calculateDiff()
│   ├── rateLimiter.ts                  # Límite anónimos por IP
│   └── auth.ts                          # Config NextAuth
│
├── components/
│   ├── ScrapeForm.tsx                   # Formulario de extracción
│   ├── ResultsTable.tsx                 # Tabla con resultados + export
│   ├── MonitorCard.tsx                  # Card de item monitorizado
│   ├── PriceChart.tsx                   # Gráfico de evolución de precio
│   ├── AddMonitorModal.tsx             # Modal de configuración
│   ├── AlertLog.tsx                     # Historial de alertas
│   └── AnonBanner.tsx                  # Banner para usuarios no registrados
│
├── middleware.ts                         # Rate limiting anónimos
│
├── types/
│   └── index.ts                          # Tipos TypeScript compartidos
│
├── scripts/
│   └── sql/
│       ├── 01_schema.sql               # Tablas principales
│       └── 02_rls.sql                  # Row Level Security policies
│
├── vercel.json                           # Config crons + rewrites
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Base de datos (Supabase)

### Tablas

#### `profiles`
Extiende `auth.users`. Se crea automáticamente via trigger.
```sql
id          uuid  (FK → auth.users)
plan        text  -- 'free' | 'pro'
created_at  timestamptz
```

#### `scrape_jobs`
Historial de extracciones.
```sql
id            uuid
user_id       uuid (FK → profiles, nullable para anónimos)
url           text
method        text  -- 'fetch' | 'browserless' | 'gemini' | 'hybrid'
status        text  -- 'pending' | 'running' | 'done' | 'error'
result        jsonb
rows_count    int
duration_ms   int
created_at    timestamptz
```

#### `monitored_items`
Items en seguimiento de precio.
```sql
id              uuid
user_id         uuid
name            text
url             text
price_selector  text
method          text
current_price   numeric
previous_price  numeric
in_stock        boolean
alert_threshold numeric   -- % de bajada para alertar
target_price    numeric   -- precio objetivo absoluto
check_interval  interval  -- '1 hour' | '6 hours' | '24 hours'
next_check      timestamptz
notify_telegram boolean
notify_email    boolean
active          boolean
created_at      timestamptz
```

#### `price_history`
Serie temporal de precios.
```sql
id          uuid
item_id     uuid (FK → monitored_items)
price       numeric
in_stock    boolean
scraped_at  timestamptz
```

#### `anonymous_usage`
Control de límite para IPs sin cuenta.
```sql
ip          text (PK)
count       int
reset_at    timestamptz
```

---

## Flujo del cron de monitorización

```
/api/cron  (Vercel Cron cada hora)
    │
    ├─ Obtener monitored_items WHERE active=true AND next_check <= NOW()
    │
    ├─ Para cada item:
    │   ├─ scrapePrice(url, selector, method)
    │   ├─ Guardar en price_history
    │   ├─ Comparar con current_price
    │   │
    │   ├─ Si bajó más del threshold OR bajó del target_price:
    │   │   ├─ Enviar Telegram
    │   │   ├─ Enviar Email (si configurado)
    │   │   └─ Actualizar previous_price
    │   │
    │   └─ Actualizar current_price + next_check
    │
    └─ Responder { checked: N, alerts: M }
```

---

## Motores de scraping

### 1. `fetchParser` (rápido, sin JS)
- `node-fetch` + `cheerio`
- Detecta precios con selectores CSS o heurísticas
- Tiempo medio: ~300ms
- Limitación: no ejecuta JavaScript

### 2. `browserless` (JS completo)
- Puppeteer conectado a `wss://chrome.browserless.io`
- Stealth mode (puppeteer-extra-plugin-stealth)
- Intercepta llamadas XHR/fetch para capturar datos de variantes
- Tiempo medio: ~3-5s
- Requiere `BROWSERLESS_API_KEY`

### 3. `gemini` (IA visual)
- Screenshot de la página → Gemini 1.5 Flash analiza la imagen
- Extrae precio, nombre, stock con instrucción en lenguaje natural
- Tiempo medio: ~5-8s
- Fallback final cuando todo lo demás falla

### 4. `hybrid` (por defecto)
- Encadena: `fetchParser` → `browserless` → `gemini`
- Se detiene en el primer éxito
- Registra el método usado en `scrape_jobs`

---

## Despliegue en Vercel

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno en Vercel Dashboard
# (Settings → Environment Variables)

# 3. Deploy
git push origin main  # Vercel hace CD automático

# 4. Cron configurado en vercel.json
# Se ejecuta cada hora automáticamente
```

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Rellenar .env.local con tus claves

npm run dev
# → http://localhost:3000
```

---

## Límites por plan

| | Anónimo | Free | Pro |
|---|---|---|---|
| Extracciones/mes | 5 por IP | Ilimitadas | Ilimitadas |
| Motor Browserless | ✗ | ✗ | ✓ |
| Motor Gemini AI | ✗ | ✗ | ✓ |
| Items monitorizados | 0 | 3 | Ilimitados |
| Alertas Telegram | ✗ | ✓ | ✓ |
| Exportación | JSON/CSV | JSON/CSV | JSON/CSV/XML/XLSX |

---

## Licencia

MIT
