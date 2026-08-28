# NeuroTask

Copiloto de rotina pessoal: tarefas, time blocking, gamificação e uma IA que **propõe e
age** no app — sempre com confirmação do usuário.

Não é mais um calendário passivo. Ele planeja o dia de trás pra frente a partir de um
compromisso-âncora, aprende quanto tempo você leva de verdade em cada atividade e
cobra check-in quando o horário passa. A visão completa está no [ROADMAP.md](ROADMAP.md).

## Stack

Aplicação **Next.js única** — não há servidor separado. Toda a lógica de servidor vive
em Route Handlers do Next; o banco, a autenticação e o agendamento são do Supabase.

- **Frontend/servidor** — Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 ·
  shadcn/ui (Radix) · Framer Motion 12 · React Three Fiber (Escritório 3D)
- **Dados e auth** — Supabase (Postgres + RLS + Realtime + pg_cron)
- **IA** — Groq (padrão, com tool-calling), com Gemini e Anthropic como alternativas

```
frontend/     app Next.js (UI + rotas de API)
supabase/     scripts SQL por feature + templates de e-mail
```

## Como rodar

Pré-requisitos: Node 20+, pnpm 11 e um projeto Supabase.

```bash
cd frontend
pnpm install
cp .env.example .env.local   # preencha (ver abaixo)
pnpm dev                     # http://localhost:3000
pnpm test                    # suíte dos módulos determinísticos
```

