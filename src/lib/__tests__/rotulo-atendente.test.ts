import { describe, it, expect } from "vitest";
import { rotuloAtendente, ID_CELULAR } from "../nao-definido";
describe("rotuloAtendente", () => {
  it("pessoa com nome", () => expect(rotuloAtendente("u1", "Ana")).toBe("Ana"));
  it("celular sem identificação", () => expect(rotuloAtendente(ID_CELULAR, null)).toBe("Respondida pelo celular (sem identificação)"));
  it("sem resposta da equipe", () => expect(rotuloAtendente(undefined, null)).toBe("Sem resposta da equipe"));
});
