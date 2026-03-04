import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useDetalhe } from "@/hooks/useDetalhe";
import type { OportunidadeDetalhe } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasRestantes(iso: unknown): number {
  if (!iso) return 0;
  const raw = (iso && typeof iso === "object" && "value" in (iso as object))
    ? (iso as { value: string }).value
    : iso;
  const d = new Date(String(raw ?? "").replace(" ", "T"));
  if (isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function fmt(val: unknown): string {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function fmtDate(iso: unknown): string {
  if (!iso) return "—";
  const raw = (iso && typeof iso === "object" && "value" in (iso as object))
    ? (iso as { value: string }).value
    : iso;
  try {
    const d = new Date(String(raw ?? "").replace(" ", "T"));
    if (isNaN(d.getTime())) return typeof raw === "string" ? raw.slice(0, 10) : "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

function situacaoCls(s?: string | null) {
  if (!s) return "bg-[var(--panel2)] border-[var(--line)] text-[var(--muted)]";
  if (/ativa|aberta|publicad/i.test(s)) return "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
  if (/suspensa|cancelada|revogada/i.test(s)) return "bg-red-500/10 border-red-500/40 text-red-400";
  return "bg-[var(--panel2)] border-[var(--line)] text-[var(--muted)]";
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Sk({ cls }: { cls?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--panel2)]", cls)} />;
}

/** Linha de comparação: label + um valor por coluna */
function CompRow({
  label,
  values,
  loading,
  highlight,
}: {
  label: string;
  values: (React.ReactNode | null | undefined)[];
  loading?: boolean[];
  highlight?: (vals: (React.ReactNode | null | undefined)[]) => number; // índice do melhor
}) {
  const bestIdx = highlight ? highlight(values) : -1;
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="flex items-center bg-[var(--panel2)] px-3 py-2 border-b border-[var(--line)]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">{label}</span>
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          className={cn(
            "px-3 py-2 border-b border-[var(--line)] text-xs font-semibold text-[var(--text)]",
            bestIdx === i && "bg-[var(--panel-gold)] text-[var(--gold)]"
          )}
        >
          {loading?.[i] ? <Sk cls="h-4 w-2/3" /> : (val ?? <span className="text-[var(--muted)]">—</span>)}
        </div>
      ))}
    </div>
  );
}

// ─── Coluna de uma oportunidade ───────────────────────────────────────────────

function ColHeader({ id, d, loading }: { id: string; d: OportunidadeDetalhe | null; loading: boolean }) {
  const dias = diasRestantes(d?.data_encerramento_proposta);
  const diasCls = dias <= 0 ? "text-red-400" : dias <= 5 ? "text-amber-400" : "text-[var(--muted)]";
  const pncpUrl = useMemo(() => {
    const m = id.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
    if (!m) return null;
    const [, c, anual, seq, ano] = m;
    return `https://pncp.gov.br/app/editais/${c}/${anual}/${ano}/${seq.padStart(6, "0")}`;
  }, [id]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      {loading ? (
        <>
          <Sk cls="h-3 w-1/2" />
          <Sk cls="h-10 w-full" />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {d?.situacao_nome && (
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-extrabold", situacaoCls(d.situacao_nome))}>
                {d.situacao_nome}
              </span>
            )}
            {dias > 0 && (
              <span className={cn("text-[10px] font-bold", diasCls)}>D-{dias}</span>
            )}
          </div>
          <p className="text-xs font-bold leading-snug text-[var(--text)] line-clamp-4">
            {d?.objeto_compra || id.slice(0, 30) + "…"}
          </p>
          <div className="flex items-center gap-2 mt-auto pt-1">
            <Link
              to={`/oportunidade/${encodeURIComponent(id)}`}
              className="text-[10px] font-bold text-[var(--gold)] hover:opacity-70 transition-opacity"
            >
              Ver detalhes →
            </Link>
            {pncpUrl && (
              <a href={pncpUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-[var(--muted)] hover:text-[var(--gold)] transition-colors">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Container que carrega cada coluna ───────────────────────────────────────

function ColData({ id }: { id: string }) {
  const { detalhe, loading } = useDetalhe(id);
  return { id, d: detalhe, loading };
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function ComparadorPage() {
  const [searchParams] = useSearchParams();
  const ids = useMemo(
    () => (searchParams.get("ids") ?? "").split(",").map(decodeURIComponent).filter(Boolean).slice(0, 3),
    [searchParams]
  );

  // Carrega cada coluna — sempre chama os hooks na mesma ordem (máx 3)
  const col0 = useDetalhe(ids[0] ?? null);
  const col1 = useDetalhe(ids[1] ?? null);
  const col2 = useDetalhe(ids[2] ?? null);

  const cols = ids.map((id, i) => {
    const c = [col0, col1, col2][i];
    return { id, d: c?.detalhe ?? null, loading: c?.loading ?? false };
  });

  function vals<T>(fn: (d: OportunidadeDetalhe) => T | null | undefined) {
    return cols.map((c) => c.d ? fn(c.d) : null);
  }

  function scoreHighlight(vs: (React.ReactNode | null | undefined)[]) {
    const nums = vs.map((v) => typeof v === "number" ? v : null);
    const max = Math.max(...nums.filter((n): n is number => n !== null));
    return nums.findIndex((n) => n === max && max > 0);
  }

  function valorHighlight(vs: (React.ReactNode | null | undefined)[]) {
    // Menor valor = melhor para quem compra (perspectiva do órgão), mas para empresa maior é mais atrativo
    // Destacamos o maior
    const nums = vs.map((v) => {
      if (typeof v === "string") return null;
      return null; // já formatados — não compara
    });
    return -1;
  }

  if (ids.length < 2) {
    return (
      <AppShell breadcrumb="Comparador">
        <div className="mx-auto max-w-5xl py-10 text-center space-y-3">
          <p className="text-sm text-[var(--muted)]">Selecione pelo menos 2 oportunidades no Radar para comparar.</p>
          <Link to="/radar" className="text-xs font-bold text-[var(--gold)] hover:opacity-70">
            ← Voltar ao Radar
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb="Comparador">
      <div className="mx-auto max-w-6xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/radar" className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--gold)] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Radar
          </Link>
          <div className="flex-1" />
          <TrendingUp className="h-3.5 w-3.5 text-[var(--gold)]" />
          <span className="text-xs font-extrabold text-[var(--text)]">Comparando {cols.length} oportunidades</span>
        </div>

        {/* Headers das colunas */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
          {cols.map(({ id, d, loading }) => (
            <ColHeader key={id} id={id} d={d} loading={loading} />
          ))}
        </div>

        {/* Tabela comparativa */}
        <div className="rounded-2xl border border-[var(--line)] overflow-hidden">
          {/* Score */}
          <CompRow
            label="Score"
            values={cols.map((c) => c.d?.score_oportunidade != null
              ? <span className={cn("font-black tabular-nums", c.d.score_oportunidade >= 70 ? "text-[var(--gold)]" : c.d.score_oportunidade >= 40 ? "text-sky-400" : "")}>
                  {c.d.score_oportunidade}
                </span>
              : null)}
            loading={cols.map((c) => c.loading)}
            highlight={(vs) => {
              const nums = vs.map((v, i) => cols[i]?.d?.score_oportunidade ?? -1);
              const max = Math.max(...nums);
              return nums.findIndex((n) => n === max && max > 0);
            }}
          />
          {/* Valor */}
          <CompRow
            label="Valor estimado"
            values={cols.map((c) => c.d?.valor_total_estimado != null ? fmt(c.d.valor_total_estimado) : null)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Prazo */}
          <CompRow
            label="Encerramento"
            values={cols.map((c) => {
              if (!c.d) return null;
              const dias = diasRestantes(c.d.data_encerramento_proposta);
              const cl = dias <= 0 ? "text-red-400" : dias <= 5 ? "text-amber-400 font-bold" : "";
              return <span className={cl}>{fmtDate(c.d.data_encerramento_proposta)}{dias > 0 ? ` (D-${dias})` : " — encerrada"}</span>;
            })}
            loading={cols.map((c) => c.loading)}
            highlight={(vs) => {
              const dias = cols.map((c) => diasRestantes(c.d?.data_encerramento_proposta));
              const actives = dias.filter((d) => d > 0);
              if (!actives.length) return -1;
              const max = Math.max(...actives);
              return dias.findIndex((d) => d === max);
            }}
          />
          {/* Órgão */}
          <CompRow
            label="Órgão"
            values={cols.map((c) => c.d?.nome_orgao)}
            loading={cols.map((c) => c.loading)}
          />
          {/* UF */}
          <CompRow
            label="UF"
            values={cols.map((c) => c.d?.uf)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Modalidade */}
          <CompRow
            label="Modalidade"
            values={cols.map((c) => c.d?.modalidade_nome)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Modo disputa */}
          <CompRow
            label="Modo de disputa"
            values={cols.map((c) => c.d?.modo_disputa_nome)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Situação */}
          <CompRow
            label="Situação"
            values={cols.map((c) => c.d?.situacao_nome
              ? <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", situacaoCls(c.d.situacao_nome))}>{c.d.situacao_nome}</span>
              : null)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Critério */}
          <CompRow
            label="Critério julgamento"
            values={cols.map((c) => c.d?.criterio_julgamento)}
            loading={cols.map((c) => c.loading)}
          />
          {/* Benefício */}
          <CompRow
            label="Benefício"
            values={cols.map((c) => c.d?.tipo_beneficio ?? "—")}
            loading={cols.map((c) => c.loading)}
          />
        </div>
      </div>
    </AppShell>
  );
}
