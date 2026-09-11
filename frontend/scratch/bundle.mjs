import * as esbuild from "file:///C:/Users/cirinogustavom/Desktop/NeuroTask---Main/frontend/node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/lib/main.js"
import { resolve } from "path"
await esbuild.build({
  entryPoints: ["scratch/sg.tsx"],
  bundle: true, outfile: "scratch/sg.js", format: "iife",
  jsx: "automatic", alias: { "@": resolve(".") },
  define: { "process.env.NODE_ENV": '"development"' },
  loader: { ".js": "jsx" },
})
console.log("ok")
