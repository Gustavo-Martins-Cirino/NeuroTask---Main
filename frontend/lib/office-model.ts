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
// ESCRITÓRIO (sala, mesa, cadeira, PC, janela, tapete, plantas)
// ─────────────────────────────────────────────────────────────────────────
export function buildEscritorio(): Group {
  const g = new Group()
  const mPiso = tmat([0.82, 0.62, 0.4])
  const mParede = tmat([0.94, 0.9, 0.85])
  const mRodape = tmat([1, 1, 1])
  const mTampo = tmat([0.74, 0.53, 0.34])
  const mPerna = tmat([0.22, 0.2, 0.18])
  const mCad = tmat([0.13, 0.13, 0.15])
  const mBezel = tmat([0.07, 0.07, 0.09])
  const mGlow = tmat([0.35, 0.75, 1.0], 1.2)
  const mPC = tmat([0.9, 0.9, 0.92])
  const mTap = tmat([0.9, 0.53, 0.18])
  const mVaso = tmat([0.88, 0.88, 0.88])
  const mFolha = tmat([0.27, 0.55, 0.3])
  const mJan = tmat([1, 1, 1])
  const mPers = tmat([0.96, 0.95, 0.92])

  g.add(box("Piso", [4, 4, 0.1], [0, 0, -0.05], mPiso))
  g.add(box("Parede_Fundo", [4, 0.1, 2.6], [0, 2, 1.3], mParede))
  g.add(box("Parede_Lateral", [0.1, 4, 2.6], [-2, 0, 1.3], mParede))
  g.add(box("Rodape_Fundo", [4, 0.12, 0.14], [0, 1.91, 0.07], mRodape))
  g.add(box("Rodape_Lateral", [0.12, 4, 0.14], [-1.91, 0, 0.07], mRodape))

  g.add(box("Mesa_Tampo", [1.6, 0.7, 0.06], [0, 1.55, 0.78], mTampo))
  for (const ox of [0.72, -0.72]) for (const oy of [1.85, 1.25]) g.add(cyl(`Mesa_Perna_${ox}_${oy}`, 0.025, 0.72, [ox, oy, 0.36], mPerna))

  g.add(box("Cadeira_Assento", [0.5, 0.5, 0.08], [0, 0.9, 0.46], mCad))
  g.add(box("Cadeira_Encosto", [0.48, 0.08, 0.55], [0, 0.64, 0.775], mCad))
  g.add(cyl("Cadeira_Coluna", 0.04, 0.42, [0, 0.9, 0.21], mCad))
  g.add(cyl("Cadeira_Base", 0.32, 0.05, [0, 0.9, 0.03], mCad))

  g.add(box("Monitor_Suporte", [0.08, 0.06, 0.14], [0, 1.35, 0.87], mPC))
  g.add(box("Monitor_Bezel", [0.58, 0.035, 0.36], [0, 1.32, 1.1], mBezel))
  g.add(box("Monitor_Tela", [0.5, 0.01, 0.3], [0, 1.3, 1.1], mGlow))
  g.add(box("PC_Torre", [0.14, 0.3, 0.36], [0.6, 1.5, 0.96], mPC))
  g.add(box("Teclado", [0.32, 0.12, 0.02], [0, 1.0, 0.82], mPC))
  g.add(box("Mouse", [0.06, 0.09, 0.02], [0.22, 1.0, 0.82], mPC))

  g.add(box("Janela_Moldura", [1.3, 0.06, 1.4], [1.1, 1.98, 1.55], mJan))
  for (let i = 0; i < 9; i++) g.add(box(`Persiana_Lamina_${i}`, [1.15, 0.03, 0.05], [1.1, 1.94, 1.0 + i * 0.14], mPers))

  g.add(cyl("Tapete", 0.95, 0.03, [0, 0.85, 0.015], mTap))

  const planta = (nome: string, p: V3) => {
    g.add(cyl(`${nome}_Vaso`, 0.18, 0.25, p, mVaso, undefined, 0.13))
    const t: V3 = [p[0], p[1], p[2] + 0.15]
    const offs: V3[] = [[0.06, 0, 0.18], [-0.06, 0.03, 0.24], [0, -0.06, 0.3], [0.05, 0.05, 0.34], [-0.04, -0.04, 0.4]]
    offs.forEach(([dx, dy, dz], i) => g.add(sph(`${nome}_Folha_${i}`, 0.08, [t[0] + dx, t[1] + dy, t[2] + dz], mFolha, [1, 1, 1.6])))
  }
  planta("Planta_A", [-1.55, 1.5, 0])
  planta("Planta_B", [1.6, 0.4, 0])
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

const CENTRO_Y = 0.9

export function buildPersonagem(cores: PersonagemCores = {}): Group {
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
  return g
}
