# main.py
# Cloud Run Service - Orquestrador de jobs.

import os
import requests
import uuid
import logging
import json
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from google.cloud import firestore
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from datetime import datetime

# Importa funções compartilhadas do módulo utils
from utils import update_log, get_user_settings

# --- Configurações do Ambiente (para o Serviço) ---
PROJECT_ID = os.environ.get('GCP_PROJECT', 'arquitetodadivulgacao')
FIRESTORE_COLLECTION_LOGS = 'agent_logs'
CLOUD_RUN_JOB_URL = os.environ.get('CLOUD_RUN_JOB_URL')
WORKSPACE_ROOT = Path(__file__).resolve().parent

DEFAULT_HUB_FIREBASE_CONFIG = {
    "apiKey": os.environ.get('HUB_FIREBASE_API_KEY', 'AIzaSyA43C0ZrG7F_hUdue0-uG24WPgLkQkNQc0'),
    "authDomain": os.environ.get('HUB_FIREBASE_AUTH_DOMAIN', 'sharp-footing-475513-c7.firebaseapp.com'),
    "projectId": os.environ.get('HUB_FIREBASE_PROJECT_ID', 'sharp-footing-475513-c7'),
    "storageBucket": os.environ.get('HUB_FIREBASE_STORAGE_BUCKET', 'sharp-footing-475513-c7.appspot.com'),
    "messagingSenderId": os.environ.get('HUB_FIREBASE_MESSAGING_SENDER_ID', '995790591545'),
    "appId": os.environ.get('HUB_FIREBASE_APP_ID', '1:995790591545:web:9e369cc92784ddc7b85fe8')
}

# --- Clientes GCP ---
db = firestore.Client(project=PROJECT_ID)
app = Flask(__name__)


def _safe_read_json(file_path: Path):
    if not file_path.exists():
        return None
    try:
        return json.loads(file_path.read_text(encoding='utf-8'))
    except Exception:
        return None


def _safe_read_text(file_path: Path):
    if not file_path.exists():
        return ""
    try:
        return file_path.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return ""


def _looks_like_google_auth(frontend_text: str):
    patterns = [
        'GoogleAuthProvider',
        'google-login-btn',
        'signInWithPopup(provider)',
        'firebase-auth',
        'continue com',
    ]
    lowered = frontend_text.lower()
    return any(pattern.lower() in lowered for pattern in patterns)


def _discover_firebase_apps():
    apps = []
    for firebase_file in WORKSPACE_ROOT.rglob('firebase.json'):
        if any(p in {'.git', 'node_modules', '.firebase'} for p in firebase_file.parts):
            continue
        app_dir = firebase_file.parent
        rel = app_dir.relative_to(WORKSPACE_ROOT).as_posix()
        app_id = rel.replace('/', '__')
        apps.append((app_id, app_dir))
    apps.sort(key=lambda item: item[0])
    return apps


