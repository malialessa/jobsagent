que# LEDGER DE IMPLANTAÇÕES — LICIAI
> **Propósito:** Registro imutável e cronológico de TODA decisão arquitetural, implementação e mudança relevante.  
> **Regras:**
> - NUNCA edite entradas existentes — apenas ADICIONE novas.
> - Cada entrada tem: data, autor (humano/IA), tipo, decisão e justificativa.
> - Use este documento para resolver conflitos de "por que foi feito assim".
> - Toda sessão com IA deve registrar o que foi decidido e por quê.

---

## FORMATO DE ENTRADA

```
### [YYYY-MM-DD] — TIPO: Título curto
- **Autor:** Humano / GitHub Copilot (Claude Sonnet 4.x)
- **Decisão:** O que foi feito
- **Justificativa:** Por que foi feito desta forma
- **Alternativas Consideradas:** O que foi descartado e por quê
- **Impacto:** Arquivos/tabelas afetados
- **Status:** ATIVO | SUPERADO (por [entrada X]) | PARCIAL
```

---

## HISTÓRICO

---

### [2026-02-01] — ARQUITETURA: Escolha de stack tecnológico
- **Autor:** Humano
- **Decisão:** Firebase Hosting + Cloud Functions Gen2 (Node 20) + BigQuery + Vertex AI + React/Vite
- **Justificativa:** 
  - Firebase: deploy rápido, auth nativa, sem servidor para gerir
  - BigQuery: OLAP escalonável para dados PNCP em escala nacional (milhões de registros), sem infra de DB para operar
  - Vertex AI: embedding e LLM na mesma plataforma que o BQ (evita latência de cross-cloud)
  - React/Vite: SPA rápida sem SSR, adequada para dashboard B2B
- **Alternativas Consideradas:** 
  - Supabase (PostgreSQL): descartado por custo de operação e migração ao escalar para 10M registros
  - MongoDB Atlas: descartado por custo de embedding e ausência de SQL analytics
  - Next.js: descartado — SSR desnecessário para dashboard autenticado
- **Impacto:** Toda a arquitetura
- **Status:** ATIVO

---

### [2026-02-01] — SEGURANÇA: BigQuery como base de dados primária para dados de usuário
- **Autor:** Humano + IA
- **Decisão:** Usar BigQuery para armazenar dados transacionais de usuários (dim.cliente, dim.cliente_configuracoes) em vez de Firestore
- **Justificativa:** Simplificação de stack — evitar dois bancos de dados no MVP. BQ suporta DML (INSERT/MERGE/DELETE). Volume de writes é baixo no MVP.
- **Alternativas Consideradas:** 
  - Firestore para dados de usuário + BQ para analytics: descartado por complexidade de manter dois backends
- **Risco Documentado:** BQ é OLAP, não OLTP. DML tem latência de 1-3s. Para >10k usuários simultâneos fazendo writes, esta decisão deve ser revisitada com Firestore ou Cloud Spanner para `dim.cliente` e `dim.cliente_configuracoes`.
- **Impacto:** `dim.cliente`, `dim.cliente_configuracoes`, `upsertClienteDefault`, `criarRegistroClienteNovo`, `addPalavraChave`
- **Status:** ATIVO (rever em Sprint 3 se MAU > 500)

---

### [2026-02-15] — INFRA: Criação dos datasets BigQuery
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** 7 datasets criados: stg, core, dim, log, doc, feat, mart
- **Justificativa:** Separação por camada de maturidade dos dados (raw → normalizado → analítico)
- **Impacto:** BigQuery `uniquex-487718`
- **Status:** ATIVO

---

### [2026-02-15] — INFRA: Criação das tabelas de produção
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Criadas 20 tabelas incluindo tabelas de log, dimensões de negócio, staging e core
- **Tabelas criadas:** Ver `docs/INVENTARIO_SISTEMA.md` §2.2
- **Impacto:** BigQuery `uniquex-487718`, todos os datasets
- **Status:** ATIVO

---

### [2026-02-20] — SEGURANÇA: Eliminação de referências ao projeto sharp-footing
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Todas as referências ao projeto GCP `sharp-footing-475513-c7` substituídas por `uniquex-487718`
- **Justificativa:** Projeto migrado; referências antigas causavam queries em projeto inexistente
- **Impacto:** `functions/src/index.ts`, `.env` renomeado para `.env.uniquex-487718`
- **Status:** ATIVO

