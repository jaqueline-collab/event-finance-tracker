import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client-configured";
import { getMeuPerfil, type PerfilPayload } from "@/lib/perfil.functions";

const CACHE_KEY = "elora.perfil.cache.v1";

export interface PerfilLocal extends PerfilPayload {
  avatarUrl: string | null;
}

function lerCache(): PerfilLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PerfilLocal) : null;
  } catch {
    return null;
  }
}

function gravarCache(valor: PerfilLocal | null) {
  if (typeof window === "undefined") return;
  try {
    if (valor) window.localStorage.setItem(CACHE_KEY, JSON.stringify(valor));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Iniciais para a bolinha: nome, senão e-mail. */
export function iniciaisDe(nome?: string | null, email?: string | null): string {
  const base = (nome ?? "").trim();
  if (base) {
    const partes = base.split(/\s+/).filter(Boolean);
    const letras = partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}` : partes[0].slice(0, 2);
    return letras.toUpperCase();
  }
  const mail = (email ?? "").trim();
  return mail ? mail.slice(0, 2).toUpperCase() : "?";
}

async function urlAssinada(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

/**
 * Sessão + perfil do usuário logado. Usado tanto no site institucional quanto
 * no painel, para o topo mostrar a bolinha com foto/iniciais.
 */
export function usePerfil() {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilLocal | null>(() => lerCache());
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const dados = await getMeuPerfil();
      const avatarUrl = await urlAssinada(dados.avatarPath);
      const valor: PerfilLocal = { ...dados, avatarUrl };
      setPerfil(valor);
      gravarCache(valor);
    } catch {
      /* mantém último perfil conhecido */
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      if (!ativo) return;
      setSession(s);
      if (!s) {
        setPerfil(null);
        gravarCache(null);
      } else if (evento === "SIGNED_IN" || evento === "USER_UPDATED") {
        void carregar();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setCarregando(false);
      if (data.session) void carregar();
      else {
        setPerfil(null);
        gravarCache(null);
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [carregar]);

  const email = perfil?.email ?? session?.user?.email ?? null;

  return {
    session,
    perfil,
    email,
    nome: perfil?.nome ?? null,
    avatarUrl: perfil?.avatarUrl ?? null,
    iniciais: iniciaisDe(perfil?.nome, email),
    carregando,
    recarregar: carregar,
  };
}
