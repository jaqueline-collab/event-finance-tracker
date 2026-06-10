import { supabase } from "./supabaseClient";

async function main() {
  console.log("Deletando clientes do plano-acompanhamento...");

  // Busca os clientes
  const { data: clientes, error: fetchError } = await supabase
    .from("elora_clientes")
    .select("id")
    .eq("plano_id", "plano-acompanhamento");

  if (fetchError) {
    console.error("Erro ao buscar clientes:", fetchError);
    return;
  }

  if (!clientes || clientes.length === 0) {
    console.log("Nenhum cliente encontrado no plano-acompanhamento.");
    return;
  }

  console.log(`Encontrados ${clientes.length} clientes. Deletando...`);

  // Deleta os movimentos desses clientes
  const clientIds = clientes.map((c: any) => c.id);
  const { error: movError } = await supabase
    .from("elora_movimentos")
    .delete()
    .in("cliente_id", clientIds);

  if (movError) {
    console.error("Erro ao deletar movimentos:", movError);
  }

  // Deleta os clientes
  const { error: deleteError } = await supabase
    .from("elora_clientes")
    .delete()
    .in("id", clientIds);

  if (deleteError) {
    console.error("Erro ao deletar clientes:", deleteError);
  } else {
    console.log("Clientes deletados com sucesso.");
  }
}

main();
