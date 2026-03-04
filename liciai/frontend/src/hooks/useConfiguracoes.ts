import { useState, useEffect, useCallback } from "react";
import { api, type PalavraChave } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function useConfiguracoes() {
  const { user } = useAuth();
  const [palavras, setPalavras] = useState<PalavraChave[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getClienteConfiguracoes();
      setPalavras(data.palavrasChave);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (palavra: string) => {
    if (!palavra.trim()) return;
    setSaving(true);
    try {
      await api.addPalavraChave(palavra.trim().toLowerCase());
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (palavra: string) => {
    setSaving(true);
    try {
      await api.removePalavraChave(palavra);
      setPalavras((prev) => prev.filter((p) => p.palavra_chave !== palavra));
    } finally {
      setSaving(false);
    }
  };

  return { palavras, loading, saving, error, add, remove };
}
