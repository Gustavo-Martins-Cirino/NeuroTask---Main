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

> **As telas vazias foram abertas (28/08) — a metade que dava para fazer daqui.** As sete
> telas protegidas foram montadas fora do `/app` e carregadas com o banco respondendo VAZIO
> em tudo (nenhuma tarefa, bloco, nota, item comprado, amigo; `single` devolvendo PGRST116).
> **Nenhuma quebrou**: zero erro de JS nas sete, e cada uma tem estado vazio escrito — o
> dashboard com o "Comece por aqui 0/3", o Escritório com "Seu cantinho começa simples", os
> Amigos pedindo o @usuário. O Escritório também renderiza sem GPU de verdade (swiftshader),
> o que é a primeira notícia sobre o caminho sem WebGL acelerado.
>
> **Achou um defeito, e na primeira frase que uma conta nova lê**: "Sexta-Feira, 28 De
> Agosto". O `capitalize` do CSS sobe TODA palavra, e `toLocaleDateString("pt-BR")` devolve
> tudo minúsculo — em inglês o mesmo CSS acerta ("Friday, August 28"), e é por isso que o
> hábito passa despercebido. Estava em quatro lugares: dashboard, cabeçalho do calendário,
> seletor de data e diálogo de bloco. Virou `lib/texto.ts` (`maiusculaInicial`). Onde o rótulo
> é uma palavra só — as abas dia/semana/mês/ano —, o `capitalize` ficou, porque ali ele está
> certo.
>
> **O que este item ainda pede, e não dá para fazer daqui**: conta nova de verdade (as
> políticas de RLS e os gatilhos do cadastro não passam por esta simulação), aparelho que não
> é o seu, e a tela de um celular real.

> 🔴 **Varredura de queda do banco (28/08): o dashboard quebrava, e o bug era de horas antes.**
> As oito telas foram abertas com o Supabase respondendo 500, com a rede caindo e com a
> resposta estourando o tempo — a sessão continuando válida, porque o que cai é o BANCO, não
> o login. Sete aguentaram. O **dashboard ia para a tela de erro nos três modos**, e ele é a
> primeira coisa que se vê depois de entrar.
>
> A causa: um `useEffect` que eu tinha posto ABAIXO de `if (!pergunta) return null` na
> enquete, poucas horas antes. Primeira renderização com quatro hooks, seguinte com cinco —
> React #310, e o React derruba a árvore inteira. **Passou por `tsc`, por 684 testes e por
> `next build`**, porque nenhum deles olha ordem de hook.
>
> **O buraco por trás disso: o projeto não tem eslint.** A regra que pega isso
> (`react-hooks/rules-of-hooks`) existe, é padrão, e nunca rodou aqui. Em vez de instalar uma
> toolchain, a regra virou teste — `lib/hooks-depois-de-return.test.ts`, escrita com o
> compilador do TypeScript, que já é dependência. AST e não regex: regex confunde `return`
> dentro de callback com saída do componente e enche de falso positivo (tentei, deu doze).
> Conferido que ela pega o bug real, reintroduzindo-o.
>
> **O recado que faltava: resolvido (29/08).** Com o banco fora as telas mostravam estado
> VAZIO — quem abrisse numa queda lia "Nenhuma tarefa" e concluía que tinha perdido tudo. Não
> era quebra, era susto, e susto é o que faz voltar para o calendário de onde a pessoa veio.
>
> Entrou um aviso único no `AppShell` (`components/aviso-conexao.tsx`), alimentado por um
> observador no `fetch` do cliente Supabase. **No cliente e não nas telas**: são oito telas com
> consultas próprias, e avisar em cada uma seria oito chances de esquecer a nona. O observador
> só ESCUTA — repassa resposta e relança erro exatamente como vieram.
>
> **Duas decisões, as duas com teste** (`lib/conexao.ts`): avisa na SEGUNDA falha seguida, não
> na primeira, porque requisição isolada falha por motivo bobo o tempo todo e banner que pisca
> sozinho ensina a ignorar banner; e **4xx não conta como queda** — 401 é sessão vencida, 403 é
> permissão, 404 é linha que não existe, e todos são o servidor funcionando e dizendo não.
> Anunciar "sem conexão" num 401 mandaria a pessoa reiniciar o roteador por um problema do app.
>
> O texto diz o que houve **e o que não houve**: "Seus dados estão a salvo" é a metade que
> importa, porque sem ela a tela vazia por trás do aviso continua parecendo perda de dados.
>
> Conferido nos cinco cenários: banco de pé (sem aviso), 500 e rede fora (avisa), 401 e 404
> (sem aviso).

> **Varredura de tema claro (28/08): as oito telas, medindo contraste — está limpo.** Nenhum
> texto abaixo do piso da WCAG (4,5:1, ou 3:1 no texto grande), em nenhuma das oito, em
> NENHUM dos dois temas. O fundo do canvas do Escritório segue o tema como devia. Fecha a
> preocupação que a esfera da Neuro IA tinha levantado: aquele era um caso isolado de
> blending, não um sintoma de tema claro malcuidado.
>
> ⚠️ **A varredura quase acusou um bug que não existe**, e a armadilha vale para a próxima:
> forçar a classe `dark` no `<html>` engana o CSS mas NÃO o `next-themes`, e quem lê
> `resolvedTheme` (o fundo do Escritório, a cor da esfera) continua no tema antigo. O
> Escritório apareceu com canvas escuro numa página clara e parecia defeito. **Trocar o tema
> pelo botão do próprio app** é o único jeito de medir isso — e o rótulo dele mora num
> `<span class="sr-only">`, não num `aria-label`.

> **Varredura de celular (28/08): as oito telas a 390×844, com dados de conta em uso.**
> Nenhuma tem rolagem horizontal e nenhuma quebrou. Três achados, dois já consertados:
>
> · **Os botões "Comprar" do Escritório tinham 28px de altura** — a ação principal da tela,
>   na faixa de errar o toque (o guia da Apple pede 44pt, o do Android 48dp). Foram para 36
>   no celular e continuam 28 no desktop, onde a densidade da grade é que manda. As bolinhas
>   de cor do avatar (20px) e as abas da loja (22px) subiram junto. Alvos abaixo de 32px na
>   tela: de 30 para 17, e os que sobraram são secundários.
> · **O cartão "Em andamento" não tinha saída.** Fixo no canto, ele fica sobre o conteúdo o
>   tempo todo enquanto houver tarefa em andamento — e no celular chegava a tapar um botão
>   "Comprar" da loja. Rolar não resolve, porque é `fixed`. Ganhou um ✕, que vale só para a
>   tarefa ATUAL: começar outra traz o aviso de volta.
> · **O calendário abria na semana, que não cabe num telefone** (`min-w-[760px]` na grade).
>   Não era quebra — o container rola sozinho —, mas a pessoa chegava vendo um pedaço de dois
>   dias. Das duas saídas previstas, a escolhida foi a menos invasiva: **no celular o padrão
>   vira "dia"**, e a semana continua a um toque. A grade não foi reescrita como lista.
>   A decisão vale UMA vez, na montagem, e some no instante em que alguém toca numa aba —
>   girar o telefone depois disso não pode arrancar a visão que a pessoa escolheu.
>
> **Uma regressão minha, pega na segunda passada**: com as bolinhas maiores, "8 itens
> conquistados" virou "8…". A frase passou a ocupar a linha inteira no celular.

- [ ] **Primeiro contato num aparelho que não é o seu.** Criar uma conta nova de verdade e
      percorrer o fluxo principal com o banco zerado: dashboard sem nenhuma tarefa, calendário
      sem nenhum bloco, Escritório sem nada comprado, Amigos sem `@usuário` escolhido. A leitura
      do código diz que aguenta (as consultas usam `maybeSingle`, os `.single()` são todos de
      `insert`), mas ninguém abriu. Vale conferir junto: navegador sem WebGL (o fallback existe
      em `office-scene-3d.tsx`, nunca foi visto rodando) e a tela de um celular real.
      Agora a conta nova é recebida por um **guia de boas-vindas** (`components/onboarding.tsx`,
      montado no AppShell) — quatro passos com a tese, aparece uma vez por conta. Ele orienta,
      mas **não substitui esta verificação**: continua faltando abrir de fato as telas vazias e
      ver se o guia cai bem num celular real.

**Critério de pronto**: alguém que nunca viu o app abre, entende o que fazer sem você do
lado, e volta no dia seguinte sozinho.

## Depois — evoluções por escolha

Nada aqui é pré-requisito de nada; entram conforme fizer sentido, sem pressa.

### Dívidas conhecidas

> **Fuso horário do push: resolvido (25/08).** Era o plano escrito aqui, feito como estava:
> coluna `tz_offset_min` em `push_subscriptions` (`supabase/push_tz.sql`), `lib/push.ts`
> mandando `getTimezoneOffset()` na inscrição, e o dispatcher percorrendo um grupo por fuso
> em vez de um horário só (`lib/push-fusos.ts`). Quem tem aparelho em dois fusos entra nos
> dois grupos de propósito: o lembrete toca no primeiro em que a parede chegar, e a trava
> `pushed` — gravada antes do grupo seguinte — impede o segundo. A hora escrita no convite
> de compromisso passou a ser a de quem recebe, não a do Brasil.
>
> **Pedia um passo do Gustavo**: rodar `push_tz.sql`, e desligar/ligar o push em
> Configurações. O fuso mora na inscrição, então quem já tinha push ligado continua sem ele
> (e cai no padrão) até se reinscrever.
>
> **Um bug de meia-noite saiu junto**, achado ao escrever o teste: a janela de dez minutos
> era calculada voltando no relógio, então à 00:05 ela virava [23:55, 00:05] — vazia dentro
> da data de hoje. Todo lembrete marcado nos dez primeiros minutos do dia nunca chegava, em
> qualquer fuso. Agora a janela para em 00:00.

