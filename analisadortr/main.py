import os
import io
import json
import datetime
from threading import Thread
from queue import Queue

import fitz  # PyMuPDF
import werkzeug.datastructures
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

# Imports para Vertex AI
from google.api_core.exceptions import ClientError, DeadlineExceeded
from google.cloud import aiplatform
from vertexai.generative_models import GenerationConfig, GenerativeModel
import vertexai

# --- Configuração da Aplicação Flask ---
app = Flask(__name__)
CORS(app)

# --- Configurações do Vertex AI (Variáveis de Ambiente) ---
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
GCP_LOCATION = os.environ.get("GCP_LOCATION")
VERTEX_AI_MODEL_NAME = os.environ.get("VERTEX_AI_MODEL_NAME", "gemini-2.0-flash-001")

# --- Inicialização do Modelo Gemini ---
gemini_model = None
try:
    if GCP_PROJECT_ID and GCP_LOCATION:
        aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        gemini_model = GenerativeModel(VERTEX_AI_MODEL_NAME)
        app.logger.info(
            f"Modelo Vertex AI '{VERTEX_AI_MODEL_NAME}' inicializado com sucesso."
        )
    else:
        missing_vars = [v for v in ["GCP_PROJECT_ID", "GCP_LOCATION"] if not os.environ.get(v)]
        app.logger.error(f"Variáveis de ambiente críticas ausentes: {', '.join(missing_vars)}")
except Exception as e:
    app.logger.exception(f"Falha crítica na inicialização do modelo Vertex AI: {e}")

# --- Ferramentas de Extração e Processamento de Texto ---
def extract_text_from_pdf_pymupdf(pdf_file_storage):
    """Extrai texto de um objeto FileStorage de PDF de forma segura."""
    try:
        pdf_bytes = pdf_file_storage.read()
        if not pdf_bytes:
            return {"error": "Erro interno: Arquivo PDF vazio ou já lido."}
        
        doc = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
        text = "".join(page.get_text("text") for page in doc)
        doc.close()

        if not text.strip():
            return {"error": "Nenhum conteúdo textual extraído do PDF."}
        return {"content": text}
    except Exception as e:
        app.logger.error(f"Erro ao processar PDF com PyMuPDF: {e}")
        return {"error": f"Erro irrecuperável ao processar o arquivo PDF: {str(e)}"}

def chunk_text(text, chunk_size=14000):
    """Divide um texto longo em pedaços (chunks) de um tamanho definido."""
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

# --- Lista de Perguntas do Checklist ---
checklist_questions = [
    {"num": 1, "text": "No termo de Referência há definição clara de prazos, métodos e rotinas de execução?"},
    {"num": 3, "text": "No Termo de Referência foi realizada uma análise de riscos com medidas de mitigação?"},
    {"num": 4, "text": "O Termo de Referência contém a definição do objeto, incluídos sua natureza, os quantitativos e as unidades de medida?"},
    {"num": 5, "text": "O Termo de Referência contém fundamentação da necessidade da contratação e do quantitativo do objeto?"},
    {"num": 9, "text": "No Termo de Referência há descrição da solução como um todo, considerando todo o ciclo de vida do objeto e suas especificações técnicas?"},
    {"num": 10, "text": "O Termo de Referência apresenta o modelo de execução do objeto, incluindo prazos, local de prestação, regras para recebimento e condições de execução?"},
    {"num": 12, "text": "O Termo de Referência apresenta o valor máximo estimado unitário e global da contratação?"},
    {"num": 16, "text": "O Termo de Referência estabelece a modalidade de licitação, critério de julgamento e modo de disputa, com a motivação correspondente?"},
    {"num": 19, "text": "O Termo de Referência define as exigências para Habilitação Jurídica, Habilitação Fiscal e Técnica, devidamente justificadas?"},
    {"num": 20, "text": "O Termo de Referência estabelece o prazo do contrato e, se for o caso, a possibilidade de sua prorrogação?"},
    {"num": 22, "text": "O Termo de Referência estabelece os requisitos da contratação, limitados ao indispensável para o atendimento da necessidade pública?"},
    {"num": 27, "text": "O Termo de Referência define o modelo de gestão do contrato, descrevendo como a execução será acompanhada e fiscalizada?"},
    {"num": 28, "text": "O Termo de Referência estabelece critérios e prazos de medição e de pagamento?"},
    {"num": 29, "text": "O Termo de Referência define as sanções administrativas aplicáveis à contratação?"},
    {"num": 33, "text": "Foi anexada aos autos Pesquisa de Preços?"},
]

