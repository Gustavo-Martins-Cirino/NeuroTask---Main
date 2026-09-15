// Primeiro contato — o que a conta nova vê ao abrir o app pela primeira vez.
// Só a ordem dos passos e as regras puras aqui; o texto de cada passo mora no
// dicionário (`moldura.onboarding.passos`), e o diálogo e o I/O (ler/gravar
// user_metadata) ficam em components/onboarding.tsx. Sem LLM, sem tabela nova:
// o "já vi" mora no user_metadata, como avatar_modo e foto_perfil.
//
// A tese guia o texto: o NeuroTask não é um calendário passivo, é um copiloto
// de rotina. O onboarding orienta sem sobrecarregar — quatro passos, um por
// pilar, e um jeito de pular a qualquer momento.

/**
 * Os passos, na ordem. Só o id: é por ele que o dicionário guarda título e
 * texto, então passo novo sem texto nos dois idiomas não compila.
 */
export const PASSOS_ONBOARDING = ["bem-vindo", "tarefas", "calendario", "neuro-ia"] as const

export type IdPassoOnboarding = (typeof PASSOS_ONBOARDING)[number]

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