> **Fuso no bot do Telegram: resolvido (27/08).** O que de fato usava o
> `DEFAULT_TZ_OFFSET_MIN` era o `/hoje` — a virada do dia e o "HH:mm" da agenda (o parser do
> bot nunca leu data; o item dizia "amanhã 9h" por engano). Quem estivesse em Lisboa às 23h
> já via a agenda de amanhã, e às 00:30 ainda via a de ontem.
>
> **A saída foi a que o item previa, e as duas ao mesmo tempo.** O fuso do navegador pega
> carona no CÓDIGO DE PAREAMENTO — é o único momento em que o app fala com o Telegram — e
> fica gravado no vínculo (`supabase/telegram_tz.sql`). Quem parear pelo aparelho errado, ou
> viajar depois, cai no segundo palpite: a inscrição de push mais recente, que é reescrita
> toda vez que alguém liga o push num aparelho. O padrão do servidor é o último recurso.
>
> **`fusoDoUsuario` não usa `??`, e isso é o teste que mais importa**: zero é fuso legítimo
> (Londres no inverno), e um `??` distraído mandaria quem está em UTC para o horário do
> Brasil.
>
> **Banco sem o SQL rodado não pode quebrar nada**, e foi o cuidado que mais mexeu no código:
> o webhook lê os vínculos com `select("*")` — pedir a coluna nova devolveria erro, o vínculo
> viria nulo e o bot responderia "esta conversa não está ligada" a quem já está pareado. Na
> mesma linha, gerar o código tenta com o fuso e repete sem ele se a coluna não existir.
>
> **Pede um passo do Gustavo**: rodar `supabase/telegram_tz.sql` e parear de novo (o vínculo
> antigo fica sem fuso e cai no palpite seguinte).
>
> Não confundir com o formato 12h/24h, que é outra coisa e já estava resolvido.
> **Seletores de hora**: resolvido. O wheel virou `components/time-select.tsx` e os três
> diálogos (bloco de tempo, tarefa, convite) usam o mesmo — a preferência 12h/24h vale para
> LER e para DIGITAR. O risco que segurava este item (mexer no que vai pro banco) não se
> materializou: entrada e saída continuam "HH:mm" em 24h, igual ao input nativo.

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
>
> **Agora tem teste (28/08)**: `lib/shop-sql.test.ts` cruza o `CATALOG` com os inserts dos
> `.sql` e quebra se um item entrar na loja sem a linha dele. Não confere BANCO, confere
> repositório — se o arquivo existe e ninguém rodou, a falha é do passo manual e o README diz
> qual é. Conferido que ele pega o erro de verdade, com um item de mentira.
>
> **Estado do banco em 28/08 (conferido, não presumido)**: 53 itens em `shop_items`, e todo
> item da loja tem linha — o Gustavo rodou todos os SQLs pendentes. Sobram 6 linhas órfãs das
> `skin-*`, que saíram da loja mas continuam no banco; ficam onde estão, porque apagá-las
> quebraria o `user_items` de quem já comprou.
>
> **Uma armadilha ao conferir isso**: `shop_items` tem RLS `for select to authenticated`, então
> uma consulta anônima devolve LISTA VAZIA em vez de erro — parece tabela vazia e não é.

> **A cena voltou a ocupar a largura toda (31/08), e a loja ganhou três seções.** A prévia 3D
> tinha virado uma coluna FIXA à esquerda, com a loja ao lado — resolvia um problema real (ao
> rolar a loja, a cena saía da tela e com ela a prévia de como o item ficaria). O Gustavo
> recusou: partida ao meio a sala fica pequena demais, e **o Escritório é a recompensa do app,
> não uma miniatura de apoio.**
>
> O problema da prévia foi resolvido por outro caminho, que era o que ele sugeriu: **segmentar
> melhor**. `decor` tinha TREZE itens — de longe a maior lista e a única sem um nome que
> dissesse o que havia dentro. Virou três, pelo que a coisa É, que é como quem compra procura:
> **Plantas e bichos** (4), **Luz** (3) e **Enfeites** (6). Com isso e as 4 colunas de volta, a
> maior categoria cabe em 4 linhas e a de entrada cabe em UMA — rolar quase não afasta a cena,
> que era o motivo da coluna fixa.
>
> A categoria do banco não acompanha e não precisa: `shop_items.category` é gravada e nunca
> lida — nem pela RPC de compra, nem pelo painel do dono. Quem decide filtro e exclusividade é
> o `CATALOG` do código.

**Rodada de 29/08 — lista do Gustavo, usando o app no celular**

> Levantada com o app na mão, e por isso mistura defeito de código com incômodo de uso. O
> que já foi CONFERIDO no repositório está marcado; o resto é reprodução dele.

**Confirmados aqui, com prova**

