// A cor da calça do bonequinho — e a única exceção que ela tem.
//
// Ela era cravada em `#3b5378` no meio do desenho, então todo avatar do app
// usava a mesma calça azul. Virou escolha, com uma regra que sobra: **terno é
// uma peça só**. Paletó de um tom com calça de outro não é traje, é fantasia —
// e como o paletó já tem cor escolhida, a calça sai dele.
//
// Por isso a função existe em vez de o desenho ler `cfg.pantsColor` direto: a
// regra do terno vale no bonequinho 2D E no personagem 3D, e regra repetida em
// dois desenhos é como um deles fica para trás.

import type { AvatarConfig } from "./avatar"

/** Quanto a calça do terno escurece em relação ao paletó. */
export const ESCURECE_NO_TERNO = 18

function escurece(hex: string, quanto: number): string {
  const limpo = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"
  const n = parseInt(limpo.slice(1), 16)
  const canal = (v: number) => Math.max(0, Math.min(255, v - quanto))
  const r = canal(n >> 16)
  const g = canal((n >> 8) & 255)
  const b = canal(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

/** O terno manda na calça; as outras roupas deixam a escolha valer. */
export function ternoMandaNaCalca(outfit: unknown): boolean {
  return outfit === "terno"
}

/**
 * A cor da calça que o desenho deve usar.
 *
 * Fora do terno é a escolhida. Cor faltando ou estragada cai no azul de sempre
 * — calça preta por acidente seria pior que a calça padrão.
 */
export function corDaCalca(cfg: Pick<AvatarConfig, "outfit" | "outfitColor" | "pantsColor">): string {
  const escolhida = /^#[0-9a-f]{6}$/i.test(cfg.pantsColor ?? "") ? cfg.pantsColor : "#3b5378"
  if (!ternoMandaNaCalca(cfg.outfit)) return escolhida
  const paleto = /^#[0-9a-f]{6}$/i.test(cfg.outfitColor ?? "") ? cfg.outfitColor : escolhida
  return escurece(paleto, ESCURECE_NO_TERNO)
}

/**
 * A perna de trás, sempre DERIVADA da cor da frente.
 *
 * Nunca uma segunda cor guardada: foi assim que nasceram os dois azuis que não
 * combinavam. Uma cor escolhida, a outra é sombra dela.
 */
export function corDaPernaDeTras(corDaFrente: string, quanto = 8): string {
  return escurece(corDaFrente, quanto)
}
