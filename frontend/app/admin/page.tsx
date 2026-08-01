import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { montaUsuarios, contaAtivosDesde, contaPorChave, ordenaContagens, type AdminUser } from "@/lib/admin"
import { ShieldCheck, MessageSquare, Users, AlertTriangle, Activity, ArrowLeft, Bug, Lightbulb, MessageCircle } from "lucide-react"

// Painel do DONO (/admin): feedbacks, usuários, erros e uso num lugar só.
// O portão é do lado do SERVIDOR — quem não é OWNER_EMAIL recebe 404 e nunca
// chega a receber os dados (diferente do ErrorsPanel, que só some da tela).
// Lê tudo pela service role: RLS aqui atrapalharia de propósito (feedback não
// tem policy de select, e ninguém deve ver os dados de outra pessoa pelo app).

export const dynamic = "force-dynamic"

const DIA_MS = 86_400_000

interface FeedbackRow {
  id: string
  user_id: string | null
  message: string
  kind: string
  route: string | null
  commit: string | null
  created_at: string
}

interface ErroRow {
  id: string
  mensagem: string
  rota: string | null
  origem: string
  commit_sha: string | null
  criado_em: string
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

const ICONE_KIND: Record<string, typeof Bug> = { bug: Bug, ideia: Lightbulb, geral: MessageCircle }
const ROTULO_KIND: Record<string, string> = { bug: "Problema", ideia: "Ideia", geral: "Outro" }

function Secao({ icon, title, hint, children }: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card/30 p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Numero({ label, valor, detalhe }: { label: string; valor: number | string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{valor}</p>
      {detalhe && <p className="text-[11px] text-muted-foreground/70">{detalhe}</p>}
    </div>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">{children}</p>
}

export default async function AdminPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
  if (!supabaseUrl || !serviceKey || !ownerEmail) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || user.email.toLowerCase() !== ownerEmail) notFound()

  const db = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const desde = (ms: number) => new Date(Date.now() - ms).toISOString()

  const [
    authR, perfisR, statsR, feedbackR, errosR,
    tarefasR, tarefasFeitasR, blocosR, notasR,
  ] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
    db.from("profiles").select("user_id, username, display_name"),
    db.from("user_stats").select("user_id, total_xp"),
    db.from("feedback").select("id, user_id, message, kind, route, commit, created_at").order("created_at", { ascending: false }).limit(100),
    db.from("error_log").select("id, mensagem, rota, origem, commit_sha, criado_em").order("criado_em", { ascending: false }).limit(50),
    db.from("tasks").select("id", { count: "exact", head: true }),
    db.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
    db.from("time_blocks").select("id", { count: "exact", head: true }),
    db.from("notes").select("id", { count: "exact", head: true }),
  ])

  const usuarios = montaUsuarios(authR.data?.users ?? [], perfisR.data ?? [], statsR.data ?? [])
  const feedbacks = (feedbackR.data ?? []) as FeedbackRow[]
  const erros = (errosR.data ?? []) as ErroRow[]

  const ativos7 = contaAtivosDesde(usuarios, new Date(Date.now() - 7 * DIA_MS))
  const ativos1 = contaAtivosDesde(usuarios, new Date(Date.now() - DIA_MS))
  const novos7 = usuarios.filter((u) => u.createdAt >= desde(7 * DIA_MS)).length
  const erros24 = erros.filter((e) => e.criado_em >= desde(DIA_MS)).length
  const rotasQuebradas = ordenaContagens(contaPorChave(erros, (e) => e.rota), 5)
  const porTipo = contaPorChave(feedbacks, (f) => f.kind)

  // O e-mail é o que dá nome a quem mandou feedback (a tabela só guarda o id).
  const emailPorId = new Map(usuarios.map((u) => [u.id, u.username ? `@${u.username}` : u.email ?? u.id.slice(0, 8)]))

  const tarefas = tarefasR.count ?? 0
  const tarefasFeitas = tarefasFeitasR.count ?? 0

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">Painel do dono</h1>
              <p className="text-sm text-muted-foreground">Visível só para {ownerEmail}</p>
            </div>
          </div>
          <Link
            href="/app"
            className="flex h-9 items-center gap-2 rounded-lg border border-border/50 px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao app
          </Link>
        </div>

        <Secao icon={<Activity className="h-5 w-5" />} title="Adoção" hint="O que importa na Fase 5: alguém voltando sozinho">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Numero label="Contas" valor={usuarios.length} detalhe={`${novos7} nos últimos 7 dias`} />
            <Numero label="Ativos (7 dias)" valor={ativos7} detalhe={`${ativos1} nas últimas 24h`} />
            <Numero label="Feedbacks" valor={feedbacks.length} detalhe="últimos 100" />
            <Numero label="Erros (24h)" valor={erros24} detalhe={`${erros.length} recentes no total`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Numero label="Tarefas" valor={tarefas} detalhe={`${tarefasFeitas} concluídas`} />
            <Numero label="Blocos de tempo" valor={blocosR.count ?? 0} />
            <Numero label="Notas" valor={notasR.count ?? 0} />
            <Numero
              label="Conclusão"
              valor={tarefas > 0 ? `${Math.round((tarefasFeitas / tarefas) * 100)}%` : "—"}
              detalhe="tarefas concluídas"
            />
          </div>
        </Secao>

        <Secao icon={<MessageSquare className="h-5 w-5" />} title="Feedbacks" hint="Com a rota e a versão de quando aconteceu">
          {feedbacks.length === 0 ? (
            <Vazio>Nenhum feedback ainda.</Vazio>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(porTipo).map(([tipo, total]) => (
                  <span key={tipo} className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                    {ROTULO_KIND[tipo] ?? tipo}: <b className="text-foreground">{total}</b>
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {feedbacks.map((f) => {
                  const Icone = ICONE_KIND[f.kind] ?? MessageCircle
                  return (
                    <div key={f.id} className="rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icone className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium text-foreground">{ROTULO_KIND[f.kind] ?? f.kind}</span>
                        <span>·</span>
                        <span className="truncate">{f.user_id ? emailPorId.get(f.user_id) ?? "?" : "deslogado"}</span>
                        <span className="ml-auto shrink-0">{fmt(f.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{f.message}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground/70">
                        {f.route ?? "?"} · versão {f.commit ?? "?"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Secao>

        <Secao icon={<Users className="h-5 w-5" />} title="Usuários" hint="Quem criou conta e quando voltou pela última vez">
          {usuarios.length === 0 ? (
            <Vazio>Nenhuma conta ainda.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Usuário</th>
                    <th className="pb-2 font-medium">Cadastro</th>
                    <th className="pb-2 font-medium">Último acesso</th>
                    <th className="pb-2 text-right font-medium">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u: AdminUser) => (
                    <tr key={u.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block truncate font-medium text-foreground">{u.displayName ?? u.email ?? "?"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {u.username ? `@${u.username}` : u.email ?? ""}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{fmt(u.createdAt)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {u.lastSignInAt ? fmt(u.lastSignInAt) : "nunca entrou"}
                      </td>
                      <td className="py-2 text-right tabular-nums text-foreground">
                        {u.level}
                        <span className="ml-1 text-xs text-muted-foreground">({u.totalXp} XP)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>

        <Secao icon={<AlertTriangle className="h-5 w-5" />} title="Erros" hint="O que quebrou na mão de quem está testando">
          {erros.length === 0 ? (
            <Vazio>Nenhum erro registrado. 🎉</Vazio>
          ) : (
            <>
              {rotasQuebradas.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {rotasQuebradas.map((r) => (
                    <span key={r.nome} className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                      {r.nome}: <b className="text-foreground">{r.total}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {erros.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border/50 p-3">
                    <p className="truncate text-sm text-foreground" title={e.mensagem}>{e.mensagem}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {e.rota ?? "?"} · {e.origem} · versão {e.commit_sha ?? "?"} · {fmt(e.criado_em)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Secao>
      </div>
    </div>
  )
}