Antes do primeiro login, rode os SQLs em [supabase/](supabase/) — ver
[Banco de dados](#banco-de-dados).

### Testes

`pnpm test` (Vitest) cobre os módulos **determinísticos** de `lib/` — os que decidem
datas, XP, recorrência, parsing e formatação sem tocar em rede: `admin`, `avatar-accessories`,
`backward-plan`, `calendar-feed`, `calendar-scroll`, `calendar-warnings`, `focus-gradient`,
`auth-metodos` (quais botões de login aparecem, e qual foi o último usado),
`enquete` (quando perguntar e quando ficar quieto — e que "agora não" cala a enquete
inteira, não só a pergunta recusada),
`dashboard-metricas` (as três perguntas de "Seus números" — e o agrupamento por dia e
hora **locais**, que é onde um `toISOString()` distraído jogaria toda noite de trabalho
para o dia seguinte),
`foto-perfil` (o recorte quadrado central, o que se aceita e o carimbo anti-cache),
`gamification` (anti-farm), `ics`, `iniciais` (nome → iniciais e cor do avatar),
`nivel-faixa`, `nota-cor` (a paleta das notas: guarda o nome e não o hex, e cor órfã
vira "sem cor" em vez de erro), `regiao` (região ↔ formato de hora, e a ida e volta entre os dois),
`revelacao-resposta` (a resposta da Neuro entrando escrita no chat: duração fixa e ritmo
saindo do tamanho — é o que impede uma resposta longa de levar meio minuto para aparecer),
`routine-insights`, `saudacao`, `task-recurrence` (inclusive que "não repete" vira NULO e
não a string "none", e que o que sai de `regraParaBanco` é lido por `nextOccurrence`), `telegram-commands`,
`telegram-fuso` (de que parede o `/hoje` do bot está falando — e que zero é fuso de
verdade, não "ausente") e
`time-format`. É onde a lógica sutil regride sem
ninguém ver. Componente e rota ficam de fora de propósito: exigiriam DOM e mock de
Supabase, e não é ali que mora o risco.

A **animação** também tem parte testável, quando a conta sai do olho e vira número:
`coin-flight` (a curva da moeda que voa até o contador de XP — o arco nunca mergulha por
baixo do header), `frame-clock` (o tempo que a cena 3D recebe do ticker do GSAP: acumulado
do zero e limitado, para que voltar de aba em segundo plano não faça a sala saltar),
`neuro-sphere` (a esfera da Neuro IA: distribuição pelo ângulo dourado, e o retorno das
partículas levando o mesmo TEMPO a 30, 60 ou 144 fps) e, no Escritório,
`office-code-scroll` e `office-rain` (a gota nunca escapa do vão do vidro).

O Escritório 3D tem um bloco à parte (`office-bg`, `office-camera`, `office-celebration`,
`office-city`, `office-code-scroll`, `office-rain`, `office-snapshot`, `office-typing` e
`office-model`). O `office-model` é de um tipo
diferente: ele **mede a geometria** da cena — se a mão do boneco pousa no teclado, se o
antebraço passa por cima da mesa. É o olho que falta, já que ninguém consegue ver um
render num teste. Rodam em Node puro: construir malhas do three.js não exige WebGL.

A config é `vitest.config.mts` — a extensão `.mts` é obrigatória, porque o Vite 7 é
ESM-only e o `package.json` não é `type: module`.

### Notas de ambiente (pnpm 11)

- Os builds de `sharp`, `msedge-tts` e `esbuild` precisam estar autorizados em
  [frontend/pnpm-workspace.yaml](frontend/pnpm-workspace.yaml) (`allowBuilds`). Sem isso o
  `pnpm install` sai com exit 1 e o pré-check impede o `pnpm dev` de iniciar. O `esbuild`
  é do Vitest: sem a aprovação, `pnpm test` não acha o binário nativo.
- **Não copie `node_modules` entre pastas**: os symlinks do pnpm são absolutos e quebram
  (ex.: `Cannot find module '@swc/helpers/...'`). Rode `pnpm install` na pasta.

## Variáveis de ambiente

Todas em `frontend/.env.local` (e nas envs do projeto na Vercel). O arquivo
[frontend/.env.example](frontend/.env.example) tem o esqueleto completo.

### Obrigatórias

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY` como fallback) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só no servidor.** Bypass de RLS no dispatcher de push e no webhook do Telegram |

### IA — pelo menos uma

| Variável | Observação |
|---|---|
| `GROQ_API_KEY` | Padrão e **a única com ferramentas** (criar/editar tarefas, blocos, notas). `GROQ_MODEL` opcional (`llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` | Streaming sem ferramentas; também é o fallback quando o Groq bate rate limit. `GEMINI_MODEL` opcional (`gemini-2.0-flash`) |
| `ANTHROPIC_API_KEY` | Streaming sem ferramentas. `ANTHROPIC_MODEL` opcional |

O `GROQ_API_KEY` também serve à transcrição de áudio (Whisper) do botão de microfone.

### Push e agendamento

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Par VAPID do Web Push (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | Protege `/api/push/dispatch` e `/api/telegram/setup`. O **mesmo** valor vai dentro de `push_cron.sql` |

### Painel do dono

| Variável | Para quê |
|---|---|
| `OWNER_EMAIL` | Seu e-mail. Libera `/admin` (feedbacks, usuários, erros, uso) e o painel de erros em Configurações. **Sem ela `/admin` responde 404 para todo mundo, inclusive você** |

### Entrar com Google / GitHub / Apple (opcional)

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | Quais botões sociais aparecem em `/login` e `/signup`. Lista separada por vírgula: `google`, `github`, `apple`. **Vazia ou ausente = nenhum botão**, que é o padrão |

A ordem dos passos importa, e é fácil errar:

1. **Primeiro** habilite o provedor no Supabase (Authentication → Providers), com o
   Client ID/Secret dele e a *callback URL* que o painel mostra.
2. **Depois** liste o provedor em `NEXT_PUBLIC_OAUTH_PROVIDERS`.

Invertendo, o botão aparece antes de funcionar — e falhar na tela de entrada é o jeito
mais rápido de perder um usuário-teste. Por isso a env existe: sem ela o código não
adivinha o que está configurado do outro lado.

O `app/auth/callback/route.ts` já trata o retorno (fluxo PKCE) e não precisa de mudança.
O Apple exige conta paga de Apple Developer (99 USD/ano); Google e GitHub são de graça.

### Integrações (opcionais)

| Variável | Para quê |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token do bot (@BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Valida o header `x-telegram-bot-api-secret-token`. **Sem ele qualquer um forja um update e escreve na conta de outra pessoa** |
| `DEFAULT_TZ_OFFSET_MIN` | Fuso de reserva: vale para o bot do Telegram e para inscrição de push sem fuso próprio. Padrão `180` (Brasil, UTC−3) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Redirect de cadastro em desenvolvimento |

## Banco de dados

Não há ferramenta de migração: os scripts de [supabase/](supabase/) são rodados à mão no
**SQL Editor** do Supabase (Dashboard → SQL Editor → New query → Run). Todos são
**idempotentes** — reexecutar é seguro.

A ordem importa (há dependências entre eles). Do zero, rode nesta sequência:

**1. Base** — schema, tarefas, notas, realtime
```
fix_schema.sql · task_lists.sql · favorites.sql · notes.sql · day_notes.sql
reminders.sql · task_recurrence.sql · task_order.sql · task_meeting.sql · realtime.sql
notas_cor.sql
```
`notas_cor.sql` acrescenta a cor da nota (depende de `notes.sql`). Sem ele as notas
funcionam igual; só escolher uma cor falha, com um aviso dizendo qual arquivo rodar.

**2. Gamificação e loja** — `gamification.sql` cria o `award_xp` de que o resto depende
```
gamification.sql → xp_anticheat.sql → coins_shop.sql → skins.sql · office_3d.sql · avatar_acessorios.sql · office_v4.sql · office_v5.sql · office_v6.sql · office_v7.sql
```

**3. Copiloto de rotina**
```
routine_profile.sql · routine_activities.sql · activity_log.sql
```

**4. Social** — cada um depende do anterior
```
friends.sql → social_v2.sql → friends_agenda.sql → friends_v3.sql → friends_v4.sql
```
`friends_v4.sql` é o que faz a lista de amigos desenhar o bonequinho de cada um: a RPC
`my_friends` passa a devolver avatar e acessórios de todo mundo de uma vez, em vez de a
tela fazer N chamadas a `friend_office`. Sem ele a lista ainda funciona — só volta a
mostrar a inicial no lugar do boneco.

**5. Push** — ⚠️ em `push_cron.sql`, substitua `COLE_AQUI_O_CRON_SECRET` pelo seu `CRON_SECRET` antes de rodar
```
push.sql → push_tz.sql → push_cron.sql
```
`push_tz.sql` guarda o fuso de cada aparelho. Sem ele, o dispatcher manda a notificação na
hora do Brasil para todo mundo — o lembrete aparece certo no app, só o push toca torto.
Quem já tinha push ligado antes precisa **desligar e ligar de novo** em Configurações: o
fuso é gravado na inscrição, então a inscrição antiga fica sem ele (e cai no padrão).

**6. Foto de perfil** — o bucket de Storage. Sem dependências
```
foto_perfil.sql
```
Cria o bucket `avatars` (público, 1 MB, só `image/jpeg`) e as políticas que amarram cada
arquivo ao dono pela primeira pasta do caminho (`<uid>/perfil.jpg`). Sem ele, Configurações
→ Perfil aceita escolher a imagem e falha no envio; o resto do app segue igual.

O endereço da foto **não** vira coluna: vai para o `user_metadata` do usuário, no mesmo
lugar em que o nome já mora, numa chave própria (`foto_perfil`). Não em `avatar_url`,
porque o Supabase mescla os dados do provedor no `user_metadata` a cada login social — ali
o próximo "entrar com Google" apagaria a foto escolhida.

**7. Registro de erros e feedback** — sem dependências, mas sem eles o `/admin` fica cego
```
error_log.sql · feedback.sql
```
`error_log.sql` guarda as falhas do navegador capturadas por `/api/errors`; `feedback.sql`,
o que chega pelo botão de feedback do app.

Os dois jeitos de o envio falhar têm a **mesma** solução — reexecutar
`supabase/feedback.sql`, que conserta sem apagar mensagem nenhuma:

| O que aparece | O que é |
|---|---|
| `Could not find the 'commit' column of 'feedback'` | a tabela nasceu numa versão anterior e está sem colunas; o arquivo acrescenta o que falta |
| `violates check constraint "feedback_kind_check"` | sobrou um CHECK antigo no `kind`, com uma lista de valores diferente da que o app usa hoje (`bug`/`ideia`/`geral`); o arquivo derruba o velho e recria o certo |

O segundo caso não vem deste repositório: nenhuma versão do `feedback.sql` criou esse
CHECK. Ele fica em bancos cuja tabela `feedback` foi criada à mão antes — e como
`create table if not exists` não mexe em tabela existente, ele sobrevivia a toda
reexecução. Agora o arquivo o derruba pela **definição**, não pelo nome, porque tabela
feita à mão pode ter batizado o constraint de outro jeito.

**8. Integrações externas** (só se for usá-las)
```
telegram.sql → telegram_tz.sql · calendar_feed.sql
```
`telegram_tz.sql` guarda o fuso de quem parear. Sem ele o `/hoje` responde pela parede do
Brasil para todo mundo — quem estiver em Lisboa às 23h já vê a agenda de amanhã. O fuso
pega carona no código de pareamento (é o único momento em que o app fala com o Telegram),
então quem já estava pareado precisa **parear de novo**; até lá o bot tenta o fuso da
inscrição de push mais recente e, se não houver, o padrão do servidor.
`calendar_feed.sql` liga o feed assinável (Configurações → "Assinar no Google/Outlook"). Sem dependências.

**Faxina (opcional, e só se você quiser)**
```
remove_extension_screen_time.sql
```
Apaga as tabelas da extensão de tempo de tela, que foi abandonada. Nada no app depende
delas — quem está começando do zero nunca as criou, e quem tem um banco antigo pode
deixá-las lá sem prejuízo nenhum. É o único script destrutivo da pasta; está separado dos
outros justamente por isso.

### Ver os erros que aconteceram

O caminho normal é o painel do dono em **`/admin`** (ver abaixo) — `error_log` guarda as
falhas do navegador por 30 dias. Direto pelo SQL Editor, se preferir:

```sql
select criado_em, origem, rota, mensagem, digest, commit_sha
from error_log order by criado_em desc limit 50;
```

## Painel do dono (`/admin`)

Rota do próprio app com feedbacks, usuários (cadastro, último acesso, nível), erros
recentes e números de uso. O portão é **do lado do servidor**: quem não estiver logado
com o `OWNER_EMAIL` recebe 404 e nunca chega a receber os dados — não é só esconder da
tela. Lê tudo pela service role de propósito (a tabela `feedback` não tem policy de
`select`, e nenhum usuário deve ver dado de outro pelo app).

Não há link para `/admin` na navegação: é acesso por URL direta, para não anunciar a
existência do painel a quem usa o app.

### Configuração do Supabase Auth

- **Confirm email** ligado; Redirect URLs incluindo `http://localhost:3000/auth/callback`
  e o domínio de produção.
- Templates de e-mail com a marca em [supabase/email-templates/](supabase/email-templates/)
  (colar em Authentication → Email Templates). O callback usa `token_hash` para funcionar
  cross-device — confirmar o e-mail no celular e voltar no desktop.

## Integrações externas

### Bot do Telegram

Mesmo pareamento por código: Configurações gera os 6 dígitos, você manda `/start CODIGO`
no bot. Qualquer mensagem vira tarefa (1ª linha = título, resto = descrição); entende
`/hoje`, `/ajuda` e `/sair`. A interpretação é **100% determinística**
([lib/telegram-commands.ts](frontend/lib/telegram-commands.ts), módulo puro, sem LLM).

Para registrar o webhook depois do deploy:

```bash
curl -X POST https://SEU-DOMINIO/api/telegram/setup -H "x-cron-secret: $CRON_SECRET"
# ...&info=1 consulta o estado · ...&remover=1 remove o webhook
```

## Deploy

Vercel, com a raiz do projeto apontando para `frontend/`. Replique as envs acima no
painel. O push depende do `pg_cron` do Supabase chamando `/api/push/dispatch` a cada
minuto — configurado por `push_cron.sql`, não por cron da Vercel.

## Princípios do projeto

- Confiabilidade > feature nova.
- O que puder ser **determinístico** (avisos, dedupe, datas, XP) não usa LLM.
- A IA propõe, o usuário confirma; a IA nunca inventa dados.
- Degradação graciosa quando o limite gratuito da IA bater.
- Dado sensível de outra pessoa só sai por RPC `security definer` que valida amizade + flag.
