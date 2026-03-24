# Guia de Setup - Sistema de Billing (Sprint 2)

> **Status:** Implementação em andamento  
> **Última atualização:** 24/03/2026

---

## 🎯 Objetivo da Sprint 2

Ativar monetização real do LiciAI com:
- ✅ Checkout funcional (Free → Pro/Enterprise)
- ✅ Webhook idempotente de confirmação
- ✅ Upgrade automático em < 60s
- ✅ Downgrade automático por expiração
- ✅ Auditoria completa de eventos

---

## 📋 Pré-requisitos

### Infraestrutura (já criada ✅)
- [x] Tabela `dim.cliente` com campos de plano
- [x] Tabela `log.billing_events` para auditoria
- [x] Endpoints `/billing/checkout` e `/billing/webhook` implementados
- [x] Middleware de plano funcional

### Necessário para ativar
- [ ] Conta Mercado Pago (recomendado) ou Stripe
- [ ] Credenciais de sandbox/teste
- [ ] Secret Manager configurado
- [ ] Cloud Scheduler para expire-trials

---

## 🔧 Opção 1: Mercado Pago (Recomendado para Brasil)

### Passo 1: Criar conta e obter credenciais

1. **Criar conta:** https://www.mercadopago.com.br/developers
2. **Acessar:** Painel → Credenciais
3. **Obter:**
   - Access Token de **Teste**: `TEST-xxxxx`
   - Access Token de **Produção**: `APP_USR-xxxxx`

### Passo 2: Criar planos de assinatura

1. Acessar: **Painel → Assinaturas → Planos**
2. Criar 2 planos:

**Plano Pro:**
- Título: "LiciAI Pro"
- Valor: R$ 99,00
- Frequência: Mensal
- Copiar o `plan_id` gerado

**Plano Enterprise:**
- Título: "LiciAI Enterprise"
- Valor: R$ 499,00
- Frequência: Mensal
- Copiar o `plan_id` gerado

### Passo 3: Configurar webhook

1. Acessar: **Painel → Webhooks → Configurar**
2. URL do webhook: `https://us-east1-uniquex-487718.cloudfunctions.net/api/billing/webhook`
3. Eventos habilitados:
   - `payment.created`
   - `payment.updated`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
4. Copiar o **Webhook Secret** gerado

### Passo 4: Armazenar credenciais no Secret Manager

```bash
# Navegar para a pasta do projeto
cd /workspaces/jobsagent/liciai

# Criar secrets (usar credenciais de TESTE primeiro)
echo -n "TEST-your-access-token" | gcloud secrets create liciai-mp-access-token \
  --project=uniquex-487718 \
  --data-file=- \
  --replication-policy=automatic

echo -n "your-webhook-secret" | gcloud secrets create liciai-mp-webhook-secret \
  --project=uniquex-487718 \
  --data-file=- \
  --replication-policy=automatic

echo -n "plan-pro-id" | gcloud secrets create liciai-mp-plan-id-pro \
  --project=uniquex-487718 \
  --data-file=- \
  --replication-policy=automatic

echo -n "plan-enterprise-id" | gcloud secrets create liciai-mp-plan-id-enterprise \
  --project=uniquex-487718 \
  --data-file=- \
  --replication-policy=automatic
```

### Passo 5: Dar permissão à Service Account

```bash
# Permitir que a Cloud Function acesse os secrets
gcloud secrets add-iam-policy-binding liciai-mp-access-token \
  --project=uniquex-487718 \
  --member="serviceAccount:uniquex-487718@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding liciai-mp-webhook-secret \
  --project=uniquex-487718 \
  --member="serviceAccount:uniquex-487718@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding liciai-mp-plan-id-pro \
  --project=uniquex-487718 \
  --member="serviceAccount:uniquex-487718@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding liciai-mp-plan-id-enterprise \
  --project=uniquex-487718 \
  --member="serviceAccount:uniquex-487718@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Passo 6: Atualizar código para usar Secret Manager

Editar `functions/src/index.ts` para buscar secrets:

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

async function getSecret(name: string): Promise<string> {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${GCP_PROJECT_ID}/secrets/${name}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}

// Carregar secrets no início
let MP_ACCESS_TOKEN = '';
let MP_WEBHOOK_SECRET = '';
let MP_PLAN_ID_PRO = '';
let MP_PLAN_ID_ENTERPRISE = '';

async function loadSecrets() {
  try {
    MP_ACCESS_TOKEN = await getSecret('liciai-mp-access-token');
    MP_WEBHOOK_SECRET = await getSecret('liciai-mp-webhook-secret');
    MP_PLAN_ID_PRO = await getSecret('liciai-mp-plan-id-pro');
    MP_PLAN_ID_ENTERPRISE = await getSecret('liciai-mp-plan-id-enterprise');
  } catch (err) {
    logger.warn('Billing secrets not configured', err);
  }
}

// Chamar na inicialização
loadSecrets();
```

---

## 🔧 Opção 2: Stripe (Alternativa)

### Configuração similar ao MP:

