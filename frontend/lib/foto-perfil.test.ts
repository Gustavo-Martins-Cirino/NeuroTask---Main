import { describe, it, expect } from "vitest"
import {
  recorteQuadrado,
  problemaDoArquivo,
  caminhoDaFoto,
  urlComCarimbo,
  motivoDoUpload,
  TAMANHO_MAXIMO_BYTES,
  TAMANHO_MAXIMO_MB,
} from "./foto-perfil"
import { pt, en } from "./i18n"

describe("recorteQuadrado", () => {
  it("imagem já quadrada não é cortada", () => {
    expect(recorteQuadrado(500, 500)).toEqual({ sx: 0, sy: 0, lado: 500 })
  })

  it("paisagem: corta as laterais em partes iguais", () => {
    expect(recorteQuadrado(1000, 600)).toEqual({ sx: 200, sy: 0, lado: 600 })
  })

  it("retrato: corta em cima e embaixo em partes iguais", () => {
    // O caso que mais importa — é assim que o celular fotografa por padrão.
    expect(recorteQuadrado(600, 1000)).toEqual({ sx: 0, sy: 200, lado: 600 })
  })

  it("o quadrado nunca escapa da imagem, em qualquer proporção", () => {
    const tamanhos: [number, number][] = [
      [1, 1], [3, 4000], [4000, 3], [1920, 1080], [1080, 1920], [999, 1000],
    ]
    for (const [l, a] of tamanhos) {
      const { sx, sy, lado } = recorteQuadrado(l, a)
      expect(sx).toBeGreaterThanOrEqual(0)
      expect(sy).toBeGreaterThanOrEqual(0)
      expect(sx + lado).toBeLessThanOrEqual(l)
      expect(sy + lado).toBeLessThanOrEqual(a)
    }
  })

  it("sobra ímpar não vira meio pixel", () => {
    // Canvas com origem fracionária borra a imagem inteira por interpolação.
    const { sx, sy, lado } = recorteQuadrado(101, 50)
    expect(Number.isInteger(sx)).toBe(true)
    expect(Number.isInteger(sy)).toBe(true)
    expect(sx + lado).toBeLessThanOrEqual(101)
  })
})

describe("problemaDoArquivo", () => {
  it("aceita imagem dentro do limite", () => {
    expect(problemaDoArquivo({ type: "image/png", size: 900_000 })).toBeNull()
    expect(problemaDoArquivo({ type: "image/heic", size: 3_000_000 })).toBeNull()
  })

  it("recusa o que não é imagem", () => {
    expect(problemaDoArquivo({ type: "application/pdf", size: 1000 })).toBe("naoEhImagem")
    expect(problemaDoArquivo({ type: "video/mp4", size: 1000 })).toBe("naoEhImagem")
  })

  // O limite em MB saiu daqui: o módulo diz QUE passou do limite, o dicionário
  // diz de quanto ele é (e o número vem de `TAMANHO_MAXIMO_MB`, logo abaixo).
  it("recusa imagem grande demais", () => {
    expect(problemaDoArquivo({ type: "image/jpeg", size: TAMANHO_MAXIMO_BYTES + 1 })).toBe("grandeDemais")
    expect(problemaDoArquivo({ type: "image/jpeg", size: TAMANHO_MAXIMO_BYTES })).toBeNull()
  })

  it("o limite em si passa — o erro é passar dele, não alcançá-lo", () => {
    expect(problemaDoArquivo({ type: "image/jpeg", size: TAMANHO_MAXIMO_BYTES })).toBeNull()
  })
})

describe("caminhoDaFoto", () => {
  it("a primeira pasta é o dono — é o que as políticas do bucket conferem", () => {
    const uid = "0f5c1a3e-1111-2222-3333-444455556666"
    expect(caminhoDaFoto(uid).split("/")[0]).toBe(uid)
  })

  it("é sempre o mesmo caminho, para trocar sobrescrever em vez de acumular", () => {
    expect(caminhoDaFoto("abc")).toBe(caminhoDaFoto("abc"))
  })
})

