"use client"

import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Layers, MeshBasicMaterial, ShaderMaterial, Vector2, type Material, type Mesh } from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"

// Bloom SELETIVO: só o que acende (neon, telas, LEDs do gabinete, janelinhas da
// cidade) espalha luz. Sem dependência nova — o pós-processamento vem no próprio
// three.
//
// Por que seletivo e não um bloom global com threshold: a sala é clara e bem
// iluminada, então as paredes passam de qualquer threshold e a cena inteira
// estoura em branco (foi o primeiro render de teste). A seleção tem de ser por
// CAMADA, não por brilho do pixel.
//
// Como funciona: passe 1 pinta de preto tudo que não acende e roda o bloom;
// passe 2 desenha a cena normal e soma o brilho por cima.

export const CAMADA_BLOOM = 1

/** Marca as malhas que devem brilhar. Critério: material com emissivo de
 *  verdade — assim item novo que acenda entra sozinho, sem lista de nomes. */
export function marcarQuemAcende(root: { traverse: (cb: (o: unknown) => void) => void }) {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !m.material || Array.isArray(m.material)) return
    const mat = m.material as { emissive?: { r: number; g: number; b: number }; emissiveIntensity?: number }
    const e = mat.emissive
    if (e && (mat.emissiveIntensity ?? 0) > 0.5 && e.r + e.g + e.b > 0.05) m.layers.enable(CAMADA_BLOOM)
  })
}

export function OfficeBloom({ forca = 1.05 }: { forca?: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const { bloomComposer, finalComposer, escuro, camadaBloom, guardados } = useMemo(() => {
    const camadaBloom = new Layers()
    camadaBloom.set(CAMADA_BLOOM)

    const bloomComposer = new EffectComposer(gl)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(new RenderPass(scene, camera))
    bloomComposer.addPass(new UnrealBloomPass(new Vector2(size.width, size.height), forca, 0.6, 0))

    const finalComposer = new EffectComposer(gl)
    finalComposer.addPass(new RenderPass(scene, camera))
    finalComposer.addPass(
      new ShaderPass(
        new ShaderMaterial({
          uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture },
          },
          vertexShader: `varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          // O ALPHA importa: o canvas é transparente e o fundo escolhido pelo
          // usuário mora no CSS atrás dele. Somar alpha do bloom cru pintaria a
          // cena inteira de preto opaco e comeria esse fundo — então o alpha
          // sai do base, acrescido só do brilho que vazou para fora das peças.
          fragmentShader: `uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;
            varying vec2 vUv;
            void main() {
              vec4 base = texture2D(baseTexture, vUv);
              vec3 brilho = texture2D(bloomTexture, vUv).rgb;
              float a = clamp(base.a + max(brilho.r, max(brilho.g, brilho.b)), 0.0, 1.0);
              gl_FragColor = vec4(base.rgb + brilho, a);
            }`,
          transparent: true,
        }),
        "baseTexture"
      )
    )
    finalComposer.addPass(new OutputPass())

    return { bloomComposer, finalComposer, escuro: new MeshBasicMaterial({ color: 0x000000 }), camadaBloom, guardados: new Map<string, Material>() }
  }, [gl, scene, camera, size.width, size.height, forca])

  useEffect(() => {
    bloomComposer.setSize(size.width, size.height)
    finalComposer.setSize(size.width, size.height)
  }, [bloomComposer, finalComposer, size.width, size.height])

  useEffect(() => () => {
    bloomComposer.dispose()
    finalComposer.dispose()
    escuro.dispose()
  }, [bloomComposer, finalComposer, escuro])

  // priority 1: assume o desenho no lugar do render padrão do R3F.
  useFrame(() => {
    scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh && !camadaBloom.test(m.layers)) {
        guardados.set(m.uuid, m.material as Material)
        m.material = escuro
      }
    })
    bloomComposer.render()
    scene.traverse((o) => {
      const m = o as Mesh
      const salvo = guardados.get(m.uuid)
      if (salvo) {
        m.material = salvo
        guardados.delete(m.uuid)
      }
    })
    finalComposer.render()
  }, 1)

  return null
}
