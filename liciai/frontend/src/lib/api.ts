import { auth } from "@/lib/firebase";

// Em produção a URL é relativa (/api) → Firebase Hosting faz proxy para a Cloud Function
// sem expor URL direta e sem CORS. Em dev local crie frontend/.env.local:
//   VITE_API_BASE=http://127.0.0.1:5001/uniquex-487718/us-east1/api
export const API_BASE: string = import.meta.env.VITE_API_BASE || "/api";

// ─── Helper genérico ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Aguarda o Firebase restaurar a sessão do storage antes de tentar pegar o token.
  // Sem isso, currentUser é null em page loads diretos e a request vai sem Authorization → 403.
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let errBody: any;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: res.statusText };
    }
    const err = new ApiError(
      errBody?.error?.message || errBody?.message || "Erro desconhecido",
      res.status,
      errBody?.error?.code
    );
    throw err;
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isPlanLimit() {
    return (
      this.status === 403 &&
      (this.code === "QUOTA_EXCEEDED" ||
        this.code === "UF_LIMIT_EXCEEDED" ||
        this.code === "PLAN_INACTIVE")
    );
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Oportunidade {
  id_pncp?: string;
  numero_controle_pncp?: string;
  objeto_compra: string;
  uf: string;
  data_encerramento_proposta: string;
  valor_total_estimado?: number;
  modalidade_nome?: string;
  score_oportunidade?: number;
  razao_social_orgao?: string;
  tipo_beneficio?: string;
  situacao_nome?: string;
}

/** Tipo completo retornado por getDetalhesOportunidade (todos os campos de core.contratacoes) */
export interface OportunidadeDetalhe {
  id_pncp: string;
  objeto_compra: string;
  uf: string;
  // Classificação
  modalidade_nome?: string;
  modo_disputa_nome?: string;
  situacao_nome?: string;
  // Financeiro
  valor_total_estimado?: number;
  // Datas (serializado como string pelo serializeBqRow)
  data_publicacao_pncp?: string;
  data_abertura_proposta?: string;
  data_encerramento_proposta?: string;
  // Órgão
  cnpj_orgao?: string;
  nome_orgao?: string;
  nome_unidade_orgao?: string;
  // Campos enriquecidos (adicionados 2026-06)
  tipo_beneficio?: string;        // tipoBeneficioNome da API PNCP
  criterio_julgamento?: string;   // criterioJulgamentoNome
  amparo_legal?: string;          // amparoLegal.descricao
  categoria_processo?: string;    // categoriaProcessoNome
  // Meta
  ingest_time?: string;
  hash_payload?: string;
  // Campos do scoring (quando vem do getScoredOportunidades)
  score_oportunidade?: number;
  razao_social_orgao?: string;
  numero_controle_pncp?: string;
}

export interface ItemContratacao {
  numeroItem?: number;
  descricao: string;
  quantidade?: number;
  unidadeMedida?: string;
  valorUnitarioEstimado?: number;
  valorTotal?: number;
  tipoBeneficioNome?: string;
  situacaoCompraItemNome?: string;
  materialOuServico?: string;
  materialOuServicoNome?: string;
  criterioJulgamentoNome?: string;
  orcamentoSigiloso?: boolean;
  ncmNbsCodigo?: string;
  ncmNbsDescricao?: string;
}

export interface OportunidadesResponse {
  items: Oportunidade[];
  nextOffset: number | null;
  plano?: string;
}

export interface PlanoLimites {
  uf: number;
  oportunidades: number;
  docs: number;
  produtos: number;
}

export interface PlanoInfo {
  plano: "free" | "pro" | "enterprise" | "gov";
  status_pagamento: string;
  limites: PlanoLimites;
  tenant_id: string;
  trial?: {
    ativo: boolean;
    dias_restantes: number;
    trial_fim: string;
  } | null;
}

export interface PalavraChave {
  palavra_chave: string;
  peso: number;
}

export interface ConfiguracoesResponse {
  palavrasChave: PalavraChave[];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  /** Retorna oportunidades ranqueadas por score para o usuário autenticado. */
  getScoredOportunidades(params: {
    uf?: string; q?: string; modalidade?: string;
    valor_min?: number; valor_max?: number; prazo_max?: number;
    beneficio?: string; situacao?: string;
    limit?: number; offset?: number;
  }) {
    const sp = new URLSearchParams();
    if (params.uf) sp.set("uf", params.uf);
    if (params.q) sp.set("q", params.q);
    if (params.modalidade) sp.set("modalidade", params.modalidade);
    if (params.valor_min) sp.set("valor_min", String(params.valor_min));
    if (params.valor_max) sp.set("valor_max", String(params.valor_max));
    if (params.prazo_max) sp.set("prazo_max", String(params.prazo_max));
    if (params.beneficio) sp.set("beneficio", params.beneficio);
    if (params.situacao) sp.set("situacao", params.situacao);
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<OportunidadesResponse>(`/getScoredOportunidades${qs}`);
  },

  /** Oportunidades públicas (sem score personalizado). */
  getOportunidades(params: {
    uf?: string; q?: string; modalidade?: string;
    valor_min?: number; valor_max?: number; prazo_max?: number;
    beneficio?: string; situacao?: string;
    limit?: number; offset?: number;
  }) {
    const sp = new URLSearchParams();
    if (params.uf) sp.set("uf", params.uf);
    if (params.q) sp.set("q", params.q);
    if (params.modalidade) sp.set("modalidade", params.modalidade);
    if (params.valor_min) sp.set("valor_min", String(params.valor_min));
    if (params.valor_max) sp.set("valor_max", String(params.valor_max));
    if (params.prazo_max) sp.set("prazo_max", String(params.prazo_max));
    if (params.beneficio) sp.set("beneficio", params.beneficio);
    if (params.situacao) sp.set("situacao", params.situacao);
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<OportunidadesResponse>(`/getOportunidades${qs}`);
  },

  /** Informações do plano do usuário autenticado. */
  getPlanoAtual() {
    return apiFetch<PlanoInfo>("/getPlanoAtual");
  },

  /** Palavras-chave e pesos de filtro do usuário. */
  getClienteConfiguracoes() {
    return apiFetch<ConfiguracoesResponse>("/getClienteConfiguracoes");
  },

  /** Adiciona ou atualiza uma palavra-chave de filtro. */
  addPalavraChave(palavraChave: string, peso = 1) {
    return apiFetch<{ success: boolean }>("/addPalavraChave", {
      method: "POST",
      body: JSON.stringify({ palavraChave, peso }),
    });
  },

  /** Remove uma palavra-chave de filtro. */
  removePalavraChave(palavraChave: string) {
    return apiFetch<{ success: boolean }>("/removePalavraChave", {
      method: "POST",
      body: JSON.stringify({ palavraChave }),
    });
  },

  /** Detalhes completos de uma oportunidade (todos os campos de core.contratacoes). */
  getDetalhesOportunidade(id: string) {
    return apiFetch<OportunidadeDetalhe>(`/getDetalhesOportunidade?id=${encodeURIComponent(id)}`);
  },

  /** Itens do processo via proxy PNCP — retorna lista de itens da licitação. */
  getItensPNCP(idPncp: string) {
    return apiFetch<{ items: ItemContratacao[] }>(`/getItensPNCP?id_pncp=${encodeURIComponent(idPncp)}`);
  },

  /** Gera análise de IA (Gemini) sobre uma oportunidade. */
  analyzeOportunidade(idPncp: string) {
    return apiFetch<{ analysis: string; cached?: boolean }>("/analyzeOportunidade", {
      method: "POST",
      body: JSON.stringify({ id_pncp: idPncp }),
    });
  },

  /** Adiciona/remove uma oportunidade dos favoritos do usuário. */
  toggleFavorito(idPncp: string) {
    return apiFetch<{ favorited: boolean }>("/toggleFavorito", {
      method: "POST",
      body: JSON.stringify({ id_pncp: idPncp }),
    });
  },

  /** Lista os id_pncp favoritados pelo usuário. */
  getFavoritos() {
    return apiFetch<{ favoritos: string[] }>("/getFavoritos");
  },

  /** Conta oportunidades ingeridas após a data informada (para notificações). */
  countNovas(since: string) {
    return apiFetch<{ count: number }>(`/countNovas?since=${encodeURIComponent(since)}`);
  },

  /** Cria sessão de checkout Stripe para o plano especificado. */
  createCheckout(plano: "pro" | "enterprise") {
    return apiFetch<{ url: string }>("/createCheckout", {
      method: "POST",
      body: JSON.stringify({ plano }),
    });
  },

  /** Registra erro de frontend no BigQuery. */
  logError(mensagem: string, extra?: Record<string, any>) {
    return apiFetch<{ message: string }>("/logError", {
      method: "POST",
      body: JSON.stringify({ mensagem, ...extra }),
    });
  },

  /** Registra visualização de oportunidade (telemetria Sprint 3). */
  logView(idPncp: string) {
    return apiFetch<void>("/log/view", {
      method: "POST",
      body: JSON.stringify({ id_pncp: idPncp }),
    }).catch(err => {
      console.warn("Falha ao registrar view:", err);
    });
  },

  /** Registra compartilhamento de oportunidade (telemetria Sprint 3). */
  logShare(idPncp: string, metodo: string = "link") {
    return apiFetch<void>("/log/share", {
      method: "POST",
      body: JSON.stringify({ id_pncp: idPncp, metodo }),
    }).catch(err => {
      console.warn("Falha ao registrar share:", err);
    });
  },
};
