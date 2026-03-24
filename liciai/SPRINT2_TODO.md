# Sprint 2 - Billing e Monetização
## Status: 🔄 Em Progresso | Início: 24/03/2026

---

## ✅ Concluído

### Infraestrutura
- [x] Tabela `dim.cliente` com campos de plano, trial e limites
- [x] Tabela `log.billing_events` para auditoria
- [x] Tabela `dim.assinaturas_eventos` criada
- [x] Middleware de plano/quota funcionando
- [x] Endpoint `POST /billing/checkout` implementado
- [x] Endpoint `POST /billing/webhook` implementado  
- [x] Endpoint `GET /billing/status` implementado
- [x] Validação de assinatura HMAC no webhook
- [x] Idempotência por `event_id` no webhook

### Documentação
- [x] Guia completo de setup: `/docs/SETUP_BILLING.md`
- [x] Script de teste: `/scripts/test_billing.sh`
- [x] Casos de teste documentados (CT-BL-001 a CT-BL-005)

---

## 🔄 Em Andamento

### 1. Configuração de Provedor de Pagamento
**Escolher:** Mercado Pago (recomendado) ou Stripe

**Tarefas Mercado Pago:**
- [ ] Criar conta em https://www.mercadopago.com.br/developers
- [ ] Obter Access Token (TEST para sandbox)
- [ ] Criar Plano Pro (R$ 99/mês) e copiar `plan_id`
- [ ] Criar Plano Enterprise (R$ 499/mês) e copiar `plan_id`
- [ ] Configurar webhook no painel MP
- [ ] Copiar Webhook Secret

**Armazenar no Secret Manager:**
```bash
# Executar após obter credenciais
cd /workspaces/jobsagent/liciai

# Credenciais de TESTE primeiro (depois migrar para produção)
echo -n "TEST-your-token" | gcloud secrets create liciai-mp-access-token \
  --project=uniquex-487718 --data-file=- --replication-policy=automatic

echo -n "webhook-secret" | gcloud secrets create liciai-mp-webhook-secret \
  --project=uniquex-487718 --data-file=- --replication-policy=automatic

echo -n "plan-pro-id" | gcloud secrets create liciai-mp-plan-id-pro \
  --project=uniquex-487718 --data-file=- --replication-policy=automatic

echo -n "plan-ent-id" | gcloud secrets create liciai-mp-plan-id-enterprise \
  --project=uniquex-487718 --data-file=- --replication-policy=automatic

# Dar permissão à Service Account
for secret in liciai-mp-access-token liciai-mp-webhook-secret \
              liciai-mp-plan-id-pro liciai-mp-plan-id-enterprise; do
  gcloud secrets add-iam-policy-binding $secret \
    --project=uniquex-487718 \
    --member="serviceAccount:uniquex-487718@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 2. Atualizar Código para Secret Manager
- [ ] Instalar dependência: `npm install @google-cloud/secret-manager --save`
- [ ] Implementar `loadSecrets()` no `index.ts`
- [ ] Substituir `process.env.MP_*` por secrets carregados
- [ ] Testar localmente com emulador

### 3. Criar Endpoint de Expiração de Trials
- [ ] Implementar `POST /admin/billing/expire-trials`
- [ ] Query para buscar trials expirados
- [ ] Downgrade automático para plano `free`
- [ ] Log em `log.billing_events`
- [ ] Teste manual do endpoint

### 4. Cloud Scheduler para Automação
- [ ] Criar job `expire-trials-job` (cron: `0 1 * * *`)
- [ ] Configurar OIDC auth
- [ ] Testar execução manual
- [ ] Validar execução automática

---

## 🧪 Testes Obrigatórios

Executar após configuração completa:

### Teste Manual
```bash
# Obter token de teste primeiro:
# 1. Acessar https://liciai-uniquex-487718.web.app
# 2. Fazer login
# 3. No console: firebase.auth().currentUser.getIdToken()
export TEST_TOKEN='seu-token-aqui'

# Executar bateria de testes
bash /workspaces/jobsagent/liciai/scripts/test_billing.sh
```

### Casos de Teste
- [ ] **CT-BL-001:** Free → Pro (checkout + webhook + upgrade)
  - Criar checkout, completar pagamento, validar upgrade em < 60s
- [ ] **CT-BL-002:** Pro → Enterprise (upgrade direto)
  - Validar mudança de limites
- [ ] **CT-BL-003:** Trial expira → Free (downgrade automático)
  - Criar usuário em trial, mudar `trial_fim` para ontem, rodar job
- [ ] **CT-BL-004:** Webhook duplicado (idempotência)
  - Enviar mesmo `event_id` 2x, validar que processa apenas 1x
- [ ] **CT-BL-005:** Cancelamento → Bloqueio progressivo
  - Cancelar assinatura, validar downgrade

---

## 📊 Queries de Monitoramento

```sql
-- 1. Eventos de billing nas últimas 24h
SELECT 
  evento_tipo,
  tenant_id,
  plano_anterior,
  plano_novo,
  ocorrido_em
