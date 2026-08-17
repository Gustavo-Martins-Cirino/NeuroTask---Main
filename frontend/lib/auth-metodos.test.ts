import { describe, it, expect } from "vitest"
import {
  provedoresHabilitados,
  lembrarMetodo,
  metodoLembrado,
  CHAVE_ULTIMO_METODO,
  PROVEDORES,
  type DepositoSimples,
} from "./auth-metodos"

function depositoFalso(inicial: Record<string, string> = {}): DepositoSimples {
  const dados = { ...inicial }
  return {
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = v
    },
  }
}

const depositoQueEstoura: DepositoSimples = {
  getItem() {
    throw new Error("SecurityError")
  },
  setItem() {
    throw new Error("QuotaExceededError")
  },
}

describe("provedoresHabilitados", () => {
  it("env vazia não liga nada — o padrão é a tela de hoje", () => {
    for (const v of ["", "   ", null, undefined]) {
      expect(provedoresHabilitados(v)).toEqual([])
    }
  })

  it("lê um e vários", () => {
    expect(provedoresHabilitados("google")).toEqual(["google"])
    expect(provedoresHabilitados("google,github")).toEqual(["google", "github"])
  })

  it("perdoa espaço, caixa e vírgula sobrando", () => {
    expect(provedoresHabilitados("  GOOGLE , GitHub ,, ")).toEqual(["google", "github"])
  })

  it("a ordem é sempre a mesma, não a da env", () => {
    // Botão de login é memória muscular: não pode trocar de lugar porque
    // alguém digitou a env em outra ordem.
    expect(provedoresHabilitados("github,google")).toEqual(["google", "github"])
    expect(provedoresHabilitados("apple,github,google")).toEqual([...PROVEDORES])
  })

  it("ignora o que não sabemos ligar, em vez de renderizar um botão morto", () => {
    expect(provedoresHabilitados("facebook,twitter")).toEqual([])
    expect(provedoresHabilitados("google,facebook")).toEqual(["google"])
  })

  it("repetido não vira dois botões", () => {
    expect(provedoresHabilitados("google,google,GOOGLE")).toEqual(["google"])
  })
})

describe("memória do último método", () => {
  it("guarda e devolve", () => {
    const d = depositoFalso()
    lembrarMetodo("google", d)
    expect(metodoLembrado(d)).toBe("google")
    lembrarMetodo("senha", d)
    expect(metodoLembrado(d)).toBe("senha")
  })

  it("depósito vazio não lembra de nada", () => {
    expect(metodoLembrado(depositoFalso())).toBeNull()
  })

  it("valor estranho vira null — selo não pode apontar para botão que não existe", () => {
    // Provedor desligado depois, versão antiga do app, lixo no localStorage.
    for (const v of ["facebook", "", "null", "{}"]) {
      expect(metodoLembrado(depositoFalso({ [CHAVE_ULTIMO_METODO]: v }))).toBeNull()
    }
  })

  it("localStorage que estoura não derruba a tela de entrada", () => {
    // Safari em janela privada estoura só de encostar no localStorage.
    expect(() => lembrarMetodo("google", depositoQueEstoura)).not.toThrow()
    expect(metodoLembrado(depositoQueEstoura)).toBeNull()
  })

  it("sem depósito nenhum (SSR) também não estoura", () => {
    expect(() => lembrarMetodo("google", null)).not.toThrow()
    expect(metodoLembrado(null)).toBeNull()
  })

  it("todo provedor da lista sobrevive à ida e volta", () => {
    for (const p of PROVEDORES) {
      const d = depositoFalso()
      lembrarMetodo(p, d)
      expect(metodoLembrado(d)).toBe(p)
    }
  })
})
