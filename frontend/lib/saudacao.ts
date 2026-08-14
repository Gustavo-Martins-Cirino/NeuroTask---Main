// Saudação do dashboard: qual cumprimento a hora pede e em que ritmo as letras
// entram. Puro de propósito — quem anima (GSAP) fica no componente.

export function saudacaoPorHora(hora: number): string {
  if (!Number.isFinite(hora)) return "Olá"
  const h = Math.floor(hora)
  if (h < 0 || h > 23) return "Olá"
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

// Teto do tempo total da entrada. Sem ele, um nome comprido ("Bom dia, Maria
// Fernanda") faria a saudação levar segundos para terminar de aparecer.
export const DURACAO_MAXIMA_S = 0.7

export const STAGGER_BASE_S = 0.03

export function staggerDasLetras(quantidade: number, base = STAGGER_BASE_S): number {
  if (!Number.isFinite(quantidade) || quantidade <= 1) return 0
  return Math.min(base, DURACAO_MAXIMA_S / quantidade)
}
