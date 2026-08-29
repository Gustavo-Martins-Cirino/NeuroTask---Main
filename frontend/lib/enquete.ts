// Enquete de uma pergunta — perguntar ao usuário-teste sem ele ter de escrever.
// Referência: components/inspirações/votacao2-feedback.tsx (`PollWidget`).
//
// **Por que ela existe na Fase 5**: o pior resultado possível é feedback que
// não chega, e escrever é atrito. Uma pergunta com quatro respostas prontas cabe
// num toque — e um toque é a diferença entre saber e supor.
//
// **Onde a resposta vai parar**: na tabela `feedback` que já existe, como uma
// mensagem normal. Não há tabela nova, SQL novo nem RLS novo, e o painel do dono
// já a mostra junto com o resto. O preço é não haver contagem agregada: com um
// punhado de testadores, ler as linhas é mais barato que construir o relatório.
//
// Só dados e regras puras aqui. O I/O — ler e gravar no `user_metadata`, como
// atalhos_neuro_v1 e onboarding_v1 — mora em components/enquete.tsx.

export const CHAVE_ENQUETE = "enquete_v1"

export interface Pergunta {
  id: string
  texto: string
  opcoes: readonly string[]
}

/**
 * As perguntas, na ordem em que serão feitas.
 *
 * Elas moram no código de propósito: quem muda a pergunta é quem faz o deploy, e
 * uma tabela no banco só para isso custaria SQL à mão, RLS e uma tela de edição
 * — para guardar quatro frases que mudam uma vez por mês.
 *
 * A régua de cada uma: responder tem de ser um toque, e a resposta tem de mudar
 * alguma decisão. Pergunta cuja resposta não muda nada sai da lista.
 */
export const PERGUNTAS: readonly Pergunta[] = [
  {
    id: "por-que-abriu",
    texto: "O que te fez abrir o NeuroTask hoje?",
    opcoes: ["Ver o que eu tinha para fazer", "Anotar algo novo", "Um lembrete me chamou", "Curiosidade"],
  },
  {
    id: "faria-falta",
    texto: "Se o app sumisse amanhã, o que faria falta?",
    opcoes: ["As tarefas e o calendário", "A Neuro IA", "O Escritório e o nível", "Nada ainda"],
  },
  {
    id: "atrapalhou",
    texto: "O que mais te atrapalhou até agora?",
    opcoes: ["Achar as coisas", "Ficou lento ou travou", "Não entendi o que fazer", "Nada me atrapalhou"],
  },
  {
    id: "seus-numeros",
    texto: "“Seus números”, no início, te contou algo que você não sabia?",
    opcoes: ["Sim, me surpreendeu", "Interessante, mas não mudei nada", "Nunca abri"],
  },
]

export interface EstadoEnquete {
  /** Ids já respondidos. */
  respondidas: string[]
  /** Instante (ms) antes do qual não se pergunta nada. */
  adiadoAte: number
}

const VAZIO: EstadoEnquete = { respondidas: [], adiadoAte: 0 }

/**
 * O silêncio entre uma aparição e a próxima — o teto que o Gustavo deu.
 *
 * Vale para TODOS os caminhos: responder, dizer "agora não", e só ter visto.
 * Antes eram três dias, e só para quem recusava; quem respondia recebia a
 * pergunta seguinte na visita imediata, e quem não fazia nada revia a mesma a
 * cada abertura do dashboard. A enquete no fim do dashboard só sobrevive
 * enquanto for rara: virou paisagem, ninguém responde mais nenhuma.
 */
export const DIAS_DE_SILENCIO = 7
const MS_POR_DIA = 24 * 60 * 60 * 1000

function silencioAte(agoraMs: number, dias: number = DIAS_DE_SILENCIO): number {
  const base = Number.isFinite(agoraMs) ? agoraMs : 0
  const d = Number.isFinite(dias) && dias > 0 ? dias : DIAS_DE_SILENCIO
  return base + d * MS_POR_DIA
}

/**
 * Deixa o que veio do `user_metadata` em estado utilizável.
 *
 * Roda na LEITURA também, e não só na gravação: o metadata é editável pelo
 * cliente, então o que volta de lá não é confiável só por ter sido gravado por
 * nós um dia. Id desconhecido é descartado — tirar uma pergunta do código não
 * pode virar erro para quem já a respondeu.
 */
export function saneiaEstado(bruto: unknown): EstadoEnquete {
  if (!bruto || typeof bruto !== "object") return VAZIO
  const o = bruto as Record<string, unknown>
  const conhecidas = new Set(PERGUNTAS.map((p) => p.id))
  const respondidas = Array.isArray(o.respondidas)
    ? [...new Set(o.respondidas.filter((id): id is string => typeof id === "string" && conhecidas.has(id)))]
    : []
  const adiadoAte = typeof o.adiadoAte === "number" && Number.isFinite(o.adiadoAte) && o.adiadoAte > 0
    ? o.adiadoAte
    : 0
  return { respondidas, adiadoAte }
}

/**
 * A pergunta da vez, ou `null` quando é hora de ficar quieto.
 *
 * O adiamento vale para a enquete INTEIRA, não para a pergunta recusada. Quem
 * diz "agora não" está dizendo "não quero ser perguntado", e emendar outra
 * pergunta no lugar é exatamente o incômodo que faz a pessoa parar de responder
 * qualquer uma.
 */
export function proximaPergunta(estado: EstadoEnquete, agoraMs: number): Pergunta | null {
  if (Number.isFinite(agoraMs) && agoraMs < estado.adiadoAte) return null
  const feitas = new Set(estado.respondidas)
  return PERGUNTAS.find((p) => !feitas.has(p.id)) ?? null
}

/**
 * O estado depois de responder — a resposta em si vai para o `feedback`.
 *
 * Responder compra silêncio de verdade. O código antigo gravava `adiadoAte: 0`
 * com um comentário dizendo justamente o contrário: zero não compra nada, e a
 * pergunta seguinte aparecia na visita imediata.
 */
export function comResposta(estado: EstadoEnquete, id: string, agoraMs: number): EstadoEnquete {
  const respondidas = estado.respondidas.includes(id) ? estado.respondidas : [...estado.respondidas, id]
  return { respondidas, adiadoAte: silencioAte(agoraMs) }
}

/** O estado depois de "agora não". */
export function adiado(estado: EstadoEnquete, agoraMs: number, dias = DIAS_DE_SILENCIO): EstadoEnquete {
  return { ...estado, adiadoAte: silencioAte(agoraMs, dias) }
}

/**
 * O estado depois de a pergunta ter APARECIDO na tela.
 *
 * É o que faltava por inteiro. Sem registrar a aparição, quem não responde e não
 * recusa revê a mesma pergunta a cada abertura do dashboard — e é exatamente
 * quem não quis interagir que menos merece ser perguntado de novo.
 */
export function mostrada(estado: EstadoEnquete, agoraMs: number): EstadoEnquete {
  return { ...estado, adiadoAte: silencioAte(agoraMs) }
}

/**
 * A linha que vai para a tabela `feedback`. Escrita para ser LIDA no painel do
 * dono sem nenhuma ferramenta no meio — é ali que ela vai ser olhada.
 */
export function mensagemDaResposta(pergunta: Pergunta, resposta: string): string {
  return `[enquete] ${pergunta.texto} → ${resposta}`
}
