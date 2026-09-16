import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Teste de segurança da integração com o app Elora.
 * Massa descartável criada e apagada aqui mesmo; nada de produção é tocado.
 *
 * Garante:
 * - a tabela de chaves (elora_integracao_contas) é invisível para qualquer
 *   login comum — nem o cliente dono da conta consegue SELECT;
 * - os snapshots (elora_uso_snapshots) seguem interno / próprio cliente /
 *   parceiro com painel liberado, e mais ninguém.
 */

const URL = process.env["SUPABASE_URL"]!;
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
const PUBLIC_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sufixo = `i${Date.now().toString(36)}`;
const PARC = `parc-i-${sufixo}`;
const CLI_A = `cli-ia-${sufixo}`;
const CLI_B = `cli-ib-${sufixo}`;
const emailParceiro = `parceiro.${sufixo}@teste-elora.invalid`;
const emailCliente = `cliente.${sufixo}@teste-elora.invalid`;
const emailIntruso = `intruso.${sufixo}@teste-elora.invalid`;
const SENHA = `Teste!${sufixo}`;

const usuariosCriados: string[] = [];
let donoId: string;

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

async function logar(email: string): Promise<SupabaseClient> {
  const cli = createClient(URL, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const senha = await cli.auth.signInWithPassword({ email, password: SENHA });
  if (!senha.error) return cli;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const otp = await cli.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.data.properties!.hashed_token,
  });
  if (otp.error) throw otp.error;
  return cli;
}

beforeAll(async () => {
  donoId = await criarUsuario(`dono.${sufixo}@teste-elora.invalid`);
  await criarUsuario(emailParceiro);
  await criarUsuario(emailCliente);
  await criarUsuario(emailIntruso);

  const p = await admin.from("elora_parceiros").insert({
    id: PARC,
    user_id: donoId,
    nome: `Parceiro I ${sufixo}`,
    acesso_painel_clientes: true,
  });
  if (p.error) throw p.error;

  const c = await admin.from("elora_clientes").insert([
    { id: CLI_A, user_id: donoId, nome: `Cliente A ${sufixo}`, parceiro_id: PARC },
    { id: CLI_B, user_id: donoId, nome: `Cliente B ${sufixo}` },
  ]);
  if (c.error) throw c.error;

  const conta = await admin.from("elora_integracao_contas" as never).insert({
    cliente_id: CLI_A,
    base_url: "https://exemplo.invalid",
    api_key: `chave-secreta-${sufixo}`,
  } as never);
  if (conta.error) throw conta.error;

  const snap = await admin.from("elora_uso_snapshots" as never).insert([
    { cliente_id: CLI_A, data: "2026-09-01", uso: { mau: 10 }, indicadores: { csat: 4.5 } },
    { cliente_id: CLI_B, data: "2026-09-01", uso: { mau: 5 }, indicadores: {} },
  ] as never);
  if (snap.error) throw snap.error;

  const contatos = await admin.from("elora_contatos_sincronizados" as never).insert([
    {
      cliente_id: CLI_A,
      contact_id: `c1-${sufixo}`,
      nome: "Contato A1",
      telefone: "+5511999999001",
      criado_em: "2026-09-05T12:00:00Z",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "laser",
      procedimento_interesse: "Harmonização",
      data_consulta: "2026-09-20",
    },
    {
      cliente_id: CLI_A,
      contact_id: `c2-${sufixo}`,
      nome: "Contato A2",
      telefone: "+5511999999002",
      criado_em: "2026-09-06T12:00:00Z",
      procedimento_interesse: "Botox",
    },
    {
      cliente_id: CLI_B,
      contact_id: `c3-${sufixo}`,
      nome: "Contato B1",
      telefone: "+5511999999003",
      criado_em: "2026-09-07T12:00:00Z",
    },
  ] as never);
  if (contatos.error) throw contatos.error;

  const paineis = await admin.from("elora_paineis_sincronizados" as never).insert([
    { cliente_id: CLI_A, painel_id: `p1-${sufixo}`, titulo: "Vendas", tipo: "Vendas", etapas: [] },
    { cliente_id: CLI_B, painel_id: `p2-${sufixo}`, titulo: "Gestão", tipo: "Gestao", etapas: [] },
  ] as never);
  if (paineis.error) throw paineis.error;

  const seqs = await admin.from("elora_sequencias_sincronizadas" as never).insert([
    { cliente_id: CLI_A, sequencia_id: `s1-${sufixo}`, nome: "Boas-vindas" },
    { cliente_id: CLI_B, sequencia_id: `s2-${sufixo}`, nome: "Reativação" },
  ] as never);
  if (seqs.error) throw seqs.error;

  const conversas = await admin.from("elora_conversas_classificadas" as never).insert([
    {
      cliente_id: CLI_A,
      sessao_id: `ses1-${sufixo}`,
      category_name: "Consulta Agendada",
      criado_em: "2026-09-05T12:00:00Z",
      teve_resposta: true,
    },
    {
      cliente_id: CLI_B,
      sessao_id: `ses2-${sufixo}`,
      category_name: "Procedimento Vendido",
      criado_em: "2026-09-06T12:00:00Z",
      teve_resposta: false,
    },
  ] as never);
  if (conversas.error) throw conversas.error;

  const vincParceiro = await admin
    .from("elora_parceiro_usuarios")
    .insert({ parceiro_id: PARC, email: emailParceiro, nome: "Parceiro Teste", ativo: true });
  if (vincParceiro.error) throw vincParceiro.error;

  const vincCliente = await admin
    .from("elora_cliente_usuarios")
    .insert({ cliente_id: CLI_A, email: emailCliente, nome: "Cliente Teste", ativo: true });
  if (vincCliente.error) throw vincCliente.error;
}, 60_000);

