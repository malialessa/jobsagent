#!/bin/bash
set -e
echo "Habilitando APIs necessárias..."
gcloud services enable \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  bigquery.googleapis.com \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  firebasehosting.googleapis.com
echo "✅ APIs habilitadas com sucesso!"
