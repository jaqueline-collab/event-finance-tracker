import { describe, expect, it } from "vitest";
import { contatosContratados } from "../contatos-contratados";

describe("limite contratado na Conta", () => {
  it("Dr. Ricardo tem 5000 inclusos, não os 500 gravados no Setup", () => {
    expect(contatosContratados(5000, "dw9efheo", [
      { data: "2026-09-20", tipo: "setup", plano_id: "dw9efheo", contatos_ativos: 500 },
      { data: "2026-09-23", tipo: "upgrade", contatos_ativos: null },
    ])).toBe(5000);
  });
  it("soma adicionais explícitos sem somar o uso inicial", () => {
    expect(contatosContratados(5000, "rabbit", [
      { data: "2026-09-20", tipo: "setup", plano_id: "rabbit", contatos_ativos: 500 },
      { data: "2026-09-23", tipo: "upgrade", contatos_ativos: 500 },
    ])).toBe(5500);
  });
  it("downgrade reduz apenas adicionais e nunca a franquia", () => {
    expect(contatosContratados(5000, "rabbit", [
      { data: "2026-09-23", tipo: "upgrade", contatos_ativos: 500 },
      { data: "2026-09-24", tipo: "downgrade", contatos_ativos: -700 },
    ])).toBe(5000);
  });
  it("mudança de plano não carrega adicionais do plano anterior", () => {
    expect(contatosContratados(5000, "novo", [
      { data: "2026-09-20", tipo: "setup", plano_id: "antigo", contatos_ativos: 500 },
      { data: "2026-09-23", tipo: "upgrade", contatos_ativos: 500 },
      { data: "2026-09-24", tipo: "alterar_plano", plano_id: "novo" },
    ])).toBe(5000);
  });
});