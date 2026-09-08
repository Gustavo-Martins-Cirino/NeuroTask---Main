// Saudação do dashboard: qual cumprimento a hora pede e em que ritmo as letras
// entram. Puro de propósito — quem anima (GSAP) fica no componente.

/**
 * Qual cumprimento a hora pede — a CHAVE, não o texto.
 *
 * O texto mora no dicionário (lib/i18n). Aqui ficaria cravado em português num
 * arquivo que nem sabe que existe idioma, e a saudação é a primeira coisa que
 * a pessoa lê na tela.
 */
export type ChaveSaudacao = "ola" | "bomDia" | "boaTarde" | "boaNoite"

export function saudacaoPorHora(hora: number): ChaveSaudacao {
  if (!Number.isFinite(hora)) return "ola"
  const h = Math.floor(hora)
  if (h < 0 || h > 23) return "ola"
  if (h < 12) return "bomDia"
  if (h < 18) return "boaTarde"
  return "boaNoite"
}

// Teto do tempo total da entrada. Sem ele, um nome comprido ("Bom dia, Maria
// Fernanda") faria a saudação levar segundos para terminar de aparecer.
export const DURACAO_MAXIMA_S = 0.7

export const STAGGER_BASE_S = 0.03

export function staggerDasLetras(quantidade: number, base = STAGGER_BASE_S): number {
  if (!Number.isFinite(quantidade) || quantidade <= 1) return 0
  return Math.min(base, DURACAO_MAXIMA_S / quantidade)
}
