import { supabase } from "./supabaseClient";

async function run() {
  const { data: cliente } = await supabase.from("elora_clientes").select("*").ilike("nome", "%Magistic%");
  console.log(JSON.stringify(cliente, null, 2));
}

run();
