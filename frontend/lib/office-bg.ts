// Cor de fundo do Escritório — a preferência é do dispositivo (localStorage),
// como o formato de hora. "auto" mantém o gradiente que segue a hora do dia; as
// demais são cores fixas. Guardamos como string: "auto" ou um hex #rrggbb.

export type OfficeBg = string

export const OFFICE_BG_DEFAULT: OfficeBg = "auto"

export interface OfficeBgOption {
  id: OfficeBg
  label: string
  /** Cor da bolinha no seletor; vazio = mostra o gradiente da hora do dia. */
  swatch: string
}

export const OFFICE_BG_OPTIONS: OfficeBgOption[] = [
  { id: "auto", label: "Hora do dia", swatch: "" },
  { id: "#dfeaf4", label: "Céu", swatch: "#dfeaf4" },
  { id: "#e7dcef", label: "Lavanda", swatch: "#e7dcef" },
  { id: "#f0dcc8", label: "Pêssego", swatch: "#f0dcc8" },
  { id: "#d9ead9", label: "Menta", swatch: "#d9ead9" },
  { id: "#e9d5cf", label: "Argila", swatch: "#e9d5cf" },
  { id: "#2b2f4a", label: "Noite", swatch: "#2b2f4a" },
  { id: "#1b1b20", label: "Grafite", swatch: "#1b1b20" },
]

export function parseOfficeBg(v: string | null): OfficeBg {
  if (v === "auto") return "auto"
  if (v && /^#[0-9a-fA-F]{6}$/.test(v)) return v
  return OFFICE_BG_DEFAULT
}
