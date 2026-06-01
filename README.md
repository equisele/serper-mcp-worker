# 🔍 Serper MCP Worker

> 🌐 [Versión en español](README.es.md)

MCP server for Claude.ai deployed as a **Cloudflare Worker** (free, serverless).  
Exposes Google Search and web scraping through the MCP protocol using Streamable HTTP transport (spec 2025-03-26).

## What it does

Connects Claude.ai (web, desktop and **mobile**) to the [Serper](https://serper.dev) API so it can:

- 🔎 **`google_search`** — search Google with filters for country, language, date and number of results
- 📄 **`scrape`** — extract the text content from any web page

## Requirements

- [Cloudflare](https://cloudflare.com) account (free plan is enough)
- [Serper](https://serper.dev) account (2,500 free searches/month)
- [Node.js](https://nodejs.org) v18 or higher

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/TU_USUARIO/serper-mcp-worker.git
cd serper-mcp-worker
```

### 2. Install Wrangler

```bash
npm install -g wrangler
```

### 3. Authenticate with Cloudflare

```bash
wrangler login
```

A browser window will open. Authorize access and return to the terminal.

### 4. Add your Serper API key as a secret

```bash
wrangler secret put SERPER_API_KEY
```

Paste your key when prompted and press Enter.

> ⚠️ The key is stored encrypted in Cloudflare. It never ends up in your code or repository.

### 5. Deploy

```bash
wrangler deploy
```

When finished you'll see:

```
Deployed serper-mcp-worker triggers
  https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev
```

---

## Connect to Claude.ai

1. Go to **Claude.ai → Settings → Integrations → Add custom integration**
2. Enter your Worker URL:
   ```
   https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/mcp
   ```
3. Save. Claude will detect the tools automatically.

Works on **web, desktop and mobile** with no additional setup.

---

## Verify it works

### macOS / Linux

```bash
# Health check
curl https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/health

# List available tools
curl -X POST https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Windows (PowerShell)

```powershell
# Health check
Invoke-RestMethod https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/health

# List available tools
Invoke-RestMethod -Uri https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/mcp `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Windows (cmd / Git Bash)

```bash
curl -X POST https://serper-mcp-worker.YOUR-SUBDOMAIN.workers.dev/mcp ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
```

---

## Tools

### `google_search`

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `q`       | string | ✅       | Search query |
| `gl`      | string | ❌       | Country: `es`, `us`, `mx`... |
| `hl`      | string | ❌       | Language: `es`, `en`... |
| `num`     | number | ❌       | Number of results (default 10) |
| `page`    | number | ❌       | Results page (default 1) |
| `tbs`     | string | ❌       | Time filter: `qdr:d` (day), `qdr:w` (week), `qdr:m` (month) |

### `scrape`

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `url`     | string | ✅       | URL to scrape |

---

## Endpoints

| Method   | Path      | Description |
|----------|-----------|-------------|
| `POST`   | `/mcp`    | MCP messages (JSON-RPC 2.0) |
| `GET`    | `/mcp`    | SSE stream for server notifications |
| `DELETE` | `/mcp`    | Terminate session |
| `GET`    | `/health` | Server status |
| `GET`    | `/`       | Server info |

---

## Update the Worker

```bash
git pull
wrangler deploy
```

The `SERPER_API_KEY` secret is not lost when redeploying.

---

## Pricing

| Service            | Free tier                   |
|--------------------|-----------------------------|
| Cloudflare Workers | 100,000 requests/day        |
| Serper             | 2,500 searches/month        |

Both are sufficient for personal use.

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Credits

Built on the [Serper](https://serper.dev) API and Anthropic's [MCP](https://modelcontextprotocol.io) protocol.  
Transport: Streamable HTTP spec `2025-03-26`.

## License

MIT
