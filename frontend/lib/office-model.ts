// Modelo do Escritório + personagem, construído em código (primitivas) a partir
// dos scripts Blender (build_escritorio_base.py / build_personagem_base.py).
// Reconstruído nativo em three.js: assim ganhamos toon-shading, animação e
// skins (paletas de cor) sem depender de Blender/GLB.
//
// Coordenadas em Z-up (como no Blender). Quem usa deve envolver os grupos num
// <group rotation={[-Math.PI/2,0,0]}> para converter Z-up → Y-up (igual ao
// export_yup do glTF). Cilindros já vêm com o eixo em Z (como no Blender).

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Material,
} from "three"

type V3 = [number, number, number]

// Acabamentos: o que separa "3D de verdade" de desenho é a luz reagir DIFERENTE
// em cada superfície. Antes tudo era MeshToonMaterial com 3 bandas duras, então
// parede, metal e tecido brilhavam igual — a cara de cartoon. Agora é PBR
// (MeshStandardMaterial) e cada superfície tem rugosidade/metalicidade própria.
export type Acabamento = "parede" | "piso" | "madeira" | "metal" | "plastico" | "tecido" | "pele" | "ceramica" | "vidro" | "brilhante"

const ACABAMENTOS: Record<Acabamento, { roughness: number; metalness: number }> = {
  parede: { roughness: 0.96, metalness: 0 },   // tinta fosca
  piso: { roughness: 0.82, metalness: 0 },
  madeira: { roughness: 0.62, metalness: 0 },  // verniz de leve
  metal: { roughness: 0.34, metalness: 0.9 },  // pé de cadeira, haste
  plastico: { roughness: 0.42, metalness: 0 }, // gabinete, teclado
  tecido: { roughness: 0.94, metalness: 0 },   // roupa, tapete
  pele: { roughness: 0.72, metalness: 0 },
  ceramica: { roughness: 0.35, metalness: 0 }, // vaso, caneca
  vidro: { roughness: 0.08, metalness: 0.1 },  // lente, janela
  brilhante: { roughness: 0.18, metalness: 0.75 }, // troféu, dourado
}

function tmat(
  cor: string | [number, number, number],
  emissive = 0,
  acabamento: Acabamento = "plastico"
): MeshStandardMaterial {
  const color = Array.isArray(cor) ? new Color(cor[0], cor[1], cor[2]) : new Color(cor)
  const { roughness, metalness } = ACABAMENTOS[acabamento]
  const m = new MeshStandardMaterial({ color, roughness, metalness })
  if (emissive > 0) {
    m.emissive = color.clone()
    m.emissiveIntensity = emissive
  }
  return m
}

