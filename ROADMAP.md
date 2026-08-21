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
> `autoRaf: false` + `lagSmoothing(0)`) **e os `<Canvas>` do app** (`TickerDoGsap` em
> `components/r3f-ticker.tsx`: `frameloop="never"` + `advance()`, com o tempo passando
> por `lib/frame-clock.ts`). Ele saiu do Escritório e virou peça quando a esfera da Neuro
> IA precisou do mesmo tratamento — canvas novo entra por lá, nunca reescrevendo a
> inscrição no ticker à mão.
>
> **Duas coisas para lembrar antes de pôr outro canvas no ticker.** O `advance()` em
> `frameloop="never"` recebe **segundos de cena**, não o instante do rAF — o R3F faz
> `delta = t - clock.elapsedTime`. E `setFrameloop` **zera** `clock.elapsedTime`, então quem
> alterna o frameloop reinicia a animação junto.

- [ ] **Ver as duas cenas rodando no ticker, no olho.** O que dá para conferir daqui já foi
      (355 testes, `tsc`, `next build`), mas ninguém viu nada andando — que é a razão de
      este item ter ficado parado tanto tempo. No deploy: no **Escritório**, o beagle
      pulando, o código descendo no monitor e as mãos no teclado; na **Neuro IA** (chat sem
      conversa começada), a esfera girando devagar e abrindo onde o mouse passa. Se
      estiverem paradas, o vigia do `TickerDoGsap` falhou junto e o caso é de issue, não de
      ajuste fino — porque o vigia existe justamente para devolver o Canvas ao loop nativo
      do R3F quando os quadros param de chegar.
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
  roadmap — como está na seção "Das inspirações para o app", logo abaixo.

O que cada arquivo virou (ou não) está na seção seguinte. Nada foi descartado: o que não
tem item ainda continua sendo referência solta, esperando a tela certa.

O "Particle Sphere" do Originkit **já virou código**: é a esfera do estado vazio da Neuro IA
(`components/neuro-sphere.tsx` + `lib/neuro-sphere.ts`). Serviu de exemplo do que a regra
acima quer dizer — o original abre o próprio `requestAnimationFrame` e fala com o
`WebGLRenderer` na mão, e a versão daqui roda dentro do R3F, no ticker único. Do original
sobrou a ideia (espiral de Fibonacci, repulsão pelo cursor), não uma linha.

- [ ] **Revogar a `ORIGINKIT_API_KEY` no Originkit.** É a parte que só o Gustavo pode
      fazer. A chave já saiu do `NeuroIA.txt` (o valor virou marcador) e a pasta de rascunho
      `frontend/inspirações/` entrou no `.gitignore`, então um `git add -A` distraído não a
      publica — o histórico do git nunca teve o valor, só a menção ao nome da variável.
      Ainda assim ela circulou em texto puro num arquivo baixado: **revogar é o que
      encerra o assunto**. Depois disso, dá para mover o arquivo para
      `frontend/components/inspirações/` e versioná-lo com o resto das referências.

### Das inspirações para o app

> Rodada de **16/08/2026**: o Gustavo passou print por print dizendo o que cada um seria e
> por quê. Aqui está o que ficou decidido.
>
> **A régua, que ele repetiu três vezes**: o site já está bom. Nada aqui é reforma — é
> detalhe que soma. Quando um item brigar com "minimalista", ganha o minimalista.

#### Entrar e criar conta — `better-auth-6.webp`

> **O código está pronto** (`components/social-login.tsx` + `lib/auth-metodos.ts`): os
> botões, as marcas em SVG e o selo "último acesso". O que falta não é código.

- [ ] **Habilitar os provedores no Supabase e ligar a env.** Nesta ordem, que é fácil
      inverter: primeiro Authentication → Providers no painel (Client ID/Secret + a callback
      URL que ele mostra), **depois** `NEXT_PUBLIC_OAUTH_PROVIDERS="google,github"` na
      Vercel. Ao contrário, o botão aparece antes de funcionar — e é por isso que a env
      existe: sem ela o código não tem como adivinhar o que está configurado do outro lado.
      Enquanto a env estiver vazia, a tela é exatamente a de hoje.
      **Custo escondido**: o Apple exige conta paga de Apple Developer (99 USD/ano); Google
      e GitHub são de graça.

#### Dashboard — `Captura de tela 2026-08-07 213605.png`

