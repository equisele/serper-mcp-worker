# 🔍 Serper MCP Worker

Servidor MCP para Claude.ai desplegado como **Cloudflare Worker** (gratis, sin servidor).  
Expone búsquedas en Google y scraping web a través del protocolo MCP con transporte Streamable HTTP (spec 2025-03-26).

## ¿Qué hace?

Conecta Claude.ai (web, desktop y **móvil**) con la API de [Serper](https://serper.dev) para que pueda:

- 🔎 **`google_search`** — buscar en Google con filtros de país, idioma, fecha y número de resultados
- 📄 **`scrape`** — extraer el contenido de texto de cualquier página web

## Requisitos

- Cuenta en [Cloudflare](https://cloudflare.com) (plan gratuito suficiente)
- Cuenta en [Serper](https://serper.dev) (2.500 búsquedas/mes gratis)
- [Node.js](https://nodejs.org) v18 o superior

---

## Instalación

### 1. Clona el repositorio

```bash
git clone https://github.com/TU_USUARIO/serper-mcp-worker.git
cd serper-mcp-worker
```

### 2. Instala Wrangler

```bash
npm install -g wrangler
```

### 3. Autentícate en Cloudflare

```bash
wrangler login
```

Se abrirá el navegador. Autoriza el acceso y vuelve a la terminal.

### 4. Añade tu API key de Serper como secret

```bash
wrangler secret put SERPER_API_KEY
```

Pega tu key cuando la pida y pulsa Enter.

> ⚠️ La key se guarda encriptada en Cloudflare. Nunca va al código ni al repositorio.

### 5. Despliega

```bash
wrangler deploy
```

Al terminar verás:

```
Deployed serper-mcp-worker triggers
  https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev
```

---

## Conectar a Claude.ai

1. Ve a **Claude.ai → Settings → Integrations → Add custom integration**
2. Introduce la URL de tu Worker:
   ```
   https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/mcp
   ```
3. Guarda. Claude detectará las herramientas automáticamente.

Funciona en **web, desktop y móvil** sin configuración adicional.

---

## Verificar que funciona

### macOS / Linux

```bash
# Health check
curl https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/health

# Listar herramientas disponibles
curl -X POST https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Windows (PowerShell)

```powershell
# Health check
Invoke-RestMethod https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/health

# Listar herramientas disponibles
Invoke-RestMethod -Uri https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/mcp `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Windows (cmd / Git Bash)

```bash
curl -X POST https://serper-mcp-worker.TU-SUBDOMINIO.workers.dev/mcp ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
```

---

## Herramientas

### `google_search`

| Parámetro | Tipo   | Requerido | Descripción |
|-----------|--------|-----------|-------------|
| `q`       | string | ✅        | Consulta de búsqueda |
| `gl`      | string | ❌        | País: `es`, `us`, `mx`... |
| `hl`      | string | ❌        | Idioma: `es`, `en`... |
| `num`     | number | ❌        | Resultados (por defecto 10) |
| `page`    | number | ❌        | Página (por defecto 1) |
| `tbs`     | string | ❌        | Tiempo: `qdr:d` (día), `qdr:w` (semana), `qdr:m` (mes) |

### `scrape`

| Parámetro | Tipo   | Requerido | Descripción |
|-----------|--------|-----------|-------------|
| `url`     | string | ✅        | URL a extraer |

---

## Endpoints

| Método   | Ruta      | Descripción |
|----------|-----------|-------------|
| `POST`   | `/mcp`    | Mensajes MCP (JSON-RPC 2.0) |
| `GET`    | `/mcp`    | Stream SSE para notificaciones |
| `DELETE` | `/mcp`    | Terminar sesión |
| `GET`    | `/health` | Estado del servidor |
| `GET`    | `/`       | Info del servidor |

---

## Actualizar el Worker

```bash
git pull
wrangler deploy
```

La `SERPER_API_KEY` guardada como secret no se pierde al redesplegar.

---

## Costes

| Servicio           | Plan gratuito               |
|--------------------|-----------------------------|
| Cloudflare Workers | 100.000 peticiones/día      |
| Serper             | 2.500 búsquedas/mes         |

Ambos suficientes para uso personal.

---

## Créditos

Basado en la API de [Serper](https://serper.dev) y el protocolo [MCP](https://modelcontextprotocol.io) de Anthropic.  
Transporte: Streamable HTTP spec `2025-03-26`.

## Licencia

MIT
