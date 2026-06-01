/**
 * Cloudflare Worker — Serper MCP Server
 * Transporte: Streamable HTTP (spec 2025-03-26)
 * Endpoint único: POST /mcp  +  GET /mcp
 *
 * Variable de entorno requerida:
 *   SERPER_API_KEY  →  wrangler secret put SERPER_API_KEY
 */

const SERPER_SEARCH_URL = "https://google.serper.dev/search";
const SERPER_SCRAPE_URL  = "https://scrape.serper.dev";
const MCP_VERSION        = "2025-03-26";

// ─── Herramientas ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "google_search",
    description:
      "Busca en Google usando Serper. Devuelve resultados orgánicos, knowledge graph, 'people also ask' y búsquedas relacionadas.",
    inputSchema: {
      type: "object",
      properties: {
        q:    { type: "string",  description: "Consulta de búsqueda" },
        gl:   { type: "string",  description: "País (ej: 'es', 'us', 'mx')" },
        hl:   { type: "string",  description: "Idioma (ej: 'es', 'en')" },
        num:  { type: "number",  description: "Número de resultados (por defecto 10)" },
        page: { type: "number",  description: "Página de resultados (por defecto 1)" },
        tbs:  { type: "string",  description: "Filtro de tiempo: 'qdr:d' (día), 'qdr:w' (semana), 'qdr:m' (mes)" },
      },
      required: ["q"],
    },
  },
  {
    name: "scrape",
    description: "Extrae el contenido de texto de una página web.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL a extraer" },
      },
      required: ["url"],
    },
  },
];

// ─── Serper API ───────────────────────────────────────────────────────────────

