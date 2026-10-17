// O endereço público do site e o que fica aberto para quem não entrou — gente
// e robô. Uma lista só: o proxy pergunta aqui se a rota abre sem sessão, e o
// robots.txt, o sitemap.xml e o llms.txt saem das mesmas constantes. Assim não
// existe página no sitemap que o proxy mande para o login.

/** Sem barra no fim. `NEXT_PUBLIC_SITE_URL` troca quando houver domínio próprio. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://neuro-task-main.vercel.app").replace(/\/+$/, "")

export const NOME_DO_SITE = "NeuroTask"

// O texto do Google sai em português: é o público de agora (o app tem os dois
// idiomas, mas o servidor não sabe qual quem vai abrir prefere).
export const TITULO_PADRAO = "NeuroTask — tarefas, agenda e foco com uma IA que age"
export const DESCRICAO_PADRAO =
  "Lista de tarefas, calendário com blocos de tempo, Modo Foco e a Neuro, uma IA que cria e remarca tarefas por texto ou voz. Grátis, em português e inglês."

/** Entram no sitemap: abrem sem login e têm o que mostrar a quem busca. */
export const PAGINAS_INDEXAVEIS = ["/", "/signup", "/login", "/termos"] as const

/**
 * O que o robots.txt fecha: o app atrás do login e as rotas técnicas.
 *
 * `/agenda/` fica de FORA de propósito. Ela vive de token na URL, e a URL é a
 * credencial: bloqueada no robots.txt, o Google não lê a página, não vê o
 * `noindex` — e pode indexar o endereço nu se alguém o postar num lugar público.
 * Liberada para ler, ele vê o `noindex` e a deixa fora do índice inteira.
 */
export const FECHADO_PARA_ROBOS = ["/app", "/admin", "/api/", "/auth/"] as const

/** Rotas que abrem sem sessão. O resto o proxy manda para o login. */
export function ehRotaPublica(caminho: string): boolean {
  return (
    caminho === "/" ||
    caminho === "/termos" ||
    caminho.startsWith("/login") ||
    caminho.startsWith("/signup") ||
    caminho.startsWith("/auth") ||
    caminho.startsWith("/reset-password") ||
    // Quem abre o link compartilhado não tem conta; o token é a credencial
    // (ver supabase/agenda_publica.sql), e a página só mostra horários.
    caminho.startsWith("/agenda/")
  )
}
