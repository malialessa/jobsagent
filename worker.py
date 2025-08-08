# worker.py
# Cloud Run Job - Responsável pelo scraping, análise e criação de documentos.

import os
import requests
import logging
import json
from google.cloud import firestore
from vertexai.generative_models import GenerativeModel, GenerationConfig
from datetime import datetime
from hashlib import sha256
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from flask import Flask, request

# Importa funções compartilhadas do módulo utils
from utils import update_log, clean_html, get_user_settings, filter_jobs_by_relevance

# --- Configurações do Ambiente (para o Job) ---
PROJECT_ID = os.environ.get('GCP_PROJECT', 'arquitetodadivulgacao')
FIRESTORE_COLLECTION_JOBS = 'jobapplications'
FIRESTORE_COLLECTION_LOGS = 'agent_logs'
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY')
APPS_SCRIPT_URL = os.environ.get('APPS_SCRIPT_URL')

# --- Clientes GCP ---
db = firestore.Client(project=PROJECT_ID)
model = GenerativeModel("gemini-1.5-flash")
app = Flask(__name__)

# --- Funções de Coleta de Vagas ---

def init_selenium_driver(log_ref):
    """Inicializa o WebDriver do Selenium em modo headless."""
    update_log(log_ref, "Iniciando o Selenium WebDriver...")
    try:
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        driver = webdriver.Chrome(options=chrome_options)
        update_log(log_ref, "Selenium WebDriver inicializado com sucesso.")
        return driver
    except Exception as e:
        update_log(log_ref, f"ERRO ao inicializar o Selenium: {e}")
        return None

def scrape_with_selenium(driver, company, keywords, log_ref):
    """Coleta vagas de uma empresa específica usando Selenium."""
    update_log(log_ref, f"[Selenium] Iniciando busca de vagas para {company}...")
    jobs = []
    
    # Mapeamento de empresas para suas URLs de busca de vagas
    search_urls = {
        "microsoft": "https://careers.microsoft.com/v2/global/en/search",
        "salesforce": "https://careers.salesforce.com/jobs/search",
        "amazon": "https://www.amazon.jobs/en/search"
    }
    
    url = search_urls.get(company.lower())
    if not url:
        update_log(log_ref, f"URL de busca para {company} não encontrada.")
        return []

    for keyword in keywords:
        search_query = f"{keyword} Brazil"
        update_log(log_ref, f"[Selenium {company}] Buscando por: '{search_query}'")
        
        try:
            driver.get(url)
            
            # Lógica específica para cada site (usando seletores mais robustos, se possível)
            if company.lower() == "microsoft":
                search_input = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "job-search-hero-search-input"))
                )
                search_input.send_keys(search_query)
                search_input.submit()
                time.sleep(5)
                job_elements = driver.find_elements(By.CSS_SELECTOR, ".card.job-result")
                for job_elem in job_elements:
                    title = job_elem.find_element(By.CSS_SELECTOR, ".heading-4").text
                    link = job_elem.find_element(By.CSS_SELECTOR, "a").get_attribute('href')
                    jobs.append({"job_id": sha256(link.encode()).hexdigest(), "title": title, "company": company, "link": link, "description": ""})
            
            # ... (Demais lógicas para Salesforce e Amazon aqui)
            
            update_log(log_ref, f"[Selenium {company}] Encontradas {len(jobs)} vagas para a palavra-chave '{keyword}'.")

        except (TimeoutException, NoSuchElementException) as e:
            update_log(log_ref, f"ERRO de scraping para {company}: {e}. O layout da página pode ter mudado.")
        except Exception as e:
            update_log(log_ref, f"ERRO inesperado ao buscar vagas para {company}: {e}")
            
    return jobs

def collect_all_jobs(settings, rapidapi_key, log_ref):
    """Centraliza a coleta de vagas de todas as fontes."""
    all_jobs = []
    
    # ... (código para coletar de outras APIs, como Google Careers e JSearch, aqui)
        
    driver = init_selenium_driver(log_ref)
    if driver:
        for site in settings.get('job_sites', []):
            if site['name'].lower() in ['microsoft', 'amazon', 'salesforce']:
                all_jobs.extend(scrape_with_selenium(driver, site['name'], site['keywords'], log_ref))
        driver.quit()

    return list(all_jobs)