afterAll(async () => {
  await admin.from("elora_integracao_contas" as never).delete().eq("cliente_id", CLI_A);
  await admin.from("elora_uso_snapshots" as never).delete().in("cliente_id", [CLI_A, CLI_B]);
  await admin.from("elora_contatos_sincronizados" as never).delete().in("cliente_id", [CLI_A, CLI_B]);
  await admin.from("elora_cliente_usuarios").delete().eq("cliente_id", CLI_A);
  await admin.from("elora_parceiro_usuarios").delete().eq("parceiro_id", PARC);
  await admin.from("elora_clientes").delete().in("id", [CLI_A, CLI_B]);
  await admin.from("elora_parceiros").delete().eq("id", PARC);
  for (const id of usuariosCriados) await admin.auth.admin.deleteUser(id);
}, 60_000);

describe("integração Elora — chave da conta (elora_integracao_contas)", () => {
  it.each([
    ["parceiro vinculado", emailParceiro, "link_parceiro_usuario"],
    ["cliente dono da conta", emailCliente, "link_cliente_usuario"],
    ["usuário sem vínculo", emailIntruso, null],
  ])("%s não consegue ler a chave em nenhum cenário", async (_rotulo, email, link) => {
    const cli = await logar(email);
    if (link) await cli.rpc(link as never);

    const r = await cli.from("elora_integracao_contas" as never).select("*");
    // Sem GRANT para authenticated: a consulta é recusada ou volta vazia.
    if (r.error) {
      expect(String(r.error.message).toLowerCase()).toMatch(/permission|denied|42501/);
    } else {
      expect(r.data).toEqual([]);
    }
  }, 60_000);
});

describe("integração Elora — snapshots de uso (elora_uso_snapshots)", () => {
  it("o cliente logado lê apenas os próprios snapshots", async () => {
    const cli = await logar(emailCliente);
    await cli.rpc("link_cliente_usuario" as never);
    const { data, error } = await cli
      .from("elora_uso_snapshots" as never)
      .select("cliente_id, uso");
    expect(error).toBeNull();
    const linhas = (data ?? []) as { cliente_id: string }[];
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) expect(l.cliente_id).toBe(CLI_A);
  }, 60_000);

  it("o parceiro com painel liberado lê snapshots dos clientes dele, não de outros", async () => {
    const cli = await logar(emailParceiro);
    await cli.rpc("link_parceiro_usuario" as never);
    const { data, error } = await cli
      .from("elora_uso_snapshots" as never)
      .select("cliente_id");
    expect(error).toBeNull();
    const linhas = (data ?? []) as { cliente_id: string }[];
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) expect(l.cliente_id).toBe(CLI_A);
  }, 60_000);

  it("usuário sem vínculo não lê nenhum snapshot", async () => {
    const cli = await logar(emailIntruso);
    const { data, error } = await cli
      .from("elora_uso_snapshots" as never)
      .select("cliente_id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, 60_000);
});

describe("integração Elora — contatos sincronizados (elora_contatos_sincronizados)", () => {
  it("o cliente logado lê apenas os próprios contatos", async () => {
    const cli = await logar(emailCliente);
    await cli.rpc("link_cliente_usuario" as never);
    const { data, error } = await cli
      .from("elora_contatos_sincronizados" as never)
      .select("cliente_id, contact_id");
    expect(error).toBeNull();
    const linhas = (data ?? []) as { cliente_id: string }[];
    expect(linhas.length).toBe(2);
    for (const l of linhas) expect(l.cliente_id).toBe(CLI_A);
  }, 60_000);

  it("o parceiro com painel liberado lê contatos dos clientes dele, não de outros", async () => {
    const cli = await logar(emailParceiro);
    await cli.rpc("link_parceiro_usuario" as never);
    const { data, error } = await cli
      .from("elora_contatos_sincronizados" as never)
      .select("cliente_id");
    expect(error).toBeNull();
    const linhas = (data ?? []) as { cliente_id: string }[];
    expect(linhas.length).toBe(2);
    for (const l of linhas) expect(l.cliente_id).toBe(CLI_A);
  }, 60_000);

  it("usuário sem vínculo não lê nenhum contato", async () => {
    const cli = await logar(emailIntruso);
    const { data, error } = await cli
      .from("elora_contatos_sincronizados" as never)
      .select("cliente_id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, 60_000);

  it("o cliente não consegue gravar contatos — só a sincronização grava", async () => {
    const cli = await logar(emailCliente);
    await cli.rpc("link_cliente_usuario" as never);
    const r = await cli.from("elora_contatos_sincronizados" as never).insert({
      cliente_id: CLI_A,
      contact_id: `hack-${sufixo}`,
    } as never);
    expect(r.error).not.toBeNull();
    expect(String(r.error?.message ?? "").toLowerCase()).toMatch(
      /permission|denied|policy|row-level|42501/,
    );
  }, 60_000);
});
