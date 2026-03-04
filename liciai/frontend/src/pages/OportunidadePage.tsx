import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ExternalLink, Building2, Calendar,
  Swords, Package, ShoppingCart, Copy, Check,
  AlertCircle, Search, Sparkles, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useDetalhe } from "@/hooks/useDetalhe";
import { useItens } from "@/hooks/useItens";
import type { ItemContratacao } from "@/lib/api";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Helpers locais ───────────────────────────────────────────────────────────

function diasRestantes(iso: unknown): number {
  if (!iso) return 0;
  const raw = (iso && typeof iso === "object" && "value" in (iso as object))
    ? (iso as { value: string }).value
    : iso;
  const d = new Date(String(raw ?? "").replace(" ", "T"));
  if (isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function formatDate(iso: unknown, withTime = false): string {
  if (!iso) return "—";
  const raw = (iso && typeof iso === "object" && "value" in (iso as object))
    ? (iso as { value: string }).value
    : iso;
  const str = String(raw ?? "").replace(" ", "T");
  if (!str) return "—";
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return typeof str === "string" ? str.slice(0, 10) : "—";
    return withTime
      ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return typeof str === "string" ? str.slice(0, 10) : "—";
  }
}

function formatCurrency(val: unknown): string {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function formatCNPJ(v?: string | null): string {
  if (!v || v.length !== 14) return v ?? "—";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

// ─── Mini markdown renderer ────────────────────────────────────────────────────
// Converte o subconjunto de markdown que Gemini retorna em HTML seguro.
function mdToHtml(text: string): string {
  return text
    // Títulos ## e ###
    .replace(/^###\s+(.+)$/gm, '<span class="block font-extrabold text-[var(--text)] mt-2">$1</span>')
    .replace(/^##\s+(.+)$/gm, '<span class="block font-extrabold text-[var(--text)] mt-3">$1</span>')
    .replace(/^#\s+(.+)$/gm, '<span class="block font-extrabold text-[var(--text)] mt-3">$1</span>')
    // Bold e italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[var(--text)]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="opacity-80">$1</em>')
    // Bullets
    .replace(/^[-*]\s+(.+)$/gm, '<span class="flex gap-1.5"><span class="opacity-40 shrink-0">•</span><span>$1</span></span>')
    // Linhas em branco → espaço vertical
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--panel2)]", className)} />;
}

function Field({ label, value, loading: l, full, mono }: {
  label: string; value?: string | null; loading?: boolean; full?: boolean; mono?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">{label}</p>
      {l ? <Sk className="mt-1 h-4 w-3/4" /> : (
        <p className={cn("mt-0.5 text-sm font-semibold leading-snug text-[var(--text)]", mono && "font-mono text-xs break-all")}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function SectionCard({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel2)] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-[var(--gold)] opacity-70">{icon}</div>
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded border border-[var(--line)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function PrazoBadge({ iso }: { iso: unknown }) {
  const dias = diasRestantes(iso);
  const base = "rounded-full border px-2.5 py-0.5 text-xs font-bold";
  if (dias <= 0) return <span className={cn(base, "bg-red-400/10 border-red-400/30 text-red-400")}>Encerrado</span>;
  if (dias <= 2) return <span className={cn(base, "bg-red-400/10 border-red-400/30 text-red-400 animate-pulse")}>D-{dias} — urgente</span>;
  if (dias <= 7) return <span className={cn(base, "bg-amber-400/10 border-amber-400/30 text-amber-400")}>D-{dias}</span>;
  return <span className={cn(base, "bg-[var(--panel2)] border-[var(--line)] text-[var(--muted)]")}>{dias} dias</span>;
}

function ItemCard({ item }: { item: ItemContratacao }) {
  const sigiloso = item.orcamentoSigiloso;
  const meEpp = item.tipoBeneficioNome && /ME|EPP/i.test(item.tipoBeneficioNome);
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-snug text-[var(--text)]">{item.descricao || "—"}</p>
        {item.numeroItem != null && (
          <span className="shrink-0 rounded-full bg-[var(--panel2)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
            #{item.numeroItem}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        {item.quantidade != null && item.unidadeMedida && (
          <span>{item.quantidade} {item.unidadeMedida}</span>
        )}
        {sigiloso ? (
          <span className="font-semibold">🔒 Orçamento sigiloso</span>
        ) : (
          <>
            {item.valorUnitarioEstimado != null && item.valorUnitarioEstimado > 0 && (
              <span>{formatCurrency(item.valorUnitarioEstimado)} / un.</span>
            )}
            {item.valorTotal != null && item.valorTotal > 0 && (
              <span className="font-bold text-[var(--text)]">{formatCurrency(item.valorTotal)}</span>
            )}
          </>
        )}
        {item.criterioJulgamentoNome && <span className="opacity-70">{item.criterioJulgamentoNome}</span>}
        {item.situacaoCompraItemNome && <span className="opacity-70">{item.situacaoCompraItemNome}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {item.materialOuServicoNome && (
          <span className="rounded border border-[var(--line)] bg-[var(--panel2)] px-1.5 py-0 text-[10px] font-bold text-[var(--muted)]">
            {item.materialOuServicoNome}
          </span>
        )}
        {item.ncmNbsCodigo && (
          <span
            className="rounded border border-[var(--line)] bg-[var(--panel2)] px-1.5 py-0 font-mono text-[10px] text-[var(--muted)]"
            title={item.ncmNbsDescricao ?? "Código NCM/NBS"}
          >
            NCM {item.ncmNbsCodigo}
          </span>
        )}
        {meEpp && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-extrabold text-emerald-400">
            ME/EPP
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function OportunidadePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? "");

  const [itemQ, setItemQ] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { detalhe: d, loading } = useDetalhe(id || null);

  async function handleGenerateAI() {
    if (!id || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.analyzeOportunidade(id);
      setAiAnalysis(res.analysis);
    } catch (e: any) {
      setAiError(e?.message ?? "Erro ao gerar análise.");
    } finally {
      setAiLoading(false);
    }
  }
  const { itens, loading: itensLoading, error: itensError } = useItens(id || null);

  const filteredItens = useMemo(() => {
    if (!itemQ) return itens;
    const q = itemQ.toLowerCase();
    return itens.filter(
      (it) =>
        it.descricao?.toLowerCase().includes(q) ||
        (it.ncmNbsCodigo ?? "").includes(itemQ)
    );
  }, [itens, itemQ]);

  const pncpUrl = useMemo(() => {
    if (!id) return null;
    const m = id.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
    if (!m) return null;
    const [, c, anual, seq, ano] = m;
    return `https://pncp.gov.br/app/editais/${c}/${anual}/${ano}/${seq.padStart(6, "0")}`;
  }, [id]);

  const dias = diasRestantes(d?.data_encerramento_proposta);
  const score = d?.score_oportunidade;
  const scoreCls = !score ? "" : score >= 70 ? "text-[var(--gold)]" : score >= 40 ? "text-sky-400" : "text-[var(--muted)]";
  const situacaoCls = !d?.situacao_nome ? "" :
    /ativa|aberta|publicad/i.test(d.situacao_nome) ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" :
    /suspensa|cancelada|revogada/i.test(d.situacao_nome) ? "bg-red-500/10 border-red-500/40 text-red-400" :
    "bg-[var(--panel2)] border-[var(--line)] text-[var(--muted)]";

  const breadcrumb = loading
    ? "Oportunidade"
    : (d?.objeto_compra?.slice(0, 48) ?? id.slice(0, 24)) + (d?.objeto_compra && d.objeto_compra.length > 48 ? "…" : "");

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="mx-auto max-w-6xl space-y-4">

        {/* ── Barra superior ── */}
        <div className="flex items-center gap-3">
          <Link
            to="/radar"
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Radar
          </Link>
          <div className="flex-1" />
          <button
            onClick={handleGenerateAI}
            disabled={aiLoading || loading}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(228,164,20,.35)] bg-[var(--panel-gold)] px-3 py-1.5 text-xs font-extrabold text-[var(--gold)] hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {aiLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            {aiLoading ? "Analisando…" : "Análise de IA"}
          </button>
          {pncpUrl && (
            <a
              href={pncpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver no PNCP
            </a>
          )}
        </div>

        {/* ── Hero ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Sk className="h-6 w-3/4" />
              <Sk className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {d?.situacao_nome && (
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold", situacaoCls)}>
                    {d.situacao_nome}
                  </span>
                )}
                <PrazoBadge iso={d?.data_encerramento_proposta} />
                {d?.uf && (
                  <span className="rounded-full border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                    {d.uf}
                  </span>
                )}
                {d?.modalidade_nome && (
                  <span className="rounded-full border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                    {d.modalidade_nome}
                  </span>
                )}
              </div>
              <h1 className="text-sm font-bold leading-snug text-[var(--text)]">
                {d?.objeto_compra || "—"}
              </h1>
              <div className="flex flex-wrap items-end gap-6 pt-1">
                {d?.valor_total_estimado != null && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">Valor estimado</p>
                    <p className="text-lg font-black tabular-nums text-[var(--text)]">
                      {formatCurrency(d.valor_total_estimado)}
                    </p>
                  </div>
                )}
                {score != null && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">Score</p>
                    <p className={cn("text-lg font-black tabular-nums", scoreCls)}>{score}</p>
                  </div>
                )}
                {d?.nome_orgao && (
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">Órgão</p>
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{d.nome_orgao}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Análise de IA ── */}
        {(aiAnalysis || aiError) && (
          <div className="rounded-2xl border border-[rgba(228,164,20,.35)] bg-[var(--panel)] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--gold)]">Análise de IA</h3>
            </div>
            {aiError ? (
              <p className="text-xs text-red-400">{aiError}</p>
            ) : (
              <p
                className="text-xs leading-relaxed text-[var(--muted)]"
                dangerouslySetInnerHTML={{ __html: `<p class="mt-0">${mdToHtml(aiAnalysis!)}</p>` }}
              />
            )}
          </div>
        )}

        {/* ── Grid metadata + itens ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* ── Coluna esquerda: metadados ── */}
          <div className="space-y-4">
            <SectionCard icon={<Building2 className="h-4 w-4" />} title="Órgão">
              <Field label="Razão Social" value={d?.nome_orgao} loading={loading} full />
              {d?.nome_unidade_orgao && (
                <Field label="Unidade" value={d.nome_unidade_orgao} loading={loading} full />
              )}
              <Field label="CNPJ" value={formatCNPJ(d?.cnpj_orgao)} loading={loading} />
              <Field label="UF" value={d?.uf} loading={loading} />
            </SectionCard>

            <SectionCard icon={<Calendar className="h-4 w-4" />} title="Datas">
              <Field label="Publicação" value={formatDate(d?.data_publicacao_pncp)} loading={loading} />
              <Field label="Abertura" value={formatDate(d?.data_abertura_proposta, true)} loading={loading} />
              <Field label="Encerramento" value={formatDate(d?.data_encerramento_proposta, true)} loading={loading} full />
            </SectionCard>

            <SectionCard icon={<Swords className="h-4 w-4" />} title="Classificação">
              <Field label="Modalidade" value={d?.modalidade_nome} loading={loading} />
              <Field label="Modo de Disputa" value={d?.modo_disputa_nome} loading={loading} />
              {(d?.criterio_julgamento || loading) && (
                <Field label="Critério de Julgamento" value={d?.criterio_julgamento} loading={loading} full />
              )}
              {(d?.tipo_beneficio || loading) && (
                <Field label="Benefício" value={d?.tipo_beneficio} loading={loading} />
              )}
              {(d?.categoria_processo || loading) && (
                <Field label="Categoria" value={d?.categoria_processo} loading={loading} />
              )}
              {d?.amparo_legal && (
                <Field label="Amparo Legal" value={d.amparo_legal} loading={loading} full />
              )}
            </SectionCard>

            {/* ID PNCP */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">ID PNCP</p>
                  {loading ? (
                    <Sk className="mt-1 h-4 w-full" />
                  ) : (
                    <p className="mt-0.5 break-all font-mono text-xs text-[var(--muted)]">{id}</p>
                  )}
                </div>
                {id && <CopyButton value={id} />}
              </div>
            </div>
          </div>

          {/* ── Coluna direita: itens ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[var(--gold)] opacity-70" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
                Itens{" "}
                {itensLoading ? "…" : itens.length > 0 ? `(${itens.length})` : ""}
              </h3>
            </div>

            {/* Campo de busca — visível quando tem mais de 3 itens */}
            {!itensLoading && itens.length > 3 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted)]" />
                <input
                  value={itemQ}
                  onChange={(e) => setItemQ(e.target.value)}
                  placeholder="Filtrar por descrição ou NCM…"
                  className="h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] pl-7 pr-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
            )}

            {itensLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3 space-y-2">
                    <Sk className="h-4 w-full" />
                    <Sk className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : itensError ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-7 w-7 text-amber-400 opacity-70" />
                <p className="text-xs font-semibold text-[var(--muted)]">Erro ao carregar itens</p>
              </div>
            ) : filteredItens.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <ShoppingCart className="h-8 w-8 text-[var(--muted)] opacity-40" />
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {itemQ ? `Nenhum item encontrado para "${itemQ}".` : "Nenhum item disponível."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItens.map((item, i) => (
                  <ItemCard key={i} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
