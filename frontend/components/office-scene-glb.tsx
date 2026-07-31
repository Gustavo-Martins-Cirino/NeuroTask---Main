"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import type { Group, Mesh, Object3D, MeshStandardMaterial } from "three"

// Escritório 3D a partir dos GLB do Blender (personagem.glb / escritorio.glb),
// com o personagem em PARTES nomeadas animadas por useFrame (respirar, olhar,
// digitar). Alternativa à cena procedural `office-scene-3d.tsx` — este NÃO está
// ligado no app e depende dos dois GLB existirem em public/models.
//
// Uso: dentro de um <Canvas><Suspense fallback={...}> ... </Suspense></Canvas>.

const MODELO_PERSONAGEM = "/models/personagem.glb"
const MODELO_SALA = "/models/escritorio.glb"

const PARTES_CABECA = [
  "Cabeca", "Pescoco", "Cabelo", "Cabelo_Franja",
  "Olho_Direito", "Olho_Esquerdo", "Boca",
  "Blush_Direito", "Blush_Esquerdo", "Orelha_Direita", "Orelha_Esquerda",
]

const PARTES_CORPO = [
  "Torso", "Gola", "Coxa_Direita", "Coxa_Esquerda",
  "Canela_Direita", "Canela_Esquerda", "Pe_Direito", "Pe_Esquerdo",
]

// Pivôs de rotação (o mesh já vem na posição final, então giramos em torno do
// ponto certo compensando com -pivo dentro e +pivo fora).
const PIVO_CABECA: [number, number, number] = [0, 1.13, 0]
const PIVO_OMBRO = {
  direito: [0.255, 0.91, -0.02] as [number, number, number],
  esquerdo: [-0.255, 0.91, -0.02] as [number, number, number],
}

type Nodes = Record<string, Mesh>

function Peca({ nodes, nome }: { nodes: Nodes; nome: string }) {
  const no = nodes[nome]
  if (!no) return null
  return <mesh geometry={no.geometry} material={no.material} castShadow receiveShadow />
}

function Articulacao({
  pivo, grupoRef, children,
}: {
  pivo: [number, number, number]
  grupoRef: React.RefObject<Group | null>
  children: React.ReactNode
}) {
  return (
    <group position={pivo}>
      <group ref={grupoRef}>
        <group position={[-pivo[0], -pivo[1], -pivo[2]]}>{children}</group>
      </group>
    </group>
  )
}

function Personagem({
  position = [-0.3, 0, -1.14],
  rotation = [0, Math.PI, 0],
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  const { nodes } = useGLTF(MODELO_PERSONAGEM) as unknown as { nodes: Nodes }
  const torso = useRef<Group>(null)
  const cabeca = useRef<Group>(null)
  const bracoD = useRef<Group>(null)
  const bracoE = useRef<Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // respirar: o torso infla de leve
    if (torso.current) {
      torso.current.scale.set(1, 1 + Math.sin(t * 1.6) * 0.018, 1)
      torso.current.position.y = Math.sin(t * 1.6) * 0.008
    }
    // cabeça: olha pra câmera e balança devagar
    if (cabeca.current) {
      cabeca.current.rotation.y = -0.85 + Math.sin(t * 0.7) * 0.09
      cabeca.current.rotation.x = Math.sin(t * 1.1) * 0.04
    }
    // digitar: braços alternando
    if (bracoD.current) bracoD.current.rotation.x = Math.sin(t * 9) * 0.055
    if (bracoE.current) bracoE.current.rotation.x = Math.sin(t * 9 + Math.PI) * 0.055
  })

  return (
    <group position={position} rotation={rotation}>
      <group ref={torso}>
        {PARTES_CORPO.map((n) => <Peca key={n} nodes={nodes} nome={n} />)}
      </group>

      <Articulacao pivo={PIVO_CABECA} grupoRef={cabeca}>
        {PARTES_CABECA.map((n) => <Peca key={n} nodes={nodes} nome={n} />)}
      </Articulacao>

      <Articulacao pivo={PIVO_OMBRO.direito} grupoRef={bracoD}>
        <Peca nodes={nodes} nome="Braco_Direito" />
        <Peca nodes={nodes} nome="Antebraco_Direito" />
        <Peca nodes={nodes} nome="Mao_Direita" />
      </Articulacao>

      <Articulacao pivo={PIVO_OMBRO.esquerdo} grupoRef={bracoE}>
        <Peca nodes={nodes} nome="Braco_Esquerdo" />
        <Peca nodes={nodes} nome="Antebraco_Esquerdo" />
        <Peca nodes={nodes} nome="Mao_Esquerda" />
      </Articulacao>
    </group>
  )
}

function Sala() {
  const { scene, nodes } = useGLTF(MODELO_SALA) as unknown as { scene: Group; nodes: Nodes }

  // Prepara a sala uma vez: liga sombras e coleta as folhas (qualquer nó com
  // "Folha" no nome) — sem isso a animação da folhagem ficava sem alvo.
  const folhas = useMemo(() => {
    const arr: Object3D[] = []
    scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
      if (o.name.includes("Folha")) arr.push(o)
    })
    return arr
  }, [scene])

  const tela = nodes.Monitor_Tela

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    folhas.forEach((folha, i) => {
      folha.rotation.z = Math.sin(t * 1.2 + i) * 0.05
    })
    const mat = tela?.material as MeshStandardMaterial | undefined
    if (mat) mat.emissiveIntensity = 0.6 + Math.sin(t * 2.4) * 0.12
  })

  return <primitive object={scene} />
}

export default function Escritorio() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.5} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#b8c8ff" />
      <Sala />
      <Personagem />
    </>
  )
}

useGLTF.preload(MODELO_SALA)
useGLTF.preload(MODELO_PERSONAGEM)