> **Sons mortos: resolvidos (29/08).** `vinyl.mp3` e `oldies.mp3` estavam declarados e não
> existiam no repositório — o botão aparecia e clicar não fazia nada. O Gustavo notou o vinil;
> o "Oldies · Rádio antigo" tinha o mesmo problema sem ninguém ter visto. Os dois saíram da
> lista, e `lib/sound-mixer-arquivos.test.ts` vigia as DUAS pontas: som sem arquivo quebra o
> teste, e arquivo sem som na lista também (peso morto no bundle). **Para trazê-los de volta**,
> é pôr o mp3 em `public/sounds` e re-adicionar a linha — o teste passa a proteger.
> **"Claro" × "Branco": resolvido (29/08).** Eram #f5f5f5 e #ffffff — a mesma cor com dois
> nomes. O "Claro" virou **"Papel"**, um branco quente (#f2ece1). A diferença entre os dois
> passa a ser TEMPERATURA, que se enxerga, em vez de meio ponto de brilho, que não.
> **"Transparente": resolvido (29/08), e o Gustavo estava certo com número.** O CSS sempre
> esteve correto (60% de tinta + blur 24px, aplicados). O problema é que a tinta é a MESMA COR
> do fundo do app: 60% de `--background` sobre uma página `--background` dá a própria cor de
> volta. **Medido: só 3% dos pixels diferiam de escolher "Preto"** — o ambiente existia no
> código e não na tela.
>
> A tinta caiu para 35% (agora 15,6% de diferença, cinco vezes mais presença) e **o desfoque
> cheio ficou**. Essa segunda metade é a decisão: baixar o desfoque junto deixava as tarefas
> de trás LEGÍVEIS durante o foco, que é o oposto do que a tela existe para fazer. A
> transparência tem que vir da tinta; o desfoque é o que separa "ver que o app está atrás" de
> "ler o que está atrás".
>
> **Uma armadilha de medição**: testar sobre um fundo colorido (listras) dá aprovado —
> qualquer transparência aparece ali. O teste honesto é sobre o fundo ESCURO do próprio app,
> que é o que fica atrás na vida real.
> **Óculos: resolvido (29/08).** O conceito estava certo (de costas se vê a haste, não a
> lente) e o tamanho não: a haste saía de `hy - 6.5` e cruzava o alto de um crânio de raio 10.
> Medido, ela ocupava **20% da área da cabeça**; agora corre rente à silhueta, começando a
> 6,6 do centro em vez de 3,5, e ocupa **8%**. Óculos visto de costas quase não aparece — é
> essa a informação que o desenho precisa dar.

**Da lista dele, para reproduzir antes de mexer**

> **Corpo masculino e feminino: resolvido (29/08).** A queixa estava certa e dava para
> medir: os dois troncos eram o MESMO desenho em V (largo na axila, estreito no quadril),
> um com 24 de largura e outro com 20. Escalar não muda silhueta, muda tamanho.
>
> **O que separa as duas de longe são três relações, e nenhuma é largura** (`lib/avatar-silhueta.ts`):
> o ombro contra o quadril (V no masculino, ampulheta no feminino, onde o quadril passa o
> ombro), a cintura (quase inexistente num, o aperto que dá forma no outro) e a linha do
> ombro (quadrada e alta contra estreita e um pouco mais baixa). O pescoço acompanha o
> ombro — senão a cabeça sai de um tronco estreito por um pescoço de lenhador.
>
> **Um detalhe de curva que decidia o resultado**: numa quadrática, o ponto do meio não é o
> de controle — fica em (P0 + 2C + P2)/4. Usar a cintura como controle direto deixava o
> aperto pela metade, e a forma voltava a ser um V de lado reto. `controleQuePassaPor`
> inverte a conta, e o teste avalia a curva em t=0,5 para cobrar que ela passe pela cintura.
>
> **O teste que vale mais é o que compara RAZÕES**: se as duas fossem o mesmo desenho em
> dois tamanhos, ombro/quadril, cintura/quadril e ombro/cintura seriam iguais nas duas. Ele
> cobra que difiram — é a queixa do Gustavo escrita como asserção.
>
> O quadril sentado saiu da mesma medida do tronco: com o número cravado de antes, o quadril
> largo do corpo feminino terminaria num bumbum de outra largura e a emenda apareceria.
>
> **O boneco 3D da sala continua sem tipo de corpo** — `buildPersonagem` não recebe `body`.
> Fica anotado: de longe e quase de perfil ele pesa menos, mas a incoerência existe.
> 🔴 **Três das quatro ações eram INVISÍVEIS no celular (31/08).** Não era diálogo apertado
> como eu supus: a estrela de favoritar e o "…" que guarda **Editar e Excluir** nasciam
> `opacity-0` e só apareciam no `group-hover`. Hover não existe em toque — e o `hover:` do
> Tailwind é embrulhado em `@media (hover: hover)`, então a regra nunca dispara. As ações
> existiam no código e não na tela. (O botão de feedback estava certo; o mesmo defeito também
> pegava o remover-amigo em `friends-section`.)
>
> **A condição certa é o PONTEIRO, não a largura**, e virou a variante `com-mouse` em
> `globals.css`: um notebook com tela sensível ao toque tem janela larga e hover não
> confiável do mesmo jeito, então `md:` responderia à pergunta errada. Uso:
> `opacity-100 com-mouse:opacity-0 com-mouse:group-hover:opacity-100`.
>
> Medido nos dois lados, emulando `hover`/`pointer` por CDP (o `emulateMediaFeatures` do
> puppeteer não aceita esses dois): **no toque 3/3 estrelas e 3/3 menus visíveis; no mouse
> 0/3 menus em repouso**, ou seja, o desktop continua limpo.
> **Sono: resolvido (31/08), e o erro não era onde eu tinha chutado.** Não era o texto nem o
> fuso: era a REGRA, e só aparece para quem **deita depois da meia-noite**.
>
> O bloco de sono de quem dorme 00:30 começa no dia SEGUINTE, então ele não é o "overnight"
> do dia anterior — é o primeiro bloco do próximo. A regra do vão media então a distância
> entre o último compromisso e a HORA DE DEITAR e chamava aquilo de sono. Reproduzido:
> *"Entre 'Estudar three.js' (até 22:00) e 'Dormir' (às 00:30) sobram só **2,5h** — menos que
> suas 8h de sono."* A pessoa dormia 7,5h; o número falava da noite antes de deitar.
>
> Agora, quando o primeiro bloco do dia seguinte É o sono, mede-se a duração DELE: o mesmo
> caso passa a dizer 7,5h. Quatro testes seguram o cenário, inclusive o de quem dorme o
> suficiente (nenhum aviso) e o de não repetir o mesmo aviso vindo de dois dias vizinhos.
> **A IA não criou a tarefa, e "não consegue ver o mês": resolvido (29/08).** Eram três
> causas, e nenhuma era a ferramenta de criar falhando — ela funcionava e era o
> anti-duplicata que a impedia de rodar.
>
> **1. "Não criou a tarefa" era o anti-duplicata.** A regra dizia que dois títulos eram o
> mesmo quando um CONTINHA o outro (mínimo de seis caracteres). Isso transforma toda
> especialização em duplicata: existindo "Estudar three.js", pedir "Estudar" era recusado;
> existindo "Reunião", pedir "Reunião com o cliente" também. E a comparação não olhava data
> nenhuma — "Academia" de terça bloqueava "Academia" de quinta, que num app de rotina é o
> caso mais comum que existe. Agora conter só vale quando os dois têm quase o mesmo tamanho
> (0,8), e o dia entra na conta (`lib/ia-duplicata.ts`).
>
> **O princípio que decidiu os empates: na dúvida, CRIA.** Tarefa duplicada se apaga num
> toque; tarefa que nunca foi criada é uma promessa quebrada que some sem rastro, porque
> quem pediu acha que está lá. Daí "agendar o que estava solto" não ser duplicata.
>
> **2. A data era ambígua.** O cliente mandava `toLocaleString("pt-BR")` — `"28/08/2026"` —
> e o prompt pedia ISO 8601. Ler dia/mês ou mês/dia virava adivinhação, e quando o modelo
> erra aí, erra calado. Agora quem monta a frase é o SERVIDOR, a partir do fuso que o
> cliente já mandava: dia por extenso ("sexta-feira, 28 de agosto de 2026"), o mesmo
> instante em ISO com fuso, e hoje/ontem/amanhã/semana/mês já calculados
> (`lib/ia-agora.ts`). O `body.now` deixou de ser usado — duas telas o formatavam por conta
> própria, e formato de data em dois lugares é como um deles fica diferente sem ninguém ver.
>
> **3. O mês não estava lá para ser visto.** A seção AGENDA injetada cobre 48h, e o prompt
> mandava responder por ela "SEM chamar ferramentas de listagem". Perguntado sobre o mês, o
> modelo respondia pela janela de dois dias — ou seja, dizia que não havia nada. É o pior
> jeito de errar, porque soa como resposta e não como limitação. Agora a seção declara a
> própria janela, e a regra manda chamar `list_time_blocks` para qualquer coisa além dela.
>
> **Um achado ao escrever os testes**: o comentário da regra antiga dizia pegar erro de
> digitação "manhã" vs "manhão", mas o piso de seis caracteres já barrava esse par — ela
> nunca fez o que o próprio comentário afirmava.
> **O botão de falar: trocado (29/08).** Segurar virou **tocar para começar, tocar para
> enviar** — a primeira das ideias da lista.
>
> **Por que segurar era ruim, e não era estilo**: no celular o dedo tapa a tela justo onde a
> transcrição aparece, soltar sem querer manda a frase pela metade, e não dá para falar uma
> frase longa sem cãibra. Com o toque, o dedo sai da tela e a conversa fica visível enquanto
> se fala.
>
> **O "atraso" tinha causa, e não era o gesto**: no caminho do Whisper (Safari e quem não
> tem `SpeechRecognition`) o botão só mudava DEPOIS que o `getUserMedia` resolvia — ou seja,
> depois da permissão. O estado agora entra antes de qualquer `await`: o botão acende no
> toque e o microfone chega quando chegar. Foi a terceira ideia da lista, e ela custou uma
> linha de ordem.
>
> **Dois toques rápidos ganharam saída**: parar antes de o microfone abrir marca o começo
> como abortado, senão o stream chegava depois e gravava sozinho com o botão já apagado.
>
> **A detecção de silêncio ficou de fora, e é decisão.** Ela pediria abrir um segundo fluxo
> de áudio no caminho do Chrome (que hoje usa só o `SpeechRecognition`, sem `getUserMedia`),
> e encerrar sozinho em um navegador e não no outro é pior do que um toque igual em todos.
> Com "toque para enviar" ela também deixa de ser necessária: o fim da fala já tem um gesto.

**Rodada de 28/08 — segunda passada do Gustavo na cena**

> O que ele aprovou, e vale saber o que NÃO mexer: o piso, o sofá e os móveis novos.
> "Me surpreendi com o piso, com o sofá. Especialmente gostei do sofá, dos móveis."

> **Bichos: resolvido (28/08).** Os dois deitados, cada um na sua caminha, só respirando.
> Foram três rodadas até acertar, e a lição se repetiu: **bicho parado que se mexe no eixo lê
> como objeto de vitrine.** Pulou sem parar (flutuava) → parou de pular mas girava o corpo
> ("o frango rodando") → agora não faz nem um nem outro.
>
> **A caminha foi o que resolveu a pose de graça**, e vale para o próximo bicho: o que dá o
> "deitado" não é o desenho do animal, é ele estar apoiado em alguma coisa. Ela vem junto com
> o pet, sem item separado na loja.
>
> **Duas correções depois do Gustavo ver (28/08).** A cama era um tronco de cone com um disco
> dentro e lia como "um relevo no chão"; virou um ROLO (toro) em volta com o forro afundado —
> o que uma cama de bicho tem, e um relevo não, é a borda roliça mais alta que o miolo. E o
> cachorro estava deitado DE LADO, o que ele leu como bicho morto: de lado, as quatro patas
> apontam para a mesma direção, coisa que só acontece com bicho desacordado. Agora é de
> barriga para baixo, e o truque é mais simples que girar — o modelo é um cachorro em pé, e
> um cachorro deitado é o mesmo corpo com as pernas dobradas embaixo: afundando as patas no
> acolchoado, o rolo da cama esconde exatamente o pedaço que deveria estar dobrado.
>
> **Uma armadilha de 3D que custou um render**: tombar o GLB 90° gira em torno da ORIGEM do
> modelo (que fica nas patas), então o corpo inteiro sai para o lado pela própria altura — o
> cachorro desceu da cama. O conserto é recentrar pela `Box3` depois de girar, e não chutar um
> deslocamento: o modelo é de terceiro e a origem dele não é promessa nenhuma.
>
> O gato também estava errado e ninguém tinha reparado: sentado, ereto, rabo para cima — pose
> de alerta, parada. Virou bola achatada enrodilhada, com o rabo contornando o corpo.

> **Chapéus: resolvido (28/08), conferindo no nível 1 como ele pediu.** Os quatro tinham
> defeito diferente, e um deles estava CODIFICADO NUM TESTE.
>
> · **Boné** — a copa era uma esfera achatada a 38% da altura, pousada em cima: isso é a
>   forma de uma BOINA, e foi assim que o Gustavo leu. Virou calota funda, que desce pelos
>   lados do crânio. A aba ganhou largura até os segmentos se sobreporem (com 5,5 cm eles se
>   encostavam pelas quinas e a aba aparecia listrada) e um tom mais escuro que a copa —
>   nesta escala é o contraste entre as duas peças que faz a aba existir aos olhos.
> · **Social** — flutuava, e a causa estava numa REGRA: a altura saía de `TOPO_DO_CABELO`,
>   ou seja, o disco da aba pousava rente ao ponto mais alto do crânio. Só que o crânio é
>   redondo: o disco encosta no centro e sobra vão em toda a volta. Chapéu de verdade ENTRA
>   na cabeça, com a aba cruzando a linha do cabelo.
> · **Gorro** — tombado 27°, subia na nuca e deixava cabelo aparecendo atrás. Quase reto e
>   mais fundo, desce igual em toda a volta.
> · **Capuz** — raio 0,188 contra uma cabeça de 0,14 é 34% maior: um ovo cinza. Ficou mais
>   estreito de lado e mais comprido para baixo, que é a diferença entre pano caindo nos
>   ombros e uma bola em volta da cabeça.
>
> **O teste "todo chapéu assenta no CABELO" exigia o defeito**: pedia que a peça inteira
> ficasse acima de `TOPO_DO_CABELO`. Foi reescrito para a regra certa — a copa passa do
> cabelo para cima, a aba cruza ele por baixo, e nada desce da linha dos olhos. **A coroa
> ficou de fora da regra de propósito**: coroa POUSA no alto da cabeça, é o que ela é. Coroa
> e auréola não foram tocadas, como ele pediu.

**Rodada de 25/08 — o que o Gustavo apontou vendo a cena no olho**

> A régua que ele deu: *"não precisa ficar perfeito e 100% completo, mas precisa ficar um
> pouquinho mais completo antes da gente entregar."* Os cinco primeiros são defeito (coisa
> que está errada na cena); os demais são conteúdo.

> **Relógio × quadro: resolvido (25/08), e pela raiz.** Não foi mover o relógio — isso
> resolveria hoje e quebraria na próxima decoração de parede. Nenhuma peça escolhe mais o
> próprio x: elas entram numa fileira e recebem a vaga (`lib/office-parede.ts`), centrada no
> vão que sobra. A janela fica de fora da conta, porque é um buraco na parede e não um
> enfeite pendurado, mas come o espaço à direita — então a fileira acontece à esquerda dela.
> **Decoração de parede nova entra na fileira**, e não com um x cravado. O teste que importa
> compara as caixas nos três eixos: é o que "um em cima do outro" quer dizer.

> **Cabo: resolvido (25/08).** Era o diagnóstico certo — as duas curvas terminavam quatro
> centímetros à frente da placa, com a ponta solta apontando para a parede. Cada cabo ganhou
> um plugue, que encosta na face da placa, e a curva agora termina DENTRO dele, chegando por
> baixo. A tomada virou dupla (dois bocais na mesma placa de 13 cm, que é 4×4): são dois
> cabos na sala, e com um ponto só um deles ia sobrar de qualquer jeito. Três testes seguram:
> a ponta do cabo tem de cair dentro da caixa do plugue, o plugue tem de encostar na placa
> sem folga e sem afundar, e os dois bocais têm de estar em alturas diferentes.

