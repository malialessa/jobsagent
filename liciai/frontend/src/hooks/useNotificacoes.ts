import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const LS_KEY = "liciai_lastSeen";

/** Retorna o ISO string do último momento em que o usuário "viu" o radar. */
function getLastSeen(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
}

/**
 * Verifica quantas novas oportunidades existem desde a última visita.
 * Persiste "último acesso" em localStorage.
 * Faz polling a cada `intervalMs` (default: 5 minutos).
 */
export function useNotificacoes(intervalMs = 5 * 60 * 1000) {
  const [count, setCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(getLastSeen);

  const check = useCallback(async () => {
    try {
      const { count: n } = await api.countNovas(lastSeen);
      setCount(n);
    } catch { /* silencia */ }
  }, [lastSeen]);

  // Verifica na montagem e em polling
  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  /** Chama quando o usuário abre o radar — zera o badge e salva timestamp. */
  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LS_KEY, now);
    setLastSeen(now);
    setCount(0);
  }, []);

  return { count, markSeen };
}
