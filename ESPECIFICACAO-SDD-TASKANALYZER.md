# ENTREGÁVEL 1 — DOCUMENTO (Google Docs)

> Título do documento: **Especificação SDD TaskAnalyzer - [SEU NOME COMPLETO]**

---

# 1. VISÃO GERAL E CONTRATO DE NEGÓCIO (SDD)

## 1.1 Identificação

| Campo | Valor |
|---|---|
| Nome completo | [PREENCHER] |
| Curso | [PREENCHER] |
| Polo/Turma | [PREENCHER] |
| E-mail institucional | [PREENCHER]@sempre.uniceub.edu.br |
| Data de elaboração | [PREENCHER] |
| Versão da especificação | 1.0 |

## 1.2 Propósito do módulo TaskAnalyzer

O **TaskAnalyzer** é um módulo de análise de tarefas e produtividade. Ele recebe um
conjunto de tarefas já executadas e devolve métricas agregadas que respondem a três
perguntas objetivas:

1. **Quanto tempo se leva para concluir uma tarefa?** — tempo médio de conclusão.
2. **Com que frequência o prazo é estourado?** — taxa de atraso.
3. **Esse comportamento muda conforme a urgência?** — os dois indicadores acima,
   reabertos por prioridade.

O domínio de dados é o do **NeuroTask**, aplicativo de produtividade já existente: os
nomes e os valores de `status` e `prioridade` do contrato abaixo são exatamente os que a
tabela `tasks` do NeuroTask usa. A decisão é deliberada — um contrato que renomeasse os
valores obrigaria uma camada de tradução entre o aplicativo e o analisador, e essa camada
seria mais uma fonte de erro sem nenhum ganho.

**Está no escopo:**

- Cálculo do tempo médio de conclusão, em minutos.
- Cálculo da taxa de atraso, em pontos percentuais.
- Abertura das duas métricas por prioridade.
- Validação das tarefas recebidas e sinalização de entrada inconsistente por exceção.

**Está fora do escopo (e não deve ser implementado):**

- Persistência de dados: o módulo não lê nem escreve arquivo, banco ou rede.
- Leitura do relógio do sistema. O relatório é função exclusiva da entrada — a mesma
  lista produz o mesmo resultado hoje e daqui a um ano. É essa propriedade que permite
  que os cenários de aceite virem testes automatizados com valores exatos.
- Interface de usuário, gráficos e formatação de relatório.
- Previsão, recomendação ou qualquer inferência estatística além das médias definidas.

## 1.3 Contrato executável de interface

### 1.3.1 Tipos de domínio

```python
Prioridade = Literal["low", "medium", "high", "urgent"]
Status = Literal["pending", "in_progress", "completed", "cancelled"]
```

A ordem das prioridades, quando houver necessidade de ordenar, é
`low < medium < high < urgent`.

### 1.3.2 Estrutura de entrada — `Tarefa`

```python
@dataclass(frozen=True)
class Tarefa:
    id: str
    titulo: str
    status: Status
    prioridade: Prioridade
    criada_em: datetime
    prazo: datetime | None = None
    concluida_em: datetime | None = None
    iniciada_em: datetime | None = None
```

| Campo | Tipo | Obrigatório | Descrição e restrições |
|---|---|---|---|
| `id` | `str` | Sim | Identificador único da tarefa. Não vazio. |
| `titulo` | `str` | Sim | Rótulo da tarefa. Não participa de nenhum cálculo; existe para que a mensagem de erro identifique a tarefa de forma legível. |
| `status` | `Status` | Sim | Um dos quatro valores literais. Qualquer outro valor é entrada inválida. |
| `prioridade` | `Prioridade` | Sim | Um dos quatro valores literais. Qualquer outro valor é entrada inválida. |
| `criada_em` | `datetime` | Sim | Momento de criação. Deve ser *timezone-aware* em UTC. |
| `prazo` | `datetime \| None` | Não | Prazo acordado. `None` significa tarefa sem prazo, que **nunca** conta como atrasada. |
| `concluida_em` | `datetime \| None` | Não | Momento da conclusão. Obrigatório quando `status == "completed"`; deve ser `None` nos demais status. |
| `iniciada_em` | `datetime \| None` | Não | Momento do início da execução. Quando ausente, o tempo de conclusão é medido a partir de `criada_em`. |

