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

- [ ] **Calibrar o realismo com uso real.** A troca pra PBR foi validada em render headless,
      não no olho de quem usa. Ajustar rugosidade/luz conforme o feedback: o alvo é "3D de
      verdade", nem plástico de desenho nem foto.

**Itens que existem mas não convencem**

- [ ] **Conferir o novo ângulo de câmera no olho.** A cena olhava para a nuca do boneco
      (rosto a 137° da câmera: óculos, olhos e boca nunca apareciam, e do boné só a copa).
      O azimute saiu de 45° — a diagonal do canto — para 15°, e o rosto foi para ~112°,
      quase perfil. Altura e distância são as mesmas, só o azimute mudou, mas o
      enquadramento da sala muda bastante: a parede lateral vira o fundo e a do fundo
      recua para a esquerda. É uma constante só, `AZIMUTE` em `lib/office-camera.ts`.
      **Limite conhecido**: ver o rosto de FRENTE exigiria a câmera atrás da parede do
      fundo, que passaria a tapar a sala. Perfil é o teto desta planta — só uma parede a
      menos mudaria isso.

### Camada visual — ShaderGradient · Lenis · three.js · GSAP

> Quatro repositórios de referência, escolhidos em 10/08/2026:
> [shadergradient](https://github.com/ruucm/shadergradient) (MIT, gradientes 3D animados que
> rodam dentro do R3F que já temos), [lenis](https://github.com/darkroomengineering/lenis)
> (MIT, scroll suave sem quebrar âncora/sticky/acessibilidade),
> [three.js](https://github.com/mrdoob/three.js) (já é dependência — aqui entra como técnica,
> não como pacote novo) e [gsap](https://github.com/greensock/gsap) (grátis com todos os
> plugins desde a 3.13, patrocínio da Webflow).
>
> **O framer-motion continua sendo o padrão de animação de UI.** O GSAP entra só onde o FM
> não alcança (SplitText, MotionPath, ticker único) — migrar o que já funciona seria
> retrabalho sem ganho.
>
> **Regra que vale para tudo desta seção**: efeito pesado é opt-in ou desligável, respeita
> `prefers-reduced-motion`, tem fallback estático e pausa quando a aba está oculta. Um item
> por commit — a ordem abaixo é a ordem de execução.

> O Lenis já está montado (`components/smooth-scroll.tsx`, envolvendo o `AppShell`). Efeito
> novo que precise rolar a página deve usar o `useLenis()` dele, não `window.scrollTo`.
>
> O ShaderGradient já está instalado e em uso (fundo do Entrar/Criar conta e os ambientes
> animados do Modo Foco, em `components/focus-gradient.tsx`). Gradiente novo entra por lá.

**three.js — sem dependência nova**

> Duas coisas que pareciam pedir shader saíram sem ele, movendo malhas: o código que rola
> na tela (`lib/office-code-scroll`) e a chuva no vidro da janela (`lib/office-rain`). São
> poucas dezenas de malhas, e assim a conta vira função pura testável — um shader seria mais
> bonito e completamente invisível para os testes. Shader novo só se o custo aparecer.

- [ ] **InstancedMesh** quando o catálogo da loja crescer: centenas de objetos em 1 draw call.
- [ ] **WebGPU + TSL** (`three/webgpu`) — já está no core, mas é migração grande. Só depois
      que o resto desta seção estiver estável.

**GSAP — pontual**

> O pacote já está instalado (`gsap` 3.15, todos os plugins livres). SplitText e MotionPath
> já estão em uso — `components/split-greeting.tsx` e `components/coin-flight.tsx`. O
> `gsap.ticker` já puxa o Lenis (`TickerUnico` em `components/smooth-scroll.tsx`,
> `autoRaf: false` + `lagSmoothing(0)`) **e a sala 3D** (`TickerDoGsap` em
> `components/office-scene-3d.tsx`: `frameloop="never"` + `advance()`, com o tempo passando
> por `lib/frame-clock.ts`).
>
> **Duas coisas para lembrar antes de pôr outro canvas no ticker.** O `advance()` em
> `frameloop="never"` recebe **segundos de cena**, não o instante do rAF — o R3F faz
> `delta = t - clock.elapsedTime`. E `setFrameloop` **zera** `clock.elapsedTime`, então quem
> alterna o frameloop reinicia a animação junto.

- [ ] **Ver a sala rodando no ticker, no olho.** O que dá para conferir daqui já foi
      (334 testes, `tsc`, `next build`), mas ninguém viu a cena andando — que é a razão de
      este item ter ficado parado tanto tempo. No deploy, olhar três coisas no Escritório:
      o beagle pulando, o código descendo no monitor e as mãos no teclado. Se estiverem
      paradas, o vigia do `TickerDoGsap` falhou junto e o caso é de issue, não de ajuste
      fino — porque o vigia existe justamente para devolver o Canvas ao loop nativo do R3F
      quando os quadros param de chegar.
- [ ] **O canvas do ShaderGradient continua no loop dele — e é bloqueio do pacote.**
      `ShaderGradientCanvas` não repassa `frameloop`, e forçar por dentro com
      `setFrameloop("never")` vira cabo de guerra: o `configure()` do R3F roda no layout
      effect **a cada render** e reverte para `"always"` (`if (state.frameloop !== frameloop)`),
      e cada ida e volta zera o `clock.elapsedTime` — ou seja, o gradiente reiniciaria do
      começo a cada re-render do Modo Foco. Saídas reais: PR upstream repassando a prop, ou
      vendorizar o componente. **Ganho pequeno de propósito**: o Modo Foco é overlay e já
      para o Lenis (`PausaComDialogo`), então ali não há scroll para sair de fase — era o
      motivo do ticker único. Só vale se o pacote resolver de graça.

### A pasta `frontend/components/inspirações/`

Pasta de **referência visual**, não de código de produção: prints e trechos de componentes
que o Gustavo gostou. Nada ali é importado pelo app.

- **Nada ali é compilado.** A pasta está no `exclude` do `tsconfig.json` — por isso os `.tsx`
  podem importar pacotes que não temos (`@number-flow/react`, `react-intersection-observer`,
  `@/components/originkit/...`). Sem essa exclusão o `next build` typechecka a pasta e falha.
- Para usar uma ideia de lá, **reescreva** o componente em `components/` nos padrões do
  projeto (Tailwind + shadcn/ui + framer-motion + tokens oklch). Nunca copiar e colar: os
  arquivos vêm de outros design systems.
- Quando um print virar decisão de design, anotar a referência no item correspondente deste
  roadmap — como está feito no item de Login/Signup acima.

Além das referências de auth já citadas, valem nota: `Captura de tela 2026-08-10 202826.png`
(mesh gradient pastel com uma barra "Ask anything" flutuando — ideia para o chat da Neuro IA)
e `skiper.tsx` / `time.tsx` (números animados com `NumberFlow` — ideia para o timer do Modo
Foco e para os contadores de XP).

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
