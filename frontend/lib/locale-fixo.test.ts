import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"

// Locale escrito à mão é a tradução vazando por baixo.
//
// A tela fica traduzida, o texto muda de idioma — e a DATA continua em
// português. Aconteceu três vezes em dois dias, sempre do mesmo jeito e sempre
// ao lado de uma linha que já usava o dicionário:
//
// · a prévia do importador de .ics dizia "28 de ago." com o app em inglês;
// · a data dos convites de Amigos dizia "sáb., 28/09";
// · o nome do mês, na visão de ano do calendário, ficava em português — na
//   linha DEBAIXO dele os dias da semana já vinham do dicionário.
//
// Nenhum teste pegava, porque não há o que quebrar: a função existe, devolve
// string e a tela renderiza. Só está na língua errada.
//
// A regra: quem formata data ou hora usa `useLocale()` (ou o `LOCALE` de
// lib/i18n), nunca a string. As exceções são nomeadas abaixo, uma por uma —
// cada entrada é uma promessa de que ali o locale fixo é a decisão certa.
//
// AST e não regex: "pt-BR" aparece em comentário em cinco arquivos (inclusive
// neste), e regex não distingue comentário de código.

const RAIZ = process.cwd()
const PASTAS = ["app", "components", "lib", "hooks"]

/**
 * Só a forma COMPLETA. `"pt"` e `"en"` sozinhos são o tipo `Idioma`, usado em
 * comparação e em valor padrão por todo o app — flagrá-los seria ruído. O que
 * estraga a data é o locale inteiro.
 */
const LOCALES = new Set(["pt-BR", "en-US"])

/**
 * Onde o locale fixo é legítimo. A chave é o caminho do arquivo; o valor é o
 * motivo, que fica registrado aqui em vez de sumir no histórico.
 */
const PERMITIDOS: Record<string, string> = {
  "lib/i18n.ts": "a tabela LOCALE — é a fonte única de onde todos os outros leem",
  "app/layout.tsx": "o <html lang> do servidor, que não sabe a escolha de quem vai abrir (ver useSincronizarLangDoDocumento)",
  "app/global-error.tsx": "mesma coisa, na tela de erro — ali nem há React para corrigir depois",
  "app/admin/page.tsx": "painel do dono: uma pessoa só o abre, e ela fala português",
  "components/errors-panel.tsx": "idem — painel de erros do dono",
  "components/voice-conversation.tsx":
    "o `lang` da Web Speech API (voz e reconhecimento). É um locale de VOZ, não de texto, e vai junto com a fatia da Neuro IA",
}

function arquivos(dir: string, saida: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "inspirações") continue
    const caminho = join(dir, e.name)
    if (e.isDirectory()) arquivos(caminho, saida)
    else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) saida.push(caminho)
  }
  return saida
}

/** Caminho relativo com barra normal, para a chave bater nos dois sistemas. */
const chave = (caminho: string) => relative(RAIZ, caminho).split("\\").join("/")

/** Os literais de string do arquivo que são um locale — só código, sem comentário. */
function locaisFixos(caminho: string): { linha: number; texto: string }[] {
  const codigo = readFileSync(caminho, "utf8")
  const fonte = ts.createSourceFile(caminho, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: { linha: number; texto: string }[] = []
  const olha = (n: ts.Node) => {
    if (ts.isStringLiteral(n) && LOCALES.has(n.text)) {
      achados.push({ linha: fonte.getLineAndCharacterOfPosition(n.getStart(fonte)).line + 1, texto: n.text })
    }
    ts.forEachChild(n, olha)
  }
  ts.forEachChild(fonte, olha)
  return achados
}

describe("locale escrito à mão", () => {
  const todos = PASTAS.flatMap((p) => arquivos(join(RAIZ, p)))

  it("a varredura acha arquivos (senão ela passa por não olhar nada)", () => {
    expect(todos.length).toBeGreaterThan(80)
  })

  it("nenhum arquivo novo escreve o locale à mão", () => {
    const infratores: string[] = []
    for (const caminho of todos) {
      const rel = chave(caminho)
      if (PERMITIDOS[rel]) continue
      for (const { linha, texto } of locaisFixos(caminho)) {
        infratores.push(`${rel}:${linha} tem "${texto}" — use useLocale()`)
      }
    }
    expect(infratores).toEqual([])
  })

  // Exceção que deixou de ser usada é exceção que envelhece: alguém lê a lista,
  // acha que aquele arquivo pode, e volta a escrever o locale à mão.
  it("toda exceção da lista ainda tem um locale fixo de verdade", () => {
    for (const rel of Object.keys(PERMITIDOS)) {
      const caminho = join(RAIZ, rel)
      expect(locaisFixos(caminho).length, `${rel} já não precisa da exceção`).toBeGreaterThan(0)
    }
  })
})
