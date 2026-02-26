import os
import io
import json # Importado para jsonify, boa prática mantê-lo se usar json.loads também
from flask import Flask, request, jsonify
from flask_cors import CORS # Import para CORS
import fitz  # Importa a biblioteca PyMuPDF, comumente referenciada como fitz

# Imports Corrigidos/Adicionados para Vertex AI
from google.cloud import aiplatform
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig # Importar GenerationConfig daqui
import werkzeug.datastructures

app = Flask(__name__)
CORS(app) # Habilita CORS para todas as rotas

# --- Configurações do LLM (Variáveis de Ambiente) ---
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
GCP_LOCATION = os.environ.get("GCP_LOCATION")
# Tente um modelo estável e GA primeiro, como gemini-1.0-pro ou o mais recente GA do 1.5 Pro que você encontrar no Model Garden
# Este valor pode ser sobrescrito pela variável de ambiente no Cloud Run
VERTEX_AI_MODEL_NAME = os.environ.get("VERTEX_AI_MODEL_NAME", "gemini-2.0-flash-001") # Alterado para um modelo mais estável como padrão de fallback
PDF_TEXT_EXTRACTION_TOOL = os.environ.get("PDF_TEXT_EXTRACTION_TOOL", "PYMUPDF")

# Inicializa o cliente Vertex AI e carrega o modelo Gemini
gemini_model = None
try:
    if GCP_PROJECT_ID and GCP_LOCATION: # Garante que as variáveis existem antes de inicializar
        aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        gemini_model = GenerativeModel(VERTEX_AI_MODEL_NAME)
        print(f"Modelo Vertex AI '{VERTEX_AI_MODEL_NAME}' inicializado com sucesso em {GCP_LOCATION} para o projeto {GCP_PROJECT_ID}.")
    else:
        missing_vars = []
        if not GCP_PROJECT_ID:
            missing_vars.append("GCP_PROJECT_ID")
        if not GCP_LOCATION:
            missing_vars.append("GCP_LOCATION")
        error_message = f"Variáveis de ambiente críticas ausentes para inicialização do Vertex AI: {', '.join(missing_vars)}"
        print(error_message)
        app.logger.error(error_message)
except Exception as e:
    print(f"EXCEÇÃO durante inicialização do Vertex AI: {e}")
    app.logger.exception(f"Erro na inicialização do modelo Vertex AI. Verifique credenciais/região/modelo: {e}")

# --- Ferramentas de Extração de Texto ---
def extract_text_from_pdf_pymupdf(pdf_file_storage):
    text = ""
    try:
        if not isinstance(pdf_file_storage, werkzeug.datastructures.FileStorage):
            error_msg = (f"Erro de tipo inesperado em extract_text_from_pdf_pymupdf: "
                         f"Esperava werkzeug.datastructures.FileStorage, mas recebeu {type(pdf_file_storage)}. "
                         f"Conteúdo parcial: {str(pdf_file_storage)[:200]}")
            app.logger.error(error_msg)
            return f"Erro interno na extração de PDF: Tipo de arquivo inesperado - {type(pdf_file_storage).__name__}"
        
        pdf_bytes = pdf_file_storage.read()
        if not pdf_bytes:
            app.logger.warning("Tentativa de ler um PDF vazio ou FileStorage já lido.")
            return "Erro interno na extração de PDF: Arquivo PDF vazio ou já processado."

        pdf_stream = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            text += page.get_text("text") or ""
        doc.close()
    except Exception as e:
        app.logger.error(f"Erro ao ler PDF com PyMuPDF: {e}")
        return None 
    return text

