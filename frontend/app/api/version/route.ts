// Sonda pública de versão: diz exatamente qual commit está no ar.
// GET /api/version → { commit, ref, env }
export function GET() {
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    env: process.env.VERCEL_ENV ?? "dev",
  })
}
