# Brain — WLimports

Índice das notas vivas do projeto. Atualizar 1 linha por nota a cada ciclo.

- `status.md` — estado atual do projeto e pendências (2026-07-19: missão 2 concluída, integração real Bling v3 com OAuth refresh rotativo e gates verdes; missão 1 completa abaixo).
- `decisoes/DEC-001-stack-e-arquitetura.md` — ADR: Next.js App Router + API Route para Bling, mock-first, vídeos locais, tokens Tailwind v4, motion respeitando reduced-motion.
- `decisoes/DEC-002-bling-oauth-refresh.md` — ADR: OAuth refresh-token rotativo (Basic header, endpoint `www`, persistência em `.bling-tokens.json`), proxy SSRF-safe de imagem, rota `force-dynamic`; limitação conhecida de TokenStore serverless.
- `aprendizados.md` — gotchas técnicos: delay do Framer Motion, screenshot fullPage vs whileInView, contrato da listagem Bling v3, restrição de nome de pasta do create-next-app, gotchas do OAuth refresh do Bling (www obrigatório, Basic header, rotação de refresh token, revalidate em route handler no build, NBSP no BRL formatado).
- `preferencias.md` — preferências do projeto: idioma, paleta/tipografia fechadas, commits em português, escrita single-threaded.
