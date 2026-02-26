"use strict";
// src/index.ts
// VERSÃO FINAL COMPLETA E CORRIGIDA
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliniaApi = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const bigquery_1 = require("@google-cloud/bigquery");
const vertexai_1 = require("@google-cloud/vertexai");
const uuid_1 = require("uuid");
const https_1 = require("firebase-functions/v2/https");
// --- CONFIGURAÇÃO ---
require('dotenv').config();
const app = (0, express_1.default)(); // Este é o nosso app principal de rotas
const GCLOUD_PROJECT = 'sharp-footing-475513-c7';
const BIGQUERY_DATASET = 'clinica_ia_dataset';
const BIGQUERY_LOCATION = 'us-central1';
// --- INICIALIZAÇÃO ---
admin.initializeApp();
const bigquery = new bigquery_1.BigQuery({ projectId: GCLOUD_PROJECT });
const vertex_ai = new vertexai_1.VertexAI({ project: GCLOUD_PROJECT, location: BIGQUERY_LOCATION });
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-2.5-pro', // Usando o modelo estável
    generation_config: { "max_output_tokens": 2048, "temperature": 0.2 },
});
// --- MIDDLEWARES ---
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
const userAuthMiddleware = async (req, res, next) => {
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
        }
        else {
            req.tenantId = rows[0].tenant_id;
        }
        return next();
    }
    catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).send('Unauthorized: Invalid token.');
    }
};
// --- ENDPOINTS DA API (ROTAS SEM O PREFIXO /api) ---
app.post('/novaTriagem', userAuthMiddleware, async (req, res) => {
    const { prompt } = req.body;
    const tenant_id = req.tenantId;
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
        if (ragResults.length === 0)
            return res.status(404).send({ error: "Nenhum protocolo relevante encontrado." });
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
        const result = await generativeModel.generateContent(finalPrompt);
        const iaResponseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        let iaResponseJson;
        try {
            const cleanedJsonString = iaResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            iaResponseJson = JSON.parse(cleanedJsonString);
        }
        catch (e) {
            return res.status(500).send({ error: "A IA retornou uma resposta em formato inválido." });
        }
        const triagem_id = (0, uuid_1.v4)();
        return res.status(200).send({ triagemId: triagem_id, respostaIa: iaResponseJson });
    }
    catch (error) {
        console.error('Erro em /novaTriagem:', error);
        return res.status(500).send({ error: 'Falha ao processar a nova triagem.' });
    }
});
// ROTA GET /getHistorico (ADICIONADA)
app.get('/getHistorico', userAuthMiddleware, async (req, res) => {
    const tenant_id = req.tenantId;
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
    }
    catch (error) {
        console.error('Erro em /getHistorico:', error);
        return res.status(500).send({ error: 'Falha ao buscar histórico.' });
    }
});
// ROTA GET /getProtocolos (ADICIONADA)
app.get('/getProtocolos', userAuthMiddleware, async (req, res) => {
    const tenant_id = req.tenantId;
    try {
        const query = `
            SELECT DISTINCT source_id 
            FROM \`${GCLOUD_PROJECT}.${BIGQUERY_DATASET}.clinical_content_chunks\`
            WHERE tenant_id = 'GLOBAL' OR tenant_id = @tenantId;
        `;
        const [rows] = await bigquery.query({ query, params: { tenantId: tenant_id }, location: BIGQUERY_LOCATION });
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error('Erro em /getProtocolos:', error);
        return res.status(500).send({ error: 'Falha ao buscar protocolos.' });
    }
});
// --- ROTEADOR PRINCIPAL E EXPORTAÇÃO ---
const root = (0, express_1.default)();
root.use('/api', app);
exports.cliniaApi = (0, https_1.onRequest)(root);
//# sourceMappingURL=index.js.map