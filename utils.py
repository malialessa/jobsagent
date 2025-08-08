# utils.py
# Funções compartilhadas entre o serviço principal e o worker de scraping.

import os
import json
import logging
from datetime import datetime
from google.cloud import firestore
from bs4 import BeautifulSoup

# --- Configurações do Ambiente ---
PROJECT_ID = os.environ.get('GCP_PROJECT', 'arquitetodadivulgacao')
FIRESTORE_COLLECTION_SETTINGS = 'user_settings'
db = firestore.Client(project=PROJECT_ID)

# --- Constantes Padrão ---
DEFAULT_AMALIA_PROFILE = """
## Perfil Principal
Estrategista em Operações, Transformação Digital e Governança com mais de 4 anos de liderança em projetos de inovação no setor público e privado. Experiência comprovada na conexão entre prioridades de negócio, políticas públicas e soluções em nuvem. Alta capacidade de articulação com stakeholders, entregando impacto mensurável e escalável.
"""
DEFAULT_JOB_SITES = [
    {"name": "Google", "keywords": ["strategy operations", "program manager", "cloud"]},
    {"name": "Microsoft", "keywords": ["cloud solutions", "customer success", "program manager"]},
    {"name": "Amazon", "keywords": ["program manager", "cloud"]},
    {"name": "Salesforce", "keywords": ["customer success", "consultant"]}
]
DEFAULT_NOTIF_EMAIL = "seu.email@exemplo.com"
DEFAULT_MIN_FIT_SCORE = 8

def update_log(log_ref, message):
    """Envia uma mensagem de log para o console e para o Firestore com data e hora."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    full_message = f"[{timestamp}] {message}"
    logging.info(full_message)
    if log_ref:
        log_ref.update({
            'logs': firestore.ArrayUnion([full_message])
        })

def clean_html(content):
    """Remove tags HTML e decodifica entidades HTML de uma string."""
    return BeautifulSoup(content, "html.parser").get_text()

def get_user_settings():
    """Busca as configurações do usuário no Firestore ou cria com valores padrão."""
    settings_ref = db.collection(FIRESTORE_COLLECTION_SETTINGS).document('config')
    settings = settings_ref.get().to_dict()
    if not settings:
        logging.info("Documento de configuração não encontrado. Criando com valores padrão.")
        settings = {
            'profile': DEFAULT_AMALIA_PROFILE,
            'job_sites': DEFAULT_JOB_SITES,
            'notif_email': DEFAULT_NOTIF_EMAIL,
            'min_fit_score': DEFAULT_MIN_FIT_SCORE,
        }
        settings_ref.set(settings)
    return settings

def filter_jobs_by_relevance(jobs, log_ref):
    """Filtra a lista de vagas para incluir apenas vagas relevantes para o perfil de Amália."""
    
    geographical_keywords = ["brasil", "brazil", "brazilian", "português", "portuguese"]
    negative_keywords = ["dev", "developer", "engineer", "software", "backend", "frontend", "fullstack", "qa", "ux", "ui"]
    profile_keywords = ["strategy", "operations", "program manager", "cloud", "transformation", "governance", "sales", "customer success"]
    
    filtered_jobs = []
    
    for job in jobs:
        title = job.get('title', '').lower()
        description = job.get('description', '').lower()

        is_not_too_technical = not any(kw in title for kw in negative_keywords)
        is_relevant_profile = any(kw in title or kw in description for kw in profile_keywords)
        is_brazil_friendly = any(kw in title or kw in description for kw in geographical_keywords)
        
        if is_not_too_technical and is_relevant_profile and is_brazil_friendly:
            filtered_jobs.append(job)
        else:
            update_log(log_ref, f"AVISO: Vaga '{job.get('title', 'N/A')}' filtrada por não ser relevante.")

    update_log(log_ref, f"Filtro de relevância aplicado. {len(filtered_jobs)} vagas restantes.")
    return filtered_jobs
