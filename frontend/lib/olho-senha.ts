// Os olhinhos que espiam a senha enquanto ela é digitada.
//
// Aqui mora só a GEOMETRIA do olhar — quanto a pupila desliza dentro da órbita
// e com que ritmo o olho pisca. Nada de React, nada de SVG: é conta, e conta se
// testa. O desenho fica em components/campo-senha.tsx.

/** Raio da órbita, em unidades do SVG. A pupila nunca passa disto. */
export const RAIO_ORBITA = 2.6

export interface Olhar {
  x: number
  y: number
}

/** Pupila no meio, sem olhar para lado nenhum — o repouso e o fallback estático. */
export const OLHAR_PARADO: Olhar = { x: 0, y: 0 }

/**
 * O quanto do campo já foi escrito, de 0 a 1.
 *
 * Satura: depois de `satura` caracteres o olhar já chegou à direita e para de
 * andar. Sem isso, uma senha longa faria a pupila "escapar" do campo — e é
 * justamente o que o `olharPara` não pode deixar acontecer.
 */
export function progressoDoTexto(tamanho: number, satura = 14): number {
  if (!Number.isFinite(tamanho) || tamanho <= 0) return 0
  if (satura <= 0) return 1
  return Math.min(1, tamanho / satura)
}

/**
 * Onde a pupila fica, dado o progresso do texto.
 *
 * O olho acompanha a escrita da esquerda para a direita, e olha um pouco para
 * BAIXO o tempo todo: o campo fica abaixo da linha dos olhos, e pupila centrada
 * na vertical dá cara de susto, não de curiosidade.
 *
 * O desvio vertical é uma fração do raio (não o raio inteiro) porque o total
 * `x² + y²` tem de caber na órbita — pupila no canto extremo encosta na borda e
 * parece vazando.
 */
export function olharPara(progresso: number, raio = RAIO_ORBITA): Olhar {
  const p = Math.min(1, Math.max(0, Number.isFinite(progresso) ? progresso : 0))
  // -1 (todo à esquerda) → +1 (todo à direita)
  const lado = p * 2 - 1
  const x = lado * raio * 0.82
  const y = raio * 0.34
  return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }
}

/** A pupila escapou da órbita? É a pergunta que o teste faz de verdade. */
export function dentroDaOrbita(olhar: Olhar, raio = RAIO_ORBITA): boolean {
  return Math.hypot(olhar.x, olhar.y) <= raio + 1e-9
}

/**
 * Quanto tempo até a próxima piscada, em milissegundos.
 *
 * Intervalo irregular de propósito: piscada em compasso fixo lê como relógio,
 * não como bicho. O sorteio entra por parâmetro para o teste poder fixá-lo.
 */
export const PISCADA_MINIMA_MS = 2200
export const PISCADA_MAXIMA_MS = 6200

export function ritmoDaPiscada(sorteio: () => number): number {
  const s = Math.min(1, Math.max(0, sorteio()))
  return Math.round(PISCADA_MINIMA_MS + s * (PISCADA_MAXIMA_MS - PISCADA_MINIMA_MS))
}
