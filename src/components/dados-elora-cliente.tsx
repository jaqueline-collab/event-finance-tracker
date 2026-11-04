import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Radio, History, Lock, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatarTelefoneBr, nomeExibidoCanal, ROTULO_TIPO_CANAL, type TipoCanal } from "@/lib/dados-elora";
import {
  getDadosElora,
  listarCanaisElora,
  salvarCanaisPermitidos,
  salvarHistoricoDesde,
  salvarIntegracaoCliente,
  testarIntegracaoCliente,
  migrarChavesParaCofre,
  apagarChavesLegadas,
  type CanalElora,
} from "@/lib/integracao-elora.functions";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export function DadosEloraCliente({ clienteId, aba, baseUrl = null }: { clienteId: string; aba: "visao" | "conexao" | "canais"; baseUrl?: string | null }) {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getDadosElora>> | null>(null);
  const [canais, setCanais] = useState<CanalElora[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [historico, setHistorico] = useState("");
  const [novaChave, setNovaChave] = useState("");
  const [trocando, setTrocando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const d = await getDadosElora({ data: { clienteId } });
      setInfo(d);
      setMarcados(new Set(d.canaisPermitidos));
      setHistorico(d.historicoDesde ?? "");
    } catch (e) {
      toast.error(msg(e));
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (rotulo: string, fn: () => Promise<void>) => {
    setOcupado(rotulo);
    try {
      await fn();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const cofre = info?.cofre;


  if (aba === "conexao") return <div className="space-y-4">        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Credencial
            </CardTitle>
            <CardDescription>
              {cofre?.noCofre
                ? `Chave guardada no cofre, termina em ${cofre.ultimos4}, trocada em ${dataBr(cofre.trocadaEm)}.`
                : "Chave ainda fora do cofre (use “Migrar chaves para o cofre” em Configurar API)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado !== null}
                onClick={() =>
                  executar("teste", async () => {
                    const r = await testarIntegracaoCliente({ data: { clienteId } });
                    r.conectado ? toast.success(r.mensagem) : toast.error(r.mensagem);
                  })
                }
              >
                {ocupado === "teste" ? "Testando…" : "Testar conexão"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTrocando((v) => !v)}>
                Trocar chave
              </Button>
            </div>
            {trocando && (
              <form
                className="space-y-2"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!baseUrl) return toast.error("Configure o endereço da conta primeiro.");
                  void executar("troca", async () => {
                    await salvarIntegracaoCliente({ data: { clienteId, baseUrl, apiKey: novaChave } });
                    setNovaChave("");
                    setTrocando(false);
                    toast.success("Chave trocada e guardada no cofre.");
                    await carregar();
                  });
                }}
              >
                <Label htmlFor="nova-chave">Nova chave</Label>
                <Input
                  id="nova-chave"
                  type="password"
                  autoComplete="new-password"
                  value={novaChave}
                  onChange={(e) => setNovaChave(e.target.value)}
                />
                <Button size="sm" type="submit" disabled={!novaChave.trim() || ocupado !== null}>
                  {ocupado === "troca" ? "Salvando…" : "Salvar no cofre"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Histórico desde
            </CardTitle>
            <CardDescription>
              A partir de qual dia os dados deste cliente contam.
              {info?.historicoDesde ? ` Hoje está salvo: ${dataBr(`${info.historicoDesde}T12:00:00`)}.` : " Ainda não definido."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="historico-desde">Data</Label>
              <Input id="historico-desde" type="date" value={historico} onChange={(e) => setHistorico(e.target.value)} className="w-48" />
            </div>
            <Button
              size="sm"
              disabled={!historico || historico === (info?.historicoDesde ?? "") || ocupado !== null}
              onClick={() =>
                executar("historico", async () => {
                  await salvarHistoricoDesde({ data: { clienteId, historicoDesde: historico } });
                  toast.success("Data do histórico salva.");
                  await carregar();
                })
              }
            >
              {ocupado === "historico" ? "Salvando…" : "Salvar data"}
            </Button>
          </CardContent>
        </Card></div>;

  if (aba === "canais") return <CanaisCliente clienteId={clienteId} info={info} ocupado={ocupado} executar={executar} recarregar={carregar} canais={canais} setCanais={setCanais} marcados={marcados} setMarcados={setMarcados} />;

  return null;
}

export function CofreChavesAdmin() {
  const [res, setRes] = useState<{ titulo: string; itens: { nome: string; ok: boolean; motivo: string | null }[] } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState("");

  const rodar = async (fn: () => Promise<{ titulo: string; itens: any[] }>) => {
    setOcupado(true);
    try {
      setRes(await fn());
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> Cofre de chaves
        </CardTitle>
        <CardDescription>
          Copia as chaves do Elora App para o cofre cifrado. As chaves antigas só são apagadas quando você pedir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Button
            disabled={ocupado}
            onClick={() =>
              rodar(async () => {
                const r = await migrarChavesParaCofre();
                return {
                  titulo: `${r.migradas} migrada(s); ${r.jaNoCofre} já estavam no cofre.`,
                  itens: r.resultados,
                };
              })
            }
          >
            Migrar chaves para o cofre
          </Button>
          <div className="space-y-1">
            <Label htmlFor="confirmar-apagar" className="text-xs">
              Digite APAGAR para liberar
            </Label>
            <Input id="confirmar-apagar" className="h-9 w-32" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <Button
            variant="destructive"
            disabled={ocupado || confirmar !== "APAGAR"}
            onClick={() =>
              rodar(async () => {
                const r = await apagarChavesLegadas({ data: { confirmacao: "APAGAR" } });
                setConfirmar("");
                return { titulo: `${r.apagadas} chave(s) antiga(s) apagada(s).`, itens: r.resultados };
              })
            }
          >
            Apagar chaves antigas
          </Button>
        </div>
        {res && (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{res.titulo}</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {res.itens.map((i, k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="truncate">{i.nome}</span>
                  <span className={i.ok ? "text-muted-foreground" : "text-destructive"}>
                    {i.ok ? "ok" : i.motivo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type InfoDados = Awaited<ReturnType<typeof getDadosElora>>;

function CanaisCliente({
  clienteId,
  info,
  ocupado,
  executar,
  recarregar,
  canais,
  setCanais,
  marcados,
  setMarcados,
}: {
  clienteId: string;
  info: InfoDados | null;
  ocupado: string | null;
  executar: (r: string, fn: () => Promise<void>) => Promise<void>;
  recarregar: () => Promise<void>;
  canais: CanalElora[] | null;
  setCanais: (c: CanalElora[]) => void;
  marcados: Set<string>;
  setMarcados: (s: Set<string>) => void;
}) {
  const [filtro, setFiltro] = useState<TipoCanal | "todos">("todos");
  const [apelidos, setApelidos] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);

  useEffect(() => {
    if (!info) return;
    const a: Record<string, string> = {};
    for (const c of info.canaisSalvos) if (c.apelido) a[c.id] = c.apelido;
    setApelidos(a);
  }, [info]);

  // Sem buscar no Elora, mostra o que já está salvo.
  const lista: CanalElora[] =
    canais ??
    (info?.canaisSalvos ?? []).map((c) => ({
      id: c.id,
      nome: c.nome ?? c.id,
      numero: c.numero,
      ativo: true,
      tipo: c.tipo,
      foto: null,
    }));
  const tiposPresentes = Array.from(new Set(lista.map((c) => c.tipo)));
  const visiveis = filtro === "todos" ? lista : lista.filter((c) => c.tipo === filtro);
  const nPermitidos = lista.filter((c) => marcados.has(c.id)).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" /> Canais permitidos
          </CardTitle>
          <CardDescription>
            Só os canais ligados entram no EloraCRM. Sem nenhum ligado, nada deste cliente é sincronizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={ocupado !== null}
              onClick={() =>
                executar("canais", async () => {
                  const r = await listarCanaisElora({ data: { clienteId, channelType: "All" } });
                  setCanais(r.canais);
                })
              }
            >
              {ocupado === "canais" ? "Buscando…" : canais ? "Atualizar lista" : "Buscar canais da conta"}
            </Button>
            {lista.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(["todos", ...tiposPresentes] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltro(t as TipoCanal | "todos")}
                    className={`rounded-full border px-3 py-1 text-xs ${filtro === t ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    {t === "todos" ? "Todos" : ROTULO_TIPO_CANAL[t as TipoCanal]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            O apelido vale só aqui no EloraCRM. Nada é alterado no Elora.
          </p>
          {canais && canais.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum canal encontrado nesta conta.</p>
          )}
          {visiveis.length > 0 && (
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
              {visiveis.map((c) => {
                const ap = apelidos[c.id] ?? "";
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                    {c.foto ? (
                      <img src={c.foto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {ROTULO_TIPO_CANAL[c.tipo].slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                          {ROTULO_TIPO_CANAL[c.tipo]}
                        </span>
                        {!c.ativo && <span className="text-[10px] text-muted-foreground">inativo</span>}
                      </div>
                      {editando === c.id ? (
                        <Input
                          autoFocus
                          className="mt-1 h-8"
                          maxLength={80}
                          placeholder={c.nome}
                          value={ap}
                          onChange={(e) => setApelidos({ ...apelidos, [c.id]: e.target.value })}
                          onBlur={() => setEditando(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditando(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="mt-1 flex items-center gap-1 truncate text-left font-medium"
                          onClick={() => setEditando(c.id)}
                          aria-label="Editar apelido"
                        >
                          {nomeExibidoCanal(ap, c.nome)}
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                      {ap.trim() && <span className="block truncate text-xs text-muted-foreground">No Elora: {c.nome}</span>}
                      <span className="block text-sm">
                        {c.tipo === "whatsapp" ? formatarTelefoneBr(c.numero) : (c.numero ?? "—")}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">{c.id}</span>
                    </div>
                    <Switch
                      checked={marcados.has(c.id)}
                      onCheckedChange={(v) => {
                        const n = new Set(marcados);
                        v ? n.add(c.id) : n.delete(c.id);
                        setMarcados(n);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">{nPermitidos} canal(is) permitido(s).</p>
          {lista.length > 0 && (
            <Button
              size="sm"
              disabled={ocupado !== null}
              onClick={() =>
                executar("salvar-canais", async () => {
                  const todos = lista.map((c) => ({
                    id: c.id,
                    nome: c.nome,
                    numero: c.numero,
                    tipo: c.tipo,
                    apelido: (apelidos[c.id] ?? "").trim() || null,
                    permitido: marcados.has(c.id),
                  }));
                  await salvarCanaisPermitidos({ data: { clienteId, canais: todos } });
                  toast.success("Canais salvos.");
                  await recarregar();
                })
              }
            >
              {ocupado === "salvar-canais" ? "Salvando…" : "Salvar canais"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
