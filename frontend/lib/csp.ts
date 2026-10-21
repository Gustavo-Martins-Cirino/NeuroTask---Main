// Content-Security-Policy: de onde o navegador pode carregar cada coisa.
//
// Duas políticas, de propósito:
//
// - a TRAVADA, que já valia: só o que não restringe script (iframe, `<base>`,
//   `<object>`) e agora `form-action`, que o ZAP apontou (17/10) como diretiva
//   sem reserva no `default-src`;
// - a COMPLETA, em modo só-relatório: o navegador não bloqueia nada, só avisa
//   em /api/csp o que teria bloqueado. Uma CSP completa errada quebra o app
//   CALADA — o CAPTCHA some, o 3D não carrega, o Realtime para —, então ela
//   passa uns dias relatando antes de virar trava (ver ROADMAP).
//
// Cada host abaixo tem dono no código. Host novo no app = linha nova aqui.
//
// `'unsafe-inline'` em script continua: o Next põe scripts inline em toda
// página, e tirá-lo pede nonce, o que deixa toda página dinâmica (sem cache
// estático). O ganho real desta política está no resto — principalmente o
// `connect-src`, que impede um script injetado de mandar dados para fora.

export const POLITICA_TRAVADA = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"

export const ROTA_DO_RELATORIO = "/api/csp"

export function politicaCompleta(supabaseUrl: string | undefined): string {
  let supabase = ""
  let supabaseWs = ""
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl)
      supabase = u.origin
      supabaseWs = `wss://${u.host}`
    }
  } catch {}

  const diretivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Cloudflare: o widget do Turnstile. YouTube: a API do player de músicas do
    // Foco (carregada só quando alguém toca). wasm-unsafe-eval: o decodificador
    // Draco dos modelos 3D roda em WebAssembly.
    "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "https://challenges.cloudflare.com", "https://www.youtube.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Fotos: do Storage (enviadas) e da conta do Google/GitHub (login social).
    // i.ytimg.com: as capas da lista de músicas do Foco.
    "img-src": ["'self'", "data:", "blob:", supabase, "https://lh3.googleusercontent.com", "https://avatars.githubusercontent.com", "https://i.ytimg.com"],
    "font-src": ["'self'", "data:"],
    // Supabase (REST, Auth e Realtime por websocket), feriados do calendário,
    // CAPTCHA e o decodificador Draco que o drei busca no gstatic.
    "connect-src": ["'self'", supabase, supabaseWs, "https://date.nager.at", "https://challenges.cloudflare.com", "https://www.gstatic.com"],
    // A voz da Neuro chega como blob; os sons do mixer moram em /sounds.
    "media-src": ["'self'", "blob:", "data:"],
    "frame-src": ["https://www.youtube.com", "https://www.youtube-nocookie.com", "https://challenges.cloudflare.com"],
    // O DRACOLoader sobe o worker a partir de um blob.
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "report-uri": [ROTA_DO_RELATORIO],
  }
  return Object.entries(diretivas)
    .map(([nome, fontes]) => `${nome} ${fontes.filter(Boolean).join(" ")}`)
    .join("; ")
}

export interface Violacao {
  diretiva: string
  bloqueado: string
  pagina: string
}

const EXTENSAO = /^(chrome|moz|safari|ms-browser)-extension:/i

/**
 * O endereço sem o que identifica alguém. A agenda pública e o feed .ics vivem
 * de token na URL — e o token é a credencial: num relatório de CSP, ele iria
 * parar no `error_log`. Query string sai sempre (o `code` do OAuth mora nela).
 */
export function paginaSemSegredo(bruto: string): string {
  try {
    const u = new URL(bruto)
    return u.pathname
      .replace(/^\/agenda\/[^/]+/, "/agenda/…")
      .replace(/^\/api\/calendar\/[^/]+/, "/api/calendar/…")
      .slice(0, 200)
  } catch {
    return "?"
  }
}

/** Só a origem do que foi bloqueado (ou a palavra: inline, eval, data, blob). */
function bloqueadoSemCaminho(bruto: string): string {
  if (!bruto) return "?"
  if (!bruto.includes(":") || /^(inline|eval|wasm-eval|trusted-types-sink)$/i.test(bruto)) return bruto.slice(0, 40)
  try {
    const u = new URL(bruto)
    if (u.protocol === "data:" || u.protocol === "blob:") return u.protocol.slice(0, -1)
    return u.origin
  } catch {
    return bruto.split(/[?#]/)[0].slice(0, 80)
  }
}

/**
 * Os dois formatos que os navegadores mandam: o antigo do `report-uri`
 * (`{"csp-report": {...}}`) e o da Reporting API (lista de `{type, body}`).
 * Violação causada por extensão do navegador é ruído — não é o app — e sai.
 */
export function leRelatorioCsp(corpo: unknown): Violacao[] {
  const brutos: Record<string, unknown>[] = []
  if (Array.isArray(corpo)) {
    for (const r of corpo) {
      if (r && typeof r === "object" && (r as { type?: unknown }).type === "csp-violation") {
        const b = (r as { body?: unknown }).body
        if (b && typeof b === "object") brutos.push(b as Record<string, unknown>)
      }
    }
  } else if (corpo && typeof corpo === "object") {
    const r = (corpo as Record<string, unknown>)["csp-report"]
    if (r && typeof r === "object") brutos.push(r as Record<string, unknown>)
  }

  const texto = (v: unknown) => (typeof v === "string" ? v : "")
  const violacoes: Violacao[] = []
  for (const b of brutos.slice(0, 20)) {
    const bloqueadoBruto = texto(b["blocked-uri"]) || texto(b.blockedURL)
    const origemDoScript = texto(b["source-file"]) || texto(b.sourceFile)
    if (EXTENSAO.test(bloqueadoBruto) || EXTENSAO.test(origemDoScript)) continue
    const diretiva = (texto(b["effective-directive"]) || texto(b.effectiveDirective) || texto(b["violated-directive"]))
      .split(" ")[0]
      .slice(0, 40)
    if (!diretiva) continue
    violacoes.push({
      diretiva,
      bloqueado: bloqueadoSemCaminho(bloqueadoBruto),
      pagina: paginaSemSegredo(texto(b["document-uri"]) || texto(b.documentURL)),
    })
  }
  return violacoes
}
