import { describe, it, expect } from "vitest"
import {
  recorteQuadrado,
  erroDoArquivo,
  caminhoDaFoto,
  urlComCarimbo,
  explicaErroUpload,
  TAMANHO_MAXIMO_BYTES,
} from "./foto-perfil"

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

describe("erroDoArquivo", () => {
  it("aceita imagem dentro do limite", () => {
    expect(erroDoArquivo({ type: "image/png", size: 900_000 })).toBeNull()
    expect(erroDoArquivo({ type: "image/heic", size: 3_000_000 })).toBeNull()
  })

  it("recusa o que não é imagem", () => {
    expect(erroDoArquivo({ type: "application/pdf", size: 1000 })).toMatch(/imagem/i)
    expect(erroDoArquivo({ type: "video/mp4", size: 1000 })).toMatch(/imagem/i)
  })

  it("recusa imagem grande demais, e diz o limite em MB", () => {
    const erro = erroDoArquivo({ type: "image/jpeg", size: TAMANHO_MAXIMO_BYTES + 1 })
    expect(erro).toMatch(/12 MB/)
  })

  it("o limite em si passa — o erro é passar dele, não alcançá-lo", () => {
    expect(erroDoArquivo({ type: "image/jpeg", size: TAMANHO_MAXIMO_BYTES })).toBeNull()
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

describe("explicaErroUpload", () => {
  it("bucket ausente é o caso mais comum: manda rodar o SQL", () => {
    const msg = explicaErroUpload({ message: "Bucket not found", statusCode: "404" })
    expect(msg).toMatch(/foto_perfil\.sql/)
    expect(msg).not.toMatch(/bucket not found/i)
  })

  it("falta de política (RLS/403) também aponta o SQL", () => {
    expect(explicaErroUpload({ message: "new row violates row-level security policy" }))
      .toMatch(/foto_perfil\.sql/)
    expect(explicaErroUpload({ message: "Unauthorized", status: 403 }))
      .toMatch(/foto_perfil\.sql/)
  })

  it("arquivo grande demais fala do limite do bucket", () => {
    expect(explicaErroUpload({ message: "The object exceeded the maximum allowed size" }))
      .toMatch(/grande demais/)
  })

  it("mime recusado explica o formato", () => {
    expect(explicaErroUpload({ message: "mime type image/png is not allowed" }))
      .toMatch(/formato/)
  })

  it("erro desconhecido preserva a mensagem original", () => {
    expect(explicaErroUpload({ message: "algo estranho aconteceu" }))
      .toBe("algo estranho aconteceu")
  })

  it("sem mensagem nenhuma, cai num texto genérico", () => {
    expect(explicaErroUpload(null)).toMatch(/tente de novo/i)
    expect(explicaErroUpload({})).toMatch(/tente de novo/i)
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
