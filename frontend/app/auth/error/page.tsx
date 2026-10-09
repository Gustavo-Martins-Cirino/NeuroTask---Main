import { ErroAutenticacao } from "@/components/erro-autenticacao"
import { motivoDaUrl } from "@/lib/motivo-login"

// O texto mora no componente de cliente, e não aqui: esta página é server
// component (lê o `reason` da URL no servidor), e o idioma de quem abre só existe
// no navegador — a região vem do localStorage. Da URL só passa um motivo da
// lista fechada: texto solto num link não aparece aqui (lib/motivo-login.ts).
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return <ErroAutenticacao motivo={motivoDaUrl(reason)} />
}