Todo `datetime` recebido deve ser *timezone-aware* e em UTC. `datetime` ingênuo (sem
fuso) é entrada inválida: comparar um instante com fuso e outro sem fuso levanta
`TypeError` no Python, e o erro apareceria longe do ponto real do problema.

### 1.3.3 Estruturas de saída

```python
@dataclass(frozen=True)
class IndicadorPrioridade:
    prioridade: Prioridade
    total_tarefas: int
    total_concluidas: int
    tempo_medio_conclusao_min: float | None
    taxa_atraso_pct: float | None


@dataclass(frozen=True)
class RelatorioProdutividade:
    total_tarefas: int
    total_concluidas: int
    tempo_medio_conclusao_min: float
    taxa_atraso_pct: float
    indicadores_por_prioridade: dict[Prioridade, IndicadorPrioridade]
```

| Campo | Tipo | Descrição |
|---|---|---|
| `total_tarefas` | `int` | Quantidade de tarefas recebidas, de qualquer status. |
| `total_concluidas` | `int` | Quantidade com `status == "completed"`. |
| `tempo_medio_conclusao_min` | `float` | Média aritmética do tempo de conclusão das tarefas concluídas, em minutos, arredondada a 2 casas decimais. |
| `taxa_atraso_pct` | `float` | Percentual de tarefas concluídas em atraso sobre o total de concluídas, arredondado a 2 casas decimais. Valor entre `0.0` e `100.0`. |
| `indicadores_por_prioridade` | `dict[Prioridade, IndicadorPrioridade]` | Sempre com as **quatro** chaves de prioridade, mesmo as sem nenhuma tarefa. Ausência de chave obrigaria todo consumidor a tratar `KeyError`. |

Nos campos de `IndicadorPrioridade`, `tempo_medio_conclusao_min` e `taxa_atraso_pct` são
`None` quando aquela prioridade não tem nenhuma tarefa concluída. `None` e `0.0` são
fatos diferentes — devolver `0.0` afirmaria "nenhuma tarefa atrasou", quando o correto é
"não há o que medir".

### 1.3.4 Assinaturas públicas

```python
def calcular_metricas(tarefas: Sequence[Tarefa]) -> RelatorioProdutividade: ...

def tempo_de_conclusao_min(tarefa: Tarefa) -> float: ...

def esta_atrasada(tarefa: Tarefa) -> bool: ...

def validar_tarefa(tarefa: Tarefa) -> None: ...
```

| Função | Parâmetros | Retorno | Responsabilidade |
|---|---|---|---|
| `calcular_metricas` | `tarefas: Sequence[Tarefa]` | `RelatorioProdutividade` | Ponto de entrada do módulo. Valida a coleção inteira e agrega as métricas. |
| `tempo_de_conclusao_min` | `tarefa: Tarefa` | `float` | Tempo de conclusão de **uma** tarefa concluída, em minutos. |
| `esta_atrasada` | `tarefa: Tarefa` | `bool` | Se a tarefa concluída estourou o prazo. |
| `validar_tarefa` | `tarefa: Tarefa` | `None` | Levanta exceção quando a tarefa viola qualquer restrição de 1.3.5. Não devolve valor: ausência de exceção significa tarefa válida. |

### 1.3.5 Regras de negócio e restrições

**RN-01 — Universo de cálculo.** Somente tarefas com `status == "completed"` entram no
cálculo das médias e da taxa de atraso. Tarefas `pending`, `in_progress` e `cancelled`
contam apenas em `total_tarefas`.

**RN-02 — Tempo de conclusão.** Para uma tarefa concluída:
`tempo = concluida_em - iniciada_em` quando `iniciada_em` existir; caso contrário
`tempo = concluida_em - criada_em`. O resultado é convertido para minutos
(`total_seconds() / 60`).

