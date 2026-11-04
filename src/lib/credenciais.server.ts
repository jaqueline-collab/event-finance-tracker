/**
 * Cofre das chaves do Elora App (somente servidor).
 * AES-256-GCM com Web Crypto. Chave mestra em ELORA_CRED_MASTER_KEY
 * (32 bytes em base64). Formato guardado: base64(IV[12] + cifrado + tag).
 * Nunca registrar a chave nem pedaços dela em logs.
 */

const b64 = {
  enc(bytes: Uint8Array) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  },
  dec(texto: string): Uint8Array<ArrayBuffer> {
    const s = atob(texto);
    const out = new Uint8Array(new ArrayBuffer(s.length));
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

export async function importarChaveMestra(base64?: string): Promise<CryptoKey> {
  const valor = base64 ?? process.env["ELORA_CRED_MASTER_KEY"];
  if (!valor) throw new Error("cofre: segredo ELORA_CRED_MASTER_KEY não configurado.");
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = b64.dec(valor.trim());
  } catch {
    throw new Error("cofre: ELORA_CRED_MASTER_KEY não está em base64.");
  }
  if (bytes.length !== 32) throw new Error("cofre: ELORA_CRED_MASTER_KEY precisa ter 32 bytes.");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function cifrarChave(chave: string, mestra?: CryptoKey): Promise<string> {
  const k = mestra ?? (await importarChaveMestra());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(chave)),
  );
  const tudo = new Uint8Array(new ArrayBuffer(iv.length + cifrado.length));
  tudo.set(iv, 0);
  tudo.set(cifrado, iv.length);
  return b64.enc(tudo);
}

export async function decifrarChave(guardada: string, mestra?: CryptoKey): Promise<string> {
  const k = mestra ?? (await importarChaveMestra());
  const tudo = b64.dec(guardada);
  if (tudo.length < 12 + 16) throw new Error("cofre: valor cifrado inválido.");
  try {
    const claro = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: tudo.slice(0, 12) },
      k,
      tudo.slice(12),
    );
    return new TextDecoder().decode(claro);
  } catch {
    throw new Error("cofre: não foi possível decifrar a chave.");
  }
}

export const ultimos4De = (chave: string) => chave.slice(-4);

type Evento = "sincronizacao" | "teste" | "troca" | "migracao" | "leitura_automacao";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function registrarUso(
  clienteId: string,
  evento: Evento,
  ok: boolean,
  detalhe?: string | null,
  userId?: string | null,
) {
  try {
    const db = await admin();
    await db.from("elora_credenciais_uso").insert({
      cliente_id: clienteId,
      evento,
      ok,
      detalhe: detalhe ? detalhe.slice(0, 500) : null,
      user_id: userId ?? null,
    });
  } catch (e) {
    console.error("cofre: falha ao registrar uso", clienteId, evento);
  }
}

export async function gravarChaveElora(clienteId: string, chave: string, userId: string | null) {
  const limpa = chave.trim();
  if (!limpa) throw new Error("cofre: chave vazia.");
  const db = await admin();
  const cifrada = await cifrarChave(limpa);
  const agora = new Date().toISOString();
  const { error } = await db.from("elora_credenciais").upsert(
    {
      cliente_id: clienteId,
      chave_cifrada: cifrada,
      versao_chave: 1,
      ultimos4: ultimos4De(limpa),
      atualizado_em: agora,
      rotacionada_em: agora,
    },
    { onConflict: "cliente_id" },
  );
  if (error) throw new Error(`cofre: ${error.message}`);
  await registrarUso(clienteId, "troca", true, null, userId);
}

export async function estadoCofre(clienteId: string) {
  const db = await admin();
  const { data } = await db
    .from("elora_credenciais")
    .select("ultimos4, rotacionada_em, criado_em")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  return data
    ? {
        noCofre: true as const,
        ultimos4: String(data.ultimos4),
        trocadaEm: (data.rotacionada_em ?? data.criado_em) as string | null,
      }
    : { noCofre: false as const, ultimos4: null, trocadaEm: null };
}

/** Lê do cofre; sem cofre, cai na coluna antiga (com aviso). Vazia = ausente. */
export async function obterChaveElora(clienteId: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db
    .from("elora_credenciais")
    .select("chave_cifrada")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (data?.chave_cifrada) {
    const chave = await decifrarChave(String(data.chave_cifrada));
    if (chave.trim()) return chave;
  }
  const { data: antiga } = await db
    .from("elora_integracao_contas")
    .select("api_key")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  const legado = antiga?.api_key ? String(antiga.api_key).trim() : "";
  if (legado) {
    console.warn(`cofre: cliente ${clienteId} ainda usa a chave antiga (fora do cofre).`);
    return legado;
  }
  return null;
}
