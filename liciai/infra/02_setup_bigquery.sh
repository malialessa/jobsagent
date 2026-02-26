#!/bin/bash
set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
LOCATION="US" # Ou a localização de sua preferência
DATASETS=("stg" "core")

echo "Configurando BigQuery para o projeto: $PROJECT_ID"
for DS in "${DATASETS[@]}"; do
    if bq ls --format=json | grep -q "\"datasetReference\":{\"datasetId\":\"${DS}\""; then
        echo "Dataset '${DS}' já existe. Pulando."
    else
        echo "-> Criando dataset ${DS}..."
        bq --location="$LOCATION" mk --dataset --description="Dataset para dados de ${DS} do LiciAI" "${PROJECT_ID}:${DS}"
    fi
done

echo "-> Criando/Atualizando tabelas e views a partir de ../schemas/..."
# Processa tabelas primeiro, depois as views
for sql_file in ../schemas/*.sql ../schemas/views/*.sql; do
    if [ -f "$sql_file" ]; then
        echo "   - Processando: $(basename "$sql_file")"
        bq query --nouse_legacy_sql < "$sql_file"
    fi
done

echo "✅ Setup do BigQuery concluído."
