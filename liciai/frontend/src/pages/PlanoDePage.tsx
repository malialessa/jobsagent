import { useState, useCallback } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

// ─── Persistência localStorage ────────────────────────────────────────────────

const LS_KEY = "efetiva_plano_checks_v1";

function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveChecks(c: Record<string, boolean>) {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  label: string;
  sub?: Task[];
}

interface Sprint {
  id: string;
  titulo: string;
  objetivo: string;
  semanas: string;
  fase: 1 | 2 | 3;
  deps: string;
  aceite: string[];
  tasks: Task[];
}

interface TodoSection {
  id: string;
  titulo: string;
  tasks: Task[];
}

// ─── Dados — Sprints ──────────────────────────────────────────────────────────

const SPRINTS: Sprint[] = [
  {
    id: "s0",
    titulo: "Sprint 0 — Preparação",
    objetivo: "Reduzir risco de execução e alinhar governança.",
    semanas: "1 semana",
    fase: 1,
    deps: "Nenhuma",
    aceite: ["Backlog priorizado por impacto x esforço", "Baseline de métricas publicada", "Processo de deploy aprovado"],
    tasks: [
      { id: "s0.1", label: "Definir objetivos trimestrais e métricas oficiais" },
      { id: "s0.2", label: "Criar board de execução com épicos e responsáveis" },
      { id: "s0.3", label: "Definir DoR/DoD para tasks técnicas e de produto" },
      { id: "s0.4", label: "Fechar checklist de deploy/rollback" },
    ],
  },
  {
    id: "s1",
    titulo: "Sprint 1 — Planos e quotas",
    objetivo: "Aplicar lógica comercial na API.",
    semanas: "1–2 semanas",
    fase: 1,
    deps: "Sprint 0",
    aceite: ["Cenários Free/Pro/Enterprise testados e aprovados"],
    tasks: [
      { id: "s1.1", label: "Migrar `dim.cliente` para campos de plano e limites" },
      { id: "s1.2", label: "Implementar middleware de quotas por tipo de uso" },
      { id: "s1.3", label: "Cobrir endpoints com verificação de plano" },
      { id: "s1.4", label: "Criar mensagens de erro padronizadas para upgrade" },
    ],
  },
  {
    id: "s2",
    titulo: "Sprint 2 — Billing",
    objetivo: "Desbloquear receita transacional.",
    semanas: "1–2 semanas",
    fase: 1,
    deps: "Sprint 1",
    aceite: ["Upgrade em até 60s", "Downgrade executado sem intervenção manual"],
    tasks: [
      { id: "s2.1", label: "Criar checkout session" },
      { id: "s2.2", label: "Criar webhook idempotente de pagamento" },
      { id: "s2.3", label: "Atualizar plano automaticamente" },
      { id: "s2.4", label: "Implementar downgrade por expiração" },
    ],
  },
  {
    id: "s3",
    titulo: "Sprint 3 — API e UX diária",
    objetivo: "Melhorar consumo do core — oportunidades + score.",
    semanas: "1–2 semanas",
    fase: 1,
    deps: "Sprint 1",
    aceite: ["p95 dentro da meta", "Jornada de consulta consistente no frontend"],
    tasks: [
      { id: "s3.1", label: "Padronizar paginação limit/offset" },
      { id: "s3.2", label: "Implementar filtros por UF/modalidade/valor/prazo" },
      { id: "s3.3", label: "Persistir estado de filtros na URL" },
      { id: "s3.4", label: "Melhorar estados de carregamento/erro/vazio" },
    ],
  },
  {
    id: "s4",
    titulo: "Sprint 4 — Ingestão multi-fonte",
    objetivo: "Ampliar cobertura e qualidade de dados.",
    semanas: "2 semanas",
    fase: 1,
    deps: "Sprint 0",
    aceite: ["Cobertura mínima atingida", "Taxa de falha de ingestão abaixo da meta"],
    tasks: [
      { id: "s4.1", label: "Conectores incrementais PNCP endurecidos" },
      { id: "s4.2", label: "Ingestão Compras.gov — contratações, itens, contratos, ARP" },
      { id: "s4.3", label: "MERGE diário e validação de consistência" },
      { id: "s4.4", label: "Monitoramento de cobertura por UF/fonte" },
    ],
  },
  {
    id: "s5",
    titulo: "Sprint 5 — Mapa de preços + contratos",
    objetivo: "Elevar valor do Pro/Enterprise.",
    semanas: "2 semanas",
    fase: 2,
    deps: "Sprint 4",
    aceite: ["Resultados estatísticos consistentes e úteis para precificação"],
    tasks: [
      { id: "s5.1", label: "Tabela de preços e view P25/P50/P75" },
      { id: "s5.2", label: "Interface de mapa de preços" },
      { id: "s5.3", label: "Módulo de contratos com alertas de vencimento" },
      { id: "s5.4", label: "Exportação conforme plano" },
    ],
  },
  {
    id: "s6",
    titulo: "Sprint 6 — IA de editais",
    objetivo: "Entregar diferencial Enterprise.",
    semanas: "2–3 semanas",
    fase: 2,
    deps: "Sprint 4",
    aceite: ["Taxa de sucesso de processamento > meta interna"],
    tasks: [
      { id: "s6.1", label: "Pipeline completo de análise de PDF" },
      { id: "s6.2", label: "Modelo de saída estruturada padronizada" },
      { id: "s6.3", label: "UI para visualização do resultado" },
      { id: "s6.4", label: "Logging de qualidade da análise" },
    ],
  },
  {
    id: "s7",
    titulo: "Sprint 7 — Conformidade + catálogo",
    objetivo: "Completar ciclo edital → aptidão → ação.",
    semanas: "2 semanas",
    fase: 2,
    deps: "Sprint 6",
    aceite: ["Usuário consegue identificar pendências e agir sem fricção"],
    tasks: [
      { id: "s7.1", label: "Upload e gestão de documentos" },
      { id: "s7.2", label: "Matriz de conformidade manual e automática" },
      { id: "s7.3", label: "Catálogo do fornecedor" },
      { id: "s7.4", label: "Matching semântico produto x edital" },
    ],
  },
  {
    id: "s8",
    titulo: "Sprint 8 — Growth e retenção",
    objetivo: "Aumentar conversão e reduzir churn.",
    semanas: "2 semanas",
    fase: 3,
    deps: "Sprint 2 e Sprint 3",
    aceite: ["Melhora de conversão e retenção comparado ao baseline"],
    tasks: [
      { id: "s8.1", label: "Alertas proativos inteligentes" },
      { id: "s8.2", label: "Relatórios de performance por tenant" },
      { id: "s8.3", label: "Experimentos de conversão Free → Pro" },
      { id: "s8.4", label: "Ajustes de pricing e gatilhos" },
    ],
  },
];

