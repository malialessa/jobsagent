import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  RefreshCw, AlertCircle, TrendingUp, X, ExternalLink,
  Copy, Check, Building2, Calendar, ClipboardList,
  ChevronRight, Package, ShoppingCart,
  SlidersHorizontal, ChevronDown, ChevronUp,
  Search, ArrowUpRight, Maximize2, Heart, GitCompare, Bell, ArrowUpDown,
  Download, Tag, EyeOff, Eye, Zap, Expand, Layers, AlignJustify,
  MapPin, Clock, DollarSign, Trophy, Target, Briefcase,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useOportunidades } from "@/hooks/useOportunidades";
import { usePlano } from "@/hooks/usePlano";
import { useDetalhe } from "@/hooks/useDetalhe";
import { useItens } from "@/hooks/useItens";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import type { Oportunidade, OportunidadeDetalhe, ItemContratacao } from "@/lib/api";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const UFS = ["", "SP", "MG", "RJ", "PR", "RS", "BA", "GO", "PE", "CE", "MT", "MS", "SC", "DF"];

const MODALIDADES = [
  { value: "",                    label: "Todas as modalidades" },
  { value: "Pregão Eletrônico",   label: "Pregão Eletrônico" },
  { value: "Pregão Presencial",   label: "Pregão Presencial" },
  { value: "Concorrência",        label: "Concorrência" },
  { value: "Dispensa",            label: "Dispensa de Licitação" },
  { value: "Inexigibilidade",     label: "Inexigibilidade" },
  { value: "Chamamento",          label: "Chamamento Público" },
  { value: "Credenciamento",      label: "Credenciamento" },
];

const PRAZOS = [
  { value: "",  label: "Qualquer prazo" },
  { value: "3",  label: "D-3 (urgente)" },
  { value: "7",  label: "D-7 (esta semana)" },
  { value: "15", label: "D-15 (quinzena)" },
  { value: "30", label: "D-30 (mês)" },
];

const BENEFICIOS = [
  { value: "",         label: "Todos" },
  { value: "me_epp",   label: "ME / EPP exclusivo" },
  { value: "sem",      label: "Sem restrição" },
];

const SITUACOES = [
  { value: "",         label: "Qualquer situação" },
  { value: "ativa",    label: "Ativa / Aberta" },
  { value: "suspensa", label: "Suspensa" },
];

const UF_REGIOES: { label: string; ufs: string[] }[] = [
  { label: "Sul",     ufs: ["PR", "SC", "RS"] },
  { label: "Sudeste", ufs: ["SP", "RJ", "MG", "ES"] },
  { label: "C-O",    ufs: ["GO", "MT", "MS", "DF"] },
  { label: "Norte",  ufs: ["AM", "PA", "RO", "AC", "RR", "AP", "TO"] },
  { label: "Nordeste",ufs: ["BA", "PE", "CE", "MA", "PI", "RN", "PB", "SE", "AL"] },
];

const FAIXAS_VALOR = [
  { label: "< 50k",      min: 0,       max: 50_000 },
  { label: "50k–500k",  min: 50_000,  max: 500_000 },
  { label: "500k–5M",   min: 500_000, max: 5_000_000 },
  { label: "> 5M",       min: 5_000_000, max: Infinity },
];

// ─── CRM Status por oportunidade (armazenado em localStorage) ────────────────
const CRM_STATUSES = [
  { value: "",          label: "Sem status",        dot: "",              badge: "" },
  { value: "interesse", label: "Interesse",          dot: "bg-blue-400",     badge: "border-blue-400/40 bg-blue-400/10 text-blue-400" },
  { value: "proposta",  label: "Proposta enviada",   dot: "bg-blue-400",   badge: "border-blue-400/40 bg-blue-400/10 text-blue-400" },
  { value: "ganho",     label: "Ganho ✓",            dot: "bg-green-400", badge: "border-green-400/40 bg-green-400/10 text-green-400" },
  { value: "perdido",   label: "Perdido",            dot: "bg-red-400",     badge: "border-red-400/40 bg-red-400/10 text-red-400" },
] as const;
type CrmStatus = typeof CRM_STATUSES[number]["value"];