> **Entregue** como "Seus números", **fechada por padrão** —
> `components/metricas-dashboard.tsx` + `lib/dashboard-metricas.ts`. As três perguntas que
> o item pedia, uma por aba: concluídas por dia (linha, 14 dias), constância na semana
> (colunas, 4 semanas) e melhor hora (colunas, 24h). Tudo sai de UMA consulta —
> `tasks.completed_at` dos últimos 28 dias — feita só quando a seção abre.
>
> **O degradê laranja → verde da referência não veio, e é decisão, não esquecimento**:
> duas matizes para MAGNITUDE inventam uma polaridade que o dado não tem. O que ficou foi
> a área esmaecendo numa matiz só. Nas colunas vale o padrão de ênfase — o dia (ou a hora)
> que responde a pergunta acende, o resto recua —, e não um tom por altura, que repetiria
> com a cor o que a altura já diz.
>
> Duas coisas foram medidas em vez de olhadas: o cinza de apoio está a **0.7** de
> opacidade porque a 0.3 a cor já misturada com o fundo dava 1,54:1, abaixo do piso de
> 3:1 de uma marca com dado; e a linha ganhou margem nas pontas porque a bolinha do
> último ponto saía metade para fora do SVG.

- [ ] **Um segundo olhar nos números, com dados de verdade.** Os gráficos foram conferidos
      em captura, com dados fabricados — o que pega geometria e colisão de rótulo, mas não
      responde se as três perguntas são as **certas**. Com algumas semanas de uso real:
      "melhor hora" diz algo que você não sabia? "constância" muda o que você faz? A que
      não mudar nada sai, e não vira quatro.

#### Avatar por iniciais — `Captura de tela 2026-08-07 213710.png`

> **Entregue, e fechado.** O retrato do header tem quatro degraus, do mais específico ao
> mais genérico: a foto enviada em Configurações → Perfil, a foto da conta Google/GitHub, o
> bonequinho montado no editor (`lib/avatar.ts` → `fetchRetrato`), as iniciais
> (`lib/iniciais.ts`). Gustavo Cirino → **GC**, com a cor saindo do nome por hash. O
> enquadramento cabeça-aos-ombros virou `AvatarRetrato` em `components/avatar-figure.tsx`,
> compartilhado com a lista de Amigos.
>
> A foto enviada mora no bucket `avatars` do Storage (`supabase/foto_perfil.sql`) e o
> endereço dela no `user_metadata`, em chave própria — nunca em `avatar_url`, que o
> Supabase reescreve a cada login social.

#### Cor e camada visual — `214017.png` e `214418.png`

Dois efeitos de fundo, e os dois pedem o mesmo cuidado: fundo que compete com o conteúdo
vira ruído.

> O **degradê radial que respira** (`214017`) está entregue: `components/fundo-arcos.tsx`,
> na Neuro IA. Aparece só no tema ESCURO — a referência é uma tela preta com a cor vindo
> de baixo, e no claro brigaria com a malha pastel que já é o fundo dali. Em CSS, não com
> o ShaderGradient, pelo mesmo motivo da malha: a página já tem o canvas da esfera, e o do
> shader é o que não entra no ticker único.
> A **borda que gira** (`214418`) está entregue: `components/borda-viva.tsx`, na Neuro IA.
> Em CSS puro — o `@property` dá tipo ao ângulo, e é isso que torna a `conic-gradient`
> animável sem canvas e sem JS por quadro. Quase invisível em repouso, acende enquanto a
> resposta chega.

- [ ] **A mesma borda no Modo Foco**, se fizer sentido. Lá o estado que ela sinalizaria
      seria a sessão correndo — vale só se não competir com os ambientes animados, que já
      são o efeito principal daquela tela.

#### Neuro IA — `202826.png` e `202901.png`

> **A tela está fechada.** Esfera de partículas, borda que acende, barra em pílula centrada
> e fundo em malha pastel. A decisão que amarrou tudo saiu de comparar as duas imagens: na
> `202826` o campo está vazio e o botão redondo é a onda sonora; na `202901` há texto e o
> mesmo botão é a seta de enviar. **Um botão, dois papéis** — e por isso a conversa ao vivo
> saiu do header.
>
> Três efeitos foram para CSS em vez de canvas (borda, malha, e a esfera é o único WebGL da
> página). Não foi economia: o canvas do ShaderGradient é justamente o que **não** entra no
> ticker único, e abriria um segundo `requestAnimationFrame` concorrendo com a esfera.

- [ ] **Ver a tela da Neuro IA no olho, clara e escura.** É o item que sobra de tudo isto e
      não dá para fazer daqui. No claro a malha deve aparecer de verdade; no escuro, ser só
      uma insinuação — se virar névoa por cima do texto, o ajuste é `--malha-*` no `.dark`
      de `globals.css`, e é só trocar número.

#### Idioma e região — `202645.png` e `202658.png`

