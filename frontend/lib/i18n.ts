import { REGIAO_DEFAULT, regiaoDoFormato, type Regiao } from "@/lib/regiao"
import { type TimeFormat } from "@/lib/time-format"
import { type ChaveSaudacao } from "@/lib/saudacao"
import { type ChaveFaixa } from "@/lib/nivel-faixa"
import { type Repeticao } from "@/lib/task-recurrence"
import { type TaskPriority } from "@/lib/types"
import { type ChaveCorDeNota } from "@/lib/nota-cor"
import { type VisaoDoCalendario } from "@/lib/calendario-visao"
import { type HairStyle, type Outfit, type BodyType } from "@/lib/avatar"
import { type ShopCategory, type ShopItemId } from "@/lib/shop"
import { type ChaveFundoOffice } from "@/lib/office-bg"
import { type IdPassoOnboarding } from "@/lib/onboarding"
import { type IdPergunta } from "@/lib/enquete"
import { type TextosDeErroDoFeedback, type TipoDeFeedback } from "@/lib/feedback"
import { type IdAmbiente } from "@/lib/focus-gradient"
import { type IdFaixa, type SoundCategory } from "@/hooks/use-sound-mixer"

// Tradução do app — a primeira fatia.
//
// **Por que um dicionário à mão, e não uma biblioteca.** O que as bibliotecas
// resolvem (carregar arquivo por locale, negociar idioma no servidor, plural de
// idioma eslavo) não é problema aqui: são dois idiomas, o pacote inteiro é
// pequeno e o app já é client-side. O que elas cobram em troca é caro no que
// importa — chave em string solta (`t("agenda.titulo")`), que erra em silêncio
// no dia em que alguém renomeia. Com uma interface, **falta de chave é erro de
// compilação**: o `en` só compila se tiver tudo que o `pt` tem.
//
// **Por que funções e não só strings.** Frase com nome no meio e plural não
// cabem em texto fixo, e concatenar no JSX ("Os próximos " + n + " dias") é o
// que impede a tradução de verdade: em inglês a ordem muda. Cada frase que
// varia é uma função, e cada idioma escreve a sua do jeito dele.
//
// **De onde vem o idioma.** No app, da região — que já é derivada do formato de
// hora (lib/regiao.ts explica por que não há armazenamento próprio). Na página
// pública `/agenda/<token>`, do NAVEGADOR de quem abre: quem recebe o link não
// tem conta aqui, e o idioma de quem compartilhou não diz nada sobre ele.

export type Idioma = "pt" | "en"

/** O locale para Intl/toLocaleDateString de cada idioma. */
export const LOCALE: Record<Idioma, string> = { pt: "pt-BR", en: "en-US" }

export const IDIOMA_DEFAULT: Idioma = "pt"

