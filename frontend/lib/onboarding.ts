// Primeiro contato — o que a conta nova vê ao abrir o app pela primeira vez.
// Só dados e regras puras aqui; o diálogo e o I/O (ler/gravar user_metadata)
// ficam em components/onboarding.tsx. Sem LLM, sem tabela nova: o "já vi" mora
// no user_metadata, como avatar_modo e foto_perfil.
//
// A tese guia o texto: o NeuroTask não é um calendário passivo, é um copiloto
// de rotina. O onboarding orienta sem sobrecarregar — quatro passos, um por
// pilar, e um jeito de pular a qualquer momento.

export interface PassoOnboarding {
  /** Também casa com o ícone escolhido no componente. */
  id: string
  titulo: string
  texto: string
}

export const PASSOS_ONBOARDING: PassoOnboarding[] = [
  {
    id: "bem-vindo",
    titulo: "Bem-vindo ao NeuroTask",
    texto:
      "Não é mais um calendário que você esquece e abandona. É um copiloto da sua rotina: ele planeja o dia com você e acompanha de verdade.",
  },
  {
    id: "tarefas",
    titulo: "Comece pelas tarefas",
    texto:
      "Anote o que precisa fazer. O app prioriza, cuida dos prazos e te dá XP a cada conclusão — o progresso vira jogo, com propósito.",
  },
  {
    id: "calendario",
    titulo: "Bloqueie o seu tempo",
    texto:
      "No calendário você reserva horários para cada coisa. Uma tarefa com hora marcada já vira um bloco no dia, sem trabalho dobrado.",
  },
  {
    id: "neuro-ia",
    titulo: "A Neuro IA organiza com você",
    texto:
      "Peça para montar o dia, criar tarefas ou entrar em foco. Ela propõe e você confirma — nunca age por conta própria nem inventa dados.",
  },
]

/** Chave no user_metadata que marca que a pessoa já passou (ou pulou) o guia. */
export const CHAVE_ONBOARDING = "onboarding_v1"

/**
 * O guia só aparece enquanto essa marca não existe. É a leitura mais simples e
 * robusta: sem consultar tarefas nem adivinhar "conta nova", e sem piscar para
 * quem já viu (o componente só decide mostrar depois de ler o metadata).
 */
export function jaViuOnboarding(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return Boolean(metadata?.[CHAVE_ONBOARDING])
}

export function passoSeguinte(atual: number, total: number): number {
  return Math.min(total - 1, atual + 1)
}

export function passoAnterior(atual: number): number {
  return Math.max(0, atual - 1)
}

export function ehUltimoPasso(atual: number, total: number): boolean {
  return atual >= total - 1
}
