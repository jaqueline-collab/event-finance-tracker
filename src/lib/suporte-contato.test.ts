import { describe, it, expect } from "vitest";
import { criarEhSuporte, nomeVisivel, normTelefone } from "./suporte";
const eh = criarEhSuporte([{ nome: "Jaqueline Ditós", email: "jaqueline@eloracrm.com.br", telefone: "21995501331" }]);
describe("usuários de suporte por nome, e-mail ou telefone", () => {
  it("reconhece pelo e-mail mesmo com outro nome", () => expect(eh("Jaque", "Jaqueline@EloraCRM.com.br")).toBe(true));
  it("reconhece pelo telefone com 55 e formatação", () => expect(eh("Outra", null, "+55 (21) 99550-1331")).toBe(true));
  it("não confunde outra pessoa", () => expect(eh("Vinicio", "v@x.com", "31999990000")).toBe(false));
  it("esconde o nome de suporte", () => expect(nomeVisivel(eh, "Qualquer", null, "21995501331")).toBeNull());
  it("telefone sem 55", () => expect(normTelefone("5521995501331")).toBe("21995501331"));
});
