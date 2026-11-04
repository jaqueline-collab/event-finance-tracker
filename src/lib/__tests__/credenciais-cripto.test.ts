import { describe, expect, it } from "vitest";
import { cifrarChave, decifrarChave, importarChaveMestra } from "@/lib/credenciais.server";

const chaveB64 = (seed: number) => btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => (i * 7 + seed) % 256)));

describe("cofre — criptografia AES-256-GCM", () => {
  it("ida e volta devolve a mesma chave", async () => {
    const k = await importarChaveMestra(chaveB64(1));
    expect(await decifrarChave(await cifrarChave("abc-123-segredo", k), k)).toBe("abc-123-segredo");
  });

  it("texto adulterado falha", async () => {
    const k = await importarChaveMestra(chaveB64(1));
    const c = await cifrarChave("abc", k);
    const bytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0));
    bytes[bytes.length - 1] ^= 1;
    const adulterado = btoa(String.fromCharCode(...bytes));
    await expect(decifrarChave(adulterado, k)).rejects.toThrow();
  });

  it("chave mestra errada falha", async () => {
    const k1 = await importarChaveMestra(chaveB64(1));
    const k2 = await importarChaveMestra(chaveB64(2));
    await expect(decifrarChave(await cifrarChave("abc", k1), k2)).rejects.toThrow();
  });

  it("IVs diferentes para a mesma chave", async () => {
    const k = await importarChaveMestra(chaveB64(1));
    expect(await cifrarChave("abc", k)).not.toBe(await cifrarChave("abc", k));
  });

  it("chave mestra com tamanho errado é recusada", async () => {
    await expect(importarChaveMestra(btoa("curta"))).rejects.toThrow(/32 bytes/);
  });
});