---

### [2026-02-20] — FEATURE: Sistema de trial de 7 dias
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Novos usuários entram como `plano: "pro"` / `status_pagamento: "trial"` com expiração em 7 dias
- **Justificativa:** Conversão: usuário experimenta o plano completo antes de decidir pagar
- **Implementação:**
  - `upsertClienteDefault`: cria com trial
  - `criarRegistroClienteNovo`: auth trigger também cria com trial (corrigido em 2026-03-03)
  - `userPlanMiddleware`: detecta expiração e degrada para free
  - `getPlanoAtual`: expõe `trial.dias_restantes`
- **Impacto:** `functions/src/index.ts`, `dim.cliente`
- **Status:** ATIVO

---

### [2026-02-25] — INFRA: View e TVF de scoring
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** 
  - `core.v_oportunidades_15d`: VIEW que filtra oportunidades com encerramento ≤15 dias
  - `core.fn_get_scored_opportunities`: TVF que recebe `p_cliente_id` e retorna oportunidades com `score_oportunidade` calculado via JOIN com palavras-chave do tenant
- **Justificativa:** Lógica de scoring no BigQuery evita transferência de dados para a função Node.js e aproveita o motor SQL distribuído
- **Alternativas Consideradas:** Scoring no Node.js — descartado por limitação de memória ao processar grandes volumes
- **Impacto:** `core.*`, `functions/src/index.ts`, `schemas/core/`
- **Status:** ATIVO

---

### [2026-03-01] — BUGFIX: Schema mismatch na ingestão PNCP
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** `coletar()` inseria apenas `{ingest_time, payload}` em `stg.pncp_contratacoes_raw`; tabela requer `{ingest_time, uf, id_pncp, hash_payload, payload}`
- **Solução:** Adicionado `createHash('sha256')` e mapeamento correto de campos
- **Impacto:** `functions/src/index.ts` linha ~1380 (`coletar`)
- **Status:** ATIVO

---

### [2026-03-01] — BUGFIX: criarRegistroClienteNovo criava usuários como free/ativo
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** Auth trigger criava dim.cliente com `plano: "free"`, `status_pagamento: "ativo"` sem campos de trial
- **Solução:** Alinhado com `upsertClienteDefault` — agora cria como `pro/trial` com `trial_fim = +7 dias`
- **Impacto:** `functions/src/index.ts` (`criarRegistroClienteNovo`)
- **Status:** ATIVO

---

### [2026-03-01] — FEATURE: Endpoints admin para Cloud Scheduler
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Criados dois endpoints admin:
  - `POST /api/admin/ingest/pncp` — dispara `coletar()` para uma UF via HTTP (Cloud Scheduler-ready)
  - `POST /api/admin/transform/merge` — executa MERGE idempotente stg→core via API
- **Justificativa:** Cloud Scheduler precisa de endpoints HTTP autenticados para orquestrar o pipeline diário sem acessar o código diretamente
- **Impacto:** `functions/src/index.ts`
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: CORS — frontend chamando URL direta do cloudfunctions.net
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** Build de produção tinha `VITE_API_BASE=https://us-east1-uniquex-487718.cloudfunctions.net/api` hardcoded; Firebase Hosting usava rewrite `function` (gen1) para função gen2
- **Solução:**
  1. Rebuild com `VITE_API_BASE=""` → bundle usa `/api` (URL relativa)
  2. `firebase.json`: `"function"` → `"run": { "serviceId": "api" }`
  3. CORS: adicionada `us-east1-uniquex-487718.cloudfunctions.net` como fallback
