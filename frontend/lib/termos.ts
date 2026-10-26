import type { Idioma } from "@/lib/i18n"

// Termos de uso e política de privacidade (página /termos), nos dois idiomas.
//
// Mora fora do `lib/i18n.ts` porque é um documento, não a interface: dezenas de
// parágrafos que só uma página lê. O contrato é o mesmo, porém — um tipo que os
// dois idiomas cumprem, e um teste que confere que eles têm as mesmas seções.
//
// Cada fornecedor e cada dado citado aqui existe no código. Mudou o que o app
// guarda ou para quem manda (um provedor novo, um dado novo), muda este texto
// e a data de atualização, no mesmo commit.
//
// `§` marca negrito (lib/enfase.tsx). Um parágrafo que é lista vem como array.

export const RESPONSAVEL = "Gustavo Martins Cirino"
export const EMAIL_DE_CONTATO = "cirinogustavom@gmail.com"
export const IDADE_MINIMA = 13

export type Bloco = string | string[]

export interface SecaoLegal {
  id: string
  titulo: string
  blocos: Bloco[]
}

export interface ParteLegal {
  id: "termos" | "privacidade"
  titulo: string
  secoes: SecaoLegal[]
}

export interface DocumentoLegal {
  titulo: string
  atualizado: string
  intro: string
  voltar: string
  sumario: string
  contatoTitulo: string
  partes: [ParteLegal, ParteLegal]
}

