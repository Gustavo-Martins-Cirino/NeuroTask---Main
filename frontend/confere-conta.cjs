// Confere se a conta que criou as 5 tarefas sem horário é a de quem você indicar.
//
//   cd frontend && node confere-conta.cjs email@dapessoa.com
//
// Imprime SÓ o que responde a pergunta: se achou a conta, se o id dela bate com
// o que os dados apontaram, e o resumo das tarefas dela. Nunca imprime o e-mail
// de volta, nem lista outras contas, nem mostra título de tarefa nenhum.
const fs = require("fs")

const env = (n) => {
  const l = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).find((x) => x.startsWith(n + "="))
  return l ? l.slice(n.length + 1).trim().replace(/^["']|["']$/g, "") : null
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL")
const KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// O que a leitura do banco apontou como sendo, provavelmente, o Ray.
const SUSPEITA = "345f982b"

;(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase()
  if (!email) return console.log("uso: node confere-conta.cjs email@dapessoa.com")
  if (!KEY) return console.log("sem SUPABASE_SERVICE_ROLE_KEY no .env.local")

  const r = await fetch(`${URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, { headers: H })
  const j = await r.json()
  if (!r.ok) return console.log("erro na busca:", r.status)

  const achados = (j.users ?? []).filter((u) => (u.email || "").toLowerCase() === email)
  if (achados.length === 0) return console.log("nenhuma conta com esse e-mail")
  if (achados.length > 1) return console.log("mais de uma conta com esse e-mail:", achados.length)

  const u = achados[0]
  const id = u.id
  console.log("conta encontrada:", id.slice(0, 8) + "…")
  console.log("bate com a suspeita?", id.startsWith(SUSPEITA) ? "SIM" : "NÃO")
  console.log("conta criada em:", String(u.created_at).slice(0, 10))
  console.log("último acesso:", String(u.last_sign_in_at || "-").slice(0, 16))

  // O resumo das tarefas dessa conta — números, não conteúdo.
  const rt = await fetch(
    `${URL}/rest/v1/tasks?select=id,created_at,due_date,status,list_id&user_id=eq.${id}&order=created_at.asc`,
    { headers: H }
  )
  const tarefas = rt.ok ? await rt.json() : []
  const comPrazo = tarefas.filter((t) => t.due_date).length
  const abertas = tarefas.filter((t) => t.status !== "completed" && t.status !== "cancelled").length

  const rb = await fetch(`${URL}/rest/v1/time_blocks?select=id&user_id=eq.${id}`, { headers: H })
  const blocos = rb.ok ? await rb.json() : []

  console.log(
    JSON.stringify(
      {
        tarefasNoTotal: tarefas.length,
        aindaAbertas: abertas,
        comPrazo,
        semPrazo: tarefas.length - comPrazo,
        blocosNoCalendario: blocos.length,
        primeiraTarefa: tarefas[0]?.created_at ?? null,
        ultimaTarefa: tarefas[tarefas.length - 1]?.created_at ?? null,
      },
      null,
      1
    )
  )

  // A frase que decide a mensagem para ele: o que a tela inicial mostraria.
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fim = new Date(inicio.getTime() + 24 * 3600_000)
  const apareceriaNoDashboard = tarefas.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      t.due_date &&
      new Date(t.due_date) >= inicio &&
      new Date(t.due_date) < fim
  ).length
  console.log("tarefas que a TELA INICIAL mostraria hoje:", apareceriaNoDashboard, "de", abertas, "abertas")
})()
