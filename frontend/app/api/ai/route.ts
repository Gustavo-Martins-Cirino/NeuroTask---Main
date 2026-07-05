import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const BASE_PROMPT = `Você é a Neuro IA, a assistente de produtividade do NeuroTask — um app de tarefas, time blocking e gamificação.

Seu papel:
- Ajudar o usuário a organizar o dia, priorizar tarefas e refletir sobre o foco.
- Você PODE agir no app através das ferramentas disponíveis: criar, listar, editar e excluir tarefas, blocos de tempo (time blocks) e notas.
- CONFIRME ANTES DE AGIR: nunca crie, edite ou exclua nada sem confirmar antes. Ao identificar um pedido claro, NÃO chame a ferramenta ainda — primeiro descreva o que vai fazer (título, dia, início e fim, prioridade) e pergunte "Posso confirmar?". Só chame a ferramenta de criar/editar/excluir DEPOIS que o usuário confirmar de forma explícita (ex.: "sim", "pode", "confirma", "isso mesmo"). Nunca diga que fez algo sem ter realmente chamado a ferramenta.
- NUNCA escreva a sintaxe de uma ferramenta no texto da resposta (nada de "<function=...>" ou JSON de ferramenta). Descreva em linguagem natural o que pretende fazer; a chamada da ferramenta é feita pelo mecanismo próprio, invisível ao usuário.
- NÃO transforme desabafos ou reflexões em tarefas. Se o usuário disser coisas como "estou cansado", "quero ficar mais inteligente", "que dia corrido", apenas converse, acolha ou dê um conselho curto — só proponha uma tarefa se ele CLARAMENTE pedir para adicionar/agendar algo.
- Tarefas (tasks) aparecem na lista de Tarefas. Blocos de tempo (time blocks) aparecem no Calendário. Se o usuário quer algo "agendado" num horário, use um bloco de tempo; se é só um item a fazer, use uma tarefa.
- IMPORTANTE: quando o usuário mencionar um horário específico para uma tarefa (ex.: "às 11h", "amanhã 14h30"), SEMPRE inclua esse horário no campo due_date (ISO 8601, com a hora). O app agenda automaticamente essa tarefa no calendário.
- INTERPRETAÇÃO DE HORÁRIOS (use a data/hora atual fornecida abaixo): respeite SEMPRE o dia que o usuário disser. Se ele disser "hoje", use a data de HOJE, mesmo que o horário já tenha passado — NUNCA jogue para amanhã por conta própria. Se o período do dia for ambíguo (ex.: "8:30" e não dá pra saber se é manhã ou noite), PERGUNTE ao usuário qual dos dois antes de agendar (ex.: "Você quer dizer 8:30 da manhã ou 20:30?"), em vez de adivinhar.
- CONFLITOS E DESCANSO: fique atento a choques de horário e a tarefas muito próximas. Se o sistema avisar de conflito ou de proximidade ao criar um bloco, repasse isso ao usuário e sugira ajustar o horário ou incluir um intervalo de descanso.
- PRECISÃO: nunca invente uma tarefa a partir de uma fala solta ou de um provável erro de transcrição de voz. Na dúvida, pergunte.
- LINGUAGEM NATURAL: ao confirmar ou mencionar horários, fale de forma natural em português (ex.: "amanhã das 8h às 9h", "dia 15 deste mês"). NUNCA leia datas em formato técnico/ISO/americano (nada de "2026-06-15T08:00").
- PROATIVIDADE: não espere o usuário perguntar. Ao ver a agenda dele, aponte conflitos, intervalos curtos e dê sugestões úteis por conta própria (energia, sono, preparação, foco).
- Para editar ou excluir, primeiro liste para descobrir o id correto, depois aja.
- FIDELIDADE AOS DADOS: ao responder qualquer pergunta sobre tarefas, blocos ou notas do usuário (ex.: "quais tarefas estão atrasadas?"), SEMPRE chame a ferramenta de listagem correspondente antes de responder e cite APENAS itens que vieram no resultado. NUNCA invente itens de exemplo. Se a lista vier vazia ou nada corresponder, diga claramente "não encontrei" — isso é uma resposta correta e suficiente.
- ATRASADA: o resultado de list_tasks traz o campo booleano "overdue" já calculado pelo sistema. Uma tarefa está atrasada SE E SOMENTE SE overdue = true. NUNCA calcule atraso comparando datas você mesmo — confie apenas no campo overdue. Se nenhuma tarefa tiver overdue = true, diga que não há tarefas atrasadas.
- NÃO DUPLIQUE: ao criar uma tarefa com horário (due_date com hora), o app já cria automaticamente o bloco no calendário — NÃO chame create_time_block para a mesma coisa. Antes de criar um bloco, se houver dúvida de que já existe, liste os blocos primeiro.
- DURAÇÃO DO BLOCO: end_time deve ficar no MESMO dia do start_time, exceto quando o período realmente cruza a meia-noite (ex.: dormir 23:00 → 07:00 do dia seguinte). Se início e fim são horários do mesmo dia (ex.: 00:00 às 07:00), o fim é NO MESMO dia — nunca some um dia ao fim nesse caso.
- Seja direta, calorosa e prática. Respostas curtas em português do Brasil. Confirme o que você efetivamente fez.`

