import { describe, it, expect } from "vitest"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

// Som na lista sem o arquivo em `public/sounds` é um botão que não faz nada. Não
// quebra, não avisa, não loga: a pessoa clica, não ouve, e conclui que o app é
// meia-boca. Foi o caso de "Vinil (chiado)" — que o Gustavo notou — e de
// "Oldies · Rádio antigo", que ninguém tinha visto.
//
// Mesma ideia do teste do catálogo da loja: as duas metades da feature moram em
// pastas diferentes, e nenhum gate olhava as duas juntas.

const RAIZ = process.cwd()

function declarados(): { label: string; src: string }[] {
  const src = readFileSync(join(RAIZ, "components", "sound-mixer.tsx"), "utf8")
  return [...src.matchAll(/\{ id: "[^"]+", label: "([^"]+)", src: "([^"]+)"/g)]
    .map((m) => ({ label: m[1], src: m[2] }))
}

describe("sons do mixer", () => {
  it("todo som declarado tem o arquivo dele", () => {
    const semArquivo = declarados()
      .filter((s) => !existsSync(join(RAIZ, "public", s.src)))
      .map((s) => `${s.label} → ${s.src}`)
    expect(semArquivo).toEqual([])
  })

  it("nenhum mp3 fica na pasta sem estar na lista — arquivo órfão é peso morto", () => {
    const usados = new Set(declarados().map((s) => s.src.replace("/sounds/", "")))
    const orfaos = readdirSync(join(RAIZ, "public", "sounds"))
      .filter((f) => f.endsWith(".mp3") && !usados.has(f))
    expect(orfaos).toEqual([])
  })

  it("a leitura encontrou sons de verdade — senão o teste passa por engano", () => {
    expect(declarados().length).toBeGreaterThan(15)
  })
})
