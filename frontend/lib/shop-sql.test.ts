import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { CATALOG, SQL_DO_ITEM } from "./shop"

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

  // A mensagem de ITEM_INEXISTENTE manda rodar um .sql específico por item
  // (lib/shop.ts, SQL_DO_ITEM) — sem isso, quem já rodou o arquivo base recebe
  // a MESMA dica de novo e acha que já fez o passo pedido. Já aconteceu com o
  // beagle (apontava coins_shop.sql, morava em office_3d.sql) e, sem este
  // teste, teria acontecido de novo — paredes e pisos de office_v4/v5/v6.sql
  // não tinham entrada nenhuma e caíam no mesmo fallback errado.
  it("a dica de arquivo de cada item bate com o .sql onde ele REALMENTE mora", () => {
    const porId = idsInseridosNoSql()
    for (const [id, arquivoPrometido] of Object.entries(SQL_DO_ITEM)) {
      expect(porId.get(id), `${id}: não achei linha de insert em nenhum .sql`).toBeDefined()
      expect(porId.get(id), `${id}: SQL_DO_ITEM promete ${arquivoPrometido}`).toBe(arquivoPrometido)
    }
  })

  // O inverso: item que NÃO está no mapa cai no fallback "coins_shop.sql" (ver
  // erroDeCompra em lib/shop.ts). Se ele morar noutro arquivo sem entrada no
  // mapa, quem já rodou coins_shop.sql recebe a dica errada — item novo sem
  // linha em SQL_DO_ITEM só é seguro quando mora no arquivo base mesmo.
  it("todo item sem entrada em SQL_DO_ITEM mora mesmo em coins_shop.sql (o fallback)", () => {
    const porId = idsInseridosNoSql()
    for (const item of CATALOG) {
      if (item.id in SQL_DO_ITEM) continue
      expect(porId.get(item.id), `${item.id}: sem entrada em SQL_DO_ITEM e fora de coins_shop.sql`)
        .toBe("coins_shop.sql")
    }
  })
})
