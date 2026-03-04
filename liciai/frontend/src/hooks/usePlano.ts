import { useState, useEffect } from "react";
import { api, type PlanoInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function usePlano() {
  const { user } = useAuth();
  const [plano, setPlano] = useState<PlanoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlano(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getPlanoAtual()
      .then((data) => {
        setPlano(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erro ao carregar plano");
        setLoading(false);
      });
  }, [user]);

  return { plano, loading, error };
}