**RN-03 — Tarefa em atraso.** Uma tarefa concluída está em atraso quando
`prazo is not None and concluida_em > prazo`. A comparação é estritamente maior:
concluir exatamente no instante do prazo **não** é atraso.

**RN-04 — Taxa de atraso.** `(concluídas em atraso / total de concluídas) * 100`.
Tarefas concluídas sem prazo entram no denominador e nunca no numerador.

**RN-05 — Arredondamento.** Todo valor de saída `float` é arredondado a 2 casas decimais
com a função `round` da biblioteca padrão, aplicada **uma única vez**, sobre o resultado
final da agregação. Arredondar valores intermediários acumularia erro.

**RN-06 — Agregação por prioridade.** Cada `IndicadorPrioridade` aplica RN-01 a RN-05
sobre o subconjunto de tarefas daquela prioridade. As quatro chaves estão sempre
presentes; uma prioridade sem tarefas tem `total_tarefas = 0`, `total_concluidas = 0` e
as duas métricas em `None`.

**RN-07 — Determinismo.** O relatório depende exclusivamente da lista recebida. O módulo
não consulta o relógio do sistema, não gera números aleatórios e não depende da ordem dos
elementos da lista.

**RN-08 — Consistência temporal.** Para toda tarefa: `criada_em <= iniciada_em` quando
ambos existirem; `iniciada_em <= concluida_em` quando ambos existirem; e
`criada_em <= concluida_em` quando `concluida_em` existir.

**RN-09 — Coerência entre status e conclusão.** `status == "completed"` exige
`concluida_em is not None`. Qualquer outro status exige `concluida_em is None`.

**RN-10 — Validação antecipada.** `calcular_metricas` valida **todas** as tarefas antes de
calcular qualquer métrica. Um relatório nunca é parcialmente calculado sobre dados que
depois se revelariam inválidos.

### 1.3.6 Exceções

```python
class TaskAnalyzerError(Exception): ...
class TarefaInvalidaError(TaskAnalyzerError): ...
class SemTarefasConcluidasError(TaskAnalyzerError): ...
```

| Exceção | Quando é levantada | Conteúdo obrigatório da mensagem |
|---|---|---|
| `TarefaInvalidaError` | Violação de qualquer restrição de 1.3.2, RN-08 ou RN-09. | O `id` e o `titulo` da tarefa, e qual regra foi violada. |
| `SemTarefasConcluidasError` | A coleção recebida não tem nenhuma tarefa com `status == "completed"` — inclusive quando a lista está vazia. | Quantas tarefas foram recebidas e que nenhuma está concluída. |

`SemTarefasConcluidasError` é o tratamento explícito da **divisão por zero**: sem tarefas
concluídas, o denominador das duas métricas globais é zero. A escolha é levantar exceção,
e não devolver `None`, porque `RelatorioProdutividade` declara os dois campos globais como
`float`. Um relatório com métricas ausentes seria um relatório que não cumpre o próprio
contrato de tipos.

Ambas herdam de `TaskAnalyzerError`, de modo que o consumidor possa capturar qualquer
falha do módulo com uma cláusula só, sem capturar `Exception` genérica.

---

# 2. ESPECIFICAÇÃO DE CENÁRIOS DE ACEITE E TEST HARNESS

## 2.1 Cenários de aceite (Dado — Quando — Então)

Todos os instantes abaixo são UTC. Os valores esperados são exatos e foram escolhidos
para não depender de modo de arredondamento.

### Cenário 1 — Sucesso: métricas corretas sobre tarefas válidas

**Dado** o conjunto de 5 tarefas:

| id | prioridade | status | criada_em | concluida_em | prazo | tempo (min) | atrasada |
|---|---|---|---|---|---|---|---|
| T1 | `high` | `completed` | 2026-03-02 09:00 | 2026-03-02 10:00 | 2026-03-02 12:00 | 60 | não |
| T2 | `high` | `completed` | 2026-03-03 09:00 | 2026-03-03 11:00 | 2026-03-03 10:00 | 120 | sim |
| T3 | `low` | `completed` | 2026-03-04 08:00 | 2026-03-04 08:30 | 2026-03-05 08:00 | 30 | não |
| T4 | `low` | `completed` | 2026-03-05 08:00 | 2026-03-05 08:40 | 2026-03-05 09:00 | 40 | não |
| T5 | `medium` | `pending` | 2026-03-06 08:00 | — | 2026-03-07 08:00 | — | — |

