import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  origem: z.string().trim().max(200).default(""),
});

/** Inscrição pública na newsletter. Só grava pelo servidor (sem GRANT de escrita para o navegador). */
export const inscreverNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsletter_inscricoes")
      .insert({ email: data.email, origem: data.origem });
    // 23505 = e-mail já inscrito: tratamos como sucesso, sem duplicar.
    if (error && error.code !== "23505") {
      console.error("newsletter:", error.message);
      throw new Error("Não foi possível concluir a inscrição agora. Tente de novo em instantes.");
    }
    return { ok: true, jaInscrito: error?.code === "23505" };
  });
