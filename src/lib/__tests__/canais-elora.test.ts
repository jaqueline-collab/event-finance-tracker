import { describe, it, expect } from "vitest";
import { tipoDoCanal, nomeExibidoCanal } from "@/lib/dados-elora";

describe("canais do Elora", () => {
  it("reconhece WhatsApp, Instagram e Messenger", () => {
    expect(tipoDoCanal("WhatsApp")).toBe("whatsapp");
    expect(tipoDoCanal("Instagram")).toBe("instagram");
    expect(tipoDoCanal("FacebookMessenger")).toBe("messenger");
    expect(tipoDoCanal("Email")).toBe("outro");
  });
  it("apelido substitui o nome do Elora só quando preenchido", () => {
    expect(nomeExibidoCanal("Recepção", "Canal 1")).toBe("Recepção");
    expect(nomeExibidoCanal("  ", "Canal 1")).toBe("Canal 1");
    expect(nomeExibidoCanal(null, "Canal 1")).toBe("Canal 1");
  });
});
