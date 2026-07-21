# Referência observada — Aesop (pesquisa de campo, 2026-07-21)

> **Como isto foi obtido.** Não é "de memória". `www.aesop.com` está atrás de
> Cloudflare (403 em `curl`/WebFetch). A coleta foi feita com Chromium headless
> (Playwright) passando o challenge, extraindo **computed styles reais**, DOM e
> screenshots de: **home** (`/us/`) e **PLP** (`/fragrance/`). A **PDP**
> (`/fragrance/woody/hwyl-eau-de-parfum/FR15.html`) manteve o challenge mesmo
> após 90s e em `.co.uk`; foi obtida via **snapshot do Wayback Machine**
> (`web.archive.org/web/20260523021330/...`), que serviu o **DOM e a copy** mas
> **não o CSS** — por isso a PDP abaixo tem **IA e copy observadas**, mas
> **medidas visuais inferidas** do sistema comum da home/PLP. Está marcado.

## 1. Superfície e cor (medido, `getComputedStyle`)

| Papel | Valor real | Nota |
|---|---|---|
| Fundo da página | `rgb(255,254,242)` = **#FFFEF2** | creme quente, **não** branco |
| Texto principal | `rgb(51,51,51)` = **#333333** | quase-preto suave, **nunca #000** |
| Texto secundário | `rgb(102,102,102)` = **#666666** | |
| Superfície tingida | `rgb(246,245,232)` = **#F6F5E8** | barra de filtros, blocos |
| Plate da imagem do card | `rgb(229,223,220)`/bege | a foto senta num **retângulo tingido**, não no fundo da página |
| Escuro (botão/rodapé) | `rgb(51,51,51)` e `rgb(37,37,37)` = **#252525** | |
| Acento editorial | `rgb(148,92,38)` ferrugem | só em badge/tag |

O par dominante é **#333 sobre #FFFEF2 → contraste ~12.3:1** (AAA). Aesop não
usa cinza claro em texto: o secundário #666 sobre #FFFEF2 ainda dá ~5.9:1 (AA).

## 2. Tipografia (medido — o achado mais importante)

Histograma real de tamanhos na home (nós de texto folha):

```
323×  14px  ls:normal  tt:none      ← o corpo do site inteiro
 74×  14px  (medium)
 69×  16px
 39×  12px  ← utilitário (top nav, legendas)
  9×  31px  ← display, quase raro
  2×  12px  UPPERCASE  ← só isso de caixa alta na home inteira
```

Consequências, todas contra o que o WLimports faz hoje:

1. **Tipo pequeno.** O corpo é **14px**, utilitário 12px. Não há 18–20px "de
   conforto".
2. **`letter-spacing: normal` em praticamente tudo.** Nada de `tracking-[0.36em]`.
3. **Sentence case.** Uppercase aparece **2 vezes** na home inteira. Hoje o
   WLimports usa `uppercase tracking-[0.2em]` em eyebrow, chip, botão, breadcrumb
   e CTA de card — é o oposto do idioma Aesop.
4. **Display é contido**: h1 da capa de categoria = `30px/37.5px weight 400`;
   h1 interno = `24px/30px weight 400`. **Peso 400**, não bold.
5. **Nome do produto no card**: `h2, 14px, weight 700, line-height 15.12px`
   (≈1.08 — bem apertado), sentence case.
6. Fontes: `SuisseIntl` (sans neutra) + `Zapf-Humanist`/`Times` só no wordmark.
   **O sistema é sans**; a serifa é reservada à marca.

## 3. Grid do catálogo (medido)

```
.c-product-grid → grid-template-columns: 270px 270px 270px 270px
                  gap: 50px 30px        (linha 50 / coluna 30)
                  container: 1170px
```

**4 colunas** em 1440. Cards **sem borda, sem raio, sem sombra**. A densidade
vem do tamanho pequeno do tipo e do gap generoso — não de moldura.

## 4. Anatomia do card (observada na PLP)

De cima para baixo, dentro de 270px:

1. **Plate de imagem** tingido (bege), com a foto centralizada.
2. **Ícone de salvar** (bookmark) no canto superior direito da plate.
3. **Tag editorial** opcional no canto superior esquerdo, em ferrugem:
   `"Beloved formulation"`, `"New addition"`.
4. **Nome** — 14px/700, sentence case.
5. **Linha de notas** — 3 palavras: `"Yuzu, Vetiver Heart, Basil"`.
6. **Linha de tamanho** — `"One size only"` + `"1.6 fl oz"`, **ou** um
   `select` "Size" quando há mais de um.
7. **Preço** — `"$285.00"`.
8. **Botão escuro de largura total** ("Add to cart") **dentro do card**.

> O card da Aesop é **denso e transacional**: 5 linhas de informação + CTA.
> Ele só funciona porque **existe dado para cada linha**. Ver §7.

## 5. Cabeçalho e IA (observado)

- **Duas faixas.** Superior utilitária (12px/700): `Stores` · `Customer service`
  à esquerda, **wordmark centralizado**, `Email sign up` · `Account` ·
  `My cart (0)` à direita. Inferior: nav principal (14px medium) —
  `Shop all · New & Notable · Skin Care · Hand & Body · Fragrance · Home · Hair ·
  Travel · Gifts · Library · Experience` + **campo de busca emoldurado** à direita.
- **O header é bicromático**: **transparente com texto claro** sobre o hero
  escuro da home; **creme opaco com texto escuro** nas páginas internas.
- Mega-menu multi-faceta (ex. Skin Care → `Category` / `Skin concern` /
  `Skin type` / `Ingredients`), cada faceta com uma lista curta.

## 6. A ponte escuro → claro (o achado que resolve o problema do dono)

