import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  PISO_TEXTO, contrasteEntreOklch, leOklch, luminancia, oklchParaRgb,
  razaoDeContraste, tokensDoBloco,
} from "./contraste"

const BRANCO = { r: 1, g: 1, b: 1 }
const PRETO = { r: 0, g: 0, b: 0 }

describe("a conta", () => {
  it("branco contra preto é o teto da escala", () => {
    expect(razaoDeContraste(BRANCO, PRETO)).toBeCloseTo(21, 6)
  })

  it("uma cor contra ela mesma é o piso", () => {
    expect(razaoDeContraste(BRANCO, BRANCO)).toBeCloseTo(1, 10)
  })

  it("a ordem não importa: contraste não tem lado", () => {
    const verde = oklchParaRgb(0.65, 0.18, 160)
    expect(razaoDeContraste(verde, BRANCO)).toBeCloseTo(razaoDeContraste(BRANCO, verde), 12)
  })

  it("oklch de luminosidade 1 sem croma é branco; 0 é preto", () => {
    expect(luminancia(oklchParaRgb(1, 0, 0))).toBeCloseTo(1, 3)
    expect(luminancia(oklchParaRgb(0, 0, 0))).toBeCloseTo(0, 6)
  })

  it("cor fora do gamut é RECORTADA, não estourada", () => {
    // Deixar o canal passar de 1 daria luminância maior que a que a tela
    // mostra — ou seja, um contraste melhor no papel do que no olho.
    const fora = oklchParaRgb(0.65, 0.5, 160)
    for (const v of [fora.r, fora.g, fora.b]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe("leOklch", () => {
  it("lê os três números", () => {
    expect(leOklch("oklch(0.65 0.18 160)")).toEqual({ l: 0.65, c: 0.18, h: 160 })
  })

  it("o que não é oklch devolve null em vez de zero", () => {
    // Zero seria preto, e preto contrasta com tudo: um token ilegível passaria.
    for (const v of ["#00af67", "var(--algo)", "", "oklch()"]) {
      expect(leOklch(v)).toBeNull()
    }
  })
})

describe("tokensDoBloco", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

  it("acha os dois temas, e nenhum deles vem vazio", () => {
    expect(Object.keys(tokensDoBloco(css, ":root")).length).toBeGreaterThan(20)
    expect(Object.keys(tokensDoBloco(css, ".dark")).length).toBeGreaterThan(20)
  })

  it("o seletor é a linha inteira, não uma substring", () => {
    // ".dark" aparece dentro de ".dark .algo" muito antes do bloco de tokens.
    // Casando por substring, lia-se o bloco errado e o tema escuro parecia não
    // ter token nenhum — foi o que aconteceu ao levantar isto.
    const claro = tokensDoBloco(css, ":root")
    const escuro = tokensDoBloco(css, ".dark")
    expect(claro["--background"]).not.toBe(escuro["--background"])
  })
})

// O par `--X` / `--X-foreground` existe para ser usado JUNTO: todo componente do
// shadcn escreve `bg-accent text-accent-foreground`. Se o par não passa no piso
// da WCAG, o defeito atinge todo menu, todo hover e toda seleção do app de uma
// vez — que foi exatamente o caso do `--accent` no tema claro (2,76:1).
describe("todo par fundo/texto do tema se lê", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

  for (const tema of [":root", ".dark"]) {
    it(`${tema}: nenhum par fica abaixo de ${PISO_TEXTO}:1`, () => {
      const t = tokensDoBloco(css, tema)
      const falhas: string[] = []
      for (const chave of Object.keys(t)) {
        if (!chave.endsWith("-foreground")) continue
        const fundo = t[chave.replace(/-foreground$/, "")]
        if (!fundo) continue
        const r = contrasteEntreOklch(fundo, t[chave])
        if (r !== null && r < PISO_TEXTO) falhas.push(`${chave} → ${r.toFixed(2)}:1`)
      }
      expect(falhas).toEqual([])
    })
  }
})