**Quando** `calcular_metricas([T1, T2, T3, T4, T5])` for executado,

**Então** o retorno deve ser exatamente:

| Campo | Valor esperado |
|---|---|
| `total_tarefas` | `5` |
| `total_concluidas` | `4` |
| `tempo_medio_conclusao_min` | `62.5` — (60+120+30+40)/4 |
| `taxa_atraso_pct` | `25.0` — 1 atrasada em 4 concluídas |

**E** `indicadores_por_prioridade` deve conter as quatro chaves:

| prioridade | `total_tarefas` | `total_concluidas` | `tempo_medio_conclusao_min` | `taxa_atraso_pct` |
|---|---|---|---|---|
| `low` | 2 | 2 | `35.0` | `0.0` |
| `medium` | 1 | 0 | `None` | `None` |
| `high` | 2 | 2 | `90.0` | `50.0` |
| `urgent` | 0 | 0 | `None` | `None` |

Os valores diferem entre os três níveis (global, `low` e `high`) de propósito: um erro de
agrupamento que jogasse tarefas na prioridade errada mudaria pelo menos um dos números.

### Cenário 2 — Exceção: entrada inválida ou ausência de tarefas concluídas

**Cenário 2.a — Data de conclusão anterior à criação**

**Dado** a tarefa `T6`, com `status = "completed"`, `criada_em = 2026-03-02 09:00` e
`concluida_em = 2026-03-02 08:00`,

**Quando** `calcular_metricas([T6])` for executado,

**Então** deve ser levantada `TarefaInvalidaError`, com mensagem contendo o `id` `"T6"` e
a indicação de que a conclusão é anterior à criação (RN-08). **E** nenhuma métrica deve
ser calculada nem devolvida.

**Cenário 2.b — Status concluído sem data de conclusão**

**Dado** a tarefa `T7`, com `status = "completed"` e `concluida_em = None`,

**Quando** `calcular_metricas([T7])` for executado,

**Então** deve ser levantada `TarefaInvalidaError`, citando `"T7"` e a violação da RN-09.

**Cenário 2.c — Nenhuma tarefa concluída (divisão por zero)**

**Dado** o conjunto `[T5, T8]`, ambas com `status = "pending"`,

**Quando** `calcular_metricas([T5, T8])` for executado,

**Então** deve ser levantada `SemTarefasConcluidasError`, com mensagem informando que 2
tarefas foram recebidas e nenhuma está concluída. **E** a exceção deve ocorrer **antes**
de qualquer divisão, e não como consequência de uma `ZeroDivisionError` capturada.

**Cenário 2.d — Lista vazia**

**Dado** a lista `[]`,

**Quando** `calcular_metricas([])` for executado,

**Então** deve ser levantada `SemTarefasConcluidasError`. Lista vazia é o caso limite de
"nenhuma tarefa concluída" e não recebe tratamento próprio.

### Cenário 3 — Casos de borda de prazo

**Dado** a tarefa `T9`, concluída exatamente no instante do prazo
(`concluida_em == prazo == 2026-03-02 10:00`), e a tarefa `T10`, concluída sem prazo
(`prazo = None`), ambas com `status = "completed"`,

**Quando** `calcular_metricas([T9, T10])` for executado,

**Então** `taxa_atraso_pct` deve ser `0.0`: concluir no instante do prazo não é atraso
(RN-03) e tarefa sem prazo nunca é atraso (RN-04), embora ambas contem no denominador.

### Cenário 4 — Independência da ordem

**Dado** o mesmo conjunto do Cenário 1, em ordem invertida,

**Quando** `calcular_metricas` for executado,

**Então** o relatório deve ser igual, campo a campo, ao do Cenário 1 (RN-07).

## 2.2 Planejamento do Test Harness

