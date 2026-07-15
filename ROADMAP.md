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
      avatar-editor.tsx: pernas (!), 6 cabelos × 6 cores, 5 tons de pele, 4 roupas
      (camiseta/moletom/jaqueta/terno) × 6 cores, fones on/off. Editor com preview ao
      vivo no Escritório; salvo em user_stats.avatar (jsonb, social_v2.sql); amigos
      veem o avatar na visita (friend_office, portão share_office). Cena ganhou fundo
      gradiente por fase do dia (fim do void escuro) + sombra ambiente.
- [ ] **Escritório vivo v3** (adiado por decisão): comemoração ao concluir (evento);
      sala expansível por nível (comparação social legível num relance) + snapshot
      compartilhável. Roupas/acessórios do avatar COMPRÁVEIS na loja. 3D real adiado.
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
- [ ] **Amigos v2 — agenda e convites**: ver horários ocupados do amigo (permissão
      própria, além do booleano agora); convidar para compromisso (proposta →
      aceite → bloco criado no calendário dos dois); usa a aba Reunião das tarefas
      (link/local) para reuniões marcadas entre amigos. Sugestões por REGIÃO
      (requer localização aproximada opt-in — decidir fonte antes).
- [x] **Notificações push reais**: Service Worker + VAPID + push_subscriptions; dispatcher
      /api/push/dispatch (service role) acionado a cada minuto pelo pg_cron do Supabase;
      lembretes com hora e check-ins de blocos chegam com o app FECHADO. Manifest PWA
      + ícones (iPhone exige adicionar à tela de início). SQLs: push.sql + push_cron.sql.

### Fase 4 — Integrações externas
- [ ] **Bot do Telegram** (validação barata do fluxo "mensagem → tarefa"); depois WhatsApp
      (API oficial, paga) quando fizer sentido.
- [ ] **Extensão Chrome/Edge**: tempo de tela em redes sociais → insights no dashboard.
- [ ] Exportação ICS → integrações de calendário (Google/Outlook) → compartilhamento.

## Princípios de implementação
- Confiabilidade > feature nova (aprendizado das reviews).
- O que puder ser **determinístico** (avisos, dedupe, datas, XP) não usa LLM.
- IA propõe, usuário confirma; a IA nunca inventa dados.
- Tudo com degradação graciosa quando o limite gratuito da IA bater.
