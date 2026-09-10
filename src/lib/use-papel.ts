import { useEffect, useState } from "react";
import { getPapelUsuario } from "@/lib/parceiro.functions";

export interface PapelUsuario {
  isInterno: boolean;
  parceiroId: string | null;
  clienteId: string | null;
  veValores: boolean;
  loading: boolean;
}

const CACHE_KEY = "elora.papel.cache.v1";

function readCache(): Omit<PapelUsuario, "loading"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Detecta se o login é da equipe interna ou de uma pessoa de parceiro. */
export function usePapelUsuario(temSessao = true): PapelUsuario {
  const cached = readCache();
  const [papel, setPapel] = useState<Omit<PapelUsuario, "loading">>(
    cached ?? { isInterno: true, parceiroId: null, clienteId: null, veValores: false },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!temSessao) {
      setLoading(false);
      return;
    }
    let cancelado = false;
    getPapelUsuario()
      .then((r) => {
        if (cancelado) return;
        const valor = {
          isInterno: r.isInterno,
          parceiroId: r.parceiroId,
          clienteId: r.clienteId ?? null,
          veValores: r.veValores,
        };
        setPapel(valor);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(valor));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* mantém último papel conhecido */
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [temSessao]);

  return { ...papel, loading };
}

/** Para onde levar a pessoa logada ao clicar em "Meu painel". */
export function useDestinoPainel(temSessao = true): "/dashboard" | "/parceiro" | "/cliente" {
  const papel = usePapelUsuario(temSessao);
  if (!papel.isInterno && papel.clienteId) return "/cliente";
  if (!papel.isInterno && papel.parceiroId) return "/parceiro";
  return "/dashboard";
}
