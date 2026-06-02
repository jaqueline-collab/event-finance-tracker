import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cliente, CustoBase, LancamentoFinanceiro, Movimento, Parceiro, Plano, TipoMovimento } from "./types";
import { supabase } from "./supabaseClient";

const uid = () => Math.random().toString(36).slice(2, 10);

interface State {
  custos: CustoBase[];
  planos: Plano[];
  clientes: Cliente[];
  movimentos: Movimento[];
  parceiros: Parceiro[];
  financeiro: LancamentoFinanceiro[];
  // sync
  syncFromSupabase: () => Promise<void>;
  // custos
  addCusto: (c: Omit<CustoBase, "id">) => void;
  updateCusto: (id: string, c: Partial<CustoBase>) => void;
  removeCusto: (id: string) => void;
  // planos
  addPlano: (p: Omit<Plano, "id">) => void;
  updatePlano: (id: string, p: Partial<Plano>) => void;
  removePlano: (id: string) => void;
  // clientes
  addCliente: (c: Omit<Cliente, "id">) => string;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  removeCliente: (id: string) => void;
  // movimentos
  addMovimento: (m: Omit<Movimento, "id">) => void;
  removeMovimento: (id: string) => void;
  // parceiros
  addParceiro: (p: Omit<Parceiro, "id" | "criadoEm">) => void;
  updateParceiro: (id: string, p: Partial<Parceiro>) => void;
  removeParceiro: (id: string) => void;
  // financeiro
  addLancamento: (l: Omit<LancamentoFinanceiro, "id">) => string;
  updateLancamento: (id: string, l: Partial<LancamentoFinanceiro>) => void;
  removeLancamento: (id: string) => void;
  // reset
  resetAll: () => void;
  seedDemo: () => void;
}

const defaultCustos: CustoBase[] = [
  { id: uid(), nome: "Elora Base (ferramenta)", tipo: "ferramenta", custoUnitario: 0, precoCliente: 0, unidade: "fixo" },
  { id: uid(), nome: "App adicional", tipo: "app", custoUnitario: 5, precoCliente: 15, unidade: "por app" },
  { id: uid(), nome: "MAU adicional", tipo: "mau", custoUnitario: 0.1, precoCliente: 0.5, unidade: "por MAU" },
  { id: uid(), nome: "Transcrição IA por usuário", tipo: "extra", custoUnitario: 6.99, precoCliente: 6.99, unidade: "por usuário" },
];

