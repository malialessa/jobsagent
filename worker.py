# worker.py
# Cloud Run Job - Responsável pelo scraping, análise e criação de documentos.

import os
import requests
import logging
import json
import time
from google.cloud import firestore
from vertexai.generative_models import GenerativeModel, GenerationConfig
from datetime import datetime
from hashlib import sha256
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import feedparser # Mantido para RSS, caso seja implementado
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
    except WebDriverException as e:
        update_log(log_ref, f"ERRO ao inicializar o Selenium: {e}")
        return None

def scrape_google_jobs(log_ref):
    """Busca vagas diretamente da API Greenhouse do Google."""
    update_log(log_ref, "[API Google] Iniciando busca de vagas no Google Careers...")
    url = "https://boards-api.greenhouse.io/v1/boards/google/jobs?content=true"
    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        data = response.json()
        jobs = []
        for job in data.get('jobs', []):
            jobs.append({
                "job_id": str(job.get('id')),
                "title": job.get('title'),
                "company": "Google",
                "description": clean_html(job.get('content', '')),
                "link": job.get('absolute_url')
            })
        update_log(log_ref, f"[API Google] Coleta finalizada. Encontradas {len(jobs)} vagas.")
        return jobs
    except requests.exceptions.RequestException as e:
        update_log(log_ref, f"[API Google] ERRO: Não foi possível buscar vagas. {e}")
        return []

def scrape_with_selenium(driver, company, keywords, log_ref):
    """Coleta vagas de uma empresa específica usando Selenium."""
    update_log(log_ref, f"[Selenium] Iniciando busca de vagas para {company}...")
    jobs = []
    
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
            
            # Lógica específica para cada site
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
            
            # TODO: Implementar lógica de scraping para Salesforce e Amazon
            
            update_log(log_ref, f"[Selenium {company}] Encontradas {len(jobs)} vagas para a palavra-chave '{keyword}'.")

        except (TimeoutException, NoSuchElementException) as e:
            update_log(log_ref, f"ERRO de scraping para {company}: {e}. O layout da página pode ter mudado.")
        except Exception as e:
            update_log(log_ref, f"ERRO inesperado ao buscar vagas para {company}: {e}")
            
    return jobs

def collect_all_jobs(settings, rapidapi_key, log_ref):
    """Centraliza a coleta de vagas de todas as fontes."""
    all_jobs = []
    
    update_log(log_ref, "Iniciando a coleta de vagas de todas as fontes.")
    
    all_jobs.extend(scrape_google_jobs(log_ref))
    
    # TODO: Descomentar ou implementar a coleta do JSearch se necessário
    # if rapidapi_key:
    #     all_jobs.extend(scrape_jsearch_jobs(settings['job_sites'], rapidapi_key, log_ref))
        
    driver = init_selenium_driver(log_ref)
    if driver:
        for site in settings.get('job_sites', []):
            if site['name'].lower() in ['microsoft', 'amazon', 'salesforce']:
                all_jobs.extend(scrape_with_selenium(driver, site['name'], site['keywords'], log_ref))
        driver.quit()
    else:
        update_log(log_ref, "Selenium desativado devido a erro de inicialização.")

    unique_jobs = {job['job_id']: job for job in all_jobs}.values()
    
    update_log(log_ref, f"[Coleta Central] Coleta finalizada. {len(unique_jobs)} vagas únicas encontradas.")
    return list(unique_jobs)
    
def analyze_and_generate(job_data, profile_text, log_ref):
    """Usa o Gemini para analisar o fit e gerar o conteúdo do currículo."""
    update_log(log_ref, f"[GEMINI] Analisando vaga '{job_data['title']}'...")
    
    prompt = f"""
    Você é um assistente especializado em gerar currículos. Preencha os placeholders do modelo abaixo com base no perfil da candidata e na vaga de referência.

    **Modelo de Currículo:**
    Amália Silva
    [Resume]
    Cuiabá, Mato Grosso, Brasil | +55 65 99982-5428 | amaliaalessa@gmail.com | linkedin.com/in/amaliaasilva
    PROFESSIONAL SUMMARY
    [Summary]
    EXPERIENCES
    Xertica.ai | Sales & Documentation Analytics | Feb 2025 – Present
    [XerticaSummary]
    Coreplan Gestão e Tecnologia | Project Manager | Feb 2024 – Feb 2025
    [CoreplanSummary]
    PGE/MT – State Attorney General’s Office | CIO | May 2022 – Feb 2024
    [PGESummary]
    SKILLS
    [Skills]
    
    **Vaga de Referência:**
    Título: {job_data.get('title', 'N/A')}
    Descrição: {job_data.get('description', 'N/A')}

    **Perfil da candidata:**
    {profile_text}
    
    Formate a resposta como um objeto JSON com as chaves: "fit_score" (número de 1 a 10), "resume", "summary", "xertica_summary", "coreplan_summary", "pge_summary", "skills".
    """
    
    try:
        generation_config = GenerationConfig(response_mime_type="application/json")
        response = model.generate_content(prompt, generation_config=generation_config)
        response_json = json.loads(response.text)
        
        normalized_data = {
            'fit_score': int(response_json.get('fit_score', 0)),
            'resume': response_json.get('resume', ''),
            'summary': response_json.get('summary', ''),
            'xertica_summary': response_json.get('xertica_summary', ''),
            'coreplan_summary': response_json.get('coreplan_summary', ''),
            'pge_summary': response_json.get('pge_summary', ''),
            'skills': response_json.get('skills', '')
        }

        update_log(log_ref, f"[GEMINI] Análise concluída. Fit Score: {normalized_data['fit_score']}")
        return normalized_data
    except Exception as e:
        update_log(log_ref, f"[GEMINI] Erro ao chamar a API ou processar JSON: {e}")
        return {"fit_score": 0, "error": str(e)}

