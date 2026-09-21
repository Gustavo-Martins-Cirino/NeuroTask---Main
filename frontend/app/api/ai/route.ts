import { dicionario, type Dicionario, type Idioma } from "@/lib/i18n"
import { instrucaoDeIdioma, pedidoDeResumo } from "@/lib/ia-idioma"
import { recibo, FERRAMENTAS_QUE_ESCREVEM, type AcaoExecutada } from "@/lib/ia-recibo"
import { ocorrenciasNaJanela, linhasDaAgenda, inicioDoDia } from "@/lib/ia-agenda"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { planejarDeTrasPraFrente } from "@/lib/backward-plan"
import { descreveAgora, sufixoDeFuso } from "@/lib/ia-agora"
import { ehDuplicata, ehMesmoTitulo } from "@/lib/ia-duplicata"

export const runtime = "nodejs"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

// As instruções são em português porque foi assim que foram escritas e afinadas
// — e não porque a resposta precise ser. O idioma da RESPOSTA entra no fim, por
// `instrucaoDeIdioma`, com o que o cliente mandou (ver lib/ia-idioma).
const BASE_PROMPT = `Você é a Neuro IA, assistente de produtividade do NeuroTask (tarefas, time blocking, gamificação). Direta, calorosa, respostas curtas.

AGENDA: a seção "AGENDA" abaixo traz os dados REAIS do usuário e cobre HOJE E AMANHÃ. Para perguntas dentro dessa janela, responda direto por ela, SEM chamar ferramentas de listagem. Para qualquer coisa ALÉM dela — "esta semana", "este mês", "dia 15", "que compromissos eu tenho" —, chame list_time_blocks antes de responder: a agenda abaixo NÃO tem esses dias, e responder por ela seria dizer que não há nada. Nunca invente itens; se não houver, diga "não encontrei". Atrasada = somente o que estiver listado como atrasado (nunca calcule por datas). Seja proativa: aponte conflitos e intervalos curtos que vir na agenda.

AÇÕES (ferramentas de criar/listar/editar/excluir tarefas, blocos e notas):
- Proponha e pergunte "Posso confirmar?" ANTES de criar/editar/excluir; só aja após "sim" explícito.
- EXCEÇÃO: se a pessoa já disse "pode criar direto", "sem confirmar", "não precisa perguntar" ou equivalente, não pergunte — execute de uma vez. O pedido dela vale para a conversa toda, não só para a mensagem em que foi dito.
- Na pergunta de confirmação, escreva SEMPRE o dd/mm e o horário, sem o nome do dia da semana. "Posso criar na segunda?" esconde a data; "Posso criar dia 21/09 às 18h?" deixa o erro à vista antes de ele virar bloco. Nunca diga que fez sem chamar a ferramenta; nunca escreva sintaxe de ferramenta no texto.
- Desabafo ("estou cansado") não vira tarefa — apenas converse. Na dúvida (fala solta, transcrição estranha), pergunte.
- Editar/excluir: chame list_time_blocks antes para obter o id — ele vem entre colchetes em cada linha. NUNCA peça o id ao usuário: ele não aparece em lugar nenhum da tela, e pedi-lo trava a conversa. Para mudar horário de um bloco use update_time_block, nunca apagar e recriar.
- Tarefa com horário: coloque a hora no due_date (ISO 8601) — o app cria o bloco no calendário sozinho; NÃO chame create_time_block para a mesma coisa.
- Datas: respeite o dia dito ("hoje" é hoje, mesmo que a hora já tenha passado). Hora ambígua (manhã ou noite)? Pergunte antes. end_time no MESMO dia do start_time, salvo cruzar a meia-noite. Ao falar, use datas naturais ("amanhã das 8h às 9h"), nunca ISO.
- Planejar a partir de um compromisso: plan_day_backwards (confirm=false propõe; após o sim, repita com os MESMOS argumentos e confirm=true). Nunca calcule a cadeia você mesmo nem crie os blocos um a um.
- Repasse ao usuário qualquer warning/note retornado (conflito, duplicata, proximidade).

Exemplos destas instruções são ilustrativos — nunca os trate como dados do usuário.`

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
      // `-latest` de propósito: foi um modelo FIXO (gemini-2.0-flash) sendo
      // desativado pelo Google que derrubou a Neuro em 19/09/2026 — e o erro
      // aparecia como JSON cru na tela de quem usa. Alias não morre assim.
      //
      // Escolhido medindo, e não pelo nome: com esta chave, `gemini-2.5-flash`
      // e `-flash-lite` respondem 404 ("no longer available to new users"),
      // `gemini-flash-latest` oscilou (503 por 39s) e `gemini-3-flash-preview`
      // levou 23s. O `flash-lite-latest` deu 5/5 entre 450ms e 820ms.
      model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
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
          start_time: { type: "string", description: "Início da PRIMEIRA ocorrência, ISO 8601" },
          end_time: { type: "string", description: "Fim da primeira ocorrência, ISO 8601" },
          description: { type: ["string", "null"] },
          color: { type: ["string", "null"], description: "Cor hex, ex #6366f1" },
          recurrence_rule: {
            type: ["string", "null"],
            enum: ["daily", "weekly", "weekdays", null],
            description:
              "Repetição. 'de segunda a sexta'/'dias úteis' → weekdays. 'todo dia' → daily. 'toda terça'/'semanalmente' (um dia só) → weekly. Sem isto, acontece uma vez só. weekly cai só no dia da primeira ocorrência: pedido com VÁRIOS dias nunca é weekly.",
          },
        },
        required: ["title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_time_blocks",
      description:
        "Lista os blocos de tempo do usuário numa janela de dias, JÁ no fuso dele e com os recorrentes expandidos (um item por ocorrência). É a única forma de enxergar além de hoje e amanhã. Para um dia só, passe o mesmo valor em from e to. Sem argumentos, cobre de hoje a daqui a 7 dias.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Primeiro dia da janela, AAAA-MM-DD (inclusive)" },
          to: { type: "string", description: "Último dia da janela, AAAA-MM-DD (inclusive)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_time_block",
      description:
        "Altera um bloco que já existe (horário, título, cor, repetição). Para mudar, use esta — nunca apagar e recriar. O id vem entre colchetes na listagem; sem ele, chame list_time_blocks. NUNCA peça o id ao usuário: não aparece na tela.",
      parameters: {
        type: "object",
        properties: {
          block_id: { type: "string" },
          title: { type: ["string", "null"] },
          start_time: { type: ["string", "null"], description: "Novo início, ISO 8601" },
          end_time: { type: ["string", "null"], description: "Novo fim, ISO 8601" },
          description: { type: ["string", "null"] },
          color: { type: ["string", "null"] },
          recurrence_rule: {
            type: ["string", "null"],
            enum: ["daily", "weekly", "weekdays", null],
            description: "Mesmas regras do create_time_block. `null` vira avulso.",
          },
        },
        required: ["block_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_time_block",
      description: "Exclui um bloco pelo id (o que vem entre colchetes na listagem).",
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
      name: "plan_day_backwards",
      description:
        "Planeja de trás pra frente a partir de um compromisso-âncora (o sistema calcula sono/preparo/refeição/deslocamento). confirm=false só propõe; confirm=true (após o sim do usuário, mesmos argumentos) cria os blocos.",
      parameters: {
        type: "object",
        properties: {
          anchor_title: { type: "string", description: "Nome do compromisso, como o usuário disse" },
          anchor_start: { type: "string", description: "Início ISO 8601 com hora" },
          anchor_end: { type: ["string", "null"], description: "Fim ISO 8601 (opcional)" },
          confirm: { type: "boolean" },
        },
        required: ["anchor_title", "anchor_start", "confirm"],
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

// A comparação de títulos mudou de casa: virou `ehMesmoTitulo`, em
// lib/ia-duplicata, com teste. Aqui ela era só uma continência de seis
// caracteres, e transformava toda especialização em duplicata.

// Formata hora local do usuário (o servidor pode estar em UTC)
function fmtHM(d: Date, tzMin: number): string {
  const loc = new Date(d.getTime() - tzMin * 60_000)
  return `${String(loc.getUTCHours()).padStart(2, "0")}:${String(loc.getUTCMinutes()).padStart(2, "0")}`
}
function fmtDM(d: Date, tzMin: number): string {
  const loc = new Date(d.getTime() - tzMin * 60_000)
  return `${String(loc.getUTCDate()).padStart(2, "0")}/${String(loc.getUTCMonth() + 1).padStart(2, "0")}`
}

// Bloco de título igual/parecido no mesmo dia, sobrepondo ou colado (< 45 min)
async function findSimilarSameDay(
  supabase: SupabaseClient,
  title: string,
  start: Date,
  end: Date
): Promise<{ id: string; title: string } | null> {
  const dayIni = new Date(start)
  dayIni.setHours(0, 0, 0, 0)
  const dayFim = new Date(dayIni)
  dayFim.setDate(dayFim.getDate() + 1)
  const { data: sameDay } = await supabase
    .from("time_blocks")
    .select("id, title, start_time, end_time")
    .gte("start_time", dayIni.toISOString())
    .lt("start_time", dayFim.toISOString())
  const GAP = 45 * 60 * 1000
  return (
    (sameDay ?? []).find((b) => {
      if (!ehMesmoTitulo(b.title, title)) return false
      const bs = new Date(b.start_time).getTime()
      const be = new Date(b.end_time).getTime()
      const overlap = start.getTime() < be && end.getTime() > bs
      const gap = start.getTime() >= be ? start.getTime() - be : bs - end.getTime()
      return overlap || (gap >= 0 && gap <= GAP)
    }) ?? null
  )
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

// Briefing do dia 100% DETERMINÍSTICO — zero chamada de IA: sem alucinação,
// sem gastar limite de tokens. A "voz" da Neuro é montada por template a
// partir dos dados reais do usuário.
async function buildBriefing(supabase: SupabaseClient, tzMin: number): Promise<string> {
  const nowLoc = new Date(Date.now() - tzMin * 60_000)
  const y = nowLoc.getUTCFullYear()
  const mo = nowLoc.getUTCMonth()
  const d = nowLoc.getUTCDate()
  const h = nowLoc.getUTCHours()
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
  const todayKey = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  // meia-noite local do usuário em tempo real (epoch)
  const dayStart = new Date(Date.UTC(y, mo, d) + tzMin * 60_000)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const twoDays = new Date(dayStart.getTime() + 48 * 3_600_000)

  const [blocksR, tasksR, remR] = await Promise.all([
    supabase
      .from("time_blocks")
      .select("title, start_time, end_time, is_recurring, recurrence_rule")
      .lt("start_time", twoDays.toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("tasks").select("title, due_date").not("status", "in", "(completed,cancelled)").limit(30),
    supabase.from("reminders").select("content, remind_time").eq("remind_date", todayKey),
  ])

  const blocks = blocksR.data ?? []
  const todayBlocks = blocks.filter((b) => new Date(b.start_time).getTime() < dayEnd.getTime())
  const tomorrowBlocks = blocks.filter((b) => new Date(b.start_time).getTime() >= dayEnd.getTime())

  const out: string[] = [`${greet}! Aqui está o panorama do seu dia:`]

  if (todayBlocks.length === 0) {
    out.push("Sua agenda de hoje está livre — bom momento para planejar blocos de foco.")
  } else {
    out.push(
      todayBlocks
        .map((b) => `• ${fmtHM(new Date(b.start_time), tzMin)}–${fmtHM(new Date(b.end_time), tzMin)} ${b.title}`)
        .join("\n")
    )
    // intervalos curtos e sobreposições (regras, não IA)
    for (let i = 0; i < todayBlocks.length - 1; i++) {
      const aEnd = new Date(todayBlocks[i].end_time).getTime()
      const bStart = new Date(todayBlocks[i + 1].start_time).getTime()
      const gapMin = Math.round((bStart - aEnd) / 60_000)
      if (bStart < aEnd) {
        out.push(`⚠️ "${todayBlocks[i].title}" e "${todayBlocks[i + 1].title}" estão sobrepostos — vale ajustar.`)
      } else if (gapMin >= 0 && gapMin < 30) {
        out.push(`⚠️ Só ${gapMin} min entre "${todayBlocks[i].title}" e "${todayBlocks[i + 1].title}" — respire um pouco entre eles.`)
      }
    }
  }

  const overdue = (tasksR.data ?? []).filter((t) => t.due_date && new Date(t.due_date).getTime() < Date.now())
  if (overdue.length > 0) {
    const names = overdue.slice(0, 3).map((t) => `"${t.title}"`).join(", ")
    out.push(`📌 ${overdue.length === 1 ? "1 tarefa atrasada" : `${overdue.length} tarefas atrasadas`}: ${names}${overdue.length > 3 ? "…" : ""}.`)
  }

  const rem = remR.data ?? []
  if (rem.length > 0) {
    out.push(
      `🔔 Lembretes de hoje: ${rem
        .map((r) => `${r.remind_time ? r.remind_time.slice(0, 5) + " " : ""}${r.content}`)
        .join("; ")}.`
    )
  }

  if (tomorrowBlocks.length > 0) {
    const first = tomorrowBlocks[0]
    out.push(`Amanhã cedo: ${fmtHM(new Date(first.start_time), tzMin)} ${first.title}.`)
  }

  out.push("Precisa de algo? Posso criar tarefas, agendar blocos ou planejar seu dia a partir de um compromisso.")
  return out.join("\n\n")
}

// Agenda compacta injetada em TODA conversa: perguntas sobre o dia são
// respondidas em 1 chamada, sem rodadas extras de ferramentas (economia grande
// de tokens) e sem risco de alucinação.
async function buildDayContext(supabase: SupabaseClient, tzMin: number): Promise<string> {
  const nowLoc = new Date(Date.now() - tzMin * 60_000)
  const y = nowLoc.getUTCFullYear()
  const mo = nowLoc.getUTCMonth()
  const d = nowLoc.getUTCDate()
  const todayKey = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  const dayStart = new Date(Date.UTC(y, mo, d) + tzMin * 60_000)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const twoDays = new Date(dayStart.getTime() + 48 * 3_600_000)

  const [blocksR, tasksR, remR] = await Promise.all([
    supabase
      .from("time_blocks")
      .select("title, start_time, end_time, is_recurring, recurrence_rule")
      .lt("start_time", twoDays.toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("tasks").select("title, due_date").not("status", "in", "(completed,cancelled)").limit(20),
    supabase.from("reminders").select("content, remind_time").eq("remind_date", todayKey),
  ])

  // Expande os recorrentes aqui também: a seção de hoje/amanhã tinha o mesmo
  // buraco da ferramenta, e por isso o Jiu Jitsu de toda quarta não aparecia.
  const ocorrencias = ocorrenciasNaJanela(blocksR.data ?? [], dayStart.getTime(), twoDays.getTime(), tzMin)
  const hoje = ocorrencias.filter((o) => o.inicio < dayEnd.getTime())
  const amanha = ocorrencias.filter((o) => o.inicio >= dayEnd.getTime())
  const tasks = tasksR.data ?? []
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date).getTime() < Date.now())
  const rem = remR.data ?? []
  const fb = (o: { titulo: string; inicio: number; fim: number; regra: string | null }) =>
    `${fmtHM(new Date(o.inicio), tzMin)}-${fmtHM(new Date(o.fim), tzMin)} ${o.titulo}${o.regra ? " (repete)" : ""}`

  // O cabeçalho diz a JANELA em voz alta. Sem isso o modelo tratava esta seção
  // como "a agenda inteira" e respondia "não tem nada" para o mês — que é o
  // pior jeito de errar, porque soa como resposta e não como limitação.
  const parts = [
    `AGENDA (dados reais · hoje ${todayKey}, agora ${fmtHM(new Date(), tzMin)}).`,
    `ATENÇÃO: esta seção cobre SÓ hoje e amanhã. Para outros dias, chame list_time_blocks.`,
  ]
  parts.push(`Blocos hoje: ${hoje.length ? hoje.map(fb).join("; ") : "nenhum"}`)
  if (amanha.length) parts.push(`Blocos amanhã: ${amanha.map(fb).join("; ")}`)
  parts.push(`Tarefas pendentes (${tasks.length}): ${tasks.slice(0, 12).map((t) => t.title).join(", ") || "nenhuma"}`)
  if (overdue.length) parts.push(`Atrasadas: ${overdue.slice(0, 6).map((t) => t.title).join(", ")}`)
  if (rem.length)
    parts.push(
      `Lembretes hoje: ${rem.map((r) => `${r.remind_time ? r.remind_time.slice(0, 5) + " " : ""}${r.content}`).join("; ")}`
    )
  return parts.join("\n")
}

async function executeTool(
  name: string,
  args: ToolArgs,
  supabase: SupabaseClient,
  userId: string,
  tzMin: number,
  idioma: Idioma = "pt"
): Promise<unknown> {
  const t = dicionario(idioma).ia
  try {
    switch (name) {
      case "create_task": {
        const dueDate = normalizeDT(args.due_date, tzMin)
        // Anti-duplicação: mesma tarefa, no mesmo DIA. A regra antiga comparava
        // só o título e por CONTINÊNCIA, então existindo "Estudar three.js"
        // pedir "Estudar" era recusado — e "Academia" de terça bloqueava a de
        // quinta. Na dúvida, cria: ver lib/ia-duplicata.
        const { data: existing } = await supabase
          .from("tasks")
          .select("id, title, due_date")
          .not("status", "in", "(completed,cancelled)")
          .limit(50)
        const nova = { title: args.title, due_date: dueDate }
        const dupTask = (existing ?? []).find((t) => ehDuplicata(nova, t, tzMin))
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
        // Anti-duplicação (pega o caso "café da manhã"/"manhão")
        {
          const dup = await findSimilarSameDay(supabase, String(args.title ?? ""), new Date(startT), new Date(endT))
          if (dup) {
            return { ok: true, created: dup, note: `Já existe um bloco igual/parecido ("${dup.title}") nesse período — não criei outro.` }
          }
        }
        // Só as três regras que o app sabe expandir. Qualquer outra coisa vira
        // bloco avulso — e é melhor assim que gravar uma regra que o calendário
        // não entende e ninguém vê.
        const regraPedida = typeof args.recurrence_rule === "string" ? args.recurrence_rule : null
        const regra = ["daily", "weekly", "weekdays"].includes(regraPedida ?? "") ? regraPedida : null

        const { data, error } = await supabase
          .from("time_blocks")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            start_time: startT,
            end_time: endT,
            color: args.color ?? "#6366f1",
            // "toda terça" virava um bloco só, calado (relatório de 21/09).
            // `is_recurring` anda junto da regra: é o par que o calendário e o
            // `lib/ia-agenda` leem para expandir as ocorrências.
            recurrence_rule: regra,
            is_recurring: regra !== null,
          })
          .select("id, title, start_time")
          .single()
        if (error) return { ok: false, error: error.message }
        const warning = await checkConflicts(supabase, data.id, startT, endT)
        return { ok: true, created: data, warning, recurrence_rule: regra }
      }
      case "list_time_blocks": {
        // A janela é do DIA de quem usa, não do relógio do servidor: pedir
        // "26/09" tem de trazer o 26/09 dele. O relatório registrou um dia com
        // 8 blocos respondido como "não encontrei nenhum".
        const deChave = typeof args.from === "string" ? args.from : null
        const ateChave = typeof args.to === "string" ? args.to : null
        const hoje0 = inicioDoDia(Date.now(), tzMin)
        const de = deChave ? Date.parse(`${deChave}T00:00:00${sufixoDeFuso(tzMin)}`) : hoje0
        const ate = ateChave
          ? Date.parse(`${ateChave}T00:00:00${sufixoDeFuso(tzMin)}`) + 86_400_000
          : hoje0 + 8 * 86_400_000
        if (!Number.isFinite(de) || !Number.isFinite(ate)) {
          return { ok: false, error: "from/to devem ser AAAA-MM-DD" }
        }

        // Duas coisas de uma vez: os recorrentes de QUALQUER idade (um que
        // começou meses atrás continua valendo hoje — foi assim que Jiu Jitsu,
        // Trabalho e Faculdade sumiram da resposta) e os avulsos que encostam
        // na janela. Sem o `or`, buscar séries antigas puxaria o histórico
        // inteiro de quem usa o app há tempo.
        const { data, error } = await supabase
          .from("time_blocks")
          .select("id, title, start_time, end_time, is_recurring, recurrence_rule")
          .lt("start_time", new Date(ate).toISOString())
          .or(`is_recurring.eq.true,start_time.gte.${new Date(de - 86_400_000).toISOString()}`)
          .order("start_time", { ascending: true })
        if (error) return { ok: false, error: error.message }

        const ocorrencias = ocorrenciasNaJanela(data ?? [], de, ate, tzMin)
        return {
          ok: true,
          // Texto, e não linha de banco: o modelo lia ISO em UTC e repetia o
          // horário errado com toda a confiança do mundo.
          agenda: linhasDaAgenda(ocorrencias, tzMin, t.recibo.diasDaSemana, t.agenda),
          quantos: ocorrencias.length,
        }
      }
      case "update_time_block": {
        if (typeof args.block_id !== "string" || !args.block_id) {
          return { ok: false, error: "block_id é obrigatório — chame list_time_blocks para obtê-lo" }
        }
        // Só o que veio muda. Campo ausente fica como está, e é isso que separa
        // "adiar para as 15h" de "recriar o bloco do zero perdendo o resto".
        const mudanca: Record<string, unknown> = {}
        if (typeof args.title === "string") mudanca.title = args.title
        if (typeof args.description === "string") mudanca.description = args.description
        if (typeof args.color === "string") mudanca.color = args.color
        const novoInicio = args.start_time ? normalizeDT(args.start_time, tzMin) : null
        const novoFim = args.end_time ? normalizeDT(args.end_time, tzMin) : null
        if (typeof novoInicio === "string") mudanca.start_time = novoInicio
        if (typeof novoFim === "string") mudanca.end_time = novoFim
        if ("recurrence_rule" in args) {
          const r = typeof args.recurrence_rule === "string" ? args.recurrence_rule : null
          const valida = ["daily", "weekly", "weekdays"].includes(r ?? "") ? r : null
          mudanca.recurrence_rule = valida
          mudanca.is_recurring = valida !== null
        }
        if (Object.keys(mudanca).length === 0) {
          return { ok: false, error: "nada para mudar — diga o que muda (horário, título, cor ou repetição)" }
        }

        const { data, error } = await supabase
          .from("time_blocks")
          .update(mudanca)
          .eq("id", args.block_id)
          .select("id, title, start_time, end_time, recurrence_rule")
          .maybeSingle()
        if (error) return { ok: false, error: error.message }
        // `maybeSingle` sem linha quer dizer id que não é dele (ou não existe):
        // a RLS filtra por dono, então "não achei" é a resposta honesta.
        if (!data) return { ok: false, error: "não achei esse bloco" }

        const warning = await checkConflicts(supabase, data.id, data.start_time, data.end_time)
        return { ok: true, created: data, warning, recurrence_rule: data.recurrence_rule ?? null }
      }
      case "delete_time_block": {
        const { error } = await supabase.from("time_blocks").delete().eq("id", args.block_id)
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }
      case "plan_day_backwards": {
        const anchorTitle = String(args.anchor_title ?? "Compromisso")
        const anchorStart = new Date(normalizeDT(args.anchor_start, tzMin) as string)
        if (isNaN(anchorStart.getTime())) return { ok: false, error: "anchor_start inválido (use ISO 8601 com hora)" }
        let anchorEnd = args.anchor_end
          ? new Date(normalizeDT(args.anchor_end, tzMin) as string)
          : new Date(anchorStart.getTime() + 3_600_000)
        if (isNaN(anchorEnd.getTime()) || anchorEnd.getTime() <= anchorStart.getTime()) {
          anchorEnd = new Date(anchorStart.getTime() + 3_600_000)
        }

        // Rotina do usuário (atividades nomeadas + sono desejado)
        const [{ data: actsRaw }, { data: prof }] = await Promise.all([
          supabase.from("routine_activities").select("name, category, duration_minutes"),
          supabase.from("routine_profile").select("sleep_hours").maybeSingle(),
        ])
        // A cadeia é calculada por regra em lib/backward-plan.ts (puro e
        // testado) — o modelo só extrai o compromisso-âncora.
        const { plan, wake, sleepStart, notes } = planejarDeTrasPraFrente({
          anchorTitle,
          anchorStart,
          anchorEnd,
          atividades: actsRaw ?? [],
          sleepHours: Number(prof?.sleep_hours ?? 8),
        })

        const proposal = plan.map(
          (p) => `${fmtDM(p.start, tzMin)} ${fmtHM(p.start, tzMin)}–${fmtHM(p.end, tzMin)} · ${p.title}`
        )
        if (sleepStart.getTime() < Date.now() && !args.confirm) {
          notes.push(`O horário ideal de deitar (${fmtHM(sleepStart, tzMin)}) já passou — vale dormir assim que possível.`)
        }

        if (!args.confirm) {
          return {
            ok: true,
            proposal,
            wake_time: fmtHM(wake, tzMin),
            sleep_time: fmtHM(sleepStart, tzMin),
            notes,
            instruction: "Apresente a proposta e pergunte se pode confirmar. NÃO crie nada ainda.",
          }
        }

        // confirm=true → cria os blocos (pulando o que já existir parecido)
        let created = 0
        const skipped: string[] = []
        for (const p of plan) {
          const dup = await findSimilarSameDay(supabase, p.title, p.start, p.end)
          if (dup) {
            skipped.push(p.title)
            continue
          }
          const { error } = await supabase.from("time_blocks").insert({
            user_id: userId,
            title: p.title,
            start_time: p.start.toISOString(),
            end_time: p.end.toISOString(),
            color: p.color,
          })
          if (!error) created++
        }
        return {
          ok: true,
          created,
          skipped_existing: skipped,
          proposal,
        }
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
    case "plan_day_backwards": {
      const r4 = result as { created?: number; proposal?: string[] }
      if (typeof r4?.created === "number") return `✅ Plano criado: ${r4.created} bloco(s) no calendário.`
      return `📋 Proposta de plano:\n${(r4?.proposal ?? []).join("\n")}\nPosso confirmar?`
    }
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
  tzMin: number,
  idioma: Idioma
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
    const result = await executeTool(name, args, supabase, userId, tzMin, idioma)
    lines.push(confirm(name, args, result))
  }

  return lines.length > 0 ? lines.join("\n") : null
}

// Chamada ao Groq com retry automático em caso de rate limit (429)
/**
 * Até quanto vale esperar um 429 antes de cair no reserva.
 *
 * Dois segundos é o que uma pessoa aguenta sem achar que travou. Acima disso a
 * espera não paga: o balde de tokens leva o minuto inteiro para encher, e
 * segurar a resposta não o enche mais rápido.
 */
const ESPERA_MAXIMA_MS = 2_000

async function groqChat(cfg: ProviderConfig, payload: Record<string, unknown>): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        // gpt-oss é modelo de raciocínio: esforço baixo = resposta/tool call
        // rápida sem gastar o teto de tokens "pensando"
        ...(cfg.model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        ...payload,
      }),
    })

    if (res.status !== 429) return res

    // 429 aqui é teto de TOKENS POR MINUTO, e insistir é o pior remédio: cada
    // tentativa reenvia o prompt inteiro (~2.500 tokens) contra um teto de
    // 8.000/min. Em 20/09/2026 isso deixou quem testava esperando 8,7s por
    // resposta e preso no modo de reserva por cinco minutos.
    //
    // Então: só uma nova tentativa, e só se o próprio Groq disser que a espera
    // é curta. Se for longa, ceder agora é melhor que segurar a pessoa olhando
    // para a tela — o reserva responde, e a mensagem seguinte tenta o principal
    // de novo com o balde já recomposto.
    const detail = await res.clone().text().catch(() => "")
    const m = detail.match(/try again in ([\d.]+)s/)
    const esperaMs = Math.ceil((m ? parseFloat(m[1]) : 30) * 1000) + 200
    if (attempt === 0 && esperaMs <= ESPERA_MAXIMA_MS) {
      await new Promise((r) => setTimeout(r, esperaMs))
      continue
    }
    return res
  }
  // inalcançável, mas o TS exige
  return new Response("", { status: 500 })
}

