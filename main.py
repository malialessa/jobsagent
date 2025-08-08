# main.py
# Cloud Run Service - Orquestrador de jobs.

import os
import requests
import uuid
import logging
from flask import Flask, request, jsonify
from google.cloud import firestore
from datetime import datetime

# Importa funções compartilhadas do módulo utils
from utils import update_log, get_user_settings

# --- Configurações do Ambiente (para o Serviço) ---
PROJECT_ID = os.environ.get('GCP_PROJECT', 'arquitetodadivulgacao')
FIRESTORE_COLLECTION_LOGS = 'agent_logs'
CLOUD_RUN_JOB_URL = os.environ.get('CLOUD_RUN_JOB_URL')

# --- Clientes GCP ---
db = firestore.Client(project=PROJECT_ID)
app = Flask(__name__)

@app.route('/', methods=['POST'])
def run_agent_endpoint():
    try:
        request_data = request.get_json(silent=True)
        log_id = request_data.get('log_id', str(uuid.uuid4()))
        log_ref = db.collection(FIRESTORE_COLLECTION_LOGS).document(log_id)

        # 1. Verifica se já existe um job em execução para evitar concorrência
        log_doc = log_ref.get()
        if log_doc.exists and log_doc.to_dict().get('status') == 'running':
            return jsonify({"message": "O agente já está em execução. Por favor, aguarde.", "log_id": log_id}), 409

        # 2. Inicia o log e a flag de bloqueio
        log_ref.set({'status': 'running', 'timestamp': firestore.SERVER_TIMESTAMP, 'logs': []})
        update_log(log_ref, "Agente de Empregos iniciado por requisição HTTP. Acionando Cloud Run Job...")
        
        # 3. Dispara a execução do Job de scraping
        if not CLOUD_RUN_JOB_URL:
             raise ValueError("URL do Cloud Run Job de scraping não está configurada.")
        
        # Envia o log_id para que o worker possa continuar o log
        response = requests.post(CLOUD_RUN_JOB_URL, json={'log_id': log_id}, timeout=10)
        response.raise_for_status()

        return jsonify({"message": "Agente iniciado com sucesso. Verifique os logs para acompanhar o progresso.", "log_id": log_id}), 202

    except Exception as e:
        error_message = f"ERRO FATAL no serviço principal: {e}"
        logging.error(error_message)
        if 'log_ref' in locals():
            log_ref.update({'status': 'error', 'error_message': error_message})
        return jsonify({"message": error_message}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
