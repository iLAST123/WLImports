# Status — WLimports

## 2026-07-21 — Missão 8: plano aprovado (DEC-006) + F1 "fundação indexável" CONCLUÍDA e NO AR

O dono aprovou o plano de transformação em e-commerce (7 fases, auditoria
brief × estado real e decisões de arquitetura em `decisoes/DEC-006`).
Decisões ratificadas por ele: decants = **variações no Bling** (fonte
comercial) com enriquecimento JSON só editorial; **checkout simulado
aposentado** → "Revisão do pedido → WhatsApp"; F2 ganha rastreamento
obrigatório (Meta Pixel/CAPI + GA4, UTMs persistidas anexadas à mensagem,
código de pedido `#WL-XXXX`).

**F1 executada e publicada no mesmo dia** (6 commits `6bb6f92..a68f440`,
auto-deploy GitHub):
- Fundação de slug (`src/lib/slug.ts`) e URL única (`src/lib/urls.ts`,
  `SITE_URL` com fallback do domínio Vercel; setar `NEXT_PUBLIC_SITE_URL`
  quando houver domínio próprio).
- Tolerância a variações pai/filho na listagem do Bling (pai "V" só some
  quando há filho visível; `idProdutoPai` exposto p/ F4) — blinda o catálogo
  enquanto o dono cadastra as variações.
- `/catalogo` **server-rendered** via `connection()` (Next 16): o HTML do
  servidor traz os 128 produtos; "Carregando catálogo…" morreu.
- Rota canônica `/produto/[slug]-[id]`; legado `/produto/[id]` e slug
  desatualizado → **308** permanente (equivalente a 301 p/ SEO — ver
  aprendizados); canonical + JSON-LD Product (offers só com preço válido,
  nunca em "Sob consulta").
- `sitemap.xml` (130 URLs: home + catálogo + 128 produtos) e `robots.txt`
  (disallow `/api/` e `/checkout`).

**DoD carimbado em produção (curl, 2026-07-21 ~17h BRT):** `/catalogo` com 0
"Carregando" e 128 links de produto no HTML cru · `/produto/16678961877` →
308 → `/produto/kit-body-butterlly-16678961877` (200, JSON-LD com
`price: 260` BRL) · sitemap 130 locs · robots OK · `/api/produtos` intacto
(`fonte:"bling"`). Gates locais: tsc/lint limpos, **124 testes** verdes (eram
97), build OK. QA funcional em browser (Playwright, 390/1440): PASS em
busca/ordenação/chips, PDP, redirects, sacola+persistência, home, console
zero erros. Orçamento de rate limit do Bling **inalterado por construção**
(SSR/sitemap reusam o Data Cache 600s de `getProdutos()`).

### O que o dono valida manualmente em produção (F1)
1. Navegar catálogo → produto → sacola no celular com as URLs novas.
2. Colar uma URL de produto (`/produto/<slug>-<id>`) num anúncio de teste.
3. Google Search Console: submeter `sitemap.xml` e pedir indexação (ação do
   dono; acelera o efeito SEO da F1).

### Pendências para a F2 (bloqueios de insumo do dono)
1. **Número real do WhatsApp Business** — veio placeholder; F2 implementa via
   env (`NEXT_PUBLIC_WHATSAPP_NUMBER`), ativação bloqueada até o número real.
2. Cadastro das variações (5ml/10ml/frasco) dos ~20 SKUs prioritários no
   Bling — em paralelo, pelo dono.
3. Valor mínimo do frete grátis (F2), preço de entrada dos decants para o
   hero (F7), depoimentos (F6-A).
4. IDs de rastreamento p/ F2: Meta Pixel ID (+ token CAPI, se já houver) e
   GA4 Measurement ID.

**F2 NÃO iniciada — aguarda ordem do dono.**

## 2026-07-21 — Missão 7: redesign "superfície clara" estilo Aesop + PLP dedicada

Base: pesquisa de campo com computed styles reais da aesop.com
(`.claude/brain/referencias-aesop.md`). Arquitetura e trade-offs em
`decisoes/DEC-005`.

**O que entrou:**
- **Duas superfícies, mesmos tokens semânticos** (`src/app/globals.css`): os
  valores mudam via `[data-superficie="clara"]` — creme `#FFFEF2` medido,
  foreground `#33302B`, dourado vira **bronze `#7F6128`** por contraste AA,
  token novo `--danger`. Contraste WCAG calculado par a par e documentado no
  próprio CSS, com um contrato de 5 regras para quem escreve componente (só
  token semântico, nunca hex cru, nunca condicional de cor no componente,
  `data-superficie` sempre no ancestral, `border-muted` quando a borda é a
  única pista).
