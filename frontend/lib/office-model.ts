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
  MeshToonMaterial,
  SphereGeometry,
  type Material,
} from "three"
import { TOON_GRADIENT } from "@/lib/toon"

type V3 = [number, number, number]

function tmat(cor: string | [number, number, number], emissive = 0): MeshToonMaterial {
  const color = Array.isArray(cor) ? new Color(cor[0], cor[1], cor[2]) : new Color(cor)
  const m = new MeshToonMaterial({ color, gradientMap: TOON_GRADIENT })
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

function sph(name: string, raio: number, pos: V3, material: Material, esc?: V3): Mesh {
  const m = new Mesh(new SphereGeometry(raio, 16, 12), material)
  m.name = name
  m.position.set(...pos)
  if (esc) m.scale.set(...esc)
  m.castShadow = true
  return m
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
}

export interface EscritorioOpts {
  extras?: EscritorioExtras
  cores?: { parede?: string; piso?: string; cadeira?: string }
  /** Nível do dono: a sala cresce com ele (comparação social num relance). */
  nivel?: number
}

const TAMPO_Z = 0.81 // topo da mesa: onde os itens de mesa se apoiam

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
  const mPiso = tmat(opts.cores?.piso ?? [0.82, 0.62, 0.4])
  const mParede = tmat(opts.cores?.parede ?? [0.94, 0.9, 0.85])
  const mCad = tmat(opts.cores?.cadeira ?? [0.13, 0.13, 0.15])
  const mRodape = tmat([1, 1, 1])
  const mTampo = tmat([0.74, 0.53, 0.34])
  const mPerna = tmat([0.22, 0.2, 0.18])
  const mBezel = tmat([0.07, 0.07, 0.09])
  const mGlow = tmat([0.35, 0.75, 1.0], 1.2)
  const mPC = tmat([0.9, 0.9, 0.92])
  const mMadeira = tmat([0.48, 0.32, 0.19])
  const mVaso = tmat([0.88, 0.88, 0.88])
  const mFolha = tmat([0.27, 0.55, 0.3])

  g.add(box("Piso", [tam, tam, 0.1], [0, 0, -0.05], mPiso))
  g.add(box("Parede_Fundo", [tam, 0.1, 2.6], [0, S, 1.3], mParede))
  g.add(box("Parede_Lateral", [0.1, tam, 2.6], [-S, 0, 1.3], mParede))
  g.add(box("Rodape_Fundo", [tam, 0.12, 0.14], [0, S - 0.09, 0.07], mRodape))
  g.add(box("Rodape_Lateral", [0.12, tam, 0.14], [-S + 0.09, 0, 0.07], mRodape))

  g.add(box("Mesa_Tampo", [1.6, 0.7, 0.06], [0, 1.55 + dy, 0.78], mTampo))
  for (const ox of [0.72, -0.72]) for (const oy of [1.85, 1.25]) g.add(cyl(`Mesa_Perna_${ox}_${oy}`, 0.025, 0.72, [ox, oy + dy, 0.36], mPerna))

  g.add(box("Cadeira_Assento", [0.5, 0.5, 0.08], [0, 0.9 + dy, 0.46], mCad))
  g.add(box("Cadeira_Encosto", [0.48, 0.08, 0.55], [0, 0.64 + dy, 0.775], mCad))
  g.add(cyl("Cadeira_Coluna", 0.04, 0.42, [0, 0.9 + dy, 0.21], mCad))
  g.add(cyl("Cadeira_Base", 0.32, 0.05, [0, 0.9 + dy, 0.03], mCad))

  g.add(box("Monitor_Suporte", [0.08, 0.06, 0.14], [0, 1.35 + dy, 0.87], mPC))
  g.add(box("Monitor_Bezel", [0.58, 0.035, 0.36], [0, 1.32 + dy, 1.1], mBezel))
  g.add(box("Monitor_Tela", [0.5, 0.01, 0.3], [0, 1.3 + dy, 1.1], mGlow))
  g.add(box("PC_Torre", [0.14, 0.3, 0.36], [0.6, 1.5 + dy, 0.96], mPC))
  g.add(box("Teclado", [0.32, 0.12, 0.02], [0, 1.32 + dy, TAMPO_Z + 0.01], mPC))
  g.add(box("Mouse", [0.06, 0.09, 0.02], [0.26, 1.32 + dy, TAMPO_Z + 0.01], mPC))

  // ---- Itens da loja ----

  if (extras.janela) {
    const mJan = tmat([1, 1, 1])
    const mPers = tmat([0.96, 0.95, 0.92])
    g.add(box("Janela_Moldura", [1.3, 0.06, 1.4], [1.1, S - 0.02, 1.55], mJan))
    for (let i = 0; i < 9; i++) g.add(box(`Persiana_Lamina_${i}`, [1.15, 0.03, 0.05], [1.1, S - 0.06, 1.0 + i * 0.14], mPers))
  }

  if (extras.tapete) {
    g.add(cyl("Tapete", 0.95, 0.03, [0, 0.85 + dy, 0.015], tmat([0.9, 0.53, 0.18])))
  }

  // Vaso apoiado no piso/mesa: o centro sobe metade da altura para não afundar.
  const planta = (nome: string, p: V3, escala: number) => {
    const altVaso = 0.25 * escala
    g.add(cyl(`${nome}_Vaso`, 0.18 * escala, altVaso, [p[0], p[1], p[2] + altVaso / 2], mVaso, undefined, 0.13 * escala))
    const base = p[2] + altVaso
    const offs: V3[] = [[0.06, 0, 0.03], [-0.06, 0.03, 0.09], [0, -0.06, 0.15], [0.05, 0.05, 0.19], [-0.04, -0.04, 0.25]]
    offs.forEach(([dx, dy, dz], i) =>
      g.add(sph(`${nome}_Folha_${i}`, 0.08 * escala, [p[0] + dx * escala, p[1] + dy * escala, base + dz * escala], mFolha, [1, 1, 1.6]))
    )
  }
  if (extras.plantaGrande) planta("Planta_Grande", [-S + 0.5, S - 0.55, 0], 1.15)
  if (extras.plantaPequena) planta("Planta_Pequena", [0.45, 1.78 + dy, TAMPO_Z], 0.34)

  if (extras.luminaria) {
    const mMetal = tmat([0.23, 0.26, 0.31])
    const mCupula = tmat([0.88, 0.7, 0.23])
    const x = -0.6, y = 1.76 + dy
    g.add(cyl("Luminaria_Base", 0.07, 0.02, [x, y, TAMPO_Z + 0.01], mMetal))
    g.add(cyl("Luminaria_Haste", 0.012, 0.3, [x, y, TAMPO_Z + 0.16], mMetal))
    g.add(cyl("Luminaria_Braco", 0.012, 0.22, [x + 0.08, y - 0.02, TAMPO_Z + 0.31], mMetal, [D(70), 0, 0]))
    g.add(cyl("Luminaria_Cupula", 0.09, 0.11, [x + 0.15, y - 0.09, TAMPO_Z + 0.3], mCupula, [D(50), 0, 0], 0.04))
    g.add(sph("Luminaria_Bulbo", 0.04, [x + 0.15, y - 0.11, TAMPO_Z + 0.26], tmat([1, 0.94, 0.78], 1.8)))
  }

  if (extras.estante) {
    const mLivro = [
      tmat([0.75, 0.29, 0.18]), tmat([0.18, 0.42, 0.69]), tmat([0.88, 0.7, 0.23]),
      tmat([0.31, 0.62, 0.35]), tmat([0.54, 0.36, 0.94]), tmat([0.84, 0.42, 0.53]),
    ]
    const x = -S + 0.26
    g.add(box("Estante_Corpo", [0.34, 0.9, 1.25], [x, 0.2, 0.625], mMadeira))
    ;[0.4, 0.72, 1.04].forEach((z, si) => {
      g.add(box(`Estante_Prateleira_${si}`, [0.3, 0.86, 0.02], [x, 0.2, z], mTampo))
      for (let i = 0; i < 6; i++) {
        g.add(box(`Estante_Livro_${si}_${i}`, [0.2, 0.045, 0.2], [x + 0.02, -0.16 + i * 0.075, z + 0.11], mLivro[(si + i) % 6]))
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
    const ouro = tmat([0.91, 0.72, 0.23], 0.35)
    const x = -0.58, y = 1.32 + dy
    g.add(box("Trofeu_Base", [0.1, 0.1, 0.03], [x, y, TAMPO_Z + 0.015], tmat([0.29, 0.21, 0.14])))
    g.add(cyl("Trofeu_Haste", 0.014, 0.06, [x, y, TAMPO_Z + 0.06], ouro))
    g.add(cyl("Trofeu_Taca", 0.028, 0.09, [x, y, TAMPO_Z + 0.135], ouro, undefined, 0.07))
  }

  if (extras.gato) {
    const mPelo = tmat([0.85, 0.54, 0.25])
    const mPeloD = tmat([0.79, 0.47, 0.21])
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

export function buildPersonagem(cores: PersonagemCores = {}, acess: PersonagemAcessorios = {}): Group {
  const g = new Group()
  const mPele = tmat(cores.pele ?? [0.94, 0.76, 0.62])
  const mCam = tmat(cores.camisa ?? [0.25, 0.55, 0.78])
  const mCal = tmat(cores.calca ?? [0.24, 0.24, 0.3])
  const mSap = tmat(cores.sapato ?? [0.15, 0.15, 0.16])
  const mCab = tmat(cores.cabelo ?? [0.32, 0.2, 0.14])
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
    const ox = lado * 0.2
    const suf = lado === 1 ? "Direito" : "Esquerdo"
    g.add(cyl(`Braco_${suf}`, 0.045, 0.22, [ox, CENTRO_Y + 0.03, 0.87], mCam, [D(25), 0, 0]))
    g.add(cyl(`Antebraco_${suf}`, 0.04, 0.24, [ox, CENTRO_Y + 0.16, 0.8], mPele, [D(80), 0, 0]))
    g.add(sph(`Mao_${suf}`, 0.05, [ox, CENTRO_Y + 0.26, 0.82], mPele))
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
