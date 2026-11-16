import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calcularPainelVisual } from "@/lib/painel-visual.server";
import { linhasPadrao } from "@/lib/matriz.server";
import { writeFileSync } from "fs";
const db: any = supabaseAdmin; const CL = "8c0ojhr2";
const PER = [{ de: "2026-10-14", ate: "2026-11-12" }, { de: "2026-09-22", ate: "2026-10-03" }];
const out: any = {};
for (const p of PER) {
  const r: any = await calcularPainelVisual(db, CL, p, {});
  const rel: Record<string, number> = {};
  for (const l of await linhasPadrao(db, CL, p) as any[]) rel[l.atendente || "Sem informação"] = (rel[l.atendente || "Sem informação"] ?? 0) + l.conversas_total_dia;
  out[`${p.de}_${p.ate}`] = { painel: r.atendentes, relatorio: rel };
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); process.exit(0);
