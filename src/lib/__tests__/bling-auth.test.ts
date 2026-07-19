import { describe, it, expect, vi } from "vitest";
import {
  BlingAuth,
  BlingAuthError,
  type StoredTokens,
  type TokenStore,
} from "../bling-auth";

const ENV = {
  BLING_CLIENT_ID: "client-id-teste",
  BLING_CLIENT_SECRET: "client-secret-teste",
  BLING_REFRESH_TOKEN: "R1",
};

function makeStore(initial: StoredTokens | null = null) {
  const state: { saved: StoredTokens | null } = { saved: initial };
  const store: TokenStore = {
    load: vi.fn(async () => state.saved),
    save: vi.fn(async (t: StoredTokens) => {
      state.saved = t;
    }),
  };
  return { store, state };
}

function tokenRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("BlingAuth", () => {
  it("hasCredentials: false sem client id/secret", async () => {
    const auth = new BlingAuth({
      env: {},
      store: makeStore().store,
    });
    expect(await auth.hasCredentials()).toBe(false);
  });

  it("hasCredentials: true com env completo", async () => {
    const auth = new BlingAuth({ env: ENV, store: makeStore().store });
    expect(await auth.hasCredentials()).toBe(true);
  });

  it("hasCredentials: true se a semente vem do store (sem env refresh)", async () => {
    const { store } = makeStore({ refreshToken: "RS" });
    const auth = new BlingAuth({
      env: {
        BLING_CLIENT_ID: "id",
        BLING_CLIENT_SECRET: "secret",
      },
      store,
    });
    expect(await auth.hasCredentials()).toBe(true);
  });

  it("renova com URL (www), header Basic e body urlencoded corretos; credencial não vaza no body", async () => {
    const fetchFn = vi.fn(async () =>
      tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
    );
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: {
        BLING_CLIENT_ID: "id",
        BLING_CLIENT_SECRET: "secret",
        BLING_REFRESH_TOKEN: "R1",
      },
      now: () => 0,
    });

    const token = await auth.getAccessToken();
    expect(token).toBe("AT");

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://www.bling.com.br/Api/v3/oauth/token");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      "Basic " + Buffer.from("id:secret").toString("base64"),
    );
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    const body = init.body as string;
    const params = new URLSearchParams(body);
    expect(params.get("grant_type")).toBe("refresh_token");
    expect(params.get("refresh_token")).toBe("R1");
    // credenciais NUNCA no body
    expect(body).not.toContain("secret");
    expect(body).not.toContain("client_id");
  });

  it("rotaciona o refresh token: salva o novo e usa o rotacionado na próxima renovação", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT1", expires_in: 1, refresh_token: "R2" }),
      )
      .mockResolvedValueOnce(
        tokenRes({ access_token: "AT2", expires_in: 1, refresh_token: "R3" }),
      );
    const { store, state } = makeStore();
    let now = 0;
    const auth = new BlingAuth({ fetchFn, store, env: ENV, now: () => now });

    await auth.getAccessToken(); // usa a semente R1
    expect(state.saved?.refreshToken).toBe("R2");
    expect(store.save).toHaveBeenCalledTimes(1);

    now += 10_000; // access token (expires_in 1s) já expirou
    await auth.getAccessToken(); // deve usar o rotacionado R2

    const body2 = new URLSearchParams(
      (fetchFn.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(body2.get("refresh_token")).toBe("R2");
    expect(state.saved?.refreshToken).toBe("R3");
  });

  it("cache: duas chamadas com token válido → 1 POST; após expirar → novo POST", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
      );
    let now = 0;
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => now,
    });

    await auth.getAccessToken();
    await auth.getAccessToken();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    now += 21600 * 1000 + 1; // além do expires_in
    await auth.getAccessToken();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("single-flight: chamadas concorrentes disparam um único POST", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchFn = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });

    const both = Promise.all([auth.getAccessToken(), auth.getAccessToken()]);
    // deixa os microtasks (ensureLoaded) drenarem antes de resolver o fetch
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFetch(
      tokenRes({ access_token: "AT", expires_in: 21600, refresh_token: "R2" }),
    );
    const [a, b] = await both;
    expect(a).toBe("AT");
    expect(b).toBe("AT");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("erro 4xx no refresh → lança BlingAuthError com status", async () => {
    const fetchFn = vi.fn(async () => tokenRes({ error: "invalid_grant" }, 400));
    const auth = new BlingAuth({
      fetchFn,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
  });

  it("falha de rede no refresh → lança BlingAuthError", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const auth = new BlingAuth({
      fetchFn: fetchFn as unknown as typeof fetch,
      store: makeStore().store,
      env: ENV,
      now: () => 0,
    });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(BlingAuthError);
  });
});
