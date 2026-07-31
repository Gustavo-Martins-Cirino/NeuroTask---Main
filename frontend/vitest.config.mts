import { defineConfig } from "vitest/config"
import { resolve } from "path"

// Só os módulos determinísticos de lib/ são testados aqui — os que decidem
// datas, XP, recorrência e parsing sem tocar rede. Componente e rota ficam de
// fora de propósito: exigiriam DOM e mock de Supabase, e não é onde a lógica
// sutil mora.

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
