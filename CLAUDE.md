# NeuroTask

Aplicativo pessoal de produtividade com gerenciamento de tarefas, time blocking, gamificação e IA.

## Stack

**Aplicação única** (`frontend/`) — Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Framer Motion 12 · React Three Fiber · Supabase JS · Geist font

**Servidor** — Route Handlers do próprio Next (`app/api/*`). Não existe serviço separado: o
scaffold FastAPI/Alembic do commit inicial nunca foi usado e foi removido. Banco, auth,
Realtime e agendamento (pg_cron) são do Supabase; SQLs rodados à mão (ver README.md).

## Estrutura do frontend

```
frontend/
├── proxy.ts                  # Convenção Next 16 (ex-middleware.ts): auth via updateSession
├── app/
│   ├── app/          # Rotas protegidas (requer auth)
│   │   ├── layout.tsx        # Verifica auth → redireciona ou renderiza AppShell
│   │   ├── page.tsx          # Dashboard
│   │   ├── tasks/page.tsx    # Lista de tarefas
│   │   ├── calendar/page.tsx # Calendário / time blocking
│   │   ├── notes/page.tsx    # Notas (rich text)
│   │   ├── favorites/page.tsx
│   │   ├── ai/page.tsx       # Chat de IA
│   │   ├── office/page.tsx   # Escritório (loja cosmética com moedas)
│   │   ├── friends/page.tsx  # Amigos (busca, ocupado/livre, visitar escritório)
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ai/route.ts       # + ai/transcribe/route.ts (Vercel AI SDK)
│   ├── auth/
│   │   ├── callback/route.ts # OAuth callback Supabase
│   │   └── error/page.tsx
│   ├── admin/page.tsx        # Painel do dono (server component, gate por OWNER_EMAIL)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── page.tsx              # Landing pública
│   └── globals.css           # Tokens de cor (oklch), tema claro/escuro
├── components/
│   ├── app-shell.tsx         # Layout wrapper: Dock + main content
│   ├── dock.tsx              # Sidebar retrátil (hover-to-expand, framer-motion)
│   ├── header.tsx            # Header com toggle tema + avatar/dropdown
│   ├── xp-bar.tsx            # Barra de XP/nível (gamificação)
│   ├── confetti.tsx          # Confete ao concluir tarefas
│   ├── focus.tsx             # Modo Foco (timer + minimizar p/ relógio flutuante + painéis)
│   ├── sound-mixer.tsx       # Mixer: seções Sons/Músicas/Foco (ver public/sounds/README.md)
│   ├── reminder-notifier.tsx # Notificações de lembretes do dia (montado global no AppShell)
│   ├── voice-conversation.tsx# Conversa por voz ao vivo com a IA (Web Speech API)
│   ├── robot-mascot.tsx      # Robozinho SVG animado (mascote da Neuro IA no modo voz)
│   ├── office-scene-3d.tsx   # Cena 3D do Escritório (R3F) — sala/itens/avatar por nível
│   ├── avatar-figure.tsx     # Bonequinho paper-doll (preview do editor de avatar)
│   ├── avatar-editor.tsx     # Editor de avatar (cabelo/pele/roupa/fones)
│   ├── friends-section.tsx   # Seção de amigos (usada em /app/friends)
│   ├── page-transition.tsx   # Transições de página (AnimatePresence)
│   ├── rich-text-editor.tsx  # Editor das notas
│   ├── date-picker.tsx
│   ├── task-card.tsx
│   ├── task-dialog.tsx
│   ├── time-block-dialog.tsx # Bloco de tempo + recorrência (diário/semanal/dias úteis)
│   ├── theme-provider.tsx
│   └── ui/                   # Componentes shadcn gerados
├── hooks/                    # use-mobile · use-realtime · use-sound-mixer · use-time-format
│                             # use-office-bg · use-office-celebration (I/O das prefs/festa do Escritório)
├── lib/
│   ├── supabase/             # client.ts · server.ts · middleware.ts (helper de updateSession)
│   ├── gamification.ts       # Lógica de XP/níveis (+ anti-farm)
│   ├── shop.ts               # Catálogo/estado da loja do Escritório (preços no banco)
│   ├── routine-insights.ts   # Rotina aprendida: sugestões determinísticas de rotina
│   ├── admin.ts              # Agregações do painel do dono (puro, sem Supabase)
│   ├── reminders.ts          # REMINDER_COLORS (paleta dos lembretes)
│   ├── time-format.ts        # 12h/24h — puro; o I/O mora em hooks/use-time-format
│   ├── office-celebration.ts # Comemoração 3D ao concluir (regra + animação, puro)
│   ├── types.ts
│   └── utils.ts              # cn()
└── styles/global.css

supabase/                     # SQLs por feature, idempotentes, rodados à mão no SQL Editor
  29 arquivos + email-templates/ — a ORDEM de execução (há dependências) está no README.md
```

## Rotas existentes

