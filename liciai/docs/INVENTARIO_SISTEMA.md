# INVENTÁRIO DO SISTEMA — LICIAI
> **Propósito:** Documento canônico e vivo de todos os componentes do sistema.  
> **Regras:** NUNCA implante algo novo sem registrar aqui primeiro. NUNCA remova um componente sem marcar como `[DEPRECATED]` e justificar.  
> **Atualização:** Toda sessão de desenvolvimento deve atualizar este arquivo.  
> _Última auditoria: 2026-03-03 (atualizado: 2026-03-03 — fix env Vite + e.slice)_

---

## 1. PLATAFORMA E INFRAESTRUTURA

| Recurso | Identificador | Região | Status |
|---|---|---|---|
| Firebase Project | `uniquex-487718` | — | ✅ ATIVO |
| Firebase Hosting | `liciai-uniquex-487718.web.app` | Global CDN | ✅ ATIVO |
| Cloud Functions (gen2) | `api` | `us-east1` | ✅ ATIVO |
| Cloud Functions (gen2) | `coletarPncp` | `us-east1` | ✅ ATIVO |
| Cloud Functions (gen2) | `coletarLicitacoesAbertas` | `us-east1` | ✅ ATIVO |
| Firebase Auth trigger | `criarRegistroClienteNovo` | `us-east1` | ✅ ATIVO |
| Storage trigger | `processarDocumentoConhecimento` | `us-east1` | ✅ ATIVO |
| Cloud Storage bucket | `itensx` (KNOWLEDGE_BUCKET) | `us-east1` | ⚠️ bucket referenciado, criar se não existir |
| BigQuery project | `uniquex-487718` | `US` | ✅ ATIVO |
| Vertex AI Embedding | `text-embedding-005` | `us-central1` | ✅ ATIVO |
| Vertex AI LLM | `gemini-2.5-pro` | `us-central1` | ✅ ATIVO |
| Cloud Tasks Queue | `pncp-backfill-queue` | `us-east1` | ⚠️ criar antes de usar iniciarBackfill |
| Secret Manager | — | — | ❌ NÃO CRIADO — mover API keys para cá (Sprint 2) |
| Cloud Scheduler job | `liciai-pncp-ingest` | `us-east1` | ✅ ATIVO — 03h UTC, POST /scheduler/ingest/pncp |
| Cloud Scheduler job | `liciai-pncp-merge` | `us-east1` | ✅ ATIVO — 05h UTC, POST /scheduler/merge |
| Mercado Pago (billing) | — | — | ⏳ PENDENTE — endpoints prontos, falta credenciais (P-MP-01) |
| SendGrid (email) | — | — | ⏳ PENDENTE — endpoints prontos, falta credenciais (P-SG-01) |

---

## 2. BIGQUERY — INVENTÁRIO DE OBJETOS

### 2.1 Datasets

| Dataset | Finalidade | Tabelas | Status |
|---|---|---|---|
| `stg` | Staging — dados brutos da API PNCP | 1 | ✅ ATIVO |
| `core` | Fonte de verdade normalizada | 5 tabelas + 1 view + 1 TVF | ✅ ATIVO |
| `dim` | Dimensões de negócio | 5 | ✅ ATIVO |
| `log` | Logs operacionais e auditoria | 9 | ✅ ATIVO |
| `doc` | Documentos analisados (Sprint 3) | 0 | ⚠️ VAZIO |
| `feat` | Feature store para IA | 1 | ✅ ATIVO |
| `mart` | Agregações para dashboards (Sprint 3) | 0 | ⚠️ VAZIO |

### 2.2 Tabelas (inventário completo)

#### stg (staging)
| Tabela | Schema file | Linhas | Partição | Finalidade |
|---|---|---|---|---|
| `pncp_contratacoes_raw` | `schemas/stg/pncp_contratacoes_raw.sql` | ~330 | `ingest_time` (TIMESTAMP) | Raw JSON da API PNCP com dedup por hash_payload |

