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

### Fase 1 — Fundação de uso real (pré-requisito de tudo)
- [ ] **Deploy na Vercel** + configuração do Supabase (Confirm email ativado, redirect URLs).
      Auth + RLS já existem no código; o bloqueador é operacional.
- [ ] Acesso mobile (HTTPS destrava microfone e notificações).

### Fase 2 — O copiloto (diferencial)
- [ ] **Planejamento retroativo**: ferramenta da Neuro "planejar a partir do compromisso X"
      (encadeia blocos de trás pra frente usando estimated_minutes + perfil de rotina).
- [ ] **Perfil de rotina** em Configurações: tempo para se arrumar, refeições, deslocamento,
      horas de sono desejadas.
- [ ] **Avisos inline no calendário** (determinísticos, sem LLM): tarefa com tela perto do
      sono; fim tarde + compromisso cedo (< 7h de sono); toggle em Configurações.
- [ ] **Check-in pós-horário**: bloco terminou sem conclusão → notificação "Conseguiu fazer X?"
      (concluir / reagendar). Respostas alimentam o autoconhecimento.
- [ ] **Autoconhecimento v1**: tempo real vs. estimado por tipo de tarefa; médias no dashboard.

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
