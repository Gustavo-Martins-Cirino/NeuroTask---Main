// Desvanecer as bordas de uma área que rola: o topo esmaece quando há conteúdo
// escondido acima, a base quando há conteúdo abaixo — e nada esmaece quando se
// chega ao fim. É a leitura minimalista do "EdgeBlur": uma máscara de opacidade
// via CSS, sem camadas sobrepostas e sem mexer no layout de quem usa. Puro e
// testável; o listener de scroll mora no hook.

export interface EstadoRolagem {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/**
 * Quantos pixels de desvanecer cada borda deve ter. Cresce de 0 até `fade`
 * conforme há espaço para rolar naquela direção, então some ao encostar na
 * ponta — assim a primeira e a última linha nunca ficam esmaecidas à toa.
 */
export function fadeDaBorda(
  { scrollTop, scrollHeight, clientHeight }: EstadoRolagem,
  fade: number
): { topo: number; base: number } {
  const max = Math.max(0, fade)
  const restante = Math.max(0, scrollHeight - clientHeight)
  const topo = Math.min(max, Math.max(0, scrollTop))
  const base = Math.min(max, Math.max(0, restante - scrollTop))
  return { topo, base }
}

/**
 * Gradiente para `mask-image`: preto (opaco) no miolo, transparente nas bordas
 * que estão esmaecendo. Devolve "none" quando não há desvanecer nenhum — evita
 * uma máscara inútil e o custo de composição que ela traz.
 */
export function mascaraCss(topo: number, base: number): string {
  if (topo <= 0 && base <= 0) return "none"
  return `linear-gradient(to bottom, transparent 0, #000 ${topo}px, #000 calc(100% - ${base}px), transparent 100%)`
}
