import { DESCRICAO_PADRAO, NOME_DO_SITE, SITE_URL } from "@/lib/site"

// llms.txt (proposta de llmstxt.org): o que o site é e onde está cada coisa,
// para as IAs que leem a página. Tudo aqui tem de ser verdade no app — é a
// mesma régua dos termos.

export const dynamic = "force-static"

export function GET() {
  const texto = `# ${NOME_DO_SITE}

> ${DESCRICAO_PADRAO}

O NeuroTask é um app de produtividade para quem não quer procrastinar. Projeto pessoal de Gustavo Martins Cirino, oferecido de graça.

- Tarefas com hora marcada viram blocos no calendário, com repetição por dia ou por semana.
- A Neuro IA cria, edita e remarca tarefas, blocos e notas de verdade, por escrito ou por voz, e pergunta antes de agir.
- Modo Foco com timer, sons ambientes e XP por tempo focado.
- XP e moedas mobiliam um escritório em 3D.
- Amigos veem quem está livre agora e combinam compromissos; um link de agenda mostra só os horários ocupados para quem não usa o app.
- Lembretes no navegador e no celular.

## Páginas

- [Início](${SITE_URL}/): o que o app faz
- [Criar conta](${SITE_URL}/signup): cadastro com e-mail, Google ou GitHub
- [Entrar](${SITE_URL}/login)
- [Termos de uso e privacidade](${SITE_URL}/termos): regras de uso, dados guardados e fornecedores (LGPD)

## Fora do alcance

O app em si (/app) exige login, e o conteúdo de cada pessoa não é público.
`
  return new Response(texto, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