| Rota | Status |
|------|--------|
| `/app` | Dashboard (stats + quick actions) |
| `/app/tasks` | Lista de tarefas com filtros e tabs |
| `/app/calendar` | Calendário / time blocking |
| `/app/favorites` | Favoritos |
| `/app/notes` | Notas (rich text editor) |
| `/app/ai` | Chat de IA (Vercel AI SDK, rota `app/api/ai`) |
| `/app/office` | Escritório — cena 3D (R3F) viva + loja cosmética (moedas via XP) |
| `/app/friends` | Amigos — busca por @, ocupado/livre, agenda de hoje, convites de compromisso, visitar escritório (em 3D) |
| `/app/settings` | Configurações (rotina, push, tema, Telegram) |
| `/admin` | Painel do dono — feedbacks, usuários, erros e uso. Server component: quem não é `OWNER_EMAIL` recebe `notFound()`. Fora de `/app` (sem dock) e sem link na navegação |

## Integrações externas (Fase 4)

- **Bot do Telegram**: mensagem → tarefa. Pareamento por código
  (`/start CODIGO`, gerado em Configurações). Webhook em `app/api/telegram/webhook`
  protegido pelo header `x-telegram-bot-api-secret-token`; `app/api/telegram/setup`
  registra o webhook. Parser puro e determinístico em `lib/telegram-commands.ts` (sem LLM).

**Variáveis de ambiente novas**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
Reaproveita `SUPABASE_SERVICE_ROLE_KEY` (RLS bypass no servidor).

## Decisões de design ativas

- Tema escuro/claro via `next-themes`. Variáveis oklch em `globals.css`.
- Dock lateral retrátil: colapsado 72px, expandido 232px, spring transition (stiffness 400, damping 35).
- Active pill animado com `layoutId="dock-active-pill"` no Dock.
- Padding principal: `pl-24` no `app-shell.tsx` para não sobrepor o dock colapsado.
- Framer Motion já instalado — usar para todas as animações de UI.
- Fonte: Geist (sans) + Geist Mono.

## Funcionalidades da IA (Neuro IA)

Rota `app/api/ai/route.ts` (Node runtime). Provedor via env: **Groq** (padrão, com ferramentas),
Gemini ou Anthropic (streaming, sem ferramentas). Chave: `GROQ_API_KEY` etc.

- **Ferramentas** (tool-calling estilo OpenAI): criar/listar/editar/excluir tarefas, blocos de
  tempo e notas — a IA age de verdade no app.
- **Confirmação antes de agir**: a IA propõe e pergunta "posso confirmar?" antes de criar/editar/excluir.
  Não transforma desabafo em tarefa. Horário ambíguo → pergunta manhã/noite.
- **Tarefa com horário** vira também um bloco no calendário (auto). Detecta **conflito/proximidade** de horários.
- **Modo voz** (`mode: "voice"`): respostas curtas/faláveis. Usado por `voice-conversation.tsx`
  (STT+TTS do navegador via Web Speech API, barge-in, mascote coruja). Só funciona bem em Chrome/Edge.
- `app/api/ai/transcribe/route.ts`: transcrição de áudio (Groq Whisper) para o botão de microfone.

## Modo Foco

`focus.tsx` (montado global no AppShell). Timer, ambientes visuais, **minimizar** para um relógio
flutuante (continua contando enquanto navega), painéis de **Sons** (mixer) e **Ambiente** que fecham
ao clicar fora. Mixer com seções **Sons** (loop) · **Músicas** (crossfade, exclusivas) · **Foco** (ruído/binaural).

## Estado atual

App feature-complete nas rotas. Redesign moderno e animado consolidado (dock, transições, XP,
calendário com drag/recorrência/painel, mixer, lembretes, conversa por voz). Evoluções são por escolha.

## Como rodar

Setup completo (env vars, ordem dos SQLs, pareamento do Telegram, deploy): **README.md**.

```bash
cd frontend
pnpm dev     # ou npm run dev
```

**Notas de ambiente (pnpm 11):**
- Os builds de `sharp` e `msedge-tts` precisam estar autorizados em `frontend/pnpm-workspace.yaml` (`allowBuilds`). Sem isso, `pnpm install` sai com exit 1 e o pré-check `verify-deps-before-run` impede o `pnpm dev` de iniciar.
- Não copie a pasta `node_modules` entre diretórios: os symlinks do pnpm são absolutos e quebram (ex.: erro `Cannot find module '@swc/helpers/...'`). Rode `pnpm install` na pasta.

## Convenções

- Componentes client-side: `"use client"` no topo
- Ícones: `lucide-react`
- Classes: `cn()` de `@/lib/utils` para condicionais
- Sem comentários desnecessários no código
- Módulo determinístico novo em `lib/` nasce com `lib/<nome>.test.ts` (Vitest, `pnpm test`)
- Framer Motion: `motion.*` components, `AnimatePresence` para enter/exit, `layoutId` para shared layout animations