def analyze_and_generate(job_data, profile_text, log_ref):
    """Usa o Gemini para analisar o fit e gerar o conteúdo do currículo."""
    update_log(log_ref, f"[GEMINI] Analisando vaga '{job_data['title']}'...")
    
    prompt = f"""
    // (O seu prompt da Gemini, mantido aqui)
    """
    
    try:
        generation_config = GenerationConfig(response_mime_type="application/json")
        response = model.generate_content(prompt, generation_config=generation_config)
        response_json = json.loads(response.text)
        
        return {
            'fit_score': int(response_json.get('fit_score', 0)),
            # ... (outros campos)
        }
    except Exception as e:
        update_log(log_ref, f"[GEMINI] Erro ao chamar a API ou processar JSON: {e}")
        return {"fit_score": 0, "error": str(e)}

def generate_resume_google_docs(job_data, analysis_result, log_ref):
    """Envia uma requisição ao Google Apps Script para criar um Google Docs."""
    if not APPS_SCRIPT_URL:
        update_log(log_ref, "URL do Apps Script não configurada.")
        return None

    payload = {
        "job_title": job_data['title'],
        "company": job_data['company'],
        "resume_data": analysis_result
    }
    
    try:
        response = requests.post(APPS_SCRIPT_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        doc_url = result.get('docUrl')
        if doc_url:
            update_log(log_ref, f"Currículo gerado com sucesso: {doc_url}")
            return doc_url
        else:
            update_log(log_ref, f"Erro ao gerar o currículo via Apps Script: {result.get('error', 'Erro desconhecido')}")
            return None
    except requests.exceptions.RequestException as e:
        update_log(log_ref, f"Erro de comunicação com o Apps Script: {e}")
        return None

@app.route('/', methods=['POST'])
def scraping_job_endpoint():
    request_data = request.get_json(silent=True)
    log_id = request_data.get('log_id')
    log_ref = db.collection(FIRESTORE_COLLECTION_LOGS).document(log_id)

    try:
        update_log(log_ref, "Cloud Run Job de scraping iniciado.")
        
        settings = get_user_settings()
        
        all_found_jobs = collect_all_jobs(settings, RAPIDAPI_KEY, log_ref)
        relevant_jobs = filter_jobs_by_relevance(all_found_jobs, log_ref)
        
        if not relevant_jobs:
            update_log(log_ref, "Nenhuma vaga relevante encontrada. Encerrando.")
            log_ref.update({'status': 'completed'})
            return '', 200
        
        for job in relevant_jobs:
            # Hash mais robusto
            job_hash_data = f"{job['title']}_{job['company']}_{job['link']}"
            job_hash = sha256(job_hash_data.encode()).hexdigest()
            
            if db.collection(FIRESTORE_COLLECTION_JOBS).document(job_hash).get().exists:
                update_log(log_ref, f"PULANDO: Vaga '{job['title']}' já processada.")
                continue
            
            # Checagem de descrição vazia
            if not job.get('description'):
                update_log(log_ref, f"AVISO: Vaga '{job['title']}' ignorada por ter descrição vazia.")
                continue

            analysis = analyze_and_generate(job, settings.get('profile', ''), log_ref)
            
            doc_ref = db.collection(FIRESTORE_COLLECTION_JOBS).document(job_hash)
            data = {
                'timestamp': firestore.SERVER_TIMESTAMP,
                'job_title': job['title'], 
                'company': job['company'],
                'job_link': job['link'],
                'fit_score': analysis.get('fit_score', 0),
                'resume_summary': analysis.get('summary', 'N/A'),
                'resume_url': None,
                'status': 'pendente'
            }

            if analysis.get('fit_score', 0) >= settings.get('min_fit_score', 8):
                resume_url = generate_resume_google_docs(job, analysis, log_ref)
                data['resume_url'] = resume_url
            else:
                update_log(log_ref, f"BAIXO FIT ({data['fit_score']}/10): Descartando vaga '{job['title']}'.")
            
            doc_ref.set(data)
            update_log(log_ref, f"Vaga e CV salvos no Firestore.")
            
            time.sleep(2)
            
        update_log(log_ref, "Cloud Run Job de scraping finalizado.")
        log_ref.update({'status': 'completed', 'end_timestamp': firestore.SERVER_TIMESTAMP})

        return '', 200

    except Exception as e:
        error_message = f"ERRO FATAL no job de scraping: {e}"
        logging.error(error_message)
        if log_ref:
            log_ref.update({'status': 'error', 'error_message': error_message, 'end_timestamp': firestore.SERVER_TIMESTAMP})
        return error_message, 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
