import { describe, expect, it, vi } from "vitest";
import { podeCongelarRelatorio } from "../permissao-congelar";

describe("Congelar só para super admin", () => {
  it("super admin pode congelar", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true });
    expect(await podeCongelarRelatorio({ rpc })).toBe(true);
    expect(rpc).toHaveBeenCalledWith("is_admin");
  });
  it("leitor, parceiro e equipe sem super admin não podem congelar", async () => {
    expect(await podeCongelarRelatorio({ rpc: vi.fn().mockResolvedValue({ data: false }) })).toBe(false);
  });
  it("erro na verificação nunca concede permissão", async () => {
    expect(await podeCongelarRelatorio({ rpc: vi.fn().mockResolvedValue({ data: true, error: new Error("indisponível") }) })).toBe(false);
  });
});