// ─── Dados — To-Do Mestre ─────────────────────────────────────────────────────

const TODO_SECTIONS: TodoSection[] = [
  {
    id: "7.1",
    titulo: "Fundação",
    tasks: [
      { id: "7.1.1", label: "Definir North Star Metric e metas trimestrais" },
      { id: "7.1.2", label: "Definir baseline atual de MRR, DAU/WAU, conversão e custo" },
      { id: "7.1.3", label: "Formalizar ambientes dev, stage, prod" },
      { id: "7.1.4", label: "Criar checklist de deploy e rollback para backend/frontend" },
      { id: "7.1.5", label: "Definir convenção de versionamento de API e contratos JSON" },
    ],
  },
  {
    id: "7.2",
    titulo: "Dados e ingestão",
    tasks: [
      { id: "7.2.1", label: "Consolidar dicionário de campos PNCP para stg e core" },
      { id: "7.2.2", label: "Implementar coleta incremental PNCP por data com paginação completa" },
      { id: "7.2.3", label: "Implementar deduplicação por id_pncp + hash de carga" },
      { id: "7.2.4", label: "Registrar trilha de execução — início/fim/volume/erro/custo" },
      {
        id: "7.2.5",
        label: "Implementar ingestão Compras.gov — módulos prioritários",
        sub: [
          { id: "7.2.5a", label: "Contratações PNCP 14133" },
          { id: "7.2.5b", label: "Itens de contratações" },
          { id: "7.2.5c", label: "Contratos e itens de contrato" },
          { id: "7.2.5d", label: "ARP e itens da ARP" },
        ],
      },
      { id: "7.2.6", label: "Definir estratégia de uso do Transferegov por caso de uso" },
      { id: "7.2.7", label: "Criar rotinas MERGE diárias stg → core idempotentes" },
    ],
  },
  {
    id: "7.3",
    titulo: "Plano, limites e autorização",
    tasks: [
      { id: "7.3.1", label: "Evoluir schema dim.cliente com plano/status/quotas" },
      { id: "7.3.2", label: "Criar middleware plan_limits reutilizável para todas as rotas pagas" },
      { id: "7.3.3", label: "Implementar contadores por período (dia/mês) para quotas de uso" },
      { id: "7.3.4", label: "Implementar limite por UF por tenant" },
      { id: "7.3.5", label: "Implementar limite de usuários por tenant/plano" },
      { id: "7.3.6", label: "Implementar rate-limit por plano (Free/Pro/Enterprise)" },
      { id: "7.3.7", label: "Padronizar erro de limite com CTA de upgrade" },
    ],
  },
  {
    id: "7.4",
    titulo: "Billing e monetização",
    tasks: [
      { id: "7.4.1", label: "Escolher provedor de pagamento — Stripe ou Mercado Pago" },
      { id: "7.4.2", label: "Implementar endpoint de criação de checkout" },
      { id: "7.4.3", label: "Implementar webhook idempotente de confirmação de pagamento" },
      { id: "7.4.4", label: "Atualizar dim.cliente automaticamente após pagamento" },
      { id: "7.4.5", label: "Implementar downgrade por expiração/cancelamento (job agendado)" },
      { id: "7.4.6", label: "Criar trilha de auditoria de assinaturas/eventos de pagamento" },
      { id: "7.4.7", label: "Criar tela de billing no frontend com estado do plano" },
    ],
  },
  {
    id: "7.5",
    titulo: "Produto — UX e fluxo de valor",
    tasks: [
      { id: "7.5.1", label: "Revisar onboarding para entregar 1º valor em menos de 10 minutos" },
      { id: "7.5.2", label: "Implementar filtro persistente em URL (estado compartilhável)" },
      { id: "7.5.3", label: "Implementar empty states com orientação de ação" },
      { id: "7.5.4", label: "Exibir score com explicabilidade — fatores do score" },
      { id: "7.5.5", label: "Implementar alertas diários — e-mail; Telegram opcional" },
      { id: "7.5.6", label: "Implementar bloqueios elegantes por plano no frontend" },
    ],
  },
  {
    id: "7.6",
    titulo: "IA aplicada — fase premium",
    tasks: [
      { id: "7.6.1", label: "Definir contrato JSON da análise de edital — resumo, checklist, riscos, pendências" },
      { id: "7.6.2", label: "Implementar pipeline upload → extração texto → chamada IA → persistência" },
      { id: "7.6.3", label: "Criar endpoint de consulta do resultado da análise por edital" },
      {
        id: "7.6.4",
        label: "Implementar matriz de conformidade",
        sub: [
          { id: "7.6.4a", label: "Versão manual — Pro" },
          { id: "7.6.4b", label: "Versão automática com IA — Enterprise" },
        ],
      },
      { id: "7.6.5", label: "Implementar catálogo de produtos com embeddings" },
      { id: "7.6.6", label: "Implementar matching semântico produto x edital" },
    ],
  },
  {
    id: "7.7",
    titulo: "Mapa de preços e contratos",
    tasks: [
      { id: "7.7.1", label: "Modelar core.itens_precos com granularidade por item/região/tempo" },
      { id: "7.7.2", label: "Construir view estatística P25/P50/P75" },
      { id: "7.7.3", label: "Construir interface de mapa de preços — filtros e comparação" },
      { id: "7.7.4", label: "Ingerir contratos e criar alertas de vencimento 90/60/30 dias" },
      { id: "7.7.5", label: "Disponibilizar export com limites por plano" },
    ],
  },
  {
    id: "7.8",
    titulo: "Observabilidade, qualidade e finops",
    tasks: [
      { id: "7.8.1", label: "Definir SLOs dos endpoints críticos" },
      { id: "7.8.2", label: "Instrumentar logs estruturados com tenant_id e request_id" },
      { id: "7.8.3", label: "Criar alertas para falha de coleta e custo fora de banda" },
      { id: "7.8.4", label: "Criar painel de custo por módulo — ingestão, query, IA" },
      { id: "7.8.5", label: "Criar rotina de revisão semanal de incidentes e custo" },
    ],
  },
  {
    id: "7.9",
    titulo: "Segurança e compliance",
    tasks: [
      { id: "7.9.1", label: "Revisar CORS para origens aprovadas por ambiente" },
      { id: "7.9.2", label: "Revisar permissões IAM por princípio de menor privilégio" },
      { id: "7.9.3", label: "Mover segredos para Secret Manager" },
      { id: "7.9.4", label: "Implementar mascaramento de dados sensíveis em logs" },
      { id: "7.9.5", label: "Definir política de retenção e descarte de documentos" },
    ],
  },
  {
    id: "7.10",
    titulo: "Growth e comercial",
    tasks: [
      { id: "7.10.1", label: "Definir ICP e personas operacionais por plano" },
      { id: "7.10.2", label: "Criar gatilhos de upgrade orientados a uso real" },
      { id: "7.10.3", label: "Criar campanhas de ativação para contas Free inativas" },
      { id: "7.10.4", label: "Estruturar playbook de parceria — SEBRAE/ABES/CREA" },
      { id: "7.10.5", label: "Criar rotina mensal de revisão de pricing e conversão" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectIds(tasks: Task[]): string[] {
  return tasks.flatMap((t) => [t.id, ...(t.sub ? collectIds(t.sub) : [])]);
}

function countDone(ids: string[], checks: Record<string, boolean>): number {
  return ids.filter((id) => checks[id]).length;
}

const FASE_CLS: Record<number, string> = {
  1: "text-[var(--gold)]   bg-[var(--panel-gold)]   border-[rgba(228,164,20,.3)]",
  2: "text-[var(--purple)] bg-[var(--panel-purple)] border-[rgba(106,1,187,.3)]",
  3: "text-emerald-400     bg-emerald-500/10          border-emerald-500/25",
};

const FASE_BAR: Record<number, string> = {
  1: "bg-[var(--gold)]",
  2: "bg-[var(--purple)]",
  3: "bg-emerald-400",
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, fase }: { pct: number; fase: 1 | 2 | 3 }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
      <div
        className={cn("h-full rounded-full transition-all duration-500", FASE_BAR[fase])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  checks,
  toggle,
  depth = 0,
}: {
  task: Task;
  checks: Record<string, boolean>;
  toggle: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const done = checks[task.id] ?? false;

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--panel-soft)] cursor-pointer",
          depth > 0 && "ml-6"
        )}
        onClick={() => toggle(task.id)}
      >
        <span className={cn("mt-0.5 shrink-0 transition-colors", done ? "text-[var(--gold)]" : "text-[var(--line)]")}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </span>
        <span className={cn("flex-1 text-sm leading-snug", done ? "line-through text-[var(--muted)]" : "text-[var(--text)]")}>
          {task.label}
        </span>
        {task.sub && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="shrink-0 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {task.sub && expanded && (
        <div className="ml-3">
          {task.sub.map((s) => (
            <TaskRow key={s.id} task={s} checks={checks} toggle={toggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SprintCard ───────────────────────────────────────────────────────────────

function SprintCard({
  sprint,
  checks,
  toggle,
}: {
  sprint: Sprint;
  checks: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ids = collectIds(sprint.tasks);
  const done = countDone(ids, checks);
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
  const allDone = done === ids.length;

  const toggleAll = () => {
    const newVal = !allDone;
    ids.forEach((id) => {
      if (checks[id] !== newVal) toggle(id);
    });
  };

  return (
    <div className={cn("rounded-2xl border bg-[var(--panel)] overflow-hidden", allDone ? "border-[rgba(228,164,20,.3)]" : "border-[var(--line)]")}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--panel-soft)] transition-colors"
      >
        <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", FASE_CLS[sprint.fase])}>
          Fase {sprint.fase}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[var(--text)]">{sprint.titulo}</span>
            <span className="text-xs text-[var(--muted)]">— {sprint.semanas}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <ProgressBar pct={pct} fase={sprint.fase} />
            <span className="shrink-0 tabular-nums text-xs font-bold text-[var(--muted)]">
              {done}/{ids.length}
            </span>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--line)]">
          {/* Metadados */}
          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3 bg-[var(--panel2)]">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Objetivo</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text)]">{sprint.objetivo}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Dependências</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text)]">{sprint.deps}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Aceite</p>
              <ul className="mt-1 space-y-0.5">
                {sprint.aceite.map((a) => (
                  <li key={a} className="text-xs font-semibold text-[var(--text)]">· {a}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tasks */}
          <div className="px-2 py-3">
            {sprint.tasks.map((t) => (
              <TaskRow key={t.id} task={t} checks={checks} toggle={toggle} />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
            <span className="text-xs font-semibold text-[var(--muted)]">
              {pct < 100 ? `${100 - pct}% restante` : "Sprint concluída"}
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-bold text-[var(--gold)] hover:opacity-80 transition-opacity"
            >
              {allDone ? "Desmarcar tudo" : "Marcar tudo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TodoSectionCard ──────────────────────────────────────────────────────────

function TodoSectionCard({
  section,
  checks,
  toggle,
}: {
  section: TodoSection;
  checks: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ids = collectIds(section.tasks);
  const done = countDone(ids, checks);
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--panel-soft)] transition-colors"
      >
        <span className="min-w-[2.5rem] text-xs font-extrabold text-[var(--muted)]">{section.id}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[var(--text)]">{section.titulo}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--panel2)]">
              <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 tabular-nums text-xs font-bold text-[var(--muted)]">{done}/{ids.length}</span>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--line)] px-2 py-3">
          {section.tasks.map((t) => (
            <TaskRow key={t.id} task={t} checks={checks} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visão geral — fases ──────────────────────────────────────────────────────

function FaseOverview({ checks }: { checks: Record<string, boolean> }) {
  const fases = [
    {
      n: 1 as const,
      titulo: "MVP Comercial Operável",
      prazo: "0 → 8 semanas",
      objetivo: "Vender e entregar valor recorrente com baixo risco técnico.",
      sprints: ["s0", "s1", "s2", "s3", "s4"],
      entregaveis: [
        "Planos aplicados tecnicamente",
        "Billing funcional com upgrade/downgrade",
        "Ingestão estável PNCP",
        "Dashboard com filtros, score e alertas",
        "Métricas de negócio e engenharia em produção",
      ],
    },
    {
      n: 2 as const,
      titulo: "Produto Premium IA",
      prazo: "8 → 16 semanas",
      objetivo: "Elevar ticket e retenção com recursos de alto valor.",
      sprints: ["s5", "s6", "s7"],
      entregaveis: [
        "Análise de edital IA",
        "Conformidade por documentos",
        "Mapa de preços robusto",
        "Módulo de contratos com alertas",
      ],
    },
    {
      n: 3 as const,
      titulo: "Escala e B2G",
      prazo: "16 → 28 semanas",
      objetivo: "Ampliar mercado e criar moat de dados/integração.",
      sprints: ["s8"],
      entregaveis: [
        "API privada Enterprise",
        "Módulos de inteligência de nicho",
        "Trilha Gov/White Label com governança",
      ],
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {fases.map((f) => {
        const ids = SPRINTS.filter((s) => f.sprints.includes(s.id))
          .flatMap((s) => collectIds(s.tasks));
        const done = countDone(ids, checks);
        const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
        return (
          <div key={f.n} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-start justify-between gap-2">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", FASE_CLS[f.n])}>
                Fase {f.n}
              </span>
              <span className="text-xs font-semibold text-[var(--muted)]">{f.prazo}</span>
            </div>
            <h3 className="mt-3 font-extrabold text-[var(--text)]">{f.titulo}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{f.objetivo}</p>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Progresso</span>
                <span className="tabular-nums text-xs font-bold text-[var(--text)]">{pct}%</span>
              </div>
              <ProgressBar pct={pct} fase={f.n} />
            </div>

            <ul className="mt-4 space-y-1.5">
              {f.entregaveis.map((e) => (
                <li key={e} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                  <span className="mt-0.5 shrink-0 text-[var(--line)]">·</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

type Tab = "visao" | "sprints" | "todo";

export function PlanoDePage() {
  const [tab, setTab] = useState<Tab>("visao");
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks);

  const toggle = useCallback((id: string) => {
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecks(next);
      return next;
    });
  }, []);

  // Sumário global
  const allSprintIds = SPRINTS.flatMap((s) => collectIds(s.tasks));
  const allTodoIds = TODO_SECTIONS.flatMap((s) => collectIds(s.tasks));
  const allIds = [...new Set([...allSprintIds, ...allTodoIds])];
  const globalDone = countDone(allIds, checks);
  const globalPct = Math.round((globalDone / allIds.length) * 100);

  const tabs: { key: Tab; label: string }[] = [
    { key: "visao", label: "Visão geral" },
    { key: "sprints", label: "Sprints" },
    { key: "todo", label: "To-Do mestre" },
  ];

  return (
    <AppShell breadcrumb="Plano de execução">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
              Plano de execução
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sprints, to-dos e critérios de pronto por fase. Progresso salvo no navegador.
            </p>
          </div>

          {/* Progresso global */}
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-3">
            <div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--text)]">{globalPct}%</div>
              <div className="mt-0.5 text-[10px] font-semibold text-[var(--muted)]">concluído</div>
            </div>
            <div className="w-24">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--panel2)]">
                <div className="h-full rounded-full bg-[var(--gold)] transition-all duration-500" style={{ width: `${globalPct}%` }} />
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[var(--muted)]">
                {globalDone} / {allIds.length} itens
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                tab === t.key
                  ? "bg-[var(--gold)] text-black"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {tab === "visao" && <FaseOverview checks={checks} />}

        {tab === "sprints" && (
          <div className="space-y-3">
            {SPRINTS.map((s) => (
              <SprintCard key={s.id} sprint={s} checks={checks} toggle={toggle} />
            ))}
          </div>
        )}

        {tab === "todo" && (
          <div className="space-y-3">
            {TODO_SECTIONS.map((s) => (
              <TodoSectionCard key={s.id} section={s} checks={checks} toggle={toggle} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