def _build_app_health(app_id: str, app_dir: Path):
    firebase_path = app_dir / 'firebase.json'
    firebaserc_path = app_dir / '.firebaserc'
    firebase_cfg = _safe_read_json(firebase_path) or {}
    firebaserc_cfg = _safe_read_json(firebaserc_path) or {}

    hosting_cfg = firebase_cfg.get('hosting', {}) if isinstance(firebase_cfg, dict) else {}
    functions_cfg = firebase_cfg.get('functions', {}) if isinstance(firebase_cfg, dict) else {}

    public_dir = app_dir / hosting_cfg.get('public', 'public')
    public_index = public_dir / 'index.html'
    public_app = public_dir / 'app.html'
    frontend_path = public_index if public_index.exists() else public_app
    frontend_text = _safe_read_text(frontend_path) if frontend_path.exists() else ""

    function_source = None
    function_dir = None
    if isinstance(functions_cfg, dict):
        function_source = functions_cfg.get('source')
        if function_source:
            function_dir = app_dir / function_source

    tsconfig_path = function_dir / 'tsconfig.json' if function_dir else None
    tsconfig_cfg = _safe_read_json(tsconfig_path) if tsconfig_path else None
    include_src = False
    src_exists = False
    if isinstance(tsconfig_cfg, dict):
        includes = tsconfig_cfg.get('include', [])
        if isinstance(includes, list):
            include_src = any(str(item).strip() == 'src' for item in includes)
    if function_dir:
        src_exists = (function_dir / 'src').exists()

    function_entry_exists = False
    if function_dir and function_dir.exists():
        candidate_entries = [
            function_dir / 'src' / 'index.ts',
            function_dir / 'index.ts',
            function_dir / 'dist' / 'index.js',
            function_dir / 'lib' / 'index.js',
        ]
        function_entry_exists = any(path.exists() for path in candidate_entries)

    missing_items = []
    checks = []

    checks.append({'key': 'firebase_json', 'ok': firebase_path.exists(), 'label': 'firebase.json presente'})
    checks.append({'key': 'firebaserc', 'ok': firebaserc_path.exists(), 'label': '.firebaserc presente'})
    checks.append({'key': 'hosting_public', 'ok': public_dir.exists(), 'label': 'Diretório public presente'})
    checks.append({'key': 'hosting_entry', 'ok': public_index.exists() or public_app.exists(), 'label': 'Página inicial (index.html/app.html) presente'})
    checks.append({'key': 'google_auth_front', 'ok': _looks_like_google_auth(frontend_text), 'label': 'Google Auth detectado no frontend'})

    if function_source:
        checks.append({'key': 'functions_source', 'ok': function_dir.exists(), 'label': f'Diretório de Functions ({function_source}) presente'})
        checks.append({'key': 'functions_entry', 'ok': function_entry_exists, 'label': 'Entry point de Functions detectado'})
        checks.append({'key': 'functions_tsconfig_src_sync', 'ok': (not include_src) or src_exists, 'label': 'tsconfig include=src compatível com estrutura'})

    for check in checks:
        if not check['ok']:
            missing_items.append(check['label'])

    firebase_project = None
    if isinstance(firebaserc_cfg, dict):
        firebase_project = (firebaserc_cfg.get('projects') or {}).get('default')

    site = hosting_cfg.get('site') if isinstance(hosting_cfg, dict) else None
    web_urls = []
    if site:
        web_urls = [
            f'https://{site}.web.app',
            f'https://{site}.firebaseapp.com'
        ]

    actions = {}
    if function_dir and function_dir.exists() and (function_dir / 'package.json').exists():
        actions['build_functions'] = {
            'label': 'Build Functions',
            'command': f'cd "{function_dir.as_posix()}" && npm run build'
        }
    if function_dir and function_dir.exists() and not (function_dir / 'node_modules').exists() and (function_dir / 'package.json').exists():
        actions['install_functions'] = {
            'label': 'Instalar dependências Functions',
            'command': f'cd "{function_dir.as_posix()}" && npm install'
        }
    if firebase_path.exists():
        only_targets = ['hosting']
        if function_source:
            only_targets.append('functions')
        actions['deploy_firebase'] = {
            'label': 'Deploy Firebase',
            'command': f'cd "{app_dir.as_posix()}" && firebase deploy --only {",".join(only_targets)}'
        }

    return {
        'id': app_id,
        'name': app_dir.name,
        'path': app_dir.relative_to(WORKSPACE_ROOT).as_posix(),
        'firebaseProject': firebase_project,
        'hostingSite': site,
        'urls': web_urls,
        'checks': checks,
        'missing': missing_items,
        'ready': len(missing_items) == 0,
        'actions': actions,
    }


