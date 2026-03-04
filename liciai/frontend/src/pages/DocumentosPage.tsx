import { FileText, ShieldCheck, Upload, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

// Módulo de documentos — sprint 7 do plano de execução
// Funcionalidades previstas: upload, gestão de validade, matriz de conformidade

const MODULOS = [
  {
    icon: ShieldCheck,
    titulo: "Habilitação jurídica",
    descricao: "Certidão negativa federal, estadual, trabalhista, FGTS e CNPJ com controle de validade e alertas antecipados.",
    status: "Em breve",
  },
  {
    icon: FileText,
    titulo: "Capacidade técnica",
    descricao: "Atestados de capacidade técnica organizados por objeto e quantitativo. Identificação automática de lacunas por edital.",
    status: "Em breve",
  },
  {
    icon: Clock,
    titulo: "Validade e alertas",
    descricao: "Calendário de vencimentos com notificações 60 dias antes. Score de habilitação atualizado automaticamente.",
    status: "Em breve",
  },
  {
    icon: Upload,
    titulo: "Upload e análise IA",
    descricao: "Envio de PDF com extração automática de dados relevantes e associação ao edital correspondente.",
    status: "Em breve",
  },
];

export function DocumentosPage() {
  return (
    <AppShell breadcrumb="Documentos (IA)">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
            Gestão de documentos
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Controle centralizado de habilitações, certidões e atestados.
          </p>
        </div>

        {/* Estado de desenvolvimento */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--panel-soft)]">
            <FileText className="h-6 w-6 text-[var(--muted)]" />
          </div>
          <h2 className="text-base font-extrabold text-[var(--text)]">Módulo em desenvolvimento</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            O módulo de documentos será disponibilizado nos planos Pro e Enterprise.
            Configure seu radar e aproveite o ranking de oportunidades enquanto isso.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="sm">Ver oportunidades</Button>
            <Button size="sm" variant="outline">Ir para perfil</Button>
          </div>
        </div>

        {/* O que está por vir */}
        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-[var(--muted)]">
            O que será entregue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULOS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.titulo} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--panel-soft)]">
                      <Icon className="h-4 w-4 text-[var(--muted)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text)]">{m.titulo}</p>
                        <span className="rounded border border-[var(--line)] bg-[var(--panel-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                          {m.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{m.descricao}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
