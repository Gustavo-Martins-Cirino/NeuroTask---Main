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
- [ ] **Seletores nativos de hora seguem o SO, não o app.** O wheel do `time-block-dialog` já
      respeita a preferência 12h/24h (mostra 12,1..11 + AM/PM; o valor guardado segue sempre
      24h). Sobram os `<input type="time">` de `task-dialog` e `invite-dialog`, que exibem AM/PM
      conforme o locale do SISTEMA, não a preferência do app — dá pra viver com isso (o navegador
      não deixa forçar o formato do input nativo sem trocá-lo por um custom).

### Escritório 3D — do desenho para o ambiente

> A primeira rodada de refino já foi: materiais **PBR** com acabamento por superfície +
> environment procedural, sem os contornos de tinta (era o que gritava "cartoon"); skins fora
> da loja (só trocavam a cor da camisa, que o editor de avatar faz de graça) e loja navegada
> por categoria. O que sobra é **conteúdo**: a cena está mais realista, mas vários itens ainda
> não estão à altura dela.
>
> **Regra prática**: item novo precisa de linha em `shop_items` (SQL) além do modelo 3D —
> sem isso a compra falha com `ITEM_INEXISTENTE`. Foi o caso do beagle, que mora no
> `office_3d.sql` enquanto a mensagem mandava rodar o `coins_shop.sql`.

**Vida na cena**

- [ ] **Boneco digitando.** Hoje ele só respira. Quando estiver "trabalhando", as mãos
      precisam se mexer no teclado — é o que faz a sala parecer viva em vez de um diorama.
- [ ] **Calibrar o realismo com uso real.** A troca pra PBR foi validada em render headless,
      não no olho de quem usa. Ajustar rugosidade/luz conforme o feedback: o alvo é "3D de
      verdade", nem plástico de desenho nem foto.

**Itens que existem mas não convencem**

- [ ] **Cadeiras só mudam de cor.** As três precisam de silhueta própria: a padrão como
      cadeira de plástico de bar, a ergonômica de fato bonita (encosto alto, apoios), e a
      gamer com a cara de gamer — não a mesma malha pintada de vermelho.
- [ ] **Estante de livros feia.** Dá pra ver que é uma estante, mas não os livros. Quer
      lombadas visíveis, alinhadas e variadas na prateleira.
- [ ] **Neon "focus" ilegível.** Parece um quadro aleatório na parede; não dá pra ler nada.
      Ou vira texto legível de verdade, ou vira outro objeto.
- [ ] **Janela para a cidade parece mancha.** Hoje são formas soltas na parede. Precisa ler
      como janela com vista — moldura, vidro, prédios ao fundo.
- [ ] **Boné muito reto.** Falta a curva da aba e uma inclinação; do jeito que está parece
      uma caixa na cabeça.
- [ ] **Óculos (grau/escuros) não aparecem.** Equipar e desequipar não muda nada visível —
      confirmar se o modelo está sendo montado, e deixá-los legíveis no ângulo isométrico.
      (Chapéu e óculos são slots separados de propósito: dá pra usar os dois, um de cada.)

**Catálogo novo**

- [ ] **Mais paredes**: preta, cinza e uma com papel de parede (padrão, não cor chapada).
- [ ] **Mais criatividade nos objetos**, com o Escritório valendo como vitrine do progresso:
      prateleira, uma luminária melhor que a atual, relógio de parede, um computador mais
      caprichado, a opção de trocar o desktop por **notebook**, e **fita de LED RGB** pra
      iluminar o quarto com cor.

### Calendário aberto pra fora

> Importar e exportar `.ics` já existem, em Configurações → "Importar e exportar". O que
> falta aqui é o que depende de outra empresa.

- [ ] **Sincronização bidirecional de calendário** (Google/Outlook): o feed assinável
      (só-leitura) já existe — Configurações → "Assinar no Google/Outlook", rota
      `/api/calendar/[token]` (token secreto por usuário). O que falta é escrita nos dois
      sentidos, que traz OAuth e conflito de sincronização — só se houver demanda real.
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
