# Status — WLimports

## 2026-07-21 — Missão 6: de catálogo a E-COMMERCE (PDP + carrinho + checkout)

O site deixou de ser uma home única e virou uma loja navegável. Arquitetura e
trade-offs em `decisoes/DEC-004`.

**O que entrou:**
- **Página de produto** `/produto/[id]` (Server Component, `force-dynamic`):
  galeria com thumbs, descrição rica, bloco de compra sticky no desktop,
  breadcrumb, `generateMetadata` por produto, `not-found` próprio. O card do
  catálogo virou link (`ProductCard`).
- **Camada de dados**: `getProdutoDetalhe()` em `src/lib/bling.ts`. O cache de
  detalhe da DEC-003 foi generalizado — **uma única requisição por produto**
  agora serve imagem, descrição e galeria. Mesma fila 350ms, mesmo teto, mesmo
  TTL: o consumo do rate limit do Bling **não aumentou**. Rota nova
  `/api/produto/[id]`; o proxy `/api/imagem` ganhou `&i=<n>` (galeria) e segue
  SSRF-safe (client passa só números).
- **Carrinho** (`src/lib/carrinho.tsx`): contexto + `useReducer`, persistido em
  `localStorage`, drawer com trap de foco, contador no `SiteHeader` novo.
- **Checkout** `/checkout`: 3 passos (Identificação → Entrega → Pagamento),
  validação sem lib, resumo sticky, tela de "pedido registrado".
- **Fator UAU**: cortina de abertura + reveal de máscara na wordmark + grão de
  filme sobre o vídeo. Uma vez por sessão (`sessionStorage`), não bloqueia o
  LCP, não monta sob `prefers-reduced-motion`.

