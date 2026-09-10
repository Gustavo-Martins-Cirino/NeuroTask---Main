// Contraste de texto sobre fundo, a partir dos tokens oklch do tema.
//
// **Por que isto existe como módulo puro**: contraste é a única coisa do visual
// que não é gosto — ou o texto se lê, ou não se lê, e a conta é a mesma para
// todo mundo. Conferir "no olho" já falhou duas vezes neste projeto: uma porque
// o dev server servia CSS velho, outra porque `getComputedStyle` devolve a cor
// DECLARADA e não a composta quando o fundo é translúcido.
//
// Lendo o `globals.css` direto do arquivo e fazendo a conta aqui, o teste pega
// a regressão antes de ela virar tela.

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Piso da WCAG AA para texto comum. */
export const PISO_TEXTO = 4.5
/** Piso para texto grande (≥ 18,66px em negrito ou ≥ 24px). */
export const PISO_TEXTO_GRANDE = 3

/** "oklch(0.65 0.18 160)" → os três números. Devolve null se não for oklch. */
export function leOklch(valor: string): { l: number; c: number; h: number } | null {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(valor)
  if (!m) return null
  const [l, c, h] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return [l, c, h].every(Number.isFinite) ? { l, c, h } : null
}

/**
 * oklch → sRGB (0 a 1 por canal), passando por Oklab e pela matriz LMS.
 *
 * Recortado ao cubo no fim: cor fora do gamut do sRGB não tem representação, e
 * deixar o canal estourar daria luminância maior que a que a tela mostra — ou
 * seja, um contraste melhor no papel do que na tela, que é o erro caro aqui.
 */
export function oklchParaRgb(l: number, c: number, hGraus: number): Rgb {
  const h = (hGraus * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  ]
  const gama = (v: number) => {
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, s))
  }
  return { r: gama(lin[0]), g: gama(lin[1]), b: gama(lin[2]) }
}

/** Luminância relativa da WCAG. */
export function luminancia({ r, g, b }: Rgb): number {
  const canal = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** A razão de contraste entre duas cores — 21 no máximo, 1 no mínimo. */
export function razaoDeContraste(a: Rgb, b: Rgb): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const claro = Math.max(la, lb)
  const escuro = Math.min(la, lb)
  return (claro + 0.05) / (escuro + 0.05)
}

/** Atalho: contraste entre dois tokens escritos em oklch. */
export function contrasteEntreOklch(fundo: string, texto: string): number | null {
  const f = leOklch(fundo)
  const t = leOklch(texto)
  if (!f || !t) return null
  return razaoDeContraste(oklchParaRgb(f.l, f.c, f.h), oklchParaRgb(t.l, t.c, t.h))
}

/**
 * Os tokens de um bloco do `globals.css` (`:root` ou `.dark`).
 *
 * Lê o ARQUIVO, e não o navegador: `getComputedStyle` devolve a cor declarada
 * quando o fundo é translúcido, e o dev server serve CSS velho. As duas coisas
 * já fizeram uma medição dizer o contrário da verdade neste projeto.
 */
export function tokensDoBloco(css: string, seletor: string): Record<string, string> {
  // O seletor tem de estar sozinho na PRÓPRIA linha, abrindo o bloco. Procurar
  // a substring solta acha ".dark" dentro de ".dark .algo" muitas linhas antes,
  // e aí se lê o bloco errado — o levantamento volta vazio e parece que o tema
  // escuro não tem token nenhum.
  const linhas = css.split(/\r?\n/)
  const inicio = linhas.findIndex((l) => l.trim() === `${seletor} {`)
  if (inicio < 0) return {}
  const out: Record<string, string> = {}
  for (let i = inicio + 1; i < linhas.length; i++) {
    if (linhas[i].trim() === "}") break
    const m = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(linhas[i])
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}