/** A forma do dicionário. É este contrato que faz falta de chave não compilar. */
export interface Dicionario {
  agenda: {
    /** Título da página. Sem nome quando o dono não escolheu @usuário. */
    titulo: (nome: string | null) => string
    /** "Os próximos 14 dias. O que não está marcado aqui está livre." */
    periodo: (dias: number) => string
    fuso: (zona: string) => string
    carregando: string
    hoje: string
    livreODiaTodo: string
    /** O rodapé que explica o que NÃO é compartilhado. */
    rodape: (dono: string) => string
    /** Quando o dono não tem nome público, é assim que o rodapé o chama. */
    donoAnonimo: string
  }
  /**
   * Os nomes das telas — a moldura que aparece em toda página (dock e título
   * no topo).
   *
   * O app chama o dashboard de **dois nomes**: "Dashboard" no dock e "Início"
   * no título. A tradução expôs isso; unificar seria mudar o que a tela diz, e
   * isso é decisão de produto, não de tradução. Ficam as duas chaves, e a
   * escolha continua de quem desenha.
   *
   * "Neuro IA" é nome próprio: não traduz em idioma nenhum.
   */
  /**
   * As telas de erro e o 404. Ficam fora do AppShell (menos a do app), então
   * cada uma cuida do `lang` do documento por conta.
   *
   * A `global-error` NÃO usa isto de propósito: ela substitui o `<html>` quando
   * o layout raiz quebra, e quanto menos ela carregar, maior a chance de
   * aparecer. Fica em português, com o motivo em lib/texto-solto.test.ts.
   */
  erro: {
    publico: { titulo: string; texto: string }
    app: { titulo: string; texto: string; irParaOInicio: string }
    naoEncontrada: { titulo: string; texto: string }
    tentarDeNovo: string
    voltarAoInicio: string
  }
  telas: {
    inicio: string
    /** O mesmo lugar, como o dock o chama. */
    inicioNav: string
    calendario: string
    /** No topo da tela o calendário tem nome longo; no dock, curto. */
    calendarioTitulo: string
    tarefas: string
    favoritos: string
    notas: string
    neuroIa: string
    /** Nome de recurso, não de produto: ao contrário de "Neuro IA", traduz. */
    modoFoco: string
    escritorio: string
    amigos: string
    configuracoes: string
  }
  /**
   * O que aparece em TODA tela depois de entrar: o cabeçalho, o botão de
   * feedback, o aviso de conexão, o guia de boas-vindas e a dica da barra de XP.
   *
   * Ficou de fora de todas as fatias da tradução, e é fácil ver por quê: cada
   * TELA foi traduzida, e a moldura que envolve todas elas não mora em tela
   * nenhuma — mora no AppShell e no cabeçalho. Achado varrendo o AST atrás de
   * texto solto no JSX (lib/texto-solto.test.ts).
   */
  moldura: {
    cabecalho: {
      alternarTema: string
      /** Título do botão do retrato enquanto o nome não carregou. */
      avatar: string
      /** Nome de reserva no menu, antes de o nome carregar. */
      usuario: string
      perfil: string
      sair: string
      subiuDeNivel: (nivel: number) => string
      subiuDeNivelDescricao: string
    }
    /** A regra do XP, no `title` da barra. */
    xpDica: string
    feedback: {
      enviarFeedback: string
      fechar: string
      tipos: Record<TipoDeFeedback, string>
      placeholder: string
      vaiJunto: string
      enviar: string
      obrigado: string
      /** Quando a tabela não tinha a coluna da versão e o envio foi sem ela. */
      chegouSemVersao: string
      fazDiferenca: string
      erros: TextosDeErroDoFeedback
    }
    conexao: {
      semConexao: string
      /** A metade que importa: sem ela, a tela vazia por trás parece perda de dados. */
      dadosASalvo: string
      tentarDeNovo: string
    }
    onboarding: {
      passos: Record<IdPassoOnboarding, { titulo: string; texto: string }>
      voltar: string
      pular: string
      comecar: string
      proximo: string
    }
  }
  /**
   * O Modo Foco inteiro: o overlay, o cartão "em andamento", o mixer de sons e o
   * player do YouTube. É global como a moldura — montado no AppShell, fora de
   * qualquer tela —, e pelo mesmo motivo ficou de fora das fatias por tela.
   */
  foco: {
    emAndamento: string
    dispensarAviso: string
    /** "12:30 restantes" — o tempo chega pronto, em mm:ss. */
    restantes: (tempo: string) => string
    tempoEsgotado: string
    entrarNoFoco: string
    minimizar: string
    cancelarFoco: string
    focoAtivo: string
    /** Os botões só-ícone do timer: sem rótulo, o leitor de tela lia "botão". */
    menosCinco: string
    maisCinco: string
    recomecar: string
    iniciar: string
    pausar: string
    concluirTarefa: string
    ambiente: string
    /** Selo da miniatura de ambiente que se mexe. */
    animado: string
    ambientes: Record<IdAmbiente, string>
    mixerDeSons: string
    musicaDoYoutube: string
    sons: string
    restaurar: string
    mixer: {
      secoes: Record<SoundCategory, string>
      faixas: Record<IdFaixa, string>
      ativar: (nome: string) => string
      desativar: (nome: string) => string
      volumeDe: (nome: string) => string
      arquivoNaoEncontrado: string
      volumeGeral: string
      continuarTodos: string
      pararTodos: string
      continuar: string
      parar: string
    }
    youtube: {
      placeholder: string
      tocar: string
      favoritar: string
      removerDosFavoritos: string
      remover: string
      /** Tem ênfase (§): passa por `enfatizar`. */
      ajuda: string
    }
  }
  /**
   * O que se lê ANTES de entrar: login, cadastro, redefinir senha, o erro de
   * autenticação e os botões de login social. Tudo fora do AppShell — e por isso
   * cada uma dessas telas também sincroniza o `lang` do documento sozinha.
   *
   * O idioma aqui vem da MESMA fonte do app (a região guardada neste navegador),
   * e não do navegador de quem abre. Ver ROADMAP: com o Chrome em inglês, a
   * outra regra poria o login em inglês e o app em português.
   */
  entrada: {
    email: string
    emailPlaceholder: string
    senha: string
    entrar: string
    criarConta: string
    voltarParaLogin: string
    minimoSeisCaracteres: string
    verifiqueSeuEmail: string
    muitasTentativas: string
    senhaFraca: string
    login: {
      subtitulo: string
      esqueceuSenha: string
      entrando: string
      /** Tem ênfase (§). */
      olheOSpam: string
      linkReenviado: string
      reenviarConfirmacao: string
      naoTemConta: string
      erros: { credenciaisInvalidas: string; emailNaoConfirmado: string; contaSuspensa: string; generico: string }
    }
    cadastro: {
      subtitulo: string
      nome: string
      nomePlaceholder: string
      criandoConta: string
      jaTemConta: string
      /** Tem ênfase (§) em volta do e-mail. */
      enviamosConfirmacao: (email: string) => string
      /** Tem ênfase (§). */
      naoChegou: string
      reenviadoAguarde: (segundos: number) => string
      reenviarLink: string
      erros: { emailEmUso: string; emailInvalido: string; cadastrosDesativados: string; generico: string }
    }
    senhaNova: {
      novaSenha: string
      redefinirSenha: string
      subtituloNova: string
      subtituloRedefinir: string
      confirmarNovaSenha: string
      repitaSenha: string
      salvando: string
      salvarNovaSenha: string
      enviando: string
      enviarLink: string
      lembrouSenha: string
      /** Tem ênfase (§) em volta do e-mail e das pastas. */
      seExistirConta: (email: string) => string
      /** Tem ênfase (§). */
      soOMaisRecente: string
      erros: {
        muitasTentativasMinuto: string
        naoEnviou: string
        senhasDiferentes: string
        linkExpirado: string
        senhaIgual: string
      }
    }
    erroAutenticacao: {
      titulo: string
      texto: string
      detalheTecnico: (motivo: string) => string
    }
    social: {
      ou: string
      ultimoAcesso: string
      entrarCom: (provedor: string) => string
      criarContaCom: (provedor: string) => string
      erroProvedor: (provedor: string) => string
    }
  }
  inicio: {
    /**
     * A enquete de uma pergunta. As opções casam por POSIÇÃO com as do português:
     * a resposta é gravada sempre em português (quem lê é o dono), então os dois
     * idiomas precisam ter as mesmas opções na mesma ordem — há teste.
     */
    enquete: {
      rotulo: string
      obrigado: string
      agoraNao: string
      perguntas: Record<IdPergunta, { texto: string; opcoes: string[] }>
    }
    /** "Seus números": a seção de métricas do dashboard, fechada por padrão. */
    seusNumeros: {
      titulo: string
      abas: Record<"dias" | "semana" | "hora", string>
      carregando: string
      vazio: string
      nadaConcluido: (dias: number) => string
      concluidas: (total: number, dias: number) => string
      /** O dia vem pelo ÍNDICE (0 = segunda): em português o artigo e a concordância mudam com ele. */
      apareceMais: (indice: number, feitos: number, contados: number) => string
      semPadraoSemana: string
      /** A hora chega formatada ("14h", "2 PM"); em português, "da 1h" e "das 2h". */
      rendeMais: (hora: string) => string
      semHorario: string
      /** Segunda primeiro, na mesma ordem do `indice` de lib/dashboard-metricas. */
      diasCurtos: string[]
      vezes: (feitos: number, contados: number) => string
      tarefas: (n: number) => string
      emDia: (rotulo: string) => string
      graficoLinha: (dias: number) => string
      graficoColunas: string
    }
    /** "Comece por aqui": o cartão de primeiros passos da conta nova. */
    comecePorAqui: {
      titulo: string
      descricao: string
      dispensar: string
      passos: Record<"criarTarefa" | "concluirTarefa" | "montarDia", { rotulo: string; acao: string }>
      exploreTambem: string
      planejarComIa: string
      trazerAgenda: string
      seuEscritorio: string
    }
    /** Saudação: a hora escolhe a chave (lib/saudacao), aqui vira texto. */
    saudacoes: Record<ChaveSaudacao, string>
    /** Nome do degrau de nível; a chave vem de lib/nivel-faixa. */
    faixas: Record<ChaveFaixa, string>
    nivel: (n: number, faixa: string) => string
    pendentes: (quantas: number, percentual: number) => string
    tudoEmDia: string
    metricas: { tarefas: string; concluidas: string; pendentes: string; blocosHoje: string }
    agora: string
    ate: (hora: string) => string
    depois: (titulo: string, hora: string) => string
    proximoBloco: string
    as: (hora: string) => string
    semBlocos: string
    planejarODia: string
    tarefasDeHoje: string
    semTarefasHoje: string
    autoconhecimento: string
    planejadoReal: (planejado: number, real: number) => string
    emDia: string
    aMais: (minutos: number) => string
    autoconhecimentoRodape: string
    lembretes: string
    verTodas: string
    verNoCalendario: string
    acoes: {
      calendario: { titulo: string; desc: string }
      tarefas: { titulo: string; desc: string }
      neuro: { titulo: string; desc: string }
    }
  }
  configuracoes: {
    sugestoesDaRotina: string
    perfil: {
      titulo: string
      descricao: string
      nome: string
      nomePlaceholder: string
      email: string
      salvar: string
      salvo: string
      /** O retrato: foto enviada / bonequinho do Escritório / iniciais. */
      foto: {
        retrato: string
        usandoFoto: string
        usandoBoneco: string
        usandoIniciais: string
        trocarRetrato: string
        suaFoto: string
        seuPersonagem: string
        iniciaisDoNome: string
        monteNoEscritorio: string
        escolherArquivo: string
        removerFoto: string
        erroSalvarEscolha: string
        fotoAtualizada: string
        erroEnviarFoto: string
        fotoRemovida: string
        erroRemoverFoto: string
      }
    }
    aparencia: {
      titulo: string
      descricao: string
      claro: string
      escuro: string
      sistema: string
      regiao: string
      /** Nome de cada região — a chave vem de lib/regiao. */
      regioes: Record<"BR" | "US", string>
      /** O que a região faz de fato — e a tradução mudou essa resposta. */
      regiaoAjuda: string
    }
    rotina: {
      titulo: string
      descricao: string
      sonoDesejado: string
      avisos: string
      avisosDetalhe: string
      salvar: string
      minhasAtividades: string
      atividadesAjuda: string
      adicionar: string
      nomePlaceholder: string
      excluir: string
      aceitar: string
      ignorar: string
      /**
       * As duas frases de sugestão têm trechos em negrito no meio. O `§` marca
       * o que vai em <strong> (ver `enfatizar` em lib/enfase.tsx): assim cada
       * idioma escreve a frase inteira, com a ORDEM das palavras que quiser, e
       * o negrito acompanha — em vez de a frase virar pedaços costurados no
       * JSX, que prendem a ordem do português.
       */
      sugestaoNova: (titulo: string, dias: number, categoria: string, minutos: number) => string
      sugestaoAjuste: (titulo: string, real: number, amostras: number, antes: number) => string
      toastAtualizada: string
    }
    importarExportar: {
      titulo: string
      descricao: string
      importar: string
      importarDescricao: string
      exportar: string
      exportarDescricao: string
      /** Ainda não há bloco nenhum — não é erro, é aviso. */
      nadaParaExportar: string
      toastExportado: (n: number) => string
      /** O diálogo que a opção "Importar" abre. */
      dialogo: {
        titulo: string
        escolherArquivo: string
        /** Onde achar o .ics no Google — a ênfase marca o passo final. */
        ondeAchar: string
        semEventos: string
        erroLeitura: string
        precisaLogin: string
        marcarTodos: string
        desmarcarTodos: string
        /** "12 eventos · 3 já existe(m) · selecione o que criar" */
        resumo: (total: number, duplicados: number) => string
        jaExiste: string
        diaInteiro: string
        /**
         * O chip de repetição do evento importado. Diário e semanal saem do
         * vocabulário da TAREFA, que é o mesmo; só "dias úteis" nasce aqui,
         * porque o rótulo do bloco ("Dias úteis (seg–sex)") é de opção de
         * menu e não cabe num chip de 10px.
         */
        repeticaoDiasUteis: string
        cancelar: string
        importar: string
        importarN: (n: number) => string
        toastImportado: (n: number) => string
      }
    }
    assinar: {
      titulo: string
      descricao: string
      explicacao: string
      carregando: string
      copiar: string
      gerar: string
      gerarNovo: string
      /** Onde colar o link no Google — a ênfase marca o caminho do menu. */
      ondeColar: string
      toastPronto: string
      toastCopiado: string
      erroCopiar: string
      /** Falhas de banco. Dizem QUAL arquivo rodar — é o que resolve. */
      erroSemTabela: string
      erroCacheSchema: string
      erroPermissao: string
    }
    compartilharAgenda: { titulo: string; descricao: string }
    notificacoes: {
      titulo: string
      descricao: string
      nesteDispositivo: string
      suportado: string
      naoSuportado: string
      toastDesativadas: string
      toastAtivadas: string
      toastAtivadasDetalhe: string
      erroAtivar: string
    }
    telegram: {
      titulo: string
      descricao: string
      mandeParaOBot: string
      expiraEm: (mm: string) => string
      gerarCodigo: string
      conversasConectadas: string
      conversaSemNome: string
      ultimaMensagem: (data: string) => string
      semMensagens: string
      ajudaComandos: string
      erroGerar: string
      tenteNovamente: string
    }
    conta: { titulo: string; sair: string }
  }
  compartilhar: {
    explicacao: string
    mostrarProximos: string
    dias: (n: number) => string
    copiar: string
    criarLink: string
    gerarNovo: string
    desativar: string
    carregando: string
    toastCriado: string
    toastCopiado: string
    toastDesativado: string
    erroCopiar: string
    /** Falhas de banco. Dizem QUAL arquivo rodar — é o que resolve. */
    erroSemTabela: string
    erroCacheSchema: string
    erroPermissao: string
  }
  tarefas: {
    nova: string
    criar: string
    salvar: string
    cancelar: string
    vazio: string
    /** As listas: a de sempre, as criadas, e o balaio de órfãs. */
    listaGeral: string
    listaOutras: string
    novaLista: string
    nomeDaLista: string
    excluirLista: string
    /** O filtro por data, no alto da lista. */
    escopos: { hoje: string; proximos: string; todos: string }
    vazioHoje: string
    vazioProximos: string
    vazioTodos: string
    concluidas: (n: number) => string
    erroSemTabelaListas: string
    erroExcluir: string
    erroRepeticao: string
    toastRecorrente: string
    toastRecorrenteDetalhe: (data: string) => string
    toastSemXp: string
    toastSemXpDetalhe: (minutos: number) => string
    /**
     * "Repete: diariamente" — a minúscula no meio da frase é decisão de CADA
     * idioma, não do código que chama. Em português e inglês o rótulo desce
     * para minúscula; em alemão, onde substantivo é maiúsculo, quem escrever o
     * `de` simplesmente não faz isso.
     */
    toastRepete: (rotulo: string) => string
    toastNaoRepete: string
    /** Os nomes das repetições. A chave vem de lib/task-recurrence. */
    repeticao: {
      naoRepete: string
      diariamente: string
      semanalmente: string
      mensalmente: string
      anualmente: string
      aCadaNDias: (dias: number) => string
      /** A opção do menu, quando ainda não há número escolhido. */
      aCadaNDiasVazio: string
    }
    prioridades: Record<TaskPriority, string>
    cartao: {
      concluir: string
      marcarPendente: string
      favoritar: string
      desfavoritar: string
      editar: string
      excluir: string
      repetir: string
      atrasada: string
      faltamMinutos: (n: number) => string
      faltamHoras: (n: number) => string
      faltamDias: (n: number) => string
      entrar: string
      copiarLinkReuniao: string
      toastLinkReuniao: string
      emAndamento: string
      iniciar: string
    }
    dialogo: {
      editarTitulo: string
      novaTitulo: string
      tituloPlaceholder: string
      descricaoPlaceholder: string
      prioridade: string
      tempoEstimado: string
      personalizarTempo: string
      vencimento: string
      semData: string
      hoje: string
      amanha: string
      emNDias: (n: number) => string
      emXDias: string
      data: string
      reuniao: string
      opcional: string
      linkPlaceholder: string
      copiarLink: string
      toastLinkCopiado: string
      horario: string
      horarioDoCompromisso: string
      escolher: string
      limpar: string
      semDataVale: (hora: string) => string
      localPlaceholder: string
      adicionarLocal: string
      repetir: string
      personalizado: string
      aCadaNDias: (dias: number) => string
      avancaSozinho: string
      precisaLogin: string
    }
  }
  favoritos: {
    vazio: string
    tarefas: (n: number) => string
    notas: (n: number) => string
    verTodas: string
    remover: string
    notaSemTitulo: string
    notaVazia: string
  }
  notas: {
    nova: string
    /**
     * "Nenhuma nota ainda. Clique em §Nova nota§ para começar a escrever."
     *
     * O `§` marca o negrito (ver lib/enfase.tsx). Era `<b>Nova nota</b>` no meio
     * do JSX — e é justamente o corte que prende a ordem das palavras do
     * português: em inglês o nome do botão não cai no mesmo lugar da frase.
     */
    vazio: string
    semTitulo: string
    vazia: string
    tituloPlaceholder: string
    escrevaAqui: string
    selecione: string
    salvando: string
    salvo: string
    favoritar: string
    desfavoritar: string
    excluir: string
    corDaNota: string
    semCor: string
    /** O nome de cada cor. A chave vem de lib/nota-cor. */
    cores: Record<ChaveCorDeNota, string>
    erroSemColunaCor: string
    erroSalvarCor: string
    editor: {
      desfazer: string
      refazer: string
      negrito: string
      italico: string
      sublinhado: string
      /**
       * As três letras do tamanho — P/M/G em português, S/M/L em inglês. É o
       * mesmo caso das iniciais dos dias da semana: letra solta que parece
       * neutra e não é.
       */
      tamanhos: { pequeno: string; medio: string; grande: string }
      tamanhoDica: (letra: string) => string
      titulo: string
      lista: string
      listaNumerada: string
      cores: string
      corDoTexto: string
      fundoMarcaTexto: string
      corPadrao: string
      semFundo: string
      /** As cores do texto e do marca-texto — as duas paletas usam estes nomes. */
      paleta: {
        vermelho: string
        laranja: string
        amarelo: string
        verde: string
        azul: string
        roxo: string
        rosa: string
      }
      imagem: string
      diminuir: string
      aumentar: string
      concluir: string
    }
  }
  /**
   * O calendário: barra de ferramentas, grade, painel do dia e o diálogo de
   * bloco de tempo.
   */
  calendario: {
    novoBloco: string
    hoje: string
    /** Os nomes das quatro visões, na ordem em que aparecem. */
    visoes: Record<VisaoDoCalendario, string>
    /** As sete iniciais no alto da grade — "DOM…SÁB" / "SUN…SAT". */
    diasDaSemana: readonly string[]
    dispensarAviso: string
    abrirODia: string
    /** "+2 mais" no dia cheio da visão de mês. */
    maisN: (n: number) => string
    recolherPainel: string
    expandirPainel: string
    painelContextual: string
    /**
     * Os avisos do calendário (lib/calendar-warnings decide qual e com quais
     * valores; a frase é daqui).
     */
    avisos: {
      telaAntesDeDormir: (titulo: string, horaDeDormir: string) => string
      sonoCurto: (inicio: string, fim: string, horas: string, desejadas: string) => string
      vaoAntesDoSono: (
        titulo: string, fim: string, tituloSeguinte: string, inicio: string,
        horas: string, desejadas: string
      ) => string
      /** "2,5h" em português, "2.5h" em inglês — a vírgula decimal não viaja. */
      horas: (h: number) => string
    }
    notas: {
      titulo: string
      salvando: string
      salvo: string
      /** O que se escreve para a IA ler depois. */
      placeholder: string
    }
    lembretes: {
      titulo: string
      adicionar: string
      placeholder: string
      definirHorario: string
      horarioNotificacao: string
      remover: string
      vazio: string
    }
    bloco: {
      novoTitulo: string
      editarTitulo: string
      novoSubtitulo: string
      editarSubtitulo: string
      titulo: string
      tituloPlaceholder: string
      descricao: string
      descricaoPlaceholder: string
      inicio: string
      fim: string
      horarioDeInicio: string
      horarioDeFim: string
      data: string
      cor: string
      vincularTarefa: string
      nenhumaTarefa: string
      vincularAjuda: string
      repetir: string
      /**
       * A repetição de BLOCO. Ela reaproveita as chaves da tarefa onde as duas
       * coincidem e acrescenta a que só existe aqui — ver o comentário em
       * components/time-block-dialog sobre por que as listas não viram uma só.
       */
      diasUteis: string
      excluir: string
      excluirAtalho: string
      cancelar: string
      salvar: string
      criar: string
      salvando: string
      precisaLogin: string
    }
  }
  /**
   * Amigos. Entra por fatias — esta é a do diálogo de convite; a lista e o
   * perfil vêm depois.
   */
  amigos: {
    /**
     * O que Amigos e os convites respondem quando não dá certo. `lib/friends.ts`
     * devolve o motivo como id e `explicaFalha` escolhe aqui.
     *
     * `generico` só aparece se o banco falhar sem mensagem nenhuma — quando ele
     * manda uma, é ela que aparece, porque a mensagem crua diz mais.
     */
    erros: {
      precisaLogin: string
      usuarioCurto: string
      usuarioEmUso: string
      jaSaoAmigos: string
      voceMesmo: string
      usuarioInexistente: string
      naoSaoAmigos: string
      agendaPrivada: string
      escritorioPrivado: string
      conviteInvalido: string
      conviteInexistente: string
      generico: string
    }
    /**
     * A dica no rodapé da tela. Tem ênfase (§). Cita os rótulos que a pessoa vê
     * nos botões — em inglês o chip se chama "Schedule", não "Agenda".
     */
    dica: string
    /** Os cinco interruptores de privacidade, no alto da seção. */
    privacidade: {
      ocupadoLivre: string
      escritorio: string
      nivel: string
      agenda: string
      perfilAberto: string
      /** "Amigos veem: Nível" — ou "Amigos NÃO veem: Nível". */
      dica: (veem: boolean, oQue: string) => string
    }
    /** O cartão que aparece antes de a pessoa ter um @. */
    escolherUsuario: {
      titulo: string
      ajuda: string
      placeholder: string
      criar: string
      toastPronto: (usuario: string) => string
    }
    buscaPlaceholder: string
    regiaoPlaceholder: string
    toastRegiaoSalva: string
    toastRegiaoRemovida: string
    sugeridos: string
    mesmaRegiao: string
    adicionar: string
    toastPedidoEnviado: (usuario: string) => string
    /** Quando o outro já havia pedido: o pedido vira amizade na hora. */
    toastAgoraAmigos: string
    pedidos: string
    aceitar: string
    recusar: string
    toastAmizadeAceita: (usuario: string) => string
    /** Estado do amigo na lista. `privado` é quem não compartilha. */
    ocupado: string
    livre: string
    privado: string
    verAgenda: string
    convidar: string
    visitar: string
    desfazer: string
    cancelarPedido: string
    vazio: string
    convitesRecebidos: {
      titulo: string
      /** "de @ana" / "para @ana" — quem convidou quem. */
      de: string
      para: string
      online: string
      aguardando: string
      cancelar: string
      toastConfirmado: string
    }
    agendaDoDia: {
      /** "Hoje, Ana está…" */
      titulo: (nome: string) => string
      /**
       * A agenda pública tem a própria frase de dia livre: lá é rótulo de
       * linha, aqui é comemoração. Mesma ideia, registros diferentes.
       */
      livreODiaTodo: string
      ocupado: string
      aviso: string
      convidarLivre: string
    }
    visita: {
      titulo: (nome: string) => string
      /** "Lvl 7" — abreviação que não se traduz, como "Dashboard". */
      nivel: (n: number) => string
      itens: (n: number) => string
      carregando3d: string
    }
    convite: {
      /** "Convidar Ana" — ou "Convidar @ana", quando não há nome público. */
      titulo: (nome: string) => string
      tituloPlaceholder: string
      /**
       * "Das 14:00 às 15:00". São duas chaves porque em inglês a construção é
       * outra ("From … to") — juntar viraria concatenação no JSX, que é
       * exatamente o que trava a ordem das palavras.
       */
      das: string
      as: string
      sugerir: string
      /** Sem janela comum: o número é a duração escolhida nos campos. */
      semJanela: (minutos: number) => string
      linkPlaceholder: string
      localPlaceholder: string
      aviso: string
      cancelar: string
      enviar: string
      toastEnviado: (usuario: string) => string
    }
  }
  /**
   * Neuro IA — chat, atalhos da tela vazia e conversa por voz.
   *
   * O que a PRÓPRIA IA escreve (as respostas do modelo) fica de fora de
   * propósito: aquilo é conteúdo dinâmico, não interface, e hoje sai sempre em
   * português — o system prompt da rota não é bilíngue. Aqui só entra o que é
   * texto fixo do app: rótulos, erros de rede/microfone e o estado da conversa.
   */
  ia: {
    /** Sinal de limite gratuito da IA, sem jargão técnico. */
    limiteAtingido: string
    /** Mesmo sinal, versão curta e falável — para a conversa ao vivo. */
    limiteAtingidoVoz: string
    novaConversa: string
    conversas: string
    desafixar: string
    fixar: string
    excluir: string
    saudacao: string
    subtitulo: string
    leuAnotacoes: string
    placeholder: string
    pararGravacao: string
    gravarAudio: string
    enviar: string
    conversarPorVoz: string
    gravando: string
    transcrevendo: string
    erroResposta: string
    erroConexao: string
    erroTranscricao: string
    erroTranscricaoGenerica: string
    erroMicrofone: string
    /** As quatro sugestões da tela vazia, antes de a pessoa editar as suas. */
    atalhosPadrao: string[]
    atalhoPlaceholder: string
    removerAtalho: string
    adicionar: string
    restaurarPadrao: string
    concluir: string
    editarAtalhos: string
    criarAtalho: string
    respostaFallback: string
    erroConexaoVoz: string
    naoOuvi: string
    gravandoToqueEnviar: string
    permissaoMicNegada: string
    statusDescansando: string
    statusOuvindo: string
    statusPensando: string
    statusFalando: string
    statusToqueParaFalar: string
    encerrarConversa: string
    /** Ênfase marcada por `§` (ver lib/enfase.tsx) em volta de "Chrome"/"Edge". */
    semSuporteVoz: string
    acordarPlano: string
    emBreve: string
    tentarDeNovo: string
    sim: string
    nao: string
    enviarFalado: string
    tocarParaFalar: string
    podeFalarAVontade: string
    toqueMicUseFones: string
  }
  /** O Escritório 3D: a cena não tem texto nenhum (é canvas puro) — o que
   *  falava era a tela, o editor de avatar e a loja. */
  escritorio: {
    /** Quando o navegador não tem WebGL: a sala não desenha, o resto da tela funciona. */
    semWebgl: { titulo: string; texto: string }
    editarAvatar: string
    carregando3d: string
    salvarCompartilharImagem: string
    abraParaGerarImagem: string
    /** Título que o Web Share nativo do celular mostra ao compartilhar a imagem. */
    tituloCompartilhamento: string
    imagemBaixada: string
    imagemCompartilhada: string
    erroGerarImagem: string
    /** "Seu cantinho começa simples…" — sem nenhum item comprado ainda. */
    vazio: string
    /** "3 itens conquistados" — singular e plural são frases diferentes em inglês. */
    itensConquistados: (n: number) => string
    corDeFundo: string
    corPersonalizada: string
    fundoCorPersonalizadaAria: string
    fundoAria: (nome: string) => string
    /** Nome de cada preset, pela CHAVE de `lib/office-bg.ts`. */
    fundoNomes: Record<ChaveFundoOffice, string>
    avatarEditor: {
      corpo: string
      cabelo: string
      pele: string
      roupa: string
      calca: string
      ternoAvisoCalca: string
      /** "Fones ligados"/"desligados" — o botão que liga o acessório do avatar. */
      fones: (ligado: boolean) => string
      cancelar: string
      salvar: string
      /** Nome de cada corte, pela CHAVE de `lib/avatar.ts` — módulo puro não fala idioma. */
      cabeloEstilos: Record<HairStyle, string>
      roupas: Record<Outfit, string>
      corpoTipos: Record<BodyType, string>
    }
    loja: {
      titulo: string
      /** Nome de cada categoria, pela CHAVE de `lib/shop.ts`. */
      categorias: Record<ShopCategory, string>
      /** "Prévia · Sofá" — ao passar o mouse num item da loja. */
      previa: (nome: string) => string
      noEscritorio: string
      guardado: string
      guardar: string
      equipar: string
      comprar: string
      moedasInsuficientes: string
      /** "🛋️ Sofá é seu! Já está no escritório." */
      itemComprado: (emoji: string, nome: string) => string
      avatarAtualizado: string
      /** Nome e descrição de cada item, pela CHAVE de `lib/shop.ts` (ShopItemId).
       *  Sendo união e não `string`, item novo sem entrada aqui não compila. */
      itens: Record<ShopItemId, { nome: string; desc: string }>
      erros: {
        saldoInsuficiente: string
        jaComprado: string
        /** O nome do .sql que falta rodar entra no meio da frase. */
        itemInexistente: (arquivo: string) => string
      }
    }
  }
}

