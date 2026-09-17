import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"

// Texto escrito direto no JSX é a tradução vazando por cima.
//
// Em 14/09 a tradução foi dada como completa, e era verdade para as TELAS que
// entraram nas fatias. Uma varredura do AST no dia seguinte achou 205 textos
// soltos em 30 arquivos — e o que mais pesava era o que não mora em tela
// nenhuma: o menu do cabeçalho, o botão de feedback, o Modo Foco, o login. Nada
// pegava, porque `i18n.test.ts` confere o DICIONÁRIO e `locale-fixo.test.ts`
// confere a DATA; nenhum olhava o JSX, que é onde uma frase escapa com mais
// facilidade.
//
// A regra: texto que a pessoa lê sai de `useDicionario()`. Vale para o texto
// entre tags e para os atributos que aparecem na tela ou para o leitor de tela.
//
// O que ela NÃO enxerga, e é bom saber: texto dentro de `toast(...)`, de arrays
// de rótulos e de atributos passados por expressão (`title={"..."}`). E
// `components/ui` fica de fora — é o shadcn gerado.

const RAIZ = process.cwd()
const PASTAS = ["app", "components"]
const ATRIBUTOS_VISIVEIS = new Set(["title", "placeholder", "aria-label", "alt", "label"])

/** Arquivos que não passam pelo dicionário, e por quê. */
const ARQUIVO_INTEIRO: Record<string, string> = {
  "app/admin/page.tsx": "painel do dono: uma pessoa só o abre, e ela fala português (mesma régua do locale-fixo)",
  "components/errors-panel.tsx": "idem — o painel de erros do dono em Configurações",
}

/** Textos que são iguais em qualquer idioma. Casam o texto INTEIRO, nunca um pedaço. */
const TEXTOS_LIVRES: Record<string, string> = {
  NeuroTask: "a marca",
  YouTube: "a marca",
  Lvl: "abreviação igual nos dois idiomas (ver i18n.test.ts)",
  XP: "unidade do jogo",
  min: "abreviação de minutos, igual em português e inglês",
  A: "a amostra de tamanho de fonte na barra do editor de notas",
  "/start": "o comando do bot do Telegram",
  z: "o 'z' de sono do robozinho desmontado",
}

/**
 * O que AINDA não foi traduzido. A lista só encolhe: cada fatia tira os seus
 * arquivos daqui, e o penúltimo teste quebra se alguém esquecer de tirar um que
 * já está limpo — lista do que falta que envelhece é alguém achando que ali
 * pode.
 */
const PENDENTES: Record<string, string> = {
  "app/error.tsx": "fatia das telas de erro",
  "app/app/error.tsx": "fatia das telas de erro",
  "app/global-error.tsx": "fatia das telas de erro",
  "app/not-found.tsx": "fatia das telas de erro",
}

/** Caminho relativo com barra normal, para a chave bater nos dois sistemas. */
function chave(caminho: string): string {
  return relative(RAIZ, caminho).split("\\").join("/")
}

function arquivos(dir: string, saida: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "inspirações") continue
    const caminho = join(dir, e.name)
    if (e.isDirectory()) {
      if (chave(caminho) === "components/ui") continue
      arquivos(caminho, saida)
    } else if (e.name.endsWith(".tsx") && !e.name.includes(".test.")) {
      saida.push(caminho)
    }
  }
  return saida
}

const temLetra = (t: string) => /[A-Za-zÀ-ÿ]/.test(t)

/** Os textos que a pessoa leria e que foram escritos à mão, fora da lista livre. */
function textosSoltos(caminho: string): { linha: number; texto: string }[] {
  const fonte = ts.createSourceFile(caminho, readFileSync(caminho, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: { linha: number; texto: string }[] = []
  const anota = (n: ts.Node, bruto: string) => {
    const texto = bruto.replace(/\s+/g, " ").trim()
    if (temLetra(texto) && !(texto in TEXTOS_LIVRES)) {
      achados.push({ linha: fonte.getLineAndCharacterOfPosition(n.getStart(fonte)).line + 1, texto })
    }
  }
  const olha = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      anota(n, n.text)
    } else if (
      ts.isJsxAttribute(n) &&
      n.initializer &&
      ts.isStringLiteral(n.initializer) &&
      ATRIBUTOS_VISIVEIS.has(n.name.getText(fonte))
    ) {
      anota(n, n.initializer.text)
    }
    ts.forEachChild(n, olha)
  }
  ts.forEachChild(fonte, olha)
  return achados
}

describe("texto solto no JSX", () => {
  const todos = PASTAS.flatMap((p) => arquivos(join(RAIZ, p)))

  it("a varredura acha arquivos (senão ela passa por não olhar nada)", () => {
    expect(todos.length).toBeGreaterThan(60)
  })

  it("nenhum arquivo fora da lista de pendentes tem texto escrito à mão", () => {
    const infratores: string[] = []
    for (const caminho of todos) {
      const rel = chave(caminho)
      if (ARQUIVO_INTEIRO[rel] || PENDENTES[rel]) continue
      for (const { linha, texto } of textosSoltos(caminho)) {
        infratores.push(`${rel}:${linha} "${texto.slice(0, 60)}" — use useDicionario()`)
      }
    }
    expect(infratores).toEqual([])
  })

  it("todo pendente ainda tem texto solto — o que já foi traduzido sai da lista", () => {
    for (const rel of Object.keys(PENDENTES)) {
      expect(textosSoltos(join(RAIZ, rel)).length, `${rel} já está limpo: tire-o de PENDENTES`).toBeGreaterThan(0)
    }
  })

  it("toda exceção de arquivo inteiro ainda tem texto — senão ela envelheceu", () => {
    for (const rel of Object.keys(ARQUIVO_INTEIRO)) {
      expect(textosSoltos(join(RAIZ, rel)).length, `${rel} já não precisa da exceção`).toBeGreaterThan(0)
    }
  })
})