**Campos obrigatórios:** `ingest_time`, `uf`, `id_pncp`, `hash_payload`, `payload`

#### core
| Objeto | Tipo | Schema file | Linhas | Finalidade |
|---|---|---|---|---|
| `contratacoes` | TABLE | `schemas/core/contratacoes.sql` | ~330 | Fonte de verdade normalizada; partição em data_encerramento_proposta |
| `v_oportunidades_15d` | VIEW | `schemas/core/v_oportunidades_15d.sql` | — | Filtro de oportunidades com encerramento ≤15 dias |
| `fn_get_scored_opportunities` | TVF (ROUTINE) | `schemas/core/fn_get_scored_opportunities.sql` | — | Scoring personalizado por tenant; input: p_cliente_id STRING |
| `knowledge_vectors` | TABLE | (inline no código) | — | Vetores de embeddings para RAG |
| `project_dna` | TABLE | (inline no código) | — | Documento de contexto da IA (id='main') |
| `analise_editais` | TABLE | (sem schema versionado) | 0 | Análises de edital por IA — Sprint 3 |
| `matriz_conformidade` | TABLE | (sem schema versionado) | 0 | Conformidade por edital — Sprint 3 |

⚠️ **TODO:** criar `schemas/core/analise_editais.sql` e `schemas/core/matriz_conformidade.sql`

#### dim
| Tabela | Schema file | Finalidade |
|---|---|---|
| `cliente` | `schemas/dim/cliente.sql` | Perfil do tenant: plano, status_pagamento, trial_inicio/trial_fim, limites |
| `cliente_configuracoes` | (sem schema versionado) | Palavras-chave de interesse por tenant |
| `usuario_tenant_role` | (sem schema versionado) | Controle de multi-usuário por tenant (Sprint futuro) |
| `prompt_versions` | (sem schema versionado) | Versionamento de prompts da IA |
| `assinaturas_eventos` | (sem schema versionado) | Eventos de billing/Mercado Pago — webhook IPN |

⚠️ **TODO:** versionar schemas de dim.cliente_configuracoes, dim.usuario_tenant_role, dim.prompt_versions, dim.assinaturas_eventos

#### log
| Tabela | Finalidade |
|---|---|
| `erros_aplicacao` | Erros da aplicação (logados via `logErrorToBigQuery`) |
| `pipeline_execucoes` | Execuções de jobs de ingestão/transformação |
| `pipeline_falhas` | Falhas de pipeline com stack trace |
| `api_requests` | Requests por tenant (billing e quotas) |
| `api_errors` | Erros de API externa (PNCP, Vertex AI) |
| `billing_events` | Eventos de cobrança |
| `audit_user_actions` | Auditoria de ações do usuário |
| `event_dedup` | Deduplicação de eventos |
| `cost_by_tenant_feature` | Custo por tenant/feature |

#### feat
| Tabela | Finalidade |
|---|---|
| `tenant_interest_profile` | Perfil de interesse do tenant para scoring |

### 2.3 Scripts DML Versionados

| Script | Localização | Frequência de uso |
|---|---|---|
| MERGE stg→core | `schemas/ops/merge_stg_pncp_to_core.sql` | Diário (Cloud Scheduler — Sprint 2) |

---

## 3. BACKEND — CLOUD FUNCTIONS

### 3.1 Função principal: `api` (Express app)

**Runtime:** Node.js 20 (gen2) | **Memória:** 2GiB | **CPU:** 1 | **Timeout:** 300s | **Region:** us-east1

#### Middlewares