> **Beagle: resolvido (25/08).** O pulinho perpétuo saiu e virou respiração — escala, não
> altura, então as patas ficam onde estão. Os dois tempos não se dividem (1,6 do fôlego e
> 0,7 do olhar), para o balanço da cabeça não cair sempre no mesmo ponto da respiração; com
> tempos múltiplos, ele ganha ar de brinquedo de corda.

> **Estante: resolvida (25/08).** Era o diagnóstico certo — `Estante_Corpo` era uma caixa
> maciça e os livros estavam posicionados dentro dela, lacrados. Virou armação (fundo, duas
> laterais, tampo e base), com a frente aberta para o +x, que é de onde a câmera olha.
> Entrou uma quarta fileira embaixo: com a frente aberta, o terço inferior vazio virava um
> buraco escuro. **Um bug apareceu ao abrir a caixa**: o livro mais alto de cima terminava
> em 1,256 e o topo do móvel ficava em 1,25 — ele atravessava o tampo em 6 mm, invisível
> enquanto tudo era o mesmo marrom. O móvel subiu para 1,32. Três testes novos seguram isso:
> nenhuma peça da armação pode CONTER um livro, nada pode ficar na frente de um livro, e
> nenhum livro pode furar o tampo.

> **Emoji do papel de parede: resolvido (25/08).** 🧻 → 📜, e o nome virou "Papel listrado",
> que é o que o item de fato é.

> **Paredes: resolvidas (25/08).** Seis novas — terracota, mostarda e oliva (40, cor) +
> cimento queimado (110), tijolinho (130) e ripado de madeira (150), que são DESENHO.
> `supabase/office_v6.sql`.
>
> **Padrão de parede virou textura, não malha**, e a conta é o motivo: tijolinho em caixinhas
> daria ~380 malhas POR parede (16 tijolos × 24 fiadas). Como pixel é um draw call. As
> texturas nascem em `lib/office-textura.ts`, que devolve o array RGBA cru — sem canvas,
> porque os testes rodam em `node` e ali não existe `document`; e sendo array, dá para
> conferir pixel a pixel no teste em vez de no olho.
>
> **Três coisas que essa escolha obriga**, todas com teste: a cor do material vira BRANCA
> (o `map` multiplica a cor, então uma parede bege tingiria o tijolo inteiro), a repetição
> sai de METROS e não de gosto (um tijolo tem 24 cm; errar isso dá tijolo de meio metro e a
> cena parece de brinquedo sem ninguém saber apontar por quê), e o lado da textura é potência
> de dois, senão o three não gera mipmap e a parede cintila de longe.
>
> O antigo `extras.papelParede` virou `parede: "listrada"` — um conceito só para o
> acabamento da parede, em vez de um booleano ao lado de um enum.

> **Piso: resolvido (25/08).** O diagnóstico estava certo — o piso era UMA caixa com uma cor,
> e cor nenhuma faz madeira. Agora o piso tem duas metades: a cor (que já existia) e o
> DESENHO (`PisoTipo`), com tábua corrida e ladrilho. Três coisas fazem a tábua ler como
> tábua: a régua (peças de 26 cm), a emenda deslocada de fileira em fileira, e o tom variando
> entre vizinhas. As peças são REBAIXADAS (de −14 mm a 0), senão a sala inteira — mesa,
> cadeira, boneco, tapete — passaria a flutuar 14 mm. Entraram três pisos:
> madeira escura (55), porcelanato (90) e cimento queimado (110) — `supabase/office_v5.sql`.

> **Cabeça e cabelo: resolvidos (27/08).** O crânio era uma ESFERA de 28 cm em todo eixo —
> por isso "a cabeça também está achatada": bola não é cabeça. Agora ele é mais estreito
> que fundo e mais alto que largo, e ganhou nariz, orelhas e sobrancelhas. Isso importa mais
> do que parece nesta cena: a câmera olha o boneco quase de PERFIL (ver o item do azimute
> abaixo), e de perfil quem aparece é o nariz e a orelha, não olho e boca.
>
> **O cabelo ralo tinha causa medível**: a panqueca de cabelo terminava exatamente na altura
> do topo do crânio — zero de espessura na coroa. Só se via uma faixa em volta, e daí "ralo".
>
> **A correção não foi engordar a casca, e é a decisão que vale registrar.** Casca cheia
> grande o bastante para sobrar em cima sobra também na frente e desce sobre os olhos;
> encolhida até liberar o rosto, volta a ter zero em cima. Não há ponto bom no meio — é a
> mesma armadilha da malha pastel. O que resolve é a calota ter BORDA: ela pende para trás,
> e a borda passa alta na testa (a linha do cabelo) e baixa na nuca. Os ângulos são a borda.
>
> **Uma armadilha de medição saiu junto**, das que fazem um teste acusar defeito onde não
> há: `Box3.setFromObject` gira a caixa local e devolve a caixa disso. Para uma calota
> inclinada isso mede 6 cm a mais no topo — o teste de "o chapéu encosta no cabelo"
> reprovava contra um cabelo que não existe. Os testes da cabeça usam a caixa PRECISA.
>
> **Nenhum chapéu escolhe mais a própria altura**: todos assentam em `TOPO_DO_CABELO`. É a
> mesma regra da fileira da parede — com a altura cravada em cada peça, mexer no cabelo
> afundaria a aba dentro dele, e só se descobriria no olho.

> **O corpo: resolvido (27/08).** O tronco era uma TÁBUA — 32 cm de largura por 20 de
> fundo —, e de perfil (que é de onde a câmera olha) uma tábua some. O fundo subiu para 24.
>
> **A outra metade não era espessura, era JUNTA.** O braço saía direto da quina da caixa do
> tronco, e a perna dobrava em ângulo reto: dois cilindros encostados. Engrossar o braço só
> engrossa o palito. Entraram a bola do ombro (entre o tronco e o braço, cobrindo a ponta
> dele) e a do joelho, no encontro da coxa deitada com a canela em pé.
>
> Junto: o pescoço virou PELE com gola de camisa por cima — antes ele era da cor da camisa,
> então a cabeça saía direto de um tubo de tecido.
>
> **Falta o olho.** Nada disso foi visto rodando; o que os testes garantem é geometria (o
> ombro cobre a ponta do braço, o pé apoia no piso, a gola envolve o pescoço), não beleza.

> **Mais três chapéus: entregues (27/08)** — **gorro de lã** (60), **capuz** (130) e
> **auréola** (260). São seis agora, com a escada de preço fechada:
> 45 · 60 · 90 · 130 · 220 · 260.
>
> O critério de escolha foi **silhueta**, não tema: com a câmera olhando o boneco por trás e
> de lado, chapéu que só muda de cor não muda nada. Um abraça o crânio (com barra enrolada
> e pompom), outro é um casco bem maior que a cabeça descendo até os ombros, o terceiro nem
> encosta — paira e é EMISSIVO, então quem o acende é o passe de bloom. Um chapéu de mago
> ficou de fora por um motivo bobo e real: o cone passaria do `RETRATO_VIEWBOX`, e alargar o
> enquadramento encolheria o retrato de todo mundo.
>
> **Regra de item novo, cumprida**: linha no `shop_items` (`avatar_acessorios.sql`, que é
> idempotente), tradução em `lib/avatar-accessories`, desenho no 3D e no bonequinho 2D, e
> entrada no `SQL_DO_ITEM` — senão o erro de compra manda rodar o arquivo errado. Um teste
> novo varre o catálogo e cobra a tradução de todo chapéu: sem ele, item novo é comprável e
> simplesmente não aparece na cabeça, sem barulho nenhum.
>
> **Pede um passo do Gustavo**: rodar `supabase/avatar_acessorios.sql` de novo. Sem isso os
> três aparecem na loja e a compra falha com `ITEM_INEXISTENTE`.

> **Seção de móveis: aberta (27/08), com o sofá.** A aba **Móveis** existe, a estante mudou
> de categoria (`supabase/office_v7.sql` faz o update — quem já a comprou continua com ela,
> só que na aba nova) e entrou o primeiro item de verdade: um **sofá de dois lugares** (170).
>
> **Ele encosta na parede LATERAL, e isso não é gosto.** A câmera vem do +x: na parede do
> fundo veríamos o encosto, e sofá visto por trás é um bloco. O x também não é escolhido — o
> rodapé se projeta 12 cm da parede e sobe 14 cm, então "encostar na parede" e "encostar no
> rodapé" são coisas diferentes, e é fácil escrever a errada. Tem teste para as duas.
>
> Móvel é o que ocupa CHÃO, e por isso o sofá é o primeiro item que precisa saber onde os
> outros estão: o y dele sai do vão à frente da estante, que mora na mesma parede.
>
> **Pede um passo do Gustavo**: rodar `supabase/office_v7.sql`.

> **A aba fechou com quatro (27/08)**: estante, mesa de centro (70), poltrona (120) e sofá
> (170). Os três novos formam um canto de estar — sofá na parede, mesa à frente dele,
> poltrona solta no chão.
>
> **O armário ficou de fora, e por medida.** Ele quer parede: a do fundo é da janela (que
> ocupa x de 0,40 a 1,70 e sobe até 2,22) e o resto dela é a fileira de quadro e relógio; a
> lateral, no nível 1, tem 50 cm livres entre a estante e a planta do canto, e um armário
> tem 90. Não é que seja difícil — é que **não cabe na sala menor**. Se voltar, entra
> amarrado ao nível (só a partir do 3, quando a sala cresce) e dentro da fileira da parede,
> nunca com um x cravado.
>
> **A poltrona ensinou uma coisa que vale para todo móvel solto**: o ângulo decide mais que
> a posição. Virada para a parede ela é um bloco; virada para a câmera, está olhando para
> fora da sala. Perfil é o que sobra nesta planta — e tem teste cobrando que ela nunca fique
> de nuca para quem olha.

