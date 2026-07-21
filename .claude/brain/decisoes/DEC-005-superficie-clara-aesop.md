# DEC-005 — Redesign "superfície clara" estilo Aesop + PLP dedicada (2026-07-21)

Status: aceito · Missão 7

## Contexto

O site era 100% escuro (paleta preto quente/dourado da DEC-001), incluindo o
catálogo embutido na home. Isso afastava a leitura de "loja navegável": um
e-commerce (missão 6) inteiro em fundo escuro compete com a legibilidade de
grade de produtos, filtros e formulário de checkout. O dono pediu um estudo
de referência antes de redesenhar.

A pesquisa de campo contra `aesop.com` (computed styles reais via Chromium
headless, registrada em `.claude/brain/referencias-aesop.md`) revelou que a
própria Aesop é **híbrida**: hero escuro e cinematográfico na entrada de cada
página, corpo em creme quente (`#FFFEF2`, não branco) abaixo — a marca vive
no escuro, a venda vive no claro. A pesquisa também expôs uma restrição dura:
o card e a ficha da Aesop pressupõem 5–8 campos por produto (notas,
ingredientes, lede sensorial); o catálogo real do dono no Bling entrega só
nome, preço e 1 imagem — 0 de 8 produtos amostrados tinham descrição.

## Decisão

1. **Duas superfícies, um único sistema de tokens.** Os mesmos nomes
   semânticos (`--background`, `--surface`, `--foreground`, `--muted`,
   `--gold`, `--champagne`, `--border`, `--danger`) mudam de
   valor via `[data-superficie="clara"]` no ancestral — nunca um componente
   decide sua própria cor por prop ou condicional. Em modo claro o dourado é
   substituído por **bronze `#7F6128`** porque o dourado original não passa
   AA sobre o creme; contraste calculado par a par e documentado no próprio
   `globals.css`.
2. **Híbrido editorial, não migração total.** A home permanece escura (é a
   marca); PLP (`/catalogo` nova), PDP e checkout usam a casca clara
   (`SuperficieLoja.tsx`) — é a loja. Decisão consciente contra um tema claro
   global.
3. **PLP dedicada, zero chamada nova ao Bling.** `/catalogo` busca do mesmo
   `/api/produtos` que a home já usa; a home passou a mostrar só uma prévia
   de 8 itens com link para o catálogo completo, reusando os mesmos
   componentes (hook `useProdutos`, estados de loading/erro/vazio) em vez de
   duplicar.
4. **Degradação honesta em vez de inventar dado.** Campos editoriais novos
   (`volume`, `notas`, `destaque`) só existem no mock, que fica rico para
   demonstrar o layout cheio; o produto real do Bling chega sempre com esses
   campos `undefined` e o bloco correspondente **não renderiza** — sem
   placeholder, sem título órfão, sem inventar nota olfativa para produto
   real (proibido).
5. **`separarVolume()` conservador.** Extrai algo como "100ml" do fim do
   nome do produto só quando o padrão é inequívoco; prefere falso negativo
   (não extrai) a falso positivo (mutila o nome ou casa com "kit"/conector).

## Consequências

- Ganho: a loja fica legível e navegável como comércio; a marca preserva o
  peso editorial escuro na home.
- Trade-off: o acento dourado da marca não é o mesmo hex nas duas
  superfícies (bronze no claro) — decisão deliberada por acessibilidade, não
  um bug de inconsistência visual.
- Trade-off: a home perde densidade de produtos visíveis de primeira (prévia
  de 8 em vez do catálogo inteiro) em troca de uma PLP com busca/ordenação
  reais.
- Nenhuma chamada nova ao Bling foi introduzida — o orçamento de rate limit
  (DEC-002/DEC-003) permanece intocado.
- Risco conhecido e aceito: como o ERP real quase nunca tem
  `descricaoComplementar` preenchida, a PDP raramente mostrará o acordeão de
  descrição em produção até o dono popular o cadastro — comportamento
  correto (degradação), não falha.

## Alternativas rejeitadas

- **Tema claro global** (substituir a home também): rejeitado — perderia a
  assinatura visual escura que é a marca, e a pesquisa de campo mostrou que a
  própria Aesop não faz isso.
- **Condicional de cor por prop no componente** (`corDeFundo === "clara" ? …`
  espalhado pelos componentes): rejeitado — token semântico remapeado por
  atributo no ancestral é a única forma que garante zero hex cru e
  consistência automática se a paleta mudar de novo.
- **Inventar notas olfativas/ingredientes para produto real** para imitar a
  densidade do card da Aesop: rejeitado de forma explícita — violaria a
  regra "nunca inventar comportamento/dado" que rege todo o projeto; o card
  real degrada em vez de mentir.
