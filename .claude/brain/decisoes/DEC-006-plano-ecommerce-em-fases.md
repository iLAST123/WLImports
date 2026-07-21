# DEC-006 — Plano e-commerce em fases (F1–F7) aprovado pelo dono (2026-07-21)

Status: aceito · Missão 8 (planejamento) — F1 em execução

## Contexto

O dono enviou o brief "transformar o site de catálogo institucional em
e-commerce de alta perfumaria". A auditoria contra o estado real mostrou que o
brief estava parcialmente desatualizado: as missões 6–7 (DEC-004/DEC-005) já
haviam construído PDP, carrinho, checkout visual, PLP `/catalogo` e a
superfície clara. O plano aprovado parte do que existe — evoluir, não
reconstruir. Achado de produção que molda tudo: **nenhum produto real tem
`descricaoComplementar` no ERP** — todo conteúdo editorial de perfumaria virá
de uma camada de enriquecimento local, nunca do Bling.

## Decisão — plano em fases (aprovado verbatim pelo dono: "Aprovado, começa a F1")

| Fase | Escopo | Complexidade |
|---|---|---|
| F1 | Fundação indexável: catálogo server-rendered, `/produto/[slug]-[id]` + redirect permanente, JSON-LD Product, sitemap + robots, canonical | M |
| F2 | Venda via WhatsApp: mensagem estruturada wa.me, `/checkout` vira "Revisão do pedido", frete grátis configurável, item voando; **+ rastreamento (ver abaixo)** | M |
| F3 | Enriquecimento editorial: `data/fragrances.json` + merge server + admin dev-only | M |
| F4 | PDP rica: pirâmide olfativa, fixação/projeção, ocasião, seletor de tamanho (variações), fragrâncias irmãs, zoom | G |
| F5 | Descoberta: filtros por família/gênero/marca/preço/tipo/ocasião na URL, server-rendered, autocomplete | G |
| F6 | Camada criativa: onda A wishlist/vistos recentemente/prova social; onda B quiz com % de match, comparador, descoberta do dia | G |
| F7 | Motion final + performance: transições, scroll-driven home, shimmer, Lighthouse mobile Perf > 85 / SEO > 95 | M |

## Decisões de arquitetura ratificadas

1. **Fronteira de dados (ratificada pelo dono):** Bling = fonte de verdade
   **comercial** (preço, estoque, variações/tamanhos); enriquecimento JSON =
   **só editorial** (notas, família, fixação, projeção, ocasião, descrição
   sensorial). Nunca preço no JSON; nunca nota olfativa inventada (regra da
   degradação honesta, DEC-005).
2. **Decants/tamanhos = VARIAÇÕES no Bling** (produto pai + filhos 5ml/10ml/
   frasco). O dono cadastra ~20 SKUs prioritários em paralelo à F1. A F1 deve,
   no mínimo, **não quebrar** quando variações aparecerem na API; o
   agrupamento pai/filho com seletor de tamanho é a F4.
3. **Checkout simulado aposentado** (confirmado pelo dono): `/checkout` vira
   "Revisão do pedido → WhatsApp". Seam único `finalizarPedido()` — hoje gera
   wa.me, na fase gateway só essa função muda; o carrinho não se refatora.
4. **URL canônica de produto:** `/produto/[slug]-[id]` (`slugify(nome)-id`).
   Id no sufixo = resolução O(1), sem registry, imune a rename (slug divergente
   → redirect permanente ao canônico). Rota antiga por id → redirect permanente.
5. **Motion:** manter `framer-motion@12` + `lenis` (já instalados; gotchas no
   brain). Nenhuma lib nova. View Transitions só se a doc do Next 16 suportar.
6. **SSR/ISR no Next 16:** modelo novo (`use cache`/`cacheLife`; exports
   `revalidate`/`force-dynamic` deprecados). Degrau 1: SSR dinâmico consumindo
   `getProdutos()` (Data Cache 600s) — mata o "Carregando catálogo…" com zero
   chamada nova ao Bling. Degrau 2 (posterior): avaliar `use cache` para TTFB.
   Invariante de todas as fases: **o orçamento de rate limit do Bling não
   aumenta**. Páginas com dado do Bling nunca podem congelar mock de build
   (gotcha do build local com env vazias).
7. **Enriquecimento em JSON versionado** (`data/fragrances.json`), não SQLite:
   FS da Vercel é read-only em runtime; JSON no git é auditável e zero infra.
   Admin de preenchimento roda só em dev local, fora do bundle de produção.

## Adição obrigatória à F2 (ordem do dono — ele é gestor de tráfego)

- Evento de conversão no clique "Finalizar pedido no WhatsApp": estrutura
  pronta para Meta Pixel + CAPI; GA4 no mínimo.
- Captura de UTMs na entrada, persistência em `sessionStorage`, anexadas à
  mensagem do WhatsApp.
- Código curto de pedido (`#WL-XXXX`) na mensagem, para atribuição e
  organização do atendimento.
- Número do WhatsApp via env/config (`NEXT_PUBLIC_WHATSAPP_NUMBER` ou
  similar). **O número real NÃO foi fornecido** (veio placeholder) — bloqueio
  de ativação da F2, não de implementação. Proibido inventar número.

## Consequências

- O gargalo do projeto passa a ser conteúdo: enriquecer os SKUs (começando
  pelos ~20 prioritários) e cadastrar variações no Bling — trabalho do dono,
  destravado pelo admin da F3.
- F1/F2 entregam valor sem depender de enriquecimento; F4/F5/F6-B dependem
  da F3.
- Commits pequenos por funcionalidade na main + push (auto-deploy GitHub é o
  canal de publicação padrão), gates completos antes de cada commit.
