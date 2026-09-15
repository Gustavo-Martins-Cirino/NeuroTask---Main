import { ErroAutenticacao } from "@/components/erro-autenticacao"

// O texto mora no componente de cliente, e não aqui: esta página é server
// component (lê o `reason` da URL no servidor), e o idioma de quem abre só existe
// no navegador — a região vem do localStorage.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return <ErroAutenticacao motivo={reason} />
}
