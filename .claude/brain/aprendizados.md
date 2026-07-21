# Aprendizados — WLimports

## `next dev`/`next build` local DISPARA OAuth real do Bling (2026-07-21)

O `.env.local` tem `BLING_CLIENT_ID`/`SECRET` reais. `hasCredentials()` só exige
id + secret + uma semente de refresh token — então **qualquer** `next dev` ou
`next build` local que renderize a home vai tentar renovar o access token contra
`https://www.bling.com.br/Api/v3/oauth/token`. Como o refresh token do Bling
**rotaciona a cada uso** e a cadeia válida vive só no Redis de produção, isso é
um caminho direto para derrubar a produção.

Receita segura para rodar o app localmente (QA visual, Playwright):

```bash
BLING_CLIENT_ID="" BLING_CLIENT_SECRET="" BLING_REFRESH_TOKEN="" REDIS_URL="" npm run dev
```

Funciona porque o `@next/env` **não sobrescreve** variável já definida em
`process.env` (mesmo vazia), e `hasCredentials()` faz `?.trim()` → string vazia
é falsy → cai direto no mock, com zero request de rede ao Bling. Confirme com
`curl -s localhost:3000/api/produtos | head -c 40` → tem que vir `"fonte":"mock"`.

## ESLint do Next 16: `setState` dentro de `useEffect` é ERRO, não warning (2026-07-21)

A regra `react-hooks/set-state-in-effect` (React Compiler) está como **erro** neste
projeto. O padrão clássico de "já hidratei?" —
`const [pronto, setPronto] = useState(false); useEffect(() => setPronto(true), [])`
— **quebra o `npm run lint`**. Dois agentes caíram nisso na mesma missão.

Substituto idiomático (já usado em `SmoothScroll.tsx`):
`useSyncExternalStore(assinar, () => true, () => false)` — snapshot do servidor
`false`, do cliente `true`. Resolve hidratação sem `setState` em effect e sem
hydration mismatch. Para um flag mutável que não deve re-renderizar, `useRef`.

## Scroll lock com Lenis: `body.overflow = "hidden"` NÃO basta (2026-07-21)

Com o Lenis em modo `root`, ele escuta a roda no `window` e continua rolando a
página mesmo com `overflow: hidden` no body — o drawer do carrinho "vazava"
scroll para trás. Fix: `lenis.stop()` ao abrir + `lenis.start()` no cleanup, e
`data-lenis-prevent` na área rolável do painel (senão o painel também não rola).

## `backdrop-blur` cria containing block e prende filho `fixed` (2026-07-21)

O `SiteHeader` usa `backdrop-blur`. Qualquer elemento `position: fixed`
renderizado **dentro** do `<header>` passa a se posicionar em relação à faixa do
header, não à viewport — o drawer do carrinho ficava preso na tira do topo. Por
isso `SiteHeader` retorna `<><header/><CartDrawer/></>`, com o drawer FORA do
`<header>`. Vale para qualquer `filter`/`backdrop-filter`/`transform` ancestral.

## Imagens do Bling: listagem = miniatura 70x70; original só no DETALHE (2026-07-21)

O `imagemURL` da LISTAGEM (`GET /produtos`) é um JPEG 70x70 — sempre borra
ampliado. A imagem original vem do DETALHE: `GET /produtos/{id}` →
`data.midia.imagens.internas[].link` (campo separado de `linkMiniatura`, ambos
obrigatórios no schema `ProdutosImagemInternaDTO`). Fonte de verdade acessível
por script: a spec OpenAPI que renderiza a referência oficial vive em
`https://developer.bling.com.br/build/assets/openapi-*.json` (o nome do asset
muda por build — descobrir via o JS `SwaggerConfig-*` da página). Atenção: o
client tipado `AlexandreBellas/bling-erp-api-js` está DEFASADO neste ponto
(internas sem `link`) — em divergência, a spec oficial vence. O `imagemURL` do
próprio detalhe não tem garantia de tamanho (pode ser a miniatura).

## 2026-07-19 (missão 2 — OAuth Bling)

1. **Endpoint OAuth do Bling exige `www`.** `https://bling.com.br/...`
   responde 301; sem tratar o redirect, o POST pode virar GET e o corpo do
   token request se perde. Usar sempre `https://www.bling.com.br/Api/v3/oauth/token`
   (`src/lib/bling-auth.ts`).

2. **Credenciais no body do token request → `invalid_client`.** `client_id`/
   `client_secret` têm que ir no header `Authorization: Basic`, nunca no
   corpo do POST.

3. **O refresh token do Bling rotaciona a cada uso.** Reusar a mesma semente
   duas vezes falha; é preciso persistir o novo refresh token imediatamente
   após cada renovação (`FileTokenStore` → `.bling-tokens.json`), senão o
   fluxo morre e só volta com reautorização manual.

4. **`next: { revalidate }` num route handler prerenderiza no BUILD.** Se a
   rota depende de env vars de runtime (credenciais do Bling), usar
   `export const dynamic = "force-dynamic"` na rota e colocar o `revalidate`
   no `fetch` interno (`src/lib/bling.ts`) — não na rota — senão um build sem
   credenciais congela o resultado (mock) por até o tempo do revalidate,
   mesmo com env correta em produção.

5. **`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` usa
   NBSP (U+00A0), não espaço normal, entre "R$" e o valor.** Testes que
   comparam a string formatada precisam usar o caractere certo, senão a
   asserção falha por um espaço "invisível" diferente.

## 2026-07-19 (missão 1)

1. **Delay do Framer Motion precisa viver dentro da `transition` da variant.**
   Quando uma `variant` já define sua própria `transition` (ex.: em
   `cardVariants`/`gridVariants`), uma prop `transition` passada diretamente no
   `motion.*` é ignorada — o delay/duração precisam ser declarados dentro do
   objeto `transition` da própria variant (`src/components/sections/Catalog.tsx`).

2. **Screenshot `fullPage` do Playwright não dispara `whileInView`.** Conteúdo
   abaixo do fold aparece com `opacity: 0` no PNG de página inteira porque o
   viewport de captura nunca "passa" pelo elemento — não é um bug de produção,
   é uma limitação do método de captura. Para validar reveals, é preciso
   scrollar de verdade (ou capturar por viewport) em vez de confiar só no
   fullPage screenshot.

3. **Contrato da listagem do Bling API v3**: o endpoint `GET /Api/v3/produtos`
   não traz categoria por item (campo inexistente na resposta) — por isso
   `normalizar()` em `src/lib/bling.ts` sempre deixa `categoria: undefined`
   para produtos vindos do Bling. Também: `preco: 0` significa "sem preço
   cadastrado", não "grátis" — tratado como "Sob consulta" na UI, nunca como
   "R$ 0,00".

4. **`create-next-app` recusa diretório com maiúsculas** (por causa das regras
   de naming do `package.json`/npm). O scaffold precisou ser feito numa pasta
   em minúsculas e depois movido/renomeado para `WLImports`.

## Framer Motion: `viewport.amount` > 0 em containers mais altos que o viewport nunca dispara (2026-07-19)

O grid do catálogo usava `whileInView` com `viewport={{ amount: 0.1 }}` no container inteiro. Com o mock (12 itens) o grid era baixo e 10% dele cabia na tela — funcionava. Com o catálogo real (128 itens, ~24.000px de altura), 10% nunca cabe no viewport → o IntersectionObserver nunca dispara → todos os cards ficam presos em `opacity: 0` ("catálogo todo preto", reportado pelo dono). Fix: `amount: 0` no container de listas de altura variável; reservar `amount` fracionário para elementos menores que a tela. Regra: qualquer `whileInView` num elemento cuja altura depende de dados precisa funcionar no pior caso de altura.

## ioredis em serverless: `enableOfflineQueue: false` quebra o 1º comando (2026-07-21)

O `RedisTokenStore` criava o cliente e chamava `get()`/`set()` imediatamente. Com
`enableOfflineQueue: false`, comandos emitidos antes do handshake TCP/TLS terminar
falham na hora em vez de aguardar a conexão. Sintoma em produção: `load()` sempre
logava "não foi possível ler tokens do Redis" e — pior — o `save()` após uma
renovação bem-sucedida também falhava, então o refresh token ROTACIONADO se perdia.
Resultado: o 1º request funcionava (consumindo a semente da env) e todos os
seguintes caíam para mock, com a semente já inválida. Fix: `lazyConnect: true` +
`await client.connect()` explícito antes de qualquer comando.

Pista diagnóstica que resolveu o caso: a mensagem "não foi possível persistir
tokens no Redis" só é logada DEPOIS de um refresh bem-sucedido (`save()` só roda
no caminho feliz) — vê-la nos logs provou que o token tinha sido renovado e perdido,
e não que as credenciais estavam erradas.

## Vercel: env var nova só vale em deployment criado DEPOIS dela (2026-07-21)

O "Redeploy" pelo painel e o auto-deploy do GitHub não estavam produzindo um
deployment que enxergasse a `BLING_REFRESH_TOKEN` recém-criada — produção seguia
servindo um build anterior à variável e caía no mock. `vercel deploy --prod` pela
CLI resolveu na hora. Ao alterar env var em produção, SEMPRE criar deployment novo
pela CLI e validar com um request real, nunca confiar no botão.
