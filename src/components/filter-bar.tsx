import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, X, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterFieldDef =
  | { key: string; label: string; type: "multi"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "dateRange" };

export type FilterValue =
  | { type: "multi"; values: string[] }
  | { type: "dateRange"; from?: string; to?: string; preset?: string };

export type FilterState = Record<string, FilterValue>;

const DATE_PRESETS: { key: string; label: string; compute: () => { from: string; to: string } }[] = [
  { key: "hoje", label: "Hoje", compute: () => { const d = iso(new Date()); return { from: d, to: d }; } },
  { key: "este_mes", label: "Este mês", compute: () => mes(0) },
  { key: "mes_passado", label: "Mês passado", compute: () => mes(-1) },
  { key: "ultimos_30", label: "Últimos 30 dias", compute: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return { from: iso(s), to: iso(e) }; } },
  { key: "este_ano", label: "Este ano", compute: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: `${y}-12-31` }; } },
  { key: "ano_passado", label: "Ano passado", compute: () => { const y = new Date().getFullYear() - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; } },
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function mes(offset: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const s = new Date(y, m, 1);
  const e = new Date(y, m + 1, 0);
  return { from: iso(s), to: iso(e) };
}

export interface FilterBarProps {
  fields: FilterFieldDef[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  className?: string;
}

export function FilterBar({ fields, value, onChange, className }: FilterBarProps) {
  const activeKeys = Object.keys(value).filter((k) => {
    const v = value[k];
    if (!v) return false;
    if (v.type === "multi") return v.values.length > 0;
    if (v.type === "dateRange") return Boolean(v.from || v.to || v.preset);
    return false;
  });
  const availableFields = fields.filter((f) => !activeKeys.includes(f.key));

  const setField = (key: string, v: FilterValue | null) => {
    const next = { ...value };
    if (v === null) delete next[key]; else next[key] = v;
    onChange(next);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/10", className)}>
      <FilterIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      {activeKeys.map((key) => {
        const field = fields.find((f) => f.key === key);
        if (!field) return null;
        return (
          <FilterChip
            key={key}
            field={field}
            value={value[key]}
            onChange={(v) => setField(key, v)}
            onRemove={() => setField(key, null)}
          />
        );
      })}
      {availableFields.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
              <Plus className="h-3.5 w-3.5" /> Adicionar filtro
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableFields.map((f) => (
              <DropdownMenuItem
                key={f.key}
                onClick={() =>
                  setField(
                    f.key,
                    f.type === "multi"
                      ? { type: "multi", values: [] }
                      : { type: "dateRange" },
                  )
                }
              >
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {activeKeys.length > 0 && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function FilterChip({
  field,
  value,
  onChange,
  onRemove,
}: {
  field: FilterFieldDef;
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(value.type === "multi" ? value.values.length === 0 : !value.from && !value.preset);

  const summary = (() => {
    if (field.type === "multi" && value.type === "multi") {
      if (value.values.length === 0) return "qualquer";
      const labels = value.values
        .map((v) => field.options.find((o) => o.value === v)?.label ?? v)
        .slice(0, 2);
      const extra = value.values.length > 2 ? ` +${value.values.length - 2}` : "";
      return labels.join(", ") + extra;
    }
    if (field.type === "dateRange" && value.type === "dateRange") {
      if (value.preset) return DATE_PRESETS.find((p) => p.key === value.preset)?.label ?? "período";
      if (value.from && value.to) return `${fmtBR(value.from)} → ${fmtBR(value.to)}`;
      if (value.from) return `desde ${fmtBR(value.from)}`;
      if (value.to) return `até ${fmtBR(value.to)}`;
      return "qualquer período";
    }
    return "";
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="inline-flex items-center gap-1 h-8 px-2 rounded-md bg-background border border-border/60 text-xs cursor-pointer hover:border-primary/50">
          <span className="text-muted-foreground">{field.label}:</span>
          <span className="font-medium">{summary}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-1 text-muted-foreground hover:text-destructive"
            aria-label="Remover filtro"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {field.type === "multi" && value.type === "multi" && (
          <MultiPicker field={field} value={value} onChange={onChange} />
        )}
        {field.type === "dateRange" && value.type === "dateRange" && (
          <DateRangePicker value={value} onChange={onChange} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function MultiPicker({
  field,
  value,
  onChange,
}: {
  field: Extract<FilterFieldDef, { type: "multi" }>;
  value: Extract<FilterValue, { type: "multi" }>;
  onChange: (v: FilterValue) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = field.options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (val: string) => {
    const has = value.values.includes(val);
    const next = has ? value.values.filter((v) => v !== val) : [...value.values, val];
    onChange({ type: "multi", values: next });
  };
  return (
    <div className="space-y-2">
      <Input
        autoFocus
        placeholder={`Buscar ${field.label.toLowerCase()}…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {filtered.map((o) => (
          <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
            <Checkbox checked={value.values.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
            <span className="flex-1">{o.label}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-3">Nenhuma opção</div>
        )}
      </div>
      {value.values.length > 0 && (
        <button
          onClick={() => onChange({ type: "multi", values: [] })}
          className="text-[10px] text-muted-foreground hover:text-foreground underline w-full text-right"
        >
          Limpar seleção
        </button>
      )}
    </div>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: Extract<FilterValue, { type: "dateRange" }>;
  onChange: (v: FilterValue) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Atalhos</Label>
        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => { const { from, to } = p.compute(); onChange({ type: "dateRange", preset: p.key, from, to }); }}
              className={cn(
                "px-2 py-1 rounded text-[11px] border",
                value.preset === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border/60 hover:border-primary/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">De</Label>
          <Input type="date" value={value.from ?? ""} className="h-8 text-xs" onChange={(e) => onChange({ type: "dateRange", from: e.target.value, to: value.to, preset: undefined })} />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Até</Label>
          <Input type="date" value={value.to ?? ""} className="h-8 text-xs" onChange={(e) => onChange({ type: "dateRange", from: value.from, to: e.target.value, preset: undefined })} />
        </div>
      </div>
    </div>
  );
}

function fmtBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// Helpers para os consumidores
export function multiMatch(value: FilterState, key: string, candidate: string | null | undefined): boolean {
  const v = value[key];
  if (!v || v.type !== "multi" || v.values.length === 0) return true;
  return Boolean(candidate) && v.values.includes(candidate as string);
}

export function dateMatch(value: FilterState, key: string, isoDate: string | null | undefined): boolean {
  const v = value[key];
  if (!v || v.type !== "dateRange") return true;
  if (!v.from && !v.to) return true;
  if (!isoDate) return false;
  if (v.from && isoDate < v.from) return false;
  if (v.to && isoDate > v.to) return false;
  return true;
}