O Test Harness é o conjunto de testes automatizados que transforma os cenários acima em
verificação executável. Ele é escrito na **Fase 2**, em `tests/test_harness.py`, com
**pytest**, e é o critério objetivo de aceite do código gerado por IA.

**Da especificação ao teste**

| Origem | Vira | Forma |
|---|---|---|
| Cenário 1 | `test_metricas_globais_do_conjunto_valido` e `test_indicadores_por_prioridade` | Asserções de igualdade exata contra a tabela de valores esperados. |
| Cenários 2.a e 2.b | `test_tarefa_invalida_levanta_excecao` | `pytest.raises(TarefaInvalidaError)`, com `match` sobre o `id` da tarefa. |
| Cenários 2.c e 2.d | `test_sem_tarefas_concluidas_levanta_excecao` | `pytest.raises(SemTarefasConcluidasError)`. |
| Cenário 3 | `test_prazo_exato_e_sem_prazo_nao_sao_atraso` | Asserção sobre `taxa_atraso_pct`. |
| Cenário 4 | `test_resultado_independe_da_ordem` | Compara o relatório de duas ordenações da mesma lista. |
| RN-02 e RN-03 | `test_tempo_de_conclusao_min` e `test_esta_atrasada` | `@pytest.mark.parametrize`, uma linha por caso da regra. |

**Organização**

- `tests/conftest.py` concentra as *fixtures* que constroem as tarefas dos cenários. Os
  dados de teste ficam em um lugar só; um cenário que mude na especificação muda em um
  ponto do código.
- Cada teste tem uma única razão para falhar. Um teste que verificasse métricas globais e
  por prioridade ao mesmo tempo não diria qual das duas quebrou.
- Nenhum teste usa `datetime.now()`, rede, arquivo ou banco. A RN-07 garante que isso é
  possível; um teste que dependesse do relógio passaria hoje e falharia amanhã.

**Critérios de aceite do harness**

1. Todos os testes passam com `pytest -v`, sem nenhum teste marcado como `skip` ou
   `xfail`.
2. Cobertura de linhas de `src/` igual ou superior a **90%**, medida com
   `pytest --cov=src`.
3. Cada regra de negócio de 1.3.5 tem pelo menos um teste que a cobre, e cada exceção de
   1.3.6 tem pelo menos um teste que a provoca.
4. Os testes são executados **antes** de qualquer revisão humana de código: código que não
   passa no harness não chega a ser revisado.

---

# 3. GOVERNANÇA DE CONTEXTO E REGRAS PARA AGENTES (CONTEXT_RULES)

O conteúdo desta seção é o que será gravado no arquivo `CONTEXT_RULES.md`, na raiz do
repositório, e fornecido ao assistente de IA em toda solicitação de geração de código.

## 3.1 Diretrizes arquiteturais (obrigatórias)

1. **Python 3.11 ou superior.** É a versão mínima; recursos mais novos não podem ser
   usados sem que a versão mínima seja atualizada nesta especificação.
2. **Apenas biblioteca padrão** no código de produção. `pytest` e `pytest-cov` são
   permitidos exclusivamente em `tests/`.
3. **`type hints` em todas as funções, métodos e atributos**, incluindo parâmetros e
   retorno. `Any` só é aceito com justificativa escrita no próprio código.
4. **PEP 8** e código limpo. Linhas de até 100 colunas.
5. **Responsabilidade única (SRP).** Uma função faz uma coisa. A separação em
   `models.py`, `exceptions.py` e `task_analyzer.py` é parte do contrato, não sugestão.
6. **Docstrings no padrão Google** para módulo, classe, função e parâmetros.
7. **Funções pequenas e coesas.** Acima de 20 linhas de corpo, justificar ou dividir.
8. **Tratamento de exceções específico.** Nada de `except Exception` genérico no código de
   produção. Toda exceção levantada pelo módulo herda de `TaskAnalyzerError` e traz
   mensagem que identifica o dado que a causou.
9. **Logs estruturados com o módulo padrão `logging`.** Nunca `print`. O módulo registra
   em `DEBUG` a entrada recebida e em `WARNING` cada tarefa rejeitada na validação.