- **Regra Estabelecida:** SEMPRE usar URL relativa `/api` no frontend. NUNCA usar URL direta do Cloud Run/Functions.
- **Impacto:** `firebase.json`, `functions/src/index.ts`, `frontend/` build
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: TypeError e.slice is not a function (BigQuery DATETIME serialization)
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** BigQuery Node.js SDK retorna `DATETIME` como `{value: "2026-03-05T09:00:00"}` (objeto) e `NUMERIC` como string decimal. Frontend chamava `.slice()` em um objeto, causando loop de erros.
- **Solução:** Criado helper `serializeBqRow()` na função que normaliza todos os tipos BQ antes de serializar como JSON. Aplicado em todos os endpoints que retornam rows BQ.
- **Regra Estabelecida:** TODO endpoint que retorna rows BigQuery DEVE usar `serializeBqRow()`. Ao adicionar novos endpoints, sempre aplicar este helper.
- **Impacto:** `functions/src/index.ts` — `getOportunidades`, `getScoredOportunidades`, `getClienteConfiguracoes`, `getErros`, `getProjectDna`, `getDetalhesOportunidade`
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: getDetalhesOportunidade consultava stg em vez de core
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** Endpoint consultava `stg.pncp_contratacoes_raw` (raw JSON) e fazia `JSON.parse(rows[0].payload)` — frágil, caro e sujeito a quebrar se stg for purgada
- **Solução:** Alterado para consultar `core.contratacoes` com `SELECT * WHERE id_pncp = @id`; resposta normalizada via `serializeBqRow()`
- **Impacto:** `functions/src/index.ts` (`getDetalhesOportunidade`)
- **Status:** ATIVO

---

### [2026-03-03] — SEGURANÇA: ADMIN_UIDS movido de hardcoded para variável de ambiente
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** UID do administrador estava hardcoded em `index.ts` — qualquer log/análise de código expunha o identificador; adição de novos admins exigia edição do source
- **Solução:** `ADMIN_UIDS` agora carrega de `process.env.ADMIN_UIDS` (lista separada por vírgulas) com fallback para o UID original. Adicionado ao `.env.uniquex-487718`.
- **Regra Estabelecida:** NUNCA hardcode de UIDs, keys ou IDs sensíveis no source code.
- **Impacto:** `functions/src/index.ts`, `functions/.env.uniquex-487718`
- **Status:** ATIVO

---

### [2026-03-03] — QUALIDADE: Remoção de arquivo órfão types/opportunity.ts
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** `frontend/src/types/opportunity.ts` definia interface `Opportunity` com campos mínimos (3 campos), duplicando parcialmente `Oportunidade` de `api.ts` (12 campos). Nenhum arquivo importava `Opportunity`.
- **Solução:** Arquivo e diretório removidos. Tipo canônico é `Oportunidade` em `src/lib/api.ts`.
- **Regra Estabelecida:** Tipo canônico de oportunidade = `Oportunidade` em `src/lib/api.ts`. Não criar tipos paralelos.
- **Impacto:** `frontend/src/types/opportunity.ts` (removido)
- **Status:** ATIVO

---

### [2026-03-03] — QUALIDADE: Remoção de dependências fantasma
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:**
  - Removido `@types/babel__generator` de `functions/` — sem nenhum uso em Cloud Functions
  - Removido `@types/react-router-dom ^5.3.3` de `frontend/` — react-router-dom v6+ inclui próprios tipos; usar v5 types com v7 router causa conflitos de tipagem
- **Impacto:** `functions/package.json`, `frontend/package.json`
- **Status:** ATIVO

---

### [2026-03-03] — SEGURANÇA: Cap de limit nas queries de oportunidades
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Adicionado `Math.min(..., 100)` nos parâmetros `limit` de `getOportunidades` e `getScoredOportunidades`
- **Justificativa:** Sem cap, um cliente malicioso poderia enviar `limit=999999` causando query extremamente cara no BigQuery
- **Impacto:** `functions/src/index.ts`
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: Typo no SQL de MERGE (modo_disputa_modo → modo_disputa_nome)
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** `schemas/ops/merge_stg_pncp_to_core.sql` linha INSERT VALUES referenciava `S.modo_disputa_modo` (campo inexistente)
- **Solução:** Corrigido para `S.modo_disputa_nome`
- **Impacto:** `schemas/ops/merge_stg_pncp_to_core.sql`
- **Status:** ATIVO

---