function useCrmStatus() {
  const [statuses, setStatuses] = useState<Record<string, CrmStatus>>(() => {
    try { return JSON.parse(localStorage.getItem("liciai_crm") ?? "{}"); }
    catch { return {}; }
  });

  const cycleStatus = useCallback((opId: string) => {
    setStatuses((prev) => {
      const current = prev[opId] ?? "";
      const idx = CRM_STATUSES.findIndex((s) => s.value === current);
      const next = CRM_STATUSES[(idx + 1) % CRM_STATUSES.length];
      const updated = { ...prev };
      if (next.value === "") { delete updated[opId]; }
      else { updated[opId] = next.value; }
      localStorage.setItem("liciai_crm", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const crmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(statuses).forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; });
    return counts;
  }, [statuses]);

  return { statuses, cycleStatus, crmCounts };
}

// ─── Slider de valor (dual range) ───────────────────────────────────────────────────────

const SLIDER_MAX = 10_000_000;

function ValorSlider({ valorMin, valorMax, onChange }: {
  valorMin: string; valorMax: string;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  const minV = valorMin ? Math.min(Number(valorMin), SLIDER_MAX) : 0;
  const maxV = valorMax ? Math.min(Number(valorMax), SLIDER_MAX) : SLIDER_MAX;
  const minPct = (minV / SLIDER_MAX) * 100;
  const maxPct = (maxV / SLIDER_MAX) * 100;

  const fmt = (v: number) => v <= 0 ? "R$ 0" : v >= SLIDER_MAX ? "ilimitado" :
    v >= 1_000_000 ? `R$ ${(v/1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M` :
    v >= 1_000 ? `R$ ${(v/1_000).toFixed(0)}k` : `R$ ${v}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Valor estimado</label>
        {(valorMin || valorMax) && (
          <button
            onClick={() => onChange({ valorMin: "", valorMax: "" })}
            className="text-[10px] font-bold text-red-400 hover:opacity-70 transition-opacity"
          >Limpar</button>
        )}
      </div>
      {/* Track */}
      <div className="relative h-6 flex items-center">
        <div className="absolute h-1.5 w-full rounded-full bg-[var(--line)]">
          <div
            className="absolute h-full rounded-full bg-[var(--primary)]"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
        </div>
        {/* Thumb min */}
        <input
          type="range" min={0} max={SLIDER_MAX} step={10_000}
          value={minV}
          onChange={(e) => {
            const v = Number(e.target.value);
            const clampedMax = Math.max(v + 10_000, maxV);
            onChange({ valorMin: v > 0 ? String(v) : "", valorMax: clampedMax < SLIDER_MAX ? String(clampedMax) : valorMax });
          }}
          className="absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--panel)] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-runnable-track]:opacity-0"
          style={{ zIndex: minV > SLIDER_MAX * 0.95 ? 5 : 3 }}
        />
        {/* Thumb max */}
        <input
          type="range" min={0} max={SLIDER_MAX} step={10_000}
          value={maxV}
          onChange={(e) => {
            const v = Number(e.target.value);
            const clampedMin = Math.min(v - 10_000, minV);
            onChange({ valorMin: clampedMin > 0 ? String(clampedMin) : valorMin, valorMax: v < SLIDER_MAX ? String(v) : "" });
          }}
          className="absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--panel)] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-runnable-track]:opacity-0"
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)]">
        <span className={cn(minV > 0 ? "text-[var(--primary)]" : "")}>{fmt(minV)}</span>
        <span className={cn(maxV < SLIDER_MAX ? "text-[var(--primary)]" : "")}>{fmt(maxV)}</span>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function diasRestantes(iso: string | any): number {
  const str = (iso && typeof iso === "object" && "value" in iso) ? iso.value : String(iso ?? "");
  if (!str) return 9999;
  const encerra = new Date(str);
  if (isNaN(encerra.getTime())) return 9999;
  const hoje = new Date();
  return Math.ceil((encerra.getTime() - hoje.getTime()) / 86_400_000);
}

function formatDate(iso: string | any, withTime = false): string {
  const raw = (iso && typeof iso === "object" && "value" in iso) ? iso.value : iso;
  const str = (raw == null || raw === "") ? "" : String(raw);
  if (!str) return "—";
  try {
    const date = new Date(str);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    if (withTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
    
    return `${day}/${month}/${year}`;
  } catch { return typeof str === "string" ? str.slice(0, 10) : "—"; }
}

function formatDateShort(iso: string | any): string {
  const raw = (iso && typeof iso === "object" && "value" in iso) ? iso.value : iso;
  const str = (raw == null || raw === "") ? "" : String(raw);
  if (!str) return "—";
  try {
    const date = new Date(str);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch { return "—"; }
}

function formatCurrency(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function formatCNPJ(cnpj?: string | null): string {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Remove acentos e normaliza para comparação de string */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function abrevModalidade(nome?: string | null): string {
  if (!nome) return "";
  const MAP: Record<string, string> = {
    "pregao eletronico": "PE", "pregão eletronico": "PE", "pregão eletrônico": "PE",
    "pregao presencial": "PP", "pregão presencial": "PP",
    "concorrencia": "Conc.", "concorrência": "Conc.",
    "dispensa": "Disp.",
    "inexigibilidade": "Inex.",
    "chamamento": "Cham.",
    "credenciamento": "Cred.",
  };
  const k = norm(nome.split(" ").slice(0, 2).join(" "));
  return MAP[k] || MAP[norm(nome.split(" ")[0])] || nome.slice(0, 6) + ".";
}

function situacaoCls(situacao?: string | null): string {
  if (!situacao) return "text-[var(--muted)] bg-[var(--panel2)] border-[var(--line)]";
  const s = situacao.toLowerCase();
  if (/aberta|ativa|publicad/.test(s)) return "text-green-400 bg-green-400/10 border-green-400/30";
  if (/encerrada|anulada|revogada|cancelada/.test(s)) return "text-red-400 bg-red-400/10 border-red-400/30";
  if (/suspensa|suspend/.test(s)) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
  return "text-blue-400 bg-blue-400/10 border-blue-400/30";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--line)]", className)} />;
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-[var(--line)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
          <Sk className="col-span-1 h-4 w-4" />
          <div className="col-span-6 space-y-2">
            <Sk className="h-3.5 w-full" />
            <Sk className="h-2.5 w-2/3" />
          </div>
          <Sk className="col-span-1 h-3 w-6" />
          <Sk className="col-span-2 h-3 w-14" />
          <Sk className="col-span-1 h-3 w-8" />
          <div className="col-span-1 flex flex-col items-center gap-1">
            <Sk className="h-3 w-5" />
            <Sk className="h-1 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Score ────────────────────────────────────────────────────────────────────

function ScoreBar({ value }: { value?: number }) {
  if (!value) return <span className="text-xs text-[var(--muted)]">—</span>;
  
  const hint = value >= 80 ? "Compatibilidade excepcional"
    : value >= 60 ? "Boa compatibilidade"
    : value >= 40 ? "Compatibilidade moderada"
    : "Baixa compatibilidade";
  
  const gradientClass = value >= 80 
    ? "from-green-400 via-green-500 to-green-600"
    : value >= 60
    ? "from-blue-400 via-blue-600 to-blue-700"
    : "from-gray-400 via-gray-500 to-gray-600";
  
  return (
    <div
      className="group flex flex-col gap-1.5 items-center cursor-help"
      title={`Score ${value}/100 — ${hint}. Baseado em: alinhamento por palavras-chave, UF, modalidade e prazo.`}
    >
      <div className={cn(
        "relative px-2 py-0.5 rounded-md font-black text-xs tabular-nums",
        "bg-gradient-to-br shadow-md transition-all duration-300",
        "group-hover:scale-110 group-hover:shadow-lg",
        gradientClass
      )}>
        <span className="relative z-10 text-white drop-shadow-sm">{value}</span>
        <div className={cn(
          "absolute inset-0 rounded-md blur-sm opacity-40 transition-opacity",
          "bg-gradient-to-br group-hover:opacity-60",
          gradientClass
        )} style={{ zIndex: -1 }} />
      </div>
      
      <div className="h-1 w-10 overflow-hidden rounded-full bg-[var(--line)] shadow-inner">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            gradientClass
          )}
          style={{ 
            width: `${Math.min(value, 100)}%`,
            animation: 'slideIn 0.7s ease-out'
          }}
        />
      </div>
    </div>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function SituacaoDot({ s }: { s?: string | null }) {
  if (!s) return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--line)]" />;
  const sl = s.toLowerCase();
  if (/aberta|ativa|publicad/.test(sl)) return <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" title={s} />;
  if (/suspensa|suspend/.test(sl))      return <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" title={s} />;
  if (/encerrada|anulada|revogada|cancelada/.test(sl)) return <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" title={s} />;
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" title={s} />;
}

function LineRow({ op, rank, onClick, active, favorited, onToggleFav, inCompare, onToggleCompare, opId, crmStatus, onCycleCrm, density }: {
  op: Oportunidade; rank: number; onClick: () => void; active: boolean;
  favorited?: boolean; onToggleFav?: (e: React.MouseEvent, id: string) => void;
  inCompare?: boolean; onToggleCompare?: (e: React.MouseEvent, id: string) => void;
  opId?: string;
  crmStatus?: CrmStatus;
  onCycleCrm?: (e: React.MouseEvent, id: string) => void;
  density?: "compact" | "comfortable";
}) {
  const dias = diasRestantes(op.data_encerramento_proposta);
  const isUrgent = dias > 0 && dias <= 3;
  const isWarning = dias > 3 && dias <= 7;
  const mod = abrevModalidade(op.modalidade_nome);
  const isTop = (op.score_oportunidade ?? 0) >= 80;
  const crm = CRM_STATUSES.find((s) => s.value === (crmStatus ?? "")) ?? CRM_STATUSES[0];
  const comfortable = density === "comfortable";

  return (
    <div
      onClick={onClick}
      data-opid={opId}
      className={cn(
        "group relative grid grid-cols-12 items-center gap-4 border-b border-[var(--line)]",
        "px-4 transition-all duration-300 cursor-pointer select-none",
        comfortable ? "py-4" : "py-2.5",
        active 
          ? "bg-gradient-to-r from-[var(--primary)]/10 via-[var(--panel2)] to-transparent border-l-2 border-l-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
          : "hover:bg-gradient-to-r hover:from-[var(--panel2)] hover:to-transparent hover:border-l-2 hover:border-l-[var(--primary)]/50",
        crm.value === "interesse" ? "border-l-2 border-l-sky-400" :
        crm.value === "proposta"  ? "border-l-2 border-l-amber-400" :
        crm.value === "ganho"     ? "border-l-2 border-l-green-400" :
        crm.value === "perdido"   ? "border-l-2 border-l-red-400" : "",
      )}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        active && "opacity-100"
      )} />
      
      {/* col 1: Rank + CRM dot */}
      <div className="relative z-10 col-span-1 flex flex-col items-center gap-1.5">
        <span className={cn("text-xs font-bold tabular-nums",
          active ? "text-[var(--text)]" : "text-[var(--muted)] opacity-60")}>{rank}</span>
        {onCycleCrm && (
          <button
            onClick={(e) => { e.stopPropagation(); onCycleCrm(e, opId ?? ""); }}
            title={crm.value ? `CRM: ${crm.label} — clique para avançar` : "Marcar status CRM"}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all hover:scale-125",
              crm.value ? crm.dot : "opacity-0 group-hover:opacity-50 bg-[var(--muted)]"
            )}
          />
        )}
      </div>

      {/* col 5: Main content */}
      <div className="relative z-10 col-span-5 min-w-0 space-y-1">
        <p
          className={cn(
            comfortable ? "text-sm line-clamp-2" : "text-sm line-clamp-1",
            isTop ? "font-black" : "font-semibold",
            "leading-tight",
            active ? "text-[var(--text)]" : "text-[var(--text)] opacity-90"
          )}
          title={op.objeto_compra ?? undefined}
        >
          {op.objeto_compra}
        </p>
        <div className="flex items-center gap-2">
          {op.razao_social_orgao && (
            <p className="truncate text-[11px] font-medium text-[var(--muted)]">
              {op.razao_social_orgao}
            </p>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {mod && (
              <span className="rounded border border-[var(--line)] bg-[var(--panel2)] px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                {mod}
              </span>
            )}
            {isTop && (
              <span className="inline-flex items-center gap-0.5 rounded border border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] px-1.5 py-0 text-[10px] font-black text-[var(--primary)]">
                <Zap className="h-2.5 w-2.5" /> Top
              </span>
            )}
            {op.tipo_beneficio && /ME|EPP/i.test(op.tipo_beneficio) && (
              <span className="inline-flex items-center rounded-full border border-green-500/40 bg-green-500/10 px-1.5 py-0 text-[10px] font-bold text-green-400">
                ME/EPP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* col 1: UF */}
      <div className="relative z-10 col-span-1 text-center">
        {op.uf ? (
          <span className="text-xs font-bold text-[var(--text)]">{op.uf}</span>
        ) : (
          <span className="text-[var(--muted)] opacity-40">—</span>
        )}
      </div>

      {/* col 2: Valor */}
      <div className="relative z-10 col-span-2 text-right">
        {op.valor_total_estimado ? (
          <p className={cn(
            "tabular-nums font-bold leading-none text-xs",
            op.valor_total_estimado >= 1_000_000 ? "text-[var(--primary)]" : "text-[var(--text)]"
          )}>{formatCurrency(op.valor_total_estimado)}</p>
        ) : (
          <span className="text-[var(--muted)] opacity-40 text-xs">—</span>
        )}
      </div>

      {/* col 1: Data encerramento */}
      <div className="relative z-10 col-span-1 text-center">
        <span className="text-xs font-medium text-[var(--muted)]">
          {formatDateShort(op.data_encerramento_proposta)}
        </span>
      </div>

      {/* col 1: Dias restantes */}
      <div className="relative z-10 col-span-1 text-center">
        {dias <= 0 ? (
          <span className="text-[10px] font-semibold text-red-400">Enc.</span>
        ) : (
          <span className={cn("tabular-nums font-bold text-xs",
            isUrgent ? "text-red-400 animate-pulse" : isWarning ? "text-amber-400" : "text-[var(--muted)]")}>
            {dias}d
          </span>
        )}
      </div>

      {/* col 1: Score + Actions */}
      <div className="relative z-10 col-span-1 flex flex-col items-center gap-1.5">
        <ScoreBar value={op.score_oportunidade} />
        <div className="flex items-center gap-0.5">
          {/* Heart */}
          {onToggleFav && (
            <button
              onClick={(e) => onToggleFav(e, op.id_pncp ?? op.numero_controle_pncp ?? "")}
              title={favorited ? "Remover dos favoritos" : "Favoritar"}
              className={cn(
                "p-1 rounded transition-colors",
                favorited
                  ? "text-red-400"
                  : "opacity-0 group-hover:opacity-70 hover:opacity-100 text-[var(--muted)]"
              )}
            >
              <Heart className={cn("h-3 w-3", favorited && "fill-current")} />
            </button>
          )}
          {/* Compare */}
          {onToggleCompare && (
            <button
              onClick={(e) => onToggleCompare(e, op.id_pncp ?? op.numero_controle_pncp ?? "")}
              title={inCompare ? "Remover do comparador" : "Adicionar ao comparador"}
              className={cn(
                "p-1 rounded transition-colors",
                inCompare
                  ? "text-blue-400"
                  : "opacity-0 group-hover:opacity-70 hover:opacity-100 text-[var(--muted)]"
              )}
            >
              <GitCompare className="h-3 w-3" />
            </button>
          )}
          {/* External link */}
          <Link
            to={`/oportunidade/${encodeURIComponent(op.id_pncp ?? op.numero_controle_pncp ?? "")}`}
            onClick={(e) => e.stopPropagation()}
            title="Abrir página completa"
            className="p-1 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity text-[var(--muted)]"
          >
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, loading: l }: { label: string; value?: string | null; loading?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-60">{label}</p>
      {l ? <Sk className="mt-1 h-3 w-3/4" /> : (
        <p className="mt-0.5 text-xs font-semibold leading-snug text-[var(--text)]">{value || "—"}</p>
      )}
    </div>
  );
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ value, onCopy }: { value: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onCopy?.(); // Callback opcional para telemetria
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : "Copiar ID"}
    </button>
  );
}

// ─── Badge de prazo ───────────────────────────────────────────────────────────

function PrazoBadge({ iso }: { iso: string | any }) {
  const dias = diasRestantes(iso);
  if (dias <= 0) return (
    <span className="inline-flex py-0.5 px-2 rounded-full text-[11px] font-bold bg-red-400/10 text-red-400 border border-red-400/30">
      Encerrado
    </span>
  );
  if (dias <= 2) return (
    <span className="inline-flex py-0.5 px-2 rounded-full text-[11px] font-bold bg-red-400/10 text-red-400 border border-red-400/30 animate-pulse">
      D-{dias} — urgente
    </span>
  );
  if (dias <= 7) return (
    <span className="inline-flex py-0.5 px-2 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
      D-{dias}
    </span>
  );
  return (
    <span className="inline-flex py-0.5 px-2 rounded-full text-[11px] font-bold bg-[var(--panel2)] text-[var(--muted)] border border-[var(--line)]">
      {dias} dias restantes
    </span>
  );
}

// ─── Aba de Itens ─────────────────────────────────────────────────────────────

function ItensTab({ itens, loading, error }: { itens: ItemContratacao[]; loading: boolean; error?: string | null }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return itens;
    const lq = q.toLowerCase();
    return itens.filter(it =>
      it.descricao?.toLowerCase().includes(lq) ||
      (it.ncmNbsCodigo ?? "").includes(q)
    );
  }, [itens, q]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Sk className="h-4 w-full" />
            <Sk className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <AlertCircle className="h-7 w-7 text-amber-400 opacity-70" />
        <p className="text-xs font-semibold text-[var(--muted)]">Erro ao carregar itens</p>
        <p className="text-[10px] text-[var(--muted)] opacity-60 break-all max-w-xs">{error}</p>
      </div>
    );
  }
  if (!itens.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ShoppingCart className="h-8 w-8 text-[var(--muted)] opacity-40" />
        <p className="text-xs font-semibold text-[var(--muted)]">Nenhum item disponível para este processo.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {/* Campo de busca — aparece quando há mais de 3 itens */}
      {itens.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por descrição ou NCM…"
            className="h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--panel2)] pl-7 pr-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
      )}
      {filtered.length === 0 && q ? (
        <p className="py-6 text-center text-xs text-[var(--muted)]">Nenhum item encontrado para "{q}".</p>
      ) : (
        filtered.map((item, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold leading-snug text-[var(--text)]">{item.descricao || "—"}</p>
              {item.numeroItem && (
                <span className="shrink-0 rounded-full bg-[var(--panel-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                  #{item.numeroItem}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)]">
              {item.quantidade != null && item.unidadeMedida && (
                <span>{item.quantidade} {item.unidadeMedida}</span>
              )}
              {item.orcamentoSigiloso ? (
                <span className="font-semibold text-[var(--muted)]">🔒 Orçamento sigiloso</span>
              ) : (
                <>
                  {item.valorUnitarioEstimado != null && item.valorUnitarioEstimado > 0 && (
                    <span>{formatCurrency(item.valorUnitarioEstimado)} / un.</span>
                  )}
                  {item.valorTotal != null && item.valorTotal > 0 && (
                    <span className="font-bold text-[var(--text)]">Total: {formatCurrency(item.valorTotal)}</span>
                  )}
                </>
              )}
              {item.criterioJulgamentoNome && <span className="opacity-70">{item.criterioJulgamentoNome}</span>}
            </div>
            {/* Badges extras */}
            <div className="flex flex-wrap items-center gap-1.5">
              {item.materialOuServicoNome && (
                <span className="rounded border border-[var(--line)] bg-[var(--panel-soft)] px-1.5 py-0 text-[10px] font-bold text-[var(--muted)]">
                  {item.materialOuServicoNome}
                </span>
              )}
              {item.ncmNbsCodigo && (
                <span
                  className="rounded border border-[var(--line)] bg-[var(--panel-soft)] px-1.5 py-0 font-mono text-[10px] text-[var(--muted)]"
                  title={item.ncmNbsDescricao ?? "Código NCM/NBS"}
                >
                  NCM {item.ncmNbsCodigo}
                </span>
              )}
              {item.tipoBeneficioNome && /ME|EPP/i.test(item.tipoBeneficioNome) && (
                <span className="rounded-full border border-green-500/40 bg-green-500/10 px-1.5 py-0 text-[10px] font-extrabold text-green-400">
                  ME/EPP
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Painel de detalhes ───────────────────────────────────────────────────────

function DetalhePanel({
  preview,
  detalhe,
  loading,
  onClose,
}: {
  preview: Oportunidade;
  detalhe: OportunidadeDetalhe | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"detalhes" | "itens">("detalhes");
  const [itensExpanded, setItensExpanded] = useState(false);
  const d = detalhe;

  // Resolve campos: preferência para detalhe completo, fallback para preview
  const situacao      = d?.situacao_nome    || preview.situacao_nome;
  const idPncp        = d?.id_pncp          || preview.id_pncp || preview.numero_controle_pncp || "";
  const nomeOrgao     = d?.nome_orgao       || preview.razao_social_orgao;
  const nomeUnidade   = d?.nome_unidade_orgao;
  const cnpj          = d?.cnpj_orgao;
  const valor         = d?.valor_total_estimado ?? preview.valor_total_estimado;
  const modalidade    = d?.modalidade_nome  || preview.modalidade_nome;
  const modoDisputa   = d?.modo_disputa_nome;
  const dataPublicacao   = d?.data_publicacao_pncp;
  const dataAbertura     = d?.data_abertura_proposta;
  const dataEncerramento = d?.data_encerramento_proposta || preview.data_encerramento_proposta;
  const score         = d?.score_oportunidade ?? preview.score_oportunidade;
  const tipoBeneficio = d?.tipo_beneficio   || preview.tipo_beneficio;
  const criterioJulgamento = d?.criterio_julgamento;
  const amparoLegal   = d?.amparo_legal;
  const categoriaProcesso = d?.categoria_processo;
  const dias          = diasRestantes(dataEncerramento);

  const { itens, loading: itensLoading, error: itensError } = useItens(idPncp);

  // Link PNCP — formato: /app/editais/CNPJ/ANUAL/ANO/SEQpadded
  const pncpUrl = useMemo(() => {
    if (!idPncp) return null;
    const m = idPncp.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
    if (!m) return null;
    const [, c, anual, seq, ano] = m;
    return `https://pncp.gov.br/app/editais/${c}/${anual}/${ano}/${seq.padStart(6, "0")}`;
  }, [idPncp]);

  useEffect(() => { setActiveTab("detalhes"); }, [idPncp]);

  // Mini campo inline
  const MiniField = ({ label, value, full }: { label: string; value?: string | null; full?: boolean }) => (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-50">{label}</p>
      {loading && !value ? (
        <Sk className="mt-0.5 h-3 w-3/4" />
      ) : (
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[var(--text)]">{value || "—"}</p>
      )}
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--panel)]">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[var(--line)] bg-[var(--panel2)]">
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {/* Badges situação + prazo */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {situacao && (
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold", situacaoCls(situacao))}>
                  {situacao}
                </span>
              )}
              <PrazoBadge iso={dataEncerramento} />
              {tipoBeneficio && /ME|EPP/i.test(tipoBeneficio) && (
                <span className="inline-flex rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-extrabold text-green-400">ME/EPP</span>
              )}
            </div>
            {/* Objeto */}
            <p className="text-sm font-bold leading-snug text-[var(--text)] line-clamp-3">
              {preview.objeto_compra}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {idPncp && (
              <Link
                to={`/oportunidade/${encodeURIComponent(idPncp)}`}
                className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[11px] font-extrabold text-black shadow-sm hover:opacity-90 transition-opacity"
              >
                <Maximize2 className="h-3 w-3" />
                Completo
              </Link>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)] transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Hero: Valor + Score + UF ── */}
        <div className="flex items-center gap-4 px-4 pb-3">
          {/* Valor */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-50">Valor estimado</p>
            {loading && !valor ? (
              <Sk className="mt-1 h-6 w-28" />
            ) : (
              <p className="text-xl font-black tabular-nums text-[var(--text)]">{formatCurrency(valor)}</p>
            )}
          </div>
          {/* Score */}
          {score != null && (
            <div className="shrink-0 flex flex-col items-center gap-1 bg-[var(--panel-primary)] rounded-xl px-3 py-2 border border-[rgba(88,166,255,.25)]">
              <span className={cn("text-xl font-black tabular-nums leading-none",
                score >= 70 ? "text-[var(--primary)]" : score >= 40 ? "text-blue-400" : "text-[var(--muted)]")}>
                {score}
              </span>
              <div className="h-1 w-10 overflow-hidden rounded-full bg-[var(--panel2)]">
                <div
                  className={cn("h-full rounded-full transition-all",
                    score >= 70 ? "bg-[var(--primary)]" : score >= 40 ? "bg-blue-400" : "bg-[var(--muted)]")}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">score</span>
            </div>
          )}
          {/* UF */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <span className="text-lg font-extrabold text-[var(--text)]">{preview.uf}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">UF</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="shrink-0 flex border-b border-[var(--line)] bg-[var(--panel2)]">
        {([ "detalhes", "itens"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-colors border-b-2",
              activeTab === tab
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {tab === "detalhes" ? (
              <><ClipboardList className="h-3 w-3" /> Detalhes</>
            ) : (
              <><Package className="h-3 w-3" />
                Itens{itensLoading ? "…" : itens.length > 0 ? ` (${itens.length})` : ""}
              </>
            )}
          </button>
        ))}
        {/* Expandir itens */}
        {activeTab === "itens" && itens.length > 0 && (
          <button
            onClick={() => setItensExpanded(true)}
            title="Expandir em tela cheia"
            className="ml-auto mr-2 flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
          >
            <Expand className="h-3 w-3" /> Expandir
          </button>
        )}
        {/* Link PNCP no tab bar */}
        {pncpUrl && !( activeTab === "itens" && itens.length > 0) && (
          <a
            href={pncpUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 px-3 text-[10px] font-bold text-[var(--primary)] hover:opacity-80 transition-opacity"
          >
            <ExternalLink className="h-3 w-3" /> PNCP
          </a>
        )}
        {pncpUrl && activeTab === "itens" && itens.length > 0 && (
          <a
            href={pncpUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 text-[10px] font-bold text-[var(--primary)] hover:opacity-80 transition-opacity"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* ── Body scrollável ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {activeTab === "itens" ? (
          <ItensTab itens={itens} loading={itensLoading} error={itensError} />
        ) : (
          <>
            {/* Órgão */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-[var(--primary)] opacity-70" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Órgão</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <MiniField label="Nome" value={nomeOrgao} full />
                {nomeUnidade && <MiniField label="Unidade" value={nomeUnidade} full />}
                <MiniField label="CNPJ" value={formatCNPJ(cnpj)} />
                <MiniField label="UF" value={preview.uf} />
              </div>
            </div>

            {/* Datas */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-[var(--primary)] opacity-70" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Datas</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <MiniField label="Publicação" value={formatDate(dataPublicacao)} />
                <MiniField label="Abertura" value={formatDate(dataAbertura, true)} />
                <div className="col-span-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-50">Encerramento</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] font-bold text-[var(--text)]">{formatDate(dataEncerramento, true)}</p>
                    <span className={cn("text-[10px] font-bold tabular-nums",
                      dias <= 0 ? "text-red-400" : dias <= 3 ? "text-red-400" : dias <= 7 ? "text-amber-400" : "text-[var(--muted)]")}>
                      {dias <= 0 ? "Encerrado" : `D-${dias}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Classificação */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3 text-[var(--primary)] opacity-70" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Classificação</span>
                {loading && <div className="h-1.5 w-1.5 animate-ping rounded-full bg-[var(--primary)] opacity-60" />}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <MiniField label="Modalidade" value={modalidade} full={!modoDisputa} />
                {(modoDisputa || loading) && <MiniField label="Modo de disputa" value={modoDisputa} />}
                {(criterioJulgamento || loading) && <MiniField label="Critério" value={criterioJulgamento} />}
                {(categoriaProcesso || loading) && <MiniField label="Categoria" value={categoriaProcesso} />}
                {(amparoLegal || loading) && <MiniField label="Amparo legal" value={amparoLegal} full />}
                {(tipoBeneficio || loading) && (
                  <div className="col-span-2">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-50">Benefício</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {loading && !tipoBeneficio ? <Sk className="h-3 w-3/4" /> : (
                        <>
                          <p className="text-[11px] font-semibold text-[var(--text)]">{tipoBeneficio || "—"}</p>
                          {tipoBeneficio && /ME|EPP/i.test(tipoBeneficio) && (
                            <span className="inline-flex rounded-full border border-green-500/40 bg-green-500/10 px-1.5 py-0 text-[10px] font-extrabold text-green-400">ME/EPP</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ID */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-50">ID PNCP</p>
                  <p className="mt-0.5 break-all text-[10px] font-mono text-[var(--muted)]">{idPncp || "—"}</p>
                </div>
                {idPncp && (
                  <CopyButton
                    value={idPncp}
                    onCopy={() => api.logShare(idPncp, "copy_id").catch(() => {})}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {d?.ingest_time && (
        <div className="shrink-0 border-t border-[var(--line)] px-4 py-2 flex justify-end">
          <p className="text-[9px] text-[var(--muted)] opacity-40">Atualizado {formatDate(d.ingest_time)}</p>
        </div>
      )}

      {/* ── Overlay de itens expandido ── */}
      {itensExpanded && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[var(--panel)] overflow-hidden">
          {/* Header do overlay */}
          <div className="shrink-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel2)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-xs font-extrabold text-[var(--text)] uppercase tracking-wider">
                Itens do processo
              </span>
              {itens.length > 0 && (
                <span className="rounded-full border border-[rgba(88,166,255,.3)] bg-[var(--panel-primary)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--primary)]">
                  {itens.length} ite{itens.length !== 1 ? "ns" : "m"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pncpUrl && (
                <a
                  href={pncpUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> PNCP
                </a>
              )}
              <button
                onClick={() => setItensExpanded(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)] transition-colors"
                aria-label="Fechar visão expandida"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Título resumido */}
          <div className="shrink-0 border-b border-[var(--line)] px-4 py-2">
            <p className="text-[11px] font-semibold text-[var(--muted)] line-clamp-1">{preview.objeto_compra}</p>
          </div>
          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ItensTab itens={itens} loading={itensLoading} error={itensError} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Premium Filter Bar ─────────────────────────────────────────────────────

interface FilterState {
  q: string;
  uf: string;
  modalidade: string;
  prazo: string;
  valorMin: string;
  valorMax: string;
  beneficio: string;
  situacao: string;
}

function activeFilterCount(f: FilterState): number {
  return [f.uf, f.modalidade, f.prazo, f.valorMin, f.valorMax, f.beneficio, f.situacao].filter(Boolean).length;
}

function PremiumFilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const active = activeFilterCount(filters);

  // Helper: multi-select para UF e Modalidade
  const toggleMulti = (field: keyof FilterState, value: string) => {
    const current = filters[field] ? filters[field].split(",").map(v => v.trim()) : [];
    const exists = current.includes(value);
    const next = exists
      ? current.filter(v => v !== value)
      : value === "" ? [] : [...current.filter(v => v !== ""), value];
    onChange({ [field]: next.join(",") });
  };

  const pill = (label: string, value: string, field: keyof FilterState) => {
    const isMulti = field === "uf" || field === "modalidade";
    const selected = isMulti
      ? filters[field].split(",").map(v => v.trim()).includes(value)
      : filters[field] === value;
    
    return (
      <button
        key={value}
        onClick={() => isMulti ? toggleMulti(field, value) : onChange({ [field]: filters[field] === value ? "" : value })}
        className={cn(
          "relative overflow-hidden group",
          "rounded-xl border px-3 py-1.5 text-xs font-bold",
          "transition-all duration-300 ease-out",
          "hover:scale-105 hover:-translate-y-0.5",
          selected
            ? "border-[var(--primary)]/40 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 text-[var(--primary)] shadow-md shadow-[var(--primary)]/20"
            : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)] hover:border-[var(--primary)]/20 hover:text-[var(--text)]"
        )}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] duration-700" />
        
        {selected && (
          <span className="inline-block mr-1 animate-in fade-in zoom-in duration-200">
            ✓
          </span>
        )}
        
        <span className="relative z-10">{label}</span>
      </button>
    );
  };

  const select = (field: keyof FilterState, options: { value: string; label: string }[]) => (
    <select
      value={filters[field]}
      onChange={(e) => onChange({ [field]: e.target.value })}
      className="h-8 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2 text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] overflow-hidden">
      {/* Linha sempre visível */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted)]" />
          <input
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Buscar oportunidades..."
            className="h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] pl-7 pr-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        {/* UF pills compactos */}
        <div className="flex gap-1.5 flex-wrap">
          {UFS.map((u) => pill(u === "" ? "Todas UFs" : u, u, "uf"))}
        </div>
        {/* Spacer + toggle */}
        <div className="flex-1" />
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
            active > 0
              ? "border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] text-[var(--primary)]"
              : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros avançados{active > 0 && ` (${active})`}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {active > 0 && (
          <button
            onClick={() => onChange({ uf: "", modalidade: "", prazo: "", valorMin: "", valorMax: "", beneficio: "", situacao: "" })}
            className="text-xs font-bold text-[var(--muted)] hover:text-red-400 transition-colors"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* Seção expandida */}
      {expanded && (
        <div className="border-t border-[var(--line)] bg-[var(--panel)] px-4 py-4 flex flex-col gap-4">
          {/* Modalidades (multi-select) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Modalidades (selecione múltiplas)</label>
            <div className="flex flex-wrap gap-1.5">
              {MODALIDADES.filter(m => m.value !== "").map((m) => pill(m.label, m.value, "modalidade"))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-[var(--line)]" />
          
          {/* Demais filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Prazo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Prazo</label>
              {select("prazo", PRAZOS)}
            </div>
            {/* Situação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Situação</label>
              {select("situacao", SITUACOES)}
            </div>
            {/* Benefício */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Benefício</label>
              {select("beneficio", BENEFICIOS)}
            </div>
            {/* Valor mínimo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Valor mínimo (R$)</label>
              <input
                type="number"
                value={filters.valorMin}
                onChange={(e) => onChange({ valorMin: e.target.value })}
                placeholder="0"
                className="h-8 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            {/* Valor máximo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Valor máximo (R$)</label>
              <input
                type="number"
                value={filters.valorMax}
                onChange={(e) => onChange({ valorMax: e.target.value })}
                placeholder="Sem limite"
                className="h-8 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Banner upgrade ───────────────────────────────────────────────────────────

function UpgradeBanner({ plano }: { plano: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm font-semibold text-[var(--text)]">
          Limite do plano <strong className="capitalize">{plano || "Free"}</strong> atingido.{" "}
          Faça upgrade para acessar mais oportunidades e UFs.
        </p>
      </div>
      <Link to="/planos" className="shrink-0">
        <Button size="sm">Upgrade</Button>
      </Link>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function RadarPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros persistidos em URL (para o hook de busca)
  const uf = searchParams.get("uf") ?? "";
  const q  = searchParams.get("q")  ?? "";

  // Filtros locais (aplicados client-side sobre os resultados)
  const [localFilters, setLocalFilters] = useState<FilterState>({
    q, uf,
    modalidade: "",
    prazo: "",
    valorMin: "",
    valorMax: "",
    beneficio: "",
    situacao: "",
  });

  // Toggle: ocultar encerradas (default ON)
  const [hideEncerradas, setHideEncerradas] = useState(true);

  const patchFilter = (patch: Partial<FilterState>) => {
    setLocalFilters((prev) => {
      const next = { ...prev, ...patch };
      // sync uf + q to URL
      setSearchParams((p) => {
        if (next.uf) p.set("uf", next.uf); else p.delete("uf");
        if (next.q)  p.set("q",  next.q);  else p.delete("q");
        return p;
      }, { replace: true });
      return next;
    });
  };

  const [selected, setSelected] = useState<Oportunidade | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showFavoritosOnly, setShowFavoritosOnly] = useState(false);
  const [sortKey, setSortKey] = useState<"score" | "valor" | "prazo">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const listRef = useRef<HTMLDivElement>(null);

  const { favoritos, toggle: toggleFav } = useFavoritos();
  const { count: novasCount, markSeen } = useNotificacoes();
  const { palavras: palavrasChave } = useConfiguracoes();
  const { statuses: crmStatuses, cycleStatus: cycleCrm, crmCounts } = useCrmStatus();

  // Zera badge ao abrir o radar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { markSeen(); }, []);

  // Scroll até a linha selecionada (j/k navigation)
  useEffect(() => {
    if (!selected) return;
    const id = selected.id_pncp ?? selected.numero_controle_pncp;
    if (!id) return;
    const el = listRef.current?.querySelector(`[data-opid="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  // Todos os filtros vão ao backend — server-side é mais preciso e abrange todo o dataset
  const { items: rawItems, loading, error, planLimited, plano, hasMore, refetch, loadMore } =
    useOportunidades({
      uf:          localFilters.uf        || undefined,
      q:           localFilters.q         || undefined,
      modalidade:  localFilters.modalidade || undefined,
      prazo_max:   localFilters.prazo      ? Number(localFilters.prazo)    : undefined,
      valor_min:   localFilters.valorMin   ? Number(localFilters.valorMin) : undefined,
      valor_max:   localFilters.valorMax   ? Number(localFilters.valorMax) : undefined,
      beneficio:   localFilters.beneficio  || undefined,
      situacao:    localFilters.situacao   || undefined,
    });

  const { plano: planoInfo } = usePlano();

  // Filtro client-side: fallback rápido + campos não cobertos pelo server (favoritos, q) + ordenação
  const items = useMemo(() => {
    let list = rawItems;
    const f = localFilters;

    // Esconder encerradas (default ON)
    if (hideEncerradas) {
      list = list.filter((o) => diasRestantes(o.data_encerramento_proposta) > 0);
    }

    // Filtro de texto instantâneo (pre-filter enquanto server não responde)
    if (f.q) {
      const nq = norm(f.q);
      list = list.filter((o) =>
        norm(o.objeto_compra ?? "").includes(nq) ||
        norm(o.razao_social_orgao ?? "").includes(nq)
      );
    }

    // Normalização acentuada client-side para filtros que já foram server-side
    // (garante consistência visual mesmo antes do re-fetch completar)
    if (f.modalidade) {
      list = list.filter((o) => norm(o.modalidade_nome ?? "").includes(norm(f.modalidade)));
    }
    if (f.prazo) {
      const maxDias = Number(f.prazo);
      list = list.filter((o) => { const d = diasRestantes(o.data_encerramento_proposta); return d > 0 && d <= maxDias; });
    }
    if (f.valorMin) {
      list = list.filter((o) => (o.valor_total_estimado ?? 0) >= Number(f.valorMin));
    }
    if (f.valorMax) {
      list = list.filter((o) => (o.valor_total_estimado ?? Infinity) <= Number(f.valorMax));
    }
    if (f.beneficio === "me_epp") {
      list = list.filter((o) => /ME|EPP/i.test(o.tipo_beneficio ?? ""));
    } else if (f.beneficio === "sem") {
      list = list.filter((o) => !o.tipo_beneficio || !/ME|EPP/i.test(o.tipo_beneficio));
    }
    if (f.situacao === "ativa") {
      list = list.filter((o) => /aberta|ativa|publicad/i.test(o.situacao_nome ?? ""));
    } else if (f.situacao === "suspensa") {
      list = list.filter((o) => /suspensa/i.test(o.situacao_nome ?? ""));
    }
    if (showFavoritosOnly) {
      list = list.filter((o) => favoritos.has(o.id_pncp ?? o.numero_controle_pncp ?? ""));
    }

    // Ordenação
    list = [...list].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "valor") {
        av = a.valor_total_estimado ?? 0;
        bv = b.valor_total_estimado ?? 0;
      } else if (sortKey === "prazo") {
        av = diasRestantes(a.data_encerramento_proposta);
        bv = diasRestantes(b.data_encerramento_proposta);
        // prazo asc = encerra antes → valores negativos vão pro fim
        if (av <= 0 && bv > 0) return 1;
        if (bv <= 0 && av > 0) return -1;
      } else {
        av = a.score_oportunidade ?? 0;
        bv = b.score_oportunidade ?? 0;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return list;
  }, [rawItems, localFilters, showFavoritosOnly, favoritos, sortKey, sortDir, hideEncerradas]);

  // Export CSV da lista filtrada
  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Objeto", "Org\u00e3o", "UF", "Modalidade", "Valor (R$)", "Encerramento", "Score"];
    const rows = items.map((op, i) => [
      i + 1,
      `"${(op.objeto_compra ?? "").replace(/"/g, "'")}",`,
      `"${(op.razao_social_orgao ?? "").replace(/"/g, "'")}",`,
      op.uf ?? "",
      op.modalidade_nome ?? "",
      op.valor_total_estimado ?? "",
      op.data_encerramento_proposta ?? "",
      op.score_oportunidade ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const selectedId = selected?.id_pncp || selected?.numero_controle_pncp;
  const { detalhe, loading: detalheLoading } = useDetalhe(selectedId);

  const scoreMedia = useMemo(() => {
    const scored = items.filter((i) => i.score_oportunidade != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((a, b) => a + (b.score_oportunidade ?? 0), 0) / scored.length);
  }, [items]);

  // Teclas de atalho: Escape fecha painel, j/k navegam pelas linhas
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setSelected(null); return; }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "j" || e.key === "k") {
      e.preventDefault();
      setSelected((prev) => {
        if (!items.length) return prev;
        const idx = prev ? items.findIndex((o) => (o.id_pncp ?? o.numero_controle_pncp) === (prev.id_pncp ?? prev.numero_controle_pncp)) : -1;
        const next = e.key === "j" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        return items[next] ?? null;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const panelOpen = !!selected;

  return (
    <AppShell breadcrumb="Radar">
      <div className="mx-auto max-w-[1400px] space-y-3">

        {/* ── Header principal ── */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <TrendingUp className="h-5 w-5 shrink-0 text-[var(--primary)]" />
            <div className="min-w-0">
              <h1 className="text-base font-black text-[var(--text)]">Radar de Oportunidades</h1>
              <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-0.5">
                {loading ? (
                  <Sk className="h-3 w-20" />
                ) : (
                  <span>
                    <span className="font-bold text-[var(--text)]">{items.length}</span>
                    {rawItems.length > items.length && <span className="opacity-60"> de {rawItems.length}</span>}
                    {" "}oportunidade{items.length !== 1 ? "s" : ""}
                  </span>
                )}
                {scoreMedia != null && (
                  <><span>·</span><span>score médio <span className="font-bold text-[var(--primary)]">{scoreMedia}</span></span></>
                )}
                {planoInfo?.trial?.ativo && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400">
                    <Clock className="h-3 w-3" />
                    Trial · {planoInfo.trial.dias_restantes}d
                  </span>
                )}
                {planoInfo && !planoInfo.trial?.ativo && (
                  <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-0.5 font-bold capitalize text-[var(--muted)]">
                    {planoInfo.plano}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Ocultar encerradas */}
            <button
              onClick={() => setHideEncerradas((v) => !v)}
              title={hideEncerradas ? "Mostrando apenas ativas — clique para ver encerradas" : "Mostrando todas — clique para ocultar encerradas"}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                hideEncerradas
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {hideEncerradas ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Encerradas
            </button>

            {/* Favoritos */}
            <button
              onClick={() => setShowFavoritosOnly((v) => !v)}
              title={showFavoritosOnly ? "Mostrar todas" : "Mostrar apenas favoritos"}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                showFavoritosOnly
                  ? "border-red-400/40 bg-red-400/10 text-red-400"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", showFavoritosOnly && "fill-current")} />
              {favoritos.size > 0 && <span>{favoritos.size}</span>}
            </button>

            {/* CRM summary */}
            {Object.keys(crmCounts).length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-400/40 bg-blue-400/10 px-2.5 py-1.5 text-xs font-bold text-blue-400">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                {Object.values(crmCounts).reduce((a, b) => a + b, 0)} CRM
              </div>
            )}

            {/* Density toggle */}
            <button
              onClick={() => setDensity((d) => d === "compact" ? "comfortable" : "compact")}
              title={density === "compact" ? "Visualização confortável" : "Visualização compacta"}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                density === "comfortable"
                  ? "border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] text-[var(--primary)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {density === "compact" ? <AlignJustify className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            </button>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              disabled={!items.length}
              title={`Exportar ${items.length} oportunidades para CSV`}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>

            {/* Bell de notificações */}
            <div className="relative">
              <button
                onClick={() => { markSeen(); refetch(); }}
                title={novasCount > 0 ? `${novasCount} nova${novasCount > 1 ? "s" : ""} oportunidade${novasCount > 1 ? "s" : ""}` : "Sem novas oportunidades"}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg border transition-colors",
                  novasCount > 0
                    ? "border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] text-[var(--primary)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                <Bell className="h-3.5 w-3.5" />
                {novasCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary)] text-black px-1 text-[9px] font-black">
                    {novasCount > 99 ? "99+" : novasCount}
                  </span>
                )}
              </button>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" className="gap-1.5 h-8 px-3 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
        </div>

        {/* ── Palavras-chave de scoring ── */}
        {palavrasChave.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-60">
              <Tag className="inline h-3 w-3 mr-1" />Tags ativas:
            </span>
            {palavrasChave.slice(0, 10).map((p) => (
              <span
                key={p.palavra_chave}
                title={`Peso: ${p.peso} — Palavras-chave ajudam a calcular o score de compatibilidade`}
                className={cn(
                  "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold",
                  p.peso >= 2
                    ? "border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] text-[var(--primary)]"
                    : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)]"
                )}
              >
                {p.palavra_chave}
                {p.peso > 1 && <span className="ml-1 opacity-70">×{p.peso}</span>}
              </span>
            ))}
            {palavrasChave.length > 10 && (
              <span className="text-[10px] text-[var(--muted)] opacity-50">+{palavrasChave.length - 10} mais</span>
            )}
            <Link to="/perfil" className="text-[10px] font-bold text-[var(--primary)] hover:opacity-80 transition-opacity ml-1">
              Editar perfil →
            </Link>
          </div>
        )}

        {/* ── Faixas de valor rápido ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-60">Valor:</span>
          {FAIXAS_VALOR.map((f) => {
            const active = Number(localFilters.valorMin || 0) === f.min && (f.max === Infinity ? !localFilters.valorMax : Number(localFilters.valorMax || Infinity) === f.max);
            return (
              <button
                key={f.label}
                onClick={() => {
                  if (active) {
                    patchFilter({ valorMin: "", valorMax: "" });
                  } else {
                    patchFilter({
                      valorMin: f.min > 0 ? String(f.min) : "",
                      valorMax: f.max !== Infinity ? String(f.max) : "",
                    });
                  }
                }}
                className={cn(
                  "rounded border px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap",
                  active
                    ? "border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] text-[var(--primary)]"
                    : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {f.label}
              </button>
            );
          })}
          {(localFilters.valorMin || localFilters.valorMax) && !FAIXAS_VALOR.some((f) => Number(localFilters.valorMin || 0) === f.min && (f.max === Infinity ? !localFilters.valorMax : Number(localFilters.valorMax || Infinity) === f.max)) && (
            <span className="rounded border border-[rgba(88,166,255,.4)] bg-[var(--panel-primary)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
              {localFilters.valorMin ? `≥ R$${Number(localFilters.valorMin).toLocaleString("pt-BR")}` : ""}
              {localFilters.valorMin && localFilters.valorMax ? " – " : ""}
              {localFilters.valorMax ? `≤ R$${Number(localFilters.valorMax).toLocaleString("pt-BR")}` : ""}
            </span>
          )}
        </div>

        {/* ── Filtros premium ── */}
        <PremiumFilterBar filters={localFilters} onChange={patchFilter} />

        {/* ── Chips de filtros ativos ── */}
        {(() => {
          const chips: { key: keyof FilterState; display: string }[] = [];
          // Multi-select: mostrar UFs e modalidades selecionadas
          if (localFilters.uf) {
            const ufs = localFilters.uf.split(",").map(u => u.trim()).filter(Boolean);
            ufs.forEach(uf => chips.push({ key: "uf", display: uf }));
          }
          if (localFilters.modalidade) {
            const modalidades = localFilters.modalidade.split(",").map(m => m.trim()).filter(Boolean);
            modalidades.forEach(mod => {
              const label = MODALIDADES.find(m => m.value === mod)?.label ?? mod;
              chips.push({ key: "modalidade", display: label });
            });
          }
          if (localFilters.prazo)      chips.push({ key: "prazo",      display: PRAZOS.find(p => p.value === localFilters.prazo)?.label ?? localFilters.prazo });
          if (localFilters.valorMin)   chips.push({ key: "valorMin",   display: `≥ R$ ${Number(localFilters.valorMin).toLocaleString("pt-BR")}` });
          if (localFilters.valorMax)   chips.push({ key: "valorMax",   display: `≤ R$ ${Number(localFilters.valorMax).toLocaleString("pt-BR")}` });
          if (localFilters.beneficio)  chips.push({ key: "beneficio",  display: BENEFICIOS.find(b => b.value === localFilters.beneficio)?.label ?? localFilters.beneficio });
          if (localFilters.situacao)   chips.push({ key: "situacao",   display: SITUACOES.find(s => s.value === localFilters.situacao)?.label ?? localFilters.situacao });
          if (!chips.length) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)] opacity-60">Filtros ativos:</span>
              {chips.map(({ key, display }, idx) => (
                <button
                  key={`${key}-${idx}`}
                  onClick={() => {
                    // Para multi-select, remover apenas esse valor
                    if (key === "uf" || key === "modalidade") {
                      const current = (localFilters[key] || "").split(",").map(v => v.trim()).filter(Boolean);
                      const next = current.filter(v => {
                        if (key === "uf") return v !== display;
                        return MODALIDADES.find(m => m.label === display)?.value !== v;
                      });
                      patchFilter({ [key]: next.join(",") });
                    } else {
                      patchFilter({ [key]: "" } as Partial<FilterState>);
                    }
                  }}
                  className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-[var(--primary)]/40 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--primary)] shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="absolute inset-0 bg-[var(--primary)]/10 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg" />
                  <span className="relative z-10">{display}</span>
                  <X className="relative z-10 h-3 w-3 transition-transform group-hover:rotate-90 duration-200" />
                </button>
              ))}
            </div>
          );
        })()}

        {planLimited && <UpgradeBanner plano={plano} />}

        {/* ── Tabela ── */}
        <div ref={listRef} className="rounded-xl border border-[var(--line)] bg-[var(--panel)]" style={{ minHeight: 400 }}>
          {/* Header da tabela + sort */}
          <div className="sticky top-0 z-10 rounded-t-xl bg-[var(--panel2)] border-b border-[var(--line)] px-4 py-2.5">
            <div className="grid grid-cols-12 gap-4 items-center">
              {[
                { label: "#",      cls: "col-span-1 text-center",  sort: null },
                { label: "Oportunidade", cls: "col-span-5",  sort: null },
                { label: "UF",     cls: "col-span-1 text-center",  sort: null },
                { label: "Valor",  cls: "col-span-2 text-right",   sort: "valor" as const },
                { label: "Encerra",  cls: "col-span-1 text-center",  sort: null },
                { label: "Dias",  cls: "col-span-1 text-center",  sort: "prazo" as const },
                { label: "Score",  cls: "col-span-1 text-center",  sort: "score" as const },
              ].map((h) => (
                <div
                  key={h.label}
                  onClick={h.sort ? () => {
                    if (sortKey === h.sort) setSortDir(d => d === "desc" ? "asc" : "desc");
                    else { setSortKey(h.sort!); setSortDir(h.sort === "prazo" ? "asc" : "desc"); }
                  } : undefined}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest select-none transition-colors",
                    h.sort ? "cursor-pointer hover:text-[var(--primary)]" : "",
                    h.sort && sortKey === h.sort ? "text-[var(--primary)]" : "text-[var(--muted)] opacity-60",
                    h.cls
                  )}
                >
                  {h.label}
                  {h.sort && sortKey === h.sort && (
                    sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                  )}
                  {h.sort && sortKey !== h.sort && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 opacity-70" />
              <p className="text-sm font-bold text-[var(--text)]">Erro ao carregar oportunidades</p>
              <p className="text-xs text-[var(--muted)] max-w-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 mt-1">
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Search className="h-8 w-8 text-[var(--muted)] opacity-40" />
              <p className="text-sm font-bold text-[var(--text)]">Nenhuma oportunidade encontrada</p>
              <p className="text-xs text-[var(--muted)]">Não há oportunidades que correspondam aos filtros selecionados.</p>
              <button
                onClick={() => {
                  setSearchParams({}, { replace: true });
                  setLocalFilters({ q: "", uf: "", modalidade: "", prazo: "", valorMin: "", valorMax: "", beneficio: "", situacao: "" });
                }}
                className="mt-1 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-4 py-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <>
              <div>
                {items.map((op, i) => {
                  const opId = op.id_pncp ?? op.numero_controle_pncp ?? String(i);
                  const isActive = !!opId && opId === selectedId;
                  return (
                    <LineRow
                      key={opId}
                      op={op}
                      opId={opId}
                      rank={i + 1}
                      active={isActive}
                      density={density}
                      onClick={() => {
                        const newState = isActive ? null : op;
                        setSelected(newState);
                        // Telemetria: registrar visualização quando abre detalhe
                        if (newState && opId) {
                          api.logView(opId).catch(() => {});
                        }
                      }}
                      favorited={favoritos.has(opId)}
                      onToggleFav={(e, id) => { e.stopPropagation(); toggleFav(id); }}
                      inCompare={compareList.includes(opId)}
                      onToggleCompare={(e, id) => {
                        e.stopPropagation();
                        setCompareList((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : prev.length < 3 ? [...prev, id] : prev
                        );
                      }}
                      crmStatus={crmStatuses[opId] ?? ""}
                      onCycleCrm={(e, id) => { e.stopPropagation(); cycleCrm(id); }}
                    />
                  );
                })}
              </div>
              {hasMore && !planLimited && (
                <div className="border-t border-[var(--line)] px-4 py-4 flex items-center gap-3">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-4 py-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--primary)] hover:border-[rgba(88,166,255,.4)] disabled:opacity-50 transition-colors"
                  >
                    {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {loading ? "Carregando..." : "Carregar mais"}
                  </button>
                  <span className="text-xs text-[var(--muted)] opacity-60">
                    Mostrando {items.length} de muitas oportunidades disponíveis
                  </span>
                </div>
              )}
              {/* Hint de teclado */}
              {items.length > 1 && (
                <div className="border-t border-[var(--line)] px-4 py-2 flex justify-end">
                  <span className="text-[10px] text-[var(--muted)] opacity-40">
                    <span className="font-mono font-bold">J/K</span> navegar · <span className="font-mono font-bold">ESC</span> fechar
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Painel lateral FIXED — fora do card, cobre a tela inteira ── */}
      {/* Backdrop — fecha ao clicar fora (mobile + desktop) */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        />
      )}

      {/* Painel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-[540px]",
          "border-l border-[var(--line)] bg-[var(--panel)] shadow-2xl",
          "transition-transform duration-300 ease-out will-change-transform flex flex-col",
          panelOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
      >
        {selected && (
          <DetalhePanel
            preview={selected}
            detalhe={detalhe}
            loading={detalheLoading}
            onClose={() => setSelected(null)}
          />
        )}
      </aside>

      {/* ── Barra de Comparação ── */}
      {compareList.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-blue-400/40 bg-[var(--panel)] px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur">
          <GitCompare className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-[var(--text)]">
            {compareList.length} selecionada{compareList.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-[var(--muted)]">(máx. 3)</span>
          <Link
            to={`/comparar?ids=${compareList.map(encodeURIComponent).join(",")}`}
            className="rounded-lg bg-blue-500/20 border border-blue-400/40 px-3 py-1 text-xs font-extrabold text-violet-300 hover:opacity-80 transition-opacity"
          >
            Comparar →
          </Link>
          <button
            onClick={() => setCompareList([])}
            className="rounded-full p-1 hover:bg-[var(--panel2)] transition-colors text-[var(--muted)] hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}
