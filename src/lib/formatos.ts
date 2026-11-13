/** Formatos de exibição únicos (blocos, tabelas, lista do dia e exportar). Nunca alteram o dado gravado. */

const TZ = "America/Sao_Paulo";
const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** "2026-11-06T14:30:00Z" → "06/11/2026 11:30" (horário de Brasília); "2026-11-06" → "06/11/2026". */
export function formatarDataHora(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (ISO_DATA.test(s)) return s.split("-").reverse().join("/");
  if (!ISO_DATA_HORA.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

/** Só a hora (HH:MM, Brasília) de um valor de data com hora; vazio quando é só data. */
export function horaDe(v: unknown): string {
  const f = formatarDataHora(v);
  return /\d{2}:\d{2}$/.test(f) ? f.slice(-5) : "";
}

export const pareceDataIso = (v: unknown) => typeof v === "string" && (ISO_DATA.test(v.trim()) || ISO_DATA_HORA.test(v.trim()));

/** 10990 → "R$ 10.990,00". */
export function formatarMoeda(v: unknown): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
}

/**
 * Telefone como "(55) 41 99999-0000". Sem DDI: "41 99999-0000". Fora do padrão: o melhor possível, sem inventar dígito.
 */
export function formatarTelefone(v: unknown): string {
  if (v == null || v === "") return "";
  const bruto = String(v).trim();
  const d = bruto.replace(/\D/g, "");
  if (!d) return bruto;
  const local = (x: string) => (x.length === 9 ? `${x.slice(0, 5)}-${x.slice(5)}` : x.length === 8 ? `${x.slice(0, 4)}-${x.slice(4)}` : x);
  if (d.length === 13 || d.length === 12) return `(${d.slice(0, 2)}) ${d.slice(2, 4)} ${local(d.slice(4))}`;
  if (d.length === 11 || d.length === 10) return `${d.slice(0, 2)} ${local(d.slice(2))}`;
  if (d.length === 9 || d.length === 8) return local(d);
  return bruto;
}

export const ehUrl = (v: unknown) => typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim());

/** Texto curto de um link para caber na célula (o completo vai no tooltip). */
export function textoLink(url: string, max = 40): string {
  const s = url.replace(/^https?:\/\/(www\.)?/i, "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const SIGLAS = new Set(["utm", "id", "url", "ads", "tmr", "tma", "cpf", "cnpj", "crm", "ddd", "ddi"]);
/** "Data Da Consulta" / "data-da-consulta" → "Data da consulta" (siglas continuam em maiúsculas). */
export function rotuloCorrido(v: string): string {
  const palavras = v.replace(/^campo\./, "").replace(/[-_]+/g, " ").trim().split(/\s+/).filter(Boolean);
  return palavras
    .map((p, i) => {
      const l = p.toLowerCase();
      if (SIGLAS.has(l.replace(/[^a-z]/g, ""))) return p.toUpperCase();
      if (/^\(?[A-Z]{2,}\)?$/.test(p)) return p;
      return i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l;
    })
    .join(" ");
}

export const DINHEIRO = /valor|preco|preço|monetar|moeda|receita|faturamento|ticket/i;
export const TELEFONE = /telefone|celular|whats|fone|phone/i;

/** Formata um valor de célula pela natureza da coluna (dinheiro, telefone, data). */
export function formatarCelula(campo: string, v: string): string {
  if (!v) return v;
  if (TELEFONE.test(campo)) return formatarTelefone(v);
  if (DINHEIRO.test(campo) && /^-?[\d.,]+$/.test(v.trim())) return formatarMoeda(Number(v));
  if (pareceDataIso(v)) return formatarDataHora(v);
  return v;
}