### [2026-03-03] — QUALIDADE: Atualização do comentário do modelo de embedding
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** Comentário no header de `index.ts` referenciava `text-embedding-004`; `.env` e Vertex AI estão configurados com `text-embedding-005`
- **Solução:** Comentário atualizado; adicionado aviso crítico sobre incompatibilidade de vetores ao trocar modelos
- **Regra Estabelecida:** Trocar o modelo de embedding EXIGE re-indexar TODOS os vetores em `core.knowledge_vectors`. Nunca trocar o modelo sem este procedimento.
- **Impacto:** `functions/src/index.ts` (comentário), `functions/.env.uniquex-487718`
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: .env.local aplicado em build de produção (URL emulador no bundle)
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** `frontend/.env.local` tinha `VITE_API_BASE=http://127.0.0.1:5001/uniquex-487718/us-east1/api`. O Vite carrega `.env.local` em **todos** os modos, inclusive `vite build`. O bundle de produção ficou com a URL do emulador hardcoded, causando `ERR_CONNECTION_REFUSED` em produção — toda chamada à API falhava.
- **Sintoma visível:** Console mostrava `127.0.0.1:5001/...` falhando em `https://liciai-uniquex-487718.web.app`
- **Solução:**
  1. `frontend/.env.local` → renomeado para `frontend/.env.development.local` (carregado SOMENTE em `vite dev`)
  2. Criado `frontend/.env.production` com `VITE_API_BASE=` (vazio → fallback para `/api`)
  3. Rebuild + redeploy hosting
  4. Confirmado no bundle: `const cS="/api"` (URL relativa correta)
- **Regra Estabelecida:** NUNCA usar `.env.local` para configurações que não devem ir para produção. Usar `.env.development.local` (modo dev) ou `.env.production` (modo prod). `.env.local` afeta TODOS os builds.
- **Impacto:** `frontend/.env.local` (removido), `frontend/.env.development.local` (criado), `frontend/.env.production` (criado)
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: formatDate crash com valor null/undefined (e.slice is not a function)
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** `RadarPage.tsx` — `formatDate(iso)` convertia `iso` com `String(iso ?? '')` antes de checar qual tipo era. No `catch`, chamava `str.slice(0, 10)` sem garantir que `str` era string. Se um campo de data chegasse como número, `undefined` convertido em `"undefined"`, ou outro tipo inesperado, o `.slice()` falhava com `TypeError: e.slice is not a function`.
- **Causa raiz secundária:** o problema só se manifestava na prática porque o bundle estava chamando o emulador (que não respondia), e dados de cache desserializados de sessões anteriores podiam conter campos em formato inesperado.
- **Solução:** Refatorado `formatDate` com guards explícitos:
  - Extrai `raw` (desfaz objeto `{value: str}` do BQ)
  - Converte para string SÓ após confirmar valor não nulo
  - Retorna `'—'` se string vazia
  - No `catch`: `typeof str === 'string' ? str.slice(0, 10) : '—'`
- **Impacto:** `frontend/src/pages/RadarPage.tsx`
- **Status:** ATIVO

---

### [2026-03-03] — FEATURE: DrillDown lateral premium de oportunidades
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Implementado painel lateral slide-in com detalhamento completo de oportunidades
- **Componentes criados/modificados:**
  - `frontend/src/hooks/useDetalhe.ts` (NOVO) — hook que busca `getDetalhesOportunidade` com AbortController para evitar race conditions
  - `frontend/src/lib/api.ts` — adicionado tipo `OportunidadeDetalhe` com todos os campos de `core.contratacoes` + `getDetalhesOportunidade` tipado
  - `frontend/src/pages/RadarPage.tsx` — completamente reescrito com `DetalhePanel` premium
- **Design do painel:**
  - Slide-in da direita com `translate-x-full → translate-x-0` (CSS transition 300ms)
  - Fecha com ESC ou X button
  - Header: badge de situação (verde/vermelho/amber/azul), objeto completo sem truncate, ScoreBig (gauge grande com barra), badges UF + modalidade
  - PrazoBadge: pill colorido com countdown (urgente/normal/encerrado) com `animate-pulse` em D-2 e abaixo
  - Seções separadas por dividers: Órgão (nome, unidade, CNPJ formatado), Datas (publicação, abertura, encerramento), Financeiro (valor em reais completo), Classificação (modalidade, modo disputa)
  - Identity: ID PNCP em `font-mono` + botão CopyButton com feedback de copiado
  - Footer: link "Ver edital no PNCP" + data de ingestão
  - Loading skeletons para campos extras enquanto fetch está em andamento (preview da lista aparece imediatamente)
