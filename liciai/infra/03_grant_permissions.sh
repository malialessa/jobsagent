#!/bin/bash
set -e
PROJECT_ID=$(gcloud config get-value project)
SA_APPSPOT="${PROJECT_ID}@appspot.gserviceaccount.com" # Service Account do Cloud Functions/App Engine

echo "Concedendo permissões para a Service Account: ${SA_APPSPOT}"

# Papel para editar dados no BigQuery (inserir linhas)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_APPSPOT}" \
  --role="roles/bigquery.dataEditor" \
  --condition=None > /dev/null

# Papel para executar jobs no BigQuery (necessário para dataEditor)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_APPSPOT}" \
  --role="roles/bigquery.jobUser" \
  --condition=None > /dev/null

# Papel para ser invocado por serviços como o Cloud Scheduler (se a função for privada)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_APPSPOT}" \
  --role="roles/run.invoker" \
  --condition=None > /dev/null

echo "✅ Permissões concedidas com sucesso."
