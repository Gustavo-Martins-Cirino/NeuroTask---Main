# NeuroTask · Roadmap

> Este arquivo é o **caminho à frente**: só o que ainda falta. O que já foi entregue sai
> daqui — o registro vive no histórico do git, e o que o app faz hoje está no
> [README.md](README.md) e no [CLAUDE.md](CLAUDE.md).

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

## Agora — Fase 5: pronto para outras pessoas usarem

O objetivo é passar o app para amigos e família e colher feedback de uso real. Isso não se
mede em features entregues, e sim em alguém **voltando no dia seguinte por vontade própria**.

**A régua é o Google Calendar.** O usuário-teste (meu pai) já tem um calendário que funciona.
Ele não vai trocar por algo equivalente — só troca por algo que faça o que o Google não faz
(planejar de trás pra frente, cobrar check-in, conhecer a rotina dele) **e que nunca falhe na
frente dele**. Um bug basta: ele volta pro Google e não reclama, só some. Feedback que não
chega é o pior resultado possível.

O que sobrou não é código, é **verificação** — e é a parte que não dá para fazer lendo o
repositório:

- [ ] **Primeiro contato num aparelho que não é o seu.** Criar uma conta nova de verdade e
      percorrer o fluxo principal com o banco zerado: dashboard sem nenhuma tarefa, calendário
      sem nenhum bloco, Escritório sem nada comprado, Amigos sem `@usuário` escolhido. A leitura
      do código diz que aguenta (as consultas usam `maybeSingle`, os `.single()` são todos de
      `insert`), mas ninguém abriu. Vale conferir junto: navegador sem WebGL (o fallback existe
      em `office-scene-3d.tsx`, nunca foi visto rodando) e a tela de um celular real.

**Critério de pronto**: alguém que nunca viu o app abre, entende o que fazer sem você do
lado, e volta no dia seguinte sozinho.

## Depois — evoluções por escolha

Nada aqui é pré-requisito de nada; entram conforme fizer sentido, sem pressa.

### Dívidas conhecidas

- [ ] **Fuso horário por usuário.** O dispatcher de push assume que todo mundo está em
      UTC−3 (`DEFAULT_TZ_OFFSET_MIN`, padrão 180), porque `reminders` guarda hora de parede
      sem fuso. Quem estiver fora do Brasil recebe o push na hora errada — o lembrete aparece
      certo no app, só a notificação toca torta. **Adiado de propósito**: o público da Fase 5
      é todo brasileiro, então o bug é dormente. Quando valer a pena: coluna de offset em
      `push_subscriptions` (o dispositivo sabe o próprio fuso), `lib/push.ts` enviando na
      inscrição, e o dispatcher agrupando por offset em vez de calcular um horário só.
      Não confundir com o formato 12h/24h, que é outra coisa e já está resolvido.
- [ ] **Seletores de hora ainda são 24h.** Quem escolhe AM/PM em Configurações *lê* `2:30 PM`
      no app inteiro, mas ainda *digita* em 24h — os pickers de `time-block-dialog`,
      `invite-dialog` e `task-dialog` alimentam o valor que vai pro banco, e mexer ali troca
      risco de corromper dado por ganho cosmético. Só encarar se incomodar no uso real.

### Escritório vivo v3 — o que sobrou do Escritório

- [ ] **Snapshot compartilhável**: gerar uma imagem da sala para postar. Decisões em
      aberto: render no cliente (canvas do R3F) ou server-side; o que aparece além da
      cena (nível, streak); e se o link é público ou só entre amigos.

### Calendário aberto pra fora

> Importar e exportar `.ics` já existem, em Configurações → "Importar e exportar". O que
> falta aqui é o que depende de outra empresa.

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