- **Regra:** O painel usa os dados já disponíveis da lista (score, objeto, uf, datas) IMEDIATAMENTE ao clicar, e busca os dados extras (CNPJ, unidade, modo disputa, situação) em background. Nunca bloquear a abertura do painel.
- **Impacto:** `frontend/src/hooks/useDetalhe.ts`, `api.ts`, `RadarPage.tsx`
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: JSON paths errados no MERGE stg→core (modalidade/modo_disputa NULL em 100% dos registros)
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** O MERGE em `POST /admin/transform/merge` (index.ts ~L1295) usava caminhos JSON:
  - `$.nomeModalidadeContratacao` (campo inexistente no payload PNCP)
  - `$.nomeModoDisputa` (campo inexistente no payload PNCP)
  - Resultado: **TODOS os 330 registros em `core.contratacoes` tinham `modalidade_nome = NULL` e `modo_disputa_nome = NULL` desde a primeira ingestão**
- **Diagnóstico:** Confirmado via `bq query "SELECT modalidade_nome IS NOT NULL FROM core.contratacoes"` → 0 rows com valor
- **Causa raiz confirmada:** `bq query "SELECT SUBSTR(TO_JSON_STRING(payload), 1, 1200) FROM stg.pncp_contratacoes_raw LIMIT 1"` revelou campos reais: `modalidadeNome` e `modoDisputaNome`
- **Solução:**
  1. Corrigidos os dois caminhos JSON no MERGE em `index.ts` linha 1295
  2. Executado `UPDATE core.contratacoes SET modalidade_nome = ..., modo_disputa_nome = ... FROM (subquery com paths corretos)` — 330 rows affected
- **Impacto:** `functions/src/index.ts` (MERGE query), `core.contratacoes` (backfill de 330 rows)
- **Regra Anti-Alucinação adicionada:** Ver regra #12 abaixo
- **Status:** ATIVO

---

### [2026-03-03] — BUGFIX: URL errada nos endpoints de itens e enriquecimento PNCP
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Problema:** Dois endpoints usavam base URL `/api/consulta/v1/contratacoes/{cnpj}/{anual}/{ano}/{seqPadded}` para buscar dados individuais/itens — todos retornavam 404.
  - `getItensPNCP` (L1469): `https://pncp.gov.br/api/consulta/v1/contratacoes/${cnpj}/${anual}/${ano}/${seqPadded}/itens`
  - `getDetalhesOportunidade` enrichment (L745): `https://pncp.gov.br/api/consulta/v1/contratacoes/${cnpj}/${anualN}/${ano}/${seqPadded}`
- **Diagnóstico:** Testadas múltiplas variações de URL via curl — todas retornavam 404 com path `/pncp-consulta/v1/...`. A base `/api/consulta/v1/` só funciona para endpoints de listagem (`/publicacao`, `/proposta`). Para detalhes e itens individuais, a PNCP usa base URL diferente.
- **Causa raiz:** PNCP tem **duas bases de API distintas**:
  - `/api/consulta/v1/` → busca/listagem (publicacao, proposta) apenas
  - `/api/pncp/v1/` → detalhes e itens individuais por org/compra
- **URL correta para itens:** `https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{anoCompra}/{sequencialCompra}/itens`
  - sem o segmento `anual` do id_pncp
  - `sequencialCompra` sem zero-padding (`parseInt`)
  - Confirmado via curl: `200 OK` com array de itens reais
- **Solução:**
  1. `getItensPNCP`: URL alterada para `/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seqN}/itens`
  2. `getDetalhesOportunidade` enrichment: mesma base URL para o detalhe
  3. Variável `anual` (grupo 2 do regex) eliminada das duas funções — não é usada na URL correta
- **Impacto:** `functions/src/index.ts` (linhas 745 e 1469)
- **Status:** ATIVO

---

