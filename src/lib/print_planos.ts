import { supabase } from "./supabaseClient";

async function run() {
  const { data: planos } = await supabase.from("elora_planos").select("*");
  console.log(JSON.stringify(planos, null, 2));
}
run();
