import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Teste de segurança do painel do cliente.
 * Roda contra o banco real com massa descartável, criada e apagada aqui mesmo.
 * Nenhum dado de produção é lido ou alterado.
 */

const URL = process.env["SUPABASE_URL"]!;
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
const PUBLIC_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sufixo = `t${Date.now().toString(36)}`;
const PARC_A = `parc-a-${sufixo}`;
const PARC_B = `parc-b-${sufixo}`;
const CLI_A = `cli-a-${sufixo}`;
const CLI_B = `cli-b-${sufixo}`;
const emailParceiro = `parceiro.${sufixo}@teste-elora.invalid`;
const emailCliente = `cliente.${sufixo}@teste-elora.invalid`;
const SENHA = `Teste!${sufixo}`;

const usuariosCriados: string[] = [];

async function criarUsuario(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw error;
  usuariosCriados.push(data.user!.id);
  return data.user!.id;
}

/** Cliente Supabase autenticado como o usuário informado (RLS aplicada). */
async function logar(email: string): Promise<SupabaseClient> {
  const cli = createClient(URL, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const senha = await cli.auth.signInWithPassword({ email, password: SENHA });
  if (!senha.error) return cli;

  // Projeto com senha desabilitada: entra pelo link mágico.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const hash = link.data.properties?.hashed_token;
  if (!hash) throw new Error("não foi possível gerar sessão de teste");
  const otp = await cli.auth.verifyOtp({ type: "magiclink", token_hash: hash });
  if (otp.error) throw otp.error;
  return cli;
}

async function abrirPainel(cli: SupabaseClient, clienteId: string) {
  return cli.rpc("painel_cliente_dados" as never, { _cliente_id: clienteId } as never);
}

const CHAVES_PROIBIDAS = [
  "custo",
  "margem",
  "lucro",
  "wts",
  "preco_unit",
  "custo_unitario",
  "valor_acompanhamento",
  "licenca_base",
];

function chavesDe(valor: unknown, saida: string[] = []): string[] {
  if (Array.isArray(valor)) {
    valor.forEach((v) => chavesDe(v, saida));
  } else if (valor && typeof valor === "object") {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      saida.push(k);
      chavesDe(v, saida);
    }
  }
  return saida;
}

let donoId: string;

beforeAll(async () => {
  donoId = await criarUsuario(`dono.${sufixo}@teste-elora.invalid`);
  await criarUsuario(emailParceiro);
  await criarUsuario(emailCliente);

  const p = await admin.from("elora_parceiros").insert([
    { id: PARC_A, user_id: donoId, nome: `Parceiro A ${sufixo}`, acesso_painel_clientes: false },
    { id: PARC_B, user_id: donoId, nome: `Parceiro B ${sufixo}`, acesso_painel_clientes: true },
  ]);
  if (p.error) throw p.error;

  const c = await admin.from("elora_clientes").insert([
    { id: CLI_A, user_id: donoId, nome: `Cliente do A ${sufixo}`, parceiro_id: PARC_A },
    { id: CLI_B, user_id: donoId, nome: `Cliente do B ${sufixo}`, parceiro_id: PARC_B },
  ]);
  if (c.error) throw c.error;

  const m = await admin.from("elora_movimentos").insert([
    {
      id: `mov-${sufixo}`,
      user_id: donoId,
      cliente_id: CLI_A,
      data: "2026-01-10",
      tipo: "upgrade",
      usuarios_ativos: 2,
    },
  ]);
  if (m.error) throw m.error;

  const acessoParceiro = await admin
    .from("elora_parceiro_usuarios")
    .insert({ parceiro_id: PARC_A, email: emailParceiro, nome: "Parceiro Teste", ativo: true });
  if (acessoParceiro.error) throw acessoParceiro.error;

  const acessoCliente = await admin
    .from("elora_cliente_usuarios")
    .insert({ cliente_id: CLI_A, email: emailCliente, nome: "Cliente Teste", ativo: true });
  if (acessoCliente.error) throw acessoCliente.error;
}, 60_000);

afterAll(async () => {
  await admin.from("elora_movimentos").delete().eq("cliente_id", CLI_A);
  await admin.from("elora_cliente_usuarios").delete().eq("cliente_id", CLI_A);
  await admin.from("elora_parceiro_usuarios").delete().eq("parceiro_id", PARC_A);
  await admin.from("elora_clientes").delete().in("id", [CLI_A, CLI_B]);
  await admin.from("elora_parceiros").delete().in("id", [PARC_A, PARC_B]);
  for (const id of usuariosCriados) await admin.auth.admin.deleteUser(id);
}, 60_000);

describe("painel do cliente — parceiro sem acesso", () => {
  it("com o controle DESLIGADO, o parceiro não abre o painel do cliente dele", async () => {
    const cli = await logar(emailParceiro);
    await cli.rpc("link_parceiro_usuario" as never);

    const { data, error } = await abrirPainel(cli, CLI_A);
    expect(data).toBeNull();
    expect(String(error?.message ?? "")).toContain("acesso-negado");
  }, 60_000);

  it("com o controle DESLIGADO, o parceiro ainda enxerga a própria carteira (lista)", async () => {
    const cli = await logar(emailParceiro);
    await cli.rpc("link_parceiro_usuario" as never);
    const { data, error } = await cli.from("elora_clientes").select("id").eq("id", CLI_A);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  }, 60_000);

  it("com o controle LIGADO, abre o cliente dele e nunca um de outro parceiro", async () => {
    await admin.from("elora_parceiros").update({ acesso_painel_clientes: true }).eq("id", PARC_A);
    const cli = await logar(emailParceiro);
    await cli.rpc("link_parceiro_usuario" as never);

    const proprio = await abrirPainel(cli, CLI_A);
    expect(proprio.error).toBeNull();
    expect((proprio.data as any)?.cliente?.id).toBe(CLI_A);

    const alheio = await abrirPainel(cli, CLI_B);
    expect(alheio.data).toBeNull();
    expect(String(alheio.error?.message ?? "")).toContain("acesso-negado");

    const chaves = chavesDe(proprio.data).map((k) => k.toLowerCase());
    for (const proibida of CHAVES_PROIBIDAS) {
      expect(chaves.some((k) => k.includes(proibida))).toBe(false);
    }

    await admin.from("elora_parceiros").update({ acesso_painel_clientes: false }).eq("id", PARC_A);
  }, 60_000);

  it("o cliente logado só abre o próprio painel", async () => {
    const cli = await logar(emailCliente);
    await cli.rpc("link_cliente_usuario" as never);

    const proprio = await abrirPainel(cli, CLI_A);
    expect(proprio.error).toBeNull();
    expect((proprio.data as any)?.cliente?.id).toBe(CLI_A);

    const outro = await abrirPainel(cli, CLI_B);
    expect(outro.data).toBeNull();
    expect(String(outro.error?.message ?? "")).toContain("acesso-negado");
  }, 60_000);

  it("usuário sem vínculo nenhum é recusado", async () => {
    const cli = await logar(`dono.${sufixo}@teste-elora.invalid`);
    const r = await abrirPainel(cli, CLI_A);
    // O "dono" das linhas de teste não é equipe interna nem parceiro vinculado.
    expect(r.data).toBeNull();
    expect(String(r.error?.message ?? "")).toContain("acesso-negado");
  }, 60_000);
});
