# Aprendizados — WLimports

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