# --- Lista de Perguntas (COLE SUA LISTA COMPLETA DE 35 PERGUNTAS AQUI) ---
checklist_questions = [
    { "num": 1, "text": "No termo de Referência há definição clara de prazos, métodos e rotinas de execução?" },
            { "num": 2, "text": "No Termo de Referência os critérios de sustentabilidade estão alinhados ao Guia Nacional de Contratações Sustentáveis?" },
            { "num": 3, "text": "No Termo de Referência foi realizada uma análise de riscos com medidas de mitigação?" },
            { "num": 4, "text": "O Termo de Referência contém a definição do objeto, incluídos sua natureza, os quantitativos e as unidades de medida?" },
            { "num": 5, "text": "O Termo de Referência contém fundamentação da necessidade da contratação, do quantitativo do objeto e, se for o caso, do tipo de solução escolhida, que poderá consistir na referência ao estudo técnico preliminar correspondente, quando este for realizado e divulgado previamente ao processamento da licitação ou da contratação direta?" },
            { "num": 6, "text": "O Termo de Referência evidencia, para as contratações que envolvam bens ou serviços de informática e telecomunicação, o alinhamento com as necessidades tecnológicas e de negócio?" },
            { "num": 7, "text": "No Termo de Referência há justificativa para o parcelamento ou não da contratação, que poderá consistir na referência ao estudo técnico preliminar quando este for realizado e divulgado previamente ao processamento da licitação ou da contratação direta?" },
            { "num": 8, "text": "No Termo de Referência há previsão da vedação ou da participação de empresas sob a forma de consórcio ou cooperativa no processo de contratação e justificativa para o caso de vedação?" },
            { "num": 9, "text": "No Termo de Referência há descrição da solução como um todo, considerado todo o ciclo de vida do objeto, bem como suas especificações técnicas?" },
            { "num": 10, "text": "O Termo de Referência apresenta o modelo de execução do objeto, que consiste na definição de como o contrato deverá produzir os resultados pretendidos desde o seu início até o seu encerramento, incluindo as informações de prazo de início da prestação, local, regras para o recebimento provisório e definitivo, quando for o caso, incluindo regras para a inspeção, se aplicável, e demais condições necessárias para a execução dos serviços ou o fornecimento de bens?" },
            { "num": 11, "text": "No Termo de Referência há especificação da garantia do produto a ser exigida e das condições de manutenção e assistência técnica, quando for o caso?" },
            { "num": 12, "text": "O Termo de Referência apresenta o valor máximo estimado unitário e global da contratação, acompanhado de anexo contendo memórias de cálculo e documentos que lhe dão suporte, com os parâmetros utilizados para a obtenção dos preços e para os respectivos cálculos, salvo se adotado orçamento com caráter sigiloso?" },
            { "num": 13, "text": "O Termo de Referência apresenta justificativa para a adoção de orçamento sigiloso, se for o caso?" },
            { "num": 14, "text": "O Termo de Referência apresenta a classificação orçamentária da despesa, exceto quando se tratar de processos para formação de registro de preços, os quais deverão indicar apenas o código do elemento de despesa correspondente?" },
            { "num": 15, "text": "O Termo de Referência estabelece parâmetros, nas hipóteses previstas pela Lei Complementar Federal nº 123, de 14 de dezembro de 2006, de reserva de cota ou a exclusividade da licitação para os beneficiários da norma?" },
            { "num": 16, "text": "O Termo de Referência estabelece a modalidade de licitação, critério de julgamento e modo de disputa, apresentando motivação sobre a adequação e eficiência da combinação desses parâmetros?" },
            { "num": 17, "text": "O Termo de Referência define o prazo de validade, condições da proposta e, quando for o caso, a exigência de amostra, exame de conformidade ou prova de conceito, entre outros testes de interesse da Administração?" },
            { "num": 18, "text": "O Termo de Referência estabelece parâmetros objetivos de avaliação de propostas quando se tratar de licitação de melhor técnica ou de técnica e preço?" },
            { "num": 19, "text": "O Termo de Referência define as exigências para Habilitação Jurídica, Habilitação Fiscal, Social e Trabalhista, Qualificação Econômico-Financeira e Qualificação Técnica, quando necessários, e devidamente justificados quanto aos percentuais de aferição adotados, incluindo a previsão de haver vistoria técnica prévia, quando for o caso?" },
            { "num": 20, "text": "O Termo de Referência estabelece o prazo do contrato e, se for o caso, a possibilidade de sua prorrogação?" },
            { "num": 21, "text": "O Termo de Referência define o prazo para a assinatura do contrato?" },
            { "num": 22, "text": "O Termo de Referência estabelece os requisitos da contratação, limitados àqueles necessários e indispensáveis para o atendimento da necessidade pública, incluindo especificação de procedimentos para transição contratual, quando for o caso?" },
            { "num": 23, "text": "O Termo de Referência define as obrigações da contratante, exceto quando corresponderem àquelas previstas em instrumentos padronizados a serem utilizados na licitação, hipótese em que deverão ser descritas apenas as obrigações específicas relativas ao objeto pretendido?" },
            { "num": 24, "text": "O Termo de Referência estabelece as obrigações da contratada, exceto quando corresponderem àquelas previstas em instrumentos padronizados a serem utilizados na licitação, hipótese em que deverão ser descritas apenas as obrigações específicas relativas ao objeto pretendido?" },
            { "num": 25, "text": "O Termo de Referência define a previsão e condições de prestação da garantia contratual, quando exigida?" },
            { "num": 26, "text": "O Termo de Referência estabelece a previsão das condições para subcontratação ou justificativa para sua vedação na contratação pretendida?" },
            { "num": 27, "text": "O Termo de Referência define o modelo de gestão do contrato, que descreve como a execução do objeto será acompanhada e fiscalizada pelo órgão ou entidade no caso em concreto, exceto quando corresponder àquele previsto em instrumentos padronizados a serem utilizados na licitação, hipótese em que deverão ser descritas apenas as condições específicas da gestão do objeto pretendido?" },
            { "num": 28, "text": "O Termo de Referência estabelece critérios e prazos de medição e de pagamento?" },
            { "num": 29, "text": "O Termo de Referência define as sanções administrativas, exceto quando corresponderem àquelas previstas em instrumentos padronizados a serem utilizados na licitação, hipótese em que deverão ser descritas apenas as penalidades específicas relativas ao objeto pretendido, bem como os percentuais de multa a serem preenchidos nos referidos documentos padronizados?" },
            { "num": 30, "text": "O Termo de Referência estabelece direitos autorais e propriedade intelectual, bem como sigilo e segurança dos dados, se for o caso?" },
            { "num": 31, "text": "O Termo de Referência define, para os processos de contratação de serviços que envolvam bens ou serviços de informática e telecomunicação, os parâmetros e elementos descritivos definidos pela CTI?" },
            { "num": 32, "text": "O Termo de Referência estabelece demais condições necessárias à execução dos serviços ou fornecimento?" },
            { "num": 33, "text": "Foi anexada aos autos Pesquisa de Preços" },
            { "num": 34, "text": "A pesquisa de preços contém a descrição do objeto a ser contratado?" },
            { "num": 35, "text": "A pesquisa de preços identifica o(s) agente(s) responsável(is) pela pesquisa ou, se for o caso, a equipe de planejamento?" }
]

