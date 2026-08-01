// Agregações do painel do dono (/admin). Módulo PURO de propósito: não toca
// Supabase nem rede — a rota busca, isto aqui decide. Junta o que vem de três
// lugares distintos (auth.users, profiles, user_stats) e conta o que interessa.

import { computeGamification } from "@/lib/gamification"

export interface AdminUser {
  id: string
  email: string | null
  username: string | null
  displayName: string | null
  createdAt: string
  lastSignInAt: string | null
  level: number
  totalXp: number
}

interface AuthUserRow {
  id: string
  email?: string | null
  created_at: string
  last_sign_in_at?: string | null
}

interface ProfileRow {
  user_id: string
  username?: string | null
  display_name?: string | null
}

interface StatsRow {
  user_id: string
  total_xp?: number | null
}

// auth.users é a fonte da verdade de quem existe: perfil e stats podem não ter
// nascido ainda (usuário que criou conta e não fez nada), então entram como
// opcionais e nunca somem da lista por ausência.
export function montaUsuarios(
  authUsers: AuthUserRow[],
  profiles: ProfileRow[],
  stats: StatsRow[]
): AdminUser[] {
  const porPerfil = new Map(profiles.map((p) => [p.user_id, p]))
  const porStats = new Map(stats.map((s) => [s.user_id, s]))

  return authUsers
    .map((u) => {
      const totalXp = Math.max(0, porStats.get(u.id)?.total_xp ?? 0)
      return {
        id: u.id,
        email: u.email ?? null,
        username: porPerfil.get(u.id)?.username ?? null,
        displayName: porPerfil.get(u.id)?.display_name ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        level: computeGamification(totalXp).level,
        totalXp,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// "Voltou no dia seguinte por vontade própria" é o critério de sucesso da Fase 5
// — quem nunca logou (lastSignInAt nulo) não conta como ativo.
export function contaAtivosDesde(usuarios: AdminUser[], desde: Date): number {
  const limite = desde.getTime()
  return usuarios.filter((u) => {
    if (!u.lastSignInAt) return false
    const t = new Date(u.lastSignInAt).getTime()
    return Number.isFinite(t) && t >= limite
  }).length
}

export function contaPorChave<T>(itens: T[], chave: (item: T) => string | null | undefined): Record<string, number> {
  const saida: Record<string, number> = {}
  for (const item of itens) {
    const k = chave(item)
    const nome = k && k.length > 0 ? k : "?"
    saida[nome] = (saida[nome] ?? 0) + 1
  }
  return saida
}

// Ordena um mapa de contagens do maior pro menor, com desempate estável pelo
// nome — sem isso a ordem do painel dança a cada render com contagens iguais.
export function ordenaContagens(contagens: Record<string, number>, max = 10): { nome: string; total: number }[] {
  return Object.entries(contagens)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
    .slice(0, max)
}
