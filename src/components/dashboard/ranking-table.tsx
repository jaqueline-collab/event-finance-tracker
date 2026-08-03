import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface RankingColumn<T> {
  key: string;
  label: string;
  value: (row: T) => number | string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

interface RankingTableProps<T> {
  rows: T[];
  columns: RankingColumn<T>[];
  rowKey: (row: T) => string;
  defaultSort: string;
  defaultDir?: "asc" | "desc";
  emptyLabel?: string;
  limit?: number;
}

export function RankingTable<T>({
  rows,
  columns,
  rowKey,
  defaultSort,
  defaultDir = "desc",
  emptyLabel = "Sem dados.",
  limit,
}: RankingTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [dir, setDir] = useState<"asc" | "desc">(defaultDir);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const factor = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb), "pt-BR") * factor;
    });
  }, [rows, columns, sortKey, dir]);

  const visible = limit ? sorted.slice(0, limit) : sorted;

  const toggle = (key: string) => {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir("desc");
    }
  };

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap",
                  c.align === "right" && "text-right",
                  c.className,
                )}
                onClick={() => toggle(c.key)}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    c.align === "right" && "flex-row-reverse",
                  )}
                >
                  {c.label}
                  {sortKey === c.key ? (
                    dir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 opacity-40" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap text-sm",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.render ? c.render(row) : String(c.value(row))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}