async function serperSearch(params, apiKey) {
  const res = await fetch(SERPER_SEARCH_URL, {
    method:  "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Serper search ${res.status}: ${res.statusText}`);
  return res.json();
}

async function serperScrape(url, apiKey) {
  const res = await fetch(SERPER_SCRAPE_URL, {
    method:  "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Serper scrape ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Formateo ─────────────────────────────────────────────────────────────────

function formatSearch(data) {
  const out = [];
  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    out.push(`## ${kg.title || "Knowledge Graph"}${kg.type ? ` (${kg.type})` : ""}`);
    if (kg.description) out.push(kg.description);
    if (kg.website)     out.push(`Web: ${kg.website}`);
    out.push("");
  }
  if (data.organic?.length) {
    out.push("## Resultados");
    data.organic.forEach((r, i) => {
      out.push(`\n### ${i + 1}. ${r.title}`);
      out.push(`URL: ${r.link}`);
      if (r.snippet) out.push(r.snippet);
      if (r.date)    out.push(`Fecha: ${r.date}`);
    });
  }
  if (data.peopleAlsoAsk?.length) {
    out.push("\n## También preguntan");
    data.peopleAlsoAsk.forEach(q => {
      out.push(`- ${q.question}`);
      if (q.snippet) out.push(`  ${q.snippet}`);
    });
  }
  if (data.relatedSearches?.length) {
    out.push("\n## Relacionadas");
    out.push(data.relatedSearches.map(s => s.query).join(", "));
  }
  return out.join("\n");
}

function formatScrape(data) {
  const out = [];
  if (data.title) out.push(`# ${data.title}\n`);
  if (data.text)  out.push(data.text);
  return out.join("\n");
}

// ─── Lógica MCP (JSON-RPC) ────────────────────────────────────────────────────

async function handleMessage(msg, apiKey) {
  const base = { jsonrpc: "2.0", id: msg.id ?? null };

  try {
    switch (msg.method) {

      case "initialize":
        return {
          ...base,
          result: {
            protocolVersion: MCP_VERSION,
            serverInfo:      { name: "serper-mcp-worker", version: "1.0.0" },
            capabilities:    { tools: {} },
          },
        };

      case "notifications/initialized":
        return null; // notificación, sin respuesta

      case "ping":
        return { ...base, result: {} };

      case "tools/list":
        return { ...base, result: { tools: TOOLS } };

      case "tools/call": {
        const { name, arguments: args } = msg.params;

        if (name === "google_search") {
          const data = await serperSearch(args, apiKey);
          return { ...base, result: { content: [{ type: "text", text: formatSearch(data) }] } };
        }

        if (name === "scrape") {
          const data = await serperScrape(args.url, apiKey);
          return { ...base, result: { content: [{ type: "text", text: formatScrape(data) }] } };
        }

        return { ...base, error: { code: -32601, message: `Herramienta desconocida: ${name}` } };
      }

      default:
        return { ...base, error: { code: -32601, message: `Método no soportado: ${msg.method}` } };
    }
  } catch (err) {
    return { ...base, error: { code: -32603, message: err.message || "Error interno" } };
  }
}

// ─── Headers comunes ──────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...extra },
  });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method;
    const apiKey = env.SERPER_API_KEY;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health check
    if (method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", server: "serper-mcp-worker", transport: "streamable-http" });
    }

    // ── /mcp ─────────────────────────────────────────────────────────────────

    if (url.pathname === "/mcp") {

      if (!apiKey) {
        return json({ error: "SERPER_API_KEY no configurada" }, 500);
      }

      // GET /mcp → SSE stream para notificaciones servidor→cliente
      // Claude.ai lo usa para iniciar la sesión
      if (method === "GET") {
        const sessionId = crypto.randomUUID();
        const { readable, writable } = new TransformStream();
        const writer  = writable.getWriter();
        const encoder = new TextEncoder();

        // Enviamos un ping inicial para confirmar conexión
        writer.write(encoder.encode(`: connected session=${sessionId}\n\n`));

        // Ping periódico para mantener viva la conexión
        const ping = setInterval(() => {
          writer.write(encoder.encode(": ping\n\n")).catch(() => clearInterval(ping));
        }, 20000);

        return new Response(readable, {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type":  "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "Mcp-Session-Id": sessionId,
          },
        });
      }

      // POST /mcp → procesamos mensaje JSON-RPC
      if (method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json(
            { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } },
            400
          );
        }

        const sessionId = request.headers.get("Mcp-Session-Id") || crypto.randomUUID();
        const accept    = request.headers.get("Accept") || "application/json";
        const wantsSSE  = accept.includes("text/event-stream");

        // Batch
        if (Array.isArray(body)) {
          const results = (
            await Promise.all(body.map(msg => handleMessage(msg, apiKey)))
          ).filter(Boolean);

          if (wantsSSE) {
            const encoder = new TextEncoder();
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            for (const r of results) {
              writer.write(encoder.encode(`data: ${JSON.stringify(r)}\n\n`));
            }
            writer.write(encoder.encode("event: close\ndata: {}\n\n"));
            writer.close();
            return new Response(readable, {
              headers: { ...CORS, "Content-Type": "text/event-stream", "Mcp-Session-Id": sessionId },
            });
          }

          return json(results, 200, { "Mcp-Session-Id": sessionId });
        }

        // Mensaje único
        const result = await handleMessage(body, apiKey);

        // Notificaciones → 202 sin body
        if (result === null) {
          return new Response(null, { status: 202, headers: { ...CORS, "Mcp-Session-Id": sessionId } });
        }

        if (wantsSSE) {
          const encoder = new TextEncoder();
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          writer.write(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
          writer.write(encoder.encode("event: close\ndata: {}\n\n"));
          writer.close();
          return new Response(readable, {
            headers: { ...CORS, "Content-Type": "text/event-stream", "Mcp-Session-Id": sessionId },
          });
        }

        return json(result, 200, { "Mcp-Session-Id": sessionId });
      }

      // DELETE /mcp → terminar sesión
      if (method === "DELETE") {
        return new Response(null, { status: 200, headers: CORS });
      }

      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }

    // Ruta raíz → info
    if (url.pathname === "/") {
      return json({
        name:      "serper-mcp-worker",
        transport: "streamable-http",
        endpoint:  "/mcp",
        spec:      MCP_VERSION,
        tools:     TOOLS.map(t => t.name),
      });
    }

    return new Response("Not Found", { status: 404, headers: CORS });
  },
};
