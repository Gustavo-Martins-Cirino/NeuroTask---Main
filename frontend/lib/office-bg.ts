// Cor de fundo do Escritório — a preferência é do dispositivo (localStorage),
// como o formato de hora. "auto" mantém o gradiente que segue a hora do dia; as
// demais são cores fixas. Guardamos como string: "auto" ou um hex #rrggbb.

export type OfficeBg = string

export const OFFICE_BG_DEFAULT: OfficeBg = "auto"

// Fundo do "Automático": segue o tema do app (claro/escuro). Parecidos com o
// tema (hue azulado 260), mas não idênticos — um pouco mais presentes pra a
// sala destacar do fundo.
export const AUTO_LIGHT = "#e7ebf2"
export const AUTO_DARK = "#20232e"

/**
 * O nome de cada preset — que é também a CHAVE dele no dicionário
 * (Dicionario.escritorio.fundoNomes). Não há campo `label` aqui de propósito:
 * módulo puro não fala idioma (mesma regra de `lib/nota-cor.ts`).
 */
export type ChaveFundoOffice = "automatico" | "ceu" | "lavanda" | "pessego" | "menta" | "argila" | "noite" | "grafite"

export interface OfficeBgOption {
  id: OfficeBg
  chave: ChaveFundoOffice
  /** Cor (ou gradiente) da bolinha no seletor. */
  swatch: string
}

export const OFFICE_BG_OPTIONS: OfficeBgOption[] = [
  // "Automático" segue o tema — meia bolinha clara, meia escura pra sinalizar.
  { id: "auto", chave: "automatico", swatch: `linear-gradient(135deg, ${AUTO_LIGHT} 0 50%, ${AUTO_DARK} 50% 100%)` },
  { id: "#dfeaf4", chave: "ceu", swatch: "#dfeaf4" },
  { id: "#e7dcef", chave: "lavanda", swatch: "#e7dcef" },
  { id: "#f0dcc8", chave: "pessego", swatch: "#f0dcc8" },
  { id: "#d9ead9", chave: "menta", swatch: "#d9ead9" },
  { id: "#e9d5cf", chave: "argila", swatch: "#e9d5cf" },
  { id: "#2b2f4a", chave: "noite", swatch: "#2b2f4a" },
  { id: "#1b1b20", chave: "grafite", swatch: "#1b1b20" },
]

// Cor livre: um hex que não é nenhum dos presets acima (nem o "auto"). É o que
// o seletor personalizado usa para saber se está ativo e mostrar a cor atual.
const IDS_PRESET = new Set(OFFICE_BG_OPTIONS.map((o) => o.id))

export function ehFundoPersonalizado(bg: OfficeBg): boolean {
  return !IDS_PRESET.has(bg)
}

/** Cor inicial do seletor personalizado enquanto ainda se usa um preset. */
export const COR_PERSONALIZADA_PADRAO = "#8aa0c8"

export function parseOfficeBg(v: string | null): OfficeBg {
  if (v === "auto") return "auto"
  if (v && /^#[0-9a-fA-F]{6}$/.test(v)) return v
  return OFFICE_BG_DEFAULT
}

// Resolve a preferência na cor real usada no fundo: "auto" vira claro/escuro
// conforme o tema; qualquer outra é a própria cor escolhida.
export function resolveOfficeBg(bg: OfficeBg, isDark: boolean): string {
  if (bg === "auto") return isDark ? AUTO_DARK : AUTO_LIGHT
  return bg
}