export const pt: Dicionario = {
  calendario: {
    novoBloco: "Novo bloco",
    hoje: "Hoje",
    visoes: { dia: "dia", semana: "semana", mes: "mês", ano: "ano" },
    diasDaSemana: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
    dispensarAviso: "Dispensar aviso",
    abrirODia: "Abrir o dia",
    maisN: (n) => `+${n} mais`,
    recolherPainel: "Recolher painel",
    expandirPainel: "Expandir painel",
    painelContextual: "Painel contextual",
    avisos: {
      telaAntesDeDormir: (titulo, horaDeDormir) =>
        `"${titulo}" termina pouco antes de dormir (${horaDeDormir}). Telas perto do sono atrapalham o descanso — que tal encerrar mais cedo?`,
      sonoCurto: (inicio, fim, horas, desejadas) =>
        `Seu bloco de sono (${inicio}–${fim}) tem só ${horas} — abaixo das ${desejadas} que você quer dormir.`,
      vaoAntesDoSono: (titulo, fim, tituloSeguinte, inicio, horas, desejadas) =>
        `Entre "${titulo}" (até ${fim}) e "${tituloSeguinte}" (às ${inicio}) sobram só ${horas} — menos que suas ${desejadas} de sono.`,
      horas: (h) => `${String(Math.round(h * 10) / 10).replace(".", ",")}h`,
    },
    notas: {
      titulo: "Anotações do dia",
      salvando: "Salvando…",
      salvo: "Salvo",
      placeholder: "Para interpretação por IA: Reflexões de hoje... Como tem sido seu foco? Alguma ideia solta?",
    },
    lembretes: {
      titulo: "Lembretes do dia",
      adicionar: "Adicionar lembrete",
      placeholder: "Adicionar lembrete...",
      definirHorario: "Definir horário",
      horarioNotificacao: "Horário (notificação)",
      remover: "Remover lembrete",
      vazio: "Nenhum lembrete por enquanto.",
    },
    bloco: {
      novoTitulo: "Novo bloco de tempo",
      editarTitulo: "Editar bloco",
      novoSubtitulo: "Agende um novo bloco de foco",
      editarSubtitulo: "Atualize os detalhes do bloco",
      titulo: "Título",
      tituloPlaceholder: "Ex: Foco em desenvolvimento",
      descricao: "Descrição",
      descricaoPlaceholder: "Detalhes opcionais...",
      inicio: "Início",
      fim: "Fim",
      horarioDeInicio: "Horário de início",
      horarioDeFim: "Horário de fim",
      data: "Data",
      cor: "Cor",
      vincularTarefa: "Vincular tarefa",
      nenhumaTarefa: "Nenhuma",
      vincularAjuda: "Liga este bloco a uma tarefa da sua lista — o bloco vira o horário de fazê-la.",
      repetir: "Repetir",
      diasUteis: "Dias úteis (seg–sex)",
      excluir: "Excluir bloco",
      excluirAtalho: "Excluir bloco (Backspace)",
      cancelar: "Cancelar",
      salvar: "Salvar",
      criar: "Criar bloco",
      salvando: "Salvando...",
      precisaLogin: "Você precisa estar logado",
    },
  },
  agenda: {
    titulo: (nome) => (nome ? `Horários ocupados de ${nome}` : "Horários ocupados"),
    periodo: (dias) =>
      `Os próximos ${dias} ${dias === 1 ? "dia" : "dias"}. O que não está marcado aqui está livre.`,
    fuso: (zona) => `Horários no fuso ${zona}.`,
    carregando: "Carregando a agenda…",
    hoje: "hoje",
    livreODiaTodo: "Livre o dia todo",
    rodape: (dono) =>
      `${dono} compartilhou só os horários. O que ocupa cada faixa — título, local ou com quem — nunca sai do app.`,
    donoAnonimo: "Esta pessoa",
  },
  erro: {
    publico: {
      titulo: "Algo deu errado",
      texto: "O erro é nosso, não seu. Tentar de novo costuma resolver.",
    },
    app: {
      titulo: "Essa parte quebrou",
      texto:
        "O erro é nosso, não seu — e o resto do app continua funcionando. Tente de novo; se persistir, me conte o que você estava fazendo aqui.",
      irParaOInicio: "Ir para o início",
    },
    naoEncontrada: {
      titulo: "Página não encontrada",
      texto: "O endereço que você tentou acessar não existe ou foi movido.",
    },
    tentarDeNovo: "Tentar de novo",
    voltarAoInicio: "Voltar ao início",
  },
  telas: {
    inicio: "Início",
    inicioNav: "Dashboard",
    calendario: "Calendário",
    calendarioTitulo: "Meu Dia · Time Blocking",
    tarefas: "Tarefas",
    favoritos: "Favoritos",
    notas: "Notas",
    neuroIa: "Neuro IA",
    modoFoco: "Modo Foco",
    escritorio: "Escritório",
    amigos: "Amigos",
    configuracoes: "Configurações",
  },
  moldura: {
    cabecalho: {
      alternarTema: "Alternar tema",
      avatar: "Avatar",
      usuario: "Usuário",
      perfil: "Perfil",
      sair: "Sair",
      subiuDeNivel: (nivel) => `Subiu para o nível ${nivel}! 🎉`,
      subiuDeNivelDescricao: "Continue assim, você está mandando bem.",
    },
    xpDica:
      "Conclua tarefas para ganhar XP — Baixa +5 · Média +10 · Alta +20 · Urgente +30. A cada 100 XP você sobe de nível! Regras: tarefas criadas há menos de 10 min não geram XP; sem prazo e sem duração vale metade; máximo de 150 XP por dia.",
    feedback: {
      enviarFeedback: "Enviar feedback",
      fechar: "Fechar",
      tipos: { bug: "Problema", ideia: "Ideia", geral: "Outro" },
      placeholder: "O que funcionou, o que quebrou, o que faltou…",
      vaiJunto: "Vai junto: a tela atual e a versão do app.",
      enviar: "Enviar",
      obrigado: "Valeu pelo feedback! 🙏",
      chegouSemVersao: "Chegou aqui. (Sem o contexto da versão — rode supabase/feedback.sql.)",
      fazDiferenca: "Faz muita diferença pra melhorar o app.",
      erros: {
        tabelaAusente: "A tabela de feedback ainda não existe. Rode supabase/feedback.sql no Supabase.",
        cacheDoSchema:
          "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e tente de novo.",
        colunaFaltando:
          "A tabela de feedback está sem uma coluna que o app usa. Rode supabase/feedback.sql de novo — ele acrescenta o que falta sem apagar nada.",
        semPermissao:
          "Sem permissão para gravar (RLS). Confira se você está logado e se a policy de insert do feedback.sql foi criada.",
        checkAntigo:
          "O banco está recusando o tipo do feedback — é um CHECK antigo na coluna kind, de uma versão anterior da tabela. Rode supabase/feedback.sql de novo: ele derruba o constraint velho e recria o certo. Sua mensagem continua aqui.",
        generico: "Não deu para enviar agora. Tente de novo em instantes.",
      },
    },
    conexao: {
      semConexao: "Sem conexão com o servidor.",
      dadosASalvo: "Seus dados estão a salvo.",
      tentarDeNovo: "Tentar de novo",
    },
    onboarding: {
      passos: {
        "bem-vindo": {
          titulo: "Bem-vindo ao NeuroTask",
          texto:
            "Não é mais um calendário que você esquece e abandona. É um copiloto da sua rotina: ele planeja o dia com você e acompanha de verdade.",
        },
        tarefas: {
          titulo: "Comece pelas tarefas",
          texto:
            "Anote o que precisa fazer. O app prioriza, cuida dos prazos e te dá XP a cada conclusão — o progresso vira jogo, com propósito.",
        },
        calendario: {
          titulo: "Bloqueie o seu tempo",
          texto:
            "No calendário você reserva horários para cada coisa. Uma tarefa com hora marcada já vira um bloco no dia, sem trabalho dobrado.",
        },
        "neuro-ia": {
          titulo: "A Neuro IA organiza com você",
          texto:
            "Peça para montar o dia, criar tarefas ou entrar em foco. Ela propõe e você confirma — nunca age por conta própria nem inventa dados.",
        },
      },
      voltar: "Voltar",
      pular: "Pular",
      comecar: "Começar",
      proximo: "Próximo",
    },
  },
  foco: {
    emAndamento: "Em andamento",
    dispensarAviso: "Dispensar o aviso",
    restantes: (tempo) => `${tempo} restantes`,
    tempoEsgotado: "Tempo estimado esgotado",
    entrarNoFoco: "Entrar no foco",
    minimizar: "Minimizar",
    cancelarFoco: "Cancelar foco",
    focoAtivo: "Foco ativo",
    menosCinco: "Menos 5 minutos",
    maisCinco: "Mais 5 minutos",
    recomecar: "Recomeçar",
    iniciar: "Iniciar",
    pausar: "Pausar",
    concluirTarefa: "Concluir tarefa",
    ambiente: "Ambiente",
    animado: "animado",
    ambientes: {
      transparent: "Transparente",
      black: "Preto",
      gray: "Cinza",
      light: "Papel",
      white: "Branco",
      clock: "Relógio",
      aurora: "Aurora",
      brasa: "Brasa",
      mare: "Maré",
      algodao: "Algodão",
    },
    mixerDeSons: "Mixer de sons",
    musicaDoYoutube: "Música do YouTube",
    sons: "Sons",
    restaurar: "Restaurar modo foco",
    mixer: {
      secoes: { ambient: "Sons", music: "Músicas", noise: "Foco" },
      faixas: {
        rain: "Chuva",
        cafe: "Cafeteria",
        forest: "Floresta",
        waves: "Ondas do mar",
        fire: "Fogueira",
        birds: "Pássaros",
        stream: "Riacho",
        snow: "Neve",
        train: "Trem",
        flight: "Voo",
        library: "Biblioteca",
        space: "Espaço",
        "classical-piano": "Clássica · Piano",
        "classical-piano2": "Clássica · Piano 2",
        "classical-orchestral": "Clássica · Orquestra",
        "dark-ambience": "Dark ambient",
        "dungeon-synth": "Dungeon synth",
        lofi: "Lo-fi",
        lofi2: "Lo-fi 2",
        chillhop: "Chillhop",
        study: "Concentração",
        study2: "Fluxo",
        "study-music": "Imersão",
        binaural: "Binaural",
        brown: "Ruído marrom",
      },
      ativar: (nome) => `Ativar ${nome}`,
      desativar: (nome) => `Desativar ${nome}`,
      volumeDe: (nome) => `Volume de ${nome}`,
      arquivoNaoEncontrado: "Arquivo não encontrado",
      volumeGeral: "Volume geral",
      continuarTodos: "Continuar todos os sons",
      pararTodos: "Parar todos os sons",
      continuar: "Continuar",
      parar: "Parar",
    },
    youtube: {
      placeholder: "Cole o link do YouTube (vídeo ou live)…",
      tocar: "Tocar",
      favoritar: "Favoritar este link",
      removerDosFavoritos: "Remover dos favoritos",
      remover: "Remover",
      ajuda:
        "Cole um link, dê §Tocar§ e clique na §★§ pra favoritar. O áudio continua enquanto você trabalha — é só deixar o Foco §minimizado§.",
    },
  },
  entrada: {
    email: "Email",
    emailPlaceholder: "seu@email.com",
    senha: "Senha",
    entrar: "Entrar",
    criarConta: "Criar conta",
    voltarParaLogin: "Voltar para o login",
    minimoSeisCaracteres: "Mínimo 6 caracteres",
    verifiqueSeuEmail: "Verifique seu email",
    muitasTentativas: "Muitas tentativas. Aguarde um momento e tente de novo.",
    senhaFraca: "Senha muito fraca. Use ao menos 6 caracteres.",
    login: {
      subtitulo: "Gerencie suas tarefas com inteligência",
      esqueceuSenha: "Esqueceu a senha?",
      entrando: "Entrando...",
      olheOSpam: "Olhe também o §spam§ e as abas §Promoções/Atualizações§ (Gmail) ou §Outros§ (Outlook).",
      linkReenviado: "Link reenviado! ✓",
      reenviarConfirmacao: "Reenviar link de confirmação",
      naoTemConta: "Não tem uma conta?",
      erros: {
        credenciaisInvalidas: "Email ou senha incorretos.",
        emailNaoConfirmado: "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
        contaSuspensa: "Esta conta está suspensa.",
        generico: "Não foi possível entrar. Tente novamente.",
      },
    },
    cadastro: {
      subtitulo: "Comece a organizar suas tarefas hoje",
      nome: "Nome",
      nomePlaceholder: "Seu nome",
      criandoConta: "Criando conta...",
      jaTemConta: "Já tem uma conta?",
      enviamosConfirmacao: (email) =>
        `Enviamos um link de confirmação para §${email}§. Clique no link para ativar sua conta.`,
      naoChegou: "Não chegou? Olhe o §spam§ e as abas §Promoções/Atualizações§ (Gmail) ou §Outros§ (Outlook) —",
      reenviadoAguarde: (segundos) => `reenviado ✓ (aguarde ${segundos}s para reenviar de novo)`,
      reenviarLink: "reenviar link",
      erros: {
        emailEmUso: "Este email já está em uso. Tente fazer login.",
        emailInvalido: "Email inválido. Verifique e tente novamente.",
        cadastrosDesativados: "Os cadastros estão temporariamente desativados.",
        generico: "Não foi possível criar a conta. Tente novamente.",
      },
    },
    senhaNova: {
      novaSenha: "Nova senha",
      redefinirSenha: "Redefinir senha",
      subtituloNova: "Escolha a nova senha da sua conta",
      subtituloRedefinir: "Enviaremos um link de redefinição para o seu e-mail",
      confirmarNovaSenha: "Confirmar nova senha",
      repitaSenha: "Repita a senha",
      salvando: "Salvando...",
      salvarNovaSenha: "Salvar nova senha",
      enviando: "Enviando...",
      enviarLink: "Enviar link de redefinição",
      lembrouSenha: "Lembrou a senha?",
      seExistirConta: (email) =>
        `Se existir uma conta para §${email}§, enviamos um link para redefinir a senha. Olhe também o §spam§ e as abas §Promoções/Atualizações§ (Gmail) ou §Outros§ (Outlook).`,
      soOMaisRecente: "⚠️ Se pediu mais de uma vez, §só o e-mail mais recente§ funciona.",
      erros: {
        muitasTentativasMinuto: "Muitas tentativas. Aguarde um minuto e tente de novo.",
        naoEnviou: "Não foi possível enviar o link. Tente novamente.",
        senhasDiferentes: "As senhas não coincidem.",
        linkExpirado: "Este link já foi usado ou expirou. Peça um novo abaixo.",
        senhaIgual: "A nova senha precisa ser diferente da atual.",
      },
    },
    erroAutenticacao: {
      titulo: "Erro de autenticação",
      texto: "Ocorreu um erro durante o processo de autenticação. Por favor, tente novamente.",
      detalheTecnico: (motivo) => `Detalhe técnico: ${motivo}`,
    },
    social: {
      ou: "ou",
      ultimoAcesso: "último acesso",
      entrarCom: (provedor) => `Entrar com ${provedor}`,
      criarContaCom: (provedor) => `Criar conta com ${provedor}`,
      erroProvedor: (provedor) => `Não deu para entrar com ${provedor}. Tente pelo email.`,
    },
  },
  inicio: {
    enquete: {
      rotulo: "Enquete rápida",
      obrigado: "Obrigado! Isso ajuda mais do que parece.",
      agoraNao: "Agora não",
      perguntas: {
        "por-que-abriu": {
          texto: "O que te fez abrir o NeuroTask hoje?",
          opcoes: ["Ver o que eu tinha para fazer", "Anotar algo novo", "Um lembrete me chamou", "Curiosidade"],
        },
        "faria-falta": {
          texto: "Se o app sumisse amanhã, o que faria falta?",
          opcoes: ["As tarefas e o calendário", "A Neuro IA", "O Escritório e o nível", "Nada ainda"],
        },
        atrapalhou: {
          texto: "O que mais te atrapalhou até agora?",
          opcoes: ["Achar as coisas", "Ficou lento ou travou", "Não entendi o que fazer", "Nada me atrapalhou"],
        },
        "seus-numeros": {
          texto: "“Seus números”, no início, te contou algo que você não sabia?",
          opcoes: ["Sim, me surpreendeu", "Interessante, mas não mudei nada", "Nunca abri"],
        },
      },
    },
    seusNumeros: {
      titulo: "Seus números",
      abas: { dias: "Por dia", semana: "Constância", hora: "Melhor hora" },
      carregando: "Carregando…",
      vazio: "Conclua algumas tarefas e os números aparecem aqui.",
      nadaConcluido: (dias) => `Nada concluído nos últimos ${dias} dias.`,
      concluidas: (total, dias) =>
        `${total} ${total === 1 ? "tarefa concluída" : "tarefas concluídas"} nos últimos ${dias} dias.`,
      apareceMais: (indice, feitos, contados) => {
        // Sábado e domingo são masculinos: "no sábado — 3 dos últimos 4". A frase
        // antiga tinha "na" e "das últimas" fixos, e dizia "na sábado".
        const masculino = indice >= 5
        const dia = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"][indice] ?? ""
        return `Você aparece mais ${masculino ? "no" : "na"} ${dia} — ${feitos} ${masculino ? "dos últimos" : "das últimas"} ${contados}.`
      },
      semPadraoSemana: "Ainda não dá para ver um padrão na semana.",
      // "da 1h", "da 0h", "das 10h": o singular é quando o número mostrado é 0 ou 1.
      rendeMais: (hora) => `Você rende mais por volta ${/^[01](?!\d)/.test(hora) ? "da" : "das"} ${hora}.`,
      semHorario: "Ainda não dá para ver um horário preferido.",
      diasCurtos: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      vezes: (feitos, contados) => `${feitos} de ${contados} ${contados === 1 ? "vez" : "vezes"}`,
      tarefas: (n) => `${n} ${n === 1 ? "tarefa" : "tarefas"}`,
      emDia: (rotulo) => ` em ${rotulo}`,
      graficoLinha: (dias) => `Tarefas concluídas por dia nos últimos ${dias} dias`,
      graficoColunas: "Gráfico de colunas",
    },
    comecePorAqui: {
      titulo: "Comece por aqui",
      descricao:
        "O NeuroTask não é um calendário passivo — é um copiloto de rotina. Em 3 passos ele já começa a trabalhar pra você.",
      dispensar: "Dispensar",
      passos: {
        criarTarefa: { rotulo: "Crie sua primeira tarefa", acao: "Criar tarefa" },
        concluirTarefa: { rotulo: "Conclua uma tarefa — você ganha XP e moedas pro Escritório", acao: "Ver tarefas" },
        montarDia: { rotulo: "Monte seu dia no calendário (ou importe algum!)", acao: "Abrir calendário" },
      },
      exploreTambem: "Explore também:",
      planejarComIa: "Planejar o dia com a IA",
      trazerAgenda: "Trazer minha agenda",
      seuEscritorio: "Seu Escritório",
    },
    saudacoes: { ola: "Olá", bomDia: "Bom dia", boaTarde: "Boa tarde", boaNoite: "Boa noite" },
    faixas: {
      comecando: "Começando",
      emRitmo: "Em ritmo",
      constante: "Constante",
      avancado: "Avançado",
      veterano: "Veterano",
      lendario: "Lendário",
    },
    nivel: (n, faixa) => `Nível ${n} · ${faixa}`,
    pendentes: (quantas, percentual) =>
      `Você tem ${quantas} ${quantas === 1 ? "tarefa pendente" : "tarefas pendentes"}. ${percentual}% concluído.`,
    tudoEmDia: "Tudo em dia. Que tal planejar algo novo?",
    metricas: {
      tarefas: "Tarefas",
      concluidas: "Concluídas",
      pendentes: "Pendentes",
      blocosHoje: "Blocos hoje",
    },
    agora: "Agora",
    ate: (hora) => `até ${hora}`,
    depois: (titulo, hora) => `Depois: ${titulo} às ${hora}`,
    proximoBloco: "Próximo bloco",
    as: (hora) => `às ${hora}`,
    semBlocos: "Nenhum bloco pela frente hoje.",
    planejarODia: "Planejar o dia",
    tarefasDeHoje: "Tarefas de hoje",
    semTarefasHoje: "Nada com prazo para hoje. 🎉",
    autoconhecimento: "Autoconhecimento",
    planejadoReal: (planejado, real) => `planejado ${planejado}min · real ~${real}min`,
    emDia: "em dia",
    aMais: (minutos) => `+${minutos}min`,
    autoconhecimentoRodape:
      "Calculado dos seus check-ins — responda \u201cConcluí\u201d quando um bloco terminar.",
    lembretes: "Lembretes de hoje",
    verTodas: "Ver todas",
    verNoCalendario: "Ver no calendário",
    acoes: {
      calendario: { titulo: "Calendário", desc: "Organize seu tempo com blocos de foco" },
      tarefas: { titulo: "Tarefas", desc: "Gerencie e priorize suas atividades" },
      neuro: { titulo: "Neuro IA", desc: "Insights e sugestões inteligentes" },
    },
  },
  configuracoes: {
    sugestoesDaRotina: "Sugestões da sua rotina",
    perfil: {
      titulo: "Perfil",
      descricao: "Sua foto, nome e email",
      nome: "Nome",
      nomePlaceholder: "Seu nome",
      email: "Email",
      salvar: "Salvar",
      salvo: "Salvo",
      foto: {
        retrato: "Seu retrato",
        usandoFoto: "Usando sua foto",
        usandoBoneco: "Usando seu personagem do Escritório",
        usandoIniciais: "Usando as iniciais do nome",
        trocarRetrato: "Trocar o retrato",
        suaFoto: "Sua foto",
        seuPersonagem: "Seu personagem",
        iniciaisDoNome: "Iniciais do nome",
        monteNoEscritorio: "Monte um no Escritório",
        escolherArquivo: "Escolher um arquivo",
        removerFoto: "Remover a foto",
        erroSalvarEscolha: "Não deu para salvar a escolha.",
        fotoAtualizada: "Foto atualizada!",
        erroEnviarFoto: "Não deu para enviar a foto.",
        fotoRemovida: "Foto removida.",
        erroRemoverFoto: "Não deu para remover a foto.",
      },
    },
    aparencia: {
      titulo: "Aparência",
      descricao: "Tema e região",
      claro: "Claro",
      escuro: "Escuro",
      sistema: "Sistema",
      regiao: "Região",
      regioes: { BR: "Brasil", US: "Estados Unidos" },
      regiaoAjuda: "Decide como as horas aparecem e em que idioma o app fala.",
    },
    rotina: {
      titulo: "Rotina",
      descricao: "Seus tempos pessoais — usados pelo planejamento e pelos avisos do calendário",
      sonoDesejado: "Sono desejado",
      avisos: "Avisos inteligentes no calendário",
      avisosDetalhe: "Sono curto antes de compromissos, telas perto da hora de dormir",
      salvar: "Salvar rotina",
      minhasAtividades: "Minhas atividades",
      atividadesAjuda:
        "Atividades nomeadas com duração — viram blocos de 1 toque no calendário e alimentam o planejamento da Neuro. Ex.: \u201cDeslocamento \u2192 Trabalho\u201d, \u201cSe arrumar (evento)\u201d.",
      adicionar: "Adicionar atividade",
      nomePlaceholder: "Nome — ex.: Deslocamento \u2192 Trabalho",
      excluir: "Excluir atividade",
      aceitar: "Aceitar sugestão",
      ignorar: "Ignorar",
      sugestaoNova: (titulo, dias, categoria, minutos) =>
        `Você fez §${titulo}§ em ${dias} dias diferentes — salvar como atividade de ${categoria} de §${minutos} min§?`,
      sugestaoAjuste: (titulo, real, amostras, antes) =>
        `Em §${titulo}§ você leva ~§${real} min§ na prática (${amostras} check-ins), não ${antes} — ajustar?`,
      toastAtualizada: "Rotina atualizada! ✨",
    },
    importarExportar: {
      titulo: "Importar e exportar",
      descricao: "Traga sua agenda de outro calendário (.ics) ou leve a sua pra fora",
      importar: "Importar",
      importarDescricao: "Traga sua agenda de um arquivo .ics (Google Calendar, Outlook…)",
      exportar: "Exportar",
      exportarDescricao: "Baixe seus blocos como .ics pra usar em outro calendário",
      nadaParaExportar: "Nenhum bloco pra exportar ainda.",
      toastExportado: (n) => `${n} ${n === 1 ? "bloco exportado" : "blocos exportados"} (.ics)`,
      dialogo: {
        titulo: "Importar agenda (.ics)",
        escolherArquivo: "Escolher arquivo .ics",
        ondeAchar:
          "No Google Calendar: Configurações → Importar e exportar → §Exportar§ (baixa um .zip com o .ics).",
        semEventos: "Não encontrei eventos nesse arquivo. Exporte a agenda como .ics no seu calendário.",
        erroLeitura: "Não consegui ler o arquivo.",
        precisaLogin: "Você precisa estar logado.",
        marcarTodos: "Marcar todos",
        desmarcarTodos: "Desmarcar todos",
        resumo: (total, duplicados) =>
          `${total} ${total === 1 ? "evento" : "eventos"} · ${duplicados > 0 ? `${duplicados} já existe(m) · ` : ""}selecione o que criar`,
        jaExiste: "já existe",
        diaInteiro: "dia inteiro",
        repeticaoDiasUteis: "Dias úteis",
        cancelar: "Cancelar",
        importar: "Importar",
        importarN: (n) => `Importar ${n}`,
        toastImportado: (n) => `${n} ${n === 1 ? "evento importado" : "eventos importados"}! 📅`,
      },
    },
    assinar: {
      titulo: "Assinar no Google/Outlook",
      descricao: "Um link que mostra seus blocos no seu calendário de sempre, atualizando sozinho",
      explicacao:
        "Assine sua agenda no Google Calendar, Outlook e outros: eles leem este link e mostram seus blocos, atualizando sozinhos. É só-leitura — ninguém edita sua agenda por aqui.",
      carregando: "Carregando…",
      copiar: "Copiar",
      gerar: "Gerar link de assinatura",
      gerarNovo: "Gerar novo link (invalida o antigo)",
      ondeColar:
        "No Google Calendar: §Outros calendários → Adicionar → De URL§, cole o link. A atualização do lado deles pode levar horas — o Google reamostra quando quer.",
      toastPronto: "Link de assinatura pronto! 📆",
      toastCopiado: 'Link copiado! Cole no seu calendário, em "assinar por URL".',
      erroCopiar: "Não consegui copiar — selecione o link e copie manualmente.",
      erroSemTabela: "A tabela do feed ainda não existe. Rode supabase/calendar_feed.sql no Supabase.",
      erroCacheSchema:
        "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e recarregue.",
      erroPermissao: "Sem permissão (RLS). Confira se as policies do calendar_feed.sql foram criadas.",
    },
    compartilharAgenda: {
      titulo: "Compartilhar meus horários",
      descricao: "Um link para quem precisa marcar horário com você — sem conta, e sem ver o que você faz",
    },
    notificacoes: {
      titulo: "Notificações",
      descricao: "Lembretes e check-ins mesmo com o app fechado",
      nesteDispositivo: "Notificações neste dispositivo",
      suportado: "Ative em cada aparelho que quiser receber (celular, computador).",
      naoSuportado:
        "Não suportado neste navegador. No iPhone: adicione o app à tela de início e ative por lá.",
      toastDesativadas: "Notificações desativadas neste dispositivo.",
      toastAtivadas: "Notificações ativadas! 🔔",
      toastAtivadasDetalhe: "Lembretes e check-ins chegam mesmo com o app fechado.",
      erroAtivar: "Não deu para ativar",
    },
    telegram: {
      titulo: "Telegram",
      descricao: "Mande uma mensagem para o bot e ela vira tarefa",
      mandeParaOBot: "No Telegram, mande para o bot:",
      expiraEm: (mm) => `Expira em ${mm}.`,
      gerarCodigo: "Gerar código de pareamento",
      conversasConectadas: "Conversas conectadas",
      conversaSemNome: "Conversa do Telegram",
      ultimaMensagem: (data) => `Última mensagem em ${data}`,
      semMensagens: "Ainda sem mensagens",
      ajudaComandos:
        "Qualquer mensagem vira tarefa (1ª linha = título). Também entende /hoje e /ajuda.",
      erroGerar: "Não deu para gerar o código",
      tenteNovamente: "Tente novamente.",
    },
    conta: { titulo: "Conta", sair: "Sair da conta" },
  },
  compartilhar: {
    explicacao:
      "Um link para mandar a quem precisa marcar horário com você — cliente, professor, quem for. Não exige conta e mostra só quando você está ocupado: título, local e com quem nunca saem daqui.",
    mostrarProximos: "Mostrar os próximos",
    dias: (n) => `${n} dias`,
    copiar: "Copiar",
    criarLink: "Criar link de agenda",
    gerarNovo: "Gerar novo link (invalida o antigo)",
    desativar: "Desativar",
    carregando: "Carregando…",
    toastCriado: "Link pronto! Quem abrir vê só seus horários ocupados.",
    toastCopiado: "Link copiado! Mande para quem precisa marcar horário com você.",
    toastDesativado: "Link desativado. Quem tinha ele agora vê uma página que não existe.",
    erroCopiar: "Não consegui copiar — selecione o link e copie manualmente.",
    erroSemTabela: "A tabela ainda não existe. Rode supabase/agenda_publica.sql no Supabase.",
    erroCacheSchema:
      "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e recarregue.",
    erroPermissao: "Sem permissão (RLS). Confira se as policies do agenda_publica.sql foram criadas.",
  },
  tarefas: {
    nova: "Nova tarefa",
    criar: "Criar tarefa",
    salvar: "Salvar",
    cancelar: "Cancelar",
    vazio: "Nenhuma tarefa por aqui. Que tal adicionar uma?",
    listaGeral: "Geral",
    listaOutras: "Outras",
    novaLista: "Nova lista",
    nomeDaLista: "Nome da lista",
    excluirLista: "Excluir lista",
    escopos: { hoje: "Hoje", proximos: "Próximos", todos: "Todos" },
    vazioHoje: "Nada para hoje. 🎉",
    vazioProximos: "Nada nos próximos dias.",
    vazioTodos: "Nenhuma tarefa.",
    concluidas: (n) => `Concluídas (${n})`,
    erroSemTabelaListas:
      "A tabela de listas ainda não existe. Rode supabase/task_lists.sql no Supabase.",
    erroExcluir: "Não consegui excluir a tarefa.",
    erroRepeticao: "Não consegui mudar a repetição agora.",
    toastRecorrente: "Tarefa recorrente concluída! 🔁",
    toastRecorrenteDetalhe: (data) => `Próxima ocorrência: ${data}`,
    toastSemXp: "Concluída — sem XP desta vez 😉",
    toastSemXpDetalhe: (minutos) =>
      `Tarefas criadas há menos de ${minutos} min não geram XP.`,
    toastRepete: (rotulo) => `Repete: ${rotulo.toLowerCase()}`,
    toastNaoRepete: "Não repete mais",
    repeticao: {
      naoRepete: "Não repete",
      diariamente: "Diariamente",
      semanalmente: "Semanalmente",
      mensalmente: "Mensalmente",
      anualmente: "Anualmente",
      aCadaNDias: (dias) => `A cada ${dias} ${dias === 1 ? "dia" : "dias"}`,
      aCadaNDiasVazio: "A cada N dias…",
    },
    prioridades: { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" },
    cartao: {
      concluir: "Concluir tarefa",
      marcarPendente: "Marcar como pendente",
      favoritar: "Adicionar aos favoritos",
      desfavoritar: "Remover dos favoritos",
      editar: "Editar",
      excluir: "Excluir",
      repetir: "Repetir",
      atrasada: "Atrasada",
      faltamMinutos: (n) => `faltam ${n} min`,
      faltamHoras: (n) => `faltam ${n} h`,
      faltamDias: (n) => `${n === 1 ? "falta" : "faltam"} ${n} ${n === 1 ? "dia" : "dias"}`,
      entrar: "Entrar",
      copiarLinkReuniao: "Copiar link da reunião",
      toastLinkReuniao: "Link da reunião copiado!",
      emAndamento: "Em andamento",
      iniciar: "Iniciar",
    },
    dialogo: {
      editarTitulo: "Editar tarefa",
      novaTitulo: "Nova tarefa",
      tituloPlaceholder: "O que precisa ser feito?",
      descricaoPlaceholder: "Descrição (opcional)",
      prioridade: "Prioridade",
      tempoEstimado: "Tempo estimado",
      personalizarTempo: "Personalizar",
      vencimento: "Vencimento",
      semData: "Sem data",
      hoje: "Hoje",
      amanha: "Amanhã",
      emNDias: (n) => `em ${n} ${n === 1 ? "dia" : "dias"}`,
      emXDias: "Em X dias",
      data: "Data",
      reuniao: "Reunião",
      opcional: "Opcional",
      linkPlaceholder: "Cole o link — Meet, Zoom, Teams…",
      copiarLink: "Copiar link",
      toastLinkCopiado: "Link copiado!",
      horario: "Horário",
      horarioDoCompromisso: "Horário do compromisso",
      escolher: "Escolher",
      limpar: "limpar",
      semDataVale: (hora) => `Sem data escolhida — vale para hoje às ${hora}.`,
      localPlaceholder: "Local — sala, endereço…",
      adicionarLocal: "Adicionar local (presencial)",
      repetir: "Repetir",
      personalizado: "Personalizado",
      aCadaNDias: (dias) => `a cada ${dias} ${dias === 1 ? "dia" : "dias"}`,
      avancaSozinho: "Ao concluir, o prazo avança automaticamente para a próxima ocorrência.",
      precisaLogin: "Você precisa estar logado",
    },
  },
  amigos: {
    erros: {
      precisaLogin: "Você precisa estar logado",
      usuarioCurto: "Use ao menos 3 caracteres (letras, números e _)",
      usuarioEmUso: "Esse @usuário já foi escolhido — tente outro",
      jaSaoAmigos: "Vocês já são amigos (ou o pedido já foi enviado).",
      voceMesmo: "Esse é você! 😄",
      usuarioInexistente: "Usuário não encontrado.",
      naoSaoAmigos: "Vocês ainda não são amigos.",
      agendaPrivada: "Esse amigo não compartilha a agenda.",
      escritorioPrivado: "Esse amigo mantém o escritório privado.",
      conviteInvalido: "Preencha o título e um horário válido.",
      conviteInexistente: "Convite não encontrado (já respondido?).",
      generico: "Não deu certo agora. Tente de novo.",
    },
    dica: "§Dica:§ nos amigos, use §📅 Agenda§ para ver os horários ocupados de hoje (se a pessoa ativou o chip “Agenda”) e §➕ Convidar§ para propor um compromisso — quando aceito, ele entra no calendário de vocês dois automaticamente.",
    privacidade: {
      ocupadoLivre: "Ocupado/livre",
      escritorio: "Escritório",
      nivel: "Nível",
      agenda: "Agenda",
      perfilAberto: "Perfil aberto",
      dica: (veem, oQue) => `Amigos ${veem ? "veem" : "NÃO veem"}: ${oQue}`,
    },
    escolherUsuario: {
      titulo: "Escolha seu @usuário",
      ajuda: "É como seus amigos vão te achar na busca. Letras minúsculas, números e _ (3–20).",
      placeholder: "seu_usuario",
      criar: "Criar",
      toastPronto: (usuario) => `Pronto, @${usuario}! Agora seus amigos podem te encontrar.`,
    },
    buscaPlaceholder: "Buscar por @usuário ou nome…",
    regiaoPlaceholder: "Sua região — ex.: Campinas, SP (opcional)",
    toastRegiaoSalva: "Região salva — vamos priorizar quem está perto.",
    toastRegiaoRemovida: "Região removida.",
    sugeridos: "Sugeridos para você",
    mesmaRegiao: "mesma região",
    adicionar: "Adicionar",
    toastPedidoEnviado: (usuario) => `Pedido enviado para @${usuario}`,
    toastAgoraAmigos: "Vocês agora são amigos! 🎉",
    pedidos: "Pedidos de amizade",
    aceitar: "Aceitar",
    recusar: "Recusar",
    toastAmizadeAceita: (usuario) => `Você e @${usuario} agora são amigos! 🎉`,
    ocupado: "Ocupado",
    livre: "Livre",
    privado: "privado",
    verAgenda: "Ver horários ocupados de hoje",
    convidar: "Convidar para um compromisso",
    visitar: "Visitar escritório",
    desfazer: "Desfazer amizade",
    cancelarPedido: "Cancelar pedido",
    vazio: "Busque um amigo pelo @ para começar — dá pra ver se ele está livre e visitar o escritório dele. 👀",
    convitesRecebidos: {
      titulo: "Convites de compromisso",
      de: "de",
      para: "para",
      online: "online",
      aguardando: "aguardando",
      cancelar: "Cancelar convite",
      toastConfirmado: "Compromisso confirmado — já está no calendário de vocês dois! 📅",
    },
    agendaDoDia: {
      titulo: (nome) => `Hoje, ${nome} está…`,
      livreODiaTodo: "Livre o dia todo! 🎉",
      ocupado: "ocupado",
      aviso: "Só os horários são compartilhados — nunca o que a pessoa está fazendo.",
      convidarLivre: "Convidar para um horário livre",
    },
    visita: {
      titulo: (nome) => `Escritório de ${nome}`,
      nivel: (n) => `Lvl ${n}`,
      itens: (n) => `${n} ${n === 1 ? "item conquistado" : "itens conquistados"} — e o seu, como está? 😉`,
      carregando3d: "Carregando 3D…",
    },
    convite: {
      titulo: (nome) => `Convidar ${nome}`,
      tituloPlaceholder: "Título — ex.: Reunião de alinhamento",
      das: "Das",
      as: "às",
      sugerir: "Sugerir horário livre dos dois",
      semJanela: (minutos) => `Nenhuma janela de ${minutos}min livre para os dois nesse dia.`,
      linkPlaceholder: "Link — Meet, Zoom… (opcional)",
      localPlaceholder: "Local — sala, endereço… (opcional)",
      aviso: "Quando o convite for aceito, o compromisso entra automaticamente no calendário de vocês dois.",
      cancelar: "Cancelar",
      enviar: "Enviar convite",
      toastEnviado: (usuario) =>
        `Convite enviado para @${usuario}! Quando aceitar, entra na agenda dos dois.`,
    },
  },
  favoritos: {
    vazio: "Nada favoritado ainda. Toque na ⭐ de uma tarefa ou nota para vê-la aqui.",
    tarefas: (n) => `Tarefas (${n})`,
    notas: (n) => `Notas (${n})`,
    verTodas: "Ver todas",
    remover: "Remover dos favoritos",
    notaSemTitulo: "Sem título",
    notaVazia: "Vazia",
  },
  notas: {
    nova: "Nova nota",
    vazio: "Nenhuma nota ainda. Clique em §Nova nota§ para começar a escrever.",
    semTitulo: "Sem título",
    vazia: "Vazia",
    tituloPlaceholder: "Título",
    escrevaAqui: "Comece a escrever...",
    selecione: "Selecione uma nota ou crie uma nova.",
    salvando: "Salvando…",
    salvo: "Salvo",
    favoritar: "Adicionar aos favoritos",
    desfavoritar: "Remover dos favoritos",
    excluir: "Excluir nota",
    corDaNota: "Cor da nota",
    semCor: "Sem cor",
    cores: {
      ambar: "Âmbar",
      coral: "Coral",
      rosa: "Rosa",
      violeta: "Violeta",
      azul: "Azul",
      verde: "Verde",
    },
    erroSemColunaCor:
      "A tabela de notas ainda não tem a coluna de cor. Rode supabase/notas_cor.sql no Supabase.",
    erroSalvarCor: "Não consegui salvar a cor agora.",
    editor: {
      desfazer: "Desfazer (Ctrl+Z)",
      refazer: "Refazer (Ctrl+Y)",
      negrito: "Negrito",
      italico: "Itálico",
      sublinhado: "Sublinhado",
      tamanhos: { pequeno: "P", medio: "M", grande: "G" },
      tamanhoDica: (letra) => `Tamanho ${letra}`,
      titulo: "Título",
      lista: "Lista",
      listaNumerada: "Lista numerada",
      cores: "Cores",
      corDoTexto: "Cor do texto",
      fundoMarcaTexto: "Fundo (marca-texto)",
      corPadrao: "Padrão",
      semFundo: "Sem fundo",
      paleta: {
        vermelho: "Vermelho",
        laranja: "Laranja",
        amarelo: "Amarelo",
        verde: "Verde",
        azul: "Azul",
        roxo: "Roxo",
        rosa: "Rosa",
      },
      imagem: "Imagem",
      diminuir: "Diminuir",
      aumentar: "Aumentar",
      concluir: "Concluir",
    },
  },
  ia: {
    limiteAtingido:
      "A Neuro está descansando 😴 O limite gratuito da IA chegou por agora — tente de novo em instantes.",
    limiteAtingidoVoz: "Estou descansando um pouquinho 😴 O limite gratuito da IA chegou por agora.",
    novaConversa: "Nova conversa",
    conversas: "Conversas",
    desafixar: "Desafixar",
    fixar: "Fixar",
    excluir: "Excluir",
    saudacao: "Olá! Sou a Neuro IA",
    subtitulo: "Posso organizar seu dia, priorizar tarefas e ajudar você a focar.",
    leuAnotacoes: "Li suas anotações de hoje",
    placeholder: "Pergunte qualquer coisa…",
    pararGravacao: "Parar gravação",
    gravarAudio: "Gravar áudio",
    enviar: "Enviar",
    conversarPorVoz: "Conversar por voz",
    gravando: "Gravando… toque no quadrado para transcrever",
    transcrevendo: "Transcrevendo seu áudio…",
    erroResposta: "Não consegui responder agora. Tente novamente.",
    erroConexao: "Houve um erro de conexão. Tente novamente.",
    erroTranscricao: "Não consegui transcrever o áudio.",
    erroTranscricaoGenerica: "Erro ao transcrever o áudio.",
    erroMicrofone: "Não foi possível acessar o microfone. Verifique a permissão do navegador.",
    atalhosPadrao: [
      "Organize meu dia com base nas minhas anotações",
      "Quais devem ser minhas 3 prioridades de hoje?",
      "Sugira blocos de foco para a tarde",
      "Como melhorar meu foco hoje?",
    ],
    atalhoPlaceholder: "O que você quer perguntar…",
    removerAtalho: "Remover atalho",
    adicionar: "Adicionar",
    restaurarPadrao: "Restaurar padrão",
    concluir: "Concluir",
    editarAtalhos: "Editar atalhos",
    criarAtalho: "Criar um atalho",
    respostaFallback: "Desculpe, não consegui responder agora.",
    erroConexaoVoz: "Tive um problema de conexão.",
    naoOuvi: "Não consegui te ouvir — toca no microfone e tenta de novo?",
    gravandoToqueEnviar: "Gravando… toque de novo para enviar",
    permissaoMicNegada: "Permissão de microfone negada.",
    statusDescansando: "Descansando 😴",
    statusOuvindo: "Ouvindo…",
    statusPensando: "Pensando…",
    statusFalando: "Falando…",
    statusToqueParaFalar: "Toque no microfone para falar",
    encerrarConversa: "Encerrar conversa",
    semSuporteVoz: "Seu navegador não suporta reconhecimento de voz ao vivo. Use o §Chrome§ ou §Edge§.",
    acordarPlano: "Acorde a Neuro com o plano ilimitado",
    emBreve: "(em breve)",
    tentarDeNovo: "Tentar de novo",
    sim: "Sim",
    nao: "Não",
    enviarFalado: "Enviar o que você falou",
    tocarParaFalar: "Tocar para falar",
    podeFalarAVontade: "Pode falar à vontade. Toque de novo para enviar.",
    toqueMicUseFones: "Toque no microfone para falar. Use fones para melhor resultado.",
  },
  escritorio: {
    semWebgl: {
      titulo: "Seu escritório precisa de 3D",
      texto: "Este navegador está sem WebGL. A loja e o avatar continuam funcionando — abra em outro navegador para ver a sala.",
    },
    editarAvatar: "Editar avatar",
    carregando3d: "Carregando 3D…",
    salvarCompartilharImagem: "Salvar / compartilhar imagem do escritório",
    abraParaGerarImagem: "Abra o escritório em 3D para gerar a imagem.",
    tituloCompartilhamento: "Meu escritório no NeuroTask 🏢",
    imagemBaixada: "Imagem do escritório baixada! 📸",
    imagemCompartilhada: "Escritório compartilhado! 📸",
    erroGerarImagem: "Não consegui gerar a imagem.",
    vazio: "Seu cantinho começa simples — decore-o com a sua produtividade.",
    itensConquistados: (n) => `${n} ${n === 1 ? "item conquistado" : "itens conquistados"}`,
    corDeFundo: "Cor de fundo",
    corPersonalizada: "Cor personalizada",
    fundoCorPersonalizadaAria: "Fundo: cor personalizada",
    fundoAria: (nome) => `Fundo: ${nome}`,
    fundoNomes: {
      automatico: "Automático (tema)",
      ceu: "Céu",
      lavanda: "Lavanda",
      pessego: "Pêssego",
      menta: "Menta",
      argila: "Argila",
      noite: "Noite",
      grafite: "Grafite",
    },
    avatarEditor: {
      corpo: "Corpo",
      cabelo: "Cabelo",
      pele: "Pele",
      roupa: "Roupa",
      calca: "Calça",
      ternoAvisoCalca: "No terno, a calça acompanha a cor do paletó.",
      fones: (ligado) => `Fones ${ligado ? "ligados" : "desligados"}`,
      cancelar: "Cancelar",
      salvar: "Salvar",
      cabeloEstilos: {
        curto: "Curto",
        franja: "Franja",
        cacheado: "Cacheado",
        longo: "Longo",
        coque: "Coque",
        raspado: "Raspado",
      },
      roupas: {
        camiseta: "Camiseta",
        moletom: "Moletom",
        jaqueta: "Jaqueta",
        terno: "Terno",
      },
      corpoTipos: {
        m: "Masculino",
        f: "Feminino",
      },
    },
    loja: {
      titulo: "Loja",
      categorias: {
        chapeu: "Chapéus",
        oculos: "Óculos",
        vida: "Plantas e bichos",
        luz: "Luz",
        enfeite: "Enfeites",
        movel: "Móveis",
        cadeira: "Cadeira",
        setup: "Setup",
        parede: "Parede",
        piso: "Piso",
      },
      previa: (nome) => `Prévia · ${nome}`,
      noEscritorio: "No escritório",
      guardado: "Guardado",
      guardar: "Guardar",
      equipar: "Equipar",
      comprar: "Comprar",
      moedasInsuficientes: "Moedas insuficientes",
      itemComprado: (emoji, nome) => `${emoji} ${nome} é seu! Já está no escritório.`,
      avatarAtualizado: "Avatar atualizado! ✨",
      itens: {
        "oculos-grau": { nome: "Óculos de grau", desc: "Ar de quem lê muito" },
        "oculos-escuros": { nome: "Óculos escuros", desc: "Foco em modo estiloso" },
        "chapeu-bone": { nome: "Boné", desc: "Clássico de todo dia" },
        "chapeu-social": { nome: "Chapéu social", desc: "Elegância no home office" },
        "chapeu-gorro": { nome: "Gorro de lã", desc: "Com barra enrolada e pompom" },
        "chapeu-capuz": { nome: "Capuz", desc: "Modo concentração, sem falar com ninguém" },
        "chapeu-coroa": { nome: "Coroa dourada", desc: "Para quem reina na rotina" },
        "chapeu-aureola": { nome: "Auréola", desc: "Paira acima da cabeça, acesa" },
        "planta-pequena": { nome: "Plantinha", desc: "Um toque de vida na mesa" },
        luminaria: { nome: "Luminária", desc: "Luz quentinha de canto" },
        "quadro-montanhas": { nome: "Quadro · Montanhas", desc: "Paisagem pra respirar" },
        tapete: { nome: "Tapete", desc: "Conforto sob os pés" },
        "planta-grande": { nome: "Planta grande", desc: "Uma costela-de-adão no canto" },
        estante: { nome: "Estante de livros", desc: "Sua biblioteca pessoal" },
        "mesa-centro": { nome: "Mesa de centro", desc: "Com um livro e uma caneca em cima" },
        sofa: { nome: "Sofá", desc: "Dois lugares encostados na parede" },
        poltrona: { nome: "Poltrona", desc: "Solta no chão, virada para a mesa" },
        "quadro-neon": { nome: "Neon \"focus\"", desc: "Letreiro neon na parede" },
        "janela-cidade": { nome: "Janela · Cidade", desc: "Vista para a cidade" },
        "pet-gato": { nome: "Gato de estimação", desc: "Companhia de produtividade" },
        "pet-cachorro": { nome: "Cachorro (Beagle)", desc: "Um beagle 3D que se mexe no tapete" },
        trofeu: { nome: "Troféu dourado", desc: "Prova de que você chegou longe" },
        "cadeira-ergonomica": { nome: "Cadeira ergonômica", desc: "Adeus, dor nas costas" },
        "cadeira-gamer": { nome: "Cadeira gamer", desc: "Vermelha e imponente" },
        relogio: { nome: "Relógio de parede", desc: "O tempo passando na parede" },
        prateleira: { nome: "Prateleira", desc: "Livros, vaso e caneca em cima" },
        "led-rgb": { nome: "Fita de LED RGB", desc: "Contorna o teto com cor" },
        "setup-notebook": { nome: "Setup · Notebook", desc: "Só o laptop, mesa limpa" },
        "setup-duplo": { nome: "Setup · 2 monitores", desc: "Produtividade em dobro" },
        "setup-ultrawide": { nome: "Setup · Ultrawide", desc: "O monitor dos sonhos" },
        "parede-azul": { nome: "Parede azul", desc: "Tom sereno de foco" },
        "parede-verde": { nome: "Parede verde", desc: "Verde floresta calmante" },
        "parede-rosa": { nome: "Parede rosa", desc: "Rosa suave e acolhedor" },
        "parede-cinza": { nome: "Parede cinza", desc: "Concreto sóbrio" },
        "parede-preta": { nome: "Parede preta", desc: "Fundo escuro, foco no que brilha" },
        "parede-papel": { nome: "Papel listrado", desc: "Listras verticais, não só cor" },
        "parede-terracota": { nome: "Parede terracota", desc: "Barro quente e fechado" },
        "parede-mostarda": { nome: "Parede mostarda", desc: "Amarelo queimado, sem gritar" },
        "parede-oliva": { nome: "Parede oliva", desc: "Verde escuro de estúdio" },
        "parede-cimento": { nome: "Cimento queimado", desc: "Manchado, como concreto polido" },
        "parede-tijolinho": { nome: "Tijolinho", desc: "Fiada aparente, junta e tudo" },
        "parede-ripada": { nome: "Ripado de madeira", desc: "Réguas verticais com fresta" },
        "piso-madeira": { nome: "Piso de madeira", desc: "Tábua corrida, com emenda" },
        "piso-carpete": { nome: "Carpete", desc: "Piso macio azulado" },
        "piso-madeira-escura": { nome: "Madeira escura", desc: "Tábua em tom nogueira" },
        "piso-porcelanato": { nome: "Porcelanato", desc: "Ladrilho grande com rejunte" },
        "piso-cimento": { nome: "Cimento queimado", desc: "Liso, cinza e sem emenda" },
      },
      erros: {
        saldoInsuficiente: "Moedas insuficientes — conclua mais tarefas! 💪",
        jaComprado: "Você já tem esse item.",
        itemInexistente: (arquivo) => `Este item ainda não existe no banco. Rode supabase/${arquivo} no Supabase.`,
      },
    },
  },
}

export const en: Dicionario = {
  calendario: {
    novoBloco: "New block",
    hoje: "Today",
    visoes: { dia: "day", semana: "week", mes: "month", ano: "year" },
    diasDaSemana: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    dispensarAviso: "Dismiss warning",
    abrirODia: "Open this day",
    maisN: (n) => `+${n} more`,
    recolherPainel: "Collapse panel",
    expandirPainel: "Expand panel",
    painelContextual: "Context panel",
    avisos: {
      telaAntesDeDormir: (titulo, horaDeDormir) =>
        `"${titulo}" ends shortly before bedtime (${horaDeDormir}). Screens close to sleep get in the way of resting — how about wrapping up earlier?`,
      sonoCurto: (inicio, fim, horas, desejadas) =>
        `Your sleep block (${inicio}–${fim}) is only ${horas} — below the ${desejadas} you want to sleep.`,
      vaoAntesDoSono: (titulo, fim, tituloSeguinte, inicio, horas, desejadas) =>
        `Between "${titulo}" (ending ${fim}) and "${tituloSeguinte}" (at ${inicio}) there are only ${horas} — less than your ${desejadas} of sleep.`,
      horas: (h) => `${Math.round(h * 10) / 10}h`,
    },
    notas: {
      titulo: "Day notes",
      salvando: "Saving…",
      salvo: "Saved",
      placeholder: "For the AI to read: today's thoughts… How has your focus been? Any loose ideas?",
    },
    lembretes: {
      titulo: "Reminders for the day",
      adicionar: "Add reminder",
      placeholder: "Add a reminder...",
      definirHorario: "Set a time",
      horarioNotificacao: "Time (notification)",
      remover: "Remove reminder",
      vazio: "No reminders yet.",
    },
    bloco: {
      novoTitulo: "New time block",
      editarTitulo: "Edit block",
      novoSubtitulo: "Schedule a new focus block",
      editarSubtitulo: "Update the block details",
      titulo: "Title",
      tituloPlaceholder: "E.g. Deep work",
      descricao: "Description",
      descricaoPlaceholder: "Optional details...",
      inicio: "Start",
      fim: "End",
      horarioDeInicio: "Start time",
      horarioDeFim: "End time",
      data: "Date",
      cor: "Colour",
      vincularTarefa: "Link a task",
      nenhumaTarefa: "None",
      vincularAjuda: "Links this block to a task on your list — the block becomes the time to do it.",
      repetir: "Repeat",
      diasUteis: "Weekdays (Mon–Fri)",
      excluir: "Delete block",
      excluirAtalho: "Delete block (Backspace)",
      cancelar: "Cancel",
      salvar: "Save",
      criar: "Create block",
      salvando: "Saving...",
      precisaLogin: "You need to be signed in",
    },
  },
  agenda: {
    titulo: (nome) => (nome ? `${nome}'s busy hours` : "Busy hours"),
    periodo: (dias) =>
      `The next ${dias} ${dias === 1 ? "day" : "days"}. Anything not shown here is free.`,
    fuso: (zona) => `Times shown in ${zona}.`,
    carregando: "Loading the schedule…",
    hoje: "today",
    livreODiaTodo: "Free all day",
    rodape: (dono) =>
      `${dono} shared only the hours. What fills each slot — title, place or with whom — never leaves the app.`,
    donoAnonimo: "This person",
  },
  erro: {
    publico: {
      titulo: "Something went wrong",
      texto: "The error is ours, not yours. Trying again usually fixes it.",
    },
    app: {
      titulo: "This part broke",
      texto:
        "The error is ours, not yours — and the rest of the app keeps working. Try again; if it sticks around, tell me what you were doing here.",
      irParaOInicio: "Go to home",
    },
    naoEncontrada: {
      titulo: "Page not found",
      texto: "The address you tried doesn't exist or has moved.",
    },
    tentarDeNovo: "Try again",
    voltarAoInicio: "Back to home",
  },
  telas: {
    inicio: "Home",
    inicioNav: "Dashboard",
    calendario: "Calendar",
    calendarioTitulo: "My Day · Time Blocking",
    tarefas: "Tasks",
    favoritos: "Favorites",
    notas: "Notes",
    neuroIa: "Neuro IA",
    modoFoco: "Focus Mode",
    escritorio: "Office",
    amigos: "Friends",
    configuracoes: "Settings",
  },
  moldura: {
    cabecalho: {
      alternarTema: "Toggle theme",
      avatar: "Avatar",
      usuario: "User",
      perfil: "Profile",
      sair: "Sign out",
      subiuDeNivel: (nivel) => `You reached level ${nivel}! 🎉`,
      subiuDeNivelDescricao: "Keep it up — you're doing great.",
    },
    xpDica:
      "Complete tasks to earn XP — Low +5 · Medium +10 · High +20 · Urgent +30. Every 100 XP you level up! Rules: tasks created less than 10 min ago earn no XP; no due date and no duration earns half; at most 150 XP per day.",
    feedback: {
      enviarFeedback: "Send feedback",
      fechar: "Close",
      tipos: { bug: "Problem", ideia: "Idea", geral: "Other" },
      placeholder: "What worked, what broke, what was missing…",
      vaiJunto: "Sent along: the current screen and the app version.",
      enviar: "Send",
      obrigado: "Thanks for the feedback! 🙏",
      chegouSemVersao: "It arrived. (Without the version context — run supabase/feedback.sql.)",
      fazDiferenca: "It really helps make the app better.",
      erros: {
        tabelaAusente: "The feedback table doesn't exist yet. Run supabase/feedback.sql in Supabase.",
        cacheDoSchema:
          "The table exists, but the Supabase API can't see it yet (schema cache). Wait a few seconds and try again.",
        colunaFaltando:
          "The feedback table is missing a column the app uses. Run supabase/feedback.sql again — it adds what's missing without deleting anything.",
        semPermissao:
          "No permission to save (RLS). Check that you're signed in and that the insert policy from feedback.sql was created.",
        checkAntigo:
          "The database is rejecting the feedback type — it's an old CHECK on the kind column, from a previous version of the table. Run supabase/feedback.sql again: it drops the old constraint and recreates the right one. Your message is still here.",
        generico: "Couldn't send it right now. Try again in a moment.",
      },
    },
    conexao: {
      semConexao: "No connection to the server.",
      dadosASalvo: "Your data is safe.",
      tentarDeNovo: "Try again",
    },
    onboarding: {
      passos: {
        "bem-vindo": {
          titulo: "Welcome to NeuroTask",
          texto:
            "Not another calendar you forget and abandon. It's a copilot for your routine: it plans the day with you and actually follows through.",
        },
        tarefas: {
          titulo: "Start with your tasks",
          texto:
            "Write down what you need to do. The app prioritizes, keeps track of deadlines and gives you XP for every completion — progress becomes a game, with purpose.",
        },
        calendario: {
          titulo: "Block out your time",
          texto:
            "In the calendar you set aside time for each thing. A task with a set time already becomes a block in your day, with no double work.",
        },
        "neuro-ia": {
          titulo: "Neuro IA organizes with you",
          texto:
            "Ask it to plan your day, create tasks or start a focus session. It proposes and you confirm — it never acts on its own or makes up data.",
        },
      },
      voltar: "Back",
      pular: "Skip",
      comecar: "Get started",
      proximo: "Next",
    },
  },
  foco: {
    emAndamento: "In progress",
    dispensarAviso: "Dismiss",
    restantes: (tempo) => `${tempo} left`,
    tempoEsgotado: "Estimated time is up",
    entrarNoFoco: "Start focusing",
    minimizar: "Minimize",
    cancelarFoco: "Cancel focus",
    focoAtivo: "Focusing",
    menosCinco: "5 minutes less",
    maisCinco: "5 minutes more",
    recomecar: "Restart",
    iniciar: "Start",
    pausar: "Pause",
    concluirTarefa: "Complete task",
    ambiente: "Ambience",
    animado: "animated",
    ambientes: {
      transparent: "Transparent",
      black: "Black",
      gray: "Gray",
      light: "Paper",
      white: "White",
      clock: "Clock",
      aurora: "Aurora",
      brasa: "Embers",
      mare: "Tide",
      algodao: "Cotton",
    },
    mixerDeSons: "Sound mixer",
    musicaDoYoutube: "YouTube music",
    sons: "Sounds",
    restaurar: "Restore focus mode",
    mixer: {
      secoes: { ambient: "Sounds", music: "Music", noise: "Focus" },
      faixas: {
        rain: "Rain",
        cafe: "Coffee shop",
        forest: "Forest",
        waves: "Ocean waves",
        fire: "Campfire",
        birds: "Birds",
        stream: "Stream",
        snow: "Snow",
        train: "Train",
        flight: "Flight",
        library: "Library",
        space: "Space",
        "classical-piano": "Classical · Piano",
        "classical-piano2": "Classical · Piano 2",
        "classical-orchestral": "Classical · Orchestra",
        "dark-ambience": "Dark ambient",
        "dungeon-synth": "Dungeon synth",
        lofi: "Lo-fi",
        lofi2: "Lo-fi 2",
        chillhop: "Chillhop",
        study: "Concentration",
        study2: "Flow",
        "study-music": "Immersion",
        binaural: "Binaural",
        brown: "Brown noise",
      },
      ativar: (nome) => `Turn on ${nome}`,
      desativar: (nome) => `Turn off ${nome}`,
      volumeDe: (nome) => `${nome} volume`,
      arquivoNaoEncontrado: "File not found",
      volumeGeral: "Master volume",
      continuarTodos: "Resume all sounds",
      pararTodos: "Stop all sounds",
      continuar: "Resume",
      parar: "Stop",
    },
    youtube: {
      placeholder: "Paste a YouTube link (video or live)…",
      tocar: "Play",
      favoritar: "Add this link to favorites",
      removerDosFavoritos: "Remove from favorites",
      remover: "Remove",
      ajuda:
        "Paste a link, hit §Play§ and click the §★§ to save it. The audio keeps playing while you work — just leave Focus §minimized§.",
    },
  },
  entrada: {
    email: "Email",
    emailPlaceholder: "you@email.com",
    senha: "Password",
    entrar: "Sign in",
    criarConta: "Create account",
    voltarParaLogin: "Back to sign in",
    minimoSeisCaracteres: "At least 6 characters",
    verifiqueSeuEmail: "Check your email",
    muitasTentativas: "Too many attempts. Wait a moment and try again.",
    senhaFraca: "Password too weak. Use at least 6 characters.",
    login: {
      subtitulo: "Manage your tasks intelligently",
      esqueceuSenha: "Forgot your password?",
      entrando: "Signing in...",
      olheOSpam: "Also check §spam§ and the §Promotions/Updates§ tabs (Gmail) or §Other§ (Outlook).",
      linkReenviado: "Link resent! ✓",
      reenviarConfirmacao: "Resend confirmation link",
      naoTemConta: "Don't have an account?",
      erros: {
        credenciaisInvalidas: "Incorrect email or password.",
        emailNaoConfirmado: "Confirm your email before signing in. Check your inbox.",
        contaSuspensa: "This account is suspended.",
        generico: "Couldn't sign in. Please try again.",
      },
    },
    cadastro: {
      subtitulo: "Start organizing your tasks today",
      nome: "Name",
      nomePlaceholder: "Your name",
      criandoConta: "Creating account...",
      jaTemConta: "Already have an account?",
      enviamosConfirmacao: (email) =>
        `We sent a confirmation link to §${email}§. Click the link to activate your account.`,
      naoChegou: "Didn't get it? Check §spam§ and the §Promotions/Updates§ tabs (Gmail) or §Other§ (Outlook) —",
      reenviadoAguarde: (segundos) => `resent ✓ (wait ${segundos}s to resend again)`,
      reenviarLink: "resend link",
      erros: {
        emailEmUso: "This email is already in use. Try signing in.",
        emailInvalido: "Invalid email. Check it and try again.",
        cadastrosDesativados: "Sign-ups are temporarily disabled.",
        generico: "Couldn't create the account. Please try again.",
      },
    },
    senhaNova: {
      novaSenha: "New password",
      redefinirSenha: "Reset password",
      subtituloNova: "Choose your account's new password",
      subtituloRedefinir: "We'll send a reset link to your email",
      confirmarNovaSenha: "Confirm new password",
      repitaSenha: "Repeat the password",
      salvando: "Saving...",
      salvarNovaSenha: "Save new password",
      enviando: "Sending...",
      enviarLink: "Send reset link",
      lembrouSenha: "Remembered your password?",
      seExistirConta: (email) =>
        `If there's an account for §${email}§, we sent a link to reset the password. Also check §spam§ and the §Promotions/Updates§ tabs (Gmail) or §Other§ (Outlook).`,
      soOMaisRecente: "⚠️ If you asked more than once, §only the most recent email§ works.",
      erros: {
        muitasTentativasMinuto: "Too many attempts. Wait a minute and try again.",
        naoEnviou: "Couldn't send the link. Please try again.",
        senhasDiferentes: "The passwords don't match.",
        linkExpirado: "This link was already used or has expired. Request a new one below.",
        senhaIgual: "The new password must be different from the current one.",
      },
    },
    erroAutenticacao: {
      titulo: "Authentication error",
      texto: "Something went wrong while signing you in. Please try again.",
      detalheTecnico: (motivo) => `Technical detail: ${motivo}`,
    },
    social: {
      ou: "or",
      ultimoAcesso: "last used",
      entrarCom: (provedor) => `Sign in with ${provedor}`,
      criarContaCom: (provedor) => `Sign up with ${provedor}`,
      erroProvedor: (provedor) => `Couldn't sign in with ${provedor}. Try with your email.`,
    },
  },
  inicio: {
    enquete: {
      rotulo: "Quick poll",
      obrigado: "Thanks! It helps more than it seems.",
      agoraNao: "Not now",
      perguntas: {
        "por-que-abriu": {
          texto: "What made you open NeuroTask today?",
          opcoes: ["See what I had to do", "Write down something new", "A reminder called me", "Curiosity"],
        },
        "faria-falta": {
          texto: "If the app disappeared tomorrow, what would you miss?",
          opcoes: ["The tasks and the calendar", "Neuro IA", "The Office and my level", "Nothing yet"],
        },
        atrapalhou: {
          texto: "What got in your way the most so far?",
          opcoes: ["Finding things", "It got slow or froze", "I didn't understand what to do", "Nothing got in my way"],
        },
        "seus-numeros": {
          texto: "Did “Your numbers”, on the home screen, tell you something you didn't know?",
          opcoes: ["Yes, it surprised me", "Interesting, but I changed nothing", "Never opened it"],
        },
      },
    },
    seusNumeros: {
      titulo: "Your numbers",
      abas: { dias: "Per day", semana: "Consistency", hora: "Best hour" },
      carregando: "Loading…",
      vazio: "Complete a few tasks and the numbers show up here.",
      nadaConcluido: (dias) => `Nothing completed in the last ${dias} days.`,
      concluidas: (total, dias) => `${total} ${total === 1 ? "task" : "tasks"} completed in the last ${dias} days.`,
      apareceMais: (indice, feitos, contados) => {
        const dia = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"][indice] ?? ""
        return `You show up most on ${dia} — ${feitos} of the last ${contados}.`
      },
      semPadraoSemana: "No weekly pattern to see yet.",
      rendeMais: (hora) => `You're most productive around ${hora}.`,
      semHorario: "No favorite time of day to see yet.",
      diasCurtos: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      vezes: (feitos, contados) => `${feitos} of ${contados} ${contados === 1 ? "time" : "times"}`,
      tarefas: (n) => `${n} ${n === 1 ? "task" : "tasks"}`,
      emDia: (rotulo) => ` on ${rotulo}`,
      graficoLinha: (dias) => `Tasks completed per day over the last ${dias} days`,
      graficoColunas: "Column chart",
    },
    comecePorAqui: {
      titulo: "Start here",
      descricao: "NeuroTask isn't a passive calendar — it's a routine copilot. In 3 steps it starts working for you.",
      dispensar: "Dismiss",
      passos: {
        criarTarefa: { rotulo: "Create your first task", acao: "Create task" },
        concluirTarefa: { rotulo: "Complete a task — you earn XP and coins for your Office", acao: "See tasks" },
        montarDia: { rotulo: "Plan your day in the calendar (or import one!)", acao: "Open calendar" },
      },
      exploreTambem: "Explore too:",
      planejarComIa: "Plan the day with the AI",
      trazerAgenda: "Bring my calendar",
      seuEscritorio: "Your Office",
    },
    saudacoes: { ola: "Hello", bomDia: "Good morning", boaTarde: "Good afternoon", boaNoite: "Good evening" },
    faixas: {
      comecando: "Starting out",
      emRitmo: "Getting going",
      constante: "Steady",
      avancado: "Advanced",
      veterano: "Veteran",
      lendario: "Legendary",
    },
    nivel: (n, faixa) => `Level ${n} · ${faixa}`,
    pendentes: (quantas, percentual) =>
      `You have ${quantas} ${quantas === 1 ? "task pending" : "tasks pending"}. ${percentual}% done.`,
    tudoEmDia: "All caught up. How about planning something new?",
    metricas: {
      tarefas: "Tasks",
      concluidas: "Done",
      pendentes: "Pending",
      blocosHoje: "Blocks today",
    },
    agora: "Now",
    ate: (hora) => `until ${hora}`,
    depois: (titulo, hora) => `Next: ${titulo} at ${hora}`,
    proximoBloco: "Next block",
    as: (hora) => `at ${hora}`,
    semBlocos: "Nothing else scheduled today.",
    planejarODia: "Plan the day",
    tarefasDeHoje: "Today\u2019s tasks",
    semTarefasHoje: "Nothing due today. 🎉",
    autoconhecimento: "Know yourself",
    planejadoReal: (planejado, real) => `planned ${planejado}min · actual ~${real}min`,
    emDia: "on point",
    aMais: (minutos) => `+${minutos}min`,
    autoconhecimentoRodape:
      "Worked out from your check-ins — answer \u201cDone\u201d when a block ends.",
    lembretes: "Today\u2019s reminders",
    verTodas: "See all",
    verNoCalendario: "See in calendar",
    acoes: {
      calendario: { titulo: "Calendar", desc: "Organise your time with focus blocks" },
      tarefas: { titulo: "Tasks", desc: "Manage and prioritise what you have to do" },
      neuro: { titulo: "Neuro IA", desc: "Insights and smart suggestions" },
    },
  },
  configuracoes: {
    sugestoesDaRotina: "Suggestions from your routine",
    perfil: {
      titulo: "Profile",
      descricao: "Your photo, name and email",
      nome: "Name",
      nomePlaceholder: "Your name",
      email: "Email",
      salvar: "Save",
      salvo: "Saved",
      foto: {
        retrato: "Your portrait",
        usandoFoto: "Using your photo",
        usandoBoneco: "Using your Office character",
        usandoIniciais: "Using your initials",
        trocarRetrato: "Change portrait",
        suaFoto: "Your photo",
        seuPersonagem: "Your character",
        iniciaisDoNome: "Initials",
        monteNoEscritorio: "Build one in the Office",
        escolherArquivo: "Choose a file",
        removerFoto: "Remove photo",
        erroSalvarEscolha: "Couldn't save the choice.",
        fotoAtualizada: "Photo updated!",
        erroEnviarFoto: "Couldn't upload the photo.",
        fotoRemovida: "Photo removed.",
        erroRemoverFoto: "Couldn't remove the photo.",
      },
    },
    aparencia: {
      titulo: "Appearance",
      descricao: "Theme and region",
      claro: "Light",
      escuro: "Dark",
      sistema: "System",
      regiao: "Region",
      regioes: { BR: "Brazil", US: "United States" },
      regiaoAjuda: "Sets how times are shown and which language the app speaks.",
    },
    rotina: {
      titulo: "Routine",
      descricao: "Your personal timings — used by planning and by the calendar warnings",
      sonoDesejado: "Target sleep",
      avisos: "Smart calendar warnings",
      avisosDetalhe: "Short sleep before commitments, screens close to bedtime",
      salvar: "Save routine",
      minhasAtividades: "My activities",
      atividadesAjuda:
        "Named activities with a duration — they become one-tap blocks in the calendar and feed Neuro\u2019s planning. E.g. \u201cCommute \u2192 Work\u201d, \u201cGet ready (event)\u201d.",
      adicionar: "Add activity",
      nomePlaceholder: "Name — e.g. Commute \u2192 Work",
      excluir: "Delete activity",
      aceitar: "Accept suggestion",
      ignorar: "Dismiss",
      sugestaoNova: (titulo, dias, categoria, minutos) =>
        `You did §${titulo}§ on ${dias} different days — save it as a ${categoria} activity of §${minutos} min§?`,
      sugestaoAjuste: (titulo, real, amostras, antes) =>
        `§${titulo}§ actually takes you ~§${real} min§ (${amostras} check-ins), not ${antes} — adjust it?`,
      toastAtualizada: "Routine updated! ✨",
    },
    importarExportar: {
      titulo: "Import and export",
      descricao: "Bring your schedule from another calendar (.ics), or take yours elsewhere",
      importar: "Import",
      importarDescricao: "Bring your schedule in from an .ics file (Google Calendar, Outlook…)",
      exportar: "Export",
      exportarDescricao: "Download your blocks as .ics to use in another calendar",
      nadaParaExportar: "No blocks to export yet.",
      toastExportado: (n) => `${n} ${n === 1 ? "block" : "blocks"} exported (.ics)`,
      dialogo: {
        titulo: "Import a calendar (.ics)",
        escolherArquivo: "Choose an .ics file",
        ondeAchar:
          "In Google Calendar: Settings → Import & export → §Export§ (it downloads a .zip with the .ics inside).",
        semEventos: "I found no events in that file. Export your calendar as .ics first.",
        erroLeitura: "I couldn't read the file.",
        precisaLogin: "You need to be signed in.",
        marcarTodos: "Select all",
        desmarcarTodos: "Clear all",
        resumo: (total, duplicados) =>
          `${total} ${total === 1 ? "event" : "events"} · ${duplicados > 0 ? `${duplicados} already here · ` : ""}pick what to create`,
        jaExiste: "already here",
        diaInteiro: "all day",
        repeticaoDiasUteis: "Weekdays",
        cancelar: "Cancel",
        importar: "Import",
        importarN: (n) => `Import ${n}`,
        toastImportado: (n) => `${n} ${n === 1 ? "event" : "events"} imported! 📅`,
      },
    },
    assinar: {
      titulo: "Subscribe on Google/Outlook",
      descricao: "A link that shows your blocks in your usual calendar, updating on its own",
      explicacao:
        "Subscribe to your schedule in Google Calendar, Outlook and others: they read this link and show your blocks, refreshing on their own. It is read-only — nobody edits your schedule from there.",
      carregando: "Loading…",
      copiar: "Copy",
      gerar: "Generate subscription link",
      gerarNovo: "Generate a new link (the old one stops working)",
      ondeColar:
        "In Google Calendar: §Other calendars → Add → From URL§, paste the link. Their end can take hours to refresh — Google resamples whenever it likes.",
      toastPronto: "Subscription link ready! 📆",
      toastCopiado: 'Link copied! Paste it into your calendar, under "subscribe from URL".',
      erroCopiar: "I could not copy it — select the link and copy it by hand.",
      erroSemTabela: "The feed table does not exist yet. Run supabase/calendar_feed.sql on Supabase.",
      erroCacheSchema:
        "The table exists, but the Supabase API cannot see it yet (schema cache). Wait a few seconds and reload.",
      erroPermissao: "No permission (RLS). Check that the calendar_feed.sql policies were created.",
    },
    compartilharAgenda: {
      titulo: "Share my hours",
      descricao: "A link for whoever needs to book time with you — no account, and no view of what you do",
    },
    notificacoes: {
      titulo: "Notifications",
      descricao: "Reminders and check-ins even with the app closed",
      nesteDispositivo: "Notifications on this device",
      suportado: "Turn it on for each device you want to be notified on (phone, computer).",
      naoSuportado:
        "Not supported in this browser. On iPhone: add the app to your home screen and enable it there.",
      toastDesativadas: "Notifications turned off on this device.",
      toastAtivadas: "Notifications on! 🔔",
      toastAtivadasDetalhe: "Reminders and check-ins arrive even with the app closed.",
      erroAtivar: "Could not turn it on",
    },
    telegram: {
      titulo: "Telegram",
      descricao: "Send the bot a message and it becomes a task",
      mandeParaOBot: "On Telegram, send the bot:",
      expiraEm: (mm) => `Expires in ${mm}.`,
      gerarCodigo: "Generate pairing code",
      conversasConectadas: "Connected chats",
      conversaSemNome: "Telegram chat",
      ultimaMensagem: (data) => `Last message on ${data}`,
      semMensagens: "No messages yet",
      ajudaComandos:
        "Any message becomes a task (first line = title). It also understands /hoje and /ajuda.",
      erroGerar: "Could not generate the code",
      tenteNovamente: "Try again.",
    },
    conta: { titulo: "Account", sair: "Sign out" },
  },
  compartilhar: {
    explicacao:
      "A link to send to whoever needs to book time with you — a client, a teacher, anyone. No account needed, and it shows only when you are busy: title, place and with whom never leave this app.",
    mostrarProximos: "Show the next",
    dias: (n) => `${n} days`,
    copiar: "Copy",
    criarLink: "Create schedule link",
    gerarNovo: "Generate a new link (revokes the old one)",
    desativar: "Turn off",
    carregando: "Loading…",
    toastCriado: "Link ready! Whoever opens it sees only your busy hours.",
    toastCopiado: "Link copied! Send it to whoever needs to book time with you.",
    toastDesativado: "Link turned off. Anyone who had it now sees a page that does not exist.",
    erroCopiar: "Could not copy — select the link and copy it manually.",
    erroSemTabela: "The table does not exist yet. Run supabase/agenda_publica.sql on Supabase.",
    erroCacheSchema:
      "The table exists, but the Supabase API cannot see it yet (schema cache). Wait a few seconds and reload.",
    erroPermissao: "No permission (RLS). Check that the agenda_publica.sql policies were created.",
  },
  tarefas: {
    nova: "New task",
    criar: "Create task",
    salvar: "Save",
    cancelar: "Cancel",
    vazio: "No tasks here yet. How about adding one?",
    listaGeral: "General",
    listaOutras: "Other",
    novaLista: "New list",
    nomeDaLista: "List name",
    excluirLista: "Delete list",
    escopos: { hoje: "Today", proximos: "Upcoming", todos: "All" },
    vazioHoje: "Nothing for today. 🎉",
    vazioProximos: "Nothing in the coming days.",
    vazioTodos: "No tasks.",
    concluidas: (n) => `Completed (${n})`,
    erroSemTabelaListas:
      "The lists table doesn't exist yet. Run supabase/task_lists.sql in Supabase.",
    erroExcluir: "I couldn't delete the task.",
    erroRepeticao: "I couldn't change the repeat right now.",
    toastRecorrente: "Recurring task completed! 🔁",
    toastRecorrenteDetalhe: (data) => `Next occurrence: ${data}`,
    toastSemXp: "Completed — no XP this time 😉",
    toastSemXpDetalhe: (minutos) => `Tasks created less than ${minutos} min ago don't earn XP.`,
    toastRepete: (rotulo) => `Repeats ${rotulo.toLowerCase()}`,
    toastNaoRepete: "Doesn't repeat anymore",
    repeticao: {
      naoRepete: "Doesn't repeat",
      diariamente: "Daily",
      semanalmente: "Weekly",
      mensalmente: "Monthly",
      anualmente: "Yearly",
      aCadaNDias: (dias) => `Every ${dias} ${dias === 1 ? "day" : "days"}`,
      aCadaNDiasVazio: "Every N days…",
    },
    prioridades: { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" },
    cartao: {
      concluir: "Complete task",
      marcarPendente: "Mark as pending",
      favoritar: "Add to favorites",
      desfavoritar: "Remove from favorites",
      editar: "Edit",
      excluir: "Delete",
      repetir: "Repeat",
      atrasada: "Overdue",
      faltamMinutos: (n) => `${n} min left`,
      faltamHoras: (n) => `${n} h left`,
      faltamDias: (n) => `${n} ${n === 1 ? "day" : "days"} left`,
      entrar: "Join",
      copiarLinkReuniao: "Copy meeting link",
      toastLinkReuniao: "Meeting link copied!",
      emAndamento: "In progress",
      iniciar: "Start",
    },
    dialogo: {
      editarTitulo: "Edit task",
      novaTitulo: "New task",
      tituloPlaceholder: "What needs to be done?",
      descricaoPlaceholder: "Description (optional)",
      prioridade: "Priority",
      tempoEstimado: "Estimated time",
      personalizarTempo: "Custom",
      vencimento: "Due",
      semData: "No date",
      hoje: "Today",
      amanha: "Tomorrow",
      emNDias: (n) => `in ${n} ${n === 1 ? "day" : "days"}`,
      emXDias: "In X days",
      data: "Date",
      reuniao: "Meeting",
      opcional: "Optional",
      linkPlaceholder: "Paste the link — Meet, Zoom, Teams…",
      copiarLink: "Copy link",
      toastLinkCopiado: "Link copied!",
      horario: "Time",
      horarioDoCompromisso: "Meeting time",
      escolher: "Pick",
      limpar: "clear",
      semDataVale: (hora) => `No date chosen — it applies to today at ${hora}.`,
      localPlaceholder: "Place — room, address…",
      adicionarLocal: "Add a place (in person)",
      repetir: "Repeat",
      personalizado: "Custom",
      aCadaNDias: (dias) => `every ${dias} ${dias === 1 ? "day" : "days"}`,
      avancaSozinho: "On completion, the due date moves to the next occurrence by itself.",
      precisaLogin: "You need to be signed in",
    },
  },
  amigos: {
    erros: {
      precisaLogin: "You need to be signed in",
      usuarioCurto: "Use at least 3 characters (letters, numbers and _)",
      usuarioEmUso: "That @username is taken — try another",
      jaSaoAmigos: "You're already friends (or the request is on its way).",
      voceMesmo: "That's you! 😄",
      usuarioInexistente: "User not found.",
      naoSaoAmigos: "You two aren't friends yet.",
      agendaPrivada: "This friend doesn't share their schedule.",
      escritorioPrivado: "This friend keeps their office private.",
      conviteInvalido: "Fill in the title and a valid time.",
      conviteInexistente: "Invite not found (already answered?).",
      generico: "That didn't work. Try again.",
    },
    dica: "§Tip:§ on a friend, use §📅 Schedule§ to see today's busy hours (if they turned on the “Schedule” chip) and §➕ Invite§ to propose a meeting — once accepted, it goes into both your calendars automatically.",
    privacidade: {
      ocupadoLivre: "Busy/free",
      escritorio: "Office",
      nivel: "Level",
      agenda: "Schedule",
      perfilAberto: "Open profile",
      dica: (veem, oQue) => `Friends ${veem ? "can see" : "can NOT see"}: ${oQue}`,
    },
    escolherUsuario: {
      titulo: "Pick your @username",
      ajuda: "It is how your friends will find you in search. Lowercase letters, numbers and _ (3–20).",
      placeholder: "your_username",
      criar: "Create",
      toastPronto: (usuario) => `All set, @${usuario}! Your friends can find you now.`,
    },
    buscaPlaceholder: "Search by @username or name…",
    regiaoPlaceholder: "Your area — e.g. Austin, TX (optional)",
    toastRegiaoSalva: "Area saved — we will put people nearby first.",
    toastRegiaoRemovida: "Area removed.",
    sugeridos: "Suggested for you",
    mesmaRegiao: "same area",
    adicionar: "Add",
    toastPedidoEnviado: (usuario) => `Request sent to @${usuario}`,
    toastAgoraAmigos: "You are friends now! 🎉",
    pedidos: "Friend requests",
    aceitar: "Accept",
    recusar: "Decline",
    toastAmizadeAceita: (usuario) => `You and @${usuario} are friends now! 🎉`,
    ocupado: "Busy",
    livre: "Free",
    privado: "private",
    verAgenda: "See today's busy hours",
    convidar: "Invite to a meeting",
    visitar: "Visit their office",
    desfazer: "Remove friend",
    cancelarPedido: "Cancel request",
    vazio: "Search a friend by @ to get started — you can see whether they are free and visit their office. 👀",
    convitesRecebidos: {
      titulo: "Meeting invites",
      de: "from",
      para: "to",
      online: "online",
      aguardando: "waiting",
      cancelar: "Cancel invite",
      toastConfirmado: "Meeting confirmed — it is already in both your calendars! 📅",
    },
    agendaDoDia: {
      titulo: (nome) => `Today, ${nome} is…`,
      livreODiaTodo: "Free all day! 🎉",
      ocupado: "busy",
      aviso: "Only the hours are shared — never what the person is doing.",
      convidarLivre: "Invite them to a free slot",
    },
    visita: {
      titulo: (nome) => `${nome}'s office`,
      nivel: (n) => `Lvl ${n}`,
      itens: (n) => `${n} ${n === 1 ? "item" : "items"} earned — and how is yours doing? 😉`,
      carregando3d: "Loading 3D…",
    },
    convite: {
      titulo: (nome) => `Invite ${nome}`,
      tituloPlaceholder: "Title — e.g. Alignment meeting",
      das: "From",
      as: "to",
      sugerir: "Suggest a time you are both free",
      semJanela: (minutos) => `No ${minutos}min window free for both of you that day.`,
      linkPlaceholder: "Link — Meet, Zoom… (optional)",
      localPlaceholder: "Place — room, address… (optional)",
      aviso: "Once the invite is accepted, the meeting lands in both your calendars automatically.",
      cancelar: "Cancel",
      enviar: "Send invite",
      toastEnviado: (usuario) => `Invite sent to @${usuario}! When they accept, it lands in both calendars.`,
    },
  },
  favoritos: {
    vazio: "Nothing favorited yet. Tap the ⭐ on a task or note to see it here.",
    tarefas: (n) => `Tasks (${n})`,
    notas: (n) => `Notes (${n})`,
    verTodas: "See all",
    remover: "Remove from favorites",
    notaSemTitulo: "Untitled",
    notaVazia: "Empty",
  },
  notas: {
    nova: "New note",
    vazio: "No notes yet. Click §New note§ to start writing.",
    semTitulo: "Untitled",
    vazia: "Empty",
    tituloPlaceholder: "Title",
    escrevaAqui: "Start writing...",
    selecione: "Pick a note, or create a new one.",
    salvando: "Saving…",
    salvo: "Saved",
    favoritar: "Add to favorites",
    desfavoritar: "Remove from favorites",
    excluir: "Delete note",
    corDaNota: "Note color",
    semCor: "No color",
    cores: {
      ambar: "Amber",
      coral: "Coral",
      rosa: "Pink",
      violeta: "Violet",
      azul: "Blue",
      verde: "Green",
    },
    erroSemColunaCor:
      "The notes table has no color column yet. Run supabase/notas_cor.sql in Supabase.",
    erroSalvarCor: "I couldn't save the color right now.",
    editor: {
      desfazer: "Undo (Ctrl+Z)",
      refazer: "Redo (Ctrl+Y)",
      negrito: "Bold",
      italico: "Italic",
      sublinhado: "Underline",
      tamanhos: { pequeno: "S", medio: "M", grande: "L" },
      tamanhoDica: (letra) => `Size ${letra}`,
      titulo: "Heading",
      lista: "List",
      listaNumerada: "Numbered list",
      cores: "Colors",
      corDoTexto: "Text color",
      fundoMarcaTexto: "Background (highlight)",
      corPadrao: "Default",
      semFundo: "No background",
      paleta: {
        vermelho: "Red",
        laranja: "Orange",
        amarelo: "Yellow",
        verde: "Green",
        azul: "Blue",
        roxo: "Purple",
        rosa: "Pink",
      },
      imagem: "Image",
      diminuir: "Smaller",
      aumentar: "Bigger",
      concluir: "Done",
    },
  },
  ia: {
    limiteAtingido:
      "Neuro is taking a nap 😴 The free AI limit was reached for now — try again in a moment.",
    limiteAtingidoVoz: "I'm taking a little nap 😴 The free AI limit was reached for now.",
    novaConversa: "New chat",
    conversas: "Chats",
    desafixar: "Unpin",
    fixar: "Pin",
    excluir: "Delete",
    saudacao: "Hi! I'm Neuro IA",
    subtitulo: "I can organise your day, prioritise tasks and help you focus.",
    leuAnotacoes: "I read today's notes",
    placeholder: "Ask anything…",
    pararGravacao: "Stop recording",
    gravarAudio: "Record audio",
    enviar: "Send",
    conversarPorVoz: "Talk by voice",
    gravando: "Recording… tap the square to transcribe",
    transcrevendo: "Transcribing your audio…",
    erroResposta: "I couldn't reply right now. Try again.",
    erroConexao: "There was a connection error. Try again.",
    erroTranscricao: "I couldn't transcribe the audio.",
    erroTranscricaoGenerica: "Error transcribing the audio.",
    erroMicrofone: "Couldn't access the microphone. Check your browser permission.",
    atalhosPadrao: [
      "Organise my day based on my notes",
      "What should my top 3 priorities be today?",
      "Suggest focus blocks for the afternoon",
      "How can I improve my focus today?",
    ],
    atalhoPlaceholder: "What do you want to ask…",
    removerAtalho: "Remove shortcut",
    adicionar: "Add",
    restaurarPadrao: "Restore defaults",
    concluir: "Done",
    editarAtalhos: "Edit shortcuts",
    criarAtalho: "Create a shortcut",
    respostaFallback: "Sorry, I couldn't reply right now.",
    erroConexaoVoz: "I had a connection problem.",
    naoOuvi: "I couldn't hear you — tap the microphone and try again?",
    gravandoToqueEnviar: "Recording… tap again to send",
    permissaoMicNegada: "Microphone permission denied.",
    statusDescansando: "Resting 😴",
    statusOuvindo: "Listening…",
    statusPensando: "Thinking…",
    statusFalando: "Speaking…",
    statusToqueParaFalar: "Tap the microphone to talk",
    encerrarConversa: "End conversation",
    semSuporteVoz: "Your browser doesn't support live voice recognition. Use §Chrome§ or §Edge§.",
    acordarPlano: "Wake Neuro up with the unlimited plan",
    emBreve: "(coming soon)",
    tentarDeNovo: "Try again",
    sim: "Yes",
    nao: "No",
    enviarFalado: "Send what you said",
    tocarParaFalar: "Tap to talk",
    podeFalarAVontade: "Feel free to talk. Tap again to send.",
    toqueMicUseFones: "Tap the microphone to talk. Use headphones for best results.",
  },
  escritorio: {
    semWebgl: {
      titulo: "Your office needs 3D",
      texto: "This browser has no WebGL. The shop and the avatar still work — open it in another browser to see the room.",
    },
    editarAvatar: "Edit avatar",
    carregando3d: "Loading 3D…",
    salvarCompartilharImagem: "Save / share office image",
    abraParaGerarImagem: "Open the 3D office to generate the image.",
    tituloCompartilhamento: "My office on NeuroTask 🏢",
    imagemBaixada: "Office image downloaded! 📸",
    imagemCompartilhada: "Office shared! 📸",
    erroGerarImagem: "Couldn't generate the image.",
    vazio: "Your corner starts simple — decorate it with your productivity.",
    itensConquistados: (n) => `${n} ${n === 1 ? "item earned" : "items earned"}`,
    corDeFundo: "Background colour",
    corPersonalizada: "Custom colour",
    fundoCorPersonalizadaAria: "Background: custom colour",
    fundoAria: (nome) => `Background: ${nome}`,
    fundoNomes: {
      automatico: "Automatic (theme)",
      ceu: "Sky",
      lavanda: "Lavender",
      pessego: "Peach",
      menta: "Mint",
      argila: "Clay",
      noite: "Night",
      grafite: "Graphite",
    },
    avatarEditor: {
      corpo: "Body",
      cabelo: "Hair",
      pele: "Skin",
      roupa: "Outfit",
      calca: "Trousers",
      ternoAvisoCalca: "With a suit, the trousers follow the jacket colour.",
      fones: (ligado) => `Headphones ${ligado ? "on" : "off"}`,
      cancelar: "Cancel",
      salvar: "Save",
      cabeloEstilos: {
        curto: "Short",
        franja: "Fringe",
        cacheado: "Curly",
        longo: "Long",
        coque: "Bun",
        raspado: "Buzzcut",
      },
      roupas: {
        camiseta: "T-shirt",
        moletom: "Hoodie",
        jaqueta: "Jacket",
        terno: "Suit",
      },
      corpoTipos: {
        m: "Male",
        f: "Female",
      },
    },
    loja: {
      titulo: "Shop",
      categorias: {
        chapeu: "Hats",
        oculos: "Glasses",
        vida: "Plants & pets",
        luz: "Light",
        enfeite: "Decor",
        movel: "Furniture",
        cadeira: "Chair",
        setup: "Setup",
        parede: "Wall",
        piso: "Floor",
      },
      previa: (nome) => `Preview · ${nome}`,
      noEscritorio: "In the office",
      guardado: "Stored",
      guardar: "Store",
      equipar: "Equip",
      comprar: "Buy",
      moedasInsuficientes: "Not enough coins",
      itemComprado: (emoji, nome) => `${emoji} ${nome} is yours! Already in the office.`,
      avatarAtualizado: "Avatar updated! ✨",
      itens: {
        "oculos-grau": { nome: "Reading glasses", desc: "Looks like you read a lot" },
        "oculos-escuros": { nome: "Sunglasses", desc: "Focus, but make it stylish" },
        "chapeu-bone": { nome: "Cap", desc: "An everyday classic" },
        "chapeu-social": { nome: "Top hat", desc: "Elegance for the home office" },
        "chapeu-gorro": { nome: "Wool beanie", desc: "With a rolled brim and a pompom" },
        "chapeu-capuz": { nome: "Hood", desc: "Focus mode, talking to no one" },
        "chapeu-coroa": { nome: "Golden crown", desc: "For whoever rules the routine" },
        "chapeu-aureola": { nome: "Halo", desc: "Floats above the head, glowing" },
        "planta-pequena": { nome: "Small plant", desc: "A touch of life on the desk" },
        luminaria: { nome: "Lamp", desc: "Warm light in the corner" },
        "quadro-montanhas": { nome: "Frame · Mountains", desc: "A landscape to breathe in" },
        tapete: { nome: "Rug", desc: "Comfort underfoot" },
        "planta-grande": { nome: "Large plant", desc: "A swiss cheese plant in the corner" },
        estante: { nome: "Bookshelf", desc: "Your personal library" },
        "mesa-centro": { nome: "Coffee table", desc: "With a book and a mug on top" },
        sofa: { nome: "Sofa", desc: "Two seats against the wall" },
        poltrona: { nome: "Armchair", desc: "Loose on the floor, facing the desk" },
        "quadro-neon": { nome: "\"Focus\" neon", desc: "A neon sign on the wall" },
        "janela-cidade": { nome: "Window · City", desc: "A view over the city" },
        "pet-gato": { nome: "Pet cat", desc: "Productivity company" },
        "pet-cachorro": { nome: "Dog (Beagle)", desc: "A 3D beagle that moves on the rug" },
        trofeu: { nome: "Golden trophy", desc: "Proof you've come far" },
        "cadeira-ergonomica": { nome: "Ergonomic chair", desc: "Goodbye, back pain" },
        "cadeira-gamer": { nome: "Gaming chair", desc: "Red and imposing" },
        relogio: { nome: "Wall clock", desc: "Time passing on the wall" },
        prateleira: { nome: "Shelf", desc: "Books, a vase and a mug on top" },
        "led-rgb": { nome: "RGB LED strip", desc: "Outlines the ceiling with colour" },
        "setup-notebook": { nome: "Setup · Laptop", desc: "Just the laptop, clean desk" },
        "setup-duplo": { nome: "Setup · 2 monitors", desc: "Double the productivity" },
        "setup-ultrawide": { nome: "Setup · Ultrawide", desc: "The dream monitor" },
        "parede-azul": { nome: "Blue wall", desc: "A serene, focused tone" },
        "parede-verde": { nome: "Green wall", desc: "Calming forest green" },
        "parede-rosa": { nome: "Pink wall", desc: "Soft and cosy pink" },
        "parede-cinza": { nome: "Grey wall", desc: "Sober concrete" },
        "parede-preta": { nome: "Black wall", desc: "Dark backdrop, focus on what shines" },
        "parede-papel": { nome: "Striped wallpaper", desc: "Vertical stripes, not just colour" },
        "parede-terracota": { nome: "Terracotta wall", desc: "Warm, enclosed clay" },
        "parede-mostarda": { nome: "Mustard wall", desc: "Burnt yellow, without shouting" },
        "parede-oliva": { nome: "Olive wall", desc: "Dark studio green" },
        "parede-cimento": { nome: "Burnt cement", desc: "Mottled, like polished concrete" },
        "parede-tijolinho": { nome: "Exposed brick", desc: "Visible courses, mortar and all" },
        "parede-ripada": { nome: "Wood slats", desc: "Vertical slats with a gap" },
        "piso-madeira": { nome: "Wood floor", desc: "Running boards, with seams" },
        "piso-carpete": { nome: "Carpet", desc: "Soft, bluish flooring" },
        "piso-madeira-escura": { nome: "Dark wood", desc: "Walnut-toned boards" },
        "piso-porcelanato": { nome: "Porcelain tile", desc: "Large tile with grout" },
        "piso-cimento": { nome: "Burnt cement", desc: "Smooth, grey and seamless" },
      },
      erros: {
        saldoInsuficiente: "Not enough coins — finish more tasks! 💪",
        jaComprado: "You already have this item.",
        itemInexistente: (arquivo) => `This item doesn't exist in the database yet. Run supabase/${arquivo} on Supabase.`,
      },
    },
  },
}

const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en }

export function dicionario(idioma: Idioma): Dicionario {
  return DICIONARIOS[idioma] ?? DICIONARIOS[IDIOMA_DEFAULT]
}

/**
 * Uma repetição virando texto. Mora aqui, e não em lib/task-recurrence, porque
 * é a única metade da repetição que depende do idioma — o módulo de datas
 * decide QUAL repetição é, este decide como ela se diz.
 */
export function textoDaRepeticao(d: Dicionario, r: Repeticao): string {
  return r.chave === "aCadaNDias"
    ? d.tarefas.repeticao.aCadaNDias(r.dias ?? 1)
    : d.tarefas.repeticao[r.chave]
}

/**
 * As iniciais dos sete dias, começando no domingo — o cabeçalho do calendário
 * de escolher data.
 *
 * Sai do `Intl` em vez de uma lista escrita à mão porque a lista à mão estava
 * ERRADA em qualquer idioma que não o português: `["D","S","T","Q","Q","S","S"]`
 * é uma constante que ninguém lembraria de traduzir. Em pt-BR o Intl devolve
 * exatamente essas sete letras; em en-US, "S M T W T F S".
 *
 * O 4 de junho de 2023 é um domingo, e é só disso que a conta precisa.
 */
export function iniciaisDaSemana(locale: string): string[] {
  const domingo = new Date(2023, 5, 4)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo)
    d.setDate(domingo.getDate() + i)
    return d.toLocaleDateString(locale, { weekday: "narrow" })
  })
}

export function idiomaDaRegiao(regiao: Regiao): Idioma {
  return regiao === "US" ? "en" : "pt"
}

/** O idioma do app: formato de hora → região → idioma, sem dado novo guardado. */
export function idiomaDoFormato(formato: TimeFormat): Idioma {
  return idiomaDaRegiao(regiaoDoFormato(formato) ?? REGIAO_DEFAULT)
}

/**
 * O idioma de quem ABRE um link público, a partir de `navigator.languages`.
 *
 * O padrão aqui é INGLÊS, ao contrário do resto do app. Quem chega numa página
 * pública sem falar português também não fala: mostrar inglês para um navegador
 * em francês é um palpite útil; mostrar português é insistir num que já falhou.
 * Só cai em português quando o navegador realmente pede português.
 */
export function idiomaDoNavegador(idiomas: readonly string[] | undefined): Idioma {
  for (const tag of idiomas ?? []) {
    const base = String(tag).toLowerCase().split("-")[0]
    if (base === "pt") return "pt"
    if (base === "en") return "en"
  }
  return "en"
}
