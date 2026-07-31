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
- **Extensão** — Chrome/Edge Manifest V3, sem build step

```
frontend/     app Next.js (UI + rotas de API)
extension/    extensão de navegador (tempo de tela)
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

`pnpm test` (Vitest) cobre só os módulos **determinísticos** de `lib/` — os que decidem
datas, XP, recorrência e parsing sem tocar em rede: `task-recurrence`, `gamification`
(anti-farm), `calendar-warnings` e `telegram-commands`. É onde a lógica sutil regride sem
ninguém ver. Componente e rota ficam de fora de propósito: exigiriam DOM e mock de
Supabase, e não é ali que mora o risco.

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
| `SUPABASE_SERVICE_ROLE_KEY` | **Só no servidor.** Bypass de RLS no dispatcher de push, na extensão e no webhook do Telegram |

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

### Integrações (opcionais)

| Variável | Para quê |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token do bot (@BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Valida o header `x-telegram-bot-api-secret-token`. **Sem ele qualquer um forja um update e escreve na conta de outra pessoa** |
| `DEFAULT_TZ_OFFSET_MIN` | Fuso dos horários locais. Padrão `180` (Brasil, UTC−3) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Redirect de cadastro em desenvolvimento |

A extensão de navegador não pede env nova — reusa o `SUPABASE_SERVICE_ROLE_KEY`.

## Banco de dados

Não há ferramenta de migração: os scripts de [supabase/](supabase/) são rodados à mão no
**SQL Editor** do Supabase (Dashboard → SQL Editor → New query → Run). Todos são
**idempotentes** — reexecutar é seguro.

A ordem importa (há dependências entre eles). Do zero, rode nesta sequência:

**1. Base** — schema, tarefas, notas, realtime
```
fix_schema.sql · task_lists.sql · favorites.sql · notes.sql · day_notes.sql
reminders.sql · task_recurrence.sql · task_order.sql · task_meeting.sql · realtime.sql
```

**2. Gamificação e loja** — `gamification.sql` cria o `award_xp` de que o resto depende
```
gamification.sql → xp_anticheat.sql → coins_shop.sql → skins.sql · office_3d.sql · avatar_acessorios.sql
```

**3. Copiloto de rotina**
```
routine_profile.sql · routine_activities.sql · activity_log.sql
```

**4. Social** — cada um depende do anterior
```
friends.sql → social_v2.sql → friends_agenda.sql → friends_v3.sql
```

**5. Push** — ⚠️ em `push_cron.sql`, substitua `COLE_AQUI_O_CRON_SECRET` pelo seu `CRON_SECRET` antes de rodar
```
push.sql → push_cron.sql
```

**6. Registro de erros** — falhas do navegador capturadas por `/api/errors`
```
error_log.sql
```

**7. Integrações externas** (só se for usá-las)
```
extension_screen_time.sql · telegram.sql
```

### Ver os erros que aconteceram

`error_log` guarda as falhas do navegador por 30 dias. Enquanto não há tela para isso,
consulte pelo SQL Editor:

```sql
select criado_em, origem, rota, mensagem, digest, commit_sha
from error_log order by criado_em desc limit 50;
```

### Configuração do Supabase Auth

- **Confirm email** ligado; Redirect URLs incluindo `http://localhost:3000/auth/callback`
  e o domínio de produção.
- Templates de e-mail com a marca em [supabase/email-templates/](supabase/email-templates/)
  (colar em Authentication → Email Templates). O callback usa `token_hash` para funcionar
  cross-device — confirmar o e-mail no celular e voltar no desktop.

## Integrações externas

### Extensão de navegador (`extension/`)

Estima tempo de tela em redes sociais a partir do **histórico do Chrome** (não mais
observando a aba ativa) e alimenta o card do dashboard. Manifest V3, sem build: carregue a
pasta em `chrome://extensions` → *Carregar sem compactação*.

Pareamento em dois passos, direto do popup da extensão (sem digitar código):
1. **Permissão de histórico** — `chrome.permissions.request({ permissions: ["history"] })`,
   declarada como `optional_permissions` no manifest, então o Chrome só pede quando o
   usuário clica.
2. **Conectar à conta** — o popup gera um nonce e abre `/extension/connect?state=...` numa
   aba (já autenticada, mesma sessão do navegador); o usuário clica "Autorizar" e a página
   grava o vínculo (`extension_pairing_codes`, RLS pelo `auth.uid()`). O popup troca esse
   nonce por um token via `/api/extension/exchange` (endpoint inalterado — só quem inicia
   o pareamento mudou de lugar). Token guardado como hash SHA-256; o valor puro existe uma
   vez na resposta e vive no `chrome.storage.local`. Dispositivos são listáveis e revogáveis
   em Configurações.

Estimativa de tempo: o `chrome.history` só dá timestamp de visita, não duração — a
extensão varre todas as visitas (não só as redes sociais) a cada 10 min
(`chrome.alarms`) e usa o intervalo até a *próxima* visita, de qualquer domínio, como
"tempo gasto" na anterior. Intervalos acima de 30 min não contam (aba esquecida aberta,
PC ocioso). É uma aproximação, não medição em tempo real — trade-off aceito pela
permissão de escopo o mais mínimo possível: só o histórico, nada de observar abas ao vivo.

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