- **`src/components/loja/SuperficieLoja.tsx`**: casca clara única de
  PLP/PDP/checkout. **Site híbrido por decisão editorial**: a home segue
  escura (é a marca), a loja é clara (é a venda).
- **PLP nova `/catalogo`** (`src/app/catalogo/page.tsx` +
  `src/components/catalogo/`: CapaCatalogo, CatalogoCliente, GradeProdutos,
  estados, ordenação, `useProdutos`): capa editorial escura, barra tingida
  (busca, categorias derivadas do dado, ordenação, contagem `aria-live`),
  grade 4/3/2. **Fetch único client-side** via `/api/produtos` — o mesmo da
  home, **zero chamada nova ao Bling**. Ordenação por preço manda "Sob
  consulta" sempre para o fim.
- Home: `sections/Catalog.tsx` virou **prévia de 8 itens** + link "Ver
  catálogo completo" → `/catalogo`, reusando os mesmos componentes de
  `catalogo/` (hook e estados não duplicados).
- `SiteHeader.tsx` bicromático: transparente→opaco ao rolar na home; opaco
  claro via `data-superficie="clara"` nas demais rotas (sem condicional de
  cor). Navegação persistente Início/Catálogo/Sobre com `aria-current`.
- PDP: `Acordeao.tsx` acessível (`inert` no conteúdo fechado, animação
  `grid-template-rows`, `motion-reduce`), renderiza **só seções com dado
  real** (sem aba vazia); `preco.ts` centraliza a regra "Sob
  consulta"/nunca "R$ 0,00" para servidor e client.
- `src/lib/produto-formato.ts` + teste: `separarVolume()` conservador
  (extrai "100ml" do fim do nome; falso negativo aceitável, nome mutilado
  não; kits/conectores não casam).
- Campos editoriais `volume`/`notas`/`destaque` em `types.ts`/`bling.ts`/
  `mock-produtos.ts`: **só o mock preenche** `notas`/`destaque`; produto real
  do Bling chega sempre `undefined` (seguro por construção) — regra da
  **degradação honesta**: bloco sem dado não renderiza (sem placeholder, sem
  título órfão).

Gates: `tsc` limpo, `lint` limpo, `test` **97/97** (eram 78, +19 de
`produto-formato`), `build` OK (rotas `/`, `/catalogo`, `/checkout`,
`/produto/[id]`). Auto-revisão do orquestrador: zero bloqueio; varredura de
contrato de cor: zero violação.

**Deploy (2026-07-21 15:43 BRT):** `vercel deploy --prod` foi bloqueado pela
permissão da sessão, mas o **auto-deploy do GitHub** (está conectado, ao
contrário do que a experiência da missão 4 sugeria) construiu o commit
`828a8b6` e publicou: deployment `dpl_6pCPduRX6nBSacA7KkcJwxs5JYsX`, status
Ready, alias `https://wl-imports.vercel.app`. A ressalva da missão 4 (deploy
via CLI) segue válida **quando há env var nova**; esta missão não mudou
nenhuma.

**Smoke pós-deploy em produção** (via curl): `/`, `/catalogo`, `/checkout` →
200 · `/api/produtos` → `fonte:"bling"` (dados reais, 1º item "KIT BODY
BUTTERLLY" R$ 260,00) · `/produto/16678961877` → 200 · detalhe real com
galeria `["/api/imagem?id=16678961877&i=0"]` · `/api/imagem` → 200
image/jpeg 185KB (imagem original, não miniatura). **Achado relevante**:
nenhum dos 60 primeiros produtos reais tem `descricao` no detalhe — o dono
não preenche `descricaoComplementar` no ERP; a PDP degrada honesta (sem
acordeão). O caminho HTML→texto puro segue não exercitado com dado real por
ausência de dado, não por falha.

### O que o dono ainda valida em produção
1. Visual das três superfícies (escura/clara/bicromática) em telas reais
   (não só no gate automatizado).
2. A cortina de 1ª visita continua se comportando bem sobre o novo header
   bicromático.
3. UX do `/catalogo` navegando os 128 produtos reais (busca, ordenação,
   categorias derivadas, grade em mobile/tablet).
4. Descrição real na PDP só aparecerá quando o dono preencher
   `descricaoComplementar` no ERP do Bling — hoje a página degrada
   corretamente (sem acordeão), mas o caminho nunca foi visto com dado.

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