| Middleware | Linha (aprox) | Finalidade |
|---|---|---|
| `cors` | 244 | Whitelist: `liciai-uniquex-487718.web.app`, localhost |
| `express.json()` | — | Parser JSON |
| `userAuthMiddleware` | 291 | Verifica Firebase ID token; popula `req.uid`, `req.user` |
| `adminAuthMiddleware` | 307 | Verifica ID token + `ADMIN_UIDS` (env var) |
| `userPlanMiddleware` | 457 | Carrega/cria plano do tenant; detecta trial expirado |
| `oportunidadesQuotaMiddleware` | 501 | Verifica quota diária de oportunidades por plano |

#### Endpoints públicos (sem auth)

| Método | Rota | Função |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/getOportunidades` | Oportunidades dos últimos 15 dias; filtros: uf, q; limit cap: 100 |
| POST | `/logError` | Log de erro do frontend (aceita token opcional) |

#### Endpoints autenticados (userAuthMiddleware)

| Método | Rota | Middlewares adicionais | Função |
|---|---|---|---|
| GET | `/getScoredOportunidades` | userPlan, quota | Oportunidades rankeadas por score do tenant; limit cap: 100 |
| GET | `/getPlanoAtual` | userPlan | Info do plano + trial |
| GET | `/getClienteConfiguracoes` | — | Palavras-chave do tenant |
| POST | `/addPalavraChave` | — | MERGE palavra-chave na dim.cliente_configuracoes |
| POST | `/removePalavraChave` | — | DELETE de palavra-chave |
| GET | `/getDetalhesOportunidade` | userPlan | Busca em **core.contratacoes** (não stg) |
| POST | `/iniciarBackfill` | — | Enfileira Cloud Tasks para backfill histórico |
| POST | `/generateUploadUrl` | adminAuth | Gera URL de upload assinado para GCS |

#### Endpoints admin (adminAuthMiddleware)

| Método | Rota | Função |
|---|---|---|
| POST | `/assistenteSprint` | Análise de IA com RAG (BigQuery vector search + Gemini) |
| GET | `/getProjectStructure` | Retorna project-structure.json |
| GET | `/getProjectSchema` | Retorna schemas das tabelas BQ |
| GET | `/getErros` | Lista erros de log.erros_aplicacao |
| POST | `/gerarErroDeTeste` | Gera erro de teste no log |
| POST | `/updateErrorStatus` | Atualiza status de um erro |
| POST | `/deleteError` | Remove um erro |
| POST | `/updateErrorStatusBulk` | Atualiza status em lote |
| POST | `/deleteErrorBulk` | Remove erros em lote |
| POST | `/analisarEstruturaComIA` | Análise de estrutura com Gemini |
| POST | `/analisarErroComIA` | Análise de erro específico com Gemini |
| GET | `/getProjectDna` | Retorna DNA do projeto (core.project_dna WHERE id='main') |
| POST | `/updateProjectDna` | Atualiza DNA do projeto |
| POST | `/admin/ingest/pncp` | Dispara coleta PNCP para 1 UF (manual) |
| POST | `/admin/transform/merge` | Executa MERGE stg→core (manual) |

#### Endpoints Billing — Mercado Pago (userAuthMiddleware)

| Método | Rota | Status | Função |
|---|---|---|---|
| POST | `/billing/checkout` | ⏳ PENDENTE (P-MP-01) | Cria preferência MP e retorna `checkout_url` |
| GET | `/billing/status` | ⏳ PENDENTE (P-MP-01) | Retorna plano + `mp_customer_id`, `mp_subscription_id` |
| POST | `/billing/webhook` | ⏳ PENDENTE (P-MP-01) | Recebe IPN do MP; ativa/cancela plano em `dim.cliente` |

#### Endpoints Email — SendGrid (adminAuthMiddleware)

| Método | Rota | Status | Função |
|---|---|---|---|
| POST | `/email/sendBemVindo` | ⏳ PENDENTE (P-SG-01) | Envia email de boas-vindas ao usuário |
| POST | `/email/sendAlertaOportunidades` | ⏳ PENDENTE (P-SG-01) | Envia as N melhores oportunidades do dia |

#### Endpoints Scheduler (schedulerAuthMiddleware — SCHEDULER_SECRET)

| Método | Rota | Job | Função |
|---|---|---|---|
| POST | `/scheduler/ingest/pncp` | `liciai-pncp-ingest` (03h UTC) | Coleta PNCP para todas as 27 UFs |
| POST | `/scheduler/merge` | `liciai-pncp-merge` (05h UTC) | MERGE idempotente stg→core |

### 3.2 Exports (Cloud Functions independentes)

| Export | Tipo | Trigger | Função |
|---|---|---|---|
| `coletarPncp` | onRequest | HTTP GET `?uf=XX&data=YYYY-MM-DD` | Ingestão PNCP para 1 UF/dia → stg |
| `coletarLicitacoesAbertas` | onRequest | HTTP GET `?uf=XX` | Ingestão de licitações abertas → stg |
| `criarRegistroClienteNovo` | beforeUserCreated | Firebase Auth | Cria registro em dim.cliente com plano trial (7 dias) |
| `processarDocumentoConhecimento` | onObjectFinalized | GCS bucket `itensx` | PDF/texto → chunks → embeddings → core.knowledge_vectors |

### 3.3 Configuração e Segredos

| Variável | Origem | Valor padrão no código | Sensível? |
|---|---|---|---|
| `GCP_PROJECT_ID` | `.env.uniquex-487718` | `"uniquex-487718"` | Não |
| `FUNCTIONS_REGION` | `.env.uniquex-487718` | `"us-east1"` | Não |
| `EMBEDDING_REGION` | `.env.uniquex-487718` | `"us-central1"` | Não |
| `EMBEDDING_MODEL` | `.env.uniquex-487718` | `"text-embedding-004"` ← DEFINIR via env | Não |
| `CORS_ORIGIN` | `.env.uniquex-487718` | `"https://liciai-uniquex-487718.web.app"` | Não |
| `BIGQUERY_LOCATION` | hardcoded | `"US"` | Não |
| `ADMIN_UIDS` | `.env.uniquex-487718` | fallback hardcoded | ⚠️ Sensível — gerenciar via env |
| `KNOWLEDGE_BUCKET` | `.env.uniquex-487718` | `"itensx"` | Não |
| `SCHEDULER_SECRET` | `.env.uniquex-487718` | gerado via `openssl rand -hex 32` | ⚠️ Sensível |
| `MP_ACCESS_TOKEN` | `.env.uniquex-487718` | `""` (inativo) | 🔴 Alto — PENDENTE (P-MP-01) |
| `MP_WEBHOOK_SECRET` | `.env.uniquex-487718` | `""` (inativo) | 🔴 Alto — PENDENTE (P-MP-01) |
| `MP_PLAN_ID_PRO` | `.env.uniquex-487718` | `""` (inativo) | Criar no painel MP |
| `MP_PLAN_ID_ENTERPRISE` | `.env.uniquex-487718` | `""` (inativo) | Criar no painel MP |
| `SENDGRID_API_KEY` | `.env.uniquex-487718` | `""` (inativo) | 🔴 Alto — PENDENTE (P-SG-01) |
| `SENDGRID_FROM_EMAIL` | `.env.uniquex-487718` | `"noreply@liciai.com.br"` | Domínio deve ser verificado no SendGrid |

---

## 4. FRONTEND

### 4.1 Tecnologias

| Tech | Versão | Config |
|---|---|---|
| Vite | 5.4.21 | `frontend/vite.config.ts` |
| React | 18.3.1 | — |
| TypeScript | 5.6.3 | `frontend/tsconfig.json` |
| Tailwind CSS | 3.4.19 | — |
| shadcn/ui | (radix-ui) | `frontend/components.json` |
| React Router | 7.13.1 | — |
| Firebase JS SDK | 12.10.0 | `src/lib/firebase.ts` |

### 4.2 Estrutura de Arquivos

```
frontend/src/
├── app/
│   └── App.tsx                   Roteamento: /radar, /documentos, /perfil, /plano
├── lib/
│   ├── api.ts                    API client + tipos canônicos: Oportunidade, PlanoInfo, etc.
│   ├── auth.tsx                  AuthProvider + hook useAuth()
│   ├── firebase.ts               Init Firebase app (auth apenas — SEM Firestore)
│   └── utils.ts                  cn() helper Tailwind
├── hooks/
│   ├── useOportunidades.ts       Busca + paginação de oportunidades (getScoredOportunidades)
│   ├── usePlano.ts               Info do plano do tenant (getPlanoAtual)
│   └── useConfiguracoes.ts       Palavras-chave de configuração (getClienteConfiguracoes)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          Wrapper com Sidebar + Topbar
│   │   ├── Sidebar.tsx           Navegação lateral (links + avatar do usuário)
│   │   └── Topbar.tsx            Barra superior (breadcrumb + auth state)
│   └── ui/                       shadcn/ui: badge, button, card, dialog, input,
│                                 select, separator, table, tabs
├── pages/
│   ├── RadarPage.tsx             [/radar] Grid de oportunidades + filtro UF + busca
│   ├── PerfilPage.tsx            [/perfil] Palavras-chave + info do plano
│   ├── PlanoDePage.tsx           [/plano] Board de sprints e tarefas (não usa API BQ)
│   └── DocumentosPage.tsx        [/documentos] Upload de PDFs (Sprint 3 — placeholder)
├── globals.css                   Tokens de design + configuração Tailwind
├── main.tsx                      Entry point — monta AuthProvider + App
└── vite-env.d.ts                 Tipos das variáveis VITE_*
```

#### Backend: functions/src (único arquivo)

```
functions/src/
└── index.ts                      1470 linhas — TODA a lógica do backend:
                                  - Express app (26 endpoints)
                                  - 4 Cloud Function exports
                                  - Middlewares (auth, plan, quota)
                                  - Funções auxiliares (serializeBqRow, logErrorToBigQuery, etc.)
                                  - Constantes e configuração de planos