> **Girar a câmera: resolvido (27/08).** Arrastar gira a vista, duplo clique devolve ao
> ângulo de sempre, e a mãozinha (`grab`/`grabbing`) anuncia que dá para pegar.
>
> **Das duas saídas que o item previa, a escolhida foi a caixa maior de todas as voltas** —
> e a conta desarmou a objeção. Refazer o `fit` por quadro faria a sala inchar e murchar
> enquanto se arrasta, que é o oposto de "virar um objeto na mão": objeto que se vira muda
> de silhueta, não de tamanho. O medo era o preço — a largura projetada cresce ~15% entre
> 15° e 45°. Só que **quem aperta o quadro aqui é a ALTURA, não a largura**: com o canvas em
> 480×340 sobra folga lateral de sobra, e o giro não mexe na altura. O custo virou zero.
>
> **A trava de ângulo veio dos muros, medida, não do gosto.** A câmera fica em
> (R·cos θ, 14, R·sin θ), que no chão é (R·cos θ, −R·sin θ): com θ ≤ 0 ela passa para o lado
> +y e a parede do fundo entra na frente; passando de ~95°, o x fica negativo e a lateral faz
> o mesmo. Daí [5°, 85°] — 80° de volta, sem precisar sumir com parede nenhuma.
>
> **Duas armadilhas de interação, e a segunda quebraria o que já existia.** O clique no
> boneco tinha de sobreviver: um arrasto que anda mais de 4 px deixa de valer como clique,
> senão toda volta de câmera terminaria abrindo o editor de avatar. E o arrasto NÃO usa
> `setPointerCapture` no container — capturar ali redirecionaria os eventos para a div, o
> canvas nunca veria o `pointerup` e o clique no boneco simplesmente deixaria de existir. O
> arrasto mora na janela, que resolve o "saiu da caixa" sem esse efeito colateral.
>
> No toque, `touch-action: pan-y`: a página do Escritório é comprida, e roubar a rolagem
> vertical do dedo para girar a sala seria trocar uma coisa útil por um enfeite.

**Vida na cena**

- [ ] **Calibrar o realismo com uso real.** A troca pra PBR foi validada em render headless,
      não no olho de quem usa. Ajustar rugosidade/luz conforme o feedback: o alvo é "3D de
      verdade", nem plástico de desenho nem foto.

**Itens que existem mas não convencem**

> **Conferido no olho (28/08).** A cena foi renderizada em build de produção com a sala
> cheia, e o arrasto foi disparado por evento de mouse de verdade. O ângulo de partida mostra
> o rosto de perfil, a janela, e o relógio e o quadro lado a lado sem se tocar (a fileira de
> vagas funciona). Girando para os dois extremos a sala continua legível e nenhuma parede
> entra na frente — a trava de azimute segura. Os itens dos últimos dias aparecem como
> deviam: livros na estante aberta, tábua com emenda deslocada no piso, fiada do tijolinho,
> cabo entrando no plugue.

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

> A `ORIGINKIT_API_KEY` que vinha no `NeuroIA.txt` está **resolvida**: gerar uma chave nova
> no Originkit revoga a anterior, e foi o que se fez. O valor saiu do arquivo, a pasta de
> rascunho `frontend/inspirações/` entrou no `.gitignore`, e a chave em uso vive no
> `frontend/.env.local` — que o git ignora desde sempre. O histórico nunca teve o valor,
> só a menção ao nome da variável. A chave é do CLI (`npx originkit add ...`); o app não a
> usa em runtime, então ela não entra no `.env.example` nem na Vercel.
>
> Falta só, se valer a pena: mover o `NeuroIA.txt` para `frontend/components/inspirações/`
> e versioná-lo com o resto das referências.

### Das inspirações para o app

> Rodada de **16/08/2026**: o Gustavo passou print por print dizendo o que cada um seria e
> por quê. Aqui está o que ficou decidido.
>
> **A régua, que ele repetiu três vezes**: o site já está bom. Nada aqui é reforma — é
> detalhe que soma. Quando um item brigar com "minimalista", ganha o minimalista.

#### Entrar e criar conta — `better-auth-6.webp`

> **O código está pronto** (`components/social-login.tsx` + `lib/auth-metodos.ts`): os
> botões, as marcas em SVG e o selo "último acesso". O que falta não é código.

> **Login social no ar (28/08): Google e GitHub.** `NEXT_PUBLIC_OAUTH_PROVIDERS=google,github`,
> com os dois provedores configurados no painel do Supabase. O Apple continua fora — exige
> conta paga de Apple Developer (99 USD/ano).
>
> **Três pedras do caminho, para quem ligar o próximo provedor:**
>
> · O **Client ID do GitHub** não é o seu e-mail. É uma chave que o GitHub gera ao criar o
>   OAuth App (Settings → Developer settings → OAuth Apps), com a *Authorization callback URL*
>   apontando para a URL que o Supabase mostra na tela do provedor.
> · No Vercel, `NEXT_PUBLIC_*` é **Config, nunca Secret**. Secret ali é o pior dos dois mundos:
>   o valor entra no bundle do navegador de qualquer jeito, e "Secret" é write-only — perde-se
>   a leitura sem ganhar proteção. Pior: **secret salvo não converte para Config**, só apagando
>   e recriando.
> · Editar a env **não republica**. `NEXT_PUBLIC_` é gravada dentro do bundle no build, então
>   precisa de Redeploy.
>
> **E uma armadilha de verificação, que custou o botão do Google.** Conferi o HTML procurando
> a frase `"Entrar com"` e concluí que nada estava no ar — daí a instrução de pôr só `github`,
> que APAGOU o Google, que já funcionava. O rótulo é montado por concatenação, e o React o
> quebra: o HTML traz `Entrar<!-- --> com <!-- -->Google`. **Sonda certa é o nome do provedor**
> (`google`, `github`), nunca a frase montada. E vale olhar o contexto do que casou: `apple`
> aparece no `/login` por causa do `<link rel="apple-touch-icon">`, não de um botão.

> **A enquete do dashboard (28/08): aprovada na forma, reprovada na frequência.** O Gustavo:
> *"ficou muito bacana, só que a gente precisa garantir que ele não seja repetitivo"*. O teto
> que ele deu é **uma vez por semana**, e o "Obrigado! Isso ajuda mais do que parece" deve
> sumir sozinho em **10 a 20 segundos** em vez de ficar na tela.
>
> **Resolvido (28/08).** Havia um bug de verdade por trás: `comResposta` gravava `adiadoAte: 0`
> com o comentário logo acima dizendo que responder "compra silêncio" — zero não compra nada.
> Agora todos os três caminhos compram a mesma semana: responder, recusar e **só ter
> aparecido**. Esse terceiro faltava por inteiro, e era o que fazia a pergunta voltar a cada
> abertura do dashboard para quem simplesmente ignorava — justamente quem menos quer ser
> perguntado de novo. O "Obrigado" sai sozinho em 12s: ele é aviso de recebimento, não
> conteúdo, e ocupar o fim do dashboard pelo resto da sessão transforma um agrado em mobília.

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

> ✅ **Confirmado pelo Gustavo (28/08): era o Windows dele com "Mostrar animações" desligado.**
> Ligando, tudo voltou. E aí veio o pedido certo: *ninguém deveria ter que mexer no Windows
> para ver isso*.
>
> **A regra do app mudou, e está em `lib/movimento.ts`.** `prefers-reduced-motion` existe
> contra movimento que embrulha o estômago — parallax, giro, zoom, coisa grande atravessando
> a tela — e a recomendação da norma é REDUZIR, não apagar. O app vinha apagando. Agora a
> animação declara o que ela FAZ:
>
> · **informativo** (o gráfico se desenhando, um número subindo até o valor): continua
>   rodando, com a duração encurtada. Some, e a pessoa perde informação — some, e o clique
>   parece não ter feito nada. É pequeno, local, não desloca a tela: não é gatilho vestibular.
> · **ambiente** (fundo que respira, luz que gira, deslize de página): para de vez. Ninguém
>   perde dado nenhum, e é aqui que o desconforto realmente mora.
>
> **A esfera da Neuro IA entrou na regra (28/08), e era o pior caso.** Ela não só parava:
> `velocidadeDoGiro` devolvia ZERO e o canvas ficava em `frameloop="demand"`, que desenha uma
> vez e só volta se algo mudar. Como nada mudava, ela congelava no primeiro quadro — e
> congelada não lê como "efeito desligado", lê como cena travada, bem no meio da tela vazia.
> Agora gira a um terço da velocidade, sem respirar e sem reagir ao cursor: é o "reduzir" da
> norma, e não o "remover", que ela não pede. Medido no navegador com a preferência ligada:
> 11.983 pixels mudam entre duas capturas, onde antes mudariam zero.
>
> **O Escritório nunca obedeceu a preferência** — a cena 3D anima para todo mundo. Fica
> anotado como decisão consciente, não esquecimento: lá o movimento é o produto.
>
> **Aplicado em "Seus números" e no número rolante (28/08).** Passando os três candidatos
> pela régua, só UM era informativo — e vale registrar o erro, porque a nota anterior aqui
> listava os três como pendentes:
>
> · `numero-rolante` **é informativo**: o giro dos dígitos é o que diz que o valor MUDOU.
>   Trocado por texto parado, o número vira outro entre um quadro e o seguinte, e quem pediu
>   menos movimento perde a informação em vez do enfeite. Agora rola em 0,18s, sem mola —
>   o repique de uma mola é movimento extra, e extra é o que a preferência pede para tirar.
> · `split-greeting` **é ambiente**: as letras sobem 120% da própria altura, o que é texto
>   deslizando pela tela — gatilho clássico. E a saudação está inteira lá sem a animação.
> · `coin-flight` **é ambiente**: a moeda atravessa a tela, e o XP atualiza de qualquer jeito.
>
> Ou seja, dois dos três estavam certos como estavam. Ficam de fora, também corretamente:
> `smooth-scroll`, `focus-gradient`, as cenas 3D e os deslizes de página.
>
> **O que fica de aprendizado**: "Mostrar animações" não é o padrão do Windows estar
> desligado — mas cai sozinho em quem escolhe "Ajustar para melhor desempenho" nas opções de
> desempenho, que é comum. E o efeito no app era total: gráfico, saudação, moedas, números,
> scroll suave e a borda, tudo parado, sem nenhum aviso de por quê.
>
> ⚠️ **`prefers-reduced-motion` é a explicação de "não animou" — e provavelmente de mais de
> uma queixa.** O Gustavo trocava de aba no site e não via desenho nenhum. Reproduzido em
> build de produção, com o mesmo aninhamento da página real (`PageTransition`, que é um
> `<AnimatePresence initial={false}>`): anima nos dois casos. O único cenário em que o
> gráfico salta pronto é o navegador pedindo `prefers-reduced-motion: reduce` — e o
> componente obedecia apagando a animação.
>
> **Isso também explica a borda da conversa ao vivo "fixa nas mesmas cores".** `.borda-anel`
> tem `animation: none` sob a mesma media query. A queixa foi lida na hora como "anel
> uniforme não lê como giro", e a paleta foi refeita por causa disso — pode ter sido, o
> tempo todo, o Windows com "efeitos de animação" desligado. Vale confirmar antes de
> desfazer qualquer coisa.
>
> **O que mudou por causa disso**: com movimento reduzido o gráfico agora ACENDE (0,24s de
> opacidade, geometria já no lugar final) em vez de aparecer pronto. A media query existe
> contra movimento que embrulha o estômago, e a recomendação é reduzir, não apagar —
> apagando, trocar de aba parecia não fazer nada. **Pendente de decisão do Gustavo**: se
> quiser o desenho mesmo com a preferência ligada, é tirar o `semMovimento` dos gráficos —
> mas aí o app passa a ignorar uma escolha de acessibilidade do sistema.
>
> **A construção do gráfico foi vista rodando (25/08), e num navegador de verdade.** Até
> aqui ela só tinha sido conferida lendo o código — e o commit que a consertou dizia que ela
> "nunca chegava a rodar", ou seja, o próprio conserto estava por conferir. Medido com o
> componente REAL, os dados forjados por interceptação da consulta e a troca de aba
> disparada por clique: colunas da semana 8→122px em ~0,42s, as 24 da hora em ~0,58s, e o
> traço da linha 0→1 ponta a ponta. Funciona nas três abas.
>
> **Duas armadilhas de medição, das que fazem concluir o oposto do verdadeiro.** O headless
> reporta `prefers-reduced-motion: reduce` por padrão, e o componente OBEDECE: a primeira
> medição mostrou o gráfico pronto de uma vez, e a leitura fácil seria "não anima". É preciso
> `emulateMediaFeatures` com `no-preference`. E a resposta forjada da consulta precisa dos
> cabeçalhos de CORS, senão o navegador a bloqueia e o painel fica em "Carregando…" para
> sempre — parecendo, de novo, um bug no componente.
>
> O tempo do traço caiu de 0,7s para 0,55s: era a mais lenta das três abas, e como é a aba de
> entrada, dava o tempo da seção inteira. Agora as três terminam por perto.
>
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

