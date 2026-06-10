import { supabase } from "./supabaseClient";

async function run() {
  const { data: clientes, error } = await supabase.from("elora_clientes").select("*");
  if (error) console.error(error);
  else console.log(JSON.stringify(clientes, null, 2));
}

run();
