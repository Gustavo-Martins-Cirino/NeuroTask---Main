export const runtime = "nodejs"

// Registra (ou remove) o webhook do bot no Telegram, para não precisar montar
// a URL da API na mão. Protegido pelo CRON_SECRET, que já existe no ambiente.
//
//   POST /api/telegram/setup?secret=...            → registra
//   POST /api/telegram/setup?secret=...&info=1     → só consulta o estado
//   POST /api/telegram/setup?secret=...&remover=1  → remove o webhook

async function handle(req: Request) {
  const url = new URL(req.url)
  const secret = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("forbidden", { status: 403 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const hookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!token || !hookSecret) {
    return Response.json({ erro: "Faltam TELEGRAM_BOT_TOKEN e/ou TELEGRAM_WEBHOOK_SECRET" }, { status: 500 })
  }

  const api = (metodo: string) => `https://api.telegram.org/bot${token}/${metodo}`

  if (url.searchParams.get("info")) {
    const r = await fetch(api("getWebhookInfo"))
    return Response.json(await r.json())
  }

  if (url.searchParams.get("remover")) {
    const r = await fetch(api("deleteWebhook"), { method: "POST" })
    return Response.json(await r.json())
  }

  const webhookUrl = `${url.origin}/api/telegram/webhook`
  const r = await fetch(api("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: hookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  })
  return Response.json({ webhook: webhookUrl, telegram: await r.json() })
}

export async function POST(req: Request) {
  return handle(req)
}
export async function GET(req: Request) {
  return handle(req)
}