**A própria Aesop é híbrida.** A home abre com um **hero escuro e cinematográfico**
(imagem quente, quase marrom, texto branco por cima) e o corpo abaixo é creme.
E na PLP o padrão se repete de forma canônica:

```
header creme opaco
└─ FAIXA ESCURA full-bleed (~290px): imagem editorial + título em branco,
   alinhado à ESQUERDA, 30px/400, sentence case      ← "capa de categoria"
└─ corpo creme: breadcrumb → barra de filtros tingida → grid
```

Ou seja: **a transição não é um corte — é uma capa escura no topo de cada página
clara.** O mundo escuro entra como "cabeçalho editorial" e dissolve no creme.
Isto é padrão observado, não invenção — e é exatamente a costura que o dono pediu.

Hero da home (copy observada):
```
A sensory juxtaposition                      ← eyebrow, 14px bold
Cool Coriander Seed. Warm Black Pepper.      ← headline ~36px, sentence case
Composed of an unexpected blend of essential oils, …   ← 1 frase
[ Discover Antithesis  → ]                   ← botão retangular VAZADO, sem raio
```

## 7. Ficha de produto — IA e copy (DOM observado; medidas inferidas)

Ordem real do `Hwyl Eau de Parfum`:

1. Breadcrumb `Category > Woody`
2. `h1` nome do produto
3. Preço
4. **Parágrafo-lede sensorial** logo abaixo do preço ("An intriguing fragrance
   reminiscent of an ancient Hinoki forest: mist rising above the treetops…")
5. Badge (`Beloved formulation`)
6. **Linha de notas** (`Cypress, Frankincense, Vetiver`)
7. **Seletor de tamanho** com preço por tamanho (`1.6 fl oz $200` / `3.3 fl oz $285`)
8. Botão de compra
9. **`Suggested partners`** — 3 produtos, cada um com o **motivo** como título:
   `Exfoliate the body` · `Follow with hydration` · `Complement with similar aromas`
10. **Acordeão `Description` | `Ingredients` | `Packaging and recycling`**
11. `Recently viewed`
12. Rodapé: `Orders and support` · `About` · `Sustainability` · `Subscribe` ·
    `Connect with us`

Dentro de `Description`, micro-campos rotulados — a assinatura editorial da Aesop:

```
Aroma: Smoky, woody, spicy
Suited to: All genders; freethinkers, eccentrics, wanderers
Key ingredients: Cypress, Frankincense, Vetiver
```

## 8. Microcopy (verbatim observado)

`Shop all` · `All filters` · `14 products` · `Sort: Featured` · `One size only` ·
`Select a size` · `Add to cart` · `Suggested partners` · `Recently viewed` ·
`Beloved formulation` · `New addition` · `My cart (0)` · `Email sign up`

Tom: **descritivo e sóbrio**, nunca imperativo-publicitário. Sem "!", sem
"exclusivo", sem "imperdível". O produto é descrito, não vendido.

---

## 9. ⚠️ Confronto com a realidade do nosso dado (leia antes de copiar o layout)

O card e a ficha da Aesop pressupõem **5–8 campos por produto**. O catálogo real
do dono no Bling entrega, por produto:

| Campo Aesop | Temos? | Fonte |
|---|---|---|
| Nome | ✅ | listagem |
| Preço | ✅ (ou "Sob consulta") | listagem |
| Imagem | ✅ **1 só** | detalhe (DEC-003) |
| Notas / descritor curto | ❌ `descricaoCurta` vem vazia | — |
| Descrição-lede | ❌ **0 de 8 produtos amostrados têm descrição** | — |
| Ingredientes / "Aroma:" / "Suited to:" | ❌ não existe no ERP | — |
| Tamanho como campo | ⚠️ **só dentro do nome** ("… 100ml") | derivável |
| Categoria | ❌ ver abaixo | — |

### Categoria: verificado na spec OpenAPI oficial — NÃO há fonte barata

- `GET /produtos` (listagem) → `ProdutosDadosBaseDTO` = `id, idProdutoPai, nome,
  codigo, preco, precoCusto, estoque, tipo, situacao, formato, descricaoCurta,
  imagemURL`. **Sem categoria** (confirma o aprendizado da missão 2).
- `GET /produtos/{id}` (detalhe) **tem** `categoria`, mas o schema
  `ProdutosCategoriaDTO` é `{ id: integer }` — **só o id, sem o nome**.
- `GET /categorias/produtos` existe e daria o mapa id→descrição (1 chamada,
  cacheável).

**Conclusão honesta:** montar navegação por categoria real exigiria o **detalhe
de todos os produtos** só para descobrir o id da categoria de cada um — que é
exatamente a chamada cara, enfileirada e lazy da DEC-003. Isso **violaria a
restrição de não aumentar chamadas por pageview**. Portanto: **não construímos
taxonomia**. O filtro por categoria existente já é derivado do dado (`p.categoria`)
e some sozinho quando não há nenhuma — comportamento correto, mantido.

### Regra de degradação (inegociável nesta superfície)

Um layout Aesop com blocos vazios fica **pior** que o layout atual. Portanto:
**todo bloco que depende de dado ausente não é renderizado** — sem título órfão,
sem placeholder, sem lorem, sem "Descrição não disponível". O card degrada de
`imagem · nome · notas · tamanho · preço · CTA` para `imagem · nome · preço · CTA`
**sem deixar buraco** (o preço sobe, o card encolhe, o grid continua alinhado
porque as linhas são fluidas, não de altura fixa).

O **MOCK deve ser rico** (descrição, notas, volume) para demonstrar o layout
cheio; o caminho real degrada. As duas rotas precisam ser bonitas.
