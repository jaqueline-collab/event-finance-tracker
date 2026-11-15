import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { lerMatriz, lerRegrasManuais, salvarRegraManual, ordenarColunasMatriz, previaColunaMatriz, salvarCelulaManual, salvarColunaMatriz, salvarFiltrosPadraoMatriz } from "@/lib/matriz.functions";
import { avisoSemHistorico, formatarMoeda } from "@/lib/formatos";
import { lerNumeroManual, ROTULO_QUEM_PREENCHE, type FormatoManual, type QuemPreenche } from "@/lib/coluna-manual";
import { exportarMatriz } from "@/lib/matriz-exportar";
import { BarraTabela } from "@/components/barra-tabela";
import { alternarColunasAds, ehColunaAds, type EstadoColunas } from "@/lib/colunas-tabela";

function ordenarPorEstado<T extends { chave: string }>(cols: T[], e: EstadoColunas): T[] {
  const pos = new Map(e.ordem.map((k, i) => [k, i]));
  return [...cols].sort((a, b) => (pos.get(a.chave) ?? 1e9) - (pos.get(b.chave) ?? 1e9));
}
import { periodoDe, type Periodo } from "@/lib/painel-visual";
import type { ColunaMatriz, Formato, TipoColuna } from "@/lib/matriz";
import { FiltroCampos } from "@/components/filtro-campos";
import { separarFiltros, type FiltroCampo } from "@/lib/campos-elora";

type Dados = Awaited<ReturnType<typeof lerMatriz>>;
type Dim = "canal" | "atendente" | "equipe";

const COR: Record<TipoColuna, string> = { app: "var(--chart-1)", manual: "var(--chart-3)", combinada: "var(--chart-4)", formula: "var(--chart-2)" };
const ROTULO_TIPO: Record<TipoColuna, string> = { app: "Do app", manual: "Manual", combinada: "Combinada", formula: "Fórmula" };
/** Dimensões que a Matriz aplica direto nas linhas gravadas; o resto liga pelo contato. */
const NATIVOS_MATRIZ: Record<Dim, { fonte: "atendimento"; campo: string }> = {
  canal: { fonte: "atendimento", campo: "canal" },
  atendente: { fonte: "atendimento", campo: "atendente" },
  equipe: { fonte: "atendimento", campo: "equipe" },
};
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const dataBr = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

