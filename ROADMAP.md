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

- [ ] **Error boundaries** (`error.tsx` por rota + `global-error.tsx`): hoje só existe
      `app/not-found.tsx`, então qualquer erro de render vira a tela branca "Application
      error" do Next — sem mensagem, sem saída, sem volta. Precisa de tela amigável com
      "tentar de novo" e caminho de volta pro app.
- [ ] **Monitoramento de erro**: hoje só há `@vercel/analytics`, que conta pageview e não
      exceção. Sem isso você só descobre uma falha se a pessoa contar — e ela não conta.
- [ ] **Testes dos módulos determinísticos**: `task-recurrence`, `gamification` (anti-farm),
      `calendar-warnings`, `routine-insights`, `telegram-commands`. São funções puras: barato
      de testar e exatamente onde a lógica sutil regride sem ninguém ver. Hoje não há nenhum
      teste no repo nem script `test` no `package.json`.
- [ ] **Varredura do fluxo principal fora da sua máquina**: navegador sem WebGL, tela pequena,
      fuso diferente, e o primeiro login com o banco zerado.

### Sobreviver ao primeiro dia

- [ ] **Onboarding**: hoje o novo usuário cai num dashboard vazio, sem pista de que existem
      planejamento retroativo, Escritório, modo voz e foco. Não precisa de tour longo —
      precisa de um primeiro caminho óbvio.
- [ ] **Estados vazios com ação**: cada rota vazia deve dizer o que fazer ali, não só que
      está vazia.
- [ ] **Caminho de migração de quem já usa calendário**: a agenda dele já existe no Google.
      Enquanto migrar significar digitar tudo de novo, ele não migra. Isso promove a
      **importação** de item de integração a requisito de adoção — ver "Calendário aberto
      pra fora", abaixo.

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

- [ ] **Importação ICS** — *puxada para a Fase 5*: ler um `.ics` exportado do Google e criar
      os blocos. É o que tira "digitar tudo de novo" do caminho de quem já tem calendário,
      então virou requisito de adoção e não item de integração.
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
