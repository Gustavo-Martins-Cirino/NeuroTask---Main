import { describe, it, expect } from "vitest"
import { montaUsuarios, contaAtivosDesde, contaPorChave, ordenaContagens } from "./admin"

// O painel do dono é o que responde "alguém está usando isso?". Se ele juntar
// os dados errado, a resposta vem errada e a decisão de produto vai junto —
// por isso o que se testa aqui é o CRUZAMENTO das três fontes, não o formato.

const authUser = (id: string, created_at: string, extra: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@ex.com`,
  created_at,
  ...extra,
})

describe("montaUsuarios — cruza auth.users, profiles e user_stats", () => {
  it("mantém quem ainda não tem perfil nem stats", () => {
    const users = montaUsuarios([authUser("a", "2026-01-01T00:00:00Z")], [], [])
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ username: null, displayName: null, totalXp: 0, level: 1 })
  })

  it("junta perfil e XP pelo user_id", () => {
    const users = montaUsuarios(
      [authUser("a", "2026-01-01T00:00:00Z")],
      [{ user_id: "a", username: "gus", display_name: "Gustavo" }],
      [{ user_id: "a", total_xp: 250 }]
    )
    expect(users[0]).toMatchObject({ username: "gus", displayName: "Gustavo", totalXp: 250, level: 3 })
  })

  it("não mistura dados entre usuários diferentes", () => {
    const users = montaUsuarios(
      [authUser("a", "2026-01-02T00:00:00Z"), authUser("b", "2026-01-01T00:00:00Z")],
      [{ user_id: "b", username: "outro" }],
      [{ user_id: "b", total_xp: 100 }]
    )
    const a = users.find((u) => u.id === "a")!
    const b = users.find((u) => u.id === "b")!
    expect(a.username).toBeNull()
    expect(a.totalXp).toBe(0)
    expect(b.username).toBe("outro")
    expect(b.totalXp).toBe(100)
  })

  it("ordena do cadastro mais recente para o mais antigo", () => {
    const users = montaUsuarios(
      [authUser("velho", "2025-01-01T00:00:00Z"), authUser("novo", "2026-06-01T00:00:00Z")],
      [],
      []
    )
    expect(users.map((u) => u.id)).toEqual(["novo", "velho"])
  })

  it("trata XP negativo (dado corrompido) como zero, sem nível 0 ou negativo", () => {
    const users = montaUsuarios([authUser("a", "2026-01-01T00:00:00Z")], [], [{ user_id: "a", total_xp: -500 }])
    expect(users[0].totalXp).toBe(0)
    expect(users[0].level).toBe(1)
  })
})

describe("contaAtivosDesde — quem realmente voltou", () => {
  const base = (lastSignIn: string | null) =>
    montaUsuarios([authUser("a", "2026-01-01T00:00:00Z", { last_sign_in_at: lastSignIn })], [], [])

  it("não conta quem nunca logou", () => {
    expect(contaAtivosDesde(base(null), new Date("2026-01-01T00:00:00Z"))).toBe(0)
  })

  it("conta quem logou depois do limite", () => {
    expect(contaAtivosDesde(base("2026-07-30T12:00:00Z"), new Date("2026-07-24T00:00:00Z"))).toBe(1)
  })

  it("não conta quem logou antes do limite", () => {
    expect(contaAtivosDesde(base("2026-01-05T12:00:00Z"), new Date("2026-07-24T00:00:00Z"))).toBe(0)
  })

  it("ignora data inválida em vez de contar como ativo", () => {
    expect(contaAtivosDesde(base("nao-e-data"), new Date("2026-01-01T00:00:00Z"))).toBe(0)
  })
})

describe("contaPorChave e ordenaContagens", () => {
  it("agrupa e usa '?' para chave vazia ou ausente", () => {
    const contagens = contaPorChave(
      [{ rota: "/app" }, { rota: "/app" }, { rota: "" }, { rota: null }],
      (e) => e.rota
    )
    expect(contagens).toEqual({ "/app": 2, "?": 2 })
  })

  it("ordena do maior para o menor e desempata pelo nome", () => {
    const saida = ordenaContagens({ b: 1, a: 1, c: 5 })
    expect(saida).toEqual([
      { nome: "c", total: 5 },
      { nome: "a", total: 1 },
      { nome: "b", total: 1 },
    ])
  })

  it("respeita o limite de itens", () => {
    expect(ordenaContagens({ a: 3, b: 2, c: 1 }, 2)).toHaveLength(2)
  })
})