def _get_jobs_service_health():
    checks = [
        {'key': 'main_py', 'ok': (WORKSPACE_ROOT / 'main.py').exists(), 'label': 'Serviço orquestrador main.py presente'},
        {'key': 'worker_py', 'ok': (WORKSPACE_ROOT / 'worker.py').exists(), 'label': 'Worker worker.py presente'},
        {'key': 'requirements', 'ok': (WORKSPACE_ROOT / 'requirements.txt').exists(), 'label': 'requirements.txt presente'},
        {'key': 'dockerfile', 'ok': (WORKSPACE_ROOT / 'Dockerfile').exists(), 'label': 'Dockerfile presente'},
    ]
    missing = [item['label'] for item in checks if not item['ok']]
    return {
        'id': 'jobsagent_service',
        'name': 'jobsagent-service',
        'path': '.',
        'firebaseProject': None,
        'hostingSite': None,
        'urls': [],
        'checks': checks,
        'missing': missing,
        'ready': len(missing) == 0,
        'actions': {
            'run_local': {
                'label': 'Rodar API local',
                'command': f'cd "{WORKSPACE_ROOT.as_posix()}" && gunicorn --bind 0.0.0.0:8080 main:app'
            }
        }
    }


def _build_inventory():
    inventory = [_get_jobs_service_health()]
    for app_id, app_dir in _discover_firebase_apps():
        inventory.append(_build_app_health(app_id, app_dir))

    clinia_main = next((item for item in inventory if item['path'] == 'clinia'), None)
    clinia_dup = next((item for item in inventory if item['path'] == 'clinia/clinia'), None)
    if clinia_main and clinia_dup:
        duplicate_msg = 'Estrutura duplicada detectada (clinia e clinia/clinia). Consolidar para evitar deploy no diretório errado.'
        clinia_main['missing'].append(duplicate_msg)
        clinia_dup['missing'].append(duplicate_msg)
        clinia_main['ready'] = False
        clinia_dup['ready'] = False

    return inventory


def _require_firebase_user():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, (jsonify({'error': 'Token ausente.'}), 401)
    token = auth_header.split('Bearer ', 1)[1].strip()
    try:
        decoded = id_token.verify_firebase_token(token, google_requests.Request(), DEFAULT_HUB_FIREBASE_CONFIG['projectId'])
        if not decoded:
            raise ValueError('Token inválido')
        return decoded, None
    except Exception as exc:
        return None, (jsonify({'error': f'Token inválido: {exc}'}), 401)


@app.route('/hub', methods=['GET'])
@app.route('/hub/', methods=['GET'])
def hub_page():
    return send_from_directory((WORKSPACE_ROOT / 'hub' / 'public').as_posix(), 'index.html')


@app.route('/hub/<path:filename>', methods=['GET'])
def hub_static(filename):
    return send_from_directory((WORKSPACE_ROOT / 'hub' / 'public').as_posix(), filename)


@app.route('/hub/api/config', methods=['GET'])
def hub_config():
    return jsonify({'firebaseConfig': DEFAULT_HUB_FIREBASE_CONFIG})


@app.route('/hub/api/apps', methods=['GET'])
def hub_apps():
    _, auth_error = _require_firebase_user()
    if auth_error:
        return auth_error

    inventory = _build_inventory()
    total = len(inventory)
    ready = sum(1 for item in inventory if item['ready'])
    return jsonify({
        'summary': {
            'totalApps': total,
            'readyApps': ready,
            'missingPieces': total - ready,
        },
        'apps': inventory,
    })


@app.route('/hub/api/run', methods=['POST'])
def hub_run_action():
    _, auth_error = _require_firebase_user()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    app_id = data.get('appId')
    action_id = data.get('actionId')
    if not app_id or not action_id:
        return jsonify({'error': 'appId e actionId são obrigatórios.'}), 400

    inventory = _build_inventory()
    app_item = next((item for item in inventory if item['id'] == app_id), None)
    if not app_item:
        return jsonify({'error': 'App não encontrado.'}), 404

    action = app_item.get('actions', {}).get(action_id)
    if not action:
        return jsonify({'error': 'Ação não encontrada para este app.'}), 404

    command = action['command']
    try:
        completed = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return jsonify({
            'appId': app_id,
            'actionId': action_id,
            'command': command,
            'exitCode': completed.returncode,
            'stdout': completed.stdout[-12000:],
            'stderr': completed.stderr[-12000:],
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            'appId': app_id,
            'actionId': action_id,
            'command': command,
            'error': 'Timeout: a ação excedeu 300s.'
        }), 408

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