const defaultPlanos: Plano[] = [
  { id: uid(), nome: "Starter", valorMensal: 297, valorSetup: 497, canaisInclusos: 1, usuariosInclusos: 3, contatosInclusos: 500, canaisWhatsInclusos: 1, canaisInstaInclusos: 0, canaisMessengerInclusos: 0, incluiIA: false, incluiAsaas: false, incluiZapi: 0, incluiTranscricao: false, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
  { id: uid(), nome: "Growth", valorMensal: 597, valorSetup: 997, canaisInclusos: 3, usuariosInclusos: 10, contatosInclusos: 2000, canaisWhatsInclusos: 1, canaisInstaInclusos: 1, canaisMessengerInclusos: 1, incluiIA: false, incluiAsaas: false, incluiZapi: 1, incluiTranscricao: false, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
  { id: uid(), nome: "Scale", valorMensal: 1197, valorSetup: 1997, canaisInclusos: 6, usuariosInclusos: 25, contatosInclusos: 10000, canaisWhatsInclusos: 2, canaisInstaInclusos: 2, canaisMessengerInclusos: 2, incluiIA: true, incluiAsaas: true, incluiZapi: 1, incluiTranscricao: true, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
];

// ===== Mappers de Banco de Dados (CamelCase <=> SnakeCase) =====

const mapPlanoToDb = (p: Plano) => ({
  id: p.id,
  nome: p.nome,
  valor_mensal: p.valorMensal,
  valor_setup: p.valorSetup,
  canais_inclusos: p.canaisInclusos,
  usuarios_inclusos: p.usuariosInclusos,
  contatos_inclusos: p.contatosInclusos,
  canais_whats_inclusos: p.canaisWhatsInclusos,
  canais_insta_inclusos: p.canaisInstaInclusos,
  canais_messenger_inclusos: p.canaisMessengerInclusos,
  inclui_ia: p.incluiIA,
  inclui_asaas: p.incluiAsaas,
  inclui_zapi: p.incluiZapi,
  inclui_transcricao: p.incluiTranscricao,
  licenca_base: p.licencaBase,
  preco_canais_exc: p.precoCanaisExc,
  preco_usuarios_exc: p.precoUsuariosExc,
  preco_contatos_exc: p.precoContatosExc,
  preco_ia: p.precoIA,
  preco_asaas: p.precoAsaas,
  preco_zapi: p.precoZapi,
  preco_transcricao_user: p.precoTranscricaoUser,
  preco_canal_whats_exc: p.precoCanalWhatsExc,
  preco_canal_insta_exc: p.precoCanalInstaExc,
  preco_canal_messenger_exc: p.precoCanalMessengerExc,
  valor_canais_exc: p.valorCanaisExc,
  valor_usuarios_exc: p.valorUsuariosExc,
  valor_contatos_exc: p.valorContatosExc,
  valor_ia: p.valorIA,
  valor_asaas: p.valorAsaas,
  valor_zapi: p.valorZapi,
  valor_transcricao_user: p.valorTranscricaoUser,
  valor_canal_whats_exc: p.valorCanalWhatsExc,
  valor_canal_insta_exc: p.valorCanalInstaExc,
  valor_canal_messenger_exc: p.valorCanalMessengerExc,
  parceiro_ids: p.parceiroIds,
  observacao: p.observacao || "",
  dia_vencimento: p.diaVencimento ?? null,
});

const mapDbToPlano = (r: any): Plano => {
  const canaisInclusos = Number(r.canais_inclusos ?? 1);
  // Compat: if per-type franchise columns are all 0 but legacy canais_inclusos > 0,
  // assume WhatsApp-only.
  const whatsInc = Number(r.canais_whats_inclusos ?? 0);
  const instaInc = Number(r.canais_insta_inclusos ?? 0);
  const msgInc = Number(r.canais_messenger_inclusos ?? 0);
  const perTypeIsZero = whatsInc === 0 && instaInc === 0 && msgInc === 0;
  return ({
  id: r.id,
  nome: r.nome,
  valorMensal: Number(r.valor_mensal ?? 0),
  valorSetup: Number(r.valor_setup ?? 0),
  canaisInclusos,
  usuariosInclusos: Number(r.usuarios_inclusos ?? 3),
  contatosInclusos: Number(r.contatos_inclusos ?? 500),
  canaisWhatsInclusos: perTypeIsZero ? canaisInclusos : whatsInc,
  canaisInstaInclusos: instaInc,
  canaisMessengerInclusos: msgInc,
  incluiIA: Boolean(r.inclui_ia),
  incluiAsaas: Boolean(r.inclui_asaas),
  incluiZapi: Number(r.inclui_zapi ?? 0),
  incluiTranscricao: Boolean(r.inclui_transcricao),
  licencaBase: Number(r.licenca_base ?? 149.90),
  precoCanaisExc: Number(r.preco_canais_exc ?? 29.90),
  precoUsuariosExc: Number(r.preco_usuarios_exc ?? 19.90),
  precoContatosExc: Number(r.preco_contatos_exc ?? 0.045),
  precoIA: Number(r.preco_ia ?? 50.00),
  precoAsaas: Number(r.preco_asaas ?? 49.50),
  precoZapi: Number(r.preco_zapi ?? 69.00),
  precoTranscricaoUser: Number(r.preco_transcricao_user ?? 3.99),
  precoCanalWhatsExc: Number(r.preco_canal_whats_exc ?? r.preco_canais_exc ?? 29.90),
  precoCanalInstaExc: Number(r.preco_canal_insta_exc ?? r.preco_canais_exc ?? 29.90),
  precoCanalMessengerExc: Number(r.preco_canal_messenger_exc ?? r.preco_canais_exc ?? 29.90),
  valorCanaisExc: Number(r.valor_canais_exc ?? 59.90),
  valorUsuariosExc: Number(r.valor_usuarios_exc ?? 39.90),
  valorContatosExc: Number(r.valor_contatos_exc ?? 0.10),
  valorIA: Number(r.valor_ia ?? 99.00),
  valorAsaas: Number(r.valor_asaas ?? 89.00),
  valorZapi: Number(r.valor_zapi ?? 149.00),
  valorTranscricaoUser: Number(r.valor_transcricao_user ?? 7.99),
  valorCanalWhatsExc: Number(r.valor_canal_whats_exc ?? r.valor_canais_exc ?? 59.90),
  valorCanalInstaExc: Number(r.valor_canal_insta_exc ?? r.valor_canais_exc ?? 59.90),
  valorCanalMessengerExc: Number(r.valor_canal_messenger_exc ?? r.valor_canais_exc ?? 59.90),
  parceiroIds: r.parceiro_ids ?? [],
  observacao: r.observacao || "",
  diaVencimento: r.dia_vencimento != null ? Number(r.dia_vencimento) : null,
});
};

const mapParceiroToDb = (p: Parceiro) => ({
  id: p.id,
  nome: p.nome,
  email: p.email,
  celular: p.celular,
  planos_vinculados: p.planosVinculados,
  observacao: p.observacao
});

const mapDbToParceiro = (r: any): Parceiro => ({
  id: r.id,
  nome: r.nome,
  email: r.email || "",
  celular: r.celular || "",
  planosVinculados: r.planos_vinculados || [],
  observacao: r.observacao || "",
  criadoEm: r.criado_em ? new Date(r.criado_em).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
});

const mapClienteToDb = (c: Cliente) => ({
  id: c.id,
  nome: c.nome,
  plano_id: c.planoId,
  parceiro_id: c.parceiroId,
  data_inicio: c.dataInicio,
  data_vencimento: c.dataVencimento,
  data_churn: c.dataChurn,
  apps: c.apps,
  mau: c.mau,
  canais: c.canais,
  canais_zapi: c.canaisZapi,
  canais_whats: c.canaisWhats || 0,
  canais_insta: c.canaisInsta || 0,
  canais_messenger: c.canaisMessenger || 0,
  usuarios_ativos: c.usuariosAtivos,
  contatos_ativos: c.contatosAtivos,
  agentes_ia: c.agentesIA,
  asaas: c.asaas,
  zapi: c.zapi,
  transcricao_ia: c.transcricaoIA,
  valor_setup_pago: c.valorSetupPago,
  valor_acompanhamento: c.valorAcompanhamento,
  extras: c.extras || {},
  observacao: c.observacao
});

const mapDbToCliente = (r: any): Cliente => ({
  id: r.id,
  nome: r.nome,
  planoId: r.plano_id || null,
  parceiroId: r.parceiro_id || null,
  dataInicio: r.data_inicio,
  dataVencimento: r.data_vencimento || null,
  dataChurn: r.data_churn || null,
  apps: Number(r.apps ?? 0),
  mau: Number(r.mau ?? 0),
  canais: Number(r.canais ?? 1),
  canaisZapi: Number(r.canais_zapi ?? 0),
  canaisWhats: Number(r.canais_whats ?? 0),
  canaisInsta: Number(r.canais_insta ?? 0),
  canaisMessenger: Number(r.canais_messenger ?? 0),
  usuariosAtivos: Number(r.usuarios_ativos ?? 3),
  contatosAtivos: Number(r.contatos_ativos ?? 500),
  agentesIA: Boolean(r.agentes_ia),
  asaas: Boolean(r.asaas),
  zapi: Boolean(r.zapi),
  transcricaoIA: Boolean(r.transcricao_ia),
  valorSetupPago: Number(r.valor_setup_pago ?? 0),
  valorAcompanhamento: Number(r.valor_acompanhamento ?? 0),
  extras: r.extras || {},
  observacao: r.observacao || ""
});

const mapDbToMovimento = (r: any): Movimento => ({
  id: r.id,
  clienteId: r.cliente_id,
  data: r.data,
  tipo: r.tipo as TipoMovimento,
  planoId: r.plano_id,
  apps: r.apps,
  mau: r.mau,
  canais: r.canais,
  canaisWhats: r.canais_whats,
  canaisInsta: r.canais_insta,
  canaisMessenger: r.canais_messenger,
  canaisZapi: r.canais_zapi,
  usuariosAtivos: r.usuarios_ativos,
  contatosAtivos: r.contatos_ativos,
  agentesIA: r.agentes_ia,
  asaas: r.asaas,
  zapi: r.zapi,
  transcricaoIA: r.transcricao_ia,
  extras: r.extras,
  valorServico: r.valor_servico,
  observacao: r.observacao,
});

const mapFinanceiroToDb = (l: LancamentoFinanceiro) => ({
  id: l.id,
  descricao: l.descricao,
  tipo: l.tipo,
  categoria: l.categoria || null,
  valor: l.valor,
  vencimento: l.vencimento || null,
  competencia: l.competencia || null,
  status: l.status,
  nf_emitida: l.nfEmitida,
  nf_numero: l.nfNumero || null,
  observacao: l.observacao || null,
});

const mapDbToFinanceiro = (r: any): LancamentoFinanceiro => ({
  id: r.id,
  descricao: r.descricao,
  tipo: (r.tipo as any) ?? "custo",
  categoria: r.categoria || undefined,
  valor: Number(r.valor ?? 0),
  vencimento: r.vencimento || null,
  competencia: r.competencia || null,
  status: (r.status as any) ?? "pendente",
  nfEmitida: Boolean(r.nf_emitida),
  nfNumero: r.nf_numero || undefined,
  observacao: r.observacao || undefined,
  criadoEm: r.created_at ?? undefined,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      custos: defaultCustos,
      planos: defaultPlanos,
      clientes: [],
      movimentos: [],
      parceiros: [],
      financeiro: [],

      // Sincronização assíncrona
      syncFromSupabase: async () => {
        try {
          const [planosRes, parceirosRes, clientesRes, movimentosRes, finRes] = await Promise.all([
            supabase.from("elora_planos").select("*"),
            supabase.from("elora_parceiros").select("*"),
            supabase.from("elora_clientes").select("*"),
            supabase.from("elora_movimentos").select("*"),
            (supabase as any).from("elora_financeiro").select("*"),
          ]);

          if (planosRes.data && planosRes.data.length > 0) {
            set({ planos: planosRes.data.map(mapDbToPlano) });
          }
          if (parceirosRes.data) {
            set({ parceiros: parceirosRes.data.map(mapDbToParceiro) });
          }
          if (clientesRes.data) {
            set({ clientes: clientesRes.data.map(mapDbToCliente) });
          }
          if (movimentosRes.data) {
            set({ movimentos: movimentosRes.data.map(mapDbToMovimento) });
          }
          if (finRes?.data) {
            set({ financeiro: finRes.data.map(mapDbToFinanceiro) });
          }
        } catch (e) {
          console.error("Erro ao carregar dados do Supabase:", e);
        }
      },

      // Custos
      addCusto: (c) => set({ custos: [...get().custos, { ...c, id: uid() }] }),
      updateCusto: (id, c) =>
        set({ custos: get().custos.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      removeCusto: (id) => set({ custos: get().custos.filter((x) => x.id !== id) }),

      // Planos
      addPlano: (p) => {
        const id = uid();
        const novoPlano = { ...p, id };
        set({ planos: [...get().planos, novoPlano] });
        supabase.from("elora_planos").insert(mapPlanoToDb(novoPlano)).then(({ error }) => {
          if (error) console.error("Erro ao salvar plano no Supabase:", error);
        });
      },
      updatePlano: (id, p) => {
        const oldPlano = get().planos.find((x) => x.id === id);
        const planos = get().planos.map((x) => (x.id === id ? { ...x, ...p } : x));
        set({ planos });
        const updated = planos.find((x) => x.id === id);
        if (updated) {
          supabase.from("elora_planos").update(mapPlanoToDb(updated)).eq("id", id).then(({ error }) => {
            if (error) console.error("Erro ao atualizar plano no Supabase:", error);
          });

          // Os valores do cliente são recalculados automaticamente a partir
          // das novas configurações do plano — nenhum movimento de ajuste
          // é registrado para evitar poluir o histórico.
          void oldPlano;
        }
      },
      removePlano: (id) => {
        set({ planos: get().planos.filter((x) => x.id !== id) });
        supabase.from("elora_planos").delete().eq("id", id).then(({ error }) => {
          if (error) console.error("Erro ao remover plano no Supabase:", error);
        });
      },

      // Clientes
      addCliente: (c) => {
        const id = uid();
        const novoCliente = {
          ...c,
          id,
          dataVencimento: normalizarDataVencimento(c.dataInicio, c.dataVencimento),
        };
        set({ clientes: [...get().clientes, novoCliente] });

        // Salvar no Supabase
        supabase.from("elora_clientes").insert(mapClienteToDb(novoCliente)).then(({ error }) => {
          if (error) {
            console.error("Erro ao salvar cliente no Supabase:", error);
            set({
              clientes: get().clientes.filter((x) => x.id !== id),
              movimentos: get().movimentos.filter((m) => m.clienteId !== id),
            });
          }
        });

        set({
          movimentos: [
            ...get().movimentos,
            {
              id: uid(),
              clienteId: id,
              data: c.dataInicio,
              tipo: "setup",
              planoId: c.planoId,
              canais: c.canais,
              usuariosAtivos: c.usuariosAtivos,
              contatosAtivos: c.contatosAtivos,
              extras: c.extras,
            },
          ],
        });
        return id;
      },
      updateCliente: (id, c) => {
        const clientes = get().clientes.map((x) => {
          if (x.id !== id) return x;
          const merged = { ...x, ...c };
          return {
            ...merged,
            dataVencimento: normalizarDataVencimento(merged.dataInicio, merged.dataVencimento),
          };
        });
        set({ clientes });
        const updated = clientes.find((x) => x.id === id);
        if (updated) {
          supabase.from("elora_clientes").update(mapClienteToDb(updated)).eq("id", id).then(({ error }) => {
            if (error) console.error("Erro ao atualizar cliente no Supabase:", error);
          });
        }
      },
      removeCliente: (id) => {
        set({
          clientes: get().clientes.filter((x) => x.id !== id),
          movimentos: get().movimentos.filter((m) => m.clienteId !== id),
        });
        supabase.from("elora_clientes").delete().eq("id", id).then(({ error }) => {
          if (error) console.error("Erro ao remover cliente no Supabase:", error);
        });
      },

      // Movimentos (Locais)
      addMovimento: (m) => {
        const mov = { ...m, id: uid() };
        set({ movimentos: [...get().movimentos, mov] });
        
        // Salvar no Supabase
        const dbMov = {
          id: mov.id,
          cliente_id: mov.clienteId,
          data: mov.data,
          tipo: mov.tipo,
          plano_id: mov.planoId || null,
          apps: mov.apps || null,
          mau: mov.mau || null,
          canais: mov.canais || null,
          canais_whats: mov.canaisWhats ?? null,
          canais_insta: mov.canaisInsta ?? null,
          canais_messenger: mov.canaisMessenger ?? null,
          canais_zapi: mov.canaisZapi ?? null,
          usuarios_ativos: mov.usuariosAtivos || null,
          contatos_ativos: mov.contatosAtivos || null,
          agentes_ia: mov.agentesIA || null,
          asaas: mov.asaas || null,
          zapi: mov.zapi || null,
          transcricao_ia: mov.transcricaoIA || null,
          extras: mov.extras || null,
          valor_servico: mov.valorServico || null,
          observacao: mov.observacao || null,
        };
        supabase.from("elora_movimentos").insert(dbMov).then(({ error }) => {
          if (error) console.error("Erro ao inserir movimento no Supabase:", error);
        });

        const cliente = get().clientes.find((c) => c.id === m.clienteId);
        if (cliente) {
          const patch: Partial<Cliente> = {};
          if (m.tipo === "churn") patch.dataChurn = m.data;
          if (m.planoId !== undefined && m.planoId !== null) patch.planoId = m.planoId;

          // Upgrade/Downgrade: campos numéricos são DELTAS (ex.: -1, +2),
          // somados ao valor atual do cliente. Booleanos representam o estado final.
          // Setup: valores numéricos são absolutos (substituem o valor atual).
          const isDelta = m.tipo === "upgrade" || m.tipo === "downgrade";
          const applyNum = (cur: number | undefined, val: number | undefined) => {
            if (val === undefined) return undefined;
            if (isDelta) return Math.max(0, (cur ?? 0) + val);
            return val;
          };
          const newCanais = applyNum(cliente.canais, m.canais);
          if (newCanais !== undefined) patch.canais = newCanais;
          const newWhats = applyNum(cliente.canaisWhats, m.canaisWhats);
          if (newWhats !== undefined) patch.canaisWhats = newWhats;
          const newInsta = applyNum(cliente.canaisInsta, m.canaisInsta);
          if (newInsta !== undefined) patch.canaisInsta = newInsta;
          const newMsg = applyNum(cliente.canaisMessenger, m.canaisMessenger);
          if (newMsg !== undefined) patch.canaisMessenger = newMsg;
          const newZapi = applyNum(cliente.canaisZapi, m.canaisZapi);
          if (newZapi !== undefined) {
            patch.canaisZapi = newZapi;
            patch.zapi = newZapi > 0;
          }
          const newUsers = applyNum(cliente.usuariosAtivos, m.usuariosAtivos);
          if (newUsers !== undefined) patch.usuariosAtivos = newUsers;
          const newCont = applyNum(cliente.contatosAtivos, m.contatosAtivos);
          if (newCont !== undefined) patch.contatosAtivos = newCont;
          if (m.apps !== undefined) patch.apps = isDelta ? Math.max(0, (cliente.apps ?? 0) + m.apps) : m.apps;
          if (m.mau !== undefined) patch.mau = isDelta ? Math.max(0, (cliente.mau ?? 0) + m.mau) : m.mau;
          if (m.agentesIA !== undefined) patch.agentesIA = m.agentesIA;
          if (m.asaas !== undefined) patch.asaas = m.asaas;
          if (m.zapi !== undefined) patch.zapi = m.zapi;
          if (m.transcricaoIA !== undefined) patch.transcricaoIA = m.transcricaoIA;
          if (m.extras !== undefined) patch.extras = m.extras;
          if (Object.keys(patch).length) {
            const updatedCliente = { ...cliente, ...patch };
            set({
              clientes: get().clientes.map((c) =>
                c.id === m.clienteId ? updatedCliente : c,
              ),
            });
            // Sincronizar atualização de cliente pós-movimento no Supabase
            supabase.from("elora_clientes").update(mapClienteToDb(updatedCliente)).eq("id", m.clienteId).then(({ error }) => {
              if (error) console.error("Erro ao sincronizar cliente pós-movimento:", error);
            });
          }
        }
      },
      removeMovimento: (id) => {
        const old = get().movimentos.find((m) => m.id === id);
        if (!old) return;
        // Reverte deltas no cliente quando o movimento for upgrade/downgrade
        if (old.tipo === "upgrade" || old.tipo === "downgrade") {
          const cliente = get().clientes.find((c) => c.id === old.clienteId);
          if (cliente) {
            const rev = (cur: number | undefined, val: number | null | undefined) => {
              if (val === undefined || val === null) return cur;
              return Math.max(0, (cur ?? 0) - val);
            };
            const patch: Partial<Cliente> = {};
            const nWhats = rev(cliente.canaisWhats, old.canaisWhats);
            if (nWhats !== undefined && nWhats !== cliente.canaisWhats) patch.canaisWhats = nWhats;
            const nInsta = rev(cliente.canaisInsta, old.canaisInsta);
            if (nInsta !== undefined && nInsta !== cliente.canaisInsta) patch.canaisInsta = nInsta;
            const nMsg = rev(cliente.canaisMessenger, old.canaisMessenger);
            if (nMsg !== undefined && nMsg !== cliente.canaisMessenger) patch.canaisMessenger = nMsg;
            const nZapi = rev(cliente.canaisZapi, old.canaisZapi);
            if (nZapi !== undefined && nZapi !== cliente.canaisZapi) {
              patch.canaisZapi = nZapi;
              patch.zapi = nZapi > 0;
            }
            const nUsers = rev(cliente.usuariosAtivos, old.usuariosAtivos);
            if (nUsers !== undefined && nUsers !== cliente.usuariosAtivos) patch.usuariosAtivos = nUsers;
            const nCont = rev(cliente.contatosAtivos, old.contatosAtivos);
            if (nCont !== undefined && nCont !== cliente.contatosAtivos) patch.contatosAtivos = nCont;
            const nCanais = rev(cliente.canais, old.canais);
            if (nCanais !== undefined && nCanais !== cliente.canais) patch.canais = nCanais;
            if (Object.keys(patch).length) {
              const updated = { ...cliente, ...patch } as Cliente;
              set({ clientes: get().clientes.map((c) => (c.id === cliente.id ? updated : c)) });
              supabase.from("elora_clientes").update(mapClienteToDb(updated)).eq("id", cliente.id).then(({ error }) => {
                if (error) console.error("Erro ao reverter cliente após remover movimento:", error);
              });
            }
          }
        }
        set({ movimentos: get().movimentos.filter((m) => m.id !== id) });
        supabase.from("elora_movimentos").delete().eq("id", id).then(({ error }) => {
          if (error) console.error("Erro ao remover movimento no Supabase:", error);
        });
      },

      // Parceiros
      addParceiro: (p) => {
        const id = uid();
        const criadoEm = new Date().toISOString().slice(0, 10);
        const novoParceiro = { ...p, id, criadoEm };
        set({ parceiros: [...get().parceiros, novoParceiro] });
        supabase.from("elora_parceiros").insert(mapParceiroToDb(novoParceiro)).then(({ error }) => {
          if (error) console.error("Erro ao salvar parceiro no Supabase:", error);
        });
      },
      updateParceiro: (id, p) => {
        const parceiros = get().parceiros.map((x) => (x.id === id ? { ...x, ...p } : x));
        set({ parceiros });
        const updated = parceiros.find((x) => x.id === id);
        if (updated) {
          supabase.from("elora_parceiros").update(mapParceiroToDb(updated)).eq("id", id).then(({ error }) => {
            if (error) console.error("Erro ao atualizar parceiro no Supabase:", error);
          });
        }
      },
      removeParceiro: (id) => {
        set({ parceiros: get().parceiros.filter((x) => x.id !== id) });
        supabase.from("elora_parceiros").delete().eq("id", id).then(({ error }) => {
          if (error) console.error("Erro ao remover parceiro no Supabase:", error);
        });
      },

      // Financeiro
      addLancamento: (l) => {
        const id = uid();
        const novo: LancamentoFinanceiro = { ...l, id };
        set({ financeiro: [...get().financeiro, novo] });
        (supabase as any).from("elora_financeiro").insert(mapFinanceiroToDb(novo)).then(({ error }: any) => {
          if (error) console.error("Erro ao salvar lançamento financeiro:", error);
        });
        return id;
      },
      updateLancamento: (id, l) => {
        const financeiro = get().financeiro.map((x) => (x.id === id ? { ...x, ...l } : x));
        set({ financeiro });
        const updated = financeiro.find((x) => x.id === id);
        if (updated) {
          (supabase as any).from("elora_financeiro").update(mapFinanceiroToDb(updated)).eq("id", id).then(({ error }: any) => {
            if (error) console.error("Erro ao atualizar lançamento financeiro:", error);
          });
        }
      },
      removeLancamento: (id) => {
        set({ financeiro: get().financeiro.filter((x) => x.id !== id) });
        (supabase as any).from("elora_financeiro").delete().eq("id", id).then(({ error }: any) => {
          if (error) console.error("Erro ao remover lançamento financeiro:", error);
        });
      },

      resetAll: () => {
        set({ custos: defaultCustos, planos: defaultPlanos, clientes: [], movimentos: [], parceiros: [] });
        // Limpar nuvem
        Promise.all([
          supabase.from("elora_planos").delete().neq("id", ""),
          supabase.from("elora_clientes").delete().neq("id", ""),
          supabase.from("elora_parceiros").delete().neq("id", ""),
        ]).then(() => {
          // Re-salvar defaultPlanos
          defaultPlanos.forEach(p => {
            supabase.from("elora_planos").insert(mapPlanoToDb(p));
          });
        });
      },
      seedDemo: () => {
        const planos = get().planos;
        const p = planos[1] ?? planos[0];
        if (!p) return;
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const id = uid();
        const demoCliente: Cliente = {
          id,
          nome: "Clínica Demo",
          planoId: p.id,
          dataInicio: sixMonthsAgo.toISOString().slice(0, 10),
          dataVencimento: null,
          dataChurn: null,
          apps: 2,
          mau: 1500,
          canais: 1,
          canaisZapi: 0,
          usuariosAtivos: 3,
          contatosAtivos: 1500,
          agentesIA: false,
          asaas: false,
          zapi: false,
          transcricaoIA: false,
          valorSetupPago: 0,
          valorAcompanhamento: 0,
          extras: {},
        };
        set({
          clientes: [...get().clientes, demoCliente],
          movimentos: [
            ...get().movimentos,
            {
              id: uid(),
              clienteId: id,
              data: sixMonthsAgo.toISOString().slice(0, 10),
              tipo: "setup",
              planoId: p.id,
              apps: 2,
              mau: 1500,
            },
          ],
        });
        supabase.from("elora_clientes").insert(mapClienteToDb(demoCliente));
      },
    }),
    { name: "elora-control-v1" },
  ),
);

// ===== Helpers de cálculo =====

export function calcularCustoExtraCanaisHelena(excedentes: number, precoCanaisExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;
  for (let i = 1; i <= excedentes; i++) {
    if (i <= 4) {
      totalCost += precoCanaisExc;
    } else {
      totalCost += 19.90;
    }
  }
  return totalCost;
}

export function calcularCustoExtraUsuariosHelena(excedentes: number, precoUsuariosExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;
  for (let i = 1; i <= excedentes; i++) {
    if (i <= 17) {
      totalCost += precoUsuariosExc;
    } else if (i <= 97) {
      totalCost += 14.90;
    } else {
      totalCost += 12.90;
    }
  }
  return totalCost;
}

export function calcularCustoExtraContatosHelena(excedentes: number, precoContatosExc: number): number {
  if (excedentes <= 0) return 0;
  let totalCost = 0;
  
  const start = 5000;
  const end = 5000 + excedentes;
  
  const calculateForRange = (rStart: number, rEnd: number, rate: number) => {
    const overlapStart = Math.max(start, rStart);
    const overlapEnd = Math.min(end, rEnd);
    if (overlapStart < overlapEnd) {
      return (overlapEnd - overlapStart) * rate;
    }
    return 0;
  };
  
  totalCost += calculateForRange(5000, 20000, precoContatosExc);
  totalCost += calculateForRange(20000, 100000, 0.035);
  totalCost += calculateForRange(100000, Infinity, 0.025);
  
  return totalCost;
}

export function receitaMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;

  const valorCanalWhatsExc = plano.valorCanalWhatsExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalInstaExc = plano.valorCanalInstaExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalMessengerExc = plano.valorCanalMessengerExc ?? plano.valorCanaisExc ?? 59.90;
  const valorUsuariosExc = plano.valorUsuariosExc ?? 39.90;
  const valorContatosExc = plano.valorContatosExc ?? 0.10;
  const valorIA = plano.valorIA ?? 99.00;
  const valorAsaas = plano.valorAsaas ?? 89.00;
  const valorZapi = plano.valorZapi ?? 149.00;
  const valorTranscricaoUser = plano.valorTranscricaoUser ?? 7.99;

  let total = plano.valorMensal + (cliente.valorAcompanhamento || 0);

  // Derive channel counts
  const canaisWhats = cliente.canaisWhats !== undefined ? cliente.canaisWhats : (cliente.canaisZapi || (cliente.zapi ? 1 : 0));
  const canaisInsta = cliente.canaisInsta || 0;
  const canaisMessenger = cliente.canaisMessenger || 0;

  // Canais extras por tipo
  const excWhats = Math.max(0, canaisWhats - (plano.canaisWhatsInclusos || 0));
  const excInsta = Math.max(0, canaisInsta - (plano.canaisInstaInclusos || 0));
  const excMessenger = Math.max(0, canaisMessenger - (plano.canaisMessengerInclusos || 0));
  total += excWhats * valorCanalWhatsExc;
  total += excInsta * valorCanalInstaExc;
  total += excMessenger * valorCanalMessengerExc;

  // Usuários extras
  const usersExc = Math.max(0, (cliente.usuariosAtivos || 0) - (plano.usuariosInclusos || 3));
  total += usersExc * valorUsuariosExc;

  // Contatos extras
  const contatosExc = Math.max(0, (cliente.contatosAtivos || 0) - (plano.contatosInclusos || 500));
  total += contatosExc * valorContatosExc;

  // Opcionais (se marcados no cliente e NÃO estiverem inclusos no plano de graça)
  if (cliente.agentesIA && !plano.incluiIA) {
    total += valorIA;
  }
  if (cliente.asaas && !plano.incluiAsaas) {
    total += valorAsaas;
  }

  // Z-API (cobrado por canal configurado como Z-API excedente aos inclusos no plano)
  const zapiInclusos = typeof plano.incluiZapi === "number" ? plano.incluiZapi : (plano.incluiZapi ? 1 : 0);
  const canaisZapi = cliente.canaisZapi ?? 0;
  const qtdZapiCliente = canaisZapi > 0 ? Math.max(0, canaisZapi - zapiInclusos) : 0;
  total += qtdZapiCliente * valorZapi;

  // Transcrição IA
  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    total += (cliente.usuariosAtivos || 0) * valorTranscricaoUser;
  }

  return total;
}

export function custoMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;

  const licencaBase = plano.licencaBase ?? 149.90;
  const precoCanalWhatsExc = plano.precoCanalWhatsExc ?? plano.precoCanaisExc ?? 29.90;
  const precoCanalInstaExc = plano.precoCanalInstaExc ?? plano.precoCanaisExc ?? 29.90;
  const precoCanalMessengerExc = plano.precoCanalMessengerExc ?? plano.precoCanaisExc ?? 29.90;
  const precoUsuariosExc = plano.precoUsuariosExc ?? 19.90;
  const precoContatosExc = plano.precoContatosExc ?? 0.045;
  const precoIA = plano.precoIA ?? 50.00;
  const precoAsaas = plano.precoAsaas ?? 49.50;
  const precoZapi = plano.precoZapi ?? 69.00;
  const precoTranscricaoUser = plano.precoTranscricaoUser ?? 3.99;

  let total = licencaBase;

  // Derive channel counts
  const canaisWhats = cliente.canaisWhats !== undefined ? cliente.canaisWhats : (cliente.canaisZapi || (cliente.zapi ? 1 : 0));
  const canaisInsta = cliente.canaisInsta || 0;
  const canaisMessenger = cliente.canaisMessenger || 0;

  // Custo Helena por tipo de canal — usa franquia configurada no plano por tipo
  const excWhats = Math.max(0, canaisWhats - (plano.canaisWhatsInclusos || 0));
  const excInsta = Math.max(0, canaisInsta - (plano.canaisInstaInclusos || 0));
  const excMessenger = Math.max(0, canaisMessenger - (plano.canaisMessengerInclusos || 0));
  total += excWhats * precoCanalWhatsExc;
  total += excInsta * precoCanalInstaExc;
  total += excMessenger * precoCanalMessengerExc;

  // Usuários extras progressive
  const usersExc = Math.max(0, (cliente.usuariosAtivos || 0) - (plano.usuariosInclusos || 3));
  total += calcularCustoExtraUsuariosHelena(usersExc, precoUsuariosExc);

  // Contatos extras progressive
  const contatosExc = Math.max(0, (cliente.contatosAtivos || 0) - (plano.contatosInclusos || 500));
  total += calcularCustoExtraContatosHelena(contatosExc, precoContatosExc);

  // Opcionais (se marcados no cliente e NÃO estiverem inclusos no plano de graça)
  if (cliente.agentesIA && !plano.incluiIA) {
    total += precoIA;
  }
  if (cliente.asaas && !plano.incluiAsaas) {
    total += precoAsaas;
  }

  // Z-API (cobrado custo Helena cheio por canal ativo se Z-API estiver ativo no cliente)
  const qtdZapi = cliente.canaisZapi ?? 0;
  total += qtdZapi * precoZapi;

  // Transcrição IA
  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    total += (cliente.usuariosAtivos || 0) * precoTranscricaoUser;
  }

  return total;
}