**🔴 O checkout é uma SIMULAÇÃO — decisão explícita do dono.** Não há gateway,
não há cobrança, nenhum dado do cliente é enviado ou persistido, e nenhum dado
de cartão é coletado. A UI diz isso em todas as telas ("Checkout
demonstrativo"). Integração futura marcada com `// TODO(gateway)`.

Gates: `tsc`, `lint` limpos, `test` **78** (era 47 — 31 novos), `build` OK.
QA em browser (Playwright, 390/768/1440): zero achados, zero erro de console;
validou fluxo card→PDP→sacola→drawer→F5→checkout, persistência, `Escape`,
foco por teclado, reduced-motion (poster no lugar do vídeo) e ausência de
"R$ 0,00" em todas as telas. **1 defeito de integração achado e corrigido**: a
faixa do checkout ficava POR BAIXO do `SiteHeader` fixo (`pt-16 sm:pt-20`).

Execução em 6 frentes paralelas, escrita single-threaded por arquivo.

**Deploy NÃO feito — o dono publica e valida em produção.**

### O que validar em produção depois de publicar
1. **Descrição e galeria reais do Bling** — todo o trabalho correu contra o
   MOCK. O caminho real (`descricaoComplementar` em HTML → texto puro, e
   `midia.imagens.internas[]` → galeria) **nunca foi exercitado contra a API
   de verdade**. É o maior risco desta missão.
2. Abrir 2–3 produtos e conferir se a descrição aparece e se lê bem sem a
   formatação HTML original (negrito/listas são removidos de propósito).
3. Galeria: produtos com mais de uma foto devem mostrar thumbs; conferir que
   `&i=1`, `&i=2` servem a imagem certa e não a miniatura borrada.
4. Rate limit: acompanhar se o catálogo + PDPs não geram erro 429 no Bling.
5. A cortina de abertura na primeira visita (e o fato de ela não repetir ao
   voltar do produto para a home).

## 2026-07-21 — Missão 5: fotos nítidas (imagem original via detalhe lazy)

Dono reportou cards borrados: a listagem do Bling só entrega `imagemURL` 70x70
(miniatura). Implementado `getImagemProduto` (`src/lib/bling.ts`): o proxy
`/api/imagem` agora resolve a imagem ORIGINAL pelo detalhe
(`GET /produtos/{id}` → `midia.imagens.internas[].link`, contrato confirmado
na spec OpenAPI oficial), lazy por produto, cache em 2 camadas (Data Cache
600s + Map com TTL e cache negativo 60s), fila serial 350ms com teto de 8, e
fallback para a miniatura em qualquer falha (card nunca quebra). Hardening:
Content-Type whitelist imagem + nosniff. Detalhes: `decisoes/DEC-003`.

Gates: `tsc`, `lint` limpos, `test` 47 (12 novos), `build` OK. QA aprovado
(matriz completa; ressalvas registradas na DEC-003). Commit na main + push.
**Deploy NÃO feito — o dono publica e valida em produção.**

## 2026-07-19 — Missão 4: produção conectada + persistência via REDIS_URL

Catálogo real (128 produtos) no ar em `https://wl-imports.vercel.app`. Duas
descobertas na ativação, via Vercel CLI (o dono forneceu um token de acesso):
1. **O "Redeploy" do painel e o auto-deploy do GitHub NÃO estavam criando
   deploys que enxergassem as env vars novas** — o deploy servindo era anterior
   ao `BLING_REFRESH_TOKEN`. `vercel deploy --prod` pela CLI resolveu na hora.
2. **A integração de Redis da Vercel expõe só `REDIS_URL`** (connection string
   TCP/TLS), e NÃO o par REST (`KV_REST_API_*`) que o `KvTokenStore` da missão 3
   esperava. Sem store compatível, o token só vivia em memória (quebra ao
   reciclar lambda).

Correção: `RedisTokenStore` (ioredis sobre `REDIS_URL`, import dinâmico, conexão
curta por operação, load/save nunca lançam). `defaultTokenStore()` agora escolhe
por precedência: `REDIS_URL` → RedisTokenStore; par REST → KvTokenStore; senão
FileTokenStore. Chave única `wlimports:bling:tokens` (mesma da missão 3).

Gates: `tsc`, `lint` limpos, `test` 35 (7 novos), `build` OK. Dep nova: ioredis.
Pendência: fazer um authorization_code fresco para semear um refresh token válido
na env (o anterior foi consumido no 1º refresh de produção), então redeploy pela
CLI. Depois: apagar o token de acesso da Vercel.

## 2026-07-19 — Missão 3: persistência de token em serverless (KV)

Produção viva na Vercel (`https://wl-imports.vercel.app`, auto-deploy no push
da main), conectada pelo dono. Implementado o `KvTokenStore`
(`src/lib/bling-auth.ts`) via REST do Upstash Redis com `fetch` puro (sem SDK
novo), resolvendo a limitação da DEC-002: o `FileTokenStore` não sobrevive
entre lambdas. `defaultTokenStore()` escolhe o store por env — KV
(`UPSTASH_REDIS_REST_*` ou `KV_REST_API_*`) em produção, `FileTokenStore` no
dev local, e mock quando não há credencial nenhuma (zero regressão). Retry
único pós-`invalid_grant` relê o store fresco antes do fallback, cobrindo a
corrida multi-instância. Chave única no Redis: `wlimports:bling:tokens`.

Gates verdes (rodados pelo main após o subagente parar por limite de cota):
`tsc`, `lint`, `test` (28 Vitest, +10 vs missão 2), `build`.

Pendências: dono precisa criar o Redis (Upstash) na aba Storage do projeto
Vercel e adicionar `BLING_CLIENT_ID`/`BLING_CLIENT_SECRET`; seeding do refresh
token para produção via env-seed (`BLING_REFRESH_TOKEN` = valor atual do
`.bling-tokens.json`), que o KV assume após a 1ª rotação. Nota: a cadeia de
refresh é única — quando produção assumir, o dev local cai para mock (aceito).

## 2026-07-19 — Missão 2 concluída

Integração real com o Bling v3: OAuth 2.0 com refresh token rotativo e
renovação automática do access token (`src/lib/bling-auth.ts`), busca
paginada de produtos com throttle (`src/lib/bling.ts`), e proxy SSRF-safe de
imagem (`src/app/api/imagem/route.ts`) para contornar a caducidade da URL
assinada da AWS. Detalhe da decisão em
`.claude/brain/decisoes/DEC-002-bling-oauth-refresh.md`.

Gates verdes:
- `tsc`, `lint`, `test` (18 testes Vitest em `src/lib/__tests__/`), `build`.
- QA-2 aprovado — matriz 7/7.
- Gate visual aprovado em 3 viewports, cobrindo estados "sob consulta", erro
  (fallback mock) e fallback de imagem (via interceptação de request).

## 2026-07-19 — Missão 1 concluída

Site completo: design tokens (paleta preto quente/dourado/champanhe, tipografia
Bodoni Moda + Manrope), Hero com vídeo de fundo, About com vídeo, Catálogo
mock-first (busca por nome + chips de categoria, com fallback resiliente para
o mock quando o Bling falha ou não está configurado).

Gates verdes:
- `tsc` — sem erros de tipo.
- `lint` — sem erros de eslint.
- `build` — build de produção passa.
- QA funcional — aprovado (fluxo de busca/filtro, estados de loading/erro/vazio
  do catálogo, retry).
- Gate visual — aprovado em 3 viewports (mobile/tablet/desktop) e sob
  `prefers-reduced-motion` (Lenis desligado, animações substituídas por salto
  instantâneo, poster estático no lugar do vídeo).

## Pendências (atualizadas em 2026-07-19, pós missão 2)

- Credenciais reais do Bling (`BLING_CLIENT_ID`/`BLING_CLIENT_SECRET`/
  `BLING_REFRESH_TOKEN`) — o dono ainda não colou; hoje o site roda 100% em
  mock mesmo com a integração real implementada e testada.
- `TokenStore` sobre KV/DB para deploy serverless (ex.: Vercel) —
  `FileTokenStore` só é suficiente em servidor/VM com disco persistente; a
  interface já existe (`src/lib/bling-auth.ts`), a implementação não.
- Texto/copy real da marca — o conteúdo atual (hero, about, descrições) é
  placeholder.
- Imagens reais dos produtos — enquanto rodar em mock, o catálogo usa dados
  fictícios sem imagem real; com credenciais reais do Bling, o proxy
  `/api/imagem` já está pronto para servi-las.
- Deploy/hospedagem — ainda não configurados.
