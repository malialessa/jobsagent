// src/index.ts
// VERSÃO FINAL COMPLETA E CORRIGIDA

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI } from '@google-cloud/vertexai';
import { v4 as uuidv4 } from 'uuid';
import { onRequest } from 'firebase-functions/v2/https';

// --- CONFIGURAÇÃO ---
require('dotenv').config();
const app = express(); // Este é o nosso app principal de rotas

const GCLOUD_PROJECT = 'sharp-footing-475513-c7';
const BIGQUERY_DATASET = 'clinica_ia_dataset';
const BIGQUERY_LOCATION = 'us-central1';

// --- INICIALIZAÇÃO ---
admin.initializeApp();
const bigquery = new BigQuery({ projectId: GCLOUD_PROJECT });
const vertex_ai = new VertexAI({ project: GCLOUD_PROJECT, location: BIGQUERY_LOCATION });

const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-2.5-pro', // Usando o modelo estável
    generation_config: { "max_output_tokens": 2048, "temperature": 0.2 },
});

// --- MIDDLEWARES ---
app.use(cors({ origin: true }));
app.use(express.json());

interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken;
    tenantId?: string;
}

const userAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized: No token provided.');
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;

        const query = `SELECT tenant_id FROM \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.medicos\` WHERE user_id = @userId`;
        const [rows] = await bigquery.query({
            query: query,
            params: { userId: decodedToken.uid },
            location: BIGQUERY_LOCATION
        });

        if (rows.length === 0) {
            const tenant_id = 'clinic_test_01';
            await bigquery.dataset(BIGQUERY_DATASET).table('clinicas').insert([{ tenant_id, nome_clinica: 'Clínica de Teste' }]);
            await bigquery.dataset(BIGQUERY_DATASET).table('medicos').insert([{ user_id: decodedToken.uid, tenant_id, email: decodedToken.email }]);
            req.tenantId = tenant_id;
        } else {
            req.tenantId = rows[0].tenant_id;
        }
        return next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).send('Unauthorized: Invalid token.');
    }
};

// --- ENDPOINTS DA API (ROTAS SEM O PREFIXO /api) ---

app.post('/novaTriagem', userAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { prompt } = req.body;
    const tenant_id = req.tenantId!;

    if (!prompt) {
        return res.status(400).send({ error: 'O prompt com os sintomas é obrigatório.' });
    }

    try {
        // ESTA É A QUERY CORRETA E FINAL
        const ragQuery = `
            DECLARE query_embedding ARRAY<FLOAT64>;
            SET query_embedding = (
                SELECT ml_generate_embedding_result
                FROM ML.GENERATE_EMBEDDING(
                    MODEL \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.embedding_model\`,
                    (SELECT @user_question AS content, 'RETRIEVAL_QUERY' AS task_type)
                )
            );
            SELECT
                base.source_id AS source_id,
                base.content AS content
            FROM
                VECTOR_SEARCH(
                    TABLE \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.clinical_content_chunks\`,
                    'embedding',
                    (SELECT query_embedding),
                    top_k => 3,
                    distance_type => 'COSINE'
                )
            WHERE base.tenant_id = 'GLOBAL' OR base.tenant_id = @tenant_id;
        `;
        
        const [ragResults] = await bigquery.query({
            query: ragQuery,
            params: { user_question: prompt, tenant_id: tenant_id },
            location: BIGQUERY_LOCATION
        });

        if (ragResults.length === 0) return res.status(404).send({ error: "Nenhum protocolo relevante encontrado." });

        const context = ragResults.map(r => `Fonte: ${r.source_id}\nConteúdo: ${r.content}`).join('\n\n---\n\n');
        const finalPrompt = `
            Você é um assistente de IA para médicos. Sua função é analisar os sintomas e, baseado EXCLUSIVAMENTE nos protocolos abaixo, gerar hipóteses.
            Responda em JSON: {"hipoteses": [{"hipotese": "nome", "justificativa": "explicação", "fontes": ["fonte.pdf"]}], "resumo_triagem": "resumo", "alerta_urgencia": "baixa|media|alta"}.
            --- PROTOCOLOS ---
            ${context}
            --- SINTOMAS ---
            ${prompt}
            Gere a resposta JSON:
        `;
        
        // ADICIONADO: Log para vermos o que estamos enviando para a IA
        console.log("Enviando prompt para o Gemini...");

        const result = await generativeModel.generateContent(finalPrompt);
        const iaResponseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || ''; // Mudei para string vazia
        
        let iaResponseJson;
        try {
            if (!iaResponseText) {
                throw new Error("Resposta da IA está vazia.");
            }
            const cleanedJsonString = iaResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            iaResponseJson = JSON.parse(cleanedJsonString);
        } catch (e) {
            // ADICIONADO: O log mais importante de todos!
            console.error("### ERRO DE PARSE DO JSON DA IA ###");
            console.error("A IA retornou o seguinte texto, que não é um JSON válido:");
            console.error(iaResponseText);
            console.error("####################################");
            return res.status(500).send({ error: "A IA retornou uma resposta em formato inválido." });
        }
        const triagem_id = uuidv4();
        return res.status(200).send({ triagemId: triagem_id, respostaIa: iaResponseJson });

    } catch (error) {
        console.error('Erro em /novaTriagem:', error);
        return res.status(500).send({ error: 'Falha ao processar a nova triagem.' });
    }
});



// ROTA GET /getHistorico (ADICIONADA)
app.get('/getHistorico', userAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const tenant_id = req.tenantId!;
    try {
        const query = `
            SELECT triagem_id, data_triagem, status, prompt_medico 
            FROM \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.triagens\`
            WHERE tenant_id = @tenantId
            ORDER BY data_triagem DESC
            LIMIT 20;
        `;
        const [rows] = await bigquery.query({ query, params: { tenantId: tenant_id }, location: BIGQUERY_LOCATION });
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Erro em /getHistorico:', error);
        return res.status(500).send({ error: 'Falha ao buscar histórico.' });
    }
});

// ROTA GET /getProtocolos (ADICIONADA)
app.get('/getProtocolos', userAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const tenant_id = req.tenantId!;
    try {
        const query = `
            SELECT DISTINCT source_id 
            FROM \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.clinical_content_chunks\`
            WHERE tenant_id = 'GLOBAL' OR tenant_id = @tenantId;
        `;
        const [rows] = await bigquery.query({ query, params: { tenantId: tenant_id }, location: BIGQUERY_LOCATION });
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Erro em /getProtocolos:', error);
        return res.status(500).send({ error: 'Falha ao buscar protocolos.' });
    }
});

// --- ROTEADOR PRINCIPAL E EXPORTAÇÃO ---
const root = express();
root.use('/api', app);
export const cliniaApi = onRequest(root);