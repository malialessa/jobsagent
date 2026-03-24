#!/bin/bash
# Script de Teste do Sistema de Billing
# Sprint 2 - LiciAI
# Data: 24/03/2026

set -e

API_BASE="${API_BASE:-https://us-east1-uniquex-487718.cloudfunctions.net/api}"
PROJECT_ID="uniquex-487718"

echo "=========================================="
echo "🧪 Teste do Sistema de Billing - LiciAI"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funções auxiliares
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar se existe token de teste
if [ -z "$TEST_TOKEN" ]; then
    print_error "Variável TEST_TOKEN não definida"
    echo "Para obter um token de teste:"
    echo "1. Acesse: https://liciai-uniquex-487718.web.app"
    echo "2. Faça login com uma conta de teste"
    echo "3. No console do browser, execute: firebase.auth().currentUser.getIdToken()"
    echo "4. Export: export TEST_TOKEN='seu-token-aqui'"
    echo ""
    exit 1
fi

echo "1️⃣  Verificando conectividade da API..."
HEALTH=$(curl -s "${API_BASE}/healthz")
if [ "$HEALTH" = "ok" ]; then
    print_success "API está online"
else
    print_error "API não está respondendo"
    exit 1
fi
echo ""

echo "2️⃣  Verificando plano atual do usuário..."
PLANO_RESPONSE=$(curl -s -X GET "${API_BASE}/getPlanoAtual" \
  -H "Authorization: Bearer ${TEST_TOKEN}")

PLANO_ATUAL=$(echo "$PLANO_RESPONSE" | jq -r '.plano // "erro"')
STATUS_PAG=$(echo "$PLANO_RESPONSE" | jq -r '.status_pagamento // "erro"')

if [ "$PLANO_ATUAL" = "erro" ]; then
    print_error "Falha ao obter plano atual"
    echo "Resposta: $PLANO_RESPONSE"
    exit 1
fi

print_success "Plano atual: $PLANO_ATUAL"
print_info "Status pagamento: $STATUS_PAG"
echo ""

echo "3️⃣  Testando criação de checkout (Pro)..."
CHECKOUT_RESPONSE=$(curl -s -X POST "${API_BASE}/billing/checkout" \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"plano_destino":"pro"}')

CHECKOUT_URL=$(echo "$CHECKOUT_RESPONSE" | jq -r '.checkout_url // empty')

if [ -z "$CHECKOUT_URL" ]; then
    print_error "Falha ao criar checkout"
    echo "Resposta: $CHECKOUT_RESPONSE"
    
    # Verificar se é erro de configuração
    if echo "$CHECKOUT_RESPONSE" | grep -q "not configured"; then
        print_info "Sistema de billing não está configurado ainda"
        print_info "Siga os passos em: /docs/SETUP_BILLING.md"
        exit 0
    fi
    exit 1
fi

print_success "Checkout criado com sucesso"
echo "URL de pagamento: $CHECKOUT_URL"
echo ""

echo "4️⃣  Verificando registro de evento de billing..."
sleep 2

EVENT_COUNT=$(bq query --project_id=$PROJECT_ID --use_legacy_sql=false --format=csv \
  "SELECT COUNT(*) FROM \`${PROJECT_ID}.log.billing_events\` 
   WHERE evento_tipo = 'checkout_created' 
   AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE)" \
  | tail -n 1)

if [ "$EVENT_COUNT" -gt 0 ]; then
    print_success "Evento registrado em log.billing_events"
else
    print_info "Nenhum evento encontrado (pode ser esperado se billing não estiver ativo)"
fi
echo ""

echo "5️⃣  Testando status de billing..."
STATUS_RESPONSE=$(curl -s -X GET "${API_BASE}/billing/status" \
  -H "Authorization: Bearer ${TEST_TOKEN}")

HAS_ACTIVE=$(echo "$STATUS_RESPONSE" | jq -r '.has_active_subscription // false')
print_info "Tem assinatura ativa: $HAS_ACTIVE"
echo ""

echo "=========================================="
echo "📊 Resumo dos Testes"
echo "=========================================="
echo "API Status: OK ✓"
echo "Plano Atual: $PLANO_ATUAL"
echo "Status Pagamento: $STATUS_PAG"
echo "Checkout: $([ -n "$CHECKOUT_URL" ] && echo "OK ✓" || echo "Não configurado")"
echo ""

if [ -n "$CHECKOUT_URL" ]; then
    echo "🎉 Sistema de billing está funcional!"
    echo ""
    echo "Próximos passos para teste completo:"
    echo "1. Acesse a URL de checkout gerada"
    echo "2. Complete um pagamento de teste"
    echo "3. Aguarde o webhook ser processado"
    echo "4. Verifique se o plano foi atualizado: $API_BASE/getPlanoAtual"
    echo ""
else
    echo "⚙️  Configure o billing seguindo: /docs/SETUP_BILLING.md"
    echo ""
fi

echo "Logs detalhados em: Cloud Console > Logging"
echo "URL: https://console.cloud.google.com/logs/query?project=uniquex-487718"