export const DOCUMENTOS: Record<Idioma, DocumentoLegal> = {
  pt: {
    titulo: "Termos de uso e privacidade",
    atualizado: "Última atualização: 26 de outubro de 2026",
    intro:
      "Estas são as regras de uso do NeuroTask e o que acontece com os seus dados. Escrevemos em linguagem direta de propósito. Ao criar uma conta, você concorda com as duas partes.",
    voltar: "Voltar ao início",
    sumario: "Nesta página",
    contatoTitulo: "Fale com a gente",
    partes: [
      {
        id: "termos",
        titulo: "Termos de uso",
        secoes: [
          {
            id: "aceitacao",
            titulo: "1. Aceitação",
            blocos: [
              "Ao criar uma conta ou usar o NeuroTask, você concorda com estes Termos de Uso e com a Política de Privacidade logo abaixo. Se não concordar, não use o serviço.",
            ],
          },
          {
            id: "servico",
            titulo: "2. O que é o NeuroTask",
            blocos: [
              `O NeuroTask é um aplicativo de produtividade: tarefas, calendário com blocos de tempo, notas, Modo Foco, um jogo de XP e moedas com um escritório em 3D, recursos com amigos e uma assistente de IA, a Neuro. É um projeto pessoal, mantido por ${RESPONSAVEL} e oferecido de graça. Funções podem ser criadas, mudadas ou retiradas a qualquer momento.`,
            ],
          },
          {
            id: "conta",
            titulo: "3. Sua conta",
            blocos: [
              [
                `Você precisa ter pelo menos ${IDADE_MINIMA} anos. Se tiver menos de 18, use o NeuroTask com o conhecimento do seu responsável.`,
                "As informações da conta devem ser verdadeiras, e a conta é pessoal: uma pessoa por conta.",
                "Você é responsável por manter a sua senha em segredo e pelo que acontece na sua conta. Se suspeitar de uso indevido, troque a senha e nos avise.",
              ],
            ],
          },
          {
            id: "uso",
            titulo: "4. Uso aceitável",
            blocos: [
              "Você concorda em não:",
              [
                "usar o NeuroTask para algo ilegal ou que viole direitos de outras pessoas;",
                "tentar acessar contas ou dados de outras pessoas, ou burlar as proteções do serviço;",
                "usar robôs, scripts ou acesso automatizado sem autorização, nem sobrecarregar o serviço;",
                "explorar falhas para ganhar XP, moedas ou itens — se encontrar uma falha, nos conte;",
                "usar amizades, convites ou a agenda compartilhada para assediar ou enganar alguém.",
              ],
            ],
          },
          {
            id: "ia",
            titulo: "5. A Neuro IA",
            blocos: [
              [
                "A Neuro usa um modelo de linguagem de um fornecedor externo (Groq). As respostas podem ter erros: confira datas, horários e qualquer informação importante.",
                "A Neuro pede confirmação antes de criar, editar ou excluir algo, mas a decisão final é sua.",
                "Não use a Neuro para decisões médicas, jurídicas ou financeiras.",
                "O que você escreve ou fala para a Neuro é enviado ao fornecedor de IA para gerar a resposta (veja a Política de Privacidade).",
                "Para a cota da IA dar para todo mundo, cada pessoa tem um limite diário de mensagens com a Neuro — que cresce com o seu nível — e de transcrições de áudio, além de um limite de mensagens por minuto. Ele se renova todo dia.",
              ],
            ],
          },
          {
            id: "conteudo",
            titulo: "6. O seu conteúdo",
            blocos: [
              "Tarefas, notas, blocos e tudo o que você cria no NeuroTask são seus. Você nos dá apenas a permissão necessária para guardar, processar e mostrar esse conteúdo para você — e para quem você escolher, nos recursos com amigos. Não vendemos o seu conteúdo e não o usamos para publicidade.",
            ],
          },
          {
            id: "jogo",
            titulo: "7. XP, moedas e itens",
            blocos: [
              "XP, moedas e itens do Escritório são parte do jogo: não têm valor em dinheiro, não podem ser trocados, vendidos nem reembolsados, e podem ser ajustados — por exemplo, para corrigir abusos ou erros de contagem.",
            ],
          },
          {
            id: "amigos",
            titulo: "8. Amigos e agenda compartilhada",
            blocos: [
              "Seus amigos veem só o que você liberar nas Configurações: se está ocupado ou livre, a sua agenda do dia, o seu nível e o seu escritório. O link de agenda compartilhada mostra apenas os horários ocupados, sem títulos, para qualquer pessoa que tiver o link; você pode trocá-lo ou desligá-lo quando quiser.",
              "Já o link de assinatura no Google/Outlook entrega os seus blocos §com título e descrição§ a quem tiver o link. Guarde-o como uma senha; gerar um novo invalida o anterior.",
            ],
          },
          {
            id: "disponibilidade",
            titulo: "9. Disponibilidade e garantias",
            blocos: [
              "Fazemos o possível para o NeuroTask funcionar bem, mas ele é oferecido como está: pode ficar fora do ar, ter erros ou perder funções. Guarde uma cópia do que for importante — por exemplo, exportando a sua agenda em Configurações.",
            ],
          },
          {
            id: "responsabilidade",
            titulo: "10. Responsabilidade",
            blocos: [
              "Nos limites da lei, não respondemos por perdas indiretas do uso do serviço, como um compromisso perdido por um lembrete que não chegou. Nada nestes termos limita direitos que a lei garante a você, inclusive os do Código de Defesa do Consumidor.",
            ],
          },
          {
            id: "encerramento",
            titulo: "11. Encerramento",
            blocos: [
              "Você pode excluir a sua conta a qualquer momento, em §Configurações → Conta → Excluir minha conta§. Podemos suspender ou encerrar contas que violem estes termos.",
            ],
          },
          {
            id: "mudancas",
            titulo: "12. Mudanças nestes termos",
            blocos: [
              "Podemos atualizar estes termos. Mudanças importantes serão avisadas no app antes de valer, e continuar usando o NeuroTask depois disso significa concordar com a nova versão.",
            ],
          },
          {
            id: "lei",
            titulo: "13. Lei aplicável",
            blocos: [
              "Estes termos seguem as leis do Brasil. Eventuais disputas serão resolvidas no foro do seu domicílio.",
            ],
          },
        ],
      },
      {
        id: "privacidade",
        titulo: "Política de privacidade",
        secoes: [
          {
            id: "controlador",
            titulo: "1. Quem cuida dos seus dados",
            blocos: [
              `O responsável pelo tratamento dos seus dados (o controlador, na LGPD) é §${RESPONSAVEL}§, que também atende os pedidos sobre dados pessoais pelo e-mail §${EMAIL_DE_CONTATO}§.`,
            ],
          },
          {
            id: "dados",
            titulo: "2. Quais dados guardamos",
            blocos: [
              [
                "§Conta:§ nome, e-mail e senha — a senha fica com o fornecedor de login apenas como hash, nunca em texto. Se você entra com Google ou GitHub, recebemos o nome, o e-mail e a foto da conta desse serviço.",
                "§Perfil:§ @usuário, foto (se você enviar), a aparência do avatar, a cidade (se você informar) e as suas escolhas de compartilhamento.",
                "§O que você cria:§ tarefas, listas, blocos do calendário, notas, lembretes, rotina e atividades.",
                "§Jogo e amigos:§ XP, moedas, itens, amizades, convites e os links de agenda compartilhada.",
                "§Notificações:§ o endereço técnico do aparelho para o push e o seu fuso horário.",
                "§Neuro IA:§ as mensagens e os áudios que você manda, para gerar a resposta. O histórico das conversas fica guardado no seu navegador, não no nosso banco. Contamos quantas vezes você usou a Neuro e a transcrição no dia, para o limite diário — só o número, nunca o conteúdo.",
                "§Técnicos:§ registros de erro (a mensagem, a tela em que aconteceu e a versão do app), os feedbacks que você envia, e o endereço IP e dados do navegador, que os fornecedores de hospedagem e de segurança processam para proteger o serviço.",
              ],
            ],
          },
          {
            id: "finalidades",
            titulo: "3. Para que usamos",
            blocos: [
              [
                "Prestar o serviço: guardar e mostrar o que você cria, sincronizar entre aparelhos e enviar lembretes e notificações.",
                "Fazer a Neuro responder e agir no app quando você pede.",
                "Proteger as contas e o serviço: login, CAPTCHA, limites de tentativas e prevenção de abuso.",
                "Corrigir erros e melhorar o app, a partir dos registros de erro e dos feedbacks.",
                "Falar com você sobre a sua conta, como a confirmação de e-mail e a troca de senha.",
              ],
              "Não vendemos dados, não usamos dados para publicidade e não criamos perfis para terceiros.",
            ],
          },
          {
            id: "bases",
            titulo: "4. Bases legais",
            blocos: [
              "Tratamos os seus dados para executar o serviço que você contrata ao criar a conta (art. 7º, V, da LGPD), para cumprir obrigações legais (art. 7º, II) e, na segurança, nos registros de erro e nas melhorias, por legítimo interesse (art. 7º, IX) — sempre dentro do que se espera de um app como este.",
            ],
          },
          {
            id: "compartilhamento",
            titulo: "5. Com quem compartilhamos",
            blocos: [
              "Usamos fornecedores que processam dados em nosso nome, cada um só para o que faz:",
              [
                "§Supabase§ — banco de dados, login, armazenamento da foto e envio dos e-mails da conta.",
                "§Vercel§ — hospedagem do site e, quando ativadas, estatísticas de acesso agregadas e sem cookies.",
                "§Groq§ — o modelo de IA da Neuro e a transcrição do áudio do microfone.",
                "§Microsoft§ — a voz da Neuro: o texto das respostas vira áudio num serviço de voz da Microsoft.",
                "§Cloudflare§ — o CAPTCHA do login, do cadastro e da troca de senha.",
                "§Google e GitHub§ — só se você entrar com a conta deles.",
                "§Google§ — na conversa por voz ao vivo, quem reconhece a fala é o próprio navegador; no Chrome, pelo serviço de voz do Google.",
                "§YouTube§ — só se você usar o player de música do Modo Foco, que carrega o vídeo, o player e as capas direto do YouTube (pelo domínio youtube-nocookie, que guarda menos dados de quem assiste).",
              ],
              "Seus amigos veem apenas o que você liberar nas Configurações. Fora isso, só compartilhamos dados se a lei exigir.",
            ],
          },
          {
            id: "transferencia",
            titulo: "6. Transferência internacional",
            blocos: [
              "Alguns desses fornecedores guardam ou processam dados fora do Brasil, principalmente nos Estados Unidos. Essas transferências seguem o art. 33 da LGPD e as garantias contratuais de cada fornecedor.",
            ],
          },
          {
            id: "retencao",
            titulo: "7. Por quanto tempo guardamos",
            blocos: [
              [
                "Os dados da conta ficam guardados enquanto a conta existir.",
                "Ao excluir a conta, apagamos na hora a conta, a foto e tudo o que você criou. Os feedbacks que você enviou continuam, sem identificar você.",
                "Registros de erro são apagados automaticamente depois de 30 dias, e o contador do limite diário da IA, no dia seguinte.",
                "Cópias de segurança dos fornecedores podem manter dados por um período curto, até serem substituídas.",
              ],
            ],
          },
          {
            id: "direitos",
            titulo: "8. Seus direitos",
            blocos: [
              "Pela LGPD (art. 18), você pode: confirmar se tratamos os seus dados e acessá-los; corrigir dados incompletos ou errados; pedir a portabilidade; pedir a exclusão; saber com quem compartilhamos; e revogar consentimentos.",
              `Boa parte você faz direto no app: o perfil se edita em Configurações, e a conta se exclui em §Configurações → Conta§. Para o resto, escreva para §${EMAIL_DE_CONTATO}§ — respondemos em até 15 dias. Você também pode reclamar à ANPD, a Autoridade Nacional de Proteção de Dados.`,
            ],
          },
          {
            id: "navegador",
            titulo: "9. Cookies e armazenamento no navegador",
            blocos: [
              "Usamos um cookie essencial, o da sessão de login, sem o qual não há como você entrar. No armazenamento do navegador ficam as suas preferências (tema, região, último jeito de entrar), o histórico das conversas com a Neuro, o estado do Modo Foco e a sua lista de músicas do YouTube. Não usamos cookies de publicidade nem de rastreamento.",
            ],
          },
          {
            id: "seguranca",
            titulo: "10. Segurança",
            blocos: [
              "Conexão sempre criptografada (HTTPS), senha guardada só como hash, regras no banco que deixam cada pessoa acessar apenas os próprios dados, CAPTCHA e limites de tentativas no login, e chaves secretas apenas no servidor. Nenhum sistema é infalível: se um incidente colocar os seus dados em risco, avisaremos você e a ANPD, como a lei manda.",
            ],
          },
          {
            id: "menores",
            titulo: "11. Crianças e adolescentes",
            blocos: [
              `O NeuroTask não é para menores de ${IDADE_MINIMA} anos. Se você é responsável por uma criança que criou uma conta, escreva para nós e a conta será excluída.`,
            ],
          },
          {
            id: "alteracoes",
            titulo: "12. Mudanças nesta política",
            blocos: [
              "Se esta política mudar de forma importante, avisaremos no app. A data no topo da página mostra a última atualização.",
            ],
          },
        ],
      },
    ],
  },
  en: {
    titulo: "Terms of use and privacy",
    atualizado: "Last updated: October 26, 2026",
    intro:
      "These are the rules for using NeuroTask and what happens to your data. We wrote them in plain language on purpose. By creating an account, you agree to both parts.",
    voltar: "Back to home",
    sumario: "On this page",
    contatoTitulo: "Get in touch",
    partes: [
      {
        id: "termos",
        titulo: "Terms of use",
        secoes: [
          {
            id: "aceitacao",
            titulo: "1. Acceptance",
            blocos: [
              "By creating an account or using NeuroTask, you agree to these Terms of Use and to the Privacy Policy right below. If you don't agree, don't use the service.",
            ],
          },
          {
            id: "servico",
            titulo: "2. What NeuroTask is",
            blocos: [
              `NeuroTask is a productivity app: tasks, a calendar with time blocks, notes, Focus Mode, an XP-and-coins game with a 3D office, features with friends and an AI assistant, Neuro. It is a personal project, maintained by ${RESPONSAVEL} and offered for free. Features may be added, changed or removed at any time.`,
            ],
          },
          {
            id: "conta",
            titulo: "3. Your account",
            blocos: [
              [
                `You must be at least ${IDADE_MINIMA} years old. If you are under 18, use NeuroTask with your parent's or guardian's knowledge.`,
                "Account information must be true, and the account is personal: one person per account.",
                "You are responsible for keeping your password secret and for what happens in your account. If you suspect misuse, change your password and let us know.",
              ],
            ],
          },
          {
            id: "uso",
            titulo: "4. Acceptable use",
            blocos: [
              "You agree not to:",
              [
                "use NeuroTask for anything illegal or that violates other people's rights;",
                "try to access other people's accounts or data, or get around the service's protections;",
                "use bots, scripts or automated access without permission, or overload the service;",
                "exploit bugs to gain XP, coins or items — if you find a bug, tell us;",
                "use friendships, invites or the shared schedule to harass or deceive anyone.",
              ],
            ],
          },
          {
            id: "ia",
            titulo: "5. Neuro AI",
            blocos: [
              [
                "Neuro uses a language model from an external provider (Groq). Answers can be wrong: double-check dates, times and anything important.",
                "Neuro asks for confirmation before creating, editing or deleting anything, but the final decision is yours.",
                "Don't use Neuro for medical, legal or financial decisions.",
                "What you type or say to Neuro is sent to the AI provider to generate the answer (see the Privacy Policy).",
                "So the AI quota is enough for everyone, each person has a daily limit of messages with Neuro — which grows with your level — and of audio transcriptions, plus a per-minute message limit. It resets every day.",
              ],
            ],
          },
          {
            id: "conteudo",
            titulo: "6. Your content",
            blocos: [
              "Tasks, notes, blocks and everything you create in NeuroTask are yours. You only give us the permission needed to store, process and show that content to you — and to whoever you choose, in the features with friends. We don't sell your content and we don't use it for advertising.",
            ],
          },
          {
            id: "jogo",
            titulo: "7. XP, coins and items",
            blocos: [
              "XP, coins and Office items are part of the game: they have no cash value, can't be traded, sold or refunded, and may be adjusted — for example, to fix abuse or counting errors.",
            ],
          },
          {
            id: "amigos",
            titulo: "8. Friends and shared schedule",
            blocos: [
              "Your friends only see what you allow in Settings: whether you are busy or free, your schedule for the day, your level and your office. The shared schedule link shows only busy times, without titles, to anyone who has the link; you can change it or turn it off whenever you want.",
              "The Google/Outlook subscription link, on the other hand, delivers your blocks §with title and description§ to anyone who has the link. Keep it like a password; generating a new one invalidates the old one.",
            ],
          },
          {
            id: "disponibilidade",
            titulo: "9. Availability and warranties",
            blocos: [
              "We do our best to keep NeuroTask working well, but it is provided as is: it may go down, have bugs or lose features. Keep a copy of what matters — for example, by exporting your schedule in Settings.",
            ],
          },
          {
            id: "responsabilidade",
            titulo: "10. Liability",
            blocos: [
              "To the extent the law allows, we are not liable for indirect losses from using the service, such as an appointment missed because a reminder didn't arrive. Nothing in these terms limits rights the law guarantees you, including consumer protection rights.",
            ],
          },
          {
            id: "encerramento",
            titulo: "11. Termination",
            blocos: [
              "You can delete your account at any time, in §Settings → Account → Delete my account§. We may suspend or close accounts that violate these terms.",
            ],
          },
          {
            id: "mudancas",
            titulo: "12. Changes to these terms",
            blocos: [
              "We may update these terms. Important changes will be announced in the app before they take effect, and continuing to use NeuroTask after that means you agree to the new version.",
            ],
          },
          {
            id: "lei",
            titulo: "13. Governing law",
            blocos: [
              "These terms are governed by the laws of Brazil. Any dispute will be settled in the courts of your place of residence.",
            ],
          },
        ],
      },
      {
        id: "privacidade",
        titulo: "Privacy policy",
        secoes: [
          {
            id: "controlador",
            titulo: "1. Who looks after your data",
            blocos: [
              `The person responsible for processing your data (the controller, under Brazil's LGPD) is §${RESPONSAVEL}§, who also handles requests about personal data at §${EMAIL_DE_CONTATO}§.`,
            ],
          },
          {
            id: "dados",
            titulo: "2. What data we keep",
            blocos: [
              [
                "§Account:§ name, email and password — the password stays with the sign-in provider only as a hash, never as plain text. If you sign in with Google or GitHub, we receive the name, email and photo of that account.",
                "§Profile:§ @username, photo (if you upload one), your avatar's look, your city (if you provide it) and your sharing choices.",
                "§What you create:§ tasks, lists, calendar blocks, notes, reminders, routine and activities.",
                "§Game and friends:§ XP, coins, items, friendships, invites and shared schedule links.",
                "§Notifications:§ your device's technical push address and your time zone.",
                "§Neuro AI:§ the messages and audio you send, to generate the answer. The conversation history is stored in your browser, not in our database. We count how many times you used Neuro and transcription each day, for the daily limit — only the number, never the content.",
                "§Technical:§ error logs (the message, the screen where it happened and the app version), the feedback you send, and your IP address and browser data, which the hosting and security providers process to protect the service.",
              ],
            ],
          },
          {
            id: "finalidades",
            titulo: "3. What we use it for",
            blocos: [
              [
                "To provide the service: store and show what you create, sync across devices and send reminders and notifications.",
                "To let Neuro answer and act in the app when you ask.",
                "To protect accounts and the service: sign-in, CAPTCHA, attempt limits and abuse prevention.",
                "To fix bugs and improve the app, based on error logs and feedback.",
                "To contact you about your account, such as email confirmation and password resets.",
              ],
              "We don't sell data, don't use data for advertising and don't build profiles for third parties.",
            ],
          },
          {
            id: "bases",
            titulo: "4. Legal bases",
            blocos: [
              "We process your data to perform the service you sign up for when you create the account (LGPD art. 7, V), to comply with legal obligations (art. 7, II) and, for security, error logs and improvements, on legitimate interest (art. 7, IX) — always within what you would expect from an app like this.",
            ],
          },
          {
            id: "compartilhamento",
            titulo: "5. Who we share it with",
            blocos: [
              "We use providers that process data on our behalf, each only for what it does:",
              [
                "§Supabase§ — database, sign-in, photo storage and sending account emails.",
                "§Vercel§ — website hosting and, when enabled, aggregated, cookie-free visit statistics.",
                "§Groq§ — Neuro's AI model and the transcription of microphone audio.",
                "§Microsoft§ — Neuro's voice: the text of the answers is turned into audio by a Microsoft voice service.",
                "§Cloudflare§ — the CAPTCHA on sign-in, sign-up and password reset.",
                "§Google and GitHub§ — only if you sign in with their account.",
                "§Google§ — in the live voice conversation, speech is recognized by your browser itself; in Chrome, by Google's speech service.",
                "§YouTube§ — only if you use the Focus Mode music player, which loads the video, the player and the covers straight from YouTube (through the youtube-nocookie domain, which keeps less data about viewers).",
              ],
              "Your friends only see what you allow in Settings. Other than that, we only share data when the law requires it.",
            ],
          },
          {
            id: "transferencia",
            titulo: "6. International transfers",
            blocos: [
              "Some of these providers store or process data outside Brazil, mainly in the United States. These transfers follow LGPD art. 33 and each provider's contractual safeguards.",
            ],
          },
          {
            id: "retencao",
            titulo: "7. How long we keep it",
            blocos: [
              [
                "Account data is kept for as long as the account exists.",
                "When you delete your account, we immediately erase the account, the photo and everything you created. Feedback you sent stays, without identifying you.",
                "Error logs are deleted automatically after 30 days, and the AI daily-limit counter, the next day.",
                "Providers' backups may keep data for a short period, until they are replaced.",
              ],
            ],
          },
          {
            id: "direitos",
            titulo: "8. Your rights",
            blocos: [
              "Under the LGPD (art. 18), you can: confirm whether we process your data and access it; correct incomplete or wrong data; request portability; request deletion; know who we share it with; and withdraw consent.",
              `Much of this you can do right in the app: edit your profile in Settings, and delete the account in §Settings → Account§. For the rest, write to §${EMAIL_DE_CONTATO}§ — we reply within 15 days. You can also complain to the ANPD, Brazil's National Data Protection Authority.`,
            ],
          },
          {
            id: "navegador",
            titulo: "9. Cookies and browser storage",
            blocos: [
              "We use one essential cookie, the sign-in session, without which you couldn't sign in. Your browser's storage keeps your preferences (theme, region, last sign-in method), your conversation history with Neuro, the Focus Mode state and your YouTube song list. We don't use advertising or tracking cookies.",
            ],
          },
          {
            id: "seguranca",
            titulo: "10. Security",
            blocos: [
              "Always-encrypted connection (HTTPS), passwords stored only as hashes, database rules that let each person access only their own data, CAPTCHA and attempt limits on sign-in, and secret keys kept only on the server. No system is infallible: if an incident puts your data at risk, we will notify you and the ANPD, as the law requires.",
            ],
          },
          {
            id: "menores",
            titulo: "11. Children and teenagers",
            blocos: [
              `NeuroTask is not for anyone under ${IDADE_MINIMA}. If you are the parent or guardian of a child who created an account, write to us and the account will be deleted.`,
            ],
          },
          {
            id: "alteracoes",
            titulo: "12. Changes to this policy",
            blocos: [
              "If this policy changes in an important way, we will announce it in the app. The date at the top of the page shows the last update.",
            ],
          },
        ],
      },
    ],
  },
}