// Loop agêntico para provedores compatíveis com OpenAI (Groq)
/**
 * Cola o recibo embaixo da resposta do modelo.
 *
 * Fica FORA do que o modelo escreve, e não no lugar: a frase dele é a conversa,
 * o recibo é o comprovante. Juntar os dois numa coisa só devolveria ao modelo a
 * chance de reescrever o comprovante — que é justamente o defeito.
 */
function comRecibo(
  texto: string,
  executadas: AcaoExecutada[],
  tzMin: number,
  t: Dicionario["ia"],
  lacoEstourou: boolean
): string {
  // Os rótulos de repetição moram em `agenda` (a leitura usa os mesmos) e são
  // emprestados ao recibo aqui, em vez de duplicados no dicionário.
  const textos = { ...t.recibo, repeticao: t.agenda.repeticao }
  const comprovante = recibo(executadas, tzMin, textos, t.recibo.diasDaSemana, lacoEstourou)
  return comprovante ? `${texto}\n\n${comprovante}` : texto
}

async function runOpenAIAgent(
  cfg: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  supabase: SupabaseClient,
  userId: string,
  tzMin: number,
  idioma: Idioma
): Promise<string> {
  const t = dicionario(idioma).ia
  // O que as ferramentas REALMENTE fizeram. O modelo escreve a resposta de
  // cabeça; esta lista é o que aconteceu.
  const executadas: AcaoExecutada[] = []
  const convo: OpenAIMessage[] = [
    { role: "system", content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  for (let i = 0; i < 4; i++) {
    const res = await groqChat(cfg, {
      messages: convo,
      tools: TOOLS,
      tool_choice: "auto",
      // Folga para modelos de raciocínio (o "pensar" consome deste teto);
      // sem isso o tool call era truncado e a ação nunca acontecia
      max_tokens: 1024,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      // Rede de segurança: o Llama às vezes gera o tool call num formato que o
      // parser do Groq rejeita (tool_use_failed). Recuperamos a intenção do
      // failed_generation, executamos de verdade e confirmamos.
      const recovered = await recoverFailedToolCalls(detail, supabase, userId, tzMin, idioma)
      if (recovered) return recovered
      if (res.status === 429) {
        // Se o laço JÁ escreveu alguma coisa, NÃO pode cair no reserva: o
        // reserva não enxerga o que foi feito e responde "não consegui criar",
        // por cima de blocos que estão no calendário. Foi o pior defeito do
        // relatório de 21/09 — pior que o antigo, porque leva quem usa a pedir
        // de novo e duplicar.
        //
        // Então: quando houve escrita, a resposta é o recibo do que entrou,
        // mais o aviso de que o pedido ficou pela metade.
        const jaEscreveu = executadas.some((a) => FERRAMENTAS_QUE_ESCREVEM.has(a.nome))
        if (jaEscreveu) return comRecibo(t.erros.ocupada, executadas, tzMin, t, true)
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
        const result = await executeTool(call.function.name, parsed, supabase, userId, tzMin, idioma)
        executadas.push({ nome: call.function.name, args: parsed, resultado: result })
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

    return comRecibo(msg.content ?? t.erros.semTexto, executadas, tzMin, t, false)
  }

  // Esgotou as iterações: força uma resposta de texto (sem mais ferramentas)
  // resumindo o que foi feito com base nos resultados já no histórico.
  try {
    const res = await groqChat(cfg, {
      messages: [
        ...convo,
        {
          role: "user",
          content: pedidoDeResumo(idioma),
        },
      ],
      tool_choice: "none",
      max_tokens: 220,
    })
    if (res.ok) {
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (text) return comRecibo(text, executadas, tzMin, t, true)
    }
  } catch {
    /* cai no fallback abaixo */
  }

  return comRecibo(t.erros.acaoFalhou, executadas, tzMin, t, true)
}

// Streaming simples de texto (Gemini / Anthropic — sem ferramentas por enquanto)
async function streamText(
  cfg: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  idioma: Idioma = "pt"
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
    // O detalhe do provedor vai para o LOG, não para a tela. Em 19/09/2026 quem
    // usava o app leu um JSON do Google dizendo que um modelo tinha sido
    // desativado — informação que só serve para mim.
    console.error(`[neuro-ia] ${cfg.provider} ${upstream.status}: ${detail.slice(0, 500)}`)
    const textos = dicionario(idioma).ia.erros
    const amigavel = upstream.status === 429 ? textos.ocupada : textos.falhaAoFalar(cfg.provider)
    return new Response(amigavel, { status: upstream.status || 502 })
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

/**
 * O idioma das respostas de erro que saem ANTES de o corpo ser lido — 401 e 503.
 * Elas não podem esperar pelo `body.idioma`: a 401 acontece antes de haver
 * sessão, e ler o corpo duas vezes não é possível. O `Accept-Language` do
 * navegador é a única pista que chega junto do pedido.
 */
function idiomaDoPedido(req: Request): Idioma {
  return /\ben\b/i.test(req.headers.get("accept-language") ?? "") ? "en" : "pt"
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(dicionario(idiomaDoPedido(req)).ia.erros.naoAutorizado, { status: 401 })

  const cfg = resolveProvider()
  if (!cfg) {
    return new Response(dicionario(idiomaDoPedido(req)).ia.erros.naoConfigurada, { status: 503 })
  }

  let body: { messages?: ChatMessage[]; dayNotes?: string; now?: string; mode?: string; tz?: number; idioma?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(dicionario(idiomaDoPedido(req)).ia.erros.pedidoInvalido, { status: 400 })
  }

  let messages = (body.messages ?? []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  )

  // Só "en" muda alguma coisa: qualquer outra coisa (ausente, lixo, idioma que o
  // app não tem) cai no português, que é o que o app sempre fez.
  const idioma: Idioma = body.idioma === "en" ? "en" : "pt"
  const t = dicionario(idioma).ia

  let system = BASE_PROMPT
  // A data é montada AQUI, a partir do fuso que o cliente manda — o `body.now`
  // (um `toLocaleString("pt-BR")`) não é mais usado. "28/08/2026" obriga o
  // modelo a adivinhar se é dia/mês ou mês/dia, e quando ele erra, erra calado.
  // Ver lib/ia-agora.
  system += `\n\n${descreveAgora(Date.now(), body.tz ?? 0)}`
  if (body.dayNotes?.trim()) {
    system += `\n\nAnotações do dia do usuário:\n"""\n${body.dayNotes.trim()}\n"""`
  }
  if (body.mode === "voice") {
    system += `\n\nMODO VOZ (conversa falada em tempo real): responda de forma curta, natural e conversacional, como uma pessoa falando. Em geral 1 a 3 frases. Evite listas longas, markdown, asteriscos, emojis e símbolos — o texto será lido em voz alta. Se precisar destacar um conceito, cite no máximo 3 pontos-chave bem curtos, em frases simples.`
  }
  // Briefing: 100% determinístico (algoritmo, não IA) — factual, instantâneo
  // e sem consumir o limite de tokens.
  if (body.mode === "briefing") {
    const text = await buildBriefing(supabase, body.tz ?? 0)
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    })
  }

  if (messages.length === 0) return new Response(t.erros.semMensagem, { status: 400 })

  // Injeta a agenda real compacta — fonte da verdade p/ perguntas sobre o dia
  system += `\n\n${await buildDayContext(supabase, body.tz ?? 0)}`

  // O idioma fica por ÚLTIMO, depois do modo voz e da agenda: é a instrução que
  // não pode ser diluída pelas que vêm depois, e o fim do prompt é onde o modelo
  // olha primeiro quando duas instruções se cruzam.
  system += `\n\n${instrucaoDeIdioma(idioma)}`

  // Groq → loop com ferramentas (cria/edita/exclui de verdade)
  if (cfg.provider === "groq") {
    try {
      const finalText = await runOpenAIAgent(cfg, system, messages, supabase, user.id, body.tz ?? 0, idioma)

      // Limite do Groq atingido → tenta o Gemini como reserva (sem ferramentas)
      if (finalText === "__RATE_LIMIT__" && process.env.GEMINI_API_KEY) {
        const gcfg: ProviderConfig = {
          provider: "gemini",
          apiKey: process.env.GEMINI_API_KEY,
          // `-latest` de propósito: foi um modelo FIXO (gemini-2.0-flash) sendo
      // desativado pelo Google que derrubou a Neuro em 19/09/2026 — e o erro
      // aparecia como JSON cru na tela de quem usa. Alias não morre assim.
      //
      // Escolhido medindo, e não pelo nome: com esta chave, `gemini-2.5-flash`
      // e `-flash-lite` respondem 404 ("no longer available to new users"),
      // `gemini-flash-latest` oscilou (503 por 39s) e `gemini-3-flash-preview`
      // levou 23s. O `flash-lite-latest` deu 5/5 entre 450ms e 820ms.
      model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
        }
        const fallbackSystem =
          system +
          "\n\nMODO RESERVA: as ferramentas estão fora do ar neste momento e você NÃO consegue criar, editar nem excluir nada.\n" +
          "Você também não tem onde anotar: esta conversa não deixa registro para você, e quando as ferramentas voltarem você não vai lembrar de nada dela.\n" +
          "Por isso é PROIBIDO dizer qualquer uma destas coisas: 'anotei', 'deixei salvo', 'guardei aqui', 'farei assim que o sistema voltar', 'já deixo pendente'. Todas são mentira, e quem está do outro lado vai contar com elas.\n" +
          "Quando pedirem uma ação, diga que não consegue agora e peça para tentar de novo em alguns minutos. Conversar, explicar e responder perguntas sobre o que já existe continua valendo."
        return streamText(gcfg, fallbackSystem, messages, idioma)
      }

      return new Response(sanitizeOut(finalText), {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      })
    } catch (e) {
      console.error("[neuro-ia] groq:", e instanceof Error ? e.message : e)
      return new Response(
        // A mensagem do provedor fica no log: ela cita nome de modelo e cota, e
        // quem está conversando não tem o que fazer com isso.
        t.erros.falhaAoFalar("groq"),
        { status: 502 }
      )
    }
  }

  // Gemini / Anthropic → chat em streaming (sem ferramentas por enquanto)
  return streamText(cfg, system, messages, idioma)
}
