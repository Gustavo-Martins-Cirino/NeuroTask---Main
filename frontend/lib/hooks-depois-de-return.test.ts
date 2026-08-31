import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

// Hook chamado DEPOIS de uma saída antecipada é o React #310 esperando
// acontecer: a primeira renderização conta N hooks, a seguinte conta N+1, e o
// React derruba a árvore inteira para a tela de erro.
//
// Aconteceu de verdade em 28/08: um `useEffect` posto abaixo de
// `if (!pergunta) return null` na enquete derrubava o DASHBOARD sempre que a
// pergunta chegava. Passou por tsc, por 684 testes e por `next build` — porque
// nenhum deles olha ordem de hook, e o projeto não tem eslint.
//
// Esta é a regra `react-hooks/rules-of-hooks` na parte que importa, escrita com
// o compilador do TypeScript (que já é dependência) em vez de uma toolchain
// nova. AST e não regex: regex confunde `return` dentro de callback com saída
// do componente, e enche de falso positivo.

const RAIZ = process.cwd()
const PASTAS = ["components", "app"]

function arquivosTsx(dir: string, saida: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) arquivosTsx(caminho, saida)
    else if (e.name.endsWith(".tsx")) saida.push(caminho)
  }
  return saida
}

const EH_HOOK = /^use[A-Z]/
/** A barra do Windows, escrita assim para não depender de escape no arquivo. */
const BARRA = String.fromCharCode(92)

/** Percorre só o corpo IMEDIATO: hook dentro de callback aninhado não conta. */
function analisaCorpo(corpo: ts.Block, arquivo: string, fonte: ts.SourceFile): string[] {
  const problemas: string[] = []
  let saidaNaLinha: number | null = null

  const chamaHook = (no: ts.Node): string | null => {
    let achado: string | null = null
    const olha = (n: ts.Node) => {
      if (achado) return
      // Não desce em função aninhada: o hook dela é problema dela.
      if (ts.isFunctionLike(n) && n !== no) return
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && EH_HOOK.test(n.expression.text)) {
        achado = n.expression.text
        return
      }
      ts.forEachChild(n, olha)
    }
    ts.forEachChild(no, olha)
    return achado
  }

  for (const st of corpo.statements) {
    if (saidaNaLinha === null && ts.isReturnStatement(st)) {
      saidaNaLinha = fonte.getLineAndCharacterOfPosition(st.getStart(fonte)).line + 1
      continue
    }
    // `if (x) return null` numa linha só, e `if (x) { return null }`
    if (saidaNaLinha === null && ts.isIfStatement(st) && !st.elseStatement) {
      const dentro = ts.isBlock(st.thenStatement) ? st.thenStatement.statements : [st.thenStatement]
      if (dentro.length === 1 && ts.isReturnStatement(dentro[0])) {
        saidaNaLinha = fonte.getLineAndCharacterOfPosition(st.getStart(fonte)).line + 1
        continue
      }
    }
    if (saidaNaLinha === null) continue
    const hook = chamaHook(st)
    if (hook) {
      const linha = fonte.getLineAndCharacterOfPosition(st.getStart(fonte)).line + 1
      const rel = arquivo.slice(RAIZ.length + 1).split(BARRA).join("/")
      problemas.push(`${rel}:${linha} — ${hook}() depois da saída da linha ${saidaNaLinha}`)
    }
  }
  return problemas
}

function varre(arquivo: string): string[] {
  const texto = readFileSync(arquivo, "utf8")
  const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const problemas: string[] = []
  const olha = (no: ts.Node) => {
    // Componente = função com nome em Maiúscula. É a mesma heurística do eslint.
    let nome: string | undefined
    let corpo: ts.Block | undefined
    if (ts.isFunctionDeclaration(no) && no.name && no.body) { nome = no.name.text; corpo = no.body }
    else if (ts.isVariableDeclaration(no) && ts.isIdentifier(no.name) && no.initializer
      && (ts.isArrowFunction(no.initializer) || ts.isFunctionExpression(no.initializer))
      && no.initializer.body && ts.isBlock(no.initializer.body)) {
      nome = no.name.text; corpo = no.initializer.body
    }
    if (nome && corpo && /^[A-Z]/.test(nome)) problemas.push(...analisaCorpo(corpo, arquivo, fonte))
    ts.forEachChild(no, olha)
  }
  ts.forEachChild(fonte, olha)
  return problemas
}

describe("ordem dos hooks", () => {
  const arquivos = PASTAS.flatMap((p) => arquivosTsx(join(RAIZ, p)))

  it("nenhum componente chama hook depois de uma saída antecipada", () => {
    expect(arquivos.flatMap(varre)).toEqual([])
  })

  it("a varredura encontrou componentes de verdade — senão passa por engano", () => {
    expect(arquivos.length).toBeGreaterThan(40)
  })
})