# --- Endpoint da Aplicação Flask ---
@app.route("/", methods=["POST"])
def analyze_pdf_endpoint():
    if gemini_model is None:
        app.logger.error("Serviço indisponível: Modelo Vertex AI não foi inicializado corretamente durante o startup.")
        return jsonify({"error": "Serviço indisponível: Falha na configuração do modelo de IA."}), 503

    if 'pdf_file' not in request.files:
        return jsonify({"error": "Nenhum arquivo PDF encontrado na requisição. Por favor, envie um arquivo com a chave 'pdf_file'."}), 400

    pdf_file = request.files['pdf_file']
    if not pdf_file or pdf_file.filename == '':
        return jsonify({"error": "Nome de arquivo inválido ou arquivo não presente."}), 400

    if not pdf_file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "O arquivo enviado não é um PDF."}), 400

    extracted_content = None
    if PDF_TEXT_EXTRACTION_TOOL == "PYMUPDF":
        extracted_content = extract_text_from_pdf_pymupdf(pdf_file)
        
        if isinstance(extracted_content, str) and extracted_content.startswith("Erro interno na extração de PDF:"):
            app.logger.error(f"Falha na extração de PDF: {extracted_content}")
            return jsonify({"error": extracted_content}), 500
    else:
        app.logger.error(f"Ferramenta de extração de PDF desconhecida: {PDF_TEXT_EXTRACTION_TOOL}")
        return jsonify({"error": "Ferramenta de extração de PDF não configurada ou inválida."}), 500

    if not extracted_content: 
        app.logger.warning("Não foi possível extrair texto do PDF ou o PDF está vazio/ilegível (após processamento).")
        return jsonify({"error": "Não foi possível extrair texto do PDF ou o PDF está vazio/ilegível."}), 400

    full_pdf_content = extracted_content
    app.logger.info(f"Texto do PDF extraído com sucesso ({len(full_pdf_content)} caracteres). Iniciando análise com LLM...")

    analysis_results = []
    
    # !!! MODIFICAÇÃO PARA TESTE: Limitar o número de perguntas processadas !!!
    perguntas_a_processar = 3  # <--- MUDE AQUI PARA 1, 3, 5, ou o número total (35) quando quiser testar completo
    
    app.logger.info(f"Iniciando processamento de até {perguntas_a_processar} quesitos.")

    for i, question_info in enumerate(checklist_questions):
        if i >= perguntas_a_processar:
            app.logger.info(f"Processamento de quesitos limitado a {perguntas_a_processar}. Pulando o restante.")
            break # Sai do loop após processar o número definido de perguntas

        quesito_num = question_info["num"]
        quesito_text = question_info["text"]
        app.logger.info(f"Processando quesito {quesito_num}: {quesito_text[:50]}...") # Log para ver progresso

        prompt = f"""
        Você é um assistente especializado em conformidade de licitações públicas no Brasil, com foco na Lei nº 14.133/2021 e no Decreto Estadual nº 21.872/2023.
        Analise o seguinte "Termo de Referência" (ou um trecho dele) e responda à pergunta abaixo.
        
        **Documento Completo do Termo de Referência:**
        ---
        {full_pdf_content[:30000]}
        ---

        **Pergunta do Checklist:**
        {quesito_text}"

        **Instruções de Resposta para a IA:**
        1.  Determine se a pergunta é "Sim", "Não" ou "Em parte", com base no conteúdo EXPLICITO do documento.
            * "Sim": Se a informação estiver claramente presente e alinhada ao quesito.
            * "Não": Se a informação estiver claramente ausente ou contraditória ao quesito.
            * "Em parte": Se houver alguma menção que toque no assunto, mas a informação não estiver completa, clara ou suficiente para atender plenamente ao quesito.
        2.  Extraia o(s) trecho(s) MAIS RELEVANTES do documento que justificam a sua resposta. Seja conciso.
        3.  Identifique se a "Lei nº 14.133/2021" ou o "Decreto Estadual nº 21.872/2023" são mencionados especificamente para o ponto em questão OU no documento em geral como FUNDAMENTAÇÃO.
        4.  Se houver outras referências relevantes (outras leis, normas, documentos citados além das duas principais), mencione-as.
        
        Forneça sua resposta OBRIGATORIAMENTE no seguinte formato JSON. NENHUM TEXTO ADICIONAL DEVE SER GERADO FORA DO JSON. CERTIFIQUE-SE DE QUE O JSON É VÁLIDO E PODE SER PARSEADO.

        ```json
        {{
            "RESPOSTA_AUTOMATICA": "Sim" | "Não" | "Em parte",
            "TRECHO_JUSTIFICATIVO": "Trecho(s) do documento que justificam a resposta.",
            "FUNDAMENTACAO_LEI_14133": "Mencionado | Não mencionado | Trecho relevante",
            "FUNDAMENTACAO_DECRETO_21872": "Mencionado | Não mencionado | Trecho relevante",
            "OUTRAS_REFERENCIAS": "Lista de outras referências encontradas ou 'Nenhuma'"
        }}
        ```
        """
        
        llm_result_json = {} 
        try:
            if gemini_model is None:
                # Este log é mais para o caso de algo muito estranho acontecer,
                # pois a validação no início da função analyze_pdf_endpoint já deveria ter pego isso.
                app.logger.error(f"Tentativa de usar gemini_model para o quesito {quesito_num}, mas não foi inicializado.")
                raise RuntimeError("Modelo Gemini não está disponível para gerar conteúdo.")

            llm_response_object = gemini_model.generate_content(
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )
            
            llm_result_json = json.loads(llm_response_object.text)
            
        except Exception as e:
            app.logger.error(f"Erro ao chamar LLM ou processar resposta para o quesito {quesito_num}: {e}")
            llm_result_json["RESPOSTA_AUTOMATICA"] = "Erro na IA"
            llm_result_json["TRECHO_JUSTIFICATIVO"] = f"**Erro na análise da IA para o quesito {quesito_num}:** {e}."
            llm_result_json["FUNDAMENTACAO_LEI_14133"] = "Erro na IA"
            llm_result_json["FUNDAMENTACAO_DECRETO_21872"] = "Erro na IA"
            llm_result_json["OUTRAS_REFERENCIAS"] = "Erro na IA"

        resposta_do_llm = llm_result_json.get("RESPOSTA_AUTOMATICA", "Não avaliado pela IA")
        trecho_justificativo = llm_result_json.get("TRECHO_JUSTIFICATIVO", "Nenhum trecho justificativo fornecido pela IA.")
        fundamentacao_lei = llm_result_json.get("FUNDAMENTACAO_LEI_14133", "Não verificada pela IA.")
        fundamentacao_decreto = llm_result_json.get("FUNDAMENTACAO_DECRETO_21872", "Não verificada pela IA.")
        outras_refs = llm_result_json.get("OUTRAS_REFERENCIAS", "N/A - Não especificado ou 'Nenhum' pelo LLM")

        analysis_results.append({
            "Nº do Quesito": quesito_num,
            "Texto do Quesito": quesito_text,
            "Quesito Condicionante": quesito_text,
            "RESPOSTA PERGUNTA CONDICIONANTE": resposta_do_llm,
            "FUNDAMENTACAO LEI 14.133/2021": fundamentacao_lei,
            "FUNDAMENTACAO DECRETO ESTADUAL 21.872/2023": fundamentacao_decreto,
            "OUTRAS_REFERENCIAS": outras_refs,
            "Trecho Justificativo (IA)": trecho_justificativo,
            "Atendimento do Quesito": resposta_do_llm,
            "Ocorrencia": "A ser determinada humanamente (Impropriedade Formal/Material)",
            "Recomendacao": "A ser determinada humanamente (se o quesito não for atendido)"
        })
    
    app.logger.info(f"Análise concluída para {len(analysis_results)} quesitos.")
    return jsonify(analysis_results)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
