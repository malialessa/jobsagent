-- dim.cliente
-- Tabela canônica de tenants, planos e quotas
-- Sem particionamento — cresce 1 linha por tenant
-- Clustered por plano e status_pagamento para queries de billing
--
-- Campos de trial: trial_inicio e trial_fim (§63.3)
-- Multitenancy: tenant_id = cliente_id no modelo inicial;
--   quando multi-usuário, cliente_id = UID individual, tenant_id = ID da organização

CREATE TABLE IF NOT EXISTS `uniquex-487718.dim.cliente` (
  cliente_id              STRING    NOT NULL OPTIONS(description='UID Firebase Auth — chave primária'),
  tenant_id               STRING    NOT NULL OPTIONS(description='ID da organização; igual a cliente_id no modelo inicial'),
  email                   STRING,
  nome_exibicao           STRING,
  plano                   STRING             OPTIONS(description='free | pro | enterprise | gov'),
  status_pagamento        STRING             OPTIONS(description='ativo | trial | pendente | cancelado | inadimplente | bloqueado'),
  limite_uf               INT64              OPTIONS(description='Máximo de UFs monitoradas simultaneamente'),
  limite_oportunidades    INT64              OPTIONS(description='Máximo de oportunidades retornadas por período'),
  limite_docs             INT64              OPTIONS(description='Máximo de documentos gerenciados'),
  limite_produtos         INT64              OPTIONS(description='Máximo de itens no catálogo de produtos'),
  trial_inicio            TIMESTAMP          OPTIONS(description='Início do período de trial — preenchido no cadastro'),
  trial_fim               TIMESTAMP          OPTIONS(description='Fim do trial = trial_inicio + 7 dias'),
  mp_customer_id          STRING             OPTIONS(description='ID do cliente no Mercado Pago (payer_id) — preenchido após primeira assinatura'),
  mp_subscription_id      STRING             OPTIONS(description='ID da assinatura ativa no Mercado Pago (preapproval.id)'),
  mp_plan_id              STRING             OPTIONS(description='ID do plano contratado no Mercado Pago (MP_PLAN_ID_PRO ou MP_PLAN_ID_ENTERPRISE)'),
  data_cadastro           TIMESTAMP,
  data_ultima_modificacao TIMESTAMP
)
CLUSTER BY plano, status_pagamento
OPTIONS(
  description = 'Tabela canônica de tenants e planos — 1 linha por tenant'
);

-- Limites padrão por plano (aplicados em código no middleware):
-- free:       limite_uf=1,  limite_oportunidades=20,  limite_docs=3,  limite_produtos=0
-- pro:        limite_uf=3,  limite_oportunidades=200, limite_docs=10, limite_produtos=10
-- enterprise: limite_uf=0,  limite_oportunidades=0,   limite_docs=0,  limite_produtos=0 (ilimitado)
-- gov:        limite_uf=0,  limite_oportunidades=0,   limite_docs=0,  limite_produtos=0 (ilimitado)
-- 0 = sem limite
