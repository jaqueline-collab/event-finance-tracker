import { describe, it, expect } from "vitest";
import { agregarPainel } from "../painel-visual";
import { CARTOES_PAINEL, cartaoDoPainel } from "../graficos";
import { estadoCobertura } from "../sync-cobertura";
import { calcularPadraoPorCorte } from "../indicadores-motor";

const p = { de: "2026-10-01", ate: "2026-10-02" };
const base = {
  contatos: [
    { id: "a", criado_em: "2026-10-01T15:00:00Z", origem: "Origem A", etiquetas: ["Etiqueta"], campanha: "Campanha" },
    { id: "b", criado_em: "2026-10-02T15:00:00Z", origem: "Não definido", etiquetas: [], campanha: null },
    { id: "i", criado_em: "2026-10-01T15:00:00Z", origem: "Importado", etiquetas: [], campanha: null, importado: true },
  ],
  atendimentos: [{ id: "s", contato_id: "a", criado_em: "2026-10-01T15:00:00Z", canal: "Canal", atendente: "Pessoa", tmr: 30, tma: 60 }],
  mensagens: [{ sessao_id: "s", enviada_em: "2026-10-01T15:00:00Z", tipo: "TEXT", origem: "DEFAULT" }, { sessao_id: "s", enviada_em: "2026-10-02T15:00:00Z", tipo: "TEXT", origem: "BOT" }],
};
describe("Fase 5: regra única dos seis cartões", () => {
  it("preserva cada dia/série, fatia, campanha, canal e coluna de atendente", () => {
    for (const filtros of [{}, { canal: ["Canal"] }, { origem: "Importado" }]) {
      const r = agregarPainel(base, p, filtros);
      const novo = CARTOES_PAINEL.map(c => cartaoDoPainel(r,c));
      expect(novo[0].categorias.map(d=>[d.valores["Sem campanha"],d.valores["Vindos de ADS"]])).toEqual(r.porDia.map(d=>[d.organicos,d.ads]));
      expect(novo[2].categorias.map(d=>[d.valores["Usuário do sistema"],d.valores.Bot])).toEqual(r.porDia.map(d=>[d.usuario,d.bot]));
      expect(novo[1].categorias.map(d=>[d.rotulo,d.total])).toEqual(r.leadsPor.origem.map(d=>[d.nome,d.valor]));
      expect(novo[3].categorias.map(d=>[d.rotulo,d.total])).toEqual(r.campanhas.map(d=>[d.nome,d.valor]));
      expect(novo[4].categorias.map(d=>[d.rotulo,d.total])).toEqual(r.canais.map(d=>[d.nome,d.valor]));
      expect(novo[5].categorias.map(d=>[d.rotulo,d.valores.Atendimentos,d.valores.Conversas])).toEqual(r.atendentes.map(d=>[d.nome,d.atendimentos,d.conversas]));
    }
    expect(cartaoDoPainel(agregarPainel(base,p,{}),CARTOES_PAINEL[0]).total).toBe(2);
  });
  it("fontes opcionais não bloqueiam um cliente vazio", () => {
    const r=agregarPainel({contatos:[],atendimentos:[],mensagens:[]},p,{});
    expect(CARTOES_PAINEL.map(c=>cartaoDoPainel(r,c).total)).toEqual([0,0,0,0,0,0]);
  });
});
describe("Fase 5: cobertura sem inventar zero", () => {
  it("sem carga concluída aguarda sincronização",()=>expect(estadoCobertura("2026-10-01",["mensagens"],[])).toBe("aguardando sincronização"));
  it("carga concluída sem intervalo comprovado permanece parcial",()=>expect(estadoCobertura("2026-10-01",["mensagens"],[{fonte:"mensagens",concluido_em:"2026-11-01"}])).toBe("parcial"));
  it("zero só é confirmado dentro de cobertura explícita",()=>{
    const s=[{fonte:"mensagens",concluido_em:"2026-11-01",cobertura:[{de:"2026-10-01",ate:"2026-10-02"}]}];
    expect(estadoCobertura("2026-10-01",["mensagens"],s)).toBe("confirmado");
    expect(estadoCobertura("2026-10-03",["mensagens"],s)).toBe("parcial");
  });
});
it("ranking total do responsável inclui bot e humano, separadamente",()=>{
  const sessoes=[{id:"s",contato_id:"a",canal_id:null,canal_nome:null,responsavel_id:"u",responsavel_nome:"Pessoa"}];
  const msgs=base.mensagens.map(m=>({...m,user_id:m.origem==="DEFAULT"?"u":null}));
  const r=calcularPadraoPorCorte([],msgs,sessoes,{nomeCanal:{},equipePorCanal:{},agentes:{u:{nome:"Pessoa"}},ignorar:[]});
  expect(r.reduce((a,l)=>a+l.conversas_total_dia,0)).toBe(2);
  expect(r.reduce((a,l)=>a+l.conversas_usuario,0)).toBe(1);
  expect(r.reduce((a,l)=>a+l.conversas_bot,0)).toBe(1);
});