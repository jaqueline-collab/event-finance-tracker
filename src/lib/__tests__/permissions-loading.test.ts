import { describe, it, expect } from "vitest";
import { deveMostrarLoading, cacheValidoPara, acaoParaEventoAuth } from "@/lib/permissions";

describe("permissões: carregamento", () => {
  it("depois da primeira leitura, loading nunca volta para true", () => {
    expect(deveMostrarLoading(false)).toBe(true);
    for (let i = 0; i < 5; i++) expect(deveMostrarLoading(true)).toBe(false);
  });
  it("cache só vale para o mesmo e-mail da sessão", () => {
    const c = { email: "a@x.com", isAdmin: true, perms: [] };
    expect(cacheValidoPara(c, "A@x.com")).toBe(c);
    expect(cacheValidoPara(c, "b@x.com")).toBeNull();
    expect(cacheValidoPara(c, null)).toBeNull();
  });
  it("TOKEN_REFRESHED e INITIAL_SESSION do mesmo e-mail não recarregam", () => {
    expect(acaoParaEventoAuth("TOKEN_REFRESHED", "a@x.com", "a@x.com")).toBe("ignorar");
    expect(acaoParaEventoAuth("INITIAL_SESSION", "a@x.com", "a@x.com")).toBe("ignorar");
    expect(acaoParaEventoAuth("SIGNED_IN", "b@x.com", "a@x.com")).toBe("recarregar");
  });
  it("SIGNED_OUT limpa o acesso", () => {
    expect(acaoParaEventoAuth("SIGNED_OUT", null, "a@x.com")).toBe("sair");
  });
});
