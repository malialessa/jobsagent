import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Zap, Building2, Shield, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { usePlano } from "@/hooks/usePlano";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Dados dos planos ─────────────────────────────────────────────────────────

const PLANOS = [
  {
    id: "free" as const,
    nome: "Free",
    preco: "R$ 0",
    periodo: "",
    descricao: "Para conhecer a plataforma",
    cor: "border-[var(--line)]",
    icon: <Shield className="h-5 w-5 text-[var(--muted)]" />,
    features: [
      "Até 20 oportunidades",
      "1 UF",
      "3 documentos",
      "Score básico",
    ],
    cta: null,
    highlight: false,
  },
  {
    id: "pro" as const,
    nome: "Pro",
    preco: "R$ 299",
    periodo: "/mês",
    descricao: "Para equipes de licitação",
    cor: "border-[var(--gold)]",
    icon: <Zap className="h-5 w-5 text-[var(--gold)]" />,
    features: [
      "Até 200 oportunidades",
      "3 UFs",
      "10 documentos",
      "Score IA personalizado",
      "Alertas por e-mail",
      "Itens do processo",
    ],
    cta: "pro",
    highlight: true,
  },
  {
    id: "enterprise" as const,
    nome: "Enterprise",
    preco: "R$ 999",
    periodo: "/mês",
    descricao: "Para grandes operações",
    cor: "border-sky-500/40",
    icon: <Building2 className="h-5 w-5 text-sky-400" />,
    features: [
      "Oportunidades ilimitadas",
      "Todas as UFs",
      "Documentos ilimitados",
      "Score IA + IA generativa",
      "Alertas por e-mail",
      "Suporte dedicado",
      "API access",
    ],
    cta: "enterprise",
    highlight: false,
  },
];

// ─── Componente de cartão de plano ────────────────────────────────────────────

function PlanoCard({
  plano,
  planoAtual,
  onAssinar,
  loading,
}: {
  plano: (typeof PLANOS)[number];
  planoAtual: string;
  onAssinar: (plano: "pro" | "enterprise") => void;
  loading: boolean;
}) {
  const isAtual = planoAtual === plano.id;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-[var(--panel)] p-6 transition-shadow",
        plano.highlight
          ? "shadow-[0_0_0_1px_rgba(228,164,20,.3),0_4px_24px_rgba(228,164,20,.08)]"
          : "",
        plano.cor
      )}
    >
      {plano.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-[rgba(228,164,20,.4)] bg-[var(--panel-gold)] px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-[var(--gold)]">
            Mais popular
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        {plano.icon}
        <h3 className="text-base font-extrabold text-[var(--text)]">{plano.nome}</h3>
        {isAtual && (
          <span className="ml-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
            Plano atual
          </span>
        )}
      </div>
      <div className="mb-1">
        <span className="text-3xl font-black tabular-nums text-[var(--text)]">{plano.preco}</span>
        {plano.periodo && (
          <span className="text-sm text-[var(--muted)]">{plano.periodo}</span>
        )}
      </div>
      <p className="mb-5 text-xs text-[var(--muted)]">{plano.descricao}</p>
      <ul className="mb-6 flex-1 space-y-2">
        {plano.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-[var(--text)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {f}
          </li>
        ))}
      </ul>
      {plano.cta ? (
        <Button
          onClick={() => onAssinar(plano.cta as "pro" | "enterprise")}
          disabled={isAtual || loading}
          className={cn(
            "w-full font-extrabold",
            plano.highlight ? "" : "variant-outline"
          )}
          variant={plano.highlight ? "default" : "outline"}
        >
          {isAtual ? "Plano atual" : loading ? "Aguarde…" : `Assinar ${plano.nome}`}
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>
          Gratuito
        </Button>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PlanosPage() {
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get("checkout");
  const { plano: planoInfo, loading: planoLoading } = usePlano();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checkout === "success") {
      // O webhook processa em background — mostrar mensagem e aguardar
    }
  }, [checkout]);

  async function handleAssinar(plano: "pro" | "enterprise") {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.createCheckout(plano);
      if (url) window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao iniciar checkout. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  const planoAtual = planoInfo?.plano ?? "free";

  return (
    <AppShell breadcrumb="Planos">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Planos e preços</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Escolha o plano ideal para a operação de licitações da sua empresa.
          </p>
        </div>

        {/* Banner checkout success */}
        {checkout === "success" && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold text-[var(--text)]">
              Pagamento confirmado! Seu plano será atualizado em instantes.
            </p>
          </div>
        )}

        {/* Banner checkout cancel */}
        {checkout === "cancel" && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--muted)]">
              Checkout cancelado. Você ainda está no plano <strong className="capitalize">{planoAtual}</strong>.
            </p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4">
            <p className="text-sm font-semibold text-red-400">{error}</p>
          </div>
        )}

        {/* Cards */}
        {planoLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--panel)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PLANOS.map((p) => (
              <PlanoCard
                key={p.id}
                plano={p}
                planoAtual={planoAtual}
                onAssinar={handleAssinar}
                loading={loading}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-[var(--muted)]">
          Pagamentos processados com segurança via Stripe.{" "}
          <a
            href="https://stripe.com/br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--gold)] hover:opacity-80"
          >
            Saiba mais <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </AppShell>
  );
}
