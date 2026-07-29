# NeuroTask · Visão e Roadmap

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

## Fases

### Fase 1 — Fundação de uso real (pré-requisito de tudo) ✅
- [x] **Deploy na Vercel** + configuração do Supabase (Confirm email, redirect URLs,
      callback cross-device via token_hash).
- [x] Acesso mobile (HTTPS + responsividade completa: barra inferior, grades roláveis).
- [x] SMTP próprio (Brevo) + template de e-mail com a marca.

### Fase 2 — O copiloto (diferencial)
- [x] **Planejamento retroativo**: ferramenta plan_day_backwards — a Neuro extrai o
      compromisso-âncora e o SISTEMA calcula a cadeia (dormir → acordar → preparo →
      refeição → deslocamento → âncora) com as atividades de rotina e o sono desejado.
      Fluxo propor (confirm=false) → usuário confirma → criar (confirm=true, recálculo
      determinístico). Match de atividade por destino (ex.: "faculdade" → "Deslocamento
      → Faculdade"); dedupe ao criar; fallbacks quando a biblioteca está vazia.
- [x] **Perfil de rotina** em Configurações (`routine_profile`): horas de sono + toggle de avisos.
- [x] **Atividades de rotina** (`routine_activities`): biblioteca nomeada com duração
      ("Deslocamento → Trabalho" 30min, "Se arrumar (evento)" 60min) — decisão de design:
      valores fixos únicos não representam rotinas reais (variam por destino/ocasião).
      Viram blocos de 1 toque no dialog do calendário e alimentarão o planejador.
- [x] **Avisos inline no calendário** (determinísticos, `lib/calendar-warnings.ts`): sono
      curto entre dias / bloco de sono curto / tela perto de dormir; dispensáveis; toggle.
- [x] **Check-in pós-horário**: bloco terminou → toast "Conseguiu fazer?" com Concluí
      (conclui a tarefa vinculada com XP, respeita recorrência, registra em activity_log)
      / Reagendar (move o bloco para agora). Roda no notificador global a cada 30s.
- [x] **Autoconhecimento v1**: activity_log (planejado vs. real por check-in) + card no
      dashboard com médias por atividade e desvio (+Xmin / em dia). SQL: activity_log.sql.
- [x] **Rotina aprendida** (camada implícita, determinística — sem ML, `lib/routine-insights.ts`):
      minera os blocos reais dos últimos 30 dias (título normalizado em ≥3 dias distintos →
      "salvar como atividade?" com mediana de duração e categoria heurística) e os check-ins
      do activity_log (≥3 amostras, desvio ≥10min → "ajustar duração?"). Sugestões aparecem
      em Configurações → Rotina com aceitar/ignorar. Usuário sempre confirma.

### Fase 3 — Hábito e gamificação com propósito
- [x] **Anti-farm de XP** (antes das moedas): tarefa com vida < 10 min não vale XP;
      sem prazo E sem duração vale metade; teto de 150 XP/dia aplicado no SERVIDOR
      (award_xp — supabase/xp_anticheat.sql). Regras transparentes no tooltip da barra.
- [x] **Moedas + loja cosmética — o Escritório** (`/app/office`): moedas nascem no SERVIDOR
      dentro do award_xp (1 moeda a cada 5 XP concedidos → máx. ~30/dia pelo teto; estorno
      debita sem travar em 0 para não virar impressora de moedas). Preços autoritativos na
      tabela shop_items; compra via RPC atômica buy_item (valida saldo/posse). Cena SVG em
      camadas (components/office-scene.tsx) + loja com 19 itens em 5 slots (decor livre;
      cadeira/setup/parede/piso exclusivos), equipar/guardar. SQL: coins_shop.sql.
- [x] **Escritório vivo v1** (micro-animações + dia/noite): gato respira/pisca/abana o
      rabo e ronrona ao clique; plantas balançam; luminária pulsa (mais forte à noite);
      neon com flicker; céu da janela e ambiente seguem a HORA REAL (amanhecer/dia/
      pôr do sol/noite com prédios acesos). Respeita prefers-reduced-motion.
- [x] **Escritório vivo v2 — núcleo reativo** (lib/office-stats.ts): personagem sentado
      na cadeira que DIGITA quando há tarefa "em andamento" real (tela acesa com código
      e cursor piscando; tela esmaecida quando parado); estante enche com conclusões
      (1 livro a cada 5 tarefas concluídas); quadro de streak 🔥 na parede (dias
      seguidos concluindo, aparece com ≥2); clique em estante/troféu/quadro mostra as
      estatísticas por trás; xícara de café com vapor de manhã (5h–12h, ambiental).
      Tudo derivado de trabalho real — nunca de login/clique (anti-farm).
- [x] **Cena isométrica 2.5D** (pedido do usuário, ref. visual de home offices iso):
      projeção 2:1 com helpers (`Box`, planos de parede com y-descendo-do-topo,
      `planeX`/`planeY` para telas/estante), duas paredes + chão em losango, sombras,
      rodapé e acabamento superior. Pessoa visível de lado (cabelo + fones). Validada
      por render server-side → PNG (react-dom/server + sharp) antes do deploy.
- [x] **Avatar editável (paper-doll)** — lib/avatar.ts + components/avatar-figure.tsx +
      avatar-editor.tsx: visto DE COSTAS (sem rosto, pernas para FRENTE na direção da
      mesa), corpo masculino/feminino grátis, 6 cabelos × 6 cores, 5 tons de pele,
      4 roupas (camiseta/moletom/jaqueta/terno) × 6 cores, fones on/off. Editor com
      preview ao vivo (botão no rodapé E clique no próprio bonequinho); salvo em
      user_stats.avatar (jsonb, social_v2.sql); amigos veem o avatar na visita
      (friend_office, portão share_office). Cena com fundo gradiente por fase do dia.
- [x] **Escritório 3D** (React-Three-Fiber — o "3D real" que estava adiado aconteceu):
      sala + personagem construídos em código a partir dos scripts Blender
      (`lib/office-model.ts`, Z-up em metros → Y-up no `<group>` da cena), cell-shading
      toon, luz por fase do dia, skins do personagem e pet beagle (GLB).
- [x] **Itens da loja no 3D**: a sala nasce CRUA de propósito ("seu cantinho começa
      simples") e cada item comprado vira malha de verdade — plantas, luminária,
      estante, quadro, neon, janela, tapete, troféu, gato e o beagle; parede/piso/
      cadeira viram cor. Antes disso a fiação estava solta: `equipped` chegava na cena
      e era ignorado, então comprar decoração não mudava nada na tela.
- [x] **Acessórios do avatar compráveis** (avatar_acessorios.sql): slots separados de
      chapéu (boné · social · coroa) e óculos (grau · escuros) — dá para usar os dois
      juntos, um por slot. Validação: script headless mede as bounding boxes e reprova
      peça que atravesse parede, flutue, afunde no piso ou cubra os olhos.
- [x] **Visita de amigo em 3D**: a mesma cena do próprio escritório (import dinâmico,
      ssr:false — o bundle 3D não pesa em quem nunca abre uma visita), então as
      decorações e os acessórios do amigo aparecem de verdade. Continua tudo pela RPC
      friend_office (valida amizade + share_office); clicar no avatar não faz nada,
      o editor é só do dono. A cena 2D (components/office-scene.tsx) ficou órfã —
      decidir se vira fallback de WebGL indisponível ou se sai de vez.
- [x] **Sala expansível por nível**: cresce em DEGRAUS (4m → 4,6m no nível 3 → 5,2m no
      5 → 5,8m no 8), não continuamente — subir de nível vira um evento perceptível.
      A zona de trabalho fica ancorada na parede do fundo (distância constante de
      1,10m), então o espaço novo aparece como chão livre à frente: 2,90m no nível 1,
      4,70m no 8. Itens de parede (quadro, neon, estante, janela) acompanham a parede
      que se afasta; a câmera ortográfica abre na mesma proporção e mira na pessoa.
      Vale também na visita — o nível do amigo já vinha da RPC friend_office.
- [ ] **Escritório vivo v3** (o que sobrou): comemoração ao concluir (evento);
      snapshot compartilhável.
- [x] **Amigos e comparação** (social, v1 — friends.sql): perfil público com @username
      único (escolhido na seção Amigos do Escritório); busca por @/nome via RPC (nunca
      expõe e-mail); pedido/aceite/desfazer amizade (pedido mútuo vira amizade na hora);
      **status ocupado/livre** derivado dos blocos AGORA (inclui recorrentes simples) —
      só o booleano, nunca a rotina; **visitar o escritório** do amigo (cena + nível).
      Privacidade por flag (ocupado/escritório/nível), padrão visível SÓ para amigos
      aceitos (o aceite é o portão), cada flag desligável nos chips da seção. Toda
      leitura sensível via RPC security definer que valida amizade + flag.
      Aba própria no dock: `/app/friends` (o social vai além do escritório).
      **Sugeridos** (social_v2.sql): perfis com "perfil aberto" (discoverable,
      configurável nos chips) aparecem como sugestão de amizade para outros usuários.
- [x] **Amigos v2 — agenda e convites** (friends_agenda.sql): botão 📅 Agenda mostra
      os horários OCUPADOS de hoje do amigo (novo chip "Agenda", padrão DESLIGADO;
      RPC friend_schedule devolve só horários — nunca títulos; ocorrências expandidas
      no cliente, faixas fundidas). Botão ➕ Convidar → dialog (título, data, das/às,
      link e local opcionais) → meeting_invites; aceitar via RPC cria o bloco roxo no
      calendário DOS DOIS (link/local vão na descrição); recusar/cancelar tratados.
      Convites pendentes listados na aba com aceitar/recusar/cancelar.
- [x] **Amigos v3** (friends_v3.sql): **sugestões por REGIÃO** — fonte decidida: cidade
      DIGITADA no perfil (nada de GPS: sem prompt do navegador, sem serviço externo,
      sem coordenada guardada). O texto da cidade é só do dono; para os outros vira o
      booleano `same_region` no `suggested_users()` (mesmo espírito do ocupado/livre) e
      ordena os sugeridos — o portão do `discoverable` continua valendo.
      **Push de convite recebido**: novo bloco no dispatcher + `meeting_invites.pushed`
      (padrão do reminders.pushed; convites antigos marcados como enviados na migração
      para não disparar tudo de uma vez). **Proposta de horário** (determinística, sem
      LLM): cruza a agenda do amigo (RPC friend_schedule — só horários) com os MEUS
      blocos, funde as faixas ocupadas e sugere as primeiras janelas livres para os dois
      na duração escolhida (janela 7h–23h, arredondado em 30min, ignora o passado).
      Botão no dialog de convite, só quando o amigo compartilha a agenda.
- [x] **Notificações push reais**: Service Worker + VAPID + push_subscriptions; dispatcher
      /api/push/dispatch (service role) acionado a cada minuto pelo pg_cron do Supabase;
      lembretes com hora e check-ins de blocos chegam com o app FECHADO. Manifest PWA
      + ícones (iPhone exige adicionar à tela de início). SQLs: push.sql + push_cron.sql.

### Fase 4 — Integrações externas
- [x] **Bot do Telegram** (telegram.sql): fluxo "mensagem → tarefa" com o MESMO
      pareamento por código da extensão (6 dígitos em Configurações → `/start CODIGO`
      no bot) — nada de login dentro do Telegram. Qualquer mensagem vira tarefa
      (1ª linha = título, resto = descrição); entende `/hoje` (agenda + tarefas do dia),
      `/ajuda` e `/sair`. Interpretação 100% determinística (`lib/telegram-commands.ts`,
      módulo puro e testável — sem LLM, seguindo o princípio do projeto).
      Webhook autenticado pelo header `x-telegram-bot-api-secret-token`: sem esse
      segredo qualquer um poderia forjar um update com chat_id alheio e escrever na
      conta de outra pessoa. Responde 200 mesmo em erro (senão o Telegram reenvia em
      loop). `/api/telegram/setup` registra o webhook (protegida pelo CRON_SECRET).
      Env novas: TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET.
      Depois WhatsApp (API oficial, paga) quando fizer sentido.
- [x] **Extensão Chrome/Edge** (`extension/`, Manifest V3 sem build step): tempo de tela em
      redes sociais → card "Tempo de tela" no dashboard. **Pareamento por código** (6 dígitos
      gerados em Configurações, expiram em 10min) trocado por um token de dispositivo em
      `/api/extension/exchange` — sem OAuth/login dentro da extensão (decisão: evita as
      restrições de CSP do MV3). Token guardado só como hash SHA-256 (`extension_tokens`);
      o valor puro existe uma única vez na resposta e vive no `chrome.storage.local`.
      Contagem só com aba ativa + janela em foco + usuário não idle; buffer local com flush
      a cada 60s (tolerante a rede intermitente) e cap de 120s por entrada no SERVIDOR
      (anti-inflação). Dispositivos listáveis/revogáveis em Configurações.
      SQL: extension_screen_time.sql. Sem env var nova (reusa SUPABASE_SERVICE_ROLE_KEY).
- [ ] Exportação ICS → integrações de calendário (Google/Outlook) → compartilhamento.

## Princípios de implementação
- Confiabilidade > feature nova (aprendizado das reviews).
- O que puder ser **determinístico** (avisos, dedupe, datas, XP) não usa LLM.
- IA propõe, usuário confirma; a IA nunca inventa dados.
- Tudo com degradação graciosa quando o limite gratuito da IA bater.
