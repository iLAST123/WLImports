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
```

## Como conectar o Bling

1. Copie `.env.example` para `.env.local` (o `.env.local` já está no `.gitignore`
   e nunca deve ser commitado).
2. Cadastre um aplicativo em [developer.bling.com.br](https://developer.bling.com.br)
   para obter `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET`.
3. Gere um access token pelo fluxo OAuth 2.0 (authorization code) e cole em
   `BLING_ACCESS_TOKEN` no `.env.local`.

Sem `BLING_ACCESS_TOKEN` preenchido, o site funciona 100% com o catálogo mock
(`src/lib/mock-produtos.ts`), que segue a mesma estrutura (`Produto`) da
resposta normalizada do Bling — basta plugar o token depois, sem mudar código.

Com o token configurado, `src/lib/bling.ts` busca os produtos em
`GET /Api/v3/produtos`, pagina até 5 páginas de 100 itens, filtra apenas itens
com `situacao: "A"` (ativos) e nome não vazio, e trata preço `0`/ausente como
"Sob consulta" em vez de "R$ 0,00". A resposta fica em cache por 300s
(`next: { revalidate: 300 }`). Qualquer falha — erro de rede, `401`, `429`,
resposta vazia — cai automaticamente para o catálogo mock; o site nunca quebra
por causa do Bling. As credenciais do Bling só existem no servidor (dentro da
API Route `src/app/api/produtos/route.ts` → `src/lib/bling.ts`) e nunca chegam
ao browser.

## Estrutura de pastas

```
src/
  app/
    layout.tsx              # fontes (Bodoni Moda/Manrope), metadata, MotionConfig, SmoothScroll
    page.tsx                # composição das seções da home
    globals.css             # design tokens (cor/tipografia) e CSS do Lenis
    api/produtos/route.ts   # API Route que expõe getProdutos() ao client
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
    mock-produtos.ts         # catálogo fictício usado como fallback/dev
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
