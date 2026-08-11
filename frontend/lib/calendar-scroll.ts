// Para onde a grade do calendário deve estar rolada quando a página abre.
// Puro de propósito: o I/O (ler alturas, chamar scrollTo) fica na página.

export interface AlvoDeScrollOpts {
  /** Minutos desde a meia-noite do "agora". Ignorado quando `hoje` é false. */
  minutosAgora: number
  /** Altura de uma hora na grade, em px. */
  alturaHora: number
  /** Altura visível do container que rola, em px. */
  alturaVisivel: number
  /** A faixa de dias exibida contém hoje? */
  hoje: boolean
  /** Hora mostrada quando o dia visível não é hoje. */
  horaPadrao?: number
}

const HORAS_NO_DIA = 24

/**
 * Com "hoje" na tela, deixa o agora a um terço do topo — colado no topo a
 * pessoa perde o que acabou de passar, centralizado sobra pouco do que vem.
 * Sem "hoje", mantém a hora padrão (o dia útil começando).
 */
export function alvoDeScroll({
  minutosAgora,
  alturaHora,
  alturaVisivel,
  hoje,
  horaPadrao = 7,
}: AlvoDeScrollOpts): number {
  const alturaTotal = HORAS_NO_DIA * alturaHora
  const maximo = Math.max(0, alturaTotal - alturaVisivel)

  const bruto = hoje
    ? (minutosAgora / 60) * alturaHora - alturaVisivel / 3
    : horaPadrao * alturaHora

  return Math.round(Math.min(Math.max(bruto, 0), maximo))
}

/**
 * De onde a animação parte. Rolar desde a meia-noite até as 18h seria uma
 * viagem longa e tonta; partir de duas horas e meia antes do alvo dá o
 * deslize sem o percurso.
 */
export function partidaDoScroll(alvo: number, alturaHora: number): number {
  return Math.max(0, Math.round(alvo - alturaHora * 2.5))
}