10. **Nomes descritivos** para variáveis e funções, em português, coerentes com os nomes
    do contrato da seção 1.3. O contrato é a fonte da verdade dos nomes.
11. **Imutabilidade das estruturas de dados.** `Tarefa`, `IndicadorPrioridade` e
    `RelatorioProdutividade` são `@dataclass(frozen=True)`.
12. **Determinismo (RN-07).** Nenhuma função do módulo lê o relógio do sistema ou gera
    valores aleatórios.

## 3.2 Proibições explícitas (regras restritivas)

1. **Não utilizar bibliotecas externas não autorizadas** — inclusive `pandas`, `numpy`,
   `arrow` e `pendulum`, por mais convenientes que sejam para datas e agregações.
2. **Não alterar, remover ou adaptar os cenários de teste** da seção 2. O teste é o
   contrato; ajustar o teste para o código passar inverte a relação e invalida a entrega.
3. **Não modificar a estrutura de pastas** definida na seção 4.1.
4. **Não persistir dados** em arquivo, banco de dados, cache ou variável global.
5. **Não alterar a assinatura** (nome, parâmetros, tipos, retorno) das funções públicas de
   1.3.4 sem autorização registrada nesta especificação.
6. **Não gerar código de produção sem o teste correspondente** na mesma entrega.
7. **Não inserir código duplicado nem código não solicitado** — sem funções "para o
   futuro", sem parâmetros não usados, sem camadas de abstração que nenhum requisito pede.
8. **Não assumir comportamento não especificado.** Diante de ambiguidade, o agente
   pergunta; não escolhe por conta própria e não inventa regra de negócio.
9. **Não capturar exceção para silenciá-la.** `except: pass` e equivalentes são proibidos.
10. **Não usar `print` para diagnóstico** nem deixar código comentado no repositório.
11. **Não commitar código gerado sem homologação humana**, conforme o plano da seção 4.2.

## 3.3 Regras de interação com o agente de IA

1. Fornecer sempre o contexto completo: `CONTEXT_RULES.md` mais a seção da especificação
   pertinente à solicitação.
2. Validar a compreensão do agente antes de aceitar código: pedir que ele reformule o que
   entendeu do contrato.
3. Solicitar explicação sempre que houver dúvida sobre a solução gerada.
4. Revisar criticamente **todo** código gerado. Código que passa nos testes ainda pode
   violar as regras desta seção.
5. Rejeitar e regerar respostas que violem qualquer proibição de 3.2, registrando o motivo.

---
---

# ENTREGÁVEL 2 — SLIDES (Google Apresentações)

> Título: **Arquitetura do Repositório**

---

## 4.1 Desenho da árvore do repositório

```
SDD-task-analyzer/
├── README.md                        # Visão geral do projeto, instalação e execução
├── CONTEXT_RULES.md                 # Regras persistentes para a IA (seção 3)
├── requirements.txt                 # Dependências (apenas de teste: pytest, pytest-cov)
├── .gitignore                       # __pycache__, .pytest_cache, .venv, .coverage
│
├── specs/
│   └── task_analyzer_spec.md        # Especificação SDD desta Fase 1
│
├── src/
│   ├── __init__.py
│   ├── models.py                    # Tarefa, IndicadorPrioridade, RelatorioProdutividade
│   ├── exceptions.py                # TaskAnalyzerError e suas duas filhas
│   └── task_analyzer.py             # calcular_metricas e funções de apoio
│
└── tests/
    ├── __init__.py
    ├── conftest.py                  # Fixtures com os dados dos cenários da seção 2.1
    └── test_harness.py              # Testes automatizados dos cenários de aceite
```

**Por que `src/` tem três arquivos e não um:** a regra 3.1.5 (responsabilidade única) vale
para o arquivo tanto quanto para a função. Estruturas de dados, exceções e regra de
cálculo mudam por motivos diferentes e em momentos diferentes.

---

## 4.2 Plano de homologação humana

Todo código gerado por IA passa pelos cinco pontos abaixo, **nesta ordem**, antes de ser
aceito e versionado. Reprovação em qualquer ponto interrompe o fluxo: o código volta para
correção e o processo recomeça do ponto 1.

