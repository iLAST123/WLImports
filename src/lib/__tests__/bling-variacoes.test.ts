import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProdutos } from "../bling";

// Auth com credenciais → caminho Bling (mockamos o fetch, nunca toca a rede).
const authComCred = {
  hasCredentials: async () => true,
  getAccessToken: async () => "token-teste",
};

const noop = async () => {};

/** Item bruto da listagem, incluindo os campos de variação (opcionais). */
interface RawItem {
  id: number;
  nome: string;
  preco?: number;
  situacao?: string;
  formato?: "S" | "V" | "E";
  idProdutoPai?: number;
}

function pageRes(data: RawItem[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response;
}

/** Uma página só (menos de 100 itens → getProdutos para na 1ª). */
function umaPagina(data: RawItem[]) {
  return vi.fn().mockResolvedValueOnce(pageRes(data));
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("tolerância a variações do Bling na listagem", () => {
  it("(a) payload SEM variações → no-op (nada some, sem idProdutoPai)", async () => {
    const raws: RawItem[] = [
      { id: 1, nome: "Perfume A", preco: 100, situacao: "A" },
      { id: 2, nome: "Perfume B", preco: 200, situacao: "A" },
      { id: 3, nome: "Perfume C", preco: 0, situacao: "A" }, // sem preço, mantido
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    expect(r.fonte).toBe("bling");
    expect(r.produtos.map((p) => p.id).sort()).toEqual([1, 2, 3]);
    // Contrato inalterado: sem campo de variação em produto comum.
    for (const p of r.produtos) expect(p.idProdutoPai).toBeUndefined();
  });

  it("(b) pai formato V + 2 filhos → pai oculto, filhos presentes e vendáveis", async () => {
    const raws: RawItem[] = [
      { id: 10, nome: "Ébène Noir (pai)", preco: 0, situacao: "A", formato: "V" },
      {
        id: 11,
        nome: "Ébène Noir 5ml",
        preco: 90,
        situacao: "A",
        idProdutoPai: 10,
      },
      {
        id: 12,
        nome: "Ébène Noir 10ml",
        preco: 150,
        situacao: "A",
        idProdutoPai: 10,
      },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    const ids = r.produtos.map((p) => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([11, 12]); // pai 10 oculto
    // Filhos expõem o pai (F4 agrupa por ele) e seguem vendáveis.
    for (const filho of r.produtos) {
      expect(filho.idProdutoPai).toBe(10);
      expect(filho.precoFormatado).toBeTruthy();
    }
  });

  it("(c) pai formato V SEM filhos na listagem → pai mantido (Sob consulta)", async () => {
    const raws: RawItem[] = [
      { id: 20, nome: "Musc Nomade (pai)", preco: 0, situacao: "A", formato: "V" },
      { id: 21, nome: "Iris Poudré", preco: 300, situacao: "A" },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    const pai = r.produtos.find((p) => p.id === 20);
    expect(pai).toBeDefined();
    expect(pai!.consultar).toBe(true); // sem preço → "Sob consulta"
    expect(r.produtos).toHaveLength(2);
  });

  it("(d) filho cujo pai não está na página → filho mantido", async () => {
    const raws: RawItem[] = [
      {
        id: 31,
        nome: "Santal Doré 10ml",
        preco: 120,
        situacao: "A",
        idProdutoPai: 999, // pai fora desta listagem
      },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    expect(r.produtos).toHaveLength(1);
    expect(r.produtos[0].id).toBe(31);
    expect(r.produtos[0].idProdutoPai).toBe(999);
  });

  it("só formato V é ocultado: um pai referenciado mas formato S permanece", async () => {
    const raws: RawItem[] = [
      { id: 40, nome: "Bois Simples", preco: 0, situacao: "A", formato: "S" },
      { id: 41, nome: "Bois filho", preco: 80, situacao: "A", idProdutoPai: 40 },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    expect(r.produtos.map((p) => p.id).sort((a, b) => a - b)).toEqual([40, 41]);
  });

  it("idProdutoPai=0 (convenção 'sem pai' do ERP) não oculta nem vaza", async () => {
    const raws: RawItem[] = [
      { id: 50, nome: "Fleur", preco: 100, situacao: "A", idProdutoPai: 0 },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    expect(r.produtos).toHaveLength(1);
    expect(r.produtos[0].idProdutoPai).toBeUndefined();
  });

  it("filho INATIVO não oculta o pai (só filho visível conta)", async () => {
    const raws: RawItem[] = [
      { id: 60, nome: "Vétiver (pai)", preco: 0, situacao: "A", formato: "V" },
      {
        id: 61,
        nome: "Vétiver 5ml",
        preco: 90,
        situacao: "I", // inativo → filtrado antes da regra
        idProdutoPai: 60,
      },
    ];
    const r = await getProdutos({
      auth: authComCred,
      fetchFn: umaPagina(raws),
      sleep: noop,
    });
    // Filho some por inativo; sem filho visível, o pai é mantido.
    expect(r.produtos.map((p) => p.id)).toEqual([60]);
  });

  it("pai e filho em PÁGINAS diferentes → pai ainda é ocultado", async () => {
    const pagina1: RawItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: 1000 + i,
      nome: `Preenchimento ${i}`,
      preco: 50,
      situacao: "A",
      ...(i === 0 ? { formato: "V" as const } : {}), // id 1000 é o pai
    }));
    const pagina2: RawItem[] = [
      {
        id: 2000,
        nome: "Filho na página 2",
        preco: 70,
        situacao: "A",
        idProdutoPai: 1000, // aponta para o pai da página 1
      },
    ];
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(pageRes(pagina1))
      .mockResolvedValueOnce(pageRes(pagina2));

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    const ids = new Set(r.produtos.map((p) => p.id));
    expect(ids.has(1000)).toBe(false); // pai oculto mesmo cruzando página
    expect(ids.has(2000)).toBe(true); // filho presente
  });
});
