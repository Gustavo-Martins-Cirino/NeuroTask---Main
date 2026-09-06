import { describe, it, expect } from "vitest"
import { iniciaisDoNome, matizDoNome } from "./iniciais"

describe("iniciaisDoNome", () => {
  it("primeiro e último nome, como na referência", () => {
    expect(iniciaisDoNome("Gustavo Cirino")).toBe("GC")
    expect(iniciaisDoNome("Carlos Augusto")).toBe("CA")
  })

  it("nome do meio não entra — é o primeiro e o ÚLTIMO", () => {
    expect(iniciaisDoNome("Gustavo Martins Cirino")).toBe("GC")
    expect(iniciaisDoNome("Ana Paula de Souza Lima")).toBe("AL")
  })

  it("partícula não vira inicial", () => {
    expect(iniciaisDoNome("Maria da Silva")).toBe("MS")
    expect(iniciaisDoNome("Gustavo de Souza")).toBe("GS")
    expect(iniciaisDoNome("Ludwig van Beethoven")).toBe("LB")
  })

  it("nome de uma palavra usa as duas primeiras letras", () => {
    expect(iniciaisDoNome("Madonna")).toBe("MA")
    expect(iniciaisDoNome("gustavo")).toBe("GU")
  })

  it("acento sai da inicial — num círculo pequeno vira borrão", () => {
    expect(iniciaisDoNome("Ângela Épsilon")).toBe("AE")
    expect(iniciaisDoNome("Çelso Único")).toBe("CU")
  })

  it("o header manda a parte do e-mail quando não há nome", () => {
    // O último recurso da cascata de lib/nome-usuario: sem `name` nem
    // `full_name`, sobra o pedaço do e-mail antes do @.
    expect(iniciaisDoNome("cirinogustavom")).toBe("CI")
    expect(iniciaisDoNome("gustavo.cirino")).toBe("GC")
    expect(iniciaisDoNome("ana_paula")).toBe("AP")
  })

  it("vazio ou lixo devolve '?' em vez de círculo em branco", () => {
    for (const n of ["", "   ", null, undefined]) {
      expect(iniciaisDoNome(n)).toBe("?")
    }
  })

  it("só partículas ainda devolve alguma coisa", () => {
    expect(iniciaisDoNome("de la")).toBe("DL")
  })

  it("uma letra só continua sendo uma letra", () => {
    expect(iniciaisDoNome("A")).toBe("A")
  })

  it("emoji no nome não é partido ao meio", () => {
    // "nome"[0] quebraria o par substituto e devolveria meio caractere.
    const r = iniciaisDoNome("🦊 Raposa")
    expect(Array.from(r).length).toBe(2)
    expect(r.endsWith("R")).toBe(true)
  })

  it("espaço sobrando não muda nada", () => {
    expect(iniciaisDoNome("  Gustavo   Cirino  ")).toBe("GC")
  })
})

describe("matizDoNome", () => {
  it("mesmo nome, sempre a mesma cor", () => {
    // Cor que muda a cada carregamento é bug aos olhos de quem usa.
    const a = matizDoNome("Gustavo Cirino")
    for (let i = 0; i < 50; i++) expect(matizDoNome("Gustavo Cirino")).toBe(a)
  })

  it("não depende de caixa nem de espaço nas pontas", () => {
    expect(matizDoNome("  gustavo cirino ")).toBe(matizDoNome("Gustavo Cirino"))
  })

  it("sempre uma matiz válida", () => {
    const nomes = ["", "A", "Gustavo Cirino", "x".repeat(500), "🦊", "Ana Silva"]
    for (const n of nomes) {
      const h = matizDoNome(n)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(360)
    }
  })

  it("nomes parecidos caem longe um do outro", () => {
    // Se "Ana Silva" e "Ana Souza" saíssem na mesma cor, o avatar não
    // distinguiria ninguém numa lista de família.
    expect(matizDoNome("Ana Silva")).not.toBe(matizDoNome("Ana Souza"))
    expect(matizDoNome("Gustavo Cirino")).not.toBe(matizDoNome("Gustavo Cirano"))
  })

  it("espalha pela roda em vez de amontoar num canto", () => {
    const nomes = Array.from({ length: 200 }, (_, i) => `Pessoa Numero${i}`)
    const fatias = new Set(nomes.map((n) => Math.floor(matizDoNome(n) / 30)))
    // 12 fatias de 30°; exigir pelo menos 10 já denuncia hash amontoado.
    expect(fatias.size).toBeGreaterThanOrEqual(10)
  })

  it("nome vazio não estoura", () => {
    expect(matizDoNome(null)).toBe(0)
    expect(matizDoNome(undefined)).toBe(0)
  })
})