// Remove sintaxe de tool call que o Llama às vezes vaza no texto (<function=...>...</function>)
function sanitizeOut(text: string): string {
  return text
    .replace(/<function[\s\S]*?<\/function>/gi, "")
    .replace(/<function=[^>]*>?/gi, "")
    .replace(/<\/?function[^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type Provider = "groq" | "gemini" | "anthropic"

interface ProviderConfig {
  provider: Provider
  apiKey: string
  model: string
}

function resolveProvider(): ProviderConfig | null {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    }
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    }
  }
  return null
}

// ---- Ferramentas (formato OpenAI/Groq) ----
const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: ["string", "null"], description: "Detalhes opcionais" },
          priority: { type: ["string", "null"], enum: ["low", "medium", "high", "urgent", null], description: "Prioridade (padrão medium)" },
          due_date: { type: ["string", "null"], description: "Data/hora limite em ISO 8601, opcional" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Lista as tarefas do usuário (id, título, status, prioridade, prazo).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Atualiza uma tarefa existente pelo id.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          title: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          status: { type: ["string", "null"], enum: ["pending", "in_progress", "completed", "cancelled", null] },
          priority: { type: ["string", "null"], enum: ["low", "medium", "high", "urgent", null] },
          due_date: { type: ["string", "null"], description: "ISO 8601" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Exclui uma tarefa pelo id.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_time_block",
      description: "Cria um bloco de tempo no calendário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          start_time: { type: "string", description: "Início em ISO 8601" },
          end_time: { type: "string", description: "Fim em ISO 8601" },
          description: { type: ["string", "null"] },
          color: { type: ["string", "null"], description: "Cor hex, ex #6366f1" },
        },
        required: ["title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_time_blocks",
      description: "Lista blocos de tempo do usuário a partir de hoje.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_time_block",
      description: "Exclui um bloco de tempo pelo id.",
      parameters: {
        type: "object",
        properties: { block_id: { type: "string" } },
        required: ["block_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Cria uma nota para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          content: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "Lista as notas do usuário (id, título, trecho do conteúdo).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "Atualiza uma nota existente pelo id.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string" },
          title: { type: ["string", "null"] },
          content: { type: ["string", "null"] },
        },
        required: ["note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Exclui uma nota pelo id.",
      parameters: {
        type: "object",
        properties: { note_id: { type: "string" } },
        required: ["note_id"],
      },
    },
  },
]

type ToolArgs = Record<string, unknown>

// Sufixo de fuso a partir do offset em minutos do getTimezoneOffset() (UTC-3 → 180 → "-03:00")
function tzSuffix(offsetMin: number): string {
  const sign = offsetMin > 0 ? "-" : "+"
  const abs = Math.abs(offsetMin)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  return `${sign}${hh}:${mm}`
}

// Normaliza um datetime: se vier "local" (sem Z/offset), anexa o fuso do usuário.
// Corrige o bug de horário local ser interpretado como UTC (deslocamento de fuso).
function normalizeDT(v: unknown, tzMin: number): unknown {
  if (typeof v !== "string") return v
  if (/[zZ]$/.test(v) || /[+-]\d{2}:?\d{2}$/.test(v)) return v // já tem fuso
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const s = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v + ":00" : v
    return s + tzSuffix(tzMin)
  }
  return v
}

