# DEC-003 — Imagem em tamanho original via detalhe lazy do Bling (2026-07-21)

## Contexto

O dono reportou fotos borradas/pixeladas nos cards do catálogo em produção.
Diagnóstico: a LISTAGEM do Bling (`GET /Api/v3/produtos`) devolve `imagemURL`
apontando para um JPEG de **70x70px** (miniatura) — ampliada a ~400px no card,
borra. Não é bug nosso; é o que a API de listagem entrega.

Contrato do DETALHE validado na **spec OpenAPI oficial** (a que renderiza
`developer.bling.com.br/referencia`, em
`developer.bling.com.br/build/assets/openapi-D-189jcU.json`):
`GET /produtos/{idProduto}` → `data.midia.imagens.internas[]` com **`link`
(imagem original) e `linkMiniatura` separados e obrigatórios** (schema
`ProdutosImagemInternaDTO`), mais `validade` (URL assinada caduca) e `ordem`.
`externas[]` tem só `link` (URL arbitrária cadastrada no ERP).

## Decisão

Buscar o detalhe **sob demanda no proxy `/api/imagem`** (que já era lazy e por
produto), nunca no carregamento do catálogo. Em `src/lib/bling.ts`:

1. **`getImagemProduto(id, deps)`** → `{ grande, miniatura }`; a rota tenta
   grande → miniatura e invalida (`invalidarImagemGrande`) quando o upstream
   falha (ex.: assinatura expirada).
2. **Cache em 2 camadas, SEM Redis**: Next Data Cache no fetch do detalhe
   (`next: { revalidate: 600 }` — compartilhado entre lambdas na Vercel, mesmo
   padrão provado da listagem) + Map em módulo com TTL 600s e **cache negativo
   de 60s** (produto sem imagem interna/falha). Redis foi descartado: round-trip
   por imagem + acoplamento com `bling-auth.ts` não se justificam para 128 SKUs
   quando o Data Cache já resolve o compartilhamento. Pior caso absoluto:
   ~128 detalhes/10min ≈ 18k/dia ≪ 120k/dia.
3. **Rate limit (3 req/s)**: fetches de detalhe não cacheados passam por fila
   serial com espaçamento de 350ms (`THROTTLE_MS`), com **teto de 8 pendentes**
   (`MAX_FILA_DETALHE`) — fila cheia degrada para a miniatura na hora, sem
   cache negativo, e re-tenta num hit futuro (evita segurar a lambda ~45s num
   cold start com scroll rápido).
4. **Escolha da URL grande**: interna de menor `ordem`; sem internas → primeira
   externa. O `imagemURL` do próprio detalhe NÃO é candidato (sem garantia de
   não ser a mesma miniatura 70x70).
5. **Hardening do proxy**: Content-Type não-imagem nunca é repassado cru
   (externas = URL de terceiro sob nosso domínio) + `X-Content-Type-Options:
   nosniff`. Cache-Control: 300s (grande) / 60s (fallback borrado — o browser
   re-tenta logo e troca pela nítida). SSRF-safe intacto: client passa só o id;
   detalhe só é buscado para id presente no catálogo; modo mock nunca chama a
   API real.

`getImagemOriginal` foi removido (único consumidor era a rota).

## Consequências / limitações conhecidas

- 1ª exibição de cada imagem numa janela fria pode sair borrada (miniatura) e
  fica nítida no request seguinte (max-age 60 do fallback) — trade-off aceito
  em favor do rate limit.
- Sem dedupe de detalhe em voo para o mesmo id (o browser já dedupa a mesma
  URL de imagem; teto da fila limita o desperdício).
- `/api/imagem/route.ts` segue sem teste unitário direto: exigiria
  `vitest.config.ts` com alias `@/` (não existe config hoje). Pendência barata
  se a rota crescer.
- O sleep de 350ms entre páginas da LISTAGEM roda mesmo com Data Cache quente
  (pré-existente a esta decisão) — custo fixo de ~350ms por resolução; otimizar
  só se latência incomodar.
