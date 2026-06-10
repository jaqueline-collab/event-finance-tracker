import { supabase } from "./supabaseClient";

async function run() {
  const { data: movimentos } = await supabase.from("elora_movimentos").select("*");
  if (!movimentos) return;
  console.log(JSON.stringify(movimentos, null, 2));
}

run();
