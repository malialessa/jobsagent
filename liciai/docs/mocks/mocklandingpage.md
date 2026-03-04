import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Bell,
  Bot,
  Check,
  ChevronRight,
  Database,
  FileSearch,
  Gauge,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  Network,
  Sparkles,
  Upload,
  Users,
  Workflow,
} from "lucide-react";

/**
 * MOCK COMPLETO — EFETIVA (rebrand + produto SaaS)
 *
 * Este arquivo é um protótipo de LANDING PAGE + PREVIEW do APP.
 * Use como base para um Next.js + Tailwind + shadcn/ui.
 *
 * Paleta (extraída do branding Efetiva):
 * - Grafite: #0E0F11 / #151517
 * - Neutro claro: #C7C7C7
 * - Bronze (elementos): #7D6445 / #55402B
 * - Ouro (CTA): #E4A414
 * - Roxo (IA): #6A01BB
 */

const TOKENS = {
  bg: "#0E0F11",
  bg2: "#151517",
  panel: "#111318",
  panel2: "#0B0B0C",
  text: "#EDEDED",
  muted: "#B8B8B8",
  line: "rgba(255,255,255,0.08)",
  gold: "#E4A414",
  purple: "#6A01BB",
  bronze: "#7D6445",
  bronze2: "#55402B",
  light: "#C7C7C7",
};

function Pill({ icon: Icon, children }: any) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: TOKENS.line, color: TOKENS.muted, background: "rgba(255,255,255,0.02)" }}>
      {Icon ? <Icon className="h-3.5 w-3.5" style={{ color: TOKENS.gold }} /> : null}
      <span>{children}</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title, desc }: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.gold }} />
          <p className="text-xs tracking-widest uppercase" style={{ color: TOKENS.muted }}>
            {eyebrow}
          </p>
        </div>
      ) : null}
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: TOKENS.text }}>
        {title}
      </h2>
      {desc ? (
        <p className="mt-3 text-sm md:text-base" style={{ color: TOKENS.muted }}>
          {desc}
        </p>
      ) : null}
    </div>
  );
}

const BRAND_NAME_OPTIONS = [
  {
    name: "Efetiva LiciAI",
    tagline: "A inteligência preditiva da Efetiva para vencer licitações.",
    rationale: "Mantém o ativo ‘Efetiva’ + descreve o produto. Direto e memorizável.",
  },
  {
    name: "Efetiva Radar",
    tagline: "Radar de oportunidades com score e alertas.",
    rationale: "Nome curto, forte, excelente para SEO e para produto freemium.",
  },
  {
    name: "Efetiva Preditiva",
    tagline: "Do PNCP à decisão — com IA e conformidade.",
    rationale: "Posiciona a empresa como ‘plataforma’ (não só buscador).",
  },
  {
    name: "Efetiva Nexus",
    tagline: "Conecta edital, documentos, preço e ação.",
    rationale: "Bom para visão de ecossistema (comunidade + integrações).",
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: "IA conversacional multitarefa",
    desc: "Pergunte e execute: prazos, pendências, checklist e próximos passos — com notificações proativas.",
    tag: "Onipresente",
  },
  {
    icon: Gauge,
    title: "Matching com score realista",
    desc: "Compatibilidade por perfil, histórico de concorrência e padrão de compra do órgão — ranking diário.",
    tag: "Prioridade",
  },
  {
    icon: FileSearch,
    title: "Leitura de edital por IA",
    desc: "Resumo executivo + requisitos + riscos + perguntas críticas. Sem leitura infinita de PDF.",
    tag: "Enterprise+",
  },
  {
    icon: Layers,
    title: "Matriz de conformidade",
    desc: "Edital vs documentos: o que atende, o que falta, o que vence — e evidências anexadas.",
    tag: "Menos inabilitação",
  },
  {
    icon: Database,
    title: "Mapa de preços e contratos",
    desc: "P25/P50/P75 por item/região + histórico e ‘carona’ (atas vigentes) quando aplicável.",
    tag: "Precificação",
  },
  {
    icon: Workflow,
    title: "Integrações e fluxo interno",
    desc: "Conecta com CRM/ERP e exporta dados com limites por plano. Retenção por utilidade.",
    tag: "Modo empresa",
  },
];