FROM `uniquex-487718.log.billing_events`
WHERE ocorrido_em >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY ocorrido_em DESC;

-- 2. Distribuição de clientes por plano
SELECT 
  plano,
  status_pagamento,
  COUNT(*) as total
FROM `uniquex-487718.dim.cliente`
GROUP BY plano, status_pagamento
ORDER BY total DESC;

-- 3. Trials próximos do vencimento (próximos 3 dias)
SELECT 
  cliente_id,
  email,
  trial_inicio,
  trial_fim,
  TIMESTAMP_DIFF(trial_fim, CURRENT_TIMESTAMP(), DAY) as dias_restantes
FROM `uniquex-487718.dim.cliente`
WHERE status_pagamento = 'trial'
  AND trial_fim <= TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)
ORDER BY trial_fim ASC;

-- 4. Receita mensal projetada (baseado em planos ativos)
SELECT 
  SUM(CASE plano 
    WHEN 'pro' THEN 99 
    WHEN 'enterprise' THEN 499 
    ELSE 0 
  END) as mrr_projetado
FROM `uniquex-487718.dim.cliente`
WHERE status_pagamento IN ('ativo', 'trial');
```

---

## ✅ Critérios de Aceite (Sprint 2)

Para considerar a Sprint 2 **concluída**, todos os itens abaixo devem ser ✅:

- [ ] Credenciais de pagamento configuradas (sandbox ou produção)
- [ ] Secrets no Secret Manager com permissões corretas
- [ ] Código atualizado para usar Secret Manager
- [ ] Endpoint `/billing/checkout` retorna URL válida
- [ ] Webhook processa eventos corretamente
- [ ] Upgrade refletido em `dim.cliente` em < 60 segundos
- [ ] Evento registrado em `log.billing_events`
- [ ] Webhook duplicado é ignorado (idempotência)
- [ ] Endpoint `/admin/billing/expire-trials` implementado
- [ ] Cloud Scheduler job criado e testado
- [ ] Testes CT-BL-001 a CT-BL-005 passando
- [ ] Queries de monitoramento funcionando

---

## 🚀 Próximos Passos (Sprint 3)

Após completar Sprint 2:

1. **Cloud Scheduler adicional:**
   - Job de ingestão PNCP diária
   - Job de MERGE stg→core
   - Job de recálculo de score
   - Job de envio de alertas

2. **GCS Bucket para documentos:**
   - Criar bucket com lifecycle policy
   - Middleware de quota de storage
   - Upload de documentos

3. **Notificações por email:**
   - Configurar SendGrid
   - Templates de email
   - Email de boas-vindas
   - Email de trial expirando
   - Email de upgrade completado

---

## 📝 Notas de Implementação

### Migração Sandbox → Produção

Quando migrar para produção:

1. Obter credenciais de produção no MP
2. Atualizar secrets:
```bash
echo -n "APP_USR-prod-token" | gcloud secrets versions add liciai-mp-access-token --data-file=-
echo -n "prod-webhook-secret" | gcloud secrets versions add liciai-mp-webhook-secret --data-file=-
```
3. Redeploy das functions
4. Atualizar webhook URL no painel MP para produção

### Troubleshooting

**Problema:** Checkout retorna 503
- **Causa:** Secrets não carregados
- **Solução:** Verificar IAM permissions e logs

**Problema:** Webhook não atualiza plano
- **Causa:** Assinatura HMAC falhou ou event_id duplicado
- **Solução:** Verificar `log.billing_events` e logs da function

**Problema:** Trial não expira
- **Causa:** Cloud Scheduler não está rodando
- **Solução:** Verificar status do job e executar manualmente

---

## 🔗 Referências

- Plano de Execução: `/docs/plano_execucao_liciai.md` (seções 8, 42, 58, 68-69)
- Setup: `/docs/SETUP_BILLING.md`
- Script de teste: `/scripts/test_billing.sh`
- Mercado Pago Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions
- Secret Manager: https://cloud.google.com/secret-manager/docs
