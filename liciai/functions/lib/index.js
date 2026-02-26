"use strict";
// Copie e cole todo este bloco no seu arquivo functions/src/index.ts
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
exports.processarDocumentoConhecimento = exports.coletarLicitacoesAbertas = exports.coletarPncp = exports.criarRegistroClienteNovo = exports.api = void 0;
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-functions/v2/storage");
const logger = __importStar(require("firebase-functions/logger"));
const bigquery_1 = require("@google-cloud/bigquery");
const axios_1 = __importDefault(require("axios"));
const auth = __importStar(require("firebase-functions/v2/identity"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const storage_2 = require("firebase-admin/storage");
const tasks_1 = require("@google-cloud/tasks");
const vertexai_1 = require("@google-cloud/vertexai");
const aiplatform_1 = require("@google-cloud/aiplatform");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
// INICIALIZAÇÃO DO FIREBASE ADMIN SDK
(0, app_1.initializeApp)();
// CONFIGURAÇÃO GLOBAL
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "sharp-footing-475513-c7";
const PROJECT_NUMBER = process.env.PROJECT_NUMBER;
const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION || "us-east1";
const BIGQUERY_LOCATION = "US";
const DATASET_STG = "stg";
const DATASET_LOG = "log";
const TABLE_ERROS = "erros_aplicacao";
const TABLE_CONTRATACOES_RAW = "pncp_contratacoes_raw";
const DATASET_CORE = "core";
const DATASET_DIM = "dim";
const VIEW_OPORTUNIDADES = "v_oportunidades_15d";
const TABLE_FUNCTION_SCORED = "fn_get_scored_opportunities";
const PNCP_API_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";
const PNCP_API_URL_ABERTAS = "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta";
const bq = new bigquery_1.BigQuery({ projectId: GCP_PROJECT_ID });
const CORS_ORIGIN = "https://liciai1.web.app";
const CLOUD_TASKS_LOCATION = FUNCTIONS_REGION;
const CLOUD_TASKS_QUEUE_NAME = "pncp-backfill-queue";
const ADMIN_UIDS = ["2bfsnZTOaWeiK1xaQQPljverQNn2"];
const EMBEDDING_REGION = process.env.EMBEDDING_REGION || "us-central1";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
(0, v2_1.setGlobalOptions)({ region: FUNCTIONS_REGION });
// CONFIGURAÇÃO DA BASE DE CONHECIMENTO (VECTOR SEARCH)
const KNOWLEDGE_BUCKET = "liciai-knowledge-base";
const VECTOR_ENDPOINT_ID = process.env.VECTOR_ENDPOINT_ID;
const VECTOR_DEPLOYED_INDEX_ID = process.env.VECTOR_DEPLOYED_INDEX_ID;
const VDB_HOST = (process.env.VDB_HOST || "").trim();
const VECTOR_INDEX_ID = process.env.VECTOR_INDEX_ID || "888761637010407424";
const VECTOR_ENDPOINT_PATH = `projects/${PROJECT_NUMBER}/locations/${FUNCTIONS_REGION}/indexEndpoints/${VECTOR_ENDPOINT_ID}`;
const VECTOR_INDEX_PATH = `projects/${PROJECT_NUMBER}/locations/${FUNCTIONS_REGION}/indexes/${VECTOR_INDEX_ID}`;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
async function executeWithRetry(fn, maxRetries = 3, initialDelayMs = 1000) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const msg = String(err?.message || "");
            const code = String(err?.code || err?.status || "");
            const is429 = msg.includes("429") || code === "429" || code === "RESOURCE_EXHAUSTED";
            if (!is429 || attempt === maxRetries - 1)
                break;
            const backoff = Math.pow(2, attempt) * initialDelayMs;
            const jitter = backoff * 0.2 * Math.random();
            const delay = Math.round(backoff + jitter);
            logger.warn(`[Retry] 429 detectado. Tentando novamente em ${delay}ms... (Tentativa ${attempt + 1}/${maxRetries})`);
            await sleep(delay);
        }
    }
    throw lastError;
}
// --- FUNÇÕES HELPER ---
// INÍCIO DA CORREÇÃO DE 'logErrorToBigQuery'
async function logErrorToBigQuery(errorData) {
    try {
        const nowISO = new Date().toISOString();
        const logEntry = {
            ...errorData,
            error_id: errorData.error_id || (0, crypto_1.randomUUID)(),
            status: errorData.status || 'NOVO',
            last_modified: errorData.last_modified || nowISO, // <<< aqui
        };
        await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([logEntry]);
    }
    catch (error) {
        logger.error("Falha CRÍTICA ao inserir log de erro no BigQuery:", {
            originalError: errorData,
            loggingError: error,
        });
    }
}
// FIM DA CORREÇÃO DE 'logErrorToBigQuery'
async function insertToBigQuery(rows) {
    if (rows.length === 0) {
        return;
    }
    try {
        await bq.dataset(DATASET_STG).table(TABLE_CONTRATACOES_RAW).insert(rows);
        logger.info(`Inseridas ${rows.length} linhas na tabela ${TABLE_CONTRATACOES_RAW}.`);
    }
    catch (error) {
        logger.error(`Erro ao inserir dados no BigQuery:`, { message: error.message, errors: error.errors });
        if (error.errors && error.errors.length > 0) {
            error.errors.forEach((err) => {
                logger.error("Detalhes do erro BQ:", err);
            });
        }
        throw new Error("Falha ao inserir dados no BigQuery.");
    }
}
// =============================================================================
// --- INÍCIO DA CONFIGURAÇÃO DO SERVIDOR EXPRESS ---
// =============================================================================
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: CORS_ORIGIN, credentials: true }));
app.use(express_1.default.json());
const userAuthMiddleware = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Acesso negado. Token não fornecido.' });
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(idToken);
        req.user = decodedToken;
        return next();
    }
    catch (error) {
        logger.error("Falha na verificação do token de usuário", { error });
        return res.status(403).json({ message: 'Acesso negado. Token inválido.' });
    }
};
const adminAuthMiddleware = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Acesso negado. Token não fornecido.' });
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(idToken);
        if (!ADMIN_UIDS.includes(decodedToken.uid)) {
            return res.status(403).json({ message: 'Acesso negado. Rota apenas para administradores.' });
        }
        req.user = decodedToken;
        return next();
    }
    catch (error) {
        logger.error("Falha na verificação do token de admin", { error });
        return res.status(403).json({ message: 'Acesso negado. Token inválido.' });
    }
};
// =============================================================================
// --- ROTAS DO EXPRESS (PÚBLICAS) ---
// =============================================================================
app.get('/getOportunidades', async (req, res) => {
    try {
        const uf = req.query.uf || null;
        const q = req.query.q || null;
        const limit = parseInt(req.query.limit) || 21;
        const offset = parseInt(req.query.offset) || 0;
        let query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${VIEW_OPORTUNIDADES}\``;
        const whereClauses = [];
        const queryParams = {};
        if (uf && uf.trim() !== "") {
            whereClauses.push("uf = @uf");
            queryParams.uf = uf.trim().toUpperCase();
        }
        if (q && q.trim() !== "") {
            whereClauses.push("LOWER(objeto_compra) LIKE LOWER(@q)");
            queryParams.q = `%${q.trim()}%`;
        }
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        query += " ORDER BY data_encerramento_proposta ASC LIMIT @limit OFFSET @offset;";
        queryParams.limit = limit;
        queryParams.offset = offset;
        const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: queryParams });
        const nextOffset = rows.length === limit ? offset + limit : null;
        res.status(200).json({ items: rows, nextOffset });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "getOportunidades",
            cliente_id: "public_endpoint",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestQuery: req.query })
        });
        logger.error("Erro ao consultar o BigQuery em getOportunidades:", error);
        res.status(500).send("Erro interno ao buscar oportunidades. Nossa equipe já foi notificada.");
    }
});
app.post('/logError', async (req, res) => {
    let clienteId = "frontend_anonimo";
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const idToken = req.headers.authorization.split('Bearer ')[1];
            try {
                const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(idToken);
                clienteId = decodedToken.uid;
            }
            catch (error) {
                logger.warn("Token inválido recebido em /logError, logando como anônimo.", { error });
            }
        }
        const { ambiente, funcao_ou_componente, mensagem, stack_trace, contexto } = req.body;
        if (!mensagem) {
            logger.warn("Requisição de log de erro recebida sem o campo 'mensagem'.", { body: req.body });
            return res.status(400).send({ message: "Campo 'mensagem' é obrigatório." });
        }
        const errorData = {
            timestamp: new Date().toISOString(),
            severidade: "FRONTEND_ERROR",
            ambiente: ambiente || 'frontend',
            funcao_ou_componente: funcao_ou_componente || 'unknown_component',
            cliente_id: clienteId,
            mensagem: mensagem,
            stack_trace: stack_trace || 'N/A',
            contexto: contexto ? JSON.stringify(contexto) : null,
        };
        await logErrorToBigQuery(errorData);
        return res.status(202).send({ message: "Erro registrado com sucesso." });
    }
    catch (error) {
        logger.error("ERRO CRÍTICO no endpoint /logError:", {
            errorMessage: error.message,
            stack: error.stack,
        });
        return res.status(500).send({ message: "Erro interno no servidor de log." });
    }
});
// =============================================================================
// --- ROTAS DO EXPRESS (AUTENTICADAS PARA USUÁRIOS) ---
// =============================================================================
app.get('/getScoredOportunidades', userAuthMiddleware, async (req, res) => {
    let clienteId = undefined;
    try {
        clienteId = req.user.uid;
        const uf = req.query.uf || null;
        const q = req.query.q || null;
        const limit = parseInt(req.query.limit) || 21;
        const offset = parseInt(req.query.offset) || 0;
        let query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${TABLE_FUNCTION_SCORED}\`(@cliente_id)`;
        const whereClauses = [];
        const queryParams = { cliente_id: clienteId };
        if (uf && uf.trim() !== "") {
            whereClauses.push("uf = @uf");
            queryParams.uf = uf.trim().toUpperCase();
        }
        if (q && q.trim() !== "") {
            whereClauses.push("LOWER(objeto_compra) LIKE LOWER(@q)");
            queryParams.q = `%${q.trim()}%`;
        }
        if (whereClauses.length > 0) {
            query = `SELECT * FROM (${query}) AS scored_ops WHERE ${whereClauses.join(" AND ")}`;
        }
        query += " ORDER BY score_oportunidade DESC LIMIT @limit OFFSET @offset;";
        queryParams.limit = limit;
        queryParams.offset = offset;
        const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: queryParams });
        const nextOffset = rows.length === limit ? offset + limit : null;
        res.status(200).json({ items: rows, nextOffset });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "getScoredOportunidades",
            cliente_id: clienteId || "token_invalido_ou_nao_extraido",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestQuery: req.query, bqError: error.errors })
        });
        logger.error("Erro CRÍTICO em getScoredOportunidades:", { message: error.message });
        res.status(500).json({ message: 'Erro interno ao processar o ranking. Nossa equipe já foi notificada.' });
    }
});
app.get('/getClienteConfiguracoes', userAuthMiddleware, async (req, res) => {
    let clienteId;
    try {
        clienteId = req.user.uid;
        const query = `
            SELECT palavra_chave, peso
            FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\`
            WHERE cliente_id = @cliente_id
            ORDER BY peso DESC
        `;
        const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: { cliente_id: clienteId } });
        res.status(200).json({ palavrasChave: rows });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "getClienteConfiguracoes",
            cliente_id: clienteId || "token_invalido_ou_nao_extraido",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: null
        });
        logger.error("Erro em getClienteConfiguracoes:", error);
        res.status(500).json({ message: 'Erro interno ao buscar configurações. Nossa equipe já foi notificada.' });
    }
});
app.post('/addPalavraChave', userAuthMiddleware, async (req, res) => {
    let clienteId;
    try {
        clienteId = req.user.uid;
        const { palavraChave, peso } = req.body;
        if (!palavraChave) {
            res.status(400).json({ message: "Parâmetro 'palavraChave' é obrigatório." });
            return;
        }
        const finalPeso = typeof peso === 'number' && !isNaN(peso) ? peso : 1;
        const query = `
            MERGE \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\` T
            USING (SELECT @clienteId AS cliente_id, @palavraChave AS palavra_chave) S
            ON T.cliente_id = S.cliente_id AND T.palavra_chave = S.palavra_chave
            WHEN MATCHED THEN
                UPDATE SET peso = @finalPeso, data_ultima_modificacao = CURRENT_TIMESTAMP()
            WHEN NOT MATCHED THEN
                INSERT (cliente_id, palavra_chave, peso, data_criacao, data_ultima_modificacao)
                VALUES(@clienteId, @palavraChave, @finalPeso, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
        `;
        await bq.query({ query, params: { clienteId, palavraChave: palavraChave.toLowerCase(), finalPeso } });
        res.status(200).json({ success: true, message: `Palavra-chave '${palavraChave}' adicionada/atualizada com peso ${finalPeso}.` });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "addPalavraChave",
            cliente_id: clienteId || "token_invalido_ou_nao_extraido",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestBody: req.body })
        });
        logger.error("Erro em addPalavraChave:", error);
        res.status(500).json({ message: 'Erro interno ao salvar palavra-chave. Nossa equipe já foi notificada.' });
    }
});
app.post('/removePalavraChave', userAuthMiddleware, async (req, res) => {
    let clienteId;
    try {
        clienteId = req.user.uid;
        const { palavraChave } = req.body;
        if (!palavraChave) {
            res.status(400).json({ message: "Parâmetro 'palavraChave' é obrigatório." });
            return;
        }
        const query = `
            DELETE FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\`
            WHERE cliente_id = @clienteId AND palavra_chave = @palavraChave
        `;
        await bq.query({ query, params: { clienteId, palavraChave: palavraChave.toLowerCase() } });
        res.status(200).json({ success: true, message: `Palavra-chave '${palavraChave}' removida.` });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "removePalavraChave",
            cliente_id: clienteId || "token_invalido_ou_nao_extraido",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestBody: req.body })
        });
        logger.error("Erro em removePalavraChave:", error);
        res.status(500).json({ message: 'Erro interno ao remover palavra-chave. Nossa equipe já foi notificada.' });
    }
});
app.get('/getDetalhesOportunidade', userAuthMiddleware, async (req, res) => {
    let clienteId;
    try {
        clienteId = req.user.uid;
        const idPncp = req.query.id;
        if (!idPncp) {
            res.status(400).json({ message: "ID da oportunidade é obrigatório (parâmetro 'id')." });
            return;
        }
        const query = `
            SELECT payload
            FROM \`${GCP_PROJECT_ID}.${DATASET_STG}.${TABLE_CONTRATACOES_RAW}\`
            WHERE JSON_EXTRACT_SCALAR(payload, '$.numeroControlePNCP') = @idPncp
            LIMIT 1
        `;
        const [rows] = await bq.query({ query, params: { idPncp } });
        if (rows.length === 0) {
            res.status(404).json({ message: "Oportunidade não encontrada." });
            return;
        }
        res.status(200).json(JSON.parse(rows[0].payload));
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "getDetalhesOportunidade",
            cliente_id: clienteId || "token_invalido_ou_nao_extraido",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestQuery: req.query })
        });
        logger.error("Erro em getDetalhesOportunidade:", error);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes da oportunidade. Nossa equipe já foi notificada.' });
    }
});
app.post('/iniciarBackfill', userAuthMiddleware, async (req, res) => {
    try {
        const dataInicioStr = req.body.inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const dataFimStr = req.body.fim || new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
        const tasksClient = new tasks_1.CloudTasksClient();
        const queuePath = tasksClient.queuePath(GCP_PROJECT_ID, CLOUD_TASKS_LOCATION, CLOUD_TASKS_QUEUE_NAME);
        const workerUrl = `https://${FUNCTIONS_REGION}-${GCP_PROJECT_ID}.cloudfunctions.net/coletarPncp`;
        const tasks = [];
        let currentDate = new Date(dataInicioStr);
        const endDate = new Date(dataFimStr);
        logger.info(`Iniciando enfileiramento de tarefas de ${dataInicioStr} até ${dataFimStr} para ${ufs.length} UFs.`);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().slice(0, 10);
            for (const uf of ufs) {
                const urlWithParams = `${workerUrl}?uf=${uf}&data=${dateString}`;
                const task = { httpRequest: { httpMethod: 'GET', url: urlWithParams } };
                tasks.push(tasksClient.createTask({ parent: queuePath, task }));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        await Promise.all(tasks);
        const successMessage = `${tasks.length} tarefas de coleta foram enfileiradas com sucesso.`;
        logger.info(successMessage);
        res.status(200).send(successMessage);
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "iniciarBackfill",
            cliente_id: req.user?.uid || "system/admin",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestBody: req.body })
        });
        logger.error("Erro ao iniciar o backfill:", error);
        res.status(500).send("Falha ao enfileirar tarefas de backfill.");
    }
});
// =============================================================================
// --- ROTAS DO EXPRESS (AUTENTICADAS APENAS PARA ADMINISTRADORES) ---
// =============================================================================
app.get('/getProjectSchema', adminAuthMiddleware, async (req, res) => {
    try {
        const datasetsToScan = ['core', 'dim', 'log', 'stg'];
        const schemaPromises = datasetsToScan.map(async (datasetId) => {
            try {
                const [tables] = await bq.dataset(datasetId).getTables();
                const tablePromises = tables.map(async (table) => {
                    const [metadata] = await table.getMetadata();
                    return {
                        id: table.id,
                        type: metadata.type,
                        description: metadata.description || null,
                        schema: metadata.schema.fields.map((field) => ({
                            name: field.name,
                            type: field.type,
                            mode: field.mode || 'NULLABLE',
                            description: field.description || null,
                        })),
                    };
                });
                const tablesData = await Promise.all(tablePromises);
                return {
                    id: datasetId,
                    tables: tablesData,
                };
            }
            catch (e) {
                logger.error(`Não foi possível escanear o dataset ${datasetId}`, e.message);
                return { id: datasetId, tables: [], error: `Dataset não encontrado ou sem permissão.` };
            }
        });
        const projectSchema = await Promise.all(schemaPromises);
        res.status(200).json({
            projectId: GCP_PROJECT_ID,
            generatedAt: new Date().toISOString(),
            bigquerySchema: projectSchema
        });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "getProjectSchema",
            cliente_id: req.user?.uid || "admin_call",
            mensagem: error.message,
            stack_trace: error.stack,
        });
        res.status(500).json({ message: "Erro ao gerar o schema do projeto." });
    }
});
// INÍCIO DA CORREÇÃO DE 'getErros'
app.get('/getErros', adminAuthMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status?.toUpperCase();
        const params = { limit, offset };
        let statusFilter = "";
        if (status && ['NOVO', 'EM_ANALISE', 'RESOLVIDO'].includes(status)) {
            statusFilter = "AND status = @status";
            params.status = status;
        }
        const query = `
      WITH t AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY error_id
            ORDER BY COALESCE(last_modified, timestamp) DESC
          ) AS rn
        FROM \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
        WHERE error_id IS NOT NULL
      )
      SELECT * EXCEPT(rn)
      FROM t
      WHERE rn = 1
      ${statusFilter}
      ORDER BY COALESCE(last_modified, timestamp) DESC
      LIMIT @limit OFFSET @offset
    `;
        const [rows] = await bq.query({ query, params, location: BIGQUERY_LOCATION });
        const nextOffset = rows.length === limit ? offset + limit : null;
        return res.status(200).json({ items: rows, nextOffset });
    }
    catch (error) {
        logger.error("ERRO CRÍTICO na rota getErros", { message: error.message, stack: error.stack, context: { query: req.query } });
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "CRITICAL",
            ambiente: "backend",
            funcao_ou_componente: "getErros",
            cliente_id: req.user?.uid || "admin_call_failed",
            mensagem: `Falha na consulta ao BigQuery: ${error.message}`,
            stack_trace: error.stack,
        });
        return res.status(500).json({ message: "Erro ao buscar logs de erro." });
    }
});
function readDirectoryTree(dirPath, rootPath) {
    const items = [];
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            // ignore padrão
            if (['node_modules', '.git', '.DS_Store', '.firebase', '.vscode'].includes(file))
                continue;
            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);
            const relativePath = path.relative(rootPath, fullPath);
            const item = { name: file, path: relativePath };
            if (stats.isDirectory()) {
                item.type = 'folder';
                item.children = readDirectoryTree(fullPath, rootPath);
            }
            else {
                item.type = 'file';
            }
            items.push(item);
        }
    }
    catch (error) {
        logger.error(`Erro ao ler o diretório ${dirPath}:`, error.message);
        return [{ name: `Erro ao ler: ${dirPath}`, type: 'error' }];
    }
    // pastas primeiro, depois arquivos; ordenados por nome
    return items.sort((a, b) => {
        if (a.type === b.type)
            return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
}
function tryReadStaticStructure() {
    try {
        const jsonPath = path.join(__dirname, "project-structure.json");
        if (fs.existsSync(jsonPath)) {
            const raw = fs.readFileSync(jsonPath, "utf8");
            return JSON.parse(raw);
        }
        return null;
    }
    catch (error) {
        logger.error("Erro ao ler project-structure.json estático:", error);
        return null;
    }
}
app.get('/getProjectStructure', adminAuthMiddleware, async (req, res) => {
    try {
        const staticPayload = tryReadStaticStructure();
        if (staticPayload && staticPayload.structure) {
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(staticPayload);
            return;
        }
        logger.warn("project-structure.json não encontrado. Varrendo o FS (comportamento de desenvolvimento).");
        const backendRootPath = path.join(__dirname, '..');
        const firebaseProjectRoot = path.join(backendRootPath, '..');
        const frontendRootPath = path.join(firebaseProjectRoot, 'public');
        const backendStructure = readDirectoryTree(backendRootPath, backendRootPath);
        const frontendStructure = fs.existsSync(frontendRootPath)
            ? readDirectoryTree(frontendRootPath, frontendRootPath)
            : [{ name: "A pasta 'public' não foi encontrada no servidor.", type: 'info' }];
        res.status(200).json({
            generatedAt: new Date().toISOString(),
            structure: {
                backend: backendStructure,
                frontend: frontendStructure
            }
        });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(), severidade: "ERROR", ambiente: "backend",
            funcao_ou_componente: "getProjectStructure", cliente_id: req.user?.uid || "admin_call",
            mensagem: error.message, stack_trace: error.stack,
        });
        res.status(500).json({ message: "Erro ao gerar a estrutura do projeto. Rode 'npm run build:structure' e faça deploy." });
    }
});
app.post('/analisarEstruturaComIA', adminAuthMiddleware, async (req, res) => {
    try {
        const { structure } = req.body;
        if (!structure) {
            return res.status(400).json({ message: "Objeto 'structure' é obrigatório." });
        }
        const vertex_ai = new vertexai_1.VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION });
        const model = vertex_ai.getGenerativeModel({ model: "gemini-2.5-pro" });
        const prompt = `
            Você é um arquiteto de software sênior especialista em aplicações serverless na Google Cloud.
            Analise a seguinte estrutura de projeto, que inclui o conteúdo de arquivos-chave.

            Estrutura e Conteúdo:
            \`\`\`json
            ${JSON.stringify(structure, null, 2)}
            \`\`\`

            Sua tarefa é retornar um objeto JSON com três chaves: "summary", "keyPoints" e "nextSteps".
            1.  Na chave "summary", forneça um resumo técnico denso (2-3 frases) sobre a stack e o propósito da aplicação, inferindo a partir das dependências e do código.
            2.  Na chave "keyPoints", crie um array de strings com 3 a 5 observações críticas sobre a arquitetura atual (pontos fortes, fracos ou riscos).
            3.  Na chave "nextSteps", crie um array de strings com 2 a 3 sugestões acionáveis para refatoração ou melhoria imediata do projeto.

            Seja conciso, técnico e direto ao ponto. Retorne APENAS o objeto JSON.
        `;
        const result = await executeWithRetry(() => model.generateContent(prompt), 3, 2000 // 3 tentativas, 2s inicial
        );
        const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!responseText)
            throw new Error("A IA retornou uma resposta com texto vazio.");
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error("Nenhum objeto JSON encontrado na resposta da IA.");
        return res.status(200).json(JSON.parse(jsonMatch[0]));
    }
    catch (error) {
        logger.error("Erro em analisarEstruturaComIA", { message: error.message });
        return res.status(500).json({ message: "A IA não conseguiu analisar a estrutura." });
    }
});
app.post('/gerarErroDeTeste', adminAuthMiddleware, async (req, res) => {
    let clienteId = "admin_test";
    try {
        clienteId = req.user.uid;
        const mockError = {
            timestamp: new Date().toISOString(),
            severidade: "TEST",
            ambiente: "backend",
            funcao_ou_componente: "gerarErroDeTeste",
            cliente_id: clienteId,
            mensagem: "Este é um erro de teste gerado intencionalmente para o Dashcode.",
            stack_trace: "at Object.gerarErro (fake_file.js:10:15)\nat process.run (another_fake_file.js:123:5)",
            contexto: JSON.stringify({
                info: "Este erro foi acionado pelo botão 'Gerar Erro de Teste'.",
                timestampUTC: Date.now(),
            }),
        };
        await logErrorToBigQuery(mockError);
        logger.info(`Erro de teste gerado com sucesso por ${clienteId}`);
        res.status(200).json({ message: "Erro de teste gerado e inserido no BigQuery com sucesso!" });
    }
    catch (error) {
        logger.error("Falha na função gerarErroDeTeste", { error: error.message, clienteId });
        res.status(500).json({ message: "Falha interna ao gerar o erro de teste." });
    }
});
app.post('/updateErrorStatus', adminAuthMiddleware, async (req, res) => {
    try {
        const { errorId, newStatus } = req.body;
        if (!errorId || !newStatus) {
            return res.status(400).json({ message: "Parâmetros 'errorId' e 'newStatus' são obrigatórios." });
        }
        const validStatuses = ['NOVO', 'EM_ANALISE', 'RESOLVIDO'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ message: "Status inválido." });
        }
        const query = `
            UPDATE \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
            SET status = @newStatus
            WHERE error_id = @errorId
        `;
        await bq.query({ query, params: { newStatus, errorId } });
        return res.status(200).json({ success: true, message: `Status do erro ${errorId} atualizado para ${newStatus}.` });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "updateErrorStatus",
            cliente_id: req.user?.uid || "admin_call",
            mensagem: `Falha ao atualizar status no BigQuery: ${error.message}`,
            stack_trace: error.stack,
            contexto: JSON.stringify({
                requestBody: req.body,
                bqError: error.errors,
                suggestion: "Este erro geralmente ocorre ao tentar modificar dados que acabaram de ser inseridos (streaming buffer). Tente novamente em alguns minutos."
            })
        });
        logger.error("Erro em updateErrorStatus:", error);
        return res.status(500).json({ message: 'Erro interno ao atualizar status. Nossa equipe já foi notificada.' });
    }
});
app.post('/deleteError', adminAuthMiddleware, async (req, res) => {
    try {
        const { errorId } = req.body;
        if (!errorId) {
            return res.status(400).json({ message: "Parâmetro 'errorId' é obrigatório." });
        }
        const query = `
            DELETE FROM \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
            WHERE error_id = @errorId
        `;
        await bq.query({ query, params: { errorId } });
        return res.status(200).json({ success: true, message: `Erro ${errorId} deletado.` });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "deleteError",
            cliente_id: req.user?.uid || "admin_call",
            mensagem: `Falha ao deletar erro no BigQuery: ${error.message}`,
            stack_trace: error.stack,
            contexto: JSON.stringify({
                requestBody: req.body,
                bqError: error.errors,
                suggestion: "Este erro geralmente ocorre ao tentar modificar dados que acabaram de ser inseridos (streaming buffer). Tente novamente em alguns minutos."
            })
        });
        logger.error("Erro em deleteError:", error);
        return res.status(500).json({ message: 'Erro interno ao deletar erro.' });
    }
});
app.post('/updateErrorStatusBulk', adminAuthMiddleware, async (req, res) => {
    try {
        const { errorIds, newStatus } = req.body;
        if (!Array.isArray(errorIds) || errorIds.length === 0 || !newStatus) {
            return res.status(400).json({ message: "Parâmetros 'errorIds' (array) e 'newStatus' são obrigatórios." });
        }
        const validStatuses = ['NOVO', 'EM_ANALISE', 'RESOLVIDO'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ message: "Status inválido." });
        }
        const nowISO = new Date().toISOString();
        const rows = errorIds.map((id) => ({
            error_id: id,
            status: newStatus,
            timestamp: nowISO, // ajuda na auditoria/ordenção
            last_modified: nowISO
            // demais campos são NULLABLE no schema
        }));
        await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert(rows);
        return res.status(200).json({ success: true, message: `${errorIds.length} erros marcados como ${newStatus}.` });
    }
    catch (error) {
        // Se algo muito recente cair no buffer, INSERT continua permitido (raríssimo falhar).
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "updateErrorStatusBulk",
            cliente_id: req.user?.uid || "admin_call",
            mensagem: `Falha em updateErrorStatusBulk: ${error.message}`,
            stack_trace: error.stack,
            contexto: JSON.stringify({ requestBody: req.body, bqError: error.errors })
        });
        return res.status(500).json({ message: 'Erro interno ao atualizar status em massa.' });
    }
});
app.post('/deleteErrorBulk', adminAuthMiddleware, async (req, res) => {
    try {
        const { errorIds } = req.body;
        if (!Array.isArray(errorIds) || errorIds.length === 0) {
            return res.status(400).json({ message: "Parâmetro 'errorIds' (array) é obrigatório." });
        }
        const query = `
            DELETE FROM \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
            WHERE error_id IN UNNEST(@errorIds)
        `;
        await bq.query({
            query,
            params: { errorIds }
        });
        return res.status(200).json({ success: true, message: `${errorIds.length} erros deletados.` });
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "deleteErrorBulk",
            cliente_id: req.user?.uid || "admin_call",
            mensagem: `Falha ao deletar erros em massa no BigQuery: ${error.message}`,
            stack_trace: error.stack,
            contexto: JSON.stringify({
                requestBody: req.body,
                bqError: error.errors,
                suggestion: "Este erro geralmente ocorre ao tentar modificar dados que acabaram de ser inseridos (streaming buffer). Tente novamente em alguns minutos."
            })
        });
        logger.error("Erro em deleteErrorBulk:", error);
        return res.status(500).json({ message: 'Erro interno ao deletar erros em massa.' });
    }
});
app.post('/assistenteSprint', adminAuthMiddleware, async (req, res) => {
    let userPrompt; // Definido aqui para estar no escopo do catch
    try {
        const requiredEnvVars = [
            'PROJECT_NUMBER',
            'VECTOR_ENDPOINT_ID',
            'VECTOR_DEPLOYED_INDEX_ID',
        ];
        const missingVars = requiredEnvVars.filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            const message = `Variáveis de ambiente ausentes: ${missingVars.join(', ')}. O assistente não pode funcionar.`;
            logger.error(message);
            await logErrorToBigQuery({
                timestamp: new Date().toISOString(),
                severidade: "CRITICAL",
                ambiente: "backend",
                funcao_ou_componente: "assistenteSprint-Validation",
                cliente_id: req.user?.uid || "admin_call",
                mensagem: message,
                stack_trace: null,
                contexto: JSON.stringify(process.env, (key, value) => key.includes('API_KEY') ? '***' : value)
            });
            return res.status(500).json({ message: "Erro de configuração do servidor. O administrador foi notificado." });
        }
        logger.info("Variáveis de ambiente para assistenteSprint:", {
            PROJECT_NUMBER: process.env.PROJECT_NUMBER,
            VECTOR_ENDPOINT_ID: process.env.VECTOR_ENDPOINT_ID,
            VECTOR_DEPLOYED_INDEX_ID: process.env.VECTOR_DEPLOYED_INDEX_ID,
            VDB_HOST: process.env.VDB_HOST || "(auto-discover)",
            EMBEDDING_REGION: process.env.EMBEDDING_REGION,
            EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
        });
        const { projectContext } = req.body;
        userPrompt = req.body.userPrompt; // Atribui à variável de escopo mais alto
        if (!userPrompt || userPrompt.trim() === '' || !projectContext) {
            return res.status(400).json({ message: "O 'userPrompt' (não pode ser vazio) e o 'projectContext' são obrigatórios." });
        }
        const generativeModel = new vertexai_1.VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION })
            .getGenerativeModel({ model: "gemini-2.5-pro" });
        let knowledgeContext = "Nenhum conhecimento externo relevante foi encontrado na base de dados.";
        let vdbHost = VDB_HOST; // valor de env opcional; se vazio, faremos auto-descoberta
        try {
            // 1) Descobrir o host público do Vector DB (Index Endpoint)
            const indexEndpointSvc = new aiplatform_1.IndexEndpointServiceClient({
                apiEndpoint: `${FUNCTIONS_REGION}-aiplatform.googleapis.com`,
            });
            if (!vdbHost) {
                const [ep] = await indexEndpointSvc.getIndexEndpoint({ name: VECTOR_ENDPOINT_PATH });
                vdbHost = String(ep.publicEndpointDomainName || "").replace(/^https?:\/\//, "").trim();
                if (!vdbHost)
                    throw new Error("publicEndpointDomainName vazio no Index Endpoint.");
            }
            // Gerar embedding do userPrompt (com fallback de modelo)
            const vertexEmb = new vertexai_1.VertexAI({ project: GCP_PROJECT_ID, location: EMBEDDING_REGION });
            // helper p/ compatibilidade de SDK (GA/preview)
            const tryGetEmbedModel = (modelName) => vertexEmb.getTextEmbeddingModel?.({ model: modelName }) ||
                vertexEmb.preview?.getTextEmbeddingModel?.({ model: modelName }) ||
                null;
            const requestedModel = (EMBEDDING_MODEL || "").trim() || "text-embedding-004";
            let embedModel = tryGetEmbedModel(requestedModel);
            if (!embedModel && requestedModel !== "text-embedding-004") {
                // fallback robusto
                logger.warn(`Embedding model '${requestedModel}' indisponível. Usando fallback 'text-embedding-004'.`);
                embedModel = tryGetEmbedModel("text-embedding-004");
            }
            if (!embedModel) {
                throw new Error(`Embedding model '${requestedModel}' indisponível e fallback falhou.`);
            }
            // chamada de embedding (mantém sua forma atual)
            const embedResult = await embedModel.embedContent({
                content: { parts: [{ text: userPrompt }] },
            });
            const userPromptEmbedding = embedResult?.embedding?.values || [];
            if (!userPromptEmbedding.length)
                throw new Error("Embedding retornou vazio.");
            // Sanity check de dimensão
            const MODEL_DIM = {
                "text-embedding-004": 768,
                "text-multilingual-embedding-002": 768,
            };
            const chosenModel = embedModel?.model || requestedModel || "text-embedding-004";
            const expectedDim = MODEL_DIM[chosenModel] ?? 768;
            if (userPromptEmbedding.length !== expectedDim) {
                throw new Error(`Dimensão do embedding (${userPromptEmbedding.length}) difere do esperado para ${chosenModel} (${expectedDim}). ` +
                    `Recrie o índice com a mesma dimensão ou padronize o modelo.`);
            }
            // Executar a busca via REST assinado
            // --- BUSCA VETORIAL (SDK) ---
            // Mantém seu indexEndpointSvc já criado com apiEndpoint = `${FUNCTIONS_REGION}-aiplatform.googleapis.com`
            // Sanity check de dimensão (você já tem acima; mantenha um só)
            const MODEL_DIM = {
                "text-embedding-004": 768,
                "text-multilingual-embedding-002": 768,
            };
            const chosenModel = embedModel?.model || requestedModel || "text-embedding-004";
            const expectedDim = MODEL_DIM[chosenModel] ?? 768;
            if (userPromptEmbedding.length !== expectedDim) {
                throw new Error(`Dimensão do embedding (${userPromptEmbedding.length}) difere do esperado para ${chosenModel} (${expectedDim}). ` +
                    `Recrie o índice com a mesma dimensão ou padronize o modelo.`);
            }
            let neighbors = [];
            try {
                const [neighborsResp] = await indexEndpointSvc.findNeighbors({
                    indexEndpoint: VECTOR_ENDPOINT_PATH, // "projects/.../locations/.../indexEndpoints/ENDPOINT_ID"
                    deployedIndexId: VECTOR_DEPLOYED_INDEX_ID,
                    queries: [{
                            datapoint: {
                                datapointId: "query_id_" + (0, crypto_1.randomUUID)(),
                                featureVector: userPromptEmbedding,
                            },
                            neighborCount: 3,
                        }],
                    returnFullDatapoint: false,
                });
                neighbors = neighborsResp?.nearestNeighbors?.[0]?.neighbors ?? [];
            }
            catch (err) {
                logger.error("Vector Search (SDK) erro", {
                    message: err?.message,
                    code: err?.code,
                    details: err?.details,
                    endpointPath: VECTOR_ENDPOINT_PATH,
                    deployedIndexId: VECTOR_DEPLOYED_INDEX_ID,
                });
                await logErrorToBigQuery({
                    timestamp: new Date().toISOString(),
                    severidade: "ERROR",
                    ambiente: "backend",
                    funcao_ou_componente: "assistenteSprint-VectorSearch",
                    cliente_id: req.user?.uid || "admin_call",
                    mensagem: err?.message,
                    stack_trace: err?.stack,
                    contexto: JSON.stringify({
                        endpointPath: VECTOR_ENDPOINT_PATH,
                        deployedIndexId: VECTOR_DEPLOYED_INDEX_ID,
                    })
                });
            }
            // Monta o contexto
            let knowledgeContext = "Nenhum vizinho relevante encontrado para o prompt atual.";
            if (neighbors.length > 0) {
                const bullets = neighbors.map(n => {
                    const d = typeof n.distance === "number" ? n.distance : null;
                    const sim = d !== null ? Math.round((1 - d) * 100) : 0;
                    return `- Um documento similar (similaridade aprox.: ${sim}%)`;
                }).join("\n");
                knowledgeContext = "Foram encontrados os seguintes trechos relevantes na documentação técnica:\n" + bullets;
                logger.info("Contexto relevante encontrado no Vector Search (SDK):", { count: neighbors.length });
            }
            const prompt = `
            Você é um Arquiteto de Software Sênior e programador full-stack especialista em Google Cloud, TypeScript, e BigQuery. Sua tarefa é analisar uma solicitação de um desenvolvedor e gerar um plano de ação claro e o código necessário.

            Você tem acesso a dois tipos de contexto:
            1.  CONTEXTO INTERNO (O estado atual do projeto):
                ${JSON.stringify(projectContext, null, 2)}

            2.  CONTEXTO EXTERNO (Base de Conhecimento - manuais e documentos que foram adicionados):
                ${knowledgeContext}

            SOLICITAÇÃO DO DESENVOLVEDOR: "${userPrompt}"

            Com base em TODOS os contextos fornecidos, gere uma resposta em um objeto JSON com a seguinte estrutura:
            {
              "explicacao": "Uma explicação clara e concisa do que precisa ser feito, em formato de texto.",
              "alteracoes": [
                {
                  "arquivo": "O caminho completo do arquivo a ser modificado (ex: 'functions/src/index.ts').",
                  "acao": "A ação a ser tomada (ex: 'ADICIONAR ROTA', 'MODIFICAR FUNÇÃO', 'CRIAR NOVO ARQUIVO').",
                  "codigo": "O trecho de código completo e pronto para ser copiado e colado."
                }
              ]
            }
            Seja preciso e forneça código funcional. Retorne APENAS o objeto JSON. As chaves e valores de string do JSON DEVEM estar entre aspas duplas.
        `;
            const result = await generativeModel.generateContent(prompt);
            const responseText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (!responseText) {
                await logErrorToBigQuery({
                    timestamp: new Date().toISOString(),
                    severidade: "WARNING",
                    ambiente: "backend",
                    funcao_ou_componente: "assistenteSprint-GenerativeModel",
                    cliente_id: req.user?.uid || "admin_call",
                    mensagem: "O modelo generativo retornou uma resposta vazia.",
                    stack_trace: null,
                    contexto: JSON.stringify({ knowledgeContext })
                });
                return res.status(200).json({
                    explicacao: "IA não retornou conteúdo. Contexto externo pode ter falhado; tente novamente.",
                    alteracoes: []
                });
            }
            // --- INÍCIO DA CORREÇÃO ---
            const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Linha ~1079
            if (!jsonMatch) {
                await logErrorToBigQuery({
                    timestamp: new Date().toISOString(),
                    severidade: "WARNING",
                    ambiente: "backend",
                    funcao_ou_componente: "assistenteSprint-GenerativeModel-Parse",
                    cliente_id: req.user?.uid || "admin_call",
                    mensagem: "A resposta do modelo generativo não continha um objeto JSON completo ou válido. O texto raw não continha '{' e '}'.",
                    stack_trace: null,
                    contexto: JSON.stringify({ rawResponse: responseText })
                });
                return res.status(200).json({
                    explicacao: "IA retornou um formato inesperado. Tente novamente.",
                    alteracoes: [{
                            arquivo: "debug.log",
                            acao: "RAW_OUTPUT",
                            codigo: responseText
                        }]
                });
            }
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(jsonMatch[0]); // Esta é a linha original, agora dentro de um try-catch
            }
            catch (parseError) {
                // Tratamento específico para o erro de análise JSON
                await logErrorToBigQuery({
                    timestamp: new Date().toISOString(),
                    severidade: "ERROR",
                    ambiente: "backend",
                    funcao_ou_componente: "assistenteSprint-JSONParseError", // Nova função/componente para este erro
                    cliente_id: req.user?.uid || "admin_call",
                    mensagem: `Falha ao analisar JSON da resposta da IA: ${parseError.message}`,
                    stack_trace: parseError.stack,
                    contexto: JSON.stringify({
                        extractedJsonString: jsonMatch[0], // Log da string que causou o erro
                        rawResponseFromAI: responseText, // Log da resposta completa da IA
                        originalPrompt: userPrompt // Opcional, para contexto completo
                    })
                });
                logger.error("Falha na análise JSON da resposta da IA", {
                    errorMessage: parseError.message,
                    extractedJson: jsonMatch[0],
                    rawResponse: responseText
                });
                return res.status(500).json({ message: "A IA retornou um formato JSON inválido. A equipe foi notificada com os detalhes para depuração." });
            }
            return res.status(200).json(parsedResponse);
            // --- FIM DA CORREÇÃO ---
        }
        catch (error) {
            await logErrorToBigQuery({
                timestamp: new Date().toISOString(),
                severidade: "CRITICAL",
                ambiente: "backend",
                funcao_ou_componente: "assistenteSprint",
                cliente_id: req.user?.uid || "admin_call",
                mensagem: error.message,
                stack_trace: error.stack,
                contexto: JSON.stringify(req.body)
            });
            logger.error("Erro em assistenteSprint", { message: error.message, stack: error.stack });
            return res.status(500).json({ message: "Erro ao processar a solicitação do assistente de IA." });
        }
    }
    finally { }
});
// --- INÍCIO DA SUBSTITUIÇÃO DA FUNÇÃO 'analisarErroComIA' ---
// Interface para definir a estrutura da linha que esperamos do cache do BigQuery
app.post('/analisarErroComIA', adminAuthMiddleware, async (req, res) => {
    const adminUid = req.user?.uid;
    try {
        const { error } = req.body;
        if (!error || !error.mensagem || !error.error_id) {
            return res.status(400).json({ message: "Objeto de erro inválido ou sem 'error_id'." });
        }
        const errorId = error.error_id;
        // --- CACHE (BigQuery) ---
        try {
            const cacheQuery = `
        SELECT analise_ia FROM (
          SELECT analise_ia,
                 ROW_NUMBER() OVER(PARTITION BY error_id ORDER BY COALESCE(last_modified, timestamp) DESC) rn
          FROM \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
          WHERE error_id = @errorId
        ) WHERE rn = 1
      `;
            const [rows] = await bq.query({
                query: cacheQuery,
                params: { errorId },
                location: BIGQUERY_LOCATION
            });
            const firstRow = rows[0];
            if (firstRow?.analise_ia) {
                let cached = firstRow.analise_ia;
                if (typeof cached === "string") {
                    try {
                        cached = JSON.parse(cached);
                    }
                    catch { /* mantém string se inválido */ }
                }
                logger.info(`Análise de IA para erro ${errorId} encontrada no cache.`);
                return res.status(200).json(cached);
            }
            // --- CHAMADA À IA ---
            // --- CHAMADA À IA (forma compatível com o SDK GA) ---
            const vertex_ai = new vertexai_1.VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION });
            const model = vertex_ai.getGenerativeModel({
                model: "gemini-2.5-pro",
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            });
            const promptStr = `
Você é um engenheiro de software sênior e especialista em depuração.
Retorne APENAS um JSON com "explicacao" e "sugestao_codigo".
Objeto de Erro:
- Ambiente: ${error.ambiente}
- Componente/Função: ${error.funcao_ou_componente}
- Mensagem de Erro: ${error.mensagem}
- Stack Trace: ${error.stack_trace || 'Não fornecido'}
- Contexto Adicional: ${error.contexto || 'Nenhum'}
`;
            // forma correta: request com "contents"
            const { response } = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: promptStr }]
                    }
                ]
            });
            // 1ª tentativa: método helper do SDK
            let responseText = "";
            if (response && typeof response.text === "function") {
                responseText = response.text();
            }
            else {
                // fallback (SDKs mais antigos)
                const parts = response?.candidates?.[0]?.content?.parts ?? [];
                responseText = parts.map((p) => p.text ?? "").join("").trim();
            }
            if (!responseText) {
                throw new Error("A IA retornou uma resposta vazia.");
            }
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(responseText);
            }
            catch {
                // fallback extra: se por algum motivo vier cercado por markdown
                let processed = responseText.trim();
                const md = processed.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (md?.[1])
                    processed = md[1].trim();
                const outer = processed.match(/\{[\s\S]*\}/);
                if (!outer)
                    throw new Error("Nenhum objeto JSON encontrado na resposta da IA.");
                jsonResponse = JSON.parse(outer[0].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "").trim());
            }
            // --- SALVA NO CACHE ---
            try {
                const newErrorStateWithAnalysis = {
                    ...error,
                    error_id: errorId,
                    status: error.status || 'EM_ANALISE',
                    // >>> garanta string JSON:
                    analise_ia: JSON.stringify(jsonResponse),
                    last_modified: new Date().toISOString(),
                };
                if (typeof newErrorStateWithAnalysis.timestamp === 'object' && newErrorStateWithAnalysis.timestamp?.value) {
                    newErrorStateWithAnalysis.timestamp = newErrorStateWithAnalysis.timestamp.value;
                }
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([newErrorStateWithAnalysis]);
                logger.info(`Análise de IA para erro ${errorId} salva com sucesso no BigQuery.`);
            }
            catch (saveCacheError) {
                logger.error(`Falha ao salvar análise de IA no BigQuery para erro ${errorId}:`, saveCacheError);
            }
            return res.status(200).json(jsonResponse);
        }
        catch (error) {
            await logErrorToBigQuery({
                timestamp: new Date().toISOString(),
                severidade: "ERROR",
                ambiente: "backend",
                funcao_ou_componente: "analisarErroComIA",
                cliente_id: adminUid || "admin_call",
                mensagem: error.message,
                stack_trace: error.stack,
                contexto: JSON.stringify({ requestBody: req.body })
            });
            return res.status(500).json({ message: `A IA não conseguiu analisar o erro: ${error.message}` });
        }
    }
    finally { }
}); // <<--- FECHAMENTO ÚNICO E CORRETO DA ROTA
// --- FIM DA SUBSTITUIÇÃO DA FUNÇÃO 'analisarErroComIA' ---
// =============================================================================
// --- ROTEADOR PRINCIPAL E EXPORTAÇÃO DA API ---
// =============================================================================
// Cria um novo aplicativo Express que servirá como roteador principal.
const root = (0, express_1.default)();
// (Opcional, mas recomendado) Adiciona um endpoint de "health check".
root.get('/api/healthz', (_req, res) => res.status(200).send('ok'));
// Monta o seu aplicativo Express principal (app) sob o prefixo /api.
root.use('/api', app);
// Exporta a Cloud Function api usando o roteador principal "root".
exports.api = (0, https_1.onRequest)({
    memory: "1GiB",
    region: FUNCTIONS_REGION,
    invoker: "public"
}, root);
// =============================================================================
// --- DEMAIS TRIGGERS E FUNÇÕES ---
// =============================================================================
exports.criarRegistroClienteNovo = auth.beforeUserCreated({ memory: "2GiB" }, async (event) => {
    const user = event.data;
    if (!user || !user.uid || !user.email) {
        logger.error("Tentativa de cadastro com dados de usuário inválidos ou ausentes.", { eventData: event.data });
        throw new Error("Os dados fornecidos para o cadastro são inválidos.");
    }
    const clienteId = user.uid;
    const userEmail = user.email;
    const userName = user.displayName || (userEmail ? userEmail.split('@')[0] : 'Novo Usuário');
    const cliente = {
        cliente_id: clienteId,
        email: userEmail,
        nome_exibicao: userName,
        plano: "free",
        status_pagamento: "ativo",
        limite_uf: 1,
        limite_oportunidades: 20,
        limite_docs: 3,
        data_cadastro: new Date().toISOString(),
        data_ultima_modificacao: new Date().toISOString()
    };
    try {
        logger.info(`Iniciando onboarding para novo usuário: ${clienteId}`);
        await bq.dataset(DATASET_DIM).table("clientes").insert([cliente]);
        logger.info(`Cliente ${clienteId} inserido com sucesso no BigQuery.`);
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "CRITICAL",
            ambiente: "backend",
            funcao_ou_componente: "criarRegistroCliente",
            cliente_id: clienteId,
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ userEventData: event.data })
        });
        logger.error(`Falha ao criar registro no BigQuery para o cliente ${clienteId}`, { error });
        throw new Error("Não foi possível finalizar seu cadastro. Por favor, tente novamente.");
    }
});
exports.coletarPncp = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: "1GiB" }, async (req, res) => {
    let uf = req.query.uf?.toUpperCase() || "MT";
    let dataColeta = '';
    try {
        const mod = 6;
        if (req.query.data && /^\d{4}-\d{2}-\d{2}$/.test(req.query.data)) {
            dataColeta = req.query.data.replace(/-/g, "");
        }
        else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dataColeta = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
        }
        let pagina = 1;
        let totalInserido = 0;
        const tamanhoPagina = 50;
        logger.info(`Iniciando coleta para UF=${uf}, Data=${dataColeta}, Modalidade=${mod}, Tamanho pág.=${tamanhoPagina}`);
        for (;;) {
            const params = {
                dataInicial: dataColeta,
                dataFinal: dataColeta,
                codigoModalidadeContratacao: mod,
                uf: uf,
                pagina: pagina,
                tamanhoPagina: tamanhoPagina,
            };
            const response = await axios_1.default.get(PNCP_API_URL, {
                params: params,
                headers: { 'User-Agent': 'LiciAI-Collector/1.0 (+https://liciai1.web.app)' },
                timeout: 480000
            });
            const contratacoes = response.data?.data || [];
            if (contratacoes.length > 0) {
                const rowsToInsert = contratacoes.map((item) => ({
                    ingest_time: new Date(),
                    payload: JSON.stringify(item)
                }));
                await insertToBigQuery(rowsToInsert);
                totalInserido += rowsToInsert.length;
                if (contratacoes.length < tamanhoPagina)
                    break;
                pagina++;
            }
            else {
                break;
            }
        }
        const successMessage = `Coleta concluída para UF=${uf}, data=${dataColeta}. Total de ${totalInserido} registros.`;
        logger.info(successMessage);
        res.status(200).send(successMessage);
    }
    catch (err) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "coletarPncp",
            cliente_id: "system/scheduler",
            mensagem: err.message,
            stack_trace: err.stack,
            contexto: JSON.stringify({ uf, dataColeta, axiosError: axios_1.default.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, code: err.code } : null })
        });
        logger.error(`Erro na função coletarPncp para UF=${uf}, Data=${dataColeta}:`, { message: err.message, stack: err.stack });
        res.status(500).send(`Erro ao coletar dados do PNCP para ${uf}, data ${dataColeta}.`);
    }
});
exports.coletarLicitacoesAbertas = (0, https_1.onRequest)({ region: FUNCTIONS_REGION, timeoutSeconds: 540, memory: "512MiB" }, async (req, res) => {
    let uf = req.query.uf?.toUpperCase() || "MT";
    try {
        const mod = 6;
        const hoje = new Date();
        const dataFinal = hoje.toISOString().slice(0, 10).replace(/-/g, "");
        let pagina = 1;
        let totalInserido = 0;
        const tamanhoPagina = 50;
        logger.info(`Iniciando coleta de LICITAÇÕES ABERTAS para UF=${uf}, Modalidade=${mod}`);
        for (;;) {
            const params = {
                dataFinal: dataFinal,
                codigoModalidadeContratacao: mod,
                uf: uf,
                pagina: pagina,
                tamanhoPagina: tamanhoPagina,
            };
            const response = await axios_1.default.get(PNCP_API_URL_ABERTAS, {
                params: params,
                headers: { 'User-Agent': 'LiciAI-Collector/1.0 (+https://liciai1.web.app)' },
                timeout: 480000
            });
            const contratacoes = response.data?.data || [];
            if (contratacoes.length > 0) {
                const rowsToInsert = contratacoes.map((item) => ({
                    ingest_time: new Date(),
                    payload: JSON.stringify(item)
                }));
                await insertToBigQuery(rowsToInsert);
                totalInserido += rowsToInsert.length;
                if (contratacoes.length < tamanhoPagina)
                    break;
                pagina++;
            }
            else {
                break;
            }
        }
        const successMessage = `Coleta de licitações abertas concluída para UF=${uf}. Total de ${totalInserido} registros.`;
        logger.info(successMessage);
        res.status(200).send(successMessage);
    }
    catch (err) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "ERROR",
            ambiente: "backend",
            funcao_ou_componente: "coletarLicitacoesAbertas",
            cliente_id: "system/scheduler",
            mensagem: err.message,
            stack_trace: err.stack,
            contexto: JSON.stringify({ uf, axiosError: axios_1.default.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, code: err.code } : null })
        });
        logger.error(`Erro na função coletarLicitacoesAbertas para UF=${uf}:`, { message: err.message });
        res.status(500).send(`Erro ao coletar licitações abertas para ${uf}.`);
    }
});
exports.processarDocumentoConhecimento = (0, storage_1.onObjectFinalized)({
    bucket: KNOWLEDGE_BUCKET,
    region: FUNCTIONS_REGION,
    memory: "1GiB",
    timeoutSeconds: 540,
}, async (event) => {
    const { bucket, name } = event.data;
    if (!name) {
        logger.warn("Evento sem nome de arquivo.", { event });
        return;
    }
    logger.info(`Arquivo '${name}' detectado em '${bucket}'. Iniciando processamento.`);
    try {
        const fileBuffer = (await (0, storage_2.getStorage)().bucket(bucket).file(name).download())[0];
        let textContent = "";
        if (name.toLowerCase().endsWith('.pdf')) {
            const data = await (0, pdf_parse_1.default)(fileBuffer);
            textContent = data.text;
        }
        else {
            textContent = fileBuffer.toString('utf-8');
        }
        if (!textContent.trim()) {
            logger.warn(`Nenhum texto extraído do arquivo: ${name}`);
            return;
        }
        const chunks = textContent.match(/[\s\S]{1,1000}/g) || [];
        logger.info(`Arquivo '${name}' dividido em ${chunks.length} pedaços.`);
        if (chunks.length === 0)
            return;
        const embedAI = new vertexai_1.VertexAI({ project: GCP_PROJECT_ID, location: EMBEDDING_REGION });
        const tryGetEmbedModel = (modelName) => embedAI.getTextEmbeddingModel?.({ model: modelName }) ||
            embedAI.preview?.getTextEmbeddingModel?.({ model: modelName }) ||
            null;
        const requestedModel = (EMBEDDING_MODEL || "").trim() || "text-embedding-004";
        let embedModel = tryGetEmbedModel(requestedModel);
        if (!embedModel && requestedModel !== "text-embedding-004") {
            logger.warn(`Embedding model '${requestedModel}' indisponível. Usando fallback 'text-embedding-004'.`);
            embedModel = tryGetEmbedModel("text-embedding-004");
        }
        if (!embedModel) {
            throw new Error(`Modelo de embedding '${requestedModel}' indisponível e fallback falhou.`);
        }
        const embeddingRequests = chunks.map((chunk) => ({
            content: { parts: [{ text: chunk }] },
        }));
        const batch = await embedModel.batchEmbedContents({ requests: embeddingRequests });
        const embeddings = (batch.embeddings || []).map((e) => e.values);
        const datapoints = embeddings.map((vector, index) => ({
            datapointId: `${name.replace(/[^a-zA-Z0-9]/g, "_")}_${index}`,
            featureVector: vector,
        }));
        const indexClient = new aiplatform_1.IndexServiceClient({ apiEndpoint: `${FUNCTIONS_REGION}-aiplatform.googleapis.com` });
        await indexClient.upsertDatapoints({
            index: VECTOR_INDEX_PATH,
            datapoints: datapoints,
        });
        logger.info(`Sucesso! ${datapoints.length} vetores do arquivo '${name}' foram inseridos no índice.`);
    }
    catch (error) {
        await logErrorToBigQuery({
            timestamp: new Date().toISOString(),
            severidade: "CRITICAL",
            ambiente: "backend",
            funcao_ou_componente: "processarDocumentoConhecimento",
            cliente_id: "system/storage-trigger",
            mensagem: error.message,
            stack_trace: error.stack,
            contexto: JSON.stringify({ bucket, file: name })
        });
        logger.error(`Falha CRÍTICA ao processar o arquivo '${name}'`, {
            message: error.message,
            stack: error.stack
        });
    }
});
//# sourceMappingURL=index.js.map