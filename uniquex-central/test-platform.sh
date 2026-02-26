#!/bin/bash

# Script de Teste - UniqueX Platform
# Testa todas as APIs e o Hub

echo "🧪 Testando Plataforma UniqueX..."
echo "=================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URLs
HUB_URL="https://uniquexhub.web.app"
BASE_FUNCTION_URL="https://us-central1-uniquex-487718.cloudfunctions.net"
BASE_API_URL="https://uniquexhub.web.app/api"

echo "🏠 Testando Hub Principal..."
HUB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HUB_URL)
if [ $HUB_STATUS -eq 200 ]; then
  echo -e "${GREEN}✅ Hub: $HUB_URL - OK ($HUB_STATUS)${NC}"
else
  echo -e "${RED}❌ Hub: $HUB_URL - ERRO ($HUB_STATUS)${NC}"
fi
echo ""

echo "🔌 Testando APIs (Health Check)..."
echo ""

# Array de APIs
declare -a apis=("liciaiApi" "cliniaApi" "jobsagentApi" "analisadoreditalApi" "analisadortrApi")
declare -a names=("LiciAI" "Clínia" "JobsAgent" "Analisador Edital" "Analisador TR")

# Testar cada API
for i in "${!apis[@]}"; do
  api="${apis[$i]}"
  name="${names[$i]}"
  
  # Test via Cloud Function URL
  echo -e "${YELLOW}Testing $name via Cloud Function...${NC}"
  RESPONSE=$(curl -s "$BASE_FUNCTION_URL/$api/health" 2>&1)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_FUNCTION_URL/$api/health")
  
  if [ $STATUS -eq 200 ]; then
    echo -e "${GREEN}✅ $name Function: OK ($STATUS)${NC}"
    echo "   Response: $RESPONSE"
  else
    echo -e "${RED}❌ $name Function: ERRO ($STATUS)${NC}"
  fi
  
  # Test via Hosting Rewrite
  api_path=$(echo $api | sed 's/Api$//' | tr '[:upper:]' '[:lower:]')
  echo -e "${YELLOW}Testing $name via Hosting Rewrite...${NC}"
  RESPONSE_REWRITE=$(curl -s "$BASE_API_URL/$api_path/health" 2>&1)
  STATUS_REWRITE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API_URL/$api_path/health")
  
  if [ $STATUS_REWRITE -eq 200 ]; then
    echo -e "${GREEN}✅ $name Rewrite: OK ($STATUS_REWRITE)${NC}"
    echo "   Response: $RESPONSE_REWRITE"
  else
    echo -e "${RED}❌ $name Rewrite: ERRO ($STATUS_REWRITE)${NC}"
  fi
  
  echo ""
done

echo ""
echo "🎯 Testando Apps no Hub..."
echo ""

declare -a app_paths=("liciai" "clinia" "jobsagent" "dashboard" "analisadortr")
declare -a app_names=("LiciAI" "Clínia" "JobsAgent" "Dashboard" "Analisador TR")

for i in "${!app_paths[@]}"; do
  app="${app_paths[$i]}"
  name="${app_names[$i]}"
  
  APP_URL="$HUB_URL/apps/$app/index.html"
  APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL)
  
  if [ $APP_STATUS -eq 200 ]; then
    echo -e "${GREEN}✅ $name: $APP_URL - OK ($APP_STATUS)${NC}"
  elif [ $APP_STATUS -eq 404 ]; then
    echo -e "${YELLOW}⚠️  $name: $APP_URL - NOT FOUND ($APP_STATUS)${NC}"
  else
    echo -e "${RED}❌ $name: $APP_URL - ERRO ($APP_STATUS)${NC}"
  fi
done

echo ""
echo "=================================="
echo "✅ Testes Concluídos!"
echo ""
echo "📋 URLs Principais:"
echo "   Hub: $HUB_URL"
echo "   Console: https://console.firebase.google.com/project/uniquex-487718"
echo ""