#### Bonequinho 2D — polimento de costas

> **Decisão (31/08): o boneco fica DE COSTAS.** Chegou um relatório de bugs lendo o
> avatar 2D (`components/avatar-figure.tsx`) como se ele devesse ter rosto — mas ele é
> ¾ traseiro **de propósito** (vemos a nuca, o cabelo e as costas), e a "orelha de ogro"
> que o relatório acusava era o acessório de ÓCULOS desenhando a lente inteira, clara,
> fora do crânio, no rosto que essa vista não tem. Virá-lo de frente foi **recusado**: o
> desenho 2D só aparece como retrato (header/amigos) e na prévia do editor — nunca na
> cena, que usa o `.glb` —, e dar rosto a ele custaria descasar do personagem 3D. O
> caminho é polir o que é de costas, não inventar um rosto.
>
> **Resolvido (31/08):**
> · **óculos** viram só a haste correndo até a orelha + a dobradiça que escapa da
>   silhueta; a lente (que aponta para a frente) não é mais desenhada — fim da "orelha".
> · **sombreamento esquerda/direita** com delta menor (perna 16→8, manga 12→7, mão
>   18→12): a calça deixou de parecer dois azuis diferentes.
> · **prévia do editor** centralizada no boneco (o viewBox mirava x=-9, o boneco fica em
>   x≈1) e com a sombra sob os pés — não flutua mais no canto.
> · **cena 3D do Escritório fixa (sticky)** ao rolar a loja em telas grandes: a prévia de
>   como o item fica no escritório não sai mais de vista quando se olham os itens de baixo.
> · **manga curta na camiseta** (o braço nu inteiro fazia ler como regata), **fones** em
>   grafite que contrasta com o cabelo escuro e com arco passando POR CIMA dele, e a
>   **nuca** com cantos arredondados + sombra de gola (era um quadrado que lia como glitch).
>
> **Não pude ver rodando** (sem `node_modules` no ambiente): são edições de geometria SVG,
> conferidas no código, e a régua final é o build da Vercel + o olho do Gustavo no deploy.
> Os óculos e as mangas são um chute geométrico — se destoarem, é ajuste fino, não redesenho.

- [ ] **Silhueta própria por roupa e por cabelo.** As quatro roupas ainda são o mesmo
      tronco com um detalhe fino que quase some no tamanho de render, e "cacheado" são 7
      círculos chapados. Dar silhueta de verdade (gola, barra, capuz atrás da nuca;
      contorno de cabelo em vez de bolinhas) é **redesenho, não ajuste** — fora do "só
      polir", entra se o boneco continuar valendo o investimento.
> **Cor da calça: entregue (29/08).** Linha de swatches no editor, com tons de CALÇA e não
> os da camisa — jeans, preto, grafite, cáqui, oliva e marrom. Repetir a paleta da roupa
> daria seis camisas nas pernas, e o roxo de camiseta não é uma calça que alguém veste.
>
> **A regra que sobra é o terno**: paletó de um tom com calça de outro não é traje, é
> fantasia. Nele a calça sai do paletó, e a linha de swatches fica visível porém apagada,
> com a explicação — escondê-la faria a escolha sumir sem dizer por quê, e ela precisa
> voltar sozinha ao trocar de roupa.
>
> **Ela mora em `lib/avatar-calca.ts` e não no desenho**, porque vale para os DOIS bonecos:
> o 3D da sala tinha um cinza cravado no modelo, então escolher jeans mudava o bonequinho do
> editor e não mudava o boneco do Escritório. Agora os dois leem a mesma função.
>
> O lado de trás continua derivado da cor da frente, como o item pedia — nunca uma segunda
> cor guardada, que foi como nasceram os dois azuis que não combinavam.
>
> Quem já tem avatar salvo não muda de calça: o padrão é o mesmo `#3b5378` que estava cravado.

#### Cor e camada visual — `214017.png` e `214418.png`

Dois efeitos de fundo, e os dois pedem o mesmo cuidado: fundo que compete com o conteúdo
vira ruído.