```

### 4.3 Contrato de Tipos (api.ts)

| Interface | Campos principais | Fonte |
|---|---|---|
| `Oportunidade` | id_pncp, nome_orgao, objeto_compra, uf, data_encerramento_proposta (string), valor_total_estimado (number), modalidade_nome | `getOportunidades` / `getScoredOportunidades` |
| `PlanoInfo` | plano, status_pagamento, limites, trial | `getPlanoAtual` |
| `ClienteConfiguracoes` | palavrasChave[{palavra_chave, peso}] | `getClienteConfiguracoes` |
| `OportunidadesResponse` | items: Oportunidade[], nextOffset: number\|null | — |

**REGRA:** Toda mudança no schema BigQuery deve atualizar `api.ts` e `serializeBqRow()` no backend.

### 4.4 URL da API

- **Produção:** URL relativa `/api` (Firebase Hosting proxy para Cloud Run via `firebase.json` rewrite `run:`)
- **Dev local:** `http://127.0.0.1:5001/uniquex-487718/us-east1/api` (via `frontend/.env.development.local` — carregado SOMENTE em `vite dev`)
- **NUNCA** usar URL direta em `.env.local` — o Vite carrega `.env.local` em TODOS os modos, incluindo `vite build`. Sempre usar `.env.development.local` para configurações do emulador.
- **NUNCA** usar URL direta `us-east1-uniquex-487718.cloudfunctions.net` no código — causa CORS

