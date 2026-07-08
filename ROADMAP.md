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
- [ ] **Planejamento retroativo**: ferramenta da Neuro "planejar a partir do compromisso X"
      (encadeia blocos de trás pra frente usando estimated_minutes + perfil de rotina).
- [x] **Perfil de rotina** em Configurações (`routine_profile`): horas de sono + toggle de avisos.
- [x] **Atividades de rotina** (`routine_activities`): biblioteca nomeada com duração
      ("Deslocamento → Trabalho" 30min, "Se arrumar (evento)" 60min) — decisão de design:
      valores fixos únicos não representam rotinas reais (variam por destino/ocasião).
      Viram blocos de 1 toque no dialog do calendário e alimentarão o planejador.
- [x] **Avisos inline no calendário** (determinísticos, `lib/calendar-warnings.ts`): sono
      curto entre dias / bloco de sono curto / tela perto de dormir; dispensáveis; toggle.
- [ ] **Check-in pós-horário**: bloco terminou sem conclusão → notificação "Conseguiu fazer X?"
      (concluir / reagendar). Respostas alimentam o autoconhecimento.
- [ ] **Autoconhecimento v1**: tempo real vs. estimado por tipo de tarefa; médias no dashboard.
- [ ] **Rotina aprendida** (camada implícita, determinística — sem ML pesado): minerar padrões
      recorrentes nos blocos reais (título normalizado × horário × duração) e SUGERIR, via
      Neuro, novas atividades de rotina ("você cria 'Almoço' todo dia ~12h — salvar?") e
      ajustes de duração ("você leva 55min, não 45 — ajustar?"). Usuário sempre confirma.

### Fase 3 — Hábito e gamificação com propósito
- [ ] **Anti-farm de XP** (antes das moedas): XP só para tarefa com vida > 10 min,
      cap diário de XP, XP reduzido sem prazo/duração.
- [ ] **Moedas** ganhas com produtividade + **loja cosmética** (avatar/escritório do usuário).
- [ ] **Amigos e comparação** (social): ver o escritório/nível dos amigos.
- [ ] **Notificações push reais** (Service Worker — funciona com aba fechada).

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
