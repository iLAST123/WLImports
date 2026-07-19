# WLimports

Site institucional + catálogo de perfumes importados e decants de nicho. Next.js
(App Router) + TypeScript, com o catálogo alimentado pela API do Bling v3 (com
fallback automático para um catálogo mock quando não há credencial configurada).

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Outros scripts:

```bash
npm run build   # build de produção
npm run start   # serve o build (rodar depois de `build`)
npm run lint    # eslint
npm run test    # vitest (18 testes: src/lib/__tests__)
```

## Como conectar o Bling

1. Copie `.env.example` para `.env.local` (o `.env.local` já está no `.gitignore`
   e nunca deve ser commitado).
2. Cadastre um aplicativo em [developer.bling.com.br](https://developer.bling.com.br)
   (aba "Aplicativos") para obter `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET`.
3. Gere um refresh token **semente** — UMA única vez — pelo fluxo OAuth 2.0
   authorization code (troca do `code` de autorização por tokens) e cole em
   `BLING_REFRESH_TOKEN` no `.env.local`. Não existe `BLING_ACCESS_TOKEN`: o
   access token nunca vem de env, é obtido e renovado automaticamente pelo
   próprio app.

Sem as três variáveis (`BLING_CLIENT_ID`/`BLING_CLIENT_SECRET`/
`BLING_REFRESH_TOKEN`) preenchidas, o site funciona 100% com o catálogo mock
(`src/lib/mock-produtos.ts`), que segue a mesma estrutura (`Produto`) da
resposta normalizada do Bling — basta plugar as credenciais depois, sem mudar
código.

### Renovação automática do token

`src/lib/bling-auth.ts` (`BlingAuth`) cuida do ciclo de vida do token, sem
intervenção manual:

- O **access token** é cacheado em memória e renovado sozinho pouco antes de
  expirar (~6h de validade, com 60s de folga de segurança). Chamadas
  concorrentes durante uma renovação compartilham o mesmo request
  (single-flight) — nunca disparam dois refreshes em paralelo.
- O **refresh token ROTACIONA a cada uso**: a cada renovação, o Bling pode
  devolver um refresh token novo, que passa a ter precedência sobre a semente
  do `.env.local`. Esse valor é persistido em `.bling-tokens.json` (raiz do
  projeto, no `.gitignore` — nunca commitado). **Se esse arquivo for perdido
  depois de já ter rotacionado, a semente do `.env.local` fica inválida e é
  preciso reautorizar manualmente** (gerar um novo refresh token pelo fluxo
  authorization code).
- Credenciais vão sempre no header `Authorization: Basic` do request de
  token — nunca no body (o Bling responde `invalid_client` se forem enviadas
  no body). O endpoint usado é `https://www.bling.com.br/Api/v3/oauth/token`
  **com `www`**: a variante sem `www` responde um redirect 301 que pode
  converter o POST em GET e derrubar o corpo do request.

### Runbook de deploy

- **Servidor próprio/VM** (processo Node de longa duração, disco
  persistente): o `FileTokenStore` padrão resolve sozinho — o token
  rotacionado sobrevive a restarts do processo.
- **Serverless (ex.: Vercel)**: o filesystem não persiste entre invocações/
  instâncias. `FileTokenStore` detecta escrita falhando e segue só com cache
  em memória (com aviso no log, sem vazar o token), mas **isso não é uma
  solução para produção serverless** — é preciso implementar um `TokenStore`
  (interface já existe em `src/lib/bling-auth.ts`) sobre um KV/DB (ex.: Redis,
  Vercel KV, tabela no banco) antes de rodar assim. Isso ainda **não foi
  implementado** — é uma limitação conhecida, documentada em
  `.claude/brain/decisoes/DEC-002-bling-oauth-refresh.md`.

Com as credenciais configuradas, `src/lib/bling.ts` busca os produtos em
`GET /Api/v3/produtos`, pagina até 30 páginas de 100 itens (parando na
primeira página vazia ou incompleta), com throttle de 350ms entre páginas
(rate limit do Bling é ~3 req/s). Filtra apenas itens com `situacao: "A"`
(ativos) e nome não vazio, e trata preço `0`/ausente como "Sob consulta" em
vez de "R$ 0,00". A resposta de cada página fica em cache por 600s
(`next: { revalidate: 600 }`). Qualquer falha — erro de rede, `401`, `429`,
resposta vazia — cai automaticamente para o catálogo mock; o site nunca quebra
por causa do Bling. As credenciais do Bling só existem no servidor (dentro da
API Route `src/app/api/produtos/route.ts` → `src/lib/bling.ts` /
`src/lib/bling-auth.ts`) e nunca chegam ao browser.

A rota `src/app/api/produtos/route.ts` é `dynamic = "force-dynamic"` de
propósito: com revalidate de rota, o handler seria prerenderizado no build —
e um build sem credenciais congelaria o mock mesmo com env vars presentes em
runtime. O cache correto vive no fetch das páginas do Bling, não na rota.

### Imagens de produto

A `imagemURL` que o Bling devolve é uma URL assinada da AWS com `Expires` —
ela caduca. Por isso o servidor nunca a expõe diretamente: guarda a URL
original em memória e devolve ao client `/api/imagem?id=<id>`, um proxy
SSRF-safe (`src/app/api/imagem/route.ts`) que só aceita um `id` numérico e
resolve a URL real no servidor — nunca aceita URL arbitrária por query. Se a
imagem falhar ao carregar, `ProductCard.tsx` cai num placeholder de inicial
serif (nunca um ícone de imagem quebrada).

## Estrutura de pastas

```
src/
  app/
    layout.tsx              # fontes (Bodoni Moda/Manrope), metadata, MotionConfig, SmoothScroll
    page.tsx                # composição das seções da home
    globals.css             # design tokens (cor/tipografia) e CSS do Lenis
    api/produtos/route.ts   # API Route que expõe getProdutos() ao client
    api/imagem/route.ts     # proxy SSRF-safe da URL assinada de imagem do Bling
  components/
    SmoothScroll.tsx        # wrapper Lenis, desligado sob prefers-reduced-motion
    Reveal.tsx               # wrapper de entrada (whileInView) reutilizável
    ProductCard.tsx          # card de produto do catálogo
    sections/
      Hero.tsx               # seção de abertura com vídeo de fundo
      About.tsx              # seção institucional com vídeo
      Catalog.tsx             # busca + chips de categoria + grid de produtos
      Footer.tsx               # rodapé
  lib/
    types.ts                 # tipos de domínio (Produto, ProdutosResponse)
    bling.ts                 # integração server-only com a API do Bling v3
    bling-auth.ts             # renovação automática do token OAuth (refresh rotativo)
    mock-produtos.ts         # catálogo fictício usado como fallback/dev
    __tests__/                # testes Vitest de bling.ts e bling-auth.ts (18 casos)
public/
  videos/
    hero.mp4, hero-poster.jpg    # vídeo/poster de fundo do Hero
    about.mp4, about-poster.jpg  # vídeo/poster de fundo do About
```

## Créditos dos vídeos

Os vídeos em `public/videos/` são clipes royalty-free do
[Pexels](https://www.pexels.com) (licença Pexels, sem atribuição obrigatória),
re-encodados localmente em H.264 sem faixa de áudio e servidos diretamente do
projeto (sem hotlink):

- `hero.mp4` — Pexels, vídeo ID [7815759](https://www.pexels.com/video/7815759/)
- `about.mp4` — Pexels, vídeo ID [7034150](https://www.pexels.com/video/7034150/)