const PLANS = [
  {
    key: "free",
    name: "Free / Starter",
    price: 0,
    audience: "Microempresas e iniciantes",
    bullets: [
      "1 UF monitorada",
      "20 oportunidades/mês",
      "1 usuário (UID)",
      "Gestão de docs (até 3)",
      "Comunidade",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 99,
    audience: "Pequenas empresas e consultorias",
    bullets: [
      "Até 3 UFs",
      "200 oportunidades/mês",
      "Score + alertas ativos",
      "Upload até 10 docs",
      "1 catálogo de produtos",
      "Integração (leitura)",
    ],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 499,
    audience: "Empresas médias e integradoras",
    bullets: [
      "UFs ilimitadas",
      "Licitações ilimitadas",
      "IA de análise de edital (Gemini)",
      "Matriz automática (IA)",
      "Mapa de preços + contratos",
      "3 usuários simultâneos",
      "Integração leitura/escrita",
    ],
    cta: "Falar com vendas",
    highlight: false,
  },
  {
    key: "gov",
    name: "Gov / White Label",
    price: 2500,
    audience: "Órgãos públicos e governos locais",
    bullets: [
      "Painel de transparência",
      "IA de atas e contratos",
      "API pública de dados locais",
      "Módulo de integridade de gastos",
      "SLA e governança",
    ],
    cta: "Solicitar proposta",
    highlight: false,
  },
];

function PricingCard({ plan, billing }: any) {
  const isMonthly = billing === "monthly";
  const price = plan.key === "gov" ? plan.price : plan.price;
  const display = plan.key === "free" ? "Gratuito" : plan.key === "gov" ? "Sob consulta" : `R$ ${price}`;

  return (
    <Card
      className="h-full"
      style={{
        background: plan.highlight ? "rgba(228,164,20,0.06)" : TOKENS.panel,
        borderColor: plan.highlight ? "rgba(228,164,20,0.35)" : TOKENS.line,
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg" style={{ color: TOKENS.text }}>
              {plan.name}
            </CardTitle>
            <p className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
              {plan.audience}
            </p>
          </div>
          {plan.highlight ? (
            <Badge style={{ background: TOKENS.gold, color: "#1a1a1a" }}>Mais escolhido</Badge>
          ) : (
            <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>
              {plan.key === "gov" ? "B2G" : "SaaS"}
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-end gap-2">
            <p className="text-3xl font-semibold" style={{ color: TOKENS.text }}>
              {display}
            </p>
            {plan.key !== "free" && plan.key !== "gov" ? (
              <p className="pb-1 text-xs" style={{ color: TOKENS.muted }}>
                /{isMonthly ? "mês" : "ano"}
              </p>
            ) : null}
          </div>
          {plan.key === "pro" ? (
            <p className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
              Entrada rápida. Conversão por valor.
            </p>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-2 text-sm" style={{ color: TOKENS.muted }}>
          {plan.bullets.map((b: string) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4" style={{ color: TOKENS.gold }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button
            className="w-full"
            style={{
              background: plan.highlight ? TOKENS.gold : "rgba(255,255,255,0.06)",
              color: plan.highlight ? "#1a1a1a" : TOKENS.text,
            }}
          >
            {plan.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-2 text-[11px]" style={{ color: "rgba(199,199,199,0.7)" }}>
            Sem fidelidade. Upgrade/downgrade automáticos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniTable() {
  const rows = [
    {
      rank: 1,
      title: "Pregão — Serviços de TI (suporte + monitoramento)",
      uf: "SP",
      close: "D-2",
      score: 92,
      flags: ["match alto", "risco médio"],
    },
    {
      rank: 2,
      title: "Concorrência — Obras (reforma) + materiais",
      uf: "PR",
      close: "D-5",
      score: 81,
      flags: ["docs pendentes", "prazos"],
    },
    {
      rank: 3,
      title: "Dispensa — Equipamentos de rede (lote único)",
      uf: "MT",
      close: "D-1",
      score: 77,
      flags: ["preço competitivo"],
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: TOKENS.line, background: TOKENS.panel2 }}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: TOKENS.line }}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: TOKENS.purple }} />
          <p className="text-sm font-medium" style={{ color: TOKENS.text }}>
            Ranking diário — oportunidades priorizadas
          </p>
        </div>
        <Pill icon={Bell}>Alertas diários</Pill>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider" style={{ color: "rgba(199,199,199,0.65)" }}>
          <div className="col-span-1">#</div>
          <div className="col-span-6">Oportunidade</div>
          <div className="col-span-1">UF</div>
          <div className="col-span-2">Enc.</div>
          <div className="col-span-2">Score</div>
        </div>
        <div className="mt-2 space-y-2">
          {rows.map((r) => (
            <div
              key={r.rank}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}
            >
              <div className="col-span-1 text-sm" style={{ color: TOKENS.light }}>
                {r.rank}
              </div>
              <div className="col-span-6">
                <p className="text-sm leading-tight" style={{ color: TOKENS.text }}>
                  {r.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {r.flags.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border px-2 py-0.5 text-[11px]"
                      style={{ borderColor: TOKENS.line, color: "rgba(199,199,199,0.75)" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-1 text-sm" style={{ color: TOKENS.light }}>
                {r.uf}
              </div>
              <div className="col-span-2 text-sm" style={{ color: TOKENS.light }}>
                {r.close}
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-full rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${r.score}%`, background: TOKENS.gold }}
                    />
                  </div>
                  <span className="text-sm" style={{ color: TOKENS.text }}>
                    {r.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniChat() {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: TOKENS.panel }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: TOKENS.purple }} />
          <p className="text-sm font-medium" style={{ color: TOKENS.text }}>
            Assistente — comandos práticos
          </p>
        </div>
        <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>
          IA multitarefa
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {["Quais licitações fecham em 3 dias?", "O que está pendente na habilitação desta licitação?", "Me avise se sair retificação.", "Gerar checklist de documentos."]
          .map((q) => (
            <div key={q} className="flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: TOKENS.line }}>
              <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: "rgba(106,1,187,0.15)" }}>
                <Bot className="h-3.5 w-3.5" style={{ color: TOKENS.purple }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: TOKENS.text }}>{q}</p>
                <p className="text-xs" style={{ color: TOKENS.muted }}>Resposta estruturada + ação sugerida.</p>
              </div>
            </div>
          ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" style={{ background: TOKENS.gold, color: "#1a1a1a" }}>
          Criar alerta
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.text }}>
          Analisar edital
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const items = [
    { icon: Lock, title: "Autenticação e autorização", desc: "Firebase Authentication + roles por tenant_id. APIs exigem token JWT." },
    { icon: Network, title: "Automação segura", desc: "Cloud Scheduler invoca rotinas via OIDC e Service Accounts dedicadas." },
    { icon: Database, title: "Controle de acesso a dados", desc: "Políticas por plano e por cliente (Row Level Security / filtros por tenant)." },
    { icon: Upload, title: "Documentos", desc: "Armazenamento em buckets segregados + trilha de auditoria e expiração." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((it) => (
        <Card key={it.title} style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(228,164,20,0.08)" }}>
                <it.icon className="h-5 w-5" style={{ color: TOKENS.gold }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>{it.title}</p>
                <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>{it.desc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EfetivaLiciAIMock() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [brandIndex, setBrandIndex] = useState(0);

  const brand = useMemo(() => BRAND_NAME_OPTIONS[brandIndex], [brandIndex]);

  return (
    <div className="min-h-screen" style={{ background: `radial-gradient(1200px 700px at 20% 0%, rgba(106,1,187,0.18), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(228,164,20,0.14), transparent 55%), ${TOKENS.bg}` }}>
      {/* Top bar */}
      <div className="border-b" style={{ borderColor: TOKENS.line, background: "rgba(14,15,17,0.75)", backdropFilter: "blur(10px)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border flex items-center justify-center" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
              <span className="text-sm font-semibold" style={{ color: TOKENS.text }}>E</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: TOKENS.text }}>{brand.name}</p>
              <p className="text-[11px]" style={{ color: TOKENS.muted }}>by Efetiva Licitações</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5 text-sm" style={{ color: TOKENS.muted }}>
            <a href="#produto" className="hover:opacity-90">Produto</a>
            <a href="#planos" className="hover:opacity-90">Planos</a>
            <a href="#seguranca" className="hover:opacity-90">Segurança</a>
            <a href="#como-funciona" className="hover:opacity-90">Como funciona</a>
            <a href="#contato" className="hover:opacity-90">Contato</a>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden sm:inline-flex" style={{ borderColor: TOKENS.line, color: TOKENS.text, background: "transparent" }}>
              Entrar
            </Button>
            <Button style={{ background: TOKENS.gold, color: "#1a1a1a" }}>
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 md:pt-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill icon={Sparkles}>IA aplicada a licitações</Pill>
              <Pill icon={Bell}>Alertas proativos</Pill>
              <Pill icon={FileSearch}>Menos PDF</Pill>
            </div>

            <h1 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight" style={{ color: TOKENS.text }}>
              Do PNCP à decisão —
              <span style={{ color: TOKENS.gold }}> com prioridade, conformidade</span> e ação.
            </h1>
            <p className="mt-4 text-sm md:text-base" style={{ color: TOKENS.muted }}>
              {brand.tagline} Ranking diário por chance real, leitura de edital por IA e matriz de conformidade que reduz risco de inabilitação.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button style={{ background: TOKENS.gold, color: "#1a1a1a" }}>
                Criar conta em 2 minutos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.text, background: "transparent" }}>
                Ver demo (3 min)
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <div className="ml-0 md:ml-2 text-xs" style={{ color: "rgba(199,199,199,0.75)" }}>
                Sem cartão no Free. Upgrade quando fizer sentido.
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {[{ k: "+25", v: "clientes" }, { k: "+350", v: "licitações" }, { k: "80%", v: "taxa de vitória" }].map((s) => (
                <div key={s.v} className="rounded-2xl border px-3 py-3" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xl font-semibold" style={{ color: TOKENS.text }}>{s.k}</p>
                  <p className="text-xs" style={{ color: TOKENS.muted }}>{s.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <p className="text-xs" style={{ color: TOKENS.muted }}>Rebrand (com Efetiva):</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_NAME_OPTIONS.map((b, i) => (
                  <button
                    key={b.name}
                    onClick={() => setBrandIndex(i)}
                    className="rounded-full border px-3 py-1 text-xs transition"
                    style={{
                      borderColor: i === brandIndex ? "rgba(228,164,20,0.5)" : TOKENS.line,
                      background: i === brandIndex ? "rgba(228,164,20,0.10)" : "rgba(255,255,255,0.02)",
                      color: i === brandIndex ? TOKENS.text : TOKENS.muted,
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs" style={{ color: "rgba(199,199,199,0.75)" }}>
              {brand.rationale}
            </p>
          </div>

          <div className="space-y-4">
            <MiniTable />
            <MiniChat />
          </div>
        </div>
      </section>

      {/* Produto */}
      <section id="produto" className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="Produto"
          title="Diferenciais que criam vantagem competitiva (e retenção)"
          desc="O objetivo não é ‘achar edital’. É reduzir ruído, acelerar decisão e diminuir risco — no fluxo real do fornecedor."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(106,1,187,0.12)" }}>
                    <f.icon className="h-5 w-5" style={{ color: TOKENS.purple }} />
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>
                    {f.tag}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold" style={{ color: TOKENS.text }}>
                  {f.title}
                </p>
                <p className="mt-2 text-sm" style={{ color: TOKENS.muted }}>
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border p-5 md:p-6" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Moat (defensabilidade)</p>
              <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                Base proprietária de comportamento: licitações vistas/disputadas/ganhas + perfil de órgão e concorrência. A recomendação melhora com o uso.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill icon={Users}>Comunidade & consórcios</Pill>
              <Pill icon={Globe}>Cobertura nacional</Pill>
              <Pill icon={Database}>BigQuery (camada core)</Pill>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="Fluxo"
          title="Onboarding simples. Valor no primeiro minuto."
          desc="Sem jargão. O sistema aprende conforme você usa — e libera recursos conforme o plano."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { n: "1", title: "Cadastro", desc: "Conta (Firebase Auth). Tenant e role criados automaticamente." },
            { n: "2", title: "Perfil", desc: "UFs, palavras-chave, catálogo e regras de score (opcional)." },
            { n: "3", title: "Radar", desc: "Ranking diário com score, filtros e alertas (e-mail/Telegram)." },
            { n: "4", title: "Ação", desc: "Analisar edital (Enterprise+), checklist e matriz de conformidade." },
          ].map((s) => (
            <Card key={s.n} style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(228,164,20,0.10)" }}>
                    <span className="text-sm font-semibold" style={{ color: TOKENS.gold }}>{s.n}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>{s.title}</p>
                </div>
                <p className="mt-3 text-sm" style={{ color: TOKENS.muted }}>{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card style={{ background: TOKENS.panel2, borderColor: TOKENS.line }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" style={{ color: TOKENS.gold }} />
                <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Rotina diária (autônoma)</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: TOKENS.muted }}>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Scheduler coleta PNCP e fontes complementares.</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>BigQuery normaliza (stg → core) com MERGE idempotente.</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Função de score aplica pesos e gera ranking por cliente.</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Alertas disparam por regras e eventos (prazo/retificação).</li>
              </ul>
            </CardContent>
          </Card>

          <Card style={{ background: TOKENS.panel2, borderColor: TOKENS.line }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" style={{ color: TOKENS.purple }} />
                <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Documentos (compliance)</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: TOKENS.muted }}>
                <li className="flex gap-2"><span style={{ color: TOKENS.purple }}>•</span>Upload + validade + tipo (atestado, certidão, balanço…).</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.purple }}>•</span>IA extrai requisitos do edital e cruza com evidências.</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.purple }}>•</span>Matriz mostra: atende/pendente + ação recomendada.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <SectionTitle
            eyebrow="Planos"
            title="Monetização por camadas: do radar ao motor de conformidade"
            desc="Freemium para aquisição. Pro para automação. Enterprise para IA de edital e inteligência avançada. Gov para B2G e white label."
          />

          <div className="flex items-center gap-2 rounded-full border p-1" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
            <button
              onClick={() => setBilling("monthly")}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                color: billing === "monthly" ? "#1a1a1a" : TOKENS.muted,
                background: billing === "monthly" ? TOKENS.gold : "transparent",
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("annual")}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                color: billing === "annual" ? "#1a1a1a" : TOKENS.muted,
                background: billing === "annual" ? TOKENS.gold : "transparent",
              }}
            >
              Anual (desconto)
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {PLANS.map((p) => (
            <PricingCard key={p.key} plan={p} billing={billing} />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(228,164,20,0.10)" }}>
              <Gauge className="h-5 w-5" style={{ color: TOKENS.gold }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Add-ons (cross-sell futuro)</p>
              <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                IA ilimitada • Radar de nichos • Mapa de preços avançado — vendidos por valor incremental, não por complexidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section id="seguranca" className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="Governança"
          title="Arquitetura serverless, multi-tenant e auditável"
          desc="Planejada para escalar com custo controlado e com limites por plano (quotas), sem comprometer segurança."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card style={{ background: TOKENS.panel2, borderColor: TOKENS.line }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5" style={{ color: TOKENS.gold }} />
                <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Componentes (GCP/Firebase)</p>
              </div>
              <div className="mt-4 grid gap-2 text-sm" style={{ color: TOKENS.muted }}>
                {["Firebase Auth (UID → tenant_id)", "Cloud Functions (APIs + rotinas)", "Cloud Scheduler (jobs)", "BigQuery (stg/core/dim)", "Vertex AI (Gemini/Doc AI)", "GCS (docs)"]
                  .map((x) => (
                    <div key={x} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: TOKENS.line }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.gold }} />
                      <span>{x}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <SecurityPanel />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: TOKENS.line, background: "rgba(106,1,187,0.08)" }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(106,1,187,0.18)" }}>
              <Lock className="h-5 w-5" style={{ color: TOKENS.purple }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Feature flags e billing</p>
              <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                Stripe/Mercado Pago via webhook → atualiza plano/limites. Remote Config controla flags. Middleware aplica quota e rate limit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview do App */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="App"
          title="Mock do produto: telas essenciais (MVP → Escala)"
          desc="O núcleo do app é ‘prioridade + conformidade’. O resto é expansão por camadas: preço, contrato, comunidade e B2G."
        />

        <div className="mt-8">
          <Tabs defaultValue="dashboard">
            <TabsList className="flex flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${TOKENS.line}` }}>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="mapa">Mapa de preços</TabsTrigger>
              <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
              <TabsTrigger value="admin">Admin/Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <MiniTable />
                <Card style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5" style={{ color: TOKENS.gold }} />
                        <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Alertas (D-3 / retificações)</p>
                      </div>
                      <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>Pro+</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      {["2 licitações encerram em até 72h", "1 edital retificado nas últimas 48h", "1 oportunidade com risco de habilitação"].map((x) => (
                        <div key={x} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                          <p className="text-sm" style={{ color: TOKENS.text }}>{x}</p>
                          <ChevronRight className="h-4 w-4" style={{ color: TOKENS.muted }} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border p-3" style={{ borderColor: TOKENS.line, background: "rgba(228,164,20,0.06)" }}>
                      <p className="text-xs font-semibold" style={{ color: TOKENS.text }}>Próxima ação recomendada</p>
                      <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                        Enviar certidão X (vence em 12 dias) e anexar atestado Y para elevar score em +7.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="mt-4">
              <Card style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5" style={{ color: TOKENS.gold }} />
                      <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Gestão de documentos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>Free: 3</Badge>
                      <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>Pro: 10</Badge>
                      <Badge style={{ background: TOKENS.gold, color: "#1a1a1a" }}>Enterprise: ∞</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["Certidão FGTS", "Balanço Patrimonial", "Atestado Técnico"].map((x) => (
                      <div key={x} className="rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>{x}</p>
                        <p className="mt-1 text-xs" style={{ color: TOKENS.muted }}>Validade monitorada • evidência anexada</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: "rgba(228,164,20,0.35)", color: TOKENS.gold }}>
                            OK
                          </span>
                          <Button size="sm" variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.text }}>
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(106,1,187,0.08)" }}>
                    <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Matriz de conformidade (IA)</p>
                    <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                      Para cada licitação, a plataforma cruza requisitos do edital com seus documentos, marcando ATENDE/PENDENTE e sugerindo evidências.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapa" className="mt-4">
              <Card style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" style={{ color: TOKENS.gold }} />
                      <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Mapa de preços</p>
                    </div>
                    <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>Pro+</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[{ k: "P25", v: "R$ 1.980" }, { k: "P50", v: "R$ 2.350" }, { k: "P75", v: "R$ 2.890" }].map((s) => (
                      <div key={s.k} className="rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs" style={{ color: TOKENS.muted }}>{s.k}</p>
                        <p className="mt-1 text-xl font-semibold" style={{ color: TOKENS.text }}>{s.v}</p>
                        <p className="mt-1 text-xs" style={{ color: "rgba(199,199,199,0.75)" }}>por item/região • histórico</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(228,164,20,0.06)" }}>
                    <p className="text-sm" style={{ color: TOKENS.muted }}>
                      Futuro: mapa do Brasil com investimento por UF/município, filtrável por categoria e item.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comunidade" className="mt-4">
              <Card style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" style={{ color: TOKENS.gold }} />
                      <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Comunidade & networking</p>
                    </div>
                    <Badge variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.muted }}>Moat</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[{ t: "Buscar parceiros para consórcio", d: "Matching por categoria, região e histórico." }, { t: "Subcontratação sob demanda", d: "Oferta e demanda por serviço especializado." }].map((x) => (
                      <div key={x.t} className="rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>{x.t}</p>
                        <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>{x.d}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-4">
              <Card style={{ background: TOKENS.panel, borderColor: TOKENS.line }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5" style={{ color: TOKENS.gold }} />
                      <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Admin, roles e billing</p>
                    </div>
                    <Badge style={{ background: TOKENS.gold, color: "#1a1a1a" }}>admin</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[{ r: "viewer", p: "Visualizar oportunidades e relatórios" }, { r: "analyst", p: "Gerenciar docs e produtos" }, { r: "admin", p: "Configurar plano, limites e usuários" }].map((x) => (
                      <div key={x.r} className="rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>{x.r}</p>
                        <p className="mt-1 text-sm" style={{ color: TOKENS.muted }}>{x.p}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: TOKENS.line, background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-sm" style={{ color: TOKENS.muted }}>
                      Checkout (Stripe/Mercado Pago) → webhook atualiza dim.cliente (plano, limites) → flags liberam módulos instantaneamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA final */}
      <section id="contato" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-3xl border p-6 md:p-8" style={{ borderColor: TOKENS.line, background: `linear-gradient(135deg, rgba(228,164,20,0.14), rgba(106,1,187,0.10))` }}>
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-semibold" style={{ color: TOKENS.text }}>
                Pronto para parar de caçar edital e começar a escolher batalhas?
              </h3>
              <p className="mt-2 text-sm" style={{ color: TOKENS.muted }}>
                Comece no Free e evolua para Pro/Enterprise conforme o valor aparecer. Para Gov/White Label, abrimos proposta com SLA e governança.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button style={{ background: TOKENS.gold, color: "#1a1a1a" }}>
                  Começar grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" style={{ borderColor: TOKENS.line, color: TOKENS.text, background: "transparent" }}>
                  Agendar demo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: TOKENS.line, background: "rgba(14,15,17,0.65)" }}>
              <p className="text-sm font-semibold" style={{ color: TOKENS.text }}>Checklist de decisão (rápido)</p>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: TOKENS.muted }}>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Você quer ranking diário por chance real?</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Precisa reduzir risco de inabilitação?</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Quer precificar com dados (P25/P50/P75)?</li>
                <li className="flex gap-2"><span style={{ color: TOKENS.gold }}>•</span>Quer integrar com CRM/ERP sem retrabalho?</li>
              </ul>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "rgba(199,199,199,0.75)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.gold }} />
                Se respondeu “sim” para 2+, o Pro já paga o mês.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6" style={{ borderColor: TOKENS.line }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-xs" style={{ color: "rgba(199,199,199,0.7)" }}>
              © {new Date().getFullYear()} Efetiva • Plataforma SaaS + consultoria (quando necessário)
            </p>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: "rgba(199,199,199,0.7)" }}>
              <a href="#" className="hover:opacity-90">Privacidade</a>
              <a href="#" className="hover:opacity-90">Termos</a>
              <a href="#" className="hover:opacity-90">Segurança</a>
              <a href="#" className="hover:opacity-90">Contato</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


modoclaro-escuro