> **Entregue** em Configurações → Aparência: `components/seletor-regiao.tsx` +
> `lib/regiao.ts`, com as bandeiras desenhadas em `components/bandeira.tsx`. Da referência
> ficou a animação de abrir; o mundo inteiro e o campo de busca saíram, porque com dois
> itens buscar dá mais trabalho do que ler os dois. O botão diz "Brasil", não "24 horas".
>
> Duas decisões que valem para quem mexer nisso: a região **não tem armazenamento
> próprio** — ela é derivada do formato de hora que já estava no localStorage, porque com
> um mapa 1-para-1 guardar as duas coisas só criaria a chance de discordarem. E as
> bandeiras são SVG, não emoji: o Windows não tem glifo para bandeira e 🇧🇷 vira o texto
> "BR", o oposto do que a referência queria.

- [ ] **Traduzir o app é outro item, e é grande.** A bandeira sugere idioma, mas o app
      inteiro está em português cravado no meio do JSX. Trocar de verdade quer dizer extrair
      cada string para um dicionário — trabalho de dias, não de tarde. Enquanto isso não
      acontecer, o seletor diz o que faz de fato: **região e formato**, nunca "idioma".
      Quando uma terceira região entrar, é `lib/regiao.ts` que muda primeiro — se ela usar
      24h como o Brasil, a derivação acima deixa de servir e a região passa a ser o dado
      guardado, com o formato saindo dela.

#### Os arquivos de código da pasta

Varridos um a um (nome mais o que o código importa). Onde cada um encaixaria:

O `lendo-tutorial.jsx` (`EdgeBlur`) saiu da tabela: `hooks/use-mascara-rolagem.ts`
+ `lib/mascara-rolagem.ts` (puro, testado) desvanecem as bordas de uma área que
rola — leitura minimalista do efeito, uma máscara CSS aditiva, sem mexer no
layout. **Aplicado no chat da Neuro IA e na lista de notas** (que só rola no
mobile). As **tarefas ficaram de fora de propósito**: aquela página rola a
janela inteira, não tem container interno para mascarar — pôr o efeito ali seria
mascarar a `main` do app, outra coisa. Item encerrado; quem quiser o efeito numa
lista nova é só `style={useMascaraRolagem(ref)}` no container de scroll.

O `inspiração-seção-tarefas.jsx` (`GradientButtonGroup`) também saiu: as abas de
escopo de Tarefas (Hoje / Próximos / Todas) ganharam a **pílula ativa que
desliza** entre as opções — o MESMO `layoutId` que o Dock já usa, e não botões
com degradê. Foi decisão de gosto explícita: o degradê brigaria com o
minimalista; o indicador que escorrega é o vocabulário de animação que o app já
fala. A tela ficou melhor sem trazer uma linguagem nova só para ela.

| Arquivo | O que é | Onde encaixa |
|---|---|---|
| `feedback.jsx` | `MorphSurface` — o botão vira o formulário, sem diálogo | O botão de feedback. É o encaixe mais direto da pasta inteira |
| `prompts.jsx` | `PromptLibrary` — biblioteca com criar, listar e estado vazio | Neuro IA: os `QUICK_PROMPTS` fixos viram salvos e editáveis |
| `notas-cores.jsx` | Painel flutuante de cor e imagem | Cor da nota, em Notas |
| `color-picker.jsx` | Paleta gerada (Poline), com travar e copiar | Cor de fundo do Escritório e a paleta de `lib/reminders.ts` |
| `transição-dinâmica.jsx` | `DynamicIsland` | O relógio flutuante do Modo Foco minimizado |
| `tutorial.jsx` · `tutorial2.jsx` | Onboarding em passos | O "primeiro contato" da Fase 5, que hoje é só verificação |
| `tarefas.jsx` | Lista com recorrência e slider | Recorrência de tarefa, que hoje mora num diálogo |
| `navegação-effects.jsx` | Ícones que trocam de forma | O Dock |
| `youtube-button.jsx` | `FamilyButton` — flutuante que expande | Ações rápidas do dashboard |
| `votacao2-feedback.tsx` | `PollWidget` — enquete de uma pergunta | Perguntar ao usuário-teste sem ele ter de escrever |
| `votacao-feedback.jsx` | Grade de ícones de serviços (Google, GitHub, Notion…) | Serve de referência de ícone para o login social acima |
| `convite.jsx` | Painel estilo central de controle | Convite de compromisso, em Amigos |
| `popover.jsx` | Popover com corpo, botões e fechar | Genérico — base para os de cima, não item próprio |
| `dashboard.jsx` | `GridBeam` — feixes correndo num grid | Fundo do dashboard, se a seção de métricas pedir |
| `carrosel.jsx` · `pricing.tsx` | Carrossel de logos e tabela de planos | **Não encaixam**: app pessoal, sem clientes e sem planos |

Nenhum é pré-requisito de nada, e nenhum vale sozinho. O critério para tirar um da lista é
**a tela ficar melhor** — não o componente ser bonito na pasta.

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
