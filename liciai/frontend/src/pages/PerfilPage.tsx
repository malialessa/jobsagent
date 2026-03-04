import { useState } from "react";
import { Tag, Sliders, Crown, X, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlano } from "@/hooks/usePlano";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { cn } from "@/lib/utils";

const PLANO_LABEL: Record<string, { nome: string; cor: string }> = {
  free:       { nome: "Free",       cor: "text-[var(--muted)]"  },
  pro:        { nome: "Pro",        cor: "text-[var(--gold)]"   },
  enterprise: { nome: "Enterprise", cor: "text-[var(--purple)]" },
  gov:        { nome: "Gov",        cor: "text-[var(--purple)]" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--line)]", className)} />;
}

// ─── Plano ────────────────────────────────────────────────────────────────────

function PlanoCard() {
  const { plano, loading, error } = usePlano();

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
        <Crown className="h-4 w-4 text-[var(--gold)]" />
        <span className="font-extrabold text-[var(--text)]">Plano e limites</span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        ) : plano ? (
          <div className="space-y-5">
            {/* Nome do plano */}
            <div>
              <div className={cn("text-2xl font-extrabold", PLANO_LABEL[plano.plano]?.cor ?? "text-[var(--text)]")}>
                {PLANO_LABEL[plano.plano]?.nome ?? plano.plano}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)] capitalize">
                Status: <span className="font-semibold text-[var(--text)]">{plano.status_pagamento}</span>
              </div>
            </div>

            {/* Limites */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "UFs monitora",    valor: plano.limites.uf,             unidade: "UFs"  },
                { label: "Oportunidades",   valor: plano.limites.oportunidades,  unidade: "/mês" },
                { label: "Documentos",      valor: plano.limites.docs,           unidade: "docs" },
                { label: "Produtos",        valor: plano.limites.produtos,       unidade: "itens"},
              ].map((l) => (
                <div key={l.label} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3">
                  <div className="text-lg font-extrabold tabular-nums text-[var(--text)]">
                    {l.valor >= 9999 ? "∞" : l.valor}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-[var(--muted)]">{l.label}</div>
                </div>
              ))}
            </div>

            {plano.plano === "free" && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(228,164,20,.2)] bg-[var(--panel-gold)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Faça upgrade para acessar mais UFs, score personalizado e alertas.
                </p>
                <Button size="sm" className="shrink-0">Upgrade</Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Palavras-chave ────────────────────────────────────────────────────────────

function KeywordsCard() {
  const { palavras, loading, saving, error, add, remove } = useConfiguracoes();
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await add(input.trim());
    setInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
        <Tag className="h-4 w-4 text-[var(--muted)]" />
        <span className="font-extrabold text-[var(--text)]">Palavras-chave do radar</span>
        <p className="ml-auto text-xs text-[var(--muted)]">
          Usadas para personalizar o score das oportunidades
        </p>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-wrap gap-2">
            {[80, 100, 70, 90, 60].map((w) => (
              <div key={w} className={`h-7 animate-pulse rounded-full bg-[var(--line)]`} style={{ width: w }} />
            ))}
          </div>
        ) : palavras.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nenhuma palavra-chave configurada. Adicione termos relacionados ao seu segmento.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {palavras.map((p) => (
              <span
                key={p.palavra_chave}
                className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-semibold text-[var(--text)]"
              >
                {p.palavra_chave}
                {p.peso !== 1 && (
                  <span className="text-[var(--muted)]">×{p.peso}</span>
                )}
                <button
                  onClick={() => remove(p.palavra_chave)}
                  disabled={saving}
                  className="ml-0.5 text-[var(--muted)] hover:text-red-400 disabled:opacity-40 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Campo de adição */}
        <div className="flex gap-2 pt-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex: software, redes, segurança da informação…"
            className="h-9 flex-1 bg-[var(--panel2)] text-sm"
            disabled={saving}
          />
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving || !input.trim()} className="gap-1.5 h-9">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Palavra-chave salva
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Configurações futuras ────────────────────────────────────────────────────

function ConfigsFuturas() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
        <Sliders className="h-4 w-4 text-[var(--muted)]" />
        <span className="font-extrabold text-[var(--text)]">Configurações avançadas</span>
        <span className="ml-auto rounded border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          Em breve
        </span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {[
          { label: "UFs de interesse e prioridade", sub: "Defina pesos por UF para ajustar o ranking" },
          { label: "Modalidades preferidas",        sub: "Pregão, Concorrência, Dispensa, Credenciamento" },
          { label: "Faixa de valor",                sub: "Filtre por valor mínimo e máximo do objeto" },
          { label: "Alertas por e-mail / Telegram", sub: "Notificações proativas de prazo e retificação" },
        ].map((c) => (
          <div key={c.label} className="flex items-center justify-between px-5 py-4 opacity-50">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{c.label}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{c.sub}</p>
            </div>
            <span className="text-[11px] font-bold text-[var(--muted)]">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PerfilPage() {
  return (
    <AppShell breadcrumb="Perfil & Radar">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Perfil e configurações</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Plano, limites e palavras-chave que definem o ranking do radar.
          </p>
        </div>

        <PlanoCard />
        <KeywordsCard />
        <ConfigsFuturas />
      </div>
    </AppShell>
  );
}
