import { createBrowserClient } from '@supabase/ssr'
import { EVENTO_CONEXAO, respostaIndicaQueda, type PulsoDeConexao } from '@/lib/conexao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * O `fetch` do Supabase, com um observador em cima.
 *
 * Ele só ESCUTA: repassa a resposta e relança o erro exatamente como vieram. A
 * única coisa que faz a mais é disparar um evento dizendo se o servidor
 * respondeu — é o que o aviso de conexão (components/aviso-conexao.tsx) usa para
 * saber que o banco caiu.
 *
 * Aqui, e não em cada tela, porque são oito telas fazendo consultas próprias: um
 * observador no cliente pega todas de uma vez e não deixa a próxima de fora.
 */
function fetchObservado(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const avisar = (pulso: PulsoDeConexao) => {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent<PulsoDeConexao>(EVENTO_CONEXAO, { detail: pulso }))
  }
  return fetch(entrada, init).then(
    (r) => {
      avisar({ ok: !respostaIndicaQueda(r.status), quando: Date.now() })
      return r
    },
    (e) => {
      // Sem resposta: rede fora, DNS, servidor inalcançável.
      avisar({ ok: false, quando: Date.now() })
      throw e
    }
  )
}

export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseKey!, {
    global: { fetch: fetchObservado },
  })
}
