import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { CATALOG } from "./shop"

// Item na loja sem linha em `shop_items` compila, sobe, aparece na vitrine — e
// só falha na hora da COMPRA, com ITEM_INEXISTENTE. Já aconteceu duas vezes: com
// o beagle (a mensagem mandava rodar o SQL errado) e com os pisos e paredes
// novos. É o tipo de erro que nenhum teste do frontend pegava porque a metade
// que falta mora noutra pasta.
//
// Aqui as duas metades se encontram. Não é conferência de BANCO — é conferência
// de REPOSITÓRIO: existe um SQL que insere este id? Se existe e ninguém rodou, a
// culpa é do passo manual, e o README diz qual arquivo é.

const PASTA_SQL = join(process.cwd(), "..", "supabase")

function idsInseridosNoSql(): Map<string, string> {
  const porId = new Map<string, string>()
  for (const arquivo of readdirSync(PASTA_SQL).filter((f) => f.endsWith(".sql"))) {
    const texto = readFileSync(join(PASTA_SQL, arquivo), "utf8")
    if (!texto.includes("shop_items")) continue
    // Linhas de VALUES: ('id', 'Nome', preço, 'categoria')
    for (const m of texto.matchAll(/\(\s*'([a-z0-9-]+)'\s*,/g)) {
      if (!porId.has(m[1])) porId.set(m[1], arquivo)
    }
  }
  return porId
}

describe("catálogo da loja × SQL", () => {
  it("todo item da loja tem uma linha de insert em algum .sql", () => {
    const noSql = idsInseridosNoSql()
    const semLinha = CATALOG.filter((i) => !noSql.has(i.id)).map((i) => i.id)
    expect(semLinha).toEqual([])
  })

  it("a lista de SQLs encontrada não está vazia — senão o teste passa por engano", () => {
    // Sem esta trava, mudar a pasta de lugar faria o teste acima virar um
    // "nenhum item, nenhum problema" e parar de proteger qualquer coisa.
    expect(idsInseridosNoSql().size).toBeGreaterThan(20)
    expect(CATALOG.length).toBeGreaterThan(20)
  })
})
