import { supabaseAdmin } from "@/integrations/supabase/client.server";
const db:any=supabaseAdmin; const {data}=await db.from("elora_dashboard_visoes").select("nome, filtros").eq("cliente_id","8c0ojhr2").eq("nome","Agendamentos").single();
const c=data.filtros.cartoes.find((x:any)=>x.id==="itens-agend"); console.log(c.titulo, c.indicadoresItens, JSON.stringify(c.colunas?.map((x:any)=>x.campo)));
process.exit(0);