### Slide 1 — Ponto 1: Execução completa dos testes automatizados

| | |
|---|---|
| **O que será feito** | Execução de todo o Test Harness (`pytest -v --cov=src`) sobre o código gerado, sem nenhum teste ignorado, e conferência da cobertura. |
| **Por quem** | Desenvolvedor homologador, localmente, antes de qualquer leitura do código. |
| **Como se verifica** | Saída do pytest com 100% dos testes em `PASSED`, zero `skip` e zero `xfail`, e cobertura de `src/` maior ou igual a 90%. O relatório de execução é anexado ao Pull Request. |
| **Critério de reprovação** | Qualquer teste falhando, ou cobertura abaixo de 90%. |

### Slide 2 — Ponto 2: Revisão de conformidade com o contrato e as CONTEXT_RULES

| | |
|---|---|
| **O que será feito** | Conferência item a item: cada assinatura pública contra 1.3.4; cada regra RN-01 a RN-10 contra a implementação; cada exceção contra 1.3.6; e cada proibição de 3.2 contra o código entregue. |
| **Por quem** | Desenvolvedor homologador, com a especificação aberta ao lado do diff. |
| **Como se verifica** | Checklist preenchido no Pull Request, com uma linha por regra e o trecho de código que a cumpre. Regra sem trecho apontado é reprovação. |
| **Critério de reprovação** | Assinatura divergente, regra de negócio não implementada ou implementada de outra forma, ou qualquer proibição violada. |

### Slide 3 — Ponto 3: Análise de qualidade de código

| | |
|---|---|
| **O que será feito** | Leitura integral do código gerado, avaliando legibilidade, nomes, tamanho e coesão das funções, `type hints`, docstrings no padrão Google, tratamento específico de erros e uso de `logging`. |
| **Por quem** | Desenvolvedor homologador. |
| **Como se verifica** | Comentários de revisão no Pull Request. Todo apontamento é resolvido ou respondido antes da aprovação. Nenhum código duplicado, morto ou comentado permanece. |
| **Critério de reprovação** | Código que passa nos testes mas é ilegível, duplicado, sem docstring, sem tipagem, ou que captura exceção de forma genérica. |

### Slide 4 — Ponto 4: Testes manuais complementares em casos de borda

| | |
|---|---|
| **O que será feito** | Exercício manual, em sessão interativa, dos casos que o harness não cobre por serem descobertas da própria revisão: `datetime` sem fuso, prioridade ou status fora dos literais, `titulo` vazio, tarefa cancelada com `concluida_em` preenchido, e conjunto com uma única tarefa concluída. |
| **Por quem** | Desenvolvedor homologador. |
| **Como se verifica** | Cada caso executado tem entrada e saída registradas no Pull Request. Todo caso de borda que revelar comportamento não especificado vira **um teste novo no harness** e, quando for o caso, uma regra nova na especificação. |
| **Critério de reprovação** | Comportamento não especificado, mensagem de erro que não identifica o dado que a causou, ou exceção genérica escapando do módulo. |

### Slide 5 — Ponto 5: Aprovação e versionamento

| | |
|---|---|
| **O que será feito** | Somente após os quatro pontos anteriores aprovados, o código é commitado e o Pull Request é integrado à branch principal. |
| **Por quem** | Desenvolvedor homologador, que assina a aprovação no Pull Request. |
| **Como se verifica** | Pull Request com os quatro registros: relatório do pytest (ponto 1), checklist de conformidade (ponto 2), comentários de revisão resolvidos (ponto 3) e casos de borda documentados (ponto 4). Commits pequenos e descritivos, indicando no corpo da mensagem que o código foi gerado por IA e homologado. |
| **Critério de reprovação** | Ausência de qualquer um dos quatro registros anteriores. Sem eles, não há merge. |

**Princípio que sustenta o plano:** a IA é ferramenta de produtividade; a decisão final e a
responsabilidade técnica permanecem humanas. Nenhum código entra no repositório sem que
uma pessoa tenha verificado que ele cumpre o contrato desta especificação.
