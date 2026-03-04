import { useState, useEffect, useCallback } from "react";
import { api, ApiError, type Oportunidade } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface State {
  items: Oportunidade[];
  loading: boolean;
  error: string | null;
  planLimited: boolean;
  plano: string | null;
  hasMore: boolean;
  offset: number;
}

export function useOportunidades(params: {
  uf?: string; q?: string; modalidade?: string;
  valor_min?: number; valor_max?: number; prazo_max?: number;
  beneficio?: string; situacao?: string;
} = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    error: null,
    planLimited: false,
    plano: null,
    hasMore: false,
    offset: 0,
  });

  const fetch = useCallback(async (reset = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const offset = reset ? 0 : state.offset;
      const fn = user
        ? () => api.getScoredOportunidades({ ...params, limit: 20, offset })
        : () => api.getOportunidades({ ...params, limit: 20, offset });
      const data = await fn();
      setState((s) => ({
        ...s,
        items: reset ? data.items : [...s.items, ...data.items],
        loading: false,
        hasMore: data.nextOffset !== null,
        offset: data.nextOffset ?? offset,
        plano: data.plano ?? null,
        planLimited: false,
      }));
    } catch (e) {
      if (e instanceof ApiError && e.isPlanLimit) {
        setState((s) => ({
          ...s,
          loading: false,
          planLimited: true,
        }));
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Erro ao carregar oportunidades",
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.uf, params.q, params.modalidade, params.valor_min, params.valor_max, params.prazo_max, params.beneficio, params.situacao]);

  useEffect(() => {
    fetch(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.uf, params.q, params.modalidade, params.valor_min, params.valor_max, params.prazo_max, params.beneficio, params.situacao]);

  return { ...state, refetch: () => fetch(true), loadMore: () => fetch(false) };
}