```bash
# Secrets para Stripe
echo -n "sk_test_xxxxx" | gcloud secrets create liciai-stripe-secret-key --data-file=-
echo -n "whsec_xxxxx" | gcloud secrets create liciai-stripe-webhook-secret --data-file=-
echo -n "price_pro_id" | gcloud secrets create liciai-stripe-price-pro --data-file=-
echo -n "price_ent_id" | gcloud secrets create liciai-stripe-price-enterprise --data-file=-
```

---

## 🧪 Testando o Fluxo

### Script de teste (já criado em `/scripts/test_billing.sh`)

```bash
cd /workspaces/jobsagent/liciai
chmod +x scripts/test_billing.sh
./scripts/test_billing.sh
```

### Casos de teste obrigatórios:

1. **CT-BL-001:** Free → Pro (checkout + webhook)
2. **CT-BL-002:** Pro → Enterprise (upgrade)
3. **CT-BL-003:** Trial expira → Free (downgrade automático)
4. **CT-BL-004:** Webhook duplicado (idempotência)
5. **CT-BL-005:** Cancelamento → bloqueio progressivo

---

## 📊 Monitoramento

### Queries úteis:

```sql
-- Eventos de billing nas últimas 24h
SELECT 
  evento_tipo,
  tenant_id,
  plano_anterior,
  plano_novo,
  ocorrido_em
FROM `uniquex-487718.log.billing_events`
WHERE ocorrido_em >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY ocorrido_em DESC;

-- Clientes por status de pagamento
SELECT 
  status_pagamento,
  plano,
  COUNT(*) as total
FROM `uniquex-487718.dim.cliente`
GROUP BY status_pagamento, plano;

-- Trials próximos do vencimento (3 dias)
SELECT 
  cliente_id,
  email,
  trial_fim,
  TIMESTAMP_DIFF(trial_fim, CURRENT_TIMESTAMP(), DAY) as dias_restantes
FROM `uniquex-487718.dim.cliente`
WHERE status_pagamento = 'trial'
  AND trial_fim <= TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)
ORDER BY trial_fim ASC;
```

---

## 🤖 Automação: Job de Expiração de Trials

### Criar Cloud Scheduler:

```bash
# Criar job que roda todo dia à 1h UTC
gcloud scheduler jobs create http expire-trials-job \
  --project=uniquex-487718 \
  --location=us-east1 \
  --schedule="0 1 * * *" \
  --uri="https://us-east1-uniquex-487718.cloudfunctions.net/api/admin/billing/expire-trials" \
  --http-method=POST \
  --oidc-service-account-email=uniquex-487718@appspot.gserviceaccount.com \
  --headers="Authorization=Bearer $(gcloud auth print-identity-token)"
```

### Endpoint de expiração (implementar no backend):

```typescript
app.post('/admin/billing/expire-trials', adminAuthMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT cliente_id, email, tenant_id
      FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\`
      WHERE status_pagamento = 'trial'
        AND trial_fim <= CURRENT_TIMESTAMP()
    `;
    
    const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION });
    
    for (const row of rows) {
      // Downgrade para free
      const updateQuery = `
        UPDATE \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\`
        SET 
          plano = 'free',
          status_pagamento = 'ativo',
          limite_uf = 1,
          limite_oportunidades = 20,
          limite_docs = 3,
          limite_produtos = 0,
          data_ultima_modificacao = CURRENT_TIMESTAMP()
        WHERE cliente_id = @cliente_id
      `;
      
      await bq.query({ 
        query: updateQuery, 
        location: BIGQUERY_LOCATION,
        params: { cliente_id: row.cliente_id }
      });
      
      // Log do evento
      await bq.dataset(DATASET_LOG).table('billing_events').insert([{
        event_id: randomUUID(),
        tenant_id: row.tenant_id,
        evento_tipo: 'trial_expired',
        plano_anterior: 'trial',
        plano_novo: 'free',
        ocorrido_em: new Date().toISOString(),
      }]);
      
      // TODO: Enviar email de notificação
      logger.info('Trial expired', { cliente_id: row.cliente_id, email: row.email });
    }
    
    res.status(200).json({ 
      expired_count: rows.length,
      message: `${rows.length} trials expirados processados` 
    });
  } catch (error: any) {
    logger.error('Erro ao expirar trials', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## ✅ Critérios de Aceite da Sprint 2

- [ ] Checkout gera link de pagamento válido
- [ ] Webhook atualiza `dim.cliente` corretamente
- [ ] Upgrade refletido em < 60 segundos
- [ ] Evento registrado em `log.billing_events`
- [ ] Webhook duplicado ignorado (idempotência)
- [ ] Job de expiração roda diariamente
- [ ] Email de notificação enviado (opcional Sprint 2, obrigatório Sprint 3)
- [ ] Testes manuais CT-BL-001 a CT-BL-005 passando

---

## 🚀 Próximos Passos após Sprint 2

1. **Sprint 3:** Cloud Scheduler para ingestão/MERGE/score/alertas
2. **Sprint 4:** Pub/Sub event bus para desacoplamento
3. **Sprint 5:** Analytics e features premium (IA de editais)

---

## 📞 Suporte

- **Mercado Pago Developers:** https://www.mercadopago.com.br/developers/pt/support
- **Stripe Docs:** https://stripe.com/docs
- **Plano de Execução:** `/docs/plano_execucao_liciai.md` seções 8, 42, 58, 68-69
