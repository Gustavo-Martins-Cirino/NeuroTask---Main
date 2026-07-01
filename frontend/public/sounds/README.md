# Sons do Modo Foco

Coloque aqui os arquivos de áudio (loopáveis) usados pelo mixer do Modo Foco.
**Use apenas áudios com licença livre** — ex.: [Pixabay Audio](https://pixabay.com/sound-effects/),
[Mixkit](https://mixkit.co/free-sound-effects/) ou [Freesound](https://freesound.org) (Creative Commons / CC0).
Não use arquivos do myNoise ou de fontes proprietárias.

## Arquivos esperados

O mixer tem 3 seções. **Sons** e **Músicas** precisam de arquivo; **Ruídos** são sintetizados.

### Sons (loop contínuo)
| Arquivo | Ambiente |
|---------|----------|
| `rain.mp3`     | Chuva |
| `cafe.mp3`     | Cafeteria |
| `forest.mp3`   | Floresta |
| `waves.mp3`    | Ondas do mar |
| `fire.mp3`     | Fogueira |
| `birds.mp3`    | Pássaros |
| `stream.mp3`   | Riacho |
| `snow.mp3`     | Neve |
| `train.mp3`    | Trem |
| `flight.mp3`   | Voo |
| `library.mp3`  | Biblioteca |
| `space.mp3`    | Espaço |

### Músicas (repetem com crossfade, sem corte abrupto)
| Arquivo | Estilo |
|---------|--------|
| `classical-piano.mp3`      | Clássica · Piano |
| `classical-piano2.mp3`     | Clássica · Piano 2 |
| `classical-orchestral.mp3` | Clássica · Orquestra |
| `dark-ambience.mp3`        | Dark ambient |
| `dungeon-synth.mp3`        | Dungeon synth |
| `lofi.mp3`                 | Lo-fi |
| `lofi2.mp3`                | Lo-fi 2 |
| `chillhop.mp3`             | Chillhop |
| `study.mp3`                | Concentração |
| `study2.mp3`               | Fluxo |
| `study-music.mp3`          | Imersão |

### Foco (ruídos e frequências — loop contínuo)
| Arquivo | Tipo |
|---------|------|
| `brown-noise.mp3` | Ruído marrom |
| `bineural.mp3`    | Binaural |

> O **ruído branco** pode ser sintetizado em código (Web Audio API) — não precisa de arquivo.
> Os itens de **Foco** tocam em **loop contínuo** (sem crossfade).

O nome do arquivo deve bater **exatamente** com o da tabela (em `components/sound-mixer.tsx`,
campo `src`). É só baixar, renomear e colocar nesta pasta — o card ativa sozinho.

> **Sons** vs **Músicas**: para os *Sons*, prefira faixas pensadas para **loop** (sem início/fim).
> As *Músicas* podem ser faixas normais — o mixer aplica **crossfade** ao repetir, então não há corte seco.

## Como adicionar rápido (CC0, sem atribuição)
1. Abra [Pixabay Sound Effects](https://pixabay.com/sound-effects/search/rain/) ou
   [Mixkit](https://mixkit.co/free-sound-effects/) e busque o ambiente (ex.: "rain loop", "airplane cabin").
2. Baixe o `.mp3` (Pixabay/Mixkit são livres, sem atribuição).
3. Renomeie para o nome da tabela acima e salve aqui em `public/sounds/`.

> Para avião/voo, busque por **"airplane cabin"**, **"jet engine loop"** ou **"flight cabin ambience"**.

## Dicas
- Prefira faixas pensadas para **loop contínuo** (sem início/fim abruptos) para evitar emendas audíveis.
- MP3 ~128–192 kbps é suficiente e mantém o arquivo leve (evite arquivos > ~3–4 MB).
- Os caminhos são servidos a partir de `/sounds/<arquivo>.mp3` (pasta `public/`).
- Se um arquivo não existir, o card correspondente fica desativado e mostra "Arquivo não encontrado".
