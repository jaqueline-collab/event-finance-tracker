import { useEffect, useState } from "react";
import { getPapelUsuario } from "@/lib/parceiro.functions";

export interface PapelUsuario {
  isInterno: boolean;
  parceiroId: string | null;
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
export function usePapelUsuario(): PapelUsuario {
  const cached = readCache();
  const [papel, setPapel] = useState<Omit<PapelUsuario, "loading">>(
    cached ?? { isInterno: true, parceiroId: null, veValores: false },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    getPapelUsuario({ data: undefined as never })
      .then((r) => {
        if (cancelado) return;
        const valor = { isInterno: r.isInterno, parceiroId: r.parceiroId, veValores: r.veValores };
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
  }, []);

  return { ...papel, loading };
}
