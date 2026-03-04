import { useState, useEffect, useRef } from "react";
import { api, type OportunidadeDetalhe } from "@/lib/api";

interface UseDetalheResult {
  detalhe: OportunidadeDetalhe | null;
  loading: boolean;
  error: string | null;
}

/**
 * Busca os detalhes completos de uma oportunidade pelo id_pncp.
 * Aborta requests anteriores automaticamente quando o id muda.
 */
export function useDetalhe(id: string | null | undefined): UseDetalheResult {
  const [detalhe, setDetalhe] = useState<OportunidadeDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      setDetalhe(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Abort request anterior
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    api
      .getDetalhesOportunidade(id)
      .then((data) => {
        setDetalhe(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Erro ao carregar detalhes.");
        setLoading(false);
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [id]);

  return { detalhe, loading, error };
}
