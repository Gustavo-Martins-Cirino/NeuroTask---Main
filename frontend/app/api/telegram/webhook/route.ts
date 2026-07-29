import { createClient as createServiceClient } from "@supabase/supabase-js"
import { parseCommand, AJUDA } from "@/lib/telegram-commands"

export const runtime = "nodejs"

// Webhook do bot do Telegram — fluxo "mensagem → tarefa" (Fase 4).
//
// Não há sessão Supabase aqui: quem garante que o chamador é o Telegram é o
// header de segredo (definido no setWebhook). Sem ele qualquer um poderia
// forjar um update com chat_id alheio e escrever na conta de outra pessoa.
// Depois de autenticado, usa a service role, igual api/push/dispatch.

const TZ_MIN = Number(process.env.DEFAULT_TZ_OFFSET_MIN ?? 180)

interface TelegramUpdate {
  message?: {
    chat?: { id?: number }
    from?: { username?: string; first_name?: string }
    text?: string
  }
}

async function responder(chatId: number, texto: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sem parse_mode: o texto do usuário volta no eco e qualquer '*' ou '_'
      // solto quebraria a formatação (e o Telegram rejeitaria a mensagem).
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    })
  } catch {
    /* falha ao responder não pode derrubar o webhook */
  }
}

function inicioDoDiaLocal(): { inicio: string; fim: string } {
  const agora = new Date()
  const local = new Date(agora.getTime() - TZ_MIN * 60_000)
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate()
  const inicioUtc = Date.UTC(y, m, d) + TZ_MIN * 60_000
  return {
    inicio: new Date(inicioUtc).toISOString(),
    fim: new Date(inicioUtc + 24 * 3_600_000).toISOString(),
  }
}

const hhmm = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - TZ_MIN * 60_000)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

export async function POST(req: Request) {
  const segredo = req.headers.get("x-telegram-bot-api-secret-token")
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || segredo !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response("ok") // não faz o Telegram reenviar

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return new Response("ok")
  }

  const chatId = update.message?.chat?.id
  const texto = update.message?.text
  if (typeof chatId !== "number") return new Response("ok") // edições, fotos, etc.

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const cmd = parseCommand(texto)

  try {
    const { data: link } = await db
      .from("telegram_links")
      .select("id, user_id")
      .eq("chat_id", chatId)
      .maybeSingle()

    // ---- Ainda não conectado: só o pareamento é aceito ----
    if (!link) {
      if (cmd.kind === "start" && cmd.code) {
        const { data: pairing } = await db
          .from("telegram_pairing_codes")
          .select("id, user_id, expires_at")
          .eq("code", cmd.code.trim())
          .maybeSingle()

        if (!pairing || new Date(pairing.expires_at).getTime() < Date.now()) {
          await responder(chatId, "Código inválido ou expirado. Gere um novo em Configurações → Telegram.")
          return new Response("ok")
        }

        const { error } = await db.from("telegram_links").insert({
          user_id: pairing.user_id,
          chat_id: chatId,
          username: update.message?.from?.username ?? null,
        })
        if (error) {
          await responder(chatId, "Não consegui conectar agora. Tente de novo em instantes.")
          return new Response("ok")
        }
        await db.from("telegram_pairing_codes").delete().eq("id", pairing.id)
        await responder(chatId, `Conectado! 🎉\n\n${AJUDA}`)
        return new Response("ok")
      }

      await responder(
        chatId,
        "Esta conversa ainda não está ligada a uma conta do NeuroTask.\n\n" +
          "No app: Configurações → Telegram → Gerar código. Depois me mande:\n/start SEUCODIGO"
      )
      return new Response("ok")
    }

    // ---- Conectado ----
    await db.from("telegram_links").update({ last_seen_at: new Date().toISOString() }).eq("id", link.id)

    switch (cmd.kind) {
      case "start":
        await responder(chatId, `Esta conversa já está conectada. 👍\n\n${AJUDA}`)
        break

      case "help":
      case "empty":
        await responder(chatId, AJUDA)
        break

      case "unlink":
        await db.from("telegram_links").delete().eq("id", link.id)
        await responder(chatId, "Pronto, desconectei esta conversa. Suas tarefas continuam no app.")
        break

      case "today": {
        const { inicio, fim } = inicioDoDiaLocal()
        const [tarefasR, blocosR] = await Promise.all([
          db.from("tasks")
            .select("title, status, due_date")
            .eq("user_id", link.user_id)
            .in("status", ["pending", "in_progress"])
            .gte("due_date", inicio)
            .lt("due_date", fim)
            .order("due_date"),
          db.from("time_blocks")
            .select("title, start_time, end_time")
            .eq("user_id", link.user_id)
            .gte("start_time", inicio)
            .lt("start_time", fim)
            .order("start_time"),
        ])
        const tarefas = tarefasR.data ?? []
        const blocos = blocosR.data ?? []
        if (tarefas.length === 0 && blocos.length === 0) {
          await responder(chatId, "Nada marcado para hoje. 🙌")
          break
        }
        const linhas: string[] = []
        if (blocos.length > 0) {
          linhas.push("📅 Hoje na agenda:")
          for (const b of blocos) linhas.push(`  ${hhmm(b.start_time)}–${hhmm(b.end_time)}  ${b.title}`)
        }
        if (tarefas.length > 0) {
          if (linhas.length > 0) linhas.push("")
          linhas.push("✅ Tarefas para hoje:")
          for (const t of tarefas) linhas.push(`  • ${t.title}`)
        }
        await responder(chatId, linhas.join("\n"))
        break
      }

      case "task": {
        const { error } = await db.from("tasks").insert({
          user_id: link.user_id,
          title: cmd.title,
          description: cmd.description,
          status: "pending",
          priority: "medium",
        })
        await responder(
          chatId,
          error ? "Não consegui salvar essa tarefa agora. Tente de novo." : `Anotado: "${cmd.title}" ✅`
        )
        break
      }
    }
  } catch {
    await responder(chatId, "Deu ruim aqui do meu lado. Tente de novo em instantes.")
  }

  // Sempre 200: erro faz o Telegram reenviar o mesmo update em loop.
  return new Response("ok")
}
