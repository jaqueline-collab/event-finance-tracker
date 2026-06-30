import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cliente, CustoBase, Desconto, LancamentoFinanceiro, Movimento, Parceiro, Plano } from "./types";
import { supabase } from "@/integrations/supabase/client";
import {
  mapPlanoToDb,
  mapDbToPlano,
  mapParceiroToDb,
  mapDbToParceiro,
  mapClienteToDb,
  mapDbToCliente,
  mapDbToMovimento,
  mapFinanceiroToDb,
  mapDbToFinanceiro,
  mapDescontoToDb,
  mapDbToDesconto,
} from "./mappers";
import { normalizarDataVencimento } from "./calc/datas";

// Re-exports para retro-compatibilidade dos consumidores que importam de @/lib/store.
export { formatBRL } from "./calc/format";
export {
  parseDiaVencimento,
  formatDiaVencimento,
  getDiaVencimentoEfetivo,
  normalizarDataVencimento,
  obterVencimentoDaCompetencia,
  clienteAtivoEm,
  clienteSnapshotAt,
} from "./calc/datas";
export { getCicloCliente } from "./calc/ciclo";
export {
  calcularCustoExtraCanaisHelena,
  calcularCustoExtraUsuariosHelena,
  calcularCustoExtraContatosHelena,
  calcularCustoBrutoHelena,
  calcularDescontoEscalaHelena,
  calcularCustoLiquidoHelena,
} from "./calc/helena";
export {
  receitaMensalCliente,
  receitaMensalClienteEm,
  receitaCicloCliente,
  clienteFaturaEm,
  receitaMensalTotal,
  receitaSistemaCliente,
  receitaSistemaTotal,
  faturamentoAcumuladoCliente,
} from "./calc/receita";
export { custoMensalCliente } from "./calc/custo";
export {
  descontosAplicaveis,
  calcularDesconto,
  descreverDesconto,
} from "./calc/desconto";

const uid = () => Math.random().toString(36).slice(2, 10);

interface State {
  custos: CustoBase[];
  planos: Plano[];
  clientes: Cliente[];
  movimentos: Movimento[];
  parceiros: Parceiro[];
  financeiro: LancamentoFinanceiro[];
  descontos: Desconto[];
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
  // descontos
  addDesconto: (d: Omit<Desconto, "id">) => string;
  updateDesconto: (id: string, d: Partial<Desconto>) => void;
  removeDesconto: (id: string) => void;
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
  { id: uid(), nome: "Starter", categoria: "elora", cobranca: "recorrente", duracaoValor: null, duracaoUnidade: null, valorMensal: 297, valorSetup: 497, canaisInclusos: 1, usuariosInclusos: 3, contatosInclusos: 500, canaisWhatsInclusos: 1, canaisInstaInclusos: 0, canaisMessengerInclusos: 0, incluiIA: false, incluiAsaas: false, incluiZapi: 0, incluiTranscricao: false, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
  { id: uid(), nome: "Growth", categoria: "elora", cobranca: "recorrente", duracaoValor: null, duracaoUnidade: null, valorMensal: 597, valorSetup: 997, canaisInclusos: 3, usuariosInclusos: 10, contatosInclusos: 2000, canaisWhatsInclusos: 1, canaisInstaInclusos: 1, canaisMessengerInclusos: 1, incluiIA: false, incluiAsaas: false, incluiZapi: 1, incluiTranscricao: false, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
  { id: uid(), nome: "Scale", categoria: "elora", cobranca: "recorrente", duracaoValor: null, duracaoUnidade: null, valorMensal: 1197, valorSetup: 1997, canaisInclusos: 6, usuariosInclusos: 25, contatosInclusos: 10000, canaisWhatsInclusos: 2, canaisInstaInclusos: 2, canaisMessengerInclusos: 2, incluiIA: true, incluiAsaas: true, incluiZapi: 1, incluiTranscricao: true, licencaBase: 149.90, precoCanaisExc: 29.90, precoUsuariosExc: 19.90, precoContatosExc: 0.045, precoIA: 50.00, precoAsaas: 49.50, precoZapi: 69.00, precoTranscricaoUser: 3.99, precoCanalWhatsExc: 29.90, precoCanalInstaExc: 29.90, precoCanalMessengerExc: 29.90, valorCanaisExc: 59.90, valorUsuariosExc: 39.90, valorContatosExc: 0.10, valorIA: 99.00, valorAsaas: 89.00, valorZapi: 149.00, valorTranscricaoUser: 7.99, valorCanalWhatsExc: 59.90, valorCanalInstaExc: 59.90, valorCanalMessengerExc: 59.90, parceiroIds: [] },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      custos: defaultCustos,
      planos: defaultPlanos,
      clientes: [],
      movimentos: [],
      parceiros: [],
      financeiro: [],
      descontos: [],

      // Sincronização assíncrona
      syncFromSupabase: async () => {
        try {
          const [planosRes, parceirosRes, clientesRes, movimentosRes, finRes, descRes] = await Promise.all([
            supabase.from("elora_planos").select("*"),
            supabase.from("elora_parceiros").select("*"),
            supabase.from("elora_clientes").select("*"),
            supabase.from("elora_movimentos").select("*"),
            (supabase as any).from("elora_financeiro").select("*"),
            (supabase as any).from("elora_descontos").select("*"),
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
          if (descRes?.data) {
            set({ descontos: descRes.data.map(mapDbToDesconto) });
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

