# NeuroTask · Roadmap

> Este arquivo é o **caminho à frente**. O que já foi entregue sai daqui — o registro vive
> no histórico do git, e o que o app faz hoje está no [README.md](README.md) e no
> [CLAUDE.md](CLAUDE.md).

## A tese do produto

O NeuroTask **não é um calendário passivo** (o usuário esquece e abandona — o problema do
Google Calendar). É um **copiloto de rotina**:

1. **Planeja de trás pra frente**: a partir de um compromisso-âncora ("faculdade amanhã 8:30"),
   calcula a cadeia do dia — até quando estudar, quando parar, banho, dormir, acordar.
2. **Conhece o usuário**: aprende quanto tempo a pessoa leva para se arrumar, comer, deslocar
   (tempo real vs. estimado) e usa isso nos planos.
3. **Acompanha de verdade**: percebe quando um horário passou sem a tarefa ser feita e
   pergunta o que houve; avisa sobre decisões ruins (tela antes de dormir, pouco sono antes
   de compromisso) — de forma não invasiva e desativável.
4. **Vira hábito**: briefing diário, check-ins, gamificação com propósito e captura sem
   fricção (voz, mensageiro) fazem o app fazer parte da rotina.

## Onde estamos

As quatro fases planejadas foram entregues: fundação de uso real (deploy, mobile, e-mail
próprio), o copiloto (planejamento retroativo, perfil e atividades de rotina, avisos
determinísticos, check-in pós-horário, rotina aprendida), hábito e gamificação (anti-farm
de XP no servidor, moedas, Escritório 3D com loja e avatar, social com amigos/agenda/
convites, push real via pg_cron) e as integrações externas (extensão de navegador e bot do
Telegram, ambas com pareamento por código).

O app está feature-complete nas rotas existentes. O que falta não é capacidade nova — é
**confiança**: ele ainda não foi entregue a ninguém além do autor.

## Agora — Fase 5: pronto para outras pessoas usarem

O objetivo é passar o app para amigos e família e colher feedback de uso real. Isso não se
mede em features entregues, e sim em alguém **voltando no dia seguinte por vontade própria**.

**A régua é o Google Calendar.** O usuário-teste (meu pai) já tem um calendário que funciona.
Ele não vai trocar por algo equivalente — só troca por algo que faça o que o Google não faz
(planejar de trás pra frente, cobrar check-in, conhecer a rotina dele) **e que nunca falhe na
frente dele**. Um bug basta: ele volta pro Google e não reclama, só some. Feedback que não
chega é o pior resultado possível.

Duas coisas matam essa entrega, e nenhuma é falta de funcionalidade: **quebrar na cara da
pessoa** e **ela abrir o app e não saber o que fazer**.

### Não quebrar na frente do usuário

- [ ] **Ver os erros sem abrir o Supabase**: a tabela `error_log` já recebe as falhas, mas
      hoje só dá pra lê-la pelo painel. Enquanto olhar der trabalho, ninguém olha — falta
      uma visão simples (Configurações?) com os últimos erros e um resumo.
- [x] **Cobertura dos módulos determinísticos** (`pnpm test`, 89 testes): fechada com
      `routine-insights` (19) e o planejamento retroativo (17). Os dois exigiram separar
      a decisão do I/O — `computeSuggestions` saiu de dentro do fetch, e a cadeia do dia
      saiu da rota de IA para `lib/backward-plan.ts` (puro: sem Supabase, sem fuso). A
      rota agora só busca a rotina, chama e formata.
- [ ] **Varredura do fluxo principal fora da sua máquina**: navegador sem WebGL, tela pequena,
      fuso diferente, e o primeiro login com o banco zerado.

### Sobreviver ao primeiro dia

- [ ] **Onboarding**: hoje o novo usuário cai num dashboard vazio, sem pista de que existem
      planejamento retroativo, Escritório, modo voz e foco. Não precisa de tour longo —
      precisa de um primeiro caminho óbvio.
- [ ] **Estados vazios com ação**: cada rota vazia deve dizer o que fazer ali, não só que
      está vazia.
- [ ] **Importação de calendário (`.ics`)**: a agenda de quem vamos convidar já existe no
      Google. Enquanto migrar significar digitar tudo de novo, ninguém migra — por mais
      estável que o app esteja. Ler um `.ics` exportado do Google e criar os blocos é o que
      transforma "app interessante" em "app que dá pra usar amanhã", então é requisito de
      adoção e não item de integração. Escopo mínimo: upload do arquivo, prévia do que será
      criado, confirmação do usuário (nunca importar às cegas) e dedupe ao reimportar.

### Fechar o ciclo de feedback

- [ ] **Botão de feedback dentro do app**, gravando junto o commit devolvido por
      `/api/version` (a rota já existe e hoje nada a consome). Sem isso o feedback chega
      solto no WhatsApp, sem versão e sem contexto — e some.
- [ ] **Caminho para reproduzir** o que a pessoa viu (rota, horário, o que ela tentou).

**Critério de pronto**: alguém que nunca viu o app abre, entende o que fazer sem você do
lado, e volta no dia seguinte sozinho.

## Depois — evoluções por escolha

Nada aqui é pré-requisito de nada; entram conforme fizer sentido, sem pressa.

### Escritório vivo v3 — o que sobrou do Escritório

- [ ] **Comemoração ao concluir**: evento na cena 3D quando uma tarefa é concluída.
      Precisa nascer de trabalho real, nunca de login ou clique (mesma regra anti-farm
      que rege a estante, o troféu e o quadro de streak).
- [ ] **Snapshot compartilhável**: gerar uma imagem da sala para postar. Decisões em
      aberto: render no cliente (canvas do R3F) ou server-side; o que aparece além da
      cena (nível, streak); e se o link é público ou só entre amigos.

### Calendário aberto pra fora

> A **importação** `.ics` está na Fase 5, acima: sem ela ninguém migra do Google, então
> ela é requisito de adoção. O que sobra aqui é o caminho de volta.

- [ ] **Exportação ICS**: os blocos de tempo viram um `.ics`. Hoje a agenda do NeuroTask não
      sai do NeuroTask. Ponto de atenção: a recorrência tem regra própria em
      `lib/task-recurrence.ts` e precisa virar `RRULE` de verdade — nos dois sentidos.
- [ ] **Integrações de calendário** (Google/Outlook): começar por feed assinável
      (somente leitura) antes de considerar escrita bidirecional, que traz OAuth e
      conflito de sincronização.
- [ ] **Compartilhamento** de agenda para fora da base de amigos.

### Mensageiros

- [ ] **WhatsApp** (API oficial, paga) — quando fizer sentido. O fluxo "mensagem → tarefa"
      e o pareamento por código já existem no Telegram e devem ser reaproveitados.

## Princípios de implementação

- Confiabilidade > feature nova (aprendizado das reviews).
- O que puder ser **determinístico** (avisos, dedupe, datas, XP) não usa LLM.
- IA propõe, usuário confirma; a IA nunca inventa dados.
- Tudo com degradação graciosa quando o limite gratuito da IA bater.
- Economia do jogo (XP, moedas) é validada no **servidor** — cliente não é fonte de verdade.
- Dado sensível de outra pessoa só sai por RPC `security definer` que valida amizade + flag.
- **Aplicação única** Next.js + Supabase: não existe serviço separado, e não se cria um sem
  motivo forte (já houve um scaffold FastAPI que morreu sem nunca ser chamado).