# --- LLM Call Helpers (Síncronos para uso em Threads) ---
def get_llm_analysis_sync(prompt_text, task_description, is_json_output=True):
    """Envia um prompt para o modelo Gemini de forma síncrona (bloqueante)."""
    if gemini_model is None:
        return {"error_detail": "Modelo Gemini não disponível."}

    app.logger.info(f"Iniciando chamada síncrona para: {task_description}")
    
    generation_config = GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json" if is_json_output else "text/plain"
    )
    
    try:
        response = gemini_model.generate_content(
            contents=[{"role": "user", "parts": [{"text": prompt_text}]}],
            generation_config=generation_config,
        )
        return json.loads(response.text) if is_json_output else response.text
    except Exception as e:
        error_type = type(e).__name__
        app.logger.error(f"Erro na chamada ao LLM para {task_description} ({error_type}): {e}")
        error_payload = {"error_detail": f"Erro na análise da IA para {task_description}: {error_type}"}
        return error_payload if is_json_output else str(error_payload)

# --- Endpoint Principal da Aplicação ---
@app.route("/", methods=["POST"])
def analyze_pdf_endpoint_stream():
    """Endpoint que usa multi-threading para executar tarefas de I/O em paralelo."""
    if gemini_model is None:
        return jsonify({"error": "Serviço indisponível: Modelo de IA não inicializado."}), 503

    if 'pdf_file' not in request.files:
        return jsonify({"error": "Nenhum arquivo PDF encontrado na requisição."}), 400

    pdf_file = request.files['pdf_file']
    if not pdf_file or not pdf_file.filename:
        return jsonify({"error": "Nome de arquivo inválido ou arquivo não presente."}), 400

    extraction_result = extract_text_from_pdf_pymupdf(pdf_file)
    if "error" in extraction_result:
        return jsonify({"error": extraction_result["error"]}), 400

    full_pdf_content = extraction_result["content"]
    app.logger.info(f"Texto do PDF extraído ({len(full_pdf_content)} caracteres).")

    def generate_analysis_events():
        """
        Gerador que implementa o padrão Map-Reduce com multi-threading.
        """
        # --- ETAPA 1: MAP - Resumir os pedaços do documento em paralelo ---
        text_chunks = chunk_text(full_pdf_content)
        summaries_queue = Queue()
        
        def summary_worker(chunk, num):
            summary = get_llm_analysis_sync(
                prompt_text=f"Resuma o seguinte trecho de um documento jurídico/administrativo. Foque nos pontos chave, obrigações, prazos, valores e riscos. Seja conciso e preciso. Trecho: --- {chunk} ---",
                task_description=f"Resumo do Pedaço {num}",
                is_json_output=False
            )
            summaries_queue.put(summary)

        app.logger.info(f"Iniciando {len(text_chunks)} threads para resumir o documento...")
        summary_threads = []
        for i, chunk in enumerate(text_chunks):
            thread = Thread(target=summary_worker, args=(chunk, i + 1))
            thread.start()
            summary_threads.append(thread)

        for t in summary_threads:
            t.join() # Espera todas as threads de resumo terminarem
        
        chunk_summaries = [summaries_queue.get() for _ in range(len(text_chunks))]
        comprehensive_summary = "\n\n---\n\n".join(chunk_summaries)
        app.logger.info(f"Resumo completo gerado com {len(comprehensive_summary)} caracteres.")

        # --- ETAPA 2: REDUCE - Analisar cada pergunta usando o resumo completo ---
        analysis_queue = Queue()

        def analysis_worker(q_info, prompt):
            llm_result = get_llm_analysis_sync(prompt, f"Quesito {q_info['num']}")
            analysis_queue.put((q_info, llm_result))

        app.logger.info("Iniciando threads para análise de perguntas em paralelo...")
        analysis_threads = []
        for q_info in checklist_questions:
            prompt = f"""
            Você é um assistente especializado em conformidade de licitações públicas no Brasil.
            Analise o RESUMO COMPLETO de um "Termo de Referência" abaixo e responda à pergunta específica.

            **RESUMO COMPLETO DO DOCUMENTO:**
            ---
            {comprehensive_summary}
            ---

            **Pergunta do Checklist:** {q_info['text']}

            **Instruções:** Responda em JSON com "RESPOSTA_AUTOMATICA", "TRECHO_JUSTIFICATIVO", "FUNDAMENTACAO_LEI_14133", "FUNDAMENTACAO_DECRETO_21872", "OUTRAS_REFERENCIAS". Baseie-se APENAS no resumo fornecido.
            ```json
            {{
                "RESPOSTA_AUTOMATICA": "Sim" | "Não" | "Em parte",
                "TRECHO_JUSTIFICATIVO": "Trecho relevante do resumo que justifica a resposta...",
                "FUNDAMENTACAO_LEI_14133": "Mencionado/Não mencionado...",
                "FUNDAMENTACAO_DECRETO_21872": "Mencionado/Não mencionado...",
                "OUTRAS_REFERENCIAS": "Outras leis ou 'Nenhuma'..."
            }}
            ```
            """
            thread = Thread(target=analysis_worker, args=(q_info, prompt))
            thread.start()
            analysis_threads.append(thread)

        all_analyses_for_summary = []
        for t in analysis_threads:
            t.join() # Espera todas as threads de análise terminarem

        # Ordena os resultados para garantir a ordem correta no stream
        results_list = sorted(list(analysis_queue.queue), key=lambda x: x[0]['num'])

        for q_info, llm_result in results_list:
            if "error_detail" in llm_result:
                llm_result.update({
                    "RESPOSTA_AUTOMATICA": "Erro na IA",
                    "TRECHO_JUSTIFICATIVO": llm_result["error_detail"]
                })
            
            analysis_for_client = {
                "Nº do Quesito": q_info["num"], "Texto do Quesito": q_info["text"],
                "Atendimento do Quesito": llm_result.get("RESPOSTA_AUTOMATICA", "Não avaliado"),
                "Trecho Justificativo (IA)": llm_result.get("TRECHO_JUSTIFICATIVO", ""),
                "FUNDAMENTACAO LEI 14.133/2021": llm_result.get("FUNDAMENTACAO_LEI_14133", "Não verificado"),
                "FUNDAMENTACAO DECRETO ESTADUAL 21.872/2023": llm_result.get("FUNDAMENTACAO_DECRETO_21872", "Não verificado"),
                "OUTRAS_REFERENCIAS": llm_result.get("OUTRAS_REFERENCIAS", "Nenhuma"),
            }
            all_analyses_for_summary.append(analysis_for_client)
            yield f"data: {json.dumps(analysis_for_client)}\n\n"
            app.logger.info(f"Resultado do quesito {q_info['num']} enviado ao cliente.")

        app.logger.info("Todos os resultados de análise foram coletados.")

        # --- ETAPA 3: REDUCE FINAL - Gerar o parecer final ---
        total_raw_score = sum(
            1.0 if res.get("Atendimento do Quesito", "").lower() == "sim" else
            0.5 if res.get("Atendimento do Quesito", "").lower() == "em parte" else 0.0
            for res in all_analyses_for_summary
        )
        final_score = (total_raw_score / len(checklist_questions)) * 10 if checklist_questions else 0.0
        
        condensed_answers = "\n".join([
            f"Q{res['Nº do Quesito']}: {res['Atendimento do Quesito']}. Justificativa: {res['Trecho Justificativo (IA)'][:100]}..."
            for res in all_analyses_for_summary
        ])

        final_summary_prompt = f"""
        Você é um assistente técnico especializado em conformidade de licitações públicas no Brasil.
        Com base no RESUMO COMPLETO do Termo de Referência e na ANÁLISE DETALHADA do checklist, elabore um "Parecer Final" conciso e objetivo, utilizando jargão jurídico-administrativo.

        **RESUMO COMPLETO DO DOCUMENTO:**
        ---
        {comprehensive_summary}
        ---

        **ANÁLISE DO CHECKLIST (Quesito: Resposta. Justificativa):**
        ---
        {condensed_answers}
        ---

        **Instruções para o Parecer Final (Obrigatório em formato JSON):**
        Forneça sua resposta OBRIGATORIAMENTE no seguinte formato JSON:
        ```json
        {{
            "titulo_parecer": "Parecer Técnico-Jurídico Preliminar sobre Termo de Referência",
            "avaliacao_geral": "Conclusão síntética acerca da regularidade formal e material do Instrumento (Ex: 'Regular com ressalvas', 'Necessita readequação').",
            "pontos_positivos": ["Análise favorável acerca de aspectos formais ou materiais identificados."],
            "pontos_de_atencao_riscos": ["Constatação de óbices ou impropriedades que demandem ajustes ou saneamento."],
            "recomendacoes_gerais": ["Proposições para a readequação ou aprimoramento do Termo de Referência."]
        }}
        ```
        """
        
        final_summary_json = get_llm_analysis_sync(final_summary_prompt, "Parecer Final")
        if "error_detail" in final_summary_json:
            final_summary_json = {
                "titulo_parecer": "Erro ao Gerar Parecer Final",
                "avaliacao_geral": f"Falha na IA: {final_summary_json['error_detail']}",
                "pontos_positivos": [], "pontos_de_atencao_riscos": [], "recomendacoes_gerais": []
            }

        final_summary_json["nota_geral_ia"] = f"{final_score:.2f}"
        
        app.logger.info("Análise completa. Enviando evento de finalização.")
        yield f"event: final_summary\ndata: {json.dumps(final_summary_json)}\n\n"
        yield f"event: stream_complete\ndata: {json.dumps({'message': 'Análise completa.'})}\n\n"

    return Response(generate_analysis_events(), mimetype='text/event-stream')

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), threaded=True)