def generate_resume_google_docs(job_data, analysis_result, log_ref):
    """Envia uma requisição ao Google Apps Script para criar um Google Docs com retries."""
    if not APPS_SCRIPT_URL:
        update_log(log_ref, "URL do Apps Script não configurada.")
        return None

    payload = {
        "job_title": job_data['title'],
        "company": job_data['company'],
        "resume_data": analysis_result
    }
    
    retries = 3
    for i in range(retries):
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
            update_log(log_ref, f"Erro de comunicação com o Apps Script (Tentativa {i+1}/{retries}): {e}")
            time.sleep(2 ** i)
    
    update_log(log_ref, "Falha na geração do currículo após múltiplas tentativas.")
    return None

# --- Rota principal para o Cloud Run Job ---
@app.route('/', methods=['POST'])
def scraping_job_endpoint():
    request_data = request.get_json(silent=True)
    log_id = request_data.get('log_id')
    log_ref = db.collection(FIRESTORE_COLLECTION_LOGS).document(log_id)

    try:
        update_log(log_ref, "Cloud Run Job de scraping iniciado.")
        
        settings = get_user_settings()
        amalia_profile = settings.get('profile', '')
        min_fit_score = settings.get('min_fit_score', 8)
        
        all_found_jobs = collect_all_jobs(settings, os.environ.get('RAPIDAPI_KEY'), log_ref)
        relevant_jobs = filter_jobs_by_relevance(all_found_jobs, log_ref)
        
        if not relevant_jobs:
            update_log(log_ref, "Nenhuma vaga relevante encontrada. Encerrando.")
            log_ref.update({'status': 'completed'})
            return '', 200
        
        for job in relevant_jobs:
            job_hash_data = f"{job.get('title', '')}_{job.get('company', '')}_{job.get('link', '')}"
            job_hash = sha256(job_hash_data.encode()).hexdigest()
            
            doc_ref = db.collection(FIRESTORE_COLLECTION_JOBS).document(job_hash)
            if doc_ref.get().exists:
                update_log(log_ref, f"PULANDO: Vaga '{job.get('title')}' já processada.")
                continue

            if not job.get('description') or len(job.get('description')) < 50:
                update_log(log_ref, f"AVISO: Vaga '{job.get('title')}' ignorada por ter descrição incompleta.")
                doc_ref.set({
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'job_title': job.get('title', 'N/A'),
                    'company': job.get('company', 'N/A'),
                    'status': 'descartada_por_desc_incompleta'
                })
                continue

            analysis = analyze_and_generate(job, amalia_profile, log_ref)
            
            data = {
                'timestamp': firestore.SERVER_TIMESTAMP,
                'job_title': job.get('title', 'N/A'), 
                'company': job.get('company', 'N/A'),
                'job_link': job.get('link', 'N/A'),
                'fit_score': analysis.get('fit_score', 0),
                'resume_summary': analysis.get('summary', 'N/A'),
                'resume_url': None,
                'status': 'pendente'
            }
            
            if analysis.get('fit_score', 0) >= min_fit_score:
                resume_url = generate_resume_google_docs(job, analysis, log_ref)
                if resume_url:
                    data['resume_url'] = resume_url
                else:
                    data['status'] = 'erro_cv'
                    update_log(log_ref, f"ERRO: Falha crítica ao gerar currículo para '{job.get('title')}' após retries.")
            else:
                data['status'] = 'descartada'
                update_log(log_ref, f"BAIXO FIT ({data['fit_score']}/10): Descartando vaga '{job.get('title')}'.")
            
            doc_ref.set(data)
            update_log(log_ref, f"Vaga salva no Firestore com status: {data['status']}.")
            
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