describe("motivoDoUpload", () => {
  it("bucket ausente é o caso mais comum", () => {
    expect(motivoDoUpload({ message: "Bucket not found", statusCode: "404" })).toEqual({ motivo: "bucketAusente" })
  })

  it("falta de política (RLS/403) tem motivo próprio", () => {
    expect(motivoDoUpload({ message: "new row violates row-level security policy" })).toEqual({
      motivo: "semPermissao",
    })
    expect(motivoDoUpload({ message: "Unauthorized", status: 403 })).toEqual({ motivo: "semPermissao" })
  })

  it("arquivo grande demais e mime recusado se separam", () => {
    expect(motivoDoUpload({ message: "The object exceeded the maximum allowed size" })).toEqual({
      motivo: "grandeDemaisNoBucket",
    })
    expect(motivoDoUpload({ message: "mime type image/png is not allowed" })).toEqual({ motivo: "formatoRecusado" })
  })

  // A mensagem crua do Storage é feia e em inglês, mas diz o que houve: ela
  // sobrevive em `cru` e é o que a tela mostra quando não há motivo conhecido.
  it("erro desconhecido preserva a mensagem original", () => {
    expect(motivoDoUpload({ message: "algo estranho aconteceu" })).toEqual({
      motivo: "desconhecido",
      cru: "algo estranho aconteceu",
    })
  })

  it("sem mensagem nenhuma, sobra só o desconhecido", () => {
    expect(motivoDoUpload(null)).toEqual({ motivo: "desconhecido", cru: undefined })
    expect(motivoDoUpload({})).toEqual({ motivo: "desconhecido", cru: undefined })
  })
})

describe("os avisos da foto, nos dois idiomas", () => {
  it("o limite em MB vem do módulo, não escrito na frase", () => {
    expect(pt.configuracoes.perfil.foto.arquivoGrande(TAMANHO_MAXIMO_MB)).toContain(String(TAMANHO_MAXIMO_MB))
    expect(en.configuracoes.perfil.foto.arquivoGrande(TAMANHO_MAXIMO_MB)).toContain(String(TAMANHO_MAXIMO_MB))
    expect(TAMANHO_MAXIMO_MB).toBe(Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024))
  })

  // Os quatro motivos do bucket dizem o que fazer, e o que fazer é rodar o SQL.
  // Quem lê isso sou eu — em qualquer idioma, o nome do arquivo é o mesmo.
  it("os motivos do bucket continuam apontando o SQL nos dois idiomas", () => {
    for (const d of [pt, en]) {
      const e = d.configuracoes.perfil.foto.erros
      expect(e.bucketAusente).toContain("foto_perfil.sql")
      expect(e.semPermissao).toContain("foto_perfil.sql")
      expect(e.grandeDemaisNoBucket).toContain("foto_perfil.sql")
      expect(e.formatoRecusado).toContain("foto_perfil.sql")
    }
  })

  it("cada motivo se diz diferente em cada idioma", () => {
    const motivos = Object.keys(pt.configuracoes.perfil.foto.erros) as (keyof typeof pt.configuracoes.perfil.foto.erros)[]
    for (const m of motivos) {
      expect(en.configuracoes.perfil.foto.erros[m], m).not.toBe(pt.configuracoes.perfil.foto.erros[m])
    }
  })
})

describe("urlComCarimbo", () => {
  it("acrescenta o carimbo quando a URL não tem query", () => {
    expect(urlComCarimbo("https://x.co/a/perfil.jpg", 42)).toBe("https://x.co/a/perfil.jpg?v=42")
  })

  it("preserva a query que já existe — sem isso o token do Storage se perderia", () => {
    expect(urlComCarimbo("https://x.co/a.jpg?token=abc", 42)).toBe("https://x.co/a.jpg?token=abc&v=42")
  })

  it("carimbos diferentes dão URLs diferentes — é o que fura o cache do navegador", () => {
    const url = "https://x.co/a/perfil.jpg"
    expect(urlComCarimbo(url, 1)).not.toBe(urlComCarimbo(url, 2))
  })
})
