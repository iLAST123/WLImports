# Brain — WLimports

Índice das notas vivas do projeto. Atualizar 1 linha por nota a cada ciclo.

- `status.md` — estado atual do projeto e pendências (2026-07-21: missão 5 concluída — fotos nítidas via detalhe lazy, aguardando deploy pelo dono; missões 1–4 abaixo).
- `decisoes/DEC-001-stack-e-arquitetura.md` — ADR: Next.js App Router + API Route para Bling, mock-first, vídeos locais, tokens Tailwind v4, motion respeitando reduced-motion.
- `decisoes/DEC-002-bling-oauth-refresh.md` — ADR: OAuth refresh-token rotativo (Basic header, endpoint `www`, persistência em `.bling-tokens.json`), proxy SSRF-safe de imagem, rota `force-dynamic`; limitação conhecida de TokenStore serverless.
- `decisoes/DEC-003-imagem-original-detalhe-lazy.md` — ADR: imagem original via `GET /produtos/{id}` lazy no proxy `/api/imagem`, cache 2 camadas sem Redis, fila serial 350ms com teto 8, fallback miniatura, hardening Content-Type/nosniff.
- `aprendizados.md` — gotchas técnicos: delay do Framer Motion, screenshot fullPage vs whileInView, contrato da listagem Bling v3 (imagemURL = miniatura 70x70; original só no detalhe, spec OpenAPI vence o client tipado), restrição de nome de pasta do create-next-app, gotchas do OAuth refresh do Bling (www obrigatório, Basic header, rotação de refresh token, revalidate em route handler no build, NBSP no BRL formatado), ioredis lazyConnect, env var da Vercel só vale em deployment novo.
- `preferencias.md` — preferências do projeto: idioma, paleta/tipografia fechadas, commits em português, escrita single-threaded.
