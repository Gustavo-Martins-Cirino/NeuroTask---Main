// Quanto tempo um pedido à Neuro pode ficar em silêncio antes de desistir.
//
// **O buraco que isto fecha** (relatório da rodada X): pedir a listagem de um
// dia cheio deixou a tela girando por ~90 segundos, sem resposta, sem erro e
// sem fim — até quem estava testando recarregar a página. Não havia o que
// falhar: um `fetch` que nunca responde também nunca rejeita, então o `catch`
// da tela jamais rodava e o "carregando" era para sempre.
//
// O relógio é de SILÊNCIO, não de duração total. A resposta do Groq com
// ferramentas pode demorar de verdade — são até quatro voltas de tool call, e
// cada uma é uma ida ao provedor —, então cortar por tempo total mataria
// pedidos legítimos. O que nunca é legítimo é ficar sem notícia nenhuma.

/**
 * Silêncio tolerado, em ms. Sessenta segundos é folgado de propósito: quatro
 * voltas de ferramenta mais o resumo cabem bem abaixo disso, e o caso do
 * relatório (90s e contando) fica de fora com margem.
 */
export const SILENCIO_MAXIMO_MS = 60_000

/**
 * Um relógio que se reinicia a cada sinal de vida e dispara quando eles param.
 *
 * Quem recebe em streaming chama `vivo()` a cada pedaço; quem recebe de uma vez
 * só nem precisa — basta `parar()` no fim. `aoSilenciar` roda no máximo uma
 * vez.
 */
export function relogioDeSilencio(
  aoSilenciar: () => void,
  ms: number = SILENCIO_MAXIMO_MS,
  agendar: (fn: () => void, ms: number) => unknown = setTimeout,
  cancelar: (id: unknown) => void = (id) => clearTimeout(id as ReturnType<typeof setTimeout>)
) {
  let id: unknown = null
  let morto = false

  const armar = () => {
    if (morto) return
    if (id !== null) cancelar(id)
    id = agendar(() => {
      if (morto) return
      morto = true
      aoSilenciar()
    }, ms)
  }

  armar()

  return {
    /** Chegou sinal de vida: o relógio volta ao começo. */
    vivo: armar,
    /** Acabou (bem ou mal): o relógio não dispara mais. */
    parar() {
      morto = true
      if (id !== null) cancelar(id)
      id = null
    },
  }
}
