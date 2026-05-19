import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cliente, CustoBase, Movimento, Plano } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

interface State {
  custos: CustoBase[];
  planos: Plano[];
  clientes: Cliente[];
  movimentos: Movimento[];
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
  { id: uid(), nome: "Starter", valorMensal: 297, valorSetup: 497, appsInclusos: 1, mauInclusos: 500 },
  { id: uid(), nome: "Growth", valorMensal: 597, valorSetup: 997, appsInclusos: 3, mauInclusos: 2000 },
  { id: uid(), nome: "Scale", valorMensal: 1197, valorSetup: 1997, appsInclusos: 6, mauInclusos: 10000 },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      custos: defaultCustos,
      planos: defaultPlanos,
      clientes: [],
      movimentos: [],
      addCusto: (c) => set({ custos: [...get().custos, { ...c, id: uid() }] }),
      updateCusto: (id, c) =>
        set({ custos: get().custos.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      removeCusto: (id) => set({ custos: get().custos.filter((x) => x.id !== id) }),
      addPlano: (p) => set({ planos: [...get().planos, { ...p, id: uid() }] }),
      updatePlano: (id, p) =>
        set({ planos: get().planos.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      removePlano: (id) => set({ planos: get().planos.filter((x) => x.id !== id) }),
      addCliente: (c) => {
        const id = uid();
        set({ clientes: [...get().clientes, { ...c, id }] });
        set({
          movimentos: [
            ...get().movimentos,
            {
              id: uid(),
              clienteId: id,
              data: c.dataInicio,
              tipo: "setup",
              planoId: c.planoId,
              apps: c.apps,
              mau: c.mau,
              extras: c.extras,
            },
          ],
        });
        return id;
      },
      updateCliente: (id, c) =>
        set({ clientes: get().clientes.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      removeCliente: (id) =>
        set({
          clientes: get().clientes.filter((x) => x.id !== id),
          movimentos: get().movimentos.filter((m) => m.clienteId !== id),
        }),
      addMovimento: (m) => {
        const mov = { ...m, id: uid() };
        set({ movimentos: [...get().movimentos, mov] });
        // aplicar efeito no cliente
        const cliente = get().clientes.find((c) => c.id === m.clienteId);
        if (cliente) {
          const patch: Partial<Cliente> = {};
          if (m.tipo === "churn") patch.dataChurn = m.data;
          if (m.tipo === "ativacao") patch.dataChurn = null;
          if (m.planoId !== undefined && m.planoId !== null) patch.planoId = m.planoId;
          if (m.apps !== undefined) patch.apps = m.apps;
          if (m.mau !== undefined) patch.mau = m.mau;
          if (m.extras !== undefined) patch.extras = m.extras;
          if (Object.keys(patch).length) {
            set({
              clientes: get().clientes.map((c) =>
                c.id === m.clienteId ? { ...c, ...patch } : c,
              ),
            });
          }
        }
      },
      removeMovimento: (id) =>
        set({ movimentos: get().movimentos.filter((m) => m.id !== id) }),
      resetAll: () =>
        set({ custos: defaultCustos, planos: defaultPlanos, clientes: [], movimentos: [] }),
      seedDemo: () => {
        const planos = get().planos;
        const p = planos[1] ?? planos[0];
        if (!p) return;
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const id = uid();
        set({
          clientes: [
            ...get().clientes,
            {
              id,
              nome: "Clínica Demo",
              planoId: p.id,
              dataInicio: sixMonthsAgo.toISOString().slice(0, 10),
              dataChurn: null,
              apps: 2,
              mau: 1500,
              extras: {},
            },
          ],
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
      },
    }),
    { name: "elora-control-v1" },
  ),
);

// ===== Helpers de cálculo =====

export function receitaMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;
  let total = plano.valorMensal;
  // apps excedentes
  const appsExc = Math.max(0, cliente.apps - plano.appsInclusos);
  const appCusto = custos.find((c) => c.tipo === "app");
  if (appCusto) total += appsExc * appCusto.precoCliente;
  // mau excedente
  const mauExc = Math.max(0, cliente.mau - plano.mauInclusos);
  const mauCusto = custos.find((c) => c.tipo === "mau");
  if (mauCusto) total += mauExc * mauCusto.precoCliente;
  // extras
  for (const [custoId, qtd] of Object.entries(cliente.extras || {})) {
    const c = custos.find((x) => x.id === custoId);
    if (c) total += c.precoCliente * qtd;
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
  let total = 0;
  // custo fixo da ferramenta proporcional? usamos custo base fixo total dividido depois. aqui: 0.
  const appCusto = custos.find((c) => c.tipo === "app");
  if (appCusto) total += cliente.apps * appCusto.custoUnitario;
  const mauCusto = custos.find((c) => c.tipo === "mau");
  if (mauCusto) total += cliente.mau * mauCusto.custoUnitario;
  for (const [custoId, qtd] of Object.entries(cliente.extras || {})) {
    const c = custos.find((x) => x.id === custoId);
    if (c) total += c.custoUnitario * qtd;
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

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}