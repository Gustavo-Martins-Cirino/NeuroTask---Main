import { describe, it, expect } from "vitest"
import {
  parseAvatarModo, resolverModo, modosDisponiveis, AVATAR_MODO_PADRAO,
} from "./avatar-modo"

// O risco aqui é o avatar SUMIR: escolher a foto e depois removê-la, ou escolher
// o bonequinho e nunca ter montado um. Em nenhum caso pode sobrar um buraco no
// header — as iniciais são o fim da linha, sempre.

describe("parseAvatarModo", () => {
  it("aceita os três modos", () => {
    expect(parseAvatarModo("foto")).toBe("foto")
    expect(parseAvatarModo("boneco")).toBe("boneco")
    expect(parseAvatarModo("iniciais")).toBe("iniciais")
  })

  it("lixo, nulo ou ausente caem no padrão", () => {
    for (const v of [null, undefined, "", "avatar", 42, {}]) {
      expect(parseAvatarModo(v)).toBe(AVATAR_MODO_PADRAO)
    }
  })
})

describe("resolverModo", () => {
  const tudo = { temFoto: true, temBoneco: true }
  const nada = { temFoto: false, temBoneco: false }

  it("respeita a escolha quando ela existe", () => {
    expect(resolverModo("foto", tudo)).toBe("foto")
    expect(resolverModo("boneco", tudo)).toBe("boneco")
    expect(resolverModo("iniciais", tudo)).toBe("iniciais")
  })

  it("iniciais funcionam mesmo sem foto e sem bonequinho", () => {
    expect(resolverModo("iniciais", nada)).toBe("iniciais")
  })

  it("escolheu a foto e ela foi removida: cai no bonequinho, não nas iniciais", () => {
    expect(resolverModo("foto", { temFoto: false, temBoneco: true })).toBe("boneco")
  })

  it("escolheu o bonequinho sem ter montado um: cai na foto se houver", () => {
    expect(resolverModo("boneco", { temFoto: true, temBoneco: false })).toBe("foto")
  })

  it("nunca devolve um modo sem conteúdo — o avatar não some", () => {
    for (const escolhido of ["foto", "boneco", "iniciais"] as const) {
      for (const temFoto of [true, false]) {
        for (const temBoneco of [true, false]) {
          const r = resolverModo(escolhido, { temFoto, temBoneco })
          if (r === "foto") expect(temFoto).toBe(true)
          if (r === "boneco") expect(temBoneco).toBe(true)
        }
      }
    }
  })
})

describe("modosDisponiveis", () => {
  it("lista só o que dá para escolher de verdade", () => {
    expect(modosDisponiveis({ temFoto: true, temBoneco: true })).toEqual(["foto", "boneco", "iniciais"])
    expect(modosDisponiveis({ temFoto: false, temBoneco: true })).toEqual(["boneco", "iniciais"])
    expect(modosDisponiveis({ temFoto: false, temBoneco: false })).toEqual(["iniciais"])
  })

  it("as iniciais estão sempre na lista", () => {
    for (const temFoto of [true, false]) {
      for (const temBoneco of [true, false]) {
        expect(modosDisponiveis({ temFoto, temBoneco })).toContain("iniciais")
      }
    }
  })
})