export function clienteAtivoEm(cliente: Cliente, year: number, month: number): boolean {
  const fimMes = new Date(year, month + 1, 0);
  const inicioMes = new Date(year, month, 1);
  const inicio = new Date(cliente.dataInicio);
  if (inicio > fimMes) return false;
  if (cliente.dataChurn) {
    const churn = new Date(cliente.dataChurn);
    if (churn < inicioMes) return false;
  }
  return true;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_ONLY_RE = /^\d{1,2}$/;

function toLocalNoonDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clampBillingDay(year: number, month: number, day: number): number {
  return Math.max(1, Math.min(day, new Date(year, month + 1, 0).getDate()));
}

export function parseDiaVencimento(value?: string | null): number | null {
  if (!value) return null;
  if (DAY_ONLY_RE.test(value)) {
    const dia = Number(value);
    return Number.isFinite(dia) ? Math.max(1, Math.min(dia, 31)) : null;
  }
  if (ISO_DATE_RE.test(value)) {
    return Number(value.slice(8, 10));
  }
  return null;
}

export function formatDiaVencimento(value?: string | null): string {
  const dia = parseDiaVencimento(value);
  return dia ? String(dia) : "—";
}

// Retorna o dia de vencimento efetivo: cliente sobrescreve plano.
export function getDiaVencimentoEfetivo(
  cliente: Cliente,
  planos: Plano[],
): number | null {
  const doCliente = parseDiaVencimento(cliente.dataVencimento);
  if (doCliente) return doCliente;
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (plano?.diaVencimento) {
    return Math.max(1, Math.min(plano.diaVencimento, 31));
  }
  return null;
}

export function normalizarDataVencimento(dataInicio: string, dataVencimento?: string | null): string | null {
  if (!ISO_DATE_RE.test(dataInicio)) return null;
  if (dataVencimento && ISO_DATE_RE.test(dataVencimento)) return dataVencimento;

  const inicio = toLocalNoonDate(dataInicio);
  const diaReferencia = parseDiaVencimento(dataVencimento) ?? inicio.getDate();

  let year = inicio.getFullYear();
  let month = inicio.getMonth();
  let candidato = new Date(year, month, clampBillingDay(year, month, diaReferencia), 12);

  if (candidato < inicio) {
    month += 1;
    candidato = new Date(year, month, clampBillingDay(year, month, diaReferencia), 12);
  }

  return formatIsoDate(candidato);
}

export function obterVencimentoDaCompetencia(cliente: Cliente, year: number, month: number): string | null {
  const primeiroVencimento = normalizarDataVencimento(cliente.dataInicio, cliente.dataVencimento);
  const diaVencimento = parseDiaVencimento(primeiroVencimento);

  if (!primeiroVencimento || !diaVencimento) return null;

  const primeiraCobranca = toLocalNoonDate(primeiroVencimento);
  const cobrancaCompetencia = new Date(year, month, clampBillingDay(year, month, diaVencimento), 12);

  if (cobrancaCompetencia < primeiraCobranca) return null;

  if (cliente.dataChurn && ISO_DATE_RE.test(cliente.dataChurn)) {
    const churn = toLocalNoonDate(cliente.dataChurn);
    // Regra: se o cliente esteve ativo em ao menos um dia do ciclo de
    // faturamento anterior (entre o vencimento anterior e o atual), ainda
    // cobramos esta competência como cobrança de encerramento.
    const vencimentoAnterior = new Date(year, month - 1, clampBillingDay(year, month - 1, diaVencimento), 12);
    if (churn < vencimentoAnterior) return null;
  }

  return formatIsoDate(cobrancaCompetencia);
}

// Reconstrói o estado do cliente como ele estava em uma data específica,
// revertendo movimentos posteriores (upgrade/downgrade são deltas numéricos).
// Booleanos e troca de plano não são totalmente reversíveis — mantemos o
// valor atual como aproximação.
export function clienteSnapshotAt(
  cliente: Cliente,
  movimentos: Movimento[],
  atIso: string,
): Cliente {
  const snap: Cliente = { ...cliente };
  const future = movimentos
    .filter((m) => m.clienteId === cliente.id && m.data > atIso)
    .sort((a, b) => b.data.localeCompare(a.data));

  for (const m of future) {
    if (m.tipo === "upgrade" || m.tipo === "downgrade") {
      const rev = (cur: number | undefined, val: number | null | undefined) => {
        if (val === undefined || val === null) return cur;
        return Math.max(0, (cur ?? 0) - val);
      };
      snap.canais = rev(snap.canais, m.canais) ?? snap.canais;
      snap.canaisWhats = rev(snap.canaisWhats, m.canaisWhats);
      snap.canaisInsta = rev(snap.canaisInsta, m.canaisInsta);
      snap.canaisMessenger = rev(snap.canaisMessenger, m.canaisMessenger);
      snap.canaisZapi = rev(snap.canaisZapi, m.canaisZapi) ?? snap.canaisZapi;
      snap.usuariosAtivos = rev(snap.usuariosAtivos, m.usuariosAtivos) ?? snap.usuariosAtivos;
      snap.contatosAtivos = rev(snap.contatosAtivos, m.contatosAtivos) ?? snap.contatosAtivos;
      snap.apps = rev(snap.apps, m.apps) ?? snap.apps;
      snap.mau = rev(snap.mau, m.mau) ?? snap.mau;
    } else if (m.tipo === "churn") {
      snap.dataChurn = null;
    }
  }
  return snap;
}

export function receitaMensalClienteEm(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
  movimentos: Movimento[],
  year: number,
  month: number,
): number {
  const vencimento = obterVencimentoDaCompetencia(cliente, year, month);
  if (!vencimento) return 0;
  const snap = clienteSnapshotAt(cliente, movimentos, vencimento);
  return receitaMensalCliente(snap, planos, custos);
}

export function clienteFaturaEm(cliente: Cliente, year: number, month: number): boolean {
  return Boolean(obterVencimentoDaCompetencia(cliente, year, month));
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ===== Lógica de Custos Helena (White Label) =====

export function calcularCustoBrutoHelena(clientesAtivos: Cliente[]): number {
  if (clientesAtivos.length === 0) return 0;

  // 1. CONTA BASE (149,90 por conta ativa)
  const custoBase = clientesAtivos.length * 149.90;

  // Excedentes agregados globais
  let canaisExcedentesTotais = 0;
  let usuariosExcedentesTotais = 0;
  let contatosExcedentesTotais = 0;
  
  let custoOpcionais = 0;

  for (const c of clientesAtivos) {
    // Derive channel counts
    const canaisWhats = c.canaisWhats !== undefined ? c.canaisWhats : (c.canaisZapi || (c.zapi ? 1 : 0));
    const canaisInsta = c.canaisInsta || 0;
    const canaisMessenger = c.canaisMessenger || 0;

    // Up to 1 of each is free per account
    const excWhats = Math.max(0, canaisWhats - 1);
    const excInsta = Math.max(0, canaisInsta - 1);
    const excMessenger = Math.max(0, canaisMessenger - 1);
    
    canaisExcedentesTotais += (excWhats + excInsta + excMessenger);
    
    // Users exceeding 3
    usuariosExcedentesTotais += Math.max(0, (c.usuariosAtivos || 0) - 3);
    
    // Contacts exceeding 500
    contatosExcedentesTotais += Math.max(0, (c.contatosAtivos || 0) - 500);

    // 6. OPCIONAIS E APPS
    if (c.agentesIA) custoOpcionais += 50.00;
    if (c.asaas) custoOpcionais += 49.50;
    
    // Z-API
    const qtdZapi = Math.max(canaisWhats, (c.zapi ? 1 : 0));
    custoOpcionais += qtdZapi * 69.00;

    if (c.transcricaoIA) custoOpcionais += (c.usuariosAtivos || 0) * 3.99;
  }

  // 2. CANAIS ADICIONAIS (utilizando helper progressivo)
  const custoCanais = calcularCustoExtraCanaisHelena(canaisExcedentesTotais, 29.90);

  // 3. USUÁRIOS ADICIONAIS (utilizando helper progressivo)
  const custoUsuarios = calcularCustoExtraUsuariosHelena(usuariosExcedentesTotais, 19.90);

  // 4. INFRAESTRUTURA / CONTATOS ATIVOS (utilizando helper progressivo)
  const custoInfra = calcularCustoExtraContatosHelena(contatosExcedentesTotais, 0.045);

  return custoBase + custoCanais + custoUsuarios + custoInfra + custoOpcionais;
}

export function calcularDescontoEscalaHelena(custoBruto: number): number {
  let desconto = 0;
  
  if (custoBruto > 10000) {
    const faixa1 = Math.min(custoBruto, 25000) - 10000;
    desconto += faixa1 * 0.10;
  }
  
  if (custoBruto > 25000) {
    const faixa2 = Math.min(custoBruto, 50000) - 25000;
    desconto += faixa2 * 0.15;
  }
  
  if (custoBruto > 50000) {
    const faixa3 = Math.min(custoBruto, 100000) - 50000;
    desconto += faixa3 * 0.20;
  }
  
  if (custoBruto > 100000) {
    const faixa4 = custoBruto - 100000;
    desconto += faixa4 * 0.25;
  }

  return desconto;
}

export function calcularCustoLiquidoHelena(clientesAtivos: Cliente[]): number {
  const bruto = calcularCustoBrutoHelena(clientesAtivos);
  const desconto = calcularDescontoEscalaHelena(bruto);
  return bruto - desconto;
}

export function receitaMensalTotal(clientesAtivos: Cliente[], planos: Plano[], custos: CustoBase[]): number {
  return clientesAtivos.reduce((acc, c) => acc + receitaMensalCliente(c, planos, custos), 0);
}

// Receita do "sistema": exclui o componente comercial recorrente
// (Acompanhamento) — usada para calcular o lucro sobre o sistema.
export function receitaSistemaCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  return receitaMensalCliente(cliente, planos, custos) - (cliente.valorAcompanhamento || 0);
}

export function receitaSistemaTotal(
  clientesAtivos: Cliente[],
  planos: Plano[],
  custos: CustoBase[],
): number {
  return clientesAtivos.reduce((acc, c) => acc + receitaSistemaCliente(c, planos, custos), 0);
}

// Faturamento acumulado de um cliente desde o setup até hoje (ou churn):
// soma todas as competências faturadas + setup pago + serviços avulsos.
export function faturamentoAcumuladoCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
  movimentos: Movimento[],
): number {
  if (!cliente.dataInicio) return 0;
  const inicio = new Date(cliente.dataInicio);
  const hoje = new Date();
  const fim = cliente.dataChurn ? new Date(cliente.dataChurn) : hoje;
  let total = cliente.valorSetupPago || 0;
  // serviços avulsos do cliente
  for (const mv of movimentos) {
    if (mv.clienteId === cliente.id && mv.tipo === "servico" && mv.valorServico) {
      total += mv.valorServico;
    }
  }
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth() + 1, 1);
  while (cursor < limite) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    if (clienteFaturaEm(cliente, y, m)) {
      total += receitaMensalClienteEm(cliente, planos, custos, movimentos, y, m);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
}