### [2026-03-03] — AUDITORIA: Inventário completo BQ + verificação de duplicatas
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Resultado:**
  - **Datasets:** core, dim, doc, feat, log, mart, stg (7 total — conforme planejado)
  - **core:** contratacoes(TABLE), v_oportunidades_15d(VIEW), analise_editais, knowledge_vectors, matriz_conformidade, project_dna
  - **stg:** pncp_contratacoes_raw(TABLE) — somente 1 tabela (correto)
  - **dim:** assinaturas_eventos, cliente, cliente_configuracoes, prompt_versions, usuario_tenant_role
  - **log:** api_errors, api_requests, audit_user_actions, billing_events, cost_by_tenant_feature, erros_aplicacao, event_dedup, pipeline_execucoes, pipeline_falhas
  - **mart, doc, feat:** vazios (aguardando Sprint 2+)
  - **Duplicatas core:** 0 ✅
  - **Duplicatas stg:** 0 ✅
  - **Registros sem modalidade_nome (após backfill):** 0 ✅
  - **Registros com valor=0:** 110 (esperado — contratos com orçamento sigiloso `orcamentoSigiloso: true`)
  - **Total core:** 330 | **Total stg:** 330 (1:1 — coerente pois stg ainda tem dados da primeira ingestão)
- **Nenhuma tabela legada ou duplicada detectada**
- **Status:** ATIVO (re-auditar quando volume > 10k rows)

---

### [2026-03-03] — FEATURE: OportunidadePage fullscreen + Análise de IA on-demand
- **Autor:** GitHub Copilot (Claude Sonnet 4.6)
- **Decisão:** Criadas as seguintes funcionalidades:
  1. **`OportunidadePage.tsx`** — página dedicada em `/oportunidade/:id` com hero compacto (tipografia downscaled: `text-xl→text-sm`, `text-2xl→text-lg` para ficar consistente com o estilo do painel), grid de metadados em 2 colunas e listagem de itens com busca client-side.
  2. **Botão "Análise de IA"** — trigger manual (on-demand) que chama `/analyzeOportunidade`. Exibe spinner durante carregamento; resultado renderizado em card dourado abaixo do hero.
  3. **Endpoint `/analyzeOportunidade`** (POST, `userAuthMiddleware`) — busca dados da `core.contratacoes` via BQ, monta prompt estruturado com objeto, modalidade, valor, prazo e score, e chama `gemini-2.5-pro` (temperature=0.3, maxOutputTokens=1024). Retorna `{ analysis: string }`.
  4. **Botões de acesso**: ArrowUpRight hover em `LineRow` do Radar + botão "Completo" com Maximize2 no cabeçalho do `DetalhePanel`.
  5. **Itens com NCM, sigiloso e busca**: `ItensTab` reescrita com search, badge NCM/NBS, flag 🔒 para `orcamentoSigiloso`, badge `materialOuServicoNome`.
- **Justificativa:** IA on-demand evita gastos desnecessários de tokens Gemini — só gera quando o usuário explicitamente clicar.
- **Alternativas Consideradas:** Geração automática ao abrir a página — descartada por custo e latência.
- **Impacto:** `frontend/src/pages/OportunidadePage.tsx`, `frontend/src/app/App.tsx`, `frontend/src/pages/RadarPage.tsx`, `frontend/src/lib/api.ts`, `functions/src/index.ts`
- **Status:** ATIVO

---

## HISTÓRICO DE DEPLOY

| Data | Versão | Componentes | Resultado |
|---|---|---|---|
| 2026-03-03 (sessão 1) | — | functions:api + hosting | ✅ Deploy completo |
| 2026-03-03 (sessão 2) | — | hosting only | ✅ Deploy completo — fix URL emulador + formatDate |
| 2026-03-03 (sessão 3) | — | hosting only | ✅ Deploy completo — DrillDown premium RadarPage |
| 2026-03-03 (sessão 4) | — | functions:api | ✅ Deploy completo — fix JSON paths MERGE + fix URLs PNCP itens/detalhe |
| 2026-03-03 (sessão 5) | — | functions:api + hosting | ✅ Deploy completo — OportunidadePage + NCM/sigiloso + Análise de IA |

---

## DECISÕES PENDENTES / SPRINT 2

| ID | Decisão | Urgência | Responsável |
|---|---|---|---|
| P-01 | Criar Cloud Scheduler para ingestão diária PNCP (03h UTC) e MERGE (05h UTC) | 🔴 Alta | — |
| P-02 | Configurar Secret Manager para Stripe keys | 🔴 Alta | — |
| P-03 | Criar fila Cloud Tasks `pncp-backfill-queue` | 🟡 Média | — |
| P-04 | Verificar se bucket `itensx` existe e configurá-lo corretamente | 🟡 Média | — |
| P-05 | Versionar schemas de dim.cliente_configuracoes, usuario_tenant_role, prompt_versions, assinaturas_eventos | 🟡 Média | — |
| P-06 | Criar schemas de core.analise_editais e core.matriz_conformidade | 🟡 Média | — |
| P-07 | Restringir storage.rules por path (`/uploads/{uid}/`) | 🟡 Média | — |
| P-08 | Avaliar Firestore para dim.cliente_configuracoes quando MAU > 500 | 🟢 Baixa | — |

---

## REGRAS ANTI-ALUCINAÇÃO DE IA

> Use esta seção para instruir qualquer IA futura que trabalhe neste projeto.

1. **NÃO DUPLICAR TIPOS**: O tipo `Oportunidade` está em `src/lib/api.ts`. Não criar `Opportunity`, `OpItem`, `OportunidadeItem` ou qualquer variante.

2. **SERIALIZAÇÃO BQ É OBRIGATÓRIA**: Todo endpoint que retorna rows BigQuery DEVE usar `serializeBqRow()`. DATETIME retorna como `{value: string}`, não como string.

3. **URL DA API É SEMPRE RELATIVA**: Frontend usa `/api/*`. NUNCA usar `https://us-east1-uniquex-487718.cloudfunctions.net/*` ou `https://api-hdjcafpmqq-ue.a.run.app/*` no código frontend.

4. **PROJETO GCP**: É `uniquex-487718`. Não existe `sharp-footing-475513-c7`, `liciai-uniquex-487718` nem qualquer variação.

5. **MODELO DE EMBEDDING**: É `text-embedding-005` (definido no .env). Trocar exige re-indexar `core.knowledge_vectors`.

6. **ADMIN_UIDS**: Gerenciado via `process.env.ADMIN_UIDS` no `.env.uniquex-487718`. NUNCA hardcode no source.

7. **NOVAS TABELAS BQ**: Sempre criar o arquivo SQL em `schemas/{dataset}/{tabela}.sql` ANTES ou junto da implementação.

8. **FONTE DE VERDADE**: `core.contratacoes` é a fonte de verdade. `stg.pncp_contratacoes_raw` é temporário/raw. NUNCA expor dados de stg diretamente ao usuário final.

9. **MERGE É IDEMPOTENTE**: O MERGE estg→core usa `hash_payload` para detectar mudanças. Não alterar a lógica de deduplicação sem testar.

10. **TRIAL É 7 DIAS PRO**: Todo novo usuário (auth trigger E upsertClienteDefault) deve ser criado com `plano: "pro"`, `status_pagamento: "trial"`, `trial_fim = now + 7 dias`.

11. **ENV VITE — NUNCA `.env.local` PARA EMULADOR**: Use `.env.development.local` (só carregado em `vite dev`). O arquivo `.env.local` é carregado em TODOS os modos incluindo `vite build` para produção, causando a URL do emulador entrar no bundle. Arquivo correto para emulador: `frontend/.env.development.local`.

12. **PNCP — DUAS BASES DE API DISTINTAS**:
    - `/api/consulta/v1/contratacoes/publicacao` e `/proposta` → **SOMENTE listagem/busca**
    - `/api/pncp/v1/orgaos/{cnpj}/compras/{anoCompra}/{sequencialCompra}` → detalhes individuais
    - `/api/pncp/v1/orgaos/{cnpj}/compras/{anoCompra}/{sequencialCompra}/itens` → itens
    - `sequencialCompra` na URL: sem zero-padding (usar `parseInt`). O segmento `anual` do id_pncp NÃO é usado nas URLs de detalhe/itens.
    - Payload usa camelCase: `modalidadeNome`, `modoDisputaNome`, `situacaoCompraNome`. NÃO usar `nomeModalidadeContratacao` nem `nomeModoDisputa`.

13. **MERGE JSON PATHS — SEMPRE VERIFICAR PAYLOAD ANTES**: Antes de escrever `JSON_VALUE(payload, '$.campo')` no MERGE, confirmar o nome real via `bq query "SELECT SUBSTR(TO_JSON_STRING(payload), 1, 500) FROM stg.pncp_contratacoes_raw LIMIT 1"`. O payload usa camelCase PNCP oficial — não inventar nomes de campo.
