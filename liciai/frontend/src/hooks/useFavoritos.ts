import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

/**
 * Mantém um Set com os id_pncp favoritados pelo usuário.
 * Faz toggle otimista: atualiza localmente imediatamente, sincroniza com BQ.
 */
export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getFavoritos()
      .then(({ favoritos: ids }) => {
        if (!cancelled) setFavoritos(new Set(ids));
      })
      .catch(() => { /* silencia — usuário pode não estar logado ainda */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async (idPncp: string) => {
    // Optimistic update
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(idPncp)) next.delete(idPncp); else next.add(idPncp);
      return next;
    });
    try {
      await api.toggleFavorito(idPncp);
    } catch {
      // Reverter se falhar
      setFavoritos((prev) => {
        const next = new Set(prev);
        if (next.has(idPncp)) next.delete(idPncp); else next.add(idPncp);
        return next;
      });
    }
  }, []);

  return { favoritos, loading, toggle };
}