### 4.5 Arquivos de Ambiente Vite

| Arquivo | Modo | Finalidade |
|---|---|---|
| `frontend/.env.production` | `vite build` | `VITE_API_BASE=` (vazio → fallback `/api`) |
| `frontend/.env.development.local` | `vite dev` (gitignored) | `VITE_API_BASE=http://127.0.0.1:5001/...` |

**REGRA:** NUNCA colocar URL do emulador em `.env.local` (carregado em todos os modos).

---

## 5. SEGURANÇA

### 5.1 Controle de Acesso

| Camada | Tipo | Implementação |
|---|---|---|
| Endpoints públicos | Qualquer um | `getOportunidades`, `healthz`, `logError` |
| Endpoints de usuário | Firebase Auth token | `userAuthMiddleware` — verifica + cria tenant |
| Endpoints admin | Firebase Auth token + UID em ADMIN_UIDS | `adminAuthMiddleware` |
| Cloud Storage | Firebase Auth | `storage.rules` — leitura/escrita autenticada |
| BigQuery | Service Account IAM | `uniquex-487718@appspot.gserviceaccount.com` → dataEditor + jobUser |

### 5.2 Riscos Conhecidos e Mitigações

| Risco | Nível | Mitigação Atual | Pendente |
|---|---|---|---|
| ADMIN_UIDS expostos em source | 🟡 Médio | Movido para env var | Considerar Firebase Custom Claims futuramente |
| Stripe keys sem Secret Manager | 🔴 Alto | — | Sprint 2: usar `runSecretAccessor` |
| Sem rate limiting nos endpoints | 🟡 Médio | `limit` cap em 100 por query | Sprint 2: Cloud Armor ou Cloud Endpoints |
| `storage.rules` permissivo | 🟡 Médio | Auth obrigatória | Restringir por path (`/uploads/{uid}/`) |
| Sem auditoria de writes (palavras-chave) | 🟢 Baixo | — | Sprint 3: log em audit_user_actions |
| BQ como OLTP (writes frequentes) | 🟡 Médio | Baixo volume no MVP | Sprint 3: cache Redis ou Firestore para config |