> O **degradê radial que respira** (`214017`) foi tentado na Neuro IA e **revertido a
> pedido**. Vale registrar por que, para não voltar por engano:
>
> - O cabeçalho é translúcido em TODAS as telas (`bg-background/70` + `backdrop-blur`).
>   Cor de fundo atrás dele faz a barra do topo — nome, nível, XP — ficar de um tom que
>   nenhuma outra tela tem, e a página inteira parece de outro app.
> - Mesmo depois de baixar o efeito até somar só +2,5 de luminância no rodapé, a conclusão
>   do Gustavo foi que a tela da Neuro IA fica melhor como sempre foi: preta, igual ao
>   resto. A malha pastel e a borda viva já dão o que ela precisa de vida.
>
> Se um dia voltar: a cor não pode passar por trás do cabeçalho, e o alvo é somar poucos
> pontos de luminância — a primeira versão somava +42, quase o triplo do fundo do site.
> **A borda saiu de vez (23/08, terceira rodada).** O Gustavo viu a versão com as manchas de
> luz e decidiu que a conversa ao vivo fica igual ao resto do site — sem efeito, sem moldura.
> É a terceira tentativa de efeito de fundo/borda a terminar no mesmo lugar, e agora está
> claro que não é questão de calibragem: nenhuma tela da Neuro IA quer moldura. O
> `components/borda-conversa.tsx` fica no repositório, desmontado.
>
> **No lugar dela entrou a onda sonora**, inspirada na mancha que o Claude acende embaixo
> enquanto fala. Ela ganha onde a borda perdia: não é enfeite em volta da tela, é informação
> no meio dela — áudio não deixa rastro, então sem nada se mexendo não dá para saber se a
> Neuro está falando, se travou ou se o microfone pegou. **Azul é a vez de quem usa, verde é
> a vez dela** (`lib/onda-sonora.ts`; o microfone segurado vence a fala da Neuro, que é o
> barge-in). Três manchas com tempos que não se dividem (3,1s / 2,3s / 1,7s), para a luz
> mudar de forma em vez de pulsar no mesmo compasso.
>
> A luz é procedural, não vem do áudio real: ler a amplitude exigiria passar a voz por um
> AudioContext, e nó de análise no meio da reprodução é onde mobile costuma emudecer o som.
> Não vale arriscar a voz por fidelidade num enfeite.
>
> **A Neuro não fala primeiro (23/08).** Sumiu o briefing automático das duas telas: abrir
> não dispara panorama nenhum. Antes a tela inicial bonita durava meio segundo até chegar um
> "bom dia, aqui está o seu dia" que ninguém pediu — sempre igual, e gastando limite de IA em
> quem só queria escrever uma pergunta. `lib/briefing-cache.ts` saiu junto; o `mode:
> "briefing"` continua na rota `app/api/ai`, pronto para quando o panorama voltar por pedido.
>
> **A borda colorida achou o lugar dela: a conversa ao vivo (23/08).** Referência do
> Gustavo: a borda do skiper-ui, contorno colorido acompanhando a tela toda com o miolo
> preto. Ali ela funciona justamente pelo que a derrubava no chat: a conversa ao vivo
> ocupa a tela inteira e o dock some, então nada em volta para ela destoar — e sem menu
> algum, a borda é o que avisa que você entrou em outro lugar. O fundo do overlay virou
> OPACO (era `bg-background/95`, deixava o dock aparecendo por trás) e só sobra o X.
>
> **A primeira versão da borda errou, e o diagnóstico do Gustavo é a lição:** "parece uma
> imagem retangular fixa", "não passa movimento". O anel girava, mas era UNIFORME — mesma
> espessura e mesmo brilho na volta inteira. Anel uniforme girando não tem detalhe para o
> olho seguir, então não lê como giro: lê como moldura. O que faltava não era velocidade,
> era variação.
>
> A correção foi pôr BURACOS no gradiente: entre uma cor e a seguinte ele passa por alfa
> zero, então não é um anel, são manchas de luz separadas por escuro. Resolve as duas
> queixas de uma vez — mancha que passa é movimento, e como o brilho não fecha o retângulo,
> some a leitura de moldura. Some também o fio nítido de 2px, que era metade da culpa.
> Duas camadas em sentidos e tempos diferentes (22s e 34s) desencontram os ciclos: onde as
> manchas se cruzam o brilho soma, e o encontro nunca cai duas vezes no mesmo canto.
>
> A paleta não passa por verde nem amarelo: vai do laranja ao azul pelo magenta e pelo
> violeta, que é o roxo do próprio app. No tema claro ela é mais escura (`--bc-l`), porque
> cor clara sobre branco vira borrão sem cor.
>
> **A conversa ao vivo virou transcrição (23/08).** O robozinho saiu — o que ele ocupava
> agora é a conversa escrita, os dois lados, rolando. A resposta não aparece de uma vez: a
> rota devolve o texto inteiro e só depois ele é falado, então escrever tudo junto deixaria
> a leitura correndo na frente da voz. Ela é revelada pelo relógio, a 16 caracteres por
> segundo (`lib/transcricao-viva.ts`), sempre parando em palavra inteira, e completa na
> hora se a fala terminar antes. O `robot-mascot.tsx` continua no repositório, desmontado.
>
> A mecânica do anel (as duas máscaras que deixam só a moldura) virou `.borda-anel`,
> compartilhada com a borda viva. Cada variante põe só a sua paleta e o seu tempo.
>
> **Encerrado (23/08): a tela da Neuro IA fica preta e lisa, sem efeito nenhum.** Foram
> duas rodadas de tentativa — malha pastel, depois grão — e as duas terminaram no mesmo
> lugar. O código dos dois efeitos continua no repositório, desmontado e pronto
> (`components/fundo-grao.tsx`, `components/borda-viva.tsx`, CSS em `globals.css`): é só
> montar de volta em `app/app/ai/page.tsx`. Antes de tentar uma terceira vez, ler os
> números abaixo — eles dizem o que já foi descartado e por quê.
>
> **A malha pastel saiu (23/08)** e virou grão, que também saiu. O Gustavo viu a malha discreta e disse
> que "parece mais uma mancha". O problema dela nunca foi a intensidade, era a FORMA:
> três borrões grandes: fortes, a tela deixava de ser preta; fracos, não liam como efeito,
> liam como sujeira. Não havia ponto bom no meio. Grão não tem forma, então não mancha em
> intensidade alguma.
>
> **Os números que importam** (luminância, 0–255): o fundo do site marca 7,1. A malha cheia
> somava +19,3 (quase quatro vezes o fundo) e a discreta +2,7 — espalhados por igual. O
> grão sobe a MÉDIA em só +4,6, mas os pontinhos acesos batem 18, quase o dobro do fundo:
> é o ponto que o olho lê como textura, não a média. Por não ter forma ele cobria a página
> inteira, cabeçalho incluído — parar em 4rem deixaria uma emenda horizontal na tela. Ainda
> assim o Gustavo preferiu a tela lisa: o problema não era achar a calibragem certa, era
> que esta tela não pede efeito de fundo nenhum.
> A borda em repouso caiu de 0,25 para 0,08, e o halo de 12px só existe quando ela acende.
>
> **Abrir a Neuro IA começa uma conversa nova.** Antes ela restaurava a última, e quem
> voltava no dia seguinte caía no meio de um assunto encerrado. As anteriores continuam
> inteiras no menu "Conversas"; as abertas e abandonadas sem nenhuma mensagem são
> descartadas na abertura, para a lista não encher de conversa vazia.
>
> Calibrar isso NO OLHO não funciona: por três ajustes seguidos eu conferi pelo dev server,
> que servia CSS velho e devolvia sempre o mesmo número. O jeito confiável é medir com o
> `globals.css` lido direto do arquivo.
>
> O efeito de **arcos** subindo do rodapé (`214017`) foi tentado e revertido; está no
> commit `b4b5900` se um dia fizer sentido.

> **Borda no Modo Foco: recusada (28/08).** O Gustavo decidiu que não vale. Fecha o placar em
> QUATRO recusas seguidas de moldura — chat, fundo da Neuro, conversa ao vivo e agora o Foco —,
> e é o bastante para virar regra em vez de item: **contorno em volta da tela não é a
> linguagem deste app.** O que passou no lugar dela foi luz que INFORMA e mora dentro da
> tela: a onda sonora da conversa ao vivo (azul de quem fala, verde da Neuro). Efeito novo
> que só decore a borda não precisa ser tentado de novo — o de dentro, sim.

> **Quatro componentes vivem no repositório desmontados**, e é de propósito: `borda-viva.tsx`,
> `borda-conversa.tsx`, `fundo-grao.tsx` e `robot-mascot.tsx`. Cada um foi montado, visto e
> recusado; ficam prontos para remontar em uma linha se a decisão mudar. Antes de escrever um
> efeito novo para a Neuro IA, conferir se ele já não está aí — e ler por que saiu.

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

> **A resposta entra escrita: resolvido (27/08).** Era o diagnóstico certo — o chat até
> lê a resposta com `getReader()`, mas o provedor padrão (Groq, o único com ferramentas)
> responde de uma vez, então o "streaming" chegava num pedaço só e a bolha saltava pronta
> no lugar do spinner. Agora ela é revelada pelo relógio (`lib/revelacao-resposta.ts`),
> reaproveitando o corte em palavra inteira e o fecha-negrito da conversa ao vivo.
>
> **O que muda em relação ao ritmo da voz**, e é a decisão do módulo novo: lá o ritmo é o
> da fala (16 caracteres por segundo, fixo); aqui o que se fixa é a DURAÇÃO. Com um CPS
> fixo, uma resposta de mil caracteres levaria quase meio minuto para acabar de aparecer.
> Toda resposta entra em ~0,9s, e é o tamanho dela que decide a velocidade — com piso, para
> a resposta de uma linha não ficar lenta à toa.
>
> Duas armadilhas que o código evita de propósito: o alvo mora numa ref, não nas
> dependências do efeito (com um provedor que transmite mesmo em pedaços, o texto muda mais
> de uma vez a cada 50ms e o relógio reiniciaria antes de fechar um passo, travando a
> revelação em zero); e a contagem guarda o resto em número fracionário, senão velocidade
> menor que um caractere por passo arredondaria para zero para sempre.
>
> Com `prefers-reduced-motion` o texto aparece inteiro. Aqui não cabe o meio-termo que
> "Seus números" achou (acender no lugar de animar): texto que se escreve sozinho **é** o
> movimento, e reduzi-lo é mostrá-lo pronto.

> **A esfera parada demais: resolvido (27/08), e o diagnóstico não era velocidade.** Ela
> já girava (0,16 rad/s) e já respirava — o giro é que era INVISÍVEL. Numa casca de pontos
> espalhados por igual, todo ângulo tem a mesma silhueta e o mesmo desenho: não há detalhe
> para o olho seguir, então o giro lê como parado. É exatamente o defeito da primeira borda
> da conversa ao vivo (anel uniforme girando lê como moldura), e a saída foi a mesma —
> variação, não velocidade.
>
> **Duas coisas entraram, e a primeira é a que importa.** O brilho de cada partícula agora
> sai da PROFUNDIDADE dela: 1 na frente, 0,3 no fundo (`brilhoPorProfundidade`). É o que dá
> volume — sem isso a nuvem tem o mesmo brilho da frente ao fundo e lê como um disco de
> pontos; com isso cada partícula acende ao passar pela frente e apaga ao dar a volta, e é
> aí que o giro aparece. A segunda: o eixo balança devagar (`inclinacaoDoEixo`, ±15°, em
> dois tempos primos entre si — 23 s e 17 s), então os polos passeiam e a mesma volta mostra
> partes diferentes da casca.
>
> **O que a implementação não podia gastar**: a profundidade sai de UMA linha da matriz do
> grupo (a do z) e não de transformar o vetor inteiro — o resto do resultado iria para o
> lixo, mil e quatrocentas vezes por quadro. O brilho entra por `vertexColors`, então o
> shader multiplica a cor do tema pelo cinza da profundidade e a paleta continua vindo do
> token `--primary`. Tudo dentro do `useFrame` que já existia, no ticker único.
>
> Com `prefers-reduced-motion` a esfera continua parada — mas agora a foto parada também
> tem volume, porque o brilho por profundidade é sombreado, não movimento.

> **A conversa ao vivo abre vazia: resolvido (27/08), e a decisão foi a primeira das duas.**
> É UMA conversa: a ao vivo abre com o que já foi escrito e devolve o que foi falado ao
> chat, ao fechar. A outra saída (só LER o texto como ponto de partida) deixaria o que se
> falou desaparecer ao fechar o overlay — e o argumento do item era justamente não perder a
> conversa de vista ao trocar de modo.
>
> O ganho maior nem é ver as mensagens antigas roláveis: é que as 6 últimas mandadas à rota
> passam a ser as 6 da conversa inteira. Antes, quem discutia um assunto por escrito e
> clicava no botão de voz encontrava uma Neuro que não sabia de nada.
>
> **Dois detalhes que o código precisa acertar.** O histórico entra por ref, não como
> dependência do efeito — como prop nas dependências, cada render do chat remontaria o
> overlay no meio de uma fala. E as mensagens herdadas ficam fora da revelação pelo relógio:
> reescrevê-las letra a letra ao abrir fingiria que a Neuro está falando de novo o que ela
> já disse.

> **Conferida no olho, nos dois temas (28/08) — e o claro estava quebrado.** A tela foi
> montada fora do `/app` e aberta em build de produção, com os dados forjados. No escuro está
> como se queria; **no claro a esfera sumia**: virava um borrão pálido no meio da tela vazia,
> que é justamente onde ela é o centro da atenção.
>
> A causa é `AdditiveBlending`: aditivo só SOMA luz, e sobre branco não há o que somar. Vale
> registrar que uma medição anterior tinha dado a esfera como aprovada no claro — mas era uma
> simulação em canvas 2D, cujo modelo de alfa não bate com o do WebGL. **Render de verdade
> desmentiu a simulação**; para efeito que depende de blending, não há substituto.
>
> O conserto: a cor de cada partícula passou a ser resolvida no ATRIBUTO (o material ficou
> branco), e no claro ela se dissolve na cor do FUNDO em vez de apagar para o preto — preto
> sobre branco é o ponto de maior contraste, e a esfera viraria uma bola escura com a
> profundidade invertida. O blending sai da LUMINÂNCIA do fundo, não do nome do tema.
> Medido depois: pico de contraste 60,6 no claro contra 34,5 no escuro — ela pesa mais no
> claro do que no escuro, e o caminho do escuro é matematicamente o mesmo de antes.

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

