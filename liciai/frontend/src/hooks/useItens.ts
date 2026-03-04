import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { ItemContratacao } from "@/lib/api";

interface UseItensResult {
  itens: ItemContratacao[];
  loading: boolean;
  error: string | null;
}

/**
 * Busca os itens de um processo via proxy da API PNCP.
 * Só dispara quando idPncp é não-vazio.
 */
export function useItens(idPncp: string | undefined | null): UseItensResult {
  const [itens, setItens] = useState<ItemContratacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idPncp) {
      setItens([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    api
      .getItensPNCP(idPncp)
      .then((res) => {
        if (!ctrl.signal.aborted) setItens(res.items ?? []);
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.error("useItens:", err);
          setError(err?.message ?? "Erro ao buscar itens");
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [idPncp]);

  return { itens, loading, error };
}