---

## 6. PLANOS E LIMITES

| Plano | limite_uf | limite_oportunidades/dia | limite_docs | limite_produtos |
|---|---|---|---|---|
| `free` | 1 | 20 | 3 | 0 |
| `pro` | 5 | 200 | 20 | 5 |
| `enterprise` | 27 (todas) | 2000 | 200 | 50 |
| `gov` | 27 (todas) | 5000 | 500 | 200 |

**Trial:** Novos usuários entram como `pro/trial` (7 dias). Após expiração, degradam para `free` automaticamente via `userPlanMiddleware`.

---

## 7. DEPENDÊNCIAS EXTERNAS

| Serviço | Uso | Auth | Status |
|---|---|---|---|
| API PNCP (`pncp.gov.br`) | Coleta de contratações | Pública (sem auth) | ✅ |
| Vertex AI Embedding | Gerar embeddings de documentos | SA via ADC | ✅ |
| Vertex AI Gemini | Análise de IA (assistente, erros) | SA via ADC | ✅ |
| Firebase Auth | Autenticação de usuários | SDK Firebase Admin | ✅ |
| Firebase Hosting | Servir frontend | Firebase deploy | ✅ |
| Cloud Tasks | Backfill histórico de licitações | SA via ADC | ⚠️ fila não criada |
| Mercado Pago | Billing e pagamentos (assinaturas recorrentes) | `MP_ACCESS_TOKEN` | ⏳ PENDENTE (P-MP-01) |
| SendGrid | Email transacional (boas-vindas, alertas) | `SENDGRID_API_KEY` | ⏳ PENDENTE (P-SG-01) |
| Transfere.gov API | Coleta de convênios | — | ❌ Sprint 3 |
| Compras.gov API | Compras MPOG | — | ❌ Sprint 3 |

---

## 8. DATASETS AINDA NÃO IMPLEMENTADOS

| Dataset | Tabelas planejadas | Sprint |
|---|---|---|
| `doc` | doc_uploads, doc_chunks, doc_analises | 3 |
| `mart` | mart_oportunidades_diario, mart_score_historico | 3 |