function formatar(v: number | null, f: Formato) {
  if (v == null) return "—";
  if (f === "percentual") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (f === "moeda") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Celula({ c, formato, parcial, manual }: { c?: { valor: number | null; erro?: string }; formato: Formato; parcial?: boolean; manual?: boolean }) {
  // Coluna manual vazia fica em branco (vazio não é zero nem "sem histórico").
  if (manual && (c?.valor == null)) return null;
  if (!c) return <span className="text-muted-foreground">—</span>;
  if (c.erro) return <span className="text-xs text-destructive" title={c.erro}>Configuração com erro</span>;
  return (
    <span className="tabular-nums">
      {c.valor == null || (parcial && c.valor === 0) ? "—" : formatar(c.valor, formato)}
    </span>
  );
}

export function MatrizCliente({ clienteId, periodo, editando }: { clienteId: string; periodo: Periodo; editando: boolean }) {
  const modo = "diaria" as const;
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltroCampo[]>([]);
  // padrão da visão: aplicado uma vez ao abrir; depois o filtro é só da sessão
  const [padrao, setPadrao] = useState<FiltroCampo[] | null>(null);
  const [salvandoPadrao, setSalvandoPadrao] = useState(false);
  const [ordem, setOrdem] = useState<{ chave: string; desc: boolean }>({ chave: "dia", desc: true });
  const [editor, setEditor] = useState<ColunaMatriz | "nova" | null>(null);
  const [v, setV] = useState(0);
  const [regras, setRegras] = useState<Awaited<ReturnType<typeof lerRegrasManuais>> | null>(null);
  useEffect(() => { lerRegrasManuais({ data: { clienteId } }).then(setRegras).catch(() => setRegras(null)); }, [clienteId, v]);
  const [estadoCols, setEstadoCols] = useState<EstadoColunas>({ ordem: [], ocultas: [], fixas: [] });
  const recarregar = () => setV((x) => x + 1);

  useEffect(() => {
    let vivo = true;
    const { diretos, outros } = separarFiltros(filtros, NATIVOS_MATRIZ);
    lerMatriz({ data: { clienteId, de: periodo.de, ate: periodo.ate, filtros: diretos, campos: outros } })
      .then((r) => {
        if (!vivo) return;
        setErro(null);
        if (padrao === null) {
          setPadrao(r.filtrosPadrao);
          if (r.filtrosPadrao.length) {
            setFiltros(r.filtrosPadrao);
            return; // recarrega já com o padrão, sem mostrar a matriz sem filtro
          }
        }
        setD(r);
      })
      .catch((e) => vivo && setErro(msg(e)));
    return () => {
      vivo = false;
    };
  }, [clienteId, periodo.de, periodo.ate, JSON.stringify(filtros), v]);


  const linhas = useMemo(() => {
    if (!d) return [];
    const l = [...d.linhas];
    l.sort((a, b) => {
      const x = ordem.chave === "dia" ? a.dia : (a.celulas[ordem.chave]?.valor ?? -Infinity);
      const y = ordem.chave === "dia" ? b.dia : (b.celulas[ordem.chave]?.valor ?? -Infinity);
      const r = x < y ? -1 : x > y ? 1 : 0;
      return ordem.desc ? -r : r;
    });
    return l;
  }, [d, ordem]);

  if (erro && !d) return <p className="rounded-xl border p-6 text-sm text-muted-foreground">Não foi possível carregar a matriz agora.</p>;
  if (!d) return <Skeleton className="h-96 w-full rounded-xl" />;

  const editavel = editando && d.podeEditar;
  const colsBarra = d.todasColunas.map((c) => ({ chave: c.chave, rotulo: c.nome }));
  const padraoCols: EstadoColunas = { ordem: d.todasColunas.map((c) => c.chave), ocultas: d.todasColunas.filter((c) => !c.ativo).map((c) => c.chave), fixas: [] };
  const estadoValido = estadoCols.ordem.length ? estadoCols : padraoCols;
  const chavesAds = colsBarra.map((c) => c.chave).filter(ehColunaAds);
  const adsVisiveis = chavesAds.every((k) => !estadoValido.ocultas.includes(k));
  // quem vê reordena/oculta só na tela; a super admin em Editar vê todas e salva o padrão
  const colunasTela = ordenarPorEstado(editavel ? d.todasColunas : d.colunas, estadoValido).filter((c) => !estadoValido.ocultas.includes(c.chave));
  const ativasPorChave = new Set(d.colunas.map((c) => c.chave));

  const salvarOrdem = async (lista: ColunaMatriz[]) => {
    try {
      await ordenarColunasMatriz({ data: { clienteId, colunas: lista.map((c) => ({ chave: c.chave, nome: c.nome, ativo: c.ativo })) } });
      setEstadoCols({ ordem: [], ocultas: [], fixas: [] });
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    }
  };
  const mover = (i: number, delta: number) => {
    const l = [...d.todasColunas];
    const j = i + delta;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    void salvarOrdem(l);
  };
  const alternar = (c: ColunaMatriz) => void salvarOrdem(d.todasColunas.map((x) => (x.chave === c.chave ? { ...x, ativo: !x.ativo } : x)));

  const ordenar = (chave: string) => setOrdem((o) => ({ chave, desc: o.chave === chave ? !o.desc : true }));

  const padraoAtual = padrao ?? [];
  const mudouPadrao = JSON.stringify(filtros) !== JSON.stringify(padraoAtual);
  const salvarPadrao = async () => {
    setSalvandoPadrao(true);
    try {
      await salvarFiltrosPadraoMatriz({ data: { clienteId, filtros } });
      setPadrao(filtros);
      toast.success("Filtros padrão da Matriz salvos.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvandoPadrao(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BarraTabela colunas={colsBarra} estado={estadoValido} onEstado={setEstadoCols} padrao={padraoCols} semFixar
          extras={chavesAds.length > 0 ? <label className="flex items-center gap-1.5 text-xs"><Switch aria-label="Mostrar colunas de ADS" checked={adsVisiveis} onCheckedChange={(mostrar) => setEstadoCols(alternarColunasAds(estadoValido, chavesAds, mostrar))} />ADS</label> : undefined}
          onSalvarPadrao={editavel ? () => void salvarOrdem(ordenarPorEstado(d.todasColunas, estadoValido).map((c) => ({ ...c, ativo: !estadoValido.ocultas.includes(c.chave) }))) : undefined}
          onExportar={(f) => {
          const cols = colunasTela.filter(c => ativasPorChave.has(c.chave));
          const corpo = linhas.map(l => [l.dia, ...cols.map(c => { const v = l.celulas[c.chave]; return `${v?.valor ?? ""}`; }), d.cobertura[l.dia]]);
          corpo.push(["Total", ...cols.map(c => `${d.total[c.chave]?.valor ?? ""}`), Object.values(d.cobertura).some(s=>s!=="confirmado") ? "parcial" : "confirmado"]);
          void exportarMatriz(f, ["Dia", ...cols.map(c=>c.nome), "Cobertura"], corpo, `matriz-${periodo.de}-${periodo.ate}`).catch(e=>toast.error(msg(e)));
        }} />
      </div>
      <>
      {editavel && mudouPadrao && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground">Os filtros desta visão mudaram.</span>
          <Button size="sm" variant="outline" className="h-7" disabled={salvandoPadrao} onClick={salvarPadrao}>
            Salvar como padrão da visão
          </Button>
        </div>
      )}
      <FiltroCampos
        clienteId={clienteId}
        filtros={filtros}
        onFiltros={setFiltros}
        fonteDaVisao="atendimento"
        opcoesNativas={{ "atendimento|canal": d.opcoes.canal, "atendimento|atendente": d.opcoes.atendente, "atendimento|equipe": d.opcoes.equipe }}
      />

      <div className="max-h-[70vh] overflow-auto rounded-xl border bg-card">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 border-b bg-card px-3 py-2.5 text-left font-medium">
                <button type="button" className="flex items-center gap-1" onClick={() => ordenar("dia")}>
                  Dia {ordem.chave === "dia" && (ordem.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                </button>
              </th>
              {colunasTela.map((c, i) => (
                <th key={c.chave} className={`border-b px-3 py-2.5 text-center font-medium ${!c.ativo ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COR[c.tipo] }} title={ROTULO_TIPO[c.tipo]} />
                    {c.tipo === "manual" && <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Preenchida à mão" />}
                    <button type="button" className="flex items-center gap-1 whitespace-nowrap" onClick={() => ativasPorChave.has(c.chave) && ordenar(c.chave)}>
                      {c.nome}
                      {ordem.chave === c.chave && (ordem.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                    {editavel && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label={`Opções da coluna ${c.nome}`}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.tipo !== "app" && (
                            <DropdownMenuItem onClick={() => setEditor(c)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar coluna
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => mover(i, -1)} disabled={i === 0}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Mover para a esquerda
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => mover(i, 1)} disabled={i === colunasTela.length - 1}>
                            <ChevronRight className="mr-2 h-4 w-4" /> Mover para a direita
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => alternar(c)}>
                            {c.ativo ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {c.ativo ? "Ocultar coluna" : "Mostrar coluna"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </th>
              ))}
              {editavel && (
                <th className="border-b px-2 py-2.5">
                  <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap text-xs" onClick={() => setEditor("nova")}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Coluna
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.dia} className="hover:bg-muted/40">
                <td className="sticky left-0 border-b bg-card px-3 py-2 tabular-nums text-muted-foreground">{dataBr(l.dia)}{d.cobertura[l.dia] !== "confirmado" && <span className="ml-2 text-[10px]">{d.cobertura[l.dia]}</span>}</td>
                {colunasTela.map((c) => (
                  <td key={c.chave} className={`border-b px-3 py-2 text-center tabular-nums ${!c.ativo ? "opacity-50" : ""}`}>
                    {c.tipo === "manual" && c.ativo && regras?.regras[c.chave]?.pode && (regras.regras[c.chave].aceitaFuturo || l.dia <= regras.hoje) ? (
                      <CelulaManual clienteId={clienteId} chave={c.chave} dia={l.dia} formato={regras.regras[c.chave].formato} valor={l.celulas[c.chave]?.valor ?? null} aoSalvar={() => setV((x) => x + 1)} />
                    ) : ativasPorChave.has(c.chave) ? (
                      <>
                      <Celula c={l.celulas[c.chave]} formato={c.formato} manual={c.tipo === "manual"} parcial={c.tipo !== "manual" && d.cobertura[l.dia] !== "confirmado"} />
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
                {editavel && <td className="border-b" />}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-card">
            <tr className="font-semibold">
              <td className="sticky left-0 border-t bg-card px-3 py-2.5">Total</td>
              {colunasTela.map((c) => (
                <td key={c.chave} className="border-t px-3 py-2.5 text-center tabular-nums">
                  {ativasPorChave.has(c.chave) ? <Celula c={d.total[c.chave]} formato={c.formato} manual={c.tipo === "manual"} parcial={c.tipo !== "manual" && Object.values(d.cobertura).some(s => s !== "confirmado")} /> : <span className="text-muted-foreground">—</span>}
                </td>
              ))}
              {editavel && <td className="border-t" />}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{d.semHistoricoAntes && d.colunasSemHistorico.length > 0 && `${avisoSemHistorico(d.semHistoricoAntes)}. `}{Object.values(d.cobertura).some(s => s !== "confirmado") && "Parcial: a sincronização atual não comprova cobertura completa de todos os dias, inclusive no total."}</p>
      {editavel && d.erros.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Colunas com configuração incompleta: {d.erros.map((e) => `${e.nome} (${e.erro})`).join("; ")}.
        </p>
      )}
      {editavel && editor && (
        <EditorColuna
          clienteId={clienteId}
          coluna={editor === "nova" ? null : editor}
          regrasColuna={editor !== "nova" ? regras?.regras[editor.chave] : undefined}
          dados={d}
          onFechar={() => setEditor(null)}
          onSalvo={() => {
            setEditor(null);
            recarregar();
          }}
        />
      )}
      </>
    </div>
  );
}

function CelulaManual({ clienteId, chave, dia, valor, formato, aoSalvar }: { clienteId: string; chave: string; dia: string; valor: number | null; formato: FormatoManual; aoSalvar: () => void }) {
  const [atual, setAtual] = useState<number | null>(valor);
  const [editando, setEditando] = useState(false);
  const [t, setT] = useState("");
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => setAtual(valor), [valor]);
  const exibir = (n: number | null) => (n == null ? "" : formato === "moeda" ? formatarMoeda(n) : n.toLocaleString("pt-BR"));
  const abrir = () => { setT(atual == null ? "" : String(atual).replace(".", ",")); setErro(null); setEditando(true); };
  const gravar = async () => {
    const r = lerNumeroManual(t, formato);
    if (!r.ok) { setErro(r.erro); return; }
    setEditando(false);
    if (r.valor === atual) return;
    const antes = atual;
    setAtual(r.valor); setEstado("salvando"); setErro(null);
    try {
      await salvarCelulaManual({ data: { clienteId, chave, data: dia, valor: r.valor } });
      setEstado("salvo"); setTimeout(() => setEstado(""), 2000);
      aoSalvar();
    } catch (e) { setAtual(antes); setEstado(""); setErro(msg(e)); }
  };
  if (editando)
    return (
      <span className="inline-flex flex-col items-center">
        <input
          autoFocus
          inputMode={formato === "inteiro" ? "numeric" : "decimal"}
          value={t}
          onChange={(e) => { setT(e.target.value); setErro(null); }}
          onBlur={() => void gravar()}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setErro(null); setEditando(false); } }}
          className={`h-7 w-24 rounded-md border bg-background px-2 text-center tabular-nums outline-none focus:ring-2 focus:ring-ring ${erro ? "border-destructive" : "border-input"}`}
          aria-label={`Valor de ${dia}`}
          aria-invalid={!!erro}
        />
        {erro && <span role="alert" className="mt-0.5 text-[10px] text-destructive">{erro}</span>}
      </span>
    );
  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={abrir}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); abrir(); } }}
        className="group/cel relative inline-flex h-7 w-24 items-center justify-center rounded-md border border-input bg-muted/40 px-2 tabular-nums hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Preencher ${dia}${atual == null ? "" : `, valor ${exibir(atual)}`}`}
      >
        {exibir(atual)}
        <Pencil className="absolute right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover/cel:opacity-100 group-focus-visible/cel:opacity-100" aria-hidden />
      </button>
      {estado === "salvo" && <span className="mt-0.5 text-[10px] text-muted-foreground">Salvo</span>}
      {erro && <span role="alert" className="mt-0.5 text-[10px] text-destructive">{erro}</span>}
    </span>
  );
}

/** Quem preenche e se aceita dia futuro (super admin, na configuração da coluna manual). */
function RegraManual({ clienteId, chave, inicial }: { clienteId: string; chave: string; inicial?: { preenche: QuemPreenche; aceitaFuturo: boolean } }) {
  const [preenche, setPreenche] = useState<QuemPreenche>(inicial?.preenche ?? "super_admin");
  const [futuro, setFuturo] = useState(inicial?.aceitaFuturo ?? false);
  const salvar = async (p: QuemPreenche, f: boolean) => {
    setPreenche(p); setFuturo(f);
    try { await salvarRegraManual({ data: { clienteId, chave, preenche: p, aceitaFuturo: f } }); toast.success("Regra da coluna salva."); }
    catch (e) { toast.error(msg(e)); }
  };
  return (
    <div className="space-y-2 rounded-lg border p-2">
      <Label>Quem preenche</Label>
      <Select value={preenche} onValueChange={(v) => void salvar(v as QuemPreenche, futuro)}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(ROTULO_QUEM_PREENCHE) as QuemPreenche[]).map((k) => <SelectItem key={k} value={k}>{ROTULO_QUEM_PREENCHE[k]}</SelectItem>)}</SelectContent>
      </Select>
      <label className="flex items-center justify-between gap-2 text-sm">Aceita dias futuros<Switch checked={futuro} onCheckedChange={(v) => void salvar(preenche, v)} /></label>
      <p className="text-xs text-muted-foreground">Sem dias futuros, só hoje e dias passados podem ser preenchidos.</p>
    </div>
  );
}

/* ---------------- Editor de coluna ---------------- */

type Ref = { fonte: "card" | "contato" | "atendimento" | "utm"; campo: string };
type Cond = { campo: Ref | null; operador: "preenchido" | "vazio" | "igual" | "contem"; valor?: string };
type EventoTipo = "entrou_etapa" | "virou_ganho" | "virou_perdido" | "campo_preenchido" | "foi_criado";

function SeletorCampo({ valor, catalogo, onMudar }: { valor: Ref | null; catalogo: Dados["catalogo"]; onMudar: (r: Ref) => void }) {
  const v = valor ? `${valor.fonte}|${valor.campo}` : "";
  return (
    <Select value={v} onValueChange={(x) => { const [fonte, ...r] = x.split("|"); onMudar({ fonte: fonte as Ref["fonte"], campo: r.join("|") }); }}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Escolha o campo" />
      </SelectTrigger>
      <SelectContent>
        {catalogo.map((g) => (
          <SelectGroup key={g.fonte}>
            <SelectLabel>{g.nome}</SelectLabel>
            {g.campos.map((c) => (
              <SelectItem key={`${g.fonte}|${c.campo}`} value={`${g.fonte}|${c.campo}`}>
                {c.rotulo} <span className="text-muted-foreground">({c.preenchidos})</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditorColuna({ clienteId, coluna, dados, onFechar, onSalvo, regrasColuna }: { clienteId: string; coluna: ColunaMatriz | null; dados: Dados; onFechar: () => void; onSalvo: () => void; regrasColuna?: { preenche: QuemPreenche; aceitaFuturo: boolean } }) {
  const cfgAtual = coluna as any;
  const [nome, setNome] = useState(coluna?.nome ?? "");
  const [tipo, setTipo] = useState<TipoColuna>(coluna?.tipo && coluna.tipo !== "app" ? coluna.tipo : dados.temCards ? "combinada" : "manual");
  const [formato, setFormato] = useState<Formato>(coluna?.formato ?? "numero");
  const [ativo, setAtivo] = useState(coluna?.ativo ?? true);
  const [eventoTipo, setEventoTipo] = useState<EventoTipo>(cfgAtual?.evento?.tipo ?? "entrou_etapa");
  const [etapa, setEtapa] = useState<string>(cfgAtual?.evento?.etapa ?? "");
  const [campoEvento, setCampoEvento] = useState<Ref | null>(cfgAtual?.evento?.campo ?? null);
  const [op, setOp] = useState<"E" | "OU">(cfgAtual?.condicoes?.op ?? "E");
  const [conds, setConds] = useState<Cond[]>(cfgAtual?.condicoes?.itens ?? []);
  const [formula, setFormula] = useState(coluna?.formula ?? { op: "percentual" as const, a: "", b: "" });
  const [previa, setPrevia] = useState<Awaited<ReturnType<typeof previaColunaMatriz>> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const montar = () => {
    const evento =
      eventoTipo === "entrou_etapa" ? { tipo: eventoTipo, etapa } : eventoTipo === "campo_preenchido" ? (campoEvento ? { tipo: eventoTipo, campo: campoEvento } : undefined) : { tipo: eventoTipo };
    return {
      chave: coluna?.chave,
      nome: nome.trim(),
      tipo,
      formato,
      ativo,
      ordem: coluna?.ordem,
      fonte: "cards" as const,
      medida: "contagem" as const,
      evento: tipo === "combinada" ? (evento as any) : undefined,
      condicoes: { op, itens: conds.filter((c) => c.campo).map((c) => ({ ...c, campo: c.campo! })) },
      formula: tipo === "formula" ? formula : null,
    };
  };

  const chaveRascunho = JSON.stringify([nome, tipo, formato, eventoTipo, etapa, campoEvento, op, conds, formula]);
  useEffect(() => {
    if (!nome.trim() || tipo === "manual") return setPrevia(null);
    const t = setTimeout(() => {
      const p = periodoDe("30d", new Date().toISOString());
      previaColunaMatriz({ data: { clienteId, de: p.de, ate: p.ate, coluna: montar() as any } })
        .then(setPrevia)
        .catch(() => setPrevia(null));
    }, 500);
    return () => clearTimeout(t);
  }, [chaveRascunho]);

  const salvar = async () => {
    if (!nome.trim()) return toast.error("Dê um nome para a coluna.");
    setSalvando(true);
    try {
      await salvarColunaMatriz({ data: { clienteId, coluna: montar() as any } });
      toast.success("Coluna salva.");
      onSalvo();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvando(false);
    }
  };

  const outras = dados.todasColunas.filter((c) => c.chave !== coluna?.chave);
  const tipos: TipoColuna[] = dados.temCards ? ["combinada", "manual", "formula"] : ["manual", "formula"];

  return (
    <Sheet open onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{coluna ? "Editar coluna" : "Nova coluna"}</SheetTitle>
          <SheetDescription>Vale só para este cliente.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {tipos.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${tipo === t ? "border-foreground text-foreground" : "text-muted-foreground"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: COR[t] }} />
                  {ROTULO_TIPO[t]}
                </button>
              ))}
            </div>
          </div>

          {tipo === "combinada" && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Conta cada card uma vez, no primeiro dia (horário de São Paulo) em que o evento e as condições valem. Campo do contato usa o primeiro contato do card.</p>
              <div className="space-y-1.5">
                <Label>Evento</Label>
                <Select value={eventoTipo} onValueChange={(v) => setEventoTipo(v as EventoTipo)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrou_etapa">Entrou na etapa</SelectItem>
                    <SelectItem value="virou_ganho">Virou ganho</SelectItem>
                    <SelectItem value="virou_perdido">Virou perdido</SelectItem>
                    <SelectItem value="campo_preenchido">Campo foi preenchido</SelectItem>
                    <SelectItem value="foi_criado">Foi criado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {eventoTipo === "entrou_etapa" && (
                <Select value={etapa} onValueChange={setEtapa}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Escolha a etapa" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set([...(etapa ? [etapa] : []), ...dados.etapas])].map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {eventoTipo === "campo_preenchido" && <SeletorCampo valor={campoEvento} catalogo={dados.catalogo} onMudar={setCampoEvento} />}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Condições</Label>
                  {conds.length > 1 && (
                    <Select value={op} onValueChange={(v) => setOp(v as "E" | "OU")}>
                      <SelectTrigger className="h-7 w-auto text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="E">Todas (E)</SelectItem>
                        <SelectItem value="OU">Qualquer uma (OU)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {conds.map((c, i) => (
                  <div key={i} className="space-y-1.5 rounded-md bg-muted/40 p-2">
                    <SeletorCampo valor={c.campo} catalogo={dados.catalogo} onMudar={(r) => setConds((l) => l.map((x, j) => (j === i ? { ...x, campo: r } : x)))} />
                    <div className="flex gap-2">
                      <Select value={c.operador} onValueChange={(v) => setConds((l) => l.map((x, j) => (j === i ? { ...x, operador: v as Cond["operador"] } : x)))}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preenchido">preenchido</SelectItem>
                          <SelectItem value="vazio">vazio</SelectItem>
                          <SelectItem value="igual">igual a</SelectItem>
                          <SelectItem value="contem">contém</SelectItem>
                        </SelectContent>
                      </Select>
                      {(c.operador === "igual" || c.operador === "contem") && (
                        <Input className="h-8 text-xs" value={c.valor ?? ""} onChange={(e) => setConds((l) => l.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setConds((l) => l.filter((_, j) => j !== i))} aria-label="Remover condição">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConds((l) => [...l, { campo: null, operador: "preenchido" }])}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Condição
                </Button>
              </div>
            </div>
          )}

          {tipo === "formula" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Fórmula</Label>
              <Select value={formula.a} onValueChange={(a) => setFormula((f) => ({ ...f, a }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Primeira coluna" /></SelectTrigger>
                <SelectContent>{outras.map((c) => <SelectItem key={c.chave} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={formula.op} onValueChange={(o) => setFormula((f) => ({ ...f, op: o as typeof f.op }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soma">mais (soma)</SelectItem>
                  <SelectItem value="diferenca">menos (diferença)</SelectItem>
                  <SelectItem value="razao">dividido por (razão)</SelectItem>
                  <SelectItem value="percentual">em % de (percentual)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formula.b} onValueChange={(b) => setFormula((f) => ({ ...f, b }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Segunda coluna" /></SelectTrigger>
                <SelectContent>{outras.map((c) => <SelectItem key={c.chave} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {tipo === "manual" && <p className="text-xs text-muted-foreground">Os valores são digitados por dia, direto na tabela, por quem tem permissão.</p>}
          {tipo === "manual" && coluna?.chave && <RegraManual clienteId={clienteId} chave={coluna.chave} inicial={regrasColuna} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="numero">Número</SelectItem>
                  <SelectItem value="percentual">Percentual</SelectItem>
                  <SelectItem value="moeda">Moeda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <Switch checked={ativo} onCheckedChange={setAtivo} /> Visível
            </label>
          </div>

          {previa && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium">Prévia dos últimos 30 dias</p>
              <div className="flex h-16 items-end gap-0.5">
                {previa.dias.map((x) => {
                  const max = Math.max(1, ...previa.dias.map((y) => y.valor ?? 0));
                  return <div key={x.dia} title={`${dataBr(x.dia)}: ${x.valor ?? "—"}`} className="flex-1 rounded-sm" style={{ height: `${((x.valor ?? 0) / max) * 100}%`, minHeight: 2, background: COR[tipo] }} />;
                })}
              </div>
              <p className="mt-2 text-sm">
                Total: <Celula c={previa.total ?? undefined} formato={formato} />
              </p>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar coluna"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

