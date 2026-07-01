# NeuroTask

Aplicativo pessoal de produtividade com gerenciamento de tarefas, time blocking, gamificação e IA.

## Stack

**Frontend** (`frontend/`) — Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Framer Motion 12 · Supabase JS · Geist font

**Backend** (`backend/`) — Python · FastAPI · Alembic (migrações) · Supabase (banco de dados e autenticação)

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
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ai/route.ts       # + ai/transcribe/route.ts (Vercel AI SDK)
│   ├── auth/
│   │   ├── callback/route.ts # OAuth callback Supabase
│   │   └── error/page.tsx
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
│   ├── owl-mascot.tsx        # Coruja SVG animada (mascote da Neuro IA no modo voz)
│   ├── page-transition.tsx   # Transições de página (AnimatePresence)
│   ├── rich-text-editor.tsx  # Editor das notas
│   ├── date-picker.tsx
│   ├── task-card.tsx
│   ├── task-dialog.tsx
│   ├── time-block-dialog.tsx # Bloco de tempo + recorrência (diário/semanal/dias úteis)
│   ├── theme-provider.tsx
│   └── ui/                   # Componentes shadcn gerados
├── hooks/                    # use-mobile · use-realtime · use-sound-mixer · use-toast
├── lib/
│   ├── supabase/             # client.ts · server.ts · middleware.ts (helper de updateSession)
│   ├── gamification.ts       # Lógica de XP/níveis
│   ├── reminders.ts          # REMINDER_COLORS (paleta dos lembretes)
│   ├── types.ts
│   └── utils.ts              # cn()
└── styles/global.css

supabase/                     # SQLs por feature (rodar no SQL Editor do Supabase)
  fix_schema.sql · notes.sql · favorites.sql · task_lists.sql · gamification.sql
  realtime.sql · reminders.sql · day_notes.sql
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
| `/app/settings` | Configurações |

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

```bash
cd frontend
pnpm dev     # ou npm run dev
```

**Notas de ambiente (pnpm 11):**
- O build do `sharp` precisa estar autorizado em `frontend/pnpm-workspace.yaml` (`allowBuilds: { sharp: true }`). Sem isso, `pnpm install` sai com exit 1 e o pré-check `verify-deps-before-run` impede o `pnpm dev` de iniciar.
- Não copie a pasta `node_modules` entre diretórios: os symlinks do pnpm são absolutos e quebram (ex.: erro `Cannot find module '@swc/helpers/...'`). Rode `pnpm install` na pasta.

## Convenções

- Componentes client-side: `"use client"` no topo
- Ícones: `lucide-react`
- Classes: `cn()` de `@/lib/utils` para condicionais
- Sem comentários desnecessários no código
- Framer Motion: `motion.*` components, `AnimatePresence` para enter/exit, `layoutId` para shared layout animations