function box(name: string, dims: V3, pos: V3, material: Material, rot?: V3): Mesh {
  const m = new Mesh(new BoxGeometry(dims[0], dims[1], dims[2]), material)
  m.name = name
  m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// Cilindro com eixo em Z (convenção Blender). rTop != null → tronco de cone.
function cyl(name: string, raio: number, alt: number, pos: V3, material: Material, rot?: V3, rTop?: number): Mesh {
  const geo = new CylinderGeometry(rTop ?? raio, raio, alt, 18)
  geo.rotateX(Math.PI / 2)
  const m = new Mesh(geo, material)
  m.name = name
  m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// Segmento de membro ENTRE DOIS PONTOS: o cilindro nasce com o eixo em Z
// (convenção Blender) e é girado para ir de `a` até `b`. Posar o braço por
// pontos, e não por ângulos, é o que deixa a mão pousar no teclado sem
// trigonometria à mão — para mudar a pose, mexe-se no ponto.
function segmento(name: string, a: V3, b: V3, raio: number, material: Material): Mesh {
  const va = new Vector3(...a)
  const vb = new Vector3(...b)
  const dir = vb.clone().sub(va)
  const geo = new CylinderGeometry(raio, raio, dir.length(), 14)
  geo.rotateX(Math.PI / 2)
  const m = new Mesh(geo, material)
  m.name = name
  m.position.copy(va).add(vb).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize())
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function sph(name: string, raio: number, pos: V3, material: Material, esc?: V3): Mesh {
  const m = new Mesh(new SphereGeometry(raio, 16, 12), material)
  m.name = name
  m.position.set(...pos)
  if (esc) m.scale.set(...esc)
  m.castShadow = true
  return m
}

// Um monitor = grupo (bezel + tela) num sub-Group, pra girar em bloco (toe-in
// do setup duplo) mantendo a tela colada no bezel. A tela leva "Monitor_Tela"
// no nome — é por ela que a cena acha o brilho ao "trabalhar".
function monitorUnit(sufixo: string, centro: V3, yaw: number, w: number, h: number, mBezel: Material, mGlow: Material): Group {
  const grp = new Group()
  grp.name = `Monitor${sufixo}`
  grp.add(box(`Monitor_Bezel${sufixo}`, [w, 0.035, h], [0, 0.012, 0], mBezel))
  grp.add(box(`Monitor_Tela${sufixo}`, [w - 0.08, 0.012, h - 0.06], [0, -0.006, 0], mGlow))
  grp.position.set(...centro)
  grp.rotation.z = yaw
  return grp
}

// Constrói o(s) monitor(es) + suporte(s) conforme o setup comprado na loja.
function buildMonitores(g: Group, dy: number, setup: EscritorioExtras["setup"], mBezel: Material, mGlow: Material, mPC: Material) {
  if (setup === "ultrawide") {
    g.add(box("Monitor_Suporte", [0.18, 0.06, 0.14], [0, 1.35 + dy, 0.87], mPC))
    g.add(monitorUnit("", [0, 1.31 + dy, 1.08], 0, 0.95, 0.34, mBezel, mGlow))
  } else if (setup === "duplo") {
    for (const s of [-1, 1] as const) {
      const suf = s < 0 ? "_L" : "_R"
      g.add(box(`Monitor_Suporte${suf}`, [0.08, 0.06, 0.14], [s * 0.34, 1.36 + dy, 0.87], mPC))
      g.add(monitorUnit(suf, [s * 0.34, 1.33 + dy, 1.06], -s * 0.26, 0.46, 0.34, mBezel, mGlow))
    }
  } else {
    g.add(box("Monitor_Suporte", [0.08, 0.06, 0.14], [0, 1.35 + dy, 0.87], mPC))
    g.add(monitorUnit("", [0, 1.31 + dy, 1.1], 0, 0.58, 0.36, mBezel, mGlow))
  }
}

const D = (g: number) => (g * Math.PI) / 180

// ─────────────────────────────────────────────────────────────────────────
// ESCRITÓRIO (sala + mesa + cadeira + PC sempre; o resto vem da LOJA)
// ─────────────────────────────────────────────────────────────────────────
// A sala nasce crua de propósito ("Seu cantinho começa simples — decore-o com
// a sua produtividade"): janela, tapete e plantas são itens compráveis, então
// só aparecem quando equipados. `extras` liga cada um; `cores` aplica os itens
// de parede/piso/cadeira.
//
// Geografia útil (metros, Z-up): piso z=0, x/y ∈ [-2,2]. Parede do fundo com
// face interna em y=1.95; parede lateral com face interna em x=-1.95. Tampo da
// mesa em z=0.81, ocupando x ∈ [-0.8,0.8] e y ∈ [1.2,1.9]. Monitor no centro
// (x≈0) e torre do PC em x≈0.6 — as sobras livres do tampo são as pontas.

export interface EscritorioExtras {
  janela?: boolean
  tapete?: boolean
  plantaPequena?: boolean
  plantaGrande?: boolean
  luminaria?: boolean
  estante?: boolean
  quadro?: boolean
  neon?: boolean
  trofeu?: boolean
  gato?: boolean
  /** Setup da mesa: undefined = 1 monitor; "duplo" = 2; "ultrawide" = 1 largão. */
  setup?: "duplo" | "ultrawide"
}

/** Silhueta da cadeira — "padrao" é a de plástico que já vem na sala; as
 *  outras duas são compradas na loja e mudam a MALHA, não só a cor. */
export type CadeiraTipo = "padrao" | "ergonomica" | "gamer"

export interface EscritorioOpts {
  extras?: EscritorioExtras
  cores?: { parede?: string; piso?: string; cadeira?: string }
  /** Nível do dono: a sala cresce com ele (comparação social num relance). */
  nivel?: number
  cadeira?: CadeiraTipo
}

// Base giratória de 5 pés com rodinha na ponta (cadeiras de escritório/gamer).
// Cada pé é uma caixa comprida girada em torno de Z (o eixo "de cima" da sala)
// para apontar pra fora, feito raio de roda — 5 em vez de 4 porque é o padrão
// real dessas cadeiras (mais estável que um tripé, sem repetir a X da mesa).
function baseEstrela(g: Group, prefixo: string, x: number, y: number, mMetal: Material, mRoda: Material) {
  const braços = 5
  const comprimento = 0.3
  const raioInterno = 0.05
  for (let i = 0; i < braços; i++) {
    const ang = (i * 2 * Math.PI) / braços
    const dx = Math.cos(ang), dy2 = Math.sin(ang)
    const cx = x + dx * (raioInterno + comprimento / 2)
    const cy = y + dy2 * (raioInterno + comprimento / 2)
    g.add(box(`${prefixo}_Pe_${i}`, [comprimento, 0.045, 0.04], [cx, cy, 0.05], mMetal, [0, 0, ang]))
    const rx = x + dx * (raioInterno + comprimento)
    const ry = y + dy2 * (raioInterno + comprimento)
    g.add(sph(`${prefixo}_Roda_${i}`, 0.033, [rx, ry, 0.033], mRoda))
  }
}

// Cadeira de plástico de bar: assento e encosto finos e moldados, 4 pernas
// retas — sem braço, sem coluna a gás, sem base giratória. É o que separa uma
// cadeira "padrão" de uma comprada: aqui não tem mecanismo nenhum.
function buildCadeiraPadrao(g: Group, x: number, y: number, mCad: Material, mMetal: Material) {
  g.add(box("Cadeira_Assento", [0.46, 0.44, 0.045], [x, y, 0.44], mCad))
  g.add(box("Cadeira_Encosto", [0.42, 0.04, 0.3], [x, y - 0.23, 0.6], mCad))
  const pernas: V3[] = [[0.19, 0.18], [-0.19, 0.18], [0.19, -0.17], [-0.19, -0.17]].map(([ox, oy]) => [x + ox, y + oy, 0.21])
  pernas.forEach((p, i) => g.add(cyl(`Cadeira_Perna_${i}`, 0.016, 0.42, p, mMetal)))
}

// Cadeira ergonômica: encosto em duas partes (lombar + alto, afunilando pro
// topo — a curva que faz "ergonômica" ler como tal), braços com poste e
// almofada, coluna a gás e base giratória de 5 pés.
function buildCadeiraErgonomica(g: Group, x: number, y: number, mCad: Material, mMetal: Material, mRoda: Material) {
  g.add(box("Cadeira_Assento", [0.52, 0.52, 0.09], [x, y, 0.47], mCad))
  g.add(box("Cadeira_Encosto_Lombar", [0.46, 0.09, 0.24], [x, y - 0.25, 0.63], mCad))
  g.add(box("Cadeira_Encosto_Alto", [0.4, 0.07, 0.42], [x, y - 0.24, 0.95], mCad))
  for (const lado of [1, -1]) {
    const suf = lado === 1 ? "Direito" : "Esquerdo"
    g.add(cyl(`Cadeira_Braco_Poste_${suf}`, 0.02, 0.22, [x + lado * 0.29, y, 0.61], mMetal))
    g.add(box(`Cadeira_Braco_Almofada_${suf}`, [0.07, 0.22, 0.03], [x + lado * 0.29, y, 0.735], mCad))
  }
  g.add(cyl("Cadeira_Coluna", 0.04, 0.4, [x, y, 0.22], mMetal))
  baseEstrela(g, "Cadeira_Base", x, y, mMetal, mRoda)
}

// Cadeira gamer: balde com "asas" laterais no assento e no encosto (o que dá
// a cara de racing seat), encosto alto com apêndice de encosto de cabeça,
// friso de contraste no centro, braços maiores e a mesma base giratória.
function buildCadeiraGamer(g: Group, x: number, y: number, mCad: Material, mMetal: Material, mRoda: Material, mFriso: Material) {
  g.add(box("Cadeira_Assento", [0.5, 0.5, 0.1], [x, y, 0.47], mCad))
  for (const lado of [1, -1]) {
    const suf = lado === 1 ? "Direita" : "Esquerda"
    g.add(box(`Cadeira_Assento_Asa_${suf}`, [0.06, 0.5, 0.13], [x + lado * 0.26, y, 0.5], mCad, [0, 0, lado * D(12)]))
  }
  g.add(box("Cadeira_Encosto", [0.44, 0.09, 0.62], [x, y - 0.25, 0.85], mCad))
  g.add(box("Cadeira_Encosto_Friso", [0.06, 0.02, 0.58], [x, y - 0.295, 0.85], mFriso))
  for (const lado of [1, -1]) {
    const suf = lado === 1 ? "Direita" : "Esquerda"
    g.add(box(`Cadeira_Encosto_Asa_${suf}`, [0.06, 0.16, 0.6], [x + lado * 0.21, y - 0.19, 0.85], mCad, [0, 0, -lado * D(18)]))
  }
  g.add(box("Cadeira_Encosto_Cabeca", [0.26, 0.08, 0.14], [x, y - 0.27, 1.18], mCad))
  for (const lado of [1, -1]) {
    const suf = lado === 1 ? "Direito" : "Esquerdo"
    g.add(cyl(`Cadeira_Braco_Poste_${suf}`, 0.022, 0.24, [x + lado * 0.3, y, 0.6], mMetal))
    g.add(box(`Cadeira_Braco_Almofada_${suf}`, [0.08, 0.24, 0.04], [x + lado * 0.3, y, 0.735], mFriso))
  }
  g.add(cyl("Cadeira_Coluna", 0.042, 0.4, [x, y, 0.22], mMetal))
  baseEstrela(g, "Cadeira_Base", x, y, mMetal, mRoda)
}

function buildCadeira(g: Group, tipo: CadeiraTipo | undefined, x: number, y: number, mCad: Material, mMetal: Material, mRoda: Material, mFriso: Material) {
  if (tipo === "ergonomica") return buildCadeiraErgonomica(g, x, y, mCad, mMetal, mRoda)
  if (tipo === "gamer") return buildCadeiraGamer(g, x, y, mCad, mMetal, mRoda, mFriso)
  return buildCadeiraPadrao(g, x, y, mCad, mMetal)
}

const TAMPO_Z = 0.81 // topo da mesa: onde os itens de mesa se apoiam

// ---- Giro da zona de trabalho ----
//
// A câmera é isométrica e olha a sala do lado ABERTO (não há parede ali). A
// mesa encosta na parede do fundo e a pessoa encara a mesa — ou seja, encara
// para longe de quem olha. Resultado medido: o rosto ficava a 137° da câmera,
// e óculos, olhos e boca nunca apareciam; do boné só se via a copa, porque a
// aba apontava para o lado oposto. Não era bug de modelo — era a composição.
//
// Mover a câmera não resolve: para ver o rosto ela teria de ir para trás da
// parede do fundo, que passaria a tapar a sala. O que resolve é girar a MESA
// JUNTO COM A PESSOA: ela continua de frente para o próprio monitor (e as mãos
// seguem no teclado), só que o conjunto fica angulado na sala e o rosto vira
// para quem olha. Em 25° o rosto sai de 137° para ~112° da câmera — perfil de
// três quartos, o bastante para ler acessório sem a mesa parecer torta.
//
// O sinal importa e não é óbvio: girando para +Z o rosto vai para 156° (PIOR
// que os 137° de antes). O lado certo é o negativo, que traz a mesa para a
// direita de quem olha. Há teste travando isso.
//
// Para calibrar, mexa AQUI: é o único número que manda no ângulo.
export const GIRO_ZONA = D(-25)

/** Onde fica o eixo do giro (y na sala): o assento, para a pessoa girar no
 *  lugar e a mesa é que descrever o arco — o contrário jogaria ela na parede. */
export const PIVO_ZONA_Y = 0.9

// Medidas do tampo usadas para saber onde o canto dele vai parar ao girar.
const MESA_MEIO_X = 0.8
const MESA_MEIO_Y = 0.35
const MESA_CENTRO_DY = 0.65 // do assento até o centro do tampo

/**
 * Quanto a zona anda para a FRENTE ao girar. Girando, o canto do tampo descreve
 * um arco e avança em direção à parede do fundo — em 25° ele avançaria 24 cm e
 * atravessaria a parede (encostada, a mesa só tem 5 cm de folga). Este recuo
 * devolve exatamente essa folga, então o tampo continua rente à parede em
 * qualquer ângulo. Deriva de GIRO_ZONA: mudar o ângulo não pede outra conta.
 */
export function avancoDoGiro(giro = GIRO_ZONA): number {
  const a = Math.abs(giro)
  const alcance = (MESA_CENTRO_DY + MESA_MEIO_Y) * Math.cos(a) + MESA_MEIO_X * Math.sin(a)
  return Math.max(0, alcance - (MESA_CENTRO_DY + MESA_MEIO_Y))
}

/**
 * Par de grupos que gira a zona de trabalho em torno do assento: `eixo` leva o
 * pivô até lá e gira, `conteudo` devolve a origem — assim os filhos entram com
 * as coordenadas absolutas da sala, sem recalcular nada.
 *
 * Pendure o `eixo` na cena e adicione as malhas no `conteudo`.
 */
export function giroDaZona(dy = 0): { eixo: Group; conteudo: Group } {
  const eixo = new Group()
  eixo.name = "Zona_Trabalho"
  eixo.position.set(0, PIVO_ZONA_Y + dy - avancoDoGiro(), 0)
  eixo.rotation.z = GIRO_ZONA
  const conteudo = new Group()
  conteudo.name = "Zona_Trabalho_Conteudo"
  conteudo.position.set(0, -(PIVO_ZONA_Y + dy), 0)
  eixo.add(conteudo)
  return { eixo, conteudo }
}

// A sala cresce em degraus, não continuamente — assim subir de nível é um
// evento perceptível, e não um centímetro invisível por vez.
export function tamanhoDaSala(nivel = 1): number {
  if (nivel >= 8) return 5.8
  if (nivel >= 5) return 5.2
  if (nivel >= 3) return 4.6
  return 4
}

// Quanto a ZONA DE TRABALHO (mesa, cadeira, pessoa) recua junto com a parede
// do fundo. Ancorar nela é o que faz o espaço novo virar chão livre à frente,
// em vez de empurrar a pessoa para o meio da sala.
export function recuoDaSala(nivel = 1): number {
  return tamanhoDaSala(nivel) / 2 - 2
}

export function buildEscritorio(opts: EscritorioOpts = {}): Group {
  const g = new Group()
  const extras = opts.extras ?? {}
  const tam = tamanhoDaSala(opts.nivel)
  const S = tam / 2        // meia-sala: face interna das paredes
  const dy = recuoDaSala(opts.nivel) // deslocamento da zona de trabalho
  const mPiso = tmat(opts.cores?.piso ?? [0.82, 0.62, 0.4], 0, "piso")
  const mParede = tmat(opts.cores?.parede ?? [0.94, 0.9, 0.85], 0, "parede")
  // A padrão é plástico injetado (reflete um pouco); as compradas são estofadas
  // e comem a luz. O acabamento é metade do que separa uma da outra — só a
  // silhueta, com todas foscas iguais, ainda lia como "a mesma cadeira".
  const mCad = tmat(
    opts.cores?.cadeira ?? [0.13, 0.13, 0.15],
    0,
    opts.cadeira && opts.cadeira !== "padrao" ? "tecido" : "plastico"
  )
  const mRodape = tmat([1, 1, 1], 0, "parede")
  const mTampo = tmat([0.74, 0.53, 0.34], 0, "madeira")
  const mPerna = tmat([0.22, 0.2, 0.18], 0, "metal")
  const mBezel = tmat([0.07, 0.07, 0.09], 0, "plastico")
  const mGlow = tmat([0.35, 0.75, 1.0], 1.2)
  const mPC = tmat([0.9, 0.9, 0.92], 0, "plastico")
  const mMadeira = tmat([0.48, 0.32, 0.19], 0, "madeira")
  const mVaso = tmat([0.88, 0.88, 0.88], 0, "ceramica")
  const mFolha = tmat([0.27, 0.55, 0.3], 0, "tecido")

  g.add(box("Piso", [tam, tam, 0.1], [0, 0, -0.05], mPiso))
  g.add(box("Parede_Fundo", [tam, 0.1, 2.6], [0, S, 1.3], mParede))
  g.add(box("Parede_Lateral", [0.1, tam, 2.6], [-S, 0, 1.3], mParede))
  g.add(box("Rodape_Fundo", [tam, 0.12, 0.14], [0, S - 0.09, 0.07], mRodape))
  g.add(box("Rodape_Lateral", [0.12, tam, 0.14], [-S + 0.09, 0, 0.07], mRodape))

  // Tudo que gira junto com a pessoa mora aqui dentro (ver GIRO_ZONA). Os
  // filhos entram com as MESMAS coordenadas de sempre: o par de grupos põe o
  // pivô no assento e devolve a origem, então nada precisou ser recalculado.
  const { eixo, conteudo: zona } = giroDaZona(dy)
  g.add(eixo)

  zona.add(box("Mesa_Tampo", [1.6, 0.7, 0.06], [0, 1.55 + dy, 0.78], mTampo))
  for (const ox of [0.72, -0.72]) for (const oy of [1.85, 1.25]) zona.add(cyl(`Mesa_Perna_${ox}_${oy}`, 0.025, 0.72, [ox, oy + dy, 0.36], mPerna))

  const mRoda = tmat([0.1, 0.1, 0.11], 0, "plastico")
  const mFriso = tmat([0.06, 0.06, 0.07], 0, "plastico")
  buildCadeira(zona, opts.cadeira, 0, 0.9 + dy, mCad, mPerna, mRoda, mFriso)

  buildMonitores(zona, dy, extras.setup, mBezel, mGlow, mPC)
  zona.add(box("PC_Torre", [0.14, 0.3, 0.36], [0.6, 1.5 + dy, 0.96], mPC))
  zona.add(box("Teclado", [0.32, 0.12, 0.02], [0, 1.32 + dy, TAMPO_Z + 0.01], mPC))
  zona.add(box("Mouse", [0.06, 0.09, 0.02], [0.26, 1.32 + dy, TAMPO_Z + 0.01], mPC))

  // ---- Itens da loja ----

  if (extras.janela) {
    const mJan = tmat([1, 1, 1])
    const mPers = tmat([0.96, 0.95, 0.92])
    g.add(box("Janela_Moldura", [1.3, 0.06, 1.4], [1.1, S - 0.02, 1.55], mJan))
    for (let i = 0; i < 9; i++) g.add(box(`Persiana_Lamina_${i}`, [1.15, 0.03, 0.05], [1.1, S - 0.06, 1.0 + i * 0.14], mPers))
  }

  if (extras.tapete) {
    g.add(cyl("Tapete", 0.95, 0.03, [0, 0.85 + dy, 0.015], tmat([0.9, 0.53, 0.18], 0, "tecido")))
  }

  // Vaso apoiado no piso/mesa: o centro sobe metade da altura para não afundar.
  // `alvo` é onde a planta mora: a do chão fica na sala, a da mesa vai na zona
  // de trabalho — senão ela ficaria parada no ar quando a mesa gira.
  const planta = (alvo: Group, nome: string, p: V3, escala: number) => {
    const altVaso = 0.25 * escala
    alvo.add(cyl(`${nome}_Vaso`, 0.18 * escala, altVaso, [p[0], p[1], p[2] + altVaso / 2], mVaso, undefined, 0.13 * escala))
    const base = p[2] + altVaso
    const offs: V3[] = [[0.06, 0, 0.03], [-0.06, 0.03, 0.09], [0, -0.06, 0.15], [0.05, 0.05, 0.19], [-0.04, -0.04, 0.25]]
    offs.forEach(([dx, dy, dz], i) =>
      alvo.add(sph(`${nome}_Folha_${i}`, 0.08 * escala, [p[0] + dx * escala, p[1] + dy * escala, base + dz * escala], mFolha, [1, 1, 1.6]))
    )
  }
  if (extras.plantaGrande) planta(g, "Planta_Grande", [-S + 0.5, S - 0.55, 0], 1.15)
  if (extras.plantaPequena) planta(zona, "Planta_Pequena", [0.45, 1.78 + dy, TAMPO_Z], 0.34)

  if (extras.luminaria) {
    const mMetal = tmat([0.23, 0.26, 0.31], 0, "metal")
    const mCupula = tmat([0.88, 0.7, 0.23], 0, "metal")
    const x = -0.6, y = 1.76 + dy
    zona.add(cyl("Luminaria_Base", 0.07, 0.02, [x, y, TAMPO_Z + 0.01], mMetal))
    zona.add(cyl("Luminaria_Haste", 0.012, 0.3, [x, y, TAMPO_Z + 0.16], mMetal))
    zona.add(cyl("Luminaria_Braco", 0.012, 0.22, [x + 0.08, y - 0.02, TAMPO_Z + 0.31], mMetal, [D(70), 0, 0]))
    zona.add(cyl("Luminaria_Cupula", 0.09, 0.11, [x + 0.15, y - 0.09, TAMPO_Z + 0.3], mCupula, [D(50), 0, 0], 0.04))
    zona.add(sph("Luminaria_Bulbo", 0.04, [x + 0.15, y - 0.11, TAMPO_Z + 0.26], tmat([1, 0.94, 0.78], 1.8)))
  }

  if (extras.estante) {
    const mLivro = [
      tmat([0.72, 0.24, 0.16]), tmat([0.16, 0.38, 0.64]), tmat([0.86, 0.66, 0.2]),
      tmat([0.27, 0.56, 0.32]), tmat([0.48, 0.32, 0.86]), tmat([0.8, 0.36, 0.46]),
      tmat([0.15, 0.15, 0.17]), tmat([0.92, 0.89, 0.82]), tmat([0.62, 0.42, 0.22]),
    ]
    const x = -S + 0.26
    g.add(box("Estante_Corpo", [0.34, 0.9, 1.25], [x, 0.2, 0.625], mMadeira))
    const nLivros = 8
    ;[0.4, 0.72, 1.04].forEach((z, si) => {
      g.add(box(`Estante_Prateleira_${si}`, [0.3, 0.86, 0.02], [x, 0.2, z], mTampo))
      // Espessura, altura e profundidade variam por livro (multiplicadores
      // primos entre si pra não repetir padrão de prateleira pra prateleira)
      // — é o que lê como vários livros encostados, não um bloco liso.
      const espessuras = Array.from({ length: nLivros }, (_, i) => 0.028 + ((si * 5 + i * 3) % 5) * 0.006)
      const largura = espessuras.reduce((a, b) => a + b, 0) + (nLivros - 1) * 0.003
      let yCursor = 0.2 - largura / 2
      for (let i = 0; i < nLivros; i++) {
        const espessura = espessuras[i]
        const altura = 0.15 + ((si * 2 + i * 7) % 6) * 0.011
        const profundidade = 0.16 + (i % 3) * 0.012
        const tombado = i === (si * 3 + 2) % nLivros // um livro caído por prateleira
        yCursor += espessura / 2
        g.add(box(
          `Estante_Livro_${si}_${i}`,
          [profundidade, espessura, altura],
          [x + 0.02 + (tombado ? 0.006 : 0), yCursor, z + 0.011 + altura / 2],
          mLivro[(si * 7 + i * 5) % mLivro.length],
          tombado ? [D(9), 0, 0] : undefined
        ))
        yCursor += espessura / 2 + 0.003
      }
    })
  }

  if (extras.quadro) {
    const mMold = tmat([0.42, 0.31, 0.18])
    const mCeu = tmat([0.75, 0.89, 0.95])
    const mMont = tmat([0.54, 0.59, 0.65])
    g.add(box("Quadro_Moldura", [0.56, 0.04, 0.42], [-0.95, S - 0.08, 1.8], mMold))
    g.add(box("Quadro_Tela", [0.48, 0.01, 0.34], [-0.95, S - 0.105, 1.8], mCeu))
    // Achatadas em Y: são um relevo na tela. Cone redondo aqui atravessaria a
    // parede (o raio cresce nos DOIS sentidos de y, não só para o observador).
    const montanha = (nome: string, raio: number, alt: number, p: V3, mat: Material) => {
      const m = cyl(nome, raio, alt, p, mat, undefined, 0.001)
      m.scale.y = 0.12
      return m
    }
    g.add(montanha("Quadro_Montanha_A", 0.13, 0.2, [-1.03, S - 0.116, 1.74], mMont))
    g.add(montanha("Quadro_Montanha_B", 0.1, 0.15, [-0.87, S - 0.116, 1.72], tmat([0.62, 0.66, 0.71])))
  }

  if (extras.neon) {
    // Na parede LATERAL (x=-1.95) para não brigar com quadro/janela no fundo.
    const rosa = tmat([1, 0.31, 0.64], 2.2)
    const ciano = tmat([0.35, 0.88, 1], 2.2)
    g.add(box("Neon_Placa", [0.04, 0.78, 0.34], [-S + 0.08, 0.75, 1.75], tmat([0.14, 0.11, 0.21])))
    g.add(box("Neon_Barra_Topo", [0.02, 0.6, 0.035], [-S + 0.11, 0.75, 1.86], rosa))
    for (let i = 0; i < 3; i++) {
      g.add(box(`Neon_Barra_${i}`, [0.02, 0.035, 0.24], [-S + 0.11, 0.55 + i * 0.2, 1.68], ciano))
    }
  }

  if (extras.trofeu) {
    const ouro = tmat([0.91, 0.72, 0.23], 0.15, "brilhante")
    const x = -0.58, y = 1.32 + dy
    zona.add(box("Trofeu_Base", [0.1, 0.1, 0.03], [x, y, TAMPO_Z + 0.015], tmat([0.29, 0.21, 0.14])))
    zona.add(cyl("Trofeu_Haste", 0.014, 0.06, [x, y, TAMPO_Z + 0.06], ouro))
    zona.add(cyl("Trofeu_Taca", 0.028, 0.09, [x, y, TAMPO_Z + 0.135], ouro, undefined, 0.07))
  }

  if (extras.gato) {
    const mPelo = tmat([0.85, 0.54, 0.25], 0, "tecido")
    const mPeloD = tmat([0.79, 0.47, 0.21], 0, "tecido")
    const x = 0.8, y = 0.3 + dy
    g.add(sph("Gato_Corpo", 0.12, [x, y, 0.12], mPelo, [1, 1.35, 1]))
    g.add(sph("Gato_Cabeca", 0.085, [x, y - 0.15, 0.26], mPelo))
    for (const lado of [1, -1]) {
      g.add(cyl(`Gato_Orelha_${lado}`, 0.035, 0.07, [x + lado * 0.05, y - 0.15, 0.33], mPeloD, undefined, 0.001))
    }
    g.add(cyl("Gato_Rabo", 0.022, 0.24, [x, y + 0.19, 0.15], mPeloD, [D(35), 0, 0]))
  }

  return g
}

// ─────────────────────────────────────────────────────────────────────────
// PERSONAGEM cartoon sentado. Cores vindas da skin (tint recolore a camisa).
// ─────────────────────────────────────────────────────────────────────────
export interface PersonagemCores {
  pele?: string | [number, number, number]
  camisa?: string | [number, number, number]
  calca?: string | [number, number, number]
  sapato?: string | [number, number, number]
  cabelo?: string | [number, number, number]
}

// Acessórios vestíveis comprados na loja. Slots independentes (dá para usar
// chapéu E óculos juntos); dentro de cada slot só um por vez.
export interface PersonagemAcessorios {
  chapeu?: "bone" | "social" | "coroa"
  oculos?: "grau" | "escuros"
}

const CENTRO_Y = 0.9

/** Prefixo do grupo que a cena gira para o boneco digitar (sufixo = o lado). */
export const PIVO_ANTEBRACO = "Antebraco_Pivo_"

// Pose do braço em PONTOS (x é espelhado pelo lado; y/z valem para os dois).
// O teclado ocupa y ∈ [1.26, 1.38] com o topo em z=0.83, então a mão pousa em
// y=1.29 e paira 2 cm acima das teclas — a tecladinha de office-typing encosta
// no fundo do movimento e não atravessa. Antes a mão parava em y=1.16, z=0.82:
// 16 cm ATRÁS do teclado e ao lado dele (x=0.2, fora dos ±0.16 das teclas). O
// boneco não deixava de digitar por falta de animação — ele nem alcançava.
const OMBRO: [number, number, number] = [0.175, CENTRO_Y, 1.0]        // fora do torso (±0.16)
const COTOVELO: [number, number, number] = [0.16, CENTRO_Y + 0.15, 0.8]
const MAO: [number, number, number] = [0.09, CENTRO_Y + 0.39, 0.9]    // dentro das teclas

export function buildPersonagem(cores: PersonagemCores = {}, acess: PersonagemAcessorios = {}): Group {
  const g = new Group()
  const mPele = tmat(cores.pele ?? [0.94, 0.76, 0.62], 0, "pele")
  const mCam = tmat(cores.camisa ?? [0.25, 0.55, 0.78], 0, "tecido")
  const mCal = tmat(cores.calca ?? [0.24, 0.24, 0.3], 0, "tecido")
  const mSap = tmat(cores.sapato ?? [0.15, 0.15, 0.16], 0, "plastico")
  const mCab = tmat(cores.cabelo ?? [0.32, 0.2, 0.14], 0, "tecido")
  const mOlho = tmat([0.08, 0.08, 0.08])
  const mBoca = tmat([0.55, 0.3, 0.28])

  g.add(box("Quadril", [0.3, 0.24, 0.18], [0, CENTRO_Y, 0.56], mCal))
  g.add(box("Torso", [0.32, 0.2, 0.42], [0, CENTRO_Y, 0.86], mCam))
  g.add(cyl("Pescoco", 0.05, 0.08, [0, CENTRO_Y, 1.11], mCam))

  g.add(sph("Cabeca", 0.14, [0, CENTRO_Y, 1.26], mPele))
  g.add(sph("Cabelo", 0.145, [0, CENTRO_Y - 0.01, 1.32], mCab, [1, 1, 0.55]))
  g.add(sph("Olho_Direito", 0.018, [0.05, CENTRO_Y + 0.12, 1.28], mOlho))
  g.add(sph("Olho_Esquerdo", 0.018, [-0.05, CENTRO_Y + 0.12, 1.28], mOlho))
  g.add(box("Boca", [0.05, 0.015, 0.015], [0, CENTRO_Y + 0.12, 1.2], mBoca))

  for (const lado of [1, -1]) {
    const suf = lado === 1 ? "Direito" : "Esquerdo"
    const ombro: V3 = [lado * OMBRO[0], OMBRO[1], OMBRO[2]]
    const cotovelo: V3 = [lado * COTOVELO[0], COTOVELO[1], COTOVELO[2]]
    const mao: V3 = [lado * MAO[0], MAO[1], MAO[2]]
    g.add(segmento(`Braco_${suf}`, ombro, cotovelo, 0.045, mCam))
    // Antebraço e mão num grupo com origem no COTOVELO: girar esse grupo em X
    // é exatamente o gesto de digitar (a mão sobe e desce em arco). É por este
    // nome que a cena acha o pivô a cada quadro — ver lib/office-typing.
    const pivo = new Group()
    pivo.name = `${PIVO_ANTEBRACO}${suf}`
    pivo.position.set(...cotovelo)
    const rel: V3 = [mao[0] - cotovelo[0], mao[1] - cotovelo[1], mao[2] - cotovelo[2]]
    pivo.add(segmento(`Antebraco_${suf}`, [0, 0, 0], rel, 0.04, mPele))
    pivo.add(sph(`Mao_${suf}`, 0.05, rel, mPele))
    g.add(pivo)
  }
  for (const lado of [1, -1]) {
    const qx = lado * 0.1
    const suf = lado === 1 ? "Direita" : "Esquerda"
    g.add(cyl(`Coxa_${suf}`, 0.07, 0.35, [qx, CENTRO_Y + 0.175, 0.56], mCal, [D(90), 0, 0]))
    g.add(cyl(`Canela_${suf}`, 0.055, 0.56, [qx, CENTRO_Y + 0.35, 0.28], mCal))
    g.add(box(`Pe_${suf}`, [0.1, 0.22, 0.06], [qx, CENTRO_Y + 0.42, 0.03], mSap))
  }

  // ---- Acessórios da loja ----
  // O rosto olha para +Y (olhos em CENTRO_Y + 0.12), a cabeça é uma esfera de
  // raio 0.14 centrada em z=1.26 — topo em z≈1.40. Tudo abaixo se apoia nisso.

  if (acess.chapeu === "bone") {
    // Copa rasa e alta o bastante para não descer sobre os olhos (z≈1.28).
    const mBone = tmat([0.16, 0.35, 0.62])
    g.add(sph("Bone_Copa", 0.152, [0, CENTRO_Y, 1.362], mBone, [1, 1, 0.38]))
    g.add(box("Bone_Aba", [0.26, 0.17, 0.022], [0, CENTRO_Y + 0.19, 1.32], mBone))
  }

  if (acess.chapeu === "social") {
    const mFeltro = tmat([0.18, 0.16, 0.19])
    const mFita = tmat([0.55, 0.14, 0.2])
    g.add(cyl("Chapeu_Aba", 0.25, 0.022, [0, CENTRO_Y, 1.395], mFeltro))
    g.add(cyl("Chapeu_Fita", 0.142, 0.045, [0, CENTRO_Y, 1.428], mFita))
    g.add(cyl("Chapeu_Copa", 0.135, 0.12, [0, CENTRO_Y, 1.5], mFeltro))
  }

  if (acess.chapeu === "coroa") {
    const ouro = tmat([0.93, 0.75, 0.24], 0.45)
    g.add(cyl("Coroa_Aro", 0.142, 0.055, [0, CENTRO_Y, 1.41], ouro))
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180
      g.add(cyl(`Coroa_Ponta_${i}`, 0.032, 0.075, [Math.cos(a) * 0.125, CENTRO_Y + Math.sin(a) * 0.125, 1.47], ouro, undefined, 0.001))
    }
  }

  if (acess.oculos) {
    const escuros = acess.oculos === "escuros"
    const mAro = tmat(escuros ? [0.12, 0.12, 0.14] : [0.28, 0.2, 0.14])
    const mLente = escuros ? tmat([0.09, 0.1, 0.13]) : tmat([0.72, 0.85, 0.92])
    // À FRENTE dos olhos: a esfera da cabeça chega a y≈1.04 na altura deles,
    // então a lente precisa passar disso para não ficar embutida no rosto.
    for (const lado of [1, -1]) {
      const suf = lado === 1 ? "Direita" : "Esquerda"
      g.add(box(`Oculos_Lente_${suf}`, [0.078, 0.014, 0.062], [lado * 0.055, CENTRO_Y + 0.148, 1.281], mLente))
      g.add(box(`Oculos_Haste_${suf}`, [0.012, 0.11, 0.012], [lado * 0.1, CENTRO_Y + 0.075, 1.281], mAro))
    }
    g.add(box("Oculos_Ponte", [0.038, 0.014, 0.012], [0, CENTRO_Y + 0.148, 1.288], mAro))
  }

  return g
}