O `transição-dinâmica.jsx` (`DynamicIsland`) mirava o relógio flutuante do Foco
minimizado. Em vez de trazer o morph-que-expande (o clique já restaura a tela
cheia, então o expandir seria enfeite), o pill ganhou o que faltava de útil: a
**barra de progresso da sessão** que some ao minimizar virou uma linha fina na
base da ilha. A ilha ficou mais informativa sem crescer nem mudar de forma —
outra vez o minimalista ganhando do efeito.

O `color-picker.jsx` continua na tabela, mas **metade dele já foi**: a cor de
fundo do Escritório agora tem um **9º swatch de cor livre** que abre o seletor
do sistema (`<input type="color">`). Não precisou de paleta gerada nem de
componente novo — o `lib/office-bg.ts` já saneava e aceitava qualquer hex, então
só faltava a última porta na UI; `ehFundoPersonalizado` (puro, testado) diz
quando o swatch próprio está ativo. O que sobra do item é o outro destino: a
paleta de `lib/reminders.ts`, se um dia valer trocar as cores fixas de lembrete
por escolha livre.

O `tutorial.jsx` · `tutorial2.jsx` (onboarding em passos) saiu da tabela: virou
o **guia de boas-vindas** de `components/onboarding.tsx` (dados/regras puros em
`lib/onboarding.ts`, testados). Da referência ficou o formato — passos com
bolinhas de progresso —, mas **sem o quiz de papel/objetivo**: aquilo é de SaaS
qualificando lead, e num app pessoal seria só fricção antes de usar. Ficou de
fora **de propósito** o tour interativo que destaca elementos reais da tela
(coach-marks): é bem mais código e mais frágil a cada mudança de layout, e o
guia curto já cumpre o "entender o que fazer sem alguém do lado". Se o feedback
do primeiro contato pedir, o tour vira item próprio.

O `votacao2-feedback.tsx` (`PollWidget`) saiu da tabela: virou a **enquete de uma
pergunta** no fim do dashboard (`components/enquete.tsx` + `lib/enquete.ts`,
puro e testado). Ela existe pelo mesmo motivo do botão de feedback ter perdido o
diálogo: nesta fase o pior resultado possível é feedback que não chega, e
**escrever é atrito**. Uma pergunta com até quatro respostas prontas cabe num
toque — e um toque é a diferença entre saber e supor.

Três decisões que valem para quem mexer nisso. A resposta vai para a tabela
`feedback` que já existe, como uma linha legível (`[enquete] pergunta → resposta`):
sem tabela nova, sem SQL, sem RLS, e o painel do dono já a mostra. O preço é não
haver contagem agregada, e com um punhado de testadores ler as linhas sai mais
barato que construir o relatório. As perguntas moram no CÓDIGO, porque quem as
muda é quem faz o deploy. E o "agora não" cala a enquete **inteira** por três
dias, não só a pergunta recusada — emendar outra pergunta em quem acabou de
recusar é o incômodo que faz parar de responder qualquer uma.

O cartão fica **depois** do que a pessoa veio ver: ela abriu o app para
trabalhar, não para responder pesquisa.

O `notas-cores.jsx` saiu da tabela: as notas ganharam **cor**
(`components/…/notes/page.tsx` + `lib/nota-cor.ts`, puro e testado). Da
referência veio a cor, **não a imagem** — nota com imagem de fundo é outra
feature, e bem mais cara.

**A cor entra como ETIQUETA, não como fundo.** Pintar a nota inteira brigaria
com os tokens do tema nas duas pontas: no claro vira papel de bala, no escuro o
texto perde contraste contra um fundo que já não é o `--card`. O que ficou foi
uma tarja de 4 px na lista e um véu de 14% no cartão — o suficiente para achar a
nota de relance, que é para o que serve cor em lista. Na área de escrita a cor é
só um fio no topo: um véu ali passaria a disputar com o texto.

**O que se guarda é o NOME, nunca o hex.** Com o hex no banco, mudar a paleta um
dia deixaria notas antigas apontando para uma cor que não existe mais, sem como
corrigi-las em bloco. E o véu usa `color-mix` com transparente em vez de um
segundo hex por tema: quem aparece através dele é o fundo do tema, então a mesma
paleta serve ao claro e ao escuro sem duas tabelas para manter em sincronia.

O `notas_cor.sql` **não tem CHECK** de propósito: a lista de cores muda no
código, e um CHECK aqui viraria a mesma armadilha do `feedback_kind_check` — um
constraint velho recusando um valor novo, num banco onde ninguém lembra de tê-lo
criado. Cor desconhecida vira "sem cor" no app, nunca erro.

O `tarefas.jsx` saiu da tabela: a **repetição saiu do diálogo** e virou um
submenu no menu de ações do cartão — trocar "semanalmente" numa tarefa que já
existe deixou de exigir abrir o formulário inteiro.

**Ela entrou no menu, e não como um controle no cartão**, e isso é o
minimalista ganhando de novo: a lista de tarefas é a tela que mais se olha, e um
seletor por cartão a encheria. O menu de ações já estava lá e não custou um
pixel.

O `slider` da referência não veio: **"a cada N dias" não cabe num menu**, então
ela continua sendo escolhida no diálogo. O que o menu faz questão de mostrar é a
repetição personalizada MARCADA — sem essa linha, uma tarefa que repete a cada
três dias abriria o menu sem nada marcado, dizendo que não repete.

Duas coisas ficaram amarradas por teste. `regraParaBanco` passou a ser a única
dona da conversão "none → NULO" (ela estava escrita à mão no diálogo, e duas
cópias da mesma regra é como uma delas fica para trás), e há um teste cobrando
que tudo que sai dela seja lido por `nextOccurrence` — se as duas pontas
divergirem, a tarefa repete na tela e não avança de prazo ao concluir. E mudar a
repetição mexe SÓ na regra: reescrever o `due_date` junto jogaria uma tarefa de
hoje para a semana que vem sem ninguém pedir.

O `feedback.jsx` (`MorphSurface`) saiu da tabela: o botão de feedback **virou o
formulário**, sem diálogo. O que o diálogo custava não era estética, era atrito
— escurecia o app inteiro, tirava de vista a tela que a pessoa ia comentar e
pedia a decisão de parar o que estava fazendo. Numa fase cujo pior resultado
possível é *feedback que não chega*, atrito na porta é o defeito mais caro que
existe. Agora a superfície cresce do próprio ícone, no canto do cabeçalho, e a
tela continua atrás — visível justamente enquanto se escreve sobre ela. Da
referência veio a ideia, não o código: o original mede e anima na mão, e aqui o
crescimento é o `layoutId` do framer, o MESMO da pílula do Dock. Sem diálogo, Esc
e clique fora passaram a ser responsabilidade do componente.

O `prompts.jsx` (`PromptLibrary`) saiu da tabela: os quatro atalhos fixos da tela
vazia da Neuro IA viraram **salvos e editáveis** (`components/atalhos-neuro.tsx`
+ `lib/atalhos-neuro.ts`, puro e testado). Da referência ficou o "salvos e
editáveis", **não a biblioteca**: o original tem busca, categorias, agrupamento e
um diálogo de criar — mobília de quem guarda dezenas de prompts. Aqui o teto é
seis, e buscar entre seis dá mais trabalho do que ler os seis (o mesmo argumento
que tirou a busca do seletor de região). Sem busca, categoria perde a função, que
é estreitar lista longa.

Duas decisões de dado, para quem for mexer: eles moram no `user_metadata`, como
avatar_modo — uma tabela nova custaria SQL à mão, RLS e uma consulta a mais na
abertura do chat, para guardar menos do que o retrato do avatar. E "nunca mexeu"
é diferente de "apagou todos": a chave ausente devolve os padrões, a chave vazia
devolve nada. Sem essa distinção, os cartões renasceriam sozinhos para quem
acabou de removê-los de propósito.

| Arquivo | O que é | Onde encaixa |
|---|---|---|
| `color-picker.jsx` | Paleta gerada (Poline), com travar e copiar | A paleta de `lib/reminders.ts` (a cor de fundo do Escritório já saiu — ver nota) |
| `navegação-effects.jsx` | Ícones que trocam de forma | O Dock |
| `youtube-button.jsx` | `FamilyButton` — flutuante que expande | Ações rápidas do dashboard |
| `votacao-feedback.jsx` | Grade de ícones de serviços (Google, GitHub, Notion…) | Serve de referência de ícone para o login social acima |
| `convite.jsx` | Painel estilo central de controle | Convite de compromisso, em Amigos |
| `popover.jsx` | Popover com corpo, botões e fechar | Genérico — base para os de cima, não item próprio |
| `dashboard.jsx` | `GridBeam` — feixes correndo num grid | Fundo do dashboard, se a seção de métricas pedir |
| `carrosel.jsx` · `pricing.tsx` | Carrossel de logos e tabela de planos | **Não encaixam**: app pessoal, sem clientes e sem planos |

Nenhum é pré-requisito de nada, e nenhum vale sozinho. O critério para tirar um da lista é
**a tela ficar melhor** — não o componente ser bonito na pasta.

### Calendário aberto pra fora

> **Resolvido (28/08).** A importação é `.ics` e sempre serviu Google, Outlook, Apple e
> qualquer outro; o que estava estreito era o texto. Saíram os três que assumiam Google: o
> atalho do "Comece por aqui" (virou "Trazer minha agenda"), o toast de link copiado e a
> mensagem de erro de importação. **Ficam citando Google de propósito** as instruções passo a
> passo, em Configurações e no diálogo de importar: ali o nome próprio ENSINA onde clicar, e
> os dois trechos já dizem "Google Calendar, Outlook e outros" antes de dar a receita de um.

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
