import { createRoot } from "react-dom/client"
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react"

function App() {
  return (
    <ShaderGradientCanvas style={{ width: 900, height: 520 }}>
      <ShaderGradient
        control="props"
        type="waterPlane"
        color1="#5c2ecc"
        color2="#1e6fd9"
        color3="#0b1026"
        uSpeed={0.2}
        uDensity={1.3}
        uStrength={2.4}
        cAzimuthAngle={180}
        cPolarAngle={80}
        cDistance={3}
        positionX={0}
        positionY={0}
        positionZ={0}
        rotationX={50}
        rotationY={0}
        rotationZ={-60}
        brightness={1.1}
        grain="on"
      />
    </ShaderGradientCanvas>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