// Normaliza título para comparação (minúsculas, sem acentos/pontuação)
function normTitle(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Títulos "iguais na prática" (pega erros de digitação tipo "manhã" vs "manhão")
function similarTitles(a: string, b: string): boolean {
  const na = normTitle(a)
  const nb = normTitle(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 6 && nb.length >= 6 && (na.includes(nb) || nb.includes(na))) return true
  return false
}

// Verifica choque de horário e proximidade (< 15 min) com outros blocos do mesmo dia
async function checkConflicts(
  supabase: SupabaseClient,
  blockId: string,
  startISO: string,
  endISO: string
): Promise<string | null> {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (isNaN(start) || isNaN(end)) return null
  const dayStart = new Date(startISO)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const { data } = await supabase
    .from("time_blocks")
    .select("title, start_time, end_time")
    .neq("id", blockId)
    .gte("start_time", dayStart.toISOString())
    .lt("start_time", dayEnd.toISOString())
  if (!data || data.length === 0) return null
  for (const b of data) {
    const bs = new Date(b.start_time).getTime()
    const be = new Date(b.end_time).getTime()
    if (start < be && end > bs) {
      return `⚠️ Esse horário choca com "${b.title}", que já está agendado. Quer ajustar?`
    }
  }
  const GAP = 15 * 60 * 1000
  for (const b of data) {
    const bs = new Date(b.start_time).getTime()
    const be = new Date(b.end_time).getTime()
    const gap = start >= be ? start - be : bs - end
    if (gap >= 0 && gap <= GAP) {
      return `Ficou bem colado a "${b.title}" (menos de 15 min de intervalo). Que tal um descanso entre os dois?`
    }
  }
  return null
}

// Lê o estado atual do usuário (para a IA ser proativa no briefing)
async function gatherContext(supabase: SupabaseClient, tzMin: number): Promise<string> {
  const local = new Date(Date.now() - tzMin * 60000)
  const today = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`
  const dayStart = new Date(Date.now())
  dayStart.setHours(0, 0, 0, 0)
  const in2 = new Date(dayStart)
  in2.setDate(in2.getDate() + 2)

  const [tasksR, blocksR, remR, favTR, favNR] = await Promise.all([
    supabase.from("tasks").select("title, priority").not("status", "in", "(completed,cancelled)").limit(15),
    supabase.from("time_blocks").select("title, start_time, end_time").gte("start_time", dayStart.toISOString()).lt("start_time", in2.toISOString()).order("start_time", { ascending: true }),
    supabase.from("reminders").select("content, remind_time").eq("remind_date", today),
    supabase.from("tasks").select("title").eq("is_favorite", true).limit(8),
    supabase.from("notes").select("title").eq("is_favorite", true).limit(8),
  ])

  const fmt = (iso: string) => {
    const loc = new Date(new Date(iso).getTime() - tzMin * 60000)
    return `${String(loc.getUTCHours()).padStart(2, "0")}:${String(loc.getUTCMinutes()).padStart(2, "0")}`
  }

  const lines: string[] = [`Hoje é ${today}.`]
  const blocks = blocksR.data ?? []
  if (blocks.length) {
    lines.push("Blocos no calendário (hoje/amanhã):")
    for (const b of blocks) lines.push(`- ${fmt(b.start_time)}–${fmt(b.end_time)} ${b.title}`)
  } else {
    lines.push("Nenhum bloco agendado para hoje/amanhã.")
  }
  const tasks = tasksR.data ?? []
  if (tasks.length) lines.push("Tarefas pendentes: " + tasks.map((t) => t.title).join(", "))
  const rem = remR.data ?? []
  if (rem.length) lines.push("Lembretes de hoje: " + rem.map((r) => `${r.remind_time ? r.remind_time.slice(0, 5) + " " : ""}${r.content}`).join("; "))
  const favs = [...(favTR.data ?? []).map((f) => f.title), ...(favNR.data ?? []).map((f) => f.title)].filter(Boolean)
  if (favs.length) lines.push("Favoritos do usuário (dê atenção): " + favs.join(", "))

  return lines.join("\n")
}

async function executeTool(
  name: string,
  args: ToolArgs,
  supabase: SupabaseClient,
  userId: string,
  tzMin: number
): Promise<unknown> {
  try {
    switch (name) {
      case "create_task": {
        const dueDate = normalizeDT(args.due_date, tzMin)
        // Anti-duplicação: tarefa pendente com título igual/parecido já existe → não recria
        const { data: existing } = await supabase
          .from("tasks")
          .select("id, title")
          .not("status", "in", "(completed,cancelled)")
          .limit(30)
        const dupTask = (existing ?? []).find((t) => similarTitles(t.title, String(args.title ?? "")))
        if (dupTask) {
          return { ok: true, created: dupTask, note: `Já existe uma tarefa igual/parecida ("${dupTask.title}") — não criei outra.` }
        }
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            status: "pending",
            priority: args.priority ?? "medium",
            due_date: dueDate ?? null,
          })
          .select("id, title")
          .single()
        if (error) return { ok: false, error: error.message }
        // Se a tarefa tem um horário específico, agenda também um bloco no calendário
        let scheduled = false
        let warning: string | null = null
        if (typeof dueDate === "string" && dueDate) {
          const timePart = dueDate.split("T")[1]
          const start = new Date(dueDate)
          if (timePart && !/^00:00(:00)?/.test(timePart) && !isNaN(start.getTime())) {
            const end = new Date(start.getTime() + 60 * 60 * 1000)
            const { data: block, error: blockErr } = await supabase
              .from("time_blocks")
              .insert({
                user_id: userId,
                title: args.title,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: "#6366f1",
                task_id: data.id,
              })
              .select("id")
              .single()
            if (!blockErr && block) {
              scheduled = true
              warning = await checkConflicts(supabase, block.id, start.toISOString(), end.toISOString())
            }
          }
        }
        return { ok: true, created: data, scheduled, warning }
      }
      case "list_tasks": {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, status, priority, due_date")
          .order("created_at", { ascending: false })
        if (error) return { ok: false, error: error.message }
        // overdue calculado aqui (determinístico) — o modelo NÃO deve comparar datas
        const now = Date.now()
        const tasks = (data ?? []).map((t) => ({
          ...t,
          overdue:
            t.status !== "completed" && t.status !== "cancelled" && !!t.due_date &&
            new Date(t.due_date).getTime() < now,
        }))
        return { ok: true, tasks }
      }
      case "update_task": {
        const patch: ToolArgs = {}
        for (const k of ["title", "description", "status", "priority", "due_date"]) {
          // ignora ausentes e null (não sobrescreve colunas obrigatórias com null)
          if (args[k] !== undefined && args[k] !== null) patch[k] = args[k]
        }
        if (patch.due_date) patch.due_date = normalizeDT(patch.due_date, tzMin)
        const { error } = await supabase.from("tasks").update(patch).eq("id", args.task_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      case "delete_task": {
        const { error } = await supabase.from("tasks").delete().eq("id", args.task_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      case "create_time_block": {
        const startT = normalizeDT(args.start_time, tzMin) as string
        let endT = normalizeDT(args.end_time, tzMin) as string
        // Trava determinística: o modelo às vezes soma um dia ao fim indevidamente.
        // Nenhum bloco pode durar mais de 24h; fim antes do início ganha +1 dia.
        {
          const s = new Date(startT)
          let e2 = new Date(endT)
          if (!isNaN(s.getTime()) && !isNaN(e2.getTime())) {
            while (e2.getTime() - s.getTime() > 24 * 3_600_000) e2 = new Date(e2.getTime() - 24 * 3_600_000)
            if (e2.getTime() <= s.getTime()) e2 = new Date(e2.getTime() + 24 * 3_600_000)
            endT = e2.toISOString()
          }
        }
        // Anti-duplicação: bloco de título igual/parecido no mesmo dia, sobrepondo
        // ou colado (< 45 min) → não recria (pega o caso "café da manhã"/"manhão")
        {
          const s = new Date(startT)
          const e2 = new Date(endT)
          const dayIni = new Date(s)
          dayIni.setHours(0, 0, 0, 0)
          const dayFim = new Date(dayIni)
          dayFim.setDate(dayFim.getDate() + 1)
          const { data: sameDay } = await supabase
            .from("time_blocks")
            .select("id, title, start_time, end_time")
            .gte("start_time", dayIni.toISOString())
            .lt("start_time", dayFim.toISOString())
          const GAP = 45 * 60 * 1000
          const dup = (sameDay ?? []).find((b) => {
            if (!similarTitles(b.title, String(args.title ?? ""))) return false
            const bs = new Date(b.start_time).getTime()
            const be = new Date(b.end_time).getTime()
            const overlap = s.getTime() < be && e2.getTime() > bs
            const gap = s.getTime() >= be ? s.getTime() - be : bs - e2.getTime()
            return overlap || (gap >= 0 && gap <= GAP)
          })
          if (dup) {
            return { ok: true, created: dup, note: `Já existe um bloco igual/parecido ("${dup.title}") nesse período — não criei outro.` }
          }
        }
        const { data, error } = await supabase
          .from("time_blocks")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            start_time: startT,
            end_time: endT,
            color: args.color ?? "#6366f1",
          })
          .select("id, title, start_time")
          .single()
        if (error) return { ok: false, error: error.message }
        const warning = await checkConflicts(supabase, data.id, startT, endT)
        return { ok: true, created: data, warning }
      }
      case "list_time_blocks": {
        const { data, error } = await supabase
          .from("time_blocks")
          .select("id, title, start_time, end_time")
          .gte("start_time", new Date(Date.now() - 86_400_000).toISOString())
          .order("start_time", { ascending: true })
        if (error) return { ok: false, error: error.message }
        return { ok: true, time_blocks: data }
      }
      case "delete_time_block": {
        const { error } = await supabase.from("time_blocks").delete().eq("id", args.block_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      case "create_note": {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: userId,
            title: args.title ?? "",
            content: args.content ?? "",
          })
          .select("id, title")
          .single()
        if (error) return { ok: false, error: error.message }
        return { ok: true, created: data }
      }
      case "list_notes": {
        const { data, error } = await supabase
          .from("notes")
          .select("id, title, content")
          .order("updated_at", { ascending: false })
        if (error) return { ok: false, error: error.message }
        const notes = (data ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          excerpt: (n.content ?? "").slice(0, 200),
        }))
        return { ok: true, notes }
      }
      case "update_note": {
        const patch: ToolArgs = {}
        for (const k of ["title", "content"]) {
          if (args[k] !== undefined && args[k] !== null) patch[k] = args[k]
        }
        patch.updated_at = new Date().toISOString()
        const { error } = await supabase.from("notes").update(patch).eq("id", args.note_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      case "delete_note": {
        const { error } = await supabase.from("notes").delete().eq("id", args.note_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      default:
        return { ok: false, error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao executar a ferramenta" }
  }
}

interface OpenAIToolCall {
  id: string
  function: { name: string; arguments: string }
}
interface OpenAIMessage {
  role: string
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

// Confirmação amigável por ferramenta executada
function confirm(name: string, args: ToolArgs, result: unknown): string {
  const r = result as { ok?: boolean; error?: string }
  if (!r?.ok) return `⚠️ Não consegui completar "${name}": ${r?.error ?? "erro desconhecido"}.`
  switch (name) {
    case "create_task": {
      const r2 = result as { scheduled?: boolean; warning?: string; note?: string }
      if (r2?.note) return `ℹ️ ${r2.note}`
      return `✅ Criei a tarefa "${args.title}"${r2?.scheduled ? " e agendei no calendário" : ""}.${r2?.warning ? " " + r2.warning : ""}`
    }
    case "create_time_block": {
      const r3 = result as { warning?: string; note?: string }
      if (r3?.note) return `ℹ️ ${r3.note}`
      return `✅ Agendei "${args.title}" no calendário.${r3?.warning ? " " + r3.warning : ""}`
    }
    case "update_task":
      return `✅ Atualizei a tarefa.`
    case "delete_task":
      return `✅ Excluí a tarefa.`
    case "delete_time_block":
      return `✅ Excluí o bloco do calendário.`
    case "create_note":
      return `✅ Criei a nota${args.title ? ` "${args.title}"` : ""}.`
    case "update_note":
      return `✅ Atualizei a nota.`
    case "delete_note":
      return `✅ Excluí a nota.`
    default:
      return `✅ Pronto (${name}).`
  }
}

// Recupera tool calls de um failed_generation do Groq/Llama e executa de verdade.
// Retorna uma mensagem de confirmação, ou null se nada pôde ser recuperado.
async function recoverFailedToolCalls(
  detail: string,
  supabase: SupabaseClient,
  userId: string,
  tzMin: number
): Promise<string | null> {
  let failedGen: string
  try {
    const parsed = JSON.parse(detail)
    failedGen = parsed?.error?.failed_generation ?? ""
  } catch {
    return null
  }
  if (!failedGen) return null

  // Formatos vistos: <function=NAME>{...}</function> e <function=NAME({...})</function>
  const regex = /<function=([a-zA-Z_]+)\s*>?\s*\(?\s*(\{[\s\S]*?\})\s*\)?\s*<\/function>/g
  const lines: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(failedGen)) !== null) {
    const [, name, jsonArgs] = match
    let args: ToolArgs = {}
    try {
      args = JSON.parse(jsonArgs)
    } catch {
      continue
    }
    const result = await executeTool(name, args, supabase, userId, tzMin)
    lines.push(confirm(name, args, result))
  }

  return lines.length > 0 ? lines.join("\n") : null
}

// Chamada ao Groq com retry automático em caso de rate limit (429)
async function groqChat(cfg: ProviderConfig, payload: Record<string, unknown>): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, temperature: 0, ...payload }),
    })

    if (res.status !== 429) return res

    // Lê o tempo sugerido pelo Groq e espera (limitado a 10s)
    const detail = await res.clone().text().catch(() => "")
    const m = detail.match(/try again in ([\d.]+)s/)
    const waitMs = Math.min(10_000, Math.ceil((m ? parseFloat(m[1]) : 3) * 1000) + 300)
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    return res // esgotou as tentativas
  }
  // inalcançável, mas o TS exige
  return new Response("", { status: 500 })
}

// Loop agêntico para provedores compatíveis com OpenAI (Groq)
async function runOpenAIAgent(
  cfg: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  supabase: SupabaseClient,
  userId: string,
  tzMin: number
): Promise<string> {
  const convo: OpenAIMessage[] = [
    { role: "system", content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  for (let i = 0; i < 4; i++) {
    const res = await groqChat(cfg, {
      messages: convo,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 800,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      // Rede de segurança: o Llama às vezes gera o tool call num formato que o
      // parser do Groq rejeita (tool_use_failed). Recuperamos a intenção do
      // failed_generation, executamos de verdade e confirmamos.
      const recovered = await recoverFailedToolCalls(detail, supabase, userId, tzMin)
      if (recovered) return recovered
      if (res.status === 429) {
        return "__RATE_LIMIT__"
      }
      throw new Error(`Groq ${res.status}: ${detail}`)
    }

    const data = await res.json()
    const msg: OpenAIMessage = data.choices?.[0]?.message ?? { role: "assistant", content: "" }
    convo.push(msg)

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        let parsed: ToolArgs = {}
        try {
          parsed = JSON.parse(call.function.arguments || "{}")
        } catch {
          parsed = {}
        }
        const result = await executeTool(call.function.name, parsed, supabase, userId, tzMin)
        console.log(
          `[neuro-ia] tool=${call.function.name} args=${JSON.stringify(parsed)} result=${JSON.stringify(result)}`
        )
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
      continue // deixa o modelo reagir aos resultados
    }

    return msg.content ?? "Pronto."
  }

  // Esgotou as iterações: força uma resposta de texto (sem mais ferramentas)
  // resumindo o que foi feito com base nos resultados já no histórico.
  try {
    const res = await groqChat(cfg, {
      messages: [
        ...convo,
        {
          role: "user",
          content:
            "Resuma para mim, em uma ou duas frases, o que você efetivamente conseguiu fazer com base nos resultados das ferramentas acima. Não chame mais ferramentas.",
        },
      ],
      tool_choice: "none",
      max_tokens: 300,
    })
    if (res.ok) {
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (text) return text
    }
  } catch {
    /* cai no fallback abaixo */
  }

  return "Tentei executar as ações, mas algo deu errado. Confira o resultado e tente novamente."
}

// Streaming simples de texto (Gemini / Anthropic — sem ferramentas por enquanto)
async function streamText(
  cfg: ProviderConfig,
  system: string,
  messages: ChatMessage[]
): Promise<Response> {
  let upstream: Response
  let extract: (e: unknown) => string | null

  if (cfg.provider === "gemini") {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:streamGenerateContent?alt=sse&key=${cfg.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      }
    )
    extract = (e) => {
      const ev = e as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      return ev.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    }
  } else {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: 2048, stream: true, system, messages }),
    })
    extract = (e) => {
      const ev = e as { type?: string; delta?: { type?: string; text?: string } }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") return ev.delta.text ?? null
      return null
    }
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "")
    return new Response(`Erro ao falar com a IA (${cfg.provider}). ${detail}`.trim(), {
      status: upstream.status || 502,
    })
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  let buffer = ""

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === "[DONE]") continue
        try {
          const text = extract(JSON.parse(payload))
          if (text) controller.enqueue(encoder.encode(text))
        } catch {
          /* ignora */
        }
      }
    },
    cancel() {
      reader.cancel()
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  const cfg = resolveProvider()
  if (!cfg) {
    return new Response(
      "A Neuro IA ainda não está configurada. Adicione GROQ_API_KEY (grátis em console.groq.com) ou GEMINI_API_KEY (grátis em aistudio.google.com) ao .env.local e reinicie o servidor.",
      { status: 503 }
    )
  }

  let body: { messages?: ChatMessage[]; dayNotes?: string; now?: string; mode?: string; tz?: number }
  try {
    body = await req.json()
  } catch {
    return new Response("Requisição inválida", { status: 400 })
  }

  let messages = (body.messages ?? []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  )

  let system = BASE_PROMPT
  if (body.now) {
    system += `\n\nData e hora atuais do usuário: ${body.now}. Use isso para resolver "hoje", "amanhã", horários, etc. Sempre forneça datas em ISO 8601.`
  }
  if (body.dayNotes?.trim()) {
    system += `\n\nAnotações do dia do usuário:\n"""\n${body.dayNotes.trim()}\n"""`
  }
  if (body.mode === "voice") {
    system += `\n\nMODO VOZ (conversa falada em tempo real): responda de forma curta, natural e conversacional, como uma pessoa falando. Em geral 1 a 3 frases. Evite listas longas, markdown, asteriscos, emojis e símbolos — o texto será lido em voz alta. Se precisar destacar um conceito, cite no máximo 3 pontos-chave bem curtos, em frases simples.`
  }
  if (body.mode === "briefing") {
    const ctx = await gatherContext(supabase, body.tz ?? 0)
    system += `\n\nCONTEXTO ATUAL DO USUÁRIO (leia com atenção antes de responder):\n"""\n${ctx}\n"""`
    system += `\n\nEste é o INÍCIO da conversa. Cumprimente o usuário e faça um briefing curto e PROATIVO do dia: aponte conflitos e intervalos curtos entre os blocos, dê 1 ou 2 dicas úteis (energia, sono, preparação, foco) e, se fizer sentido, PROPONHA (com confirmação) uma tarefa de preparação. Termine oferecendo ajuda. Seja calorosa, natural e concisa. Responda em texto normal (sem markdown pesado).`
    messages = [{ role: "user", content: "Oi! Me dê as boas-vindas e um panorama do meu dia." }]
  }

  if (messages.length === 0) return new Response("Envie ao menos uma mensagem", { status: 400 })

  // Groq → loop com ferramentas (cria/edita/exclui de verdade)
  if (cfg.provider === "groq") {
    try {
      // Briefing: chamada única SEM ferramentas (o contexto já foi injetado) —
      // economiza muitos tokens do limite gratuito por minuto.
      if (body.mode === "briefing") {
        const res = await groqChat(cfg, {
          messages: [{ role: "system", content: system }, ...messages],
          max_tokens: 500,
        })
        if (!res.ok) {
          if (res.status === 429) {
            return new Response("__RATE_LIMIT__", {
              headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
            })
          }
          throw new Error(`Groq ${res.status}`)
        }
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content ?? "Olá! Como posso ajudar você hoje?"
        return new Response(sanitizeOut(text), {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        })
      }

      const finalText = await runOpenAIAgent(cfg, system, messages, supabase, user.id, body.tz ?? 0)
      return new Response(sanitizeOut(finalText), {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      })
    } catch (e) {
      return new Response(
        `Erro ao falar com a IA (groq). ${e instanceof Error ? e.message : ""}`.trim(),
        { status: 502 }
      )
    }
  }

  // Gemini / Anthropic → chat em streaming (sem ferramentas por enquanto)
  return streamText(cfg, system, messages)
}
