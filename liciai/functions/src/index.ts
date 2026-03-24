/**
 *  * ====================================================================================
  * ARQUITETURA E GUIA DE SOBREVIVÊNCIA DA BASE DE CONHECIMENTO (IA)
   * ====================================================================================
    * 
     * Este guia documenta as decisões críticas de arquitetura e as lições aprendidas
      * durante a implementação da busca vetorial, para evitar erros futuros.
       *
        * --- ARQUITETURA DE FLUXO DE DADOS ---
         * 
          * 1.  UPLOAD -> 2. PROCESSAMENTO E EMBEDDING -> 3. ARMAZENAMENTO DE VETORES -> 4. BUSCA E CONSULTA
           * (O fluxo detalhado está descrito nos comentários do código abaixo)
            *
             * --- PADRONIZAÇÃO DE MODELOS DE IA (Válido em Out/2025) ---
              * 
               * -   MODELO DE EMBEDDING: `text-embedding-005` (definido em .env.uniquex-487718: EMBEDDING_MODEL).
                *     Otimizado para gerar representações numéricas de texto para tarefas de busca e recuperação.
                 *     ATENÇÃO: Não altere o modelo sem re-indexar todos os vetores em core.knowledge_vectors —
                  *     vetores de modelos diferentes NÃO são compatíveis entre si.
                 * 
                  * -   MODELO GENERATIVO (LLM): Para tarefas que exigem raciocínio, análise e geração de texto
                   *     (como `/analisarErroComIA`), padronizamos o uso do modelo estável mais avançado da família Gemini: `gemini-2.5-pro`.
                    *     É crucial verificar a documentação oficial periodicamente para confirmar os nomes dos modelos estáveis,
                     *     pois os nomes de "preview" são descontinuados rapidamente.
                      *
                       * --- LIÇÕES CRÍTICAS APRENDIDAS (NÃO ALTERAR SEM LER!) ---
                        * 
                         * 1.  A API DE EMBEDDING DO VERTEX AI (`embed...REST`):
                          *     -   PROBLEMA: Erros `404 Not Found`.
                           *     -   CAUSA: Uso de sintaxe de API antiga (`:embedContent`) para chamar um modelo novo (`text-embedding-004`)
                            *       que exige a sintaxe moderna (`:predict`).
                             *     -   SOLUÇÃO: Código atualizado para usar o endpoint `:predict` e o corpo `{"instances": ...}`.
                              *
                               * 2.  A FUNÇÃO `VECTOR_SEARCH` DO BIGQUERY (`/assistenteSprint`):
                                *     -   PROBLEMA: Erros de sintaxe SQL como `Name id not found inside base`.
                                 *     -   CAUSA: `VECTOR_SEARCH` não retorna as colunas da tabela original quando usada com `JOIN` direto.
                                  *     -   SOLUÇÃO: A query usa uma subquery `WHERE base.id IN (SELECT id FROM VECTOR_SEARCH(...))`.
                                   *       Esta abordagem se mostrou a mais robusta.
                                    *
                                     * 3.  COTA DO VERTEX AI MATCHING ENGINE:
                                      *     -   PROBLEMA: Erros `501 Not Implemented` inexplicáveis.
                                       *     -   CAUSA: Infraestrutura legada de "Vertex AI Vector Search" (um endpoint e índice) consumindo 100% da cota.
                                        *     -   SOLUÇÃO: A infraestrutura legada foi excluída. Esta arquitetura com BigQuery não utiliza o Matching Engine.
                                         * Sempre que eu te pedir o código me de o codigo completo sem breviedades, a não ser que eu te peça expressamente. Nunca apague este comentado, ele é o santo graal do nosso código para evitar futuros problemas)
                                          * ====================================================================================
                                           */
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import * as auth from "firebase-functions/v2/identity";
import { BigQuery } from "@google-cloud/bigquery";
import { CloudTasksClient } from "@google-cloud/tasks";
import { GoogleAuth } from "google-auth-library";
import { VertexAI } from "@google-cloud/vertexai";
import express from 'express';
import cors from 'cors';
import axios from "axios";
import pdf from "pdf-parse";
import { randomUUID, createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { Storage } from "@google-cloud/storage";
import sgMail from "@sendgrid/mail";

// --- INICIALIZAÇÃO E CONFIGURAÇÃO GLOBAL ---
initializeApp();

// <<<< ABORDAGEM SIMPLIFICADA E COMBINADA
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "uniquex-487718";
const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION || "us-east1";
const EMBEDDING_REGION = process.env.EMBEDDING_REGION || "us-central1";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://liciai-uniquex-487718.web.app";
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
const CLOUD_TASKS_QUEUE_NAME = "pncp-backfill-queue";
// ADMIN_UIDS: carregado de env var para evitar hardcoded no código-fonte.
// Para adicionar admins, edite functions/.env.uniquex-487718 e redeploy.
const ADMIN_UIDS: string[] = (process.env.ADMIN_UIDS || "2bfsnZTOaWeiK1xaQQPljverQNn2").split(",").map(s => s.trim()).filter(Boolean);
const KNOWLEDGE_BUCKET = process.env.KNOWLEDGE_BUCKET || "itensx";
const TABLE_KNOWLEDGE_VECTORS = "knowledge_vectors";
// UFs coletadas diariamente (incrementalmente por ordem de volume)
const UFS_INGEST_DIARIO = ["SP","MG","RJ","BA","RS","PR","PE","CE","GO","SC","PA","MA","PB","AM","PI","ES","RO","TO","AL","SE","MT","MS","RN","DF","AC","AP","RR"];
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || "";

// --- Mercado Pago (conectar quando tiver credenciais — ver LEDGER P-MP-01) ---
// Para ativar: adicionar MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, MP_PLAN_ID_PRO e
// MP_PLAN_ID_ENTERPRISE em functions/.env.uniquex-487718 e fazer redeploy.
const MP_ACCESS_TOKEN        = process.env.MP_ACCESS_TOKEN        || "";
const MP_WEBHOOK_SECRET      = process.env.MP_WEBHOOK_SECRET      || "";
const MP_PLAN_ID_PRO         = process.env.MP_PLAN_ID_PRO         || "";
const MP_PLAN_ID_ENTERPRISE  = process.env.MP_PLAN_ID_ENTERPRISE  || "";
const MP_BASE_URL            = "https://api.mercadopago.com";
const isMpConfigured         = () => !!MP_ACCESS_TOKEN;

// --- SendGrid (conectar quando tiver API key — ver LEDGER P-SG-01) ---
// Para ativar: adicionar SENDGRID_API_KEY e SENDGRID_FROM_EMAIL em .env e redeploy.
const SENDGRID_API_KEY    = process.env.SENDGRID_API_KEY    || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@liciai.com.br";
if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);
const isSgConfigured = () => !!SENDGRID_API_KEY;

type PlanoNome = "free" | "pro" | "enterprise" | "gov";

interface ClientePlanoInfo {
        cliente_id: string;
        tenant_id: string;
        plano: PlanoNome;
        status_pagamento: string;
        limite_uf: number;
        limite_oportunidades: number;
        limite_docs: number;
        limite_produtos: number;
        trial_inicio?: string | null;
        trial_fim?: string | null;
}

const LIMITES_PADRAO_POR_PLANO: Record<PlanoNome, Omit<ClientePlanoInfo, "cliente_id" | "tenant_id" | "plano" | "status_pagamento">> = {
        free: { limite_uf: 1, limite_oportunidades: 20, limite_docs: 3, limite_produtos: 0 },
        pro: { limite_uf: 3, limite_oportunidades: 200, limite_docs: 10, limite_produtos: 10 },
        enterprise: { limite_uf: 9999, limite_oportunidades: 999999, limite_docs: 999999, limite_produtos: 999999 },
        gov: { limite_uf: 9999, limite_oportunidades: 999999, limite_docs: 999999, limite_produtos: 999999 },
};

setGlobalOptions({ region: FUNCTIONS_REGION });
const bq = new BigQuery({ projectId: GCP_PROJECT_ID });
const googleAuth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
const storage = new Storage({ projectId: GCP_PROJECT_ID }); // <-- ADICIONE ESTA LINHA

// --- HELPERS E UTILS ---
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelayMs = 1000): Promise<T> {
        let lastError: any = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                        return await fn();
                } catch (err: any) {
                        lastError = err;
                        const statusCode = err?.response?.status || err?.code;
                        const isRetryable = statusCode === 429 || statusCode === "RESOURCE_EXHAUSTED";
                        if (!isRetryable || attempt === maxRetries - 1) {
                                break;
                        }
                        const backoff = Math.pow(2, attempt) * initialDelayMs;
                        const jitter = backoff * 0.2 * Math.random();
                        const delay = Math.round(backoff + jitter);
                        logger.warn(`[Retry] Status ${statusCode} detectado. Tentando novamente em ${delay}ms... (Tentativa ${attempt + 1}/${maxRetries})`);
                        await sleep(delay);
                }
        }
        throw lastError;
}

async function logErrorToBigQuery(errorData: Record<string, any>): Promise<void> {
        try {
                const nowISO = new Date().toISOString();
                const logEntry = {
                        ...errorData,
                        error_id: errorData.error_id || randomUUID(),
                        status: errorData.status || 'NOVO',
                        last_modified: nowISO,
                        timestamp: errorData.timestamp || nowISO,
                };
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([logEntry]);
        } catch (error) {
                logger.error("Falha CRÍTICA ao inserir log de erro no BigQuery:", {
                        originalError: errorData,
                        loggingError: error,
                });
        }
}

// Serializa uma row do BigQuery convertendo tipos especiais para primitivos JSON:
// - BigQuery DATETIME/TIMESTAMP retornam como {value: "..."} → extrai a string
// - BigQuery NUMERIC retorna como string decimal → converte para number
// - null/undefined permanecem null
function serializeBqRow(row: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
                if (val === null || val === undefined) {
                        result[key] = null;
                } else if (typeof val === 'object' && !Array.isArray(val) && 'value' in val) {
                        // BigQuery DATE/DATETIME/TIMESTAMP
                        result[key] = val.value ?? null;
                } else if (Array.isArray(val)) {
                        result[key] = val.map((v: any) =>
                                (v !== null && typeof v === 'object' && 'value' in v) ? v.value : v
                        );
                } else {
                        result[key] = val;
                }
        }
        return result;
}

// --- HELPERS DE EMBEDDING (REST) ---
async function embedTextREST(text: string): Promise<number[]> {
        const fn = async (): Promise<number[]> => {
                const authToken = (await googleAuth.getAccessToken()) || "";
                if (!authToken) throw new Error("Falha ao obter access token GCP.");
                const url = `https://${EMBEDDING_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${EMBEDDING_REGION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;
                const body = { instances: [{ content: text }] };
                logger.info("Tentando chamar a API de Embedding (:predict)", { url, model: EMBEDDING_MODEL });
                const response = await axios.post(url, body, {
                        headers: { Authorization: `Bearer ${authToken}` },
                });
                const embedding = response.data?.predictions?.[0]?.embeddings?.values;
                if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                        logger.error("Resposta de embedding inválida da API :predict", { responseData: response.data });
                        throw new Error("Resposta de embedding inválida ou vazia da API :predict.");
                }
                return embedding;
        };
        return executeWithRetry(fn);
}

async function embedBatchREST(texts: string[]): Promise<number[][]> {
        if (!texts || texts.length === 0) {
                return [];
        }

        // AÇÃO 1: Reduzir o tamanho do lote para 2
        const BATCH_SIZE = 2;
        const allEmbeddings: number[][] = [];

        logger.info(`Iniciando embedding em lote (MODO ULTRA-SEGURO) para ${texts.length} chunks, em lotes de ${BATCH_SIZE}.`);

        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
                const batchTexts = texts.slice(i, i + BATCH_SIZE);

                const fn = async (): Promise<number[][]> => {
                        const authToken = (await googleAuth.getAccessToken()) || "";
                        if (!authToken) throw new Error("Falha ao obter access token GCP.");

                        const url = `https://${EMBEDDING_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${EMBEDDING_REGION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;

                        const body = {
                                instances: batchTexts.map(text => ({ content: text }))
                        };

                        const response = await axios.post(url, body, {
                                headers: { Authorization: `Bearer ${authToken}` },
                        });

                        const predictions = response.data?.predictions;
                        if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
                                throw new Error("Resposta de embedding em lote inválida ou vazia.");
                        }

                        return predictions.map(pred => pred.embeddings.values);
                };

                try {
                        // Mantemos o retry longo, pois ele funciona.
                        const batchEmbeddings = await executeWithRetry(fn, 3, 5000);

                        allEmbeddings.push(...batchEmbeddings);
                        logger.info(`Lote ${Math.floor(i / BATCH_SIZE) + 1} processado com sucesso. Total de embeddings: ${allEmbeddings.length}`);

                        if (i + BATCH_SIZE < texts.length) {
                                // AÇÃO 2: Aumentar a pausa entre os lotes para 3 segundos
                                await sleep(3000);
                        }

                } catch (error) {
                        logger.error(`Falha CRÍTICA ao processar lote de embeddings a partir do chunk ${i}. Abortando.`, {
                                errorMessage: (error as Error).message
                        });
                        throw new Error(`Falha ao processar lote de embeddings: ${(error as Error).message}`);
                }
        }

        return allEmbeddings;
}

// --- CONFIGURAÇÃO DO SERVIDOR EXPRESS ---
const app = express();
app.use(cors({
        origin: [
                CORS_ORIGIN,
                "https://liciai-uniquex-487718.web.app",
                "https://us-east1-uniquex-487718.cloudfunctions.net",
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173"
        ],
        credentials: true
}));
app.use(express.json({ limit: "10mb" }));

declare global {
        namespace Express {
                interface Request {
                        user?: DecodedIdToken;
                        uid?: string;
                        planInfo?: ClientePlanoInfo;
                }
        }
}

// --- MIDDLEWARES DE AUTENTICAÇÃO ---
const userAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
                return res.status(403).json({ message: 'Acesso negado. Token não fornecido.' });
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
                const decodedToken = await getAuth().verifyIdToken(idToken);
                req.user = decodedToken;
                req.uid = decodedToken.uid;
                return next();
        } catch (error) {
                logger.error("Falha na verificação do token de usuário", { error });
                return res.status(403).json({ message: 'Acesso negado. Token inválido.' });
        }
};

const adminAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
                return res.status(403).json({ message: 'Acesso negado. Token não fornecido.' });
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
                const decodedToken = await getAuth().verifyIdToken(idToken);
                if (!ADMIN_UIDS.includes(decodedToken.uid)) {
                        return res.status(403).json({ message: 'Acesso negado. Rota apenas para administradores.' });
                }
                req.user = decodedToken;
                req.uid = decodedToken.uid;
                return next();
        } catch (error) {
                logger.error("Falha na verificação do token de admin", { error });
                return res.status(403).json({ message: 'Acesso negado. Token inválido.' });
        }
};

// Middleware para Cloud Scheduler — valida SCHEDULER_SECRET no header Authorization
const schedulerAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!SCHEDULER_SECRET) {
                logger.error("SCHEDULER_SECRET não configurado");
                return res.status(500).json({ message: "SCHEDULER_SECRET não configurado no servidor." });
        }
        const auth = req.headers.authorization || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token || token !== SCHEDULER_SECRET) {
                return res.status(403).json({ message: "Acesso negado. Token de scheduler inválido." });
        }
        return next();
};

let cachedClientTableName: string | null = null;
let cachedClientTableColumns: Set<string> | null = null;

const normalizePlano = (planoRaw: unknown): PlanoNome => {
        const plano = String(planoRaw || "free").toLowerCase();
        if (plano === "pro" || plano === "enterprise" || plano === "gov") return plano;
        return "free";
};

const toPositiveInt = (value: unknown, fallback: number): number => {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) return Math.floor(n);
        return fallback;
};

const sendApiError = (
        res: express.Response,
        status: number,
        code: string,
        message: string,
        details?: Record<string, any>
) => {
        return res.status(status).json({ error: { code, message, details: details || null } });
};

async function resolveClientTableName(): Promise<string> {
        if (cachedClientTableName) return cachedClientTableName;
        const query = `
                SELECT table_name
                FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.INFORMATION_SCHEMA.TABLES\`
                WHERE table_name IN ('cliente', 'clientes')
                ORDER BY CASE WHEN table_name = 'cliente' THEN 0 ELSE 1 END
                LIMIT 1
        `;
        const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION });
        if (!rows.length) {
                throw new Error("Tabela de clientes não encontrada no dataset dim (esperado: cliente ou clientes).");
        }
        cachedClientTableName = String(rows[0].table_name);
        return String(rows[0].table_name);
}

async function resolveClientTableColumns(): Promise<Set<string>> {
        if (cachedClientTableColumns) return cachedClientTableColumns;
        const tableName = await resolveClientTableName();
        const query = `
                SELECT column_name
                FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name = @tableName
        `;
        const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: { tableName } });
        cachedClientTableColumns = new Set(rows.map((r: any) => String(r.column_name)));
        return cachedClientTableColumns;
}

function buildClientePlanoFromRow(uid: string, row: Record<string, any>): ClientePlanoInfo {
        const plano = normalizePlano(row.plano);
        const limitesPadrao = LIMITES_PADRAO_POR_PLANO[plano];
        return {
                cliente_id: uid,
                tenant_id: String(row.tenant_id || uid),
                plano,
                status_pagamento: String(row.status_pagamento || "ativo"),
                limite_uf: toPositiveInt(row.limite_uf, limitesPadrao.limite_uf),
                limite_oportunidades: toPositiveInt(row.limite_oportunidades, limitesPadrao.limite_oportunidades),
                limite_docs: toPositiveInt(row.limite_docs, limitesPadrao.limite_docs),
                limite_produtos: toPositiveInt(row.limite_produtos, limitesPadrao.limite_produtos),
                trial_inicio: row.trial_inicio ? String(row.trial_inicio) : null,
                trial_fim: row.trial_fim ? String(row.trial_fim) : null,
        };
}

async function upsertClienteDefault(uid: string, email?: string): Promise<ClientePlanoInfo> {
        const tableName = await resolveClientTableName();
        const columns = await resolveClientTableColumns();
        const now = new Date();
        const trialFim = new Date(now);
        trialFim.setDate(trialFim.getDate() + 7);
        const proLimits = LIMITES_PADRAO_POR_PLANO["pro"];
        const baseDefault = {
                cliente_id: uid,
                tenant_id: uid,
                email: email || "",
                nome_exibicao: (email || uid).split('@')[0] || "Novo Usuário",
                plano: "pro", // trial usa limites pro
                status_pagamento: "trial",
                limite_uf: proLimits.limite_uf,
                limite_oportunidades: proLimits.limite_oportunidades,
                limite_docs: proLimits.limite_docs,
                limite_produtos: proLimits.limite_produtos,
                trial_inicio: now.toISOString(),
                trial_fim: trialFim.toISOString(),
                data_cadastro: now.toISOString(),
                data_ultima_modificacao: now.toISOString(),
        };

        const rowToInsert = Object.fromEntries(
                Object.entries(baseDefault).filter(([key]) => columns.has(key))
        );

        if (Object.keys(rowToInsert).length === 0 || !rowToInsert.cliente_id) {
                throw new Error(`Tabela ${tableName} não possui colunas mínimas para cadastro padrão.`);
        }

        await bq.dataset(DATASET_DIM).table(tableName).insert([rowToInsert]);
        return buildClientePlanoFromRow(uid, rowToInsert);
}

async function getOrCreateClientePlano(uid: string, email?: string): Promise<ClientePlanoInfo> {
        const tableName = await resolveClientTableName();
        const query = `
                SELECT TO_JSON_STRING(t) AS row_json
                FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.${tableName}\` t
                WHERE cliente_id = @cliente_id
                LIMIT 1
        `;

        const [rows] = await bq.query({
                query,
                location: BIGQUERY_LOCATION,
                params: { cliente_id: uid },
        });

        if (rows.length === 0) {
                return upsertClienteDefault(uid, email);
        }

        const parsed = JSON.parse(rows[0].row_json || "{}");
        return buildClientePlanoFromRow(uid, parsed);
}

const userPlanMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
                const uid = req.uid;
                if (!uid) {
                        return sendApiError(res, 401, "UNAUTHORIZED", "Usuário não autenticado.");
                }

                const planInfo = await getOrCreateClientePlano(uid, req.user?.email);
                const status = planInfo.status_pagamento.toLowerCase();

                if (["cancelado", "inadimplente", "bloqueado"].includes(status)) {
                        return sendApiError(res, 403, "PLAN_INACTIVE", "Seu plano está inativo. Regularize o pagamento para continuar.", {
                                plano: planInfo.plano,
                                status_pagamento: planInfo.status_pagamento,
                        });
                }

                // Verificar se trial expirou — se sim, tratar como free
                if (status === "trial" && planInfo.trial_fim) {
                        const trialExpired = new Date(planInfo.trial_fim) < new Date();
                        if (trialExpired) {
                                const freeLimits = LIMITES_PADRAO_POR_PLANO["free"];
                                planInfo.plano = "free";
                                planInfo.status_pagamento = "trial_expirado";
                                planInfo.limite_uf = freeLimits.limite_uf;
                                planInfo.limite_oportunidades = freeLimits.limite_oportunidades;
                                planInfo.limite_docs = freeLimits.limite_docs;
                                planInfo.limite_produtos = freeLimits.limite_produtos;
                        }
                }

                req.planInfo = planInfo;
                return next();
        } catch (error: any) {
                await logErrorToBigQuery({
                        funcao_ou_componente: "userPlanMiddleware",
                        cliente_id: req.uid,
                        mensagem: error.message,
                        stack_trace: error.stack,
                });
                return sendApiError(res, 500, "PLAN_LOOKUP_ERROR", "Falha ao validar plano do usuário.");
        }
};

const oportunidadesQuotaMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const planInfo = req.planInfo;
        if (!planInfo) {
                return sendApiError(res, 500, "PLAN_CONTEXT_MISSING", "Contexto de plano não disponível.");
        }

        const ufParam = typeof req.query.uf === 'string' ? req.query.uf : '';
        const ufList = ufParam
                .split(',')
                .map((uf) => uf.trim().toUpperCase())
                .filter(Boolean);

        if (planInfo.limite_uf > 0 && ufList.length > planInfo.limite_uf) {
                return sendApiError(res, 403, "UF_LIMIT_EXCEEDED", "Seu plano não permite monitorar essa quantidade de UFs nesta consulta.", {
                        limite_uf: planInfo.limite_uf,
                        solicitado: ufList.length,
                        plano: planInfo.plano,
                });
        }

        const reqLimit = parseInt(String(req.query.limit || "21"), 10) || 21;
        const reqOffset = parseInt(String(req.query.offset || "0"), 10) || 0;

        if (planInfo.limite_oportunidades > 0) {
                const restante = planInfo.limite_oportunidades - reqOffset;
                if (restante <= 0) {
                        return sendApiError(res, 403, "QUOTA_EXCEEDED", "Limite de oportunidades do plano atingido. Faça upgrade para continuar.", {
                                recurso: "oportunidades",
                                limite: planInfo.limite_oportunidades,
                                offset: reqOffset,
                                plano: planInfo.plano,
                        });
                }

                const limitAjustado = Math.max(1, Math.min(reqLimit, restante));
                (req.query as any).limit = String(limitAjustado);
        }

        return next();
};

// --- ROTAS DO EXPRESS ---
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Rotas Públicas
// ── Helper: filtros comuns ─────────────────────────────────────────────────
function applyCommonFilters(clauses: string[], params: Record<string, any>, q: any, uf: any, modalidade?: any, valor_min?: any, valor_max?: any, prazo_max?: any, beneficio?: any, situacao?: any) {
        if (uf && typeof uf === 'string' && uf.trim()) { clauses.push("uf = @uf"); params.uf = uf.trim().toUpperCase(); }
        if (q && typeof q === 'string' && q.trim()) { clauses.push("LOWER(objeto_compra) LIKE LOWER(@q)"); params.q = `%${q.trim()}%`; }
        if (modalidade && typeof modalidade === 'string' && modalidade.trim()) { clauses.push("LOWER(modalidade_nome) LIKE LOWER(@modalidade)"); params.modalidade = `%${modalidade.trim().replace(/_/g,' ')}%`; }
        const vm = Number(valor_min); if (!isNaN(vm) && vm > 0) { clauses.push("valor_total_estimado >= @valor_min"); params.valor_min = vm; }
        const vx = Number(valor_max); if (!isNaN(vx) && vx > 0) { clauses.push("(valor_total_estimado IS NULL OR valor_total_estimado <= @valor_max)"); params.valor_max = vx; }
        const pm = Number(prazo_max); if (!isNaN(pm) && pm > 0) { clauses.push("TIMESTAMP_DIFF(data_encerramento_proposta, CURRENT_TIMESTAMP(), DAY) BETWEEN 0 AND @prazo_max"); params.prazo_max = pm; }
        if (beneficio === 'me_epp') { clauses.push("(tipo_beneficio LIKE '%ME%' OR tipo_beneficio LIKE '%EPP%')"); }
        else if (beneficio === 'sem') { clauses.push("(tipo_beneficio IS NULL OR (tipo_beneficio NOT LIKE '%ME%' AND tipo_beneficio NOT LIKE '%EPP%'))"); }
        if (situacao === 'ativa') { clauses.push("(LOWER(situacao_nome) LIKE '%aberta%' OR LOWER(situacao_nome) LIKE '%ativa%' OR LOWER(situacao_nome) LIKE '%publicad%')"); }
        else if (situacao === 'suspensa') { clauses.push("LOWER(situacao_nome) LIKE '%suspensa%'"); }
}

app.get('/getOportunidades', async (req, res) => {
        try {
                const { uf, q, modalidade, valor_min, valor_max, prazo_max, beneficio, situacao, limit: limitStr, offset: offsetStr } = req.query;
                const limit = Math.min(parseInt(limitStr as string) || 21, 100); // cap em 100 por segurança
                const offset = parseInt(offsetStr as string) || 0;
                let query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${VIEW_OPORTUNIDADES}\``;
                const whereClauses: string[] = [];
                const queryParams: Record<string, any> = {};
                applyCommonFilters(whereClauses, queryParams, q, uf, modalidade, valor_min, valor_max, prazo_max, beneficio, situacao);
                if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(" AND ")}`;
                query += " ORDER BY data_encerramento_proposta ASC LIMIT @limit OFFSET @offset";
                queryParams.limit = limit;
                queryParams.offset = offset;
                const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: queryParams });
                const nextOffset = rows.length === limit ? offset + limit : null;
                res.status(200).json({ items: rows.map(serializeBqRow), nextOffset });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getOportunidades", mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify({ reqQuery: req.query }) });
                res.status(500).send("Erro interno ao buscar oportunidades.");
        }
});

app.post('/logError', async (req, res) => {
        let clienteId = "frontend_anonimo";
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                try {
                        const idToken = req.headers.authorization.split('Bearer ')[1];
                        const decodedToken = await getAuth().verifyIdToken(idToken, false);
                        clienteId = decodedToken.uid;
                } catch { /* Ignore token validation errors, just log anonymously */ }
        }
        try {
                const { mensagem } = req.body;
                if (!mensagem) {
                        return res.status(400).send({ message: "Campo 'mensagem' é obrigatório." });
                }
                await logErrorToBigQuery({ ...req.body, cliente_id: clienteId, severidade: "FRONTEND_ERROR" });
                return res.status(202).send({ message: "Erro registrado com sucesso." });
        } catch (error: any) {
                logger.error("ERRO CRÍTICO no endpoint /logError:", { errorMessage: error.message });
                return res.status(500).send({ message: "Erro interno no servidor de log." });
        }
});

// --- ROTAS AUTENTICADAS PARA USUÁRIOS (protegidas individualmente) ---
app.get('/getScoredOportunidades', userAuthMiddleware, userPlanMiddleware, oportunidadesQuotaMiddleware, async (req, res) => {
        try {
                const uid = req.uid!;
                const { uf, q, modalidade, valor_min, valor_max, prazo_max, beneficio, situacao, limit: limitStr, offset: offsetStr } = req.query;
                const limit = Math.min(parseInt(limitStr as string) || 21, 100); // cap em 100 por segurança
                const offset = parseInt(offsetStr as string) || 0;
                let query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${TABLE_FUNCTION_SCORED}\`(@cliente_id)`;
                const whereClauses: string[] = [];
                const queryParams: Record<string, any> = { cliente_id: uid };
                applyCommonFilters(whereClauses, queryParams, q, uf, modalidade, valor_min, valor_max, prazo_max, beneficio, situacao);
                if (whereClauses.length > 0) {
                        query = `SELECT * FROM (${query}) AS scored_ops WHERE ${whereClauses.join(" AND ")}`;
                }
                query += " ORDER BY score_oportunidade DESC LIMIT @limit OFFSET @offset";
                queryParams.limit = limit;
                queryParams.offset = offset;
                const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: queryParams });
                const nextOffset = rows.length === limit ? offset + limit : null;
                res.status(200).json({ items: rows.map(serializeBqRow), nextOffset, plano: req.planInfo?.plano || 'free' });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getScoredOportunidades", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify({ reqQuery: req.query }) });
                res.status(500).json({ message: 'Erro interno ao processar o ranking.' });
        }
});

app.get('/getPlanoAtual', userAuthMiddleware, userPlanMiddleware, async (req, res) => {
        const planInfo = req.planInfo!;
        const isInTrial = planInfo.status_pagamento.toLowerCase() === 'trial';
        let trialDiasRestantes: number | null = null;
        if (isInTrial && planInfo.trial_fim) {
                const fim = new Date(planInfo.trial_fim);
                const agora = new Date();
                trialDiasRestantes = Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)));
        }
        res.status(200).json({
                plano: planInfo.plano,
                status_pagamento: planInfo.status_pagamento,
                limites: {
                        uf: planInfo.limite_uf,
                        oportunidades: planInfo.limite_oportunidades,
                        docs: planInfo.limite_docs,
                        produtos: planInfo.limite_produtos,
                },
                tenant_id: planInfo.tenant_id,
                trial: isInTrial ? {
                        ativo: true,
                        dias_restantes: trialDiasRestantes,
                        trial_fim: planInfo.trial_fim,
                } : null,
        });
});

app.get('/getClienteConfiguracoes', userAuthMiddleware, async (req, res) => {
        try {
                const query = `SELECT palavra_chave, peso FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\` WHERE cliente_id = @cliente_id ORDER BY peso DESC`;
                const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: { cliente_id: req.uid } });
                res.status(200).json({ palavrasChave: rows.map(serializeBqRow) });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getClienteConfiguracoes", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack });
                res.status(500).json({ message: 'Erro interno ao buscar configurações.' });
        }
});

app.post('/addPalavraChave', userAuthMiddleware, async (req, res) => {
        try {
                const { palavraChave, peso } = req.body;
                if (!palavraChave) return res.status(400).json({ message: "Parâmetro 'palavraChave' é obrigatório." });
                const finalPeso = typeof peso === 'number' && !isNaN(peso) ? peso : 1;
                const query = `MERGE \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\` T
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 USING (SELECT @clienteId AS cliente_id, @palavraChave AS palavra_chave) S
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ON T.cliente_id = S.cliente_id AND T.palavra_chave = S.palavra_chave
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     WHEN MATCHED THEN UPDATE SET peso = @finalPeso, data_ultima_modificacao = CURRENT_TIMESTAMP()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               WHEN NOT MATCHED THEN INSERT (cliente_id, palavra_chave, peso, data_criacao, data_ultima_modificacao)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         VALUES(@clienteId, @palavraChave, @finalPeso, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`;
                await bq.query({ query, params: { clienteId: req.uid, palavraChave: palavraChave.toLowerCase(), finalPeso } });
                return res.status(200).json({ success: true });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "addPalavraChave", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro interno ao salvar palavra-chave.' });
        }
});

app.post('/removePalavraChave', userAuthMiddleware, async (req, res) => {
        try {
                const { palavraChave } = req.body;
                if (!palavraChave) return res.status(400).json({ message: "Parâmetro 'palavraChave' é obrigatório." });
                const query = `DELETE FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente_configuracoes\` WHERE cliente_id = @clienteId AND palavra_chave = @palavraChave`;
                await bq.query({ query, params: { clienteId: req.uid, palavraChave: palavraChave.toLowerCase() } });
                return res.status(200).json({ success: true });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "removePalavraChave", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro interno ao remover palavra-chave.' });
        }
});

app.get('/getDetalhesOportunidade', userAuthMiddleware, userPlanMiddleware, async (req, res) => {
        try {
                const { id } = req.query;
                if (!id || typeof id !== 'string') return res.status(400).json({ message: "Parâmetro 'id' obrigatório." });
                // Busca em core.contratacoes (fonte de verdade normalizada, não no raw stg)
                const query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.contratacoes\` WHERE id_pncp = @id LIMIT 1`;
                const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION, params: { id } });
                if (!rows || rows.length === 0) return res.status(404).json({ message: "Oportunidade não encontrada." });
                const row = serializeBqRow(rows[0]);

                // Enriquecimento: se modalidade_nome ou modo_disputa_nome estão ausentes,
                // busca diretamente na API pública do PNCP como fallback
                if (!row.modalidade_nome || !row.modo_disputa_nome) {
                        try {
                                const m = (id as string).match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
                                if (m) {
                                        const [, cnpj, , seq, ano] = m;
                                        const seqN = parseInt(seq, 10);
                                        const pncpApiUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seqN}`;
                                        const pncpRes = await fetch(pncpApiUrl, {
                                                headers: { Accept: "application/json" },
                                                signal: AbortSignal.timeout(6_000),
                                        });
                                        if (pncpRes.ok) {
                                                const pncpData: any = await pncpRes.json();
                                                if (!row.modalidade_nome)    row.modalidade_nome    = pncpData.nomeModalidadeContratacao  || pncpData.modalidadeNome || null;
                                                if (!row.modo_disputa_nome)  row.modo_disputa_nome  = pncpData.nomeModoDisputa             || pncpData.modoDisputaNome || null;
                                                if (!row.criterio_julgamento) row.criterio_julgamento = pncpData.criterioJulgamentoNome   || null;
                                                if (!row.amparo_legal)        row.amparo_legal        = pncpData.amparoLegal?.descricao     || null;
                                                if (!row.categoria_processo)  row.categoria_processo  = pncpData.categoriaProcessoNome     || null;
                                                if (!row.tipo_beneficio)      row.tipo_beneficio      = pncpData.tipoBeneficioNome         || null;
                                                if (!row.situacao_nome)       row.situacao_nome       = pncpData.situacaoCompraNome        || null;
                                                if (!row.nome_orgao)          row.nome_orgao          = pncpData.orgaoEntidade?.razaoSocial || null;
                                                if (!row.cnpj_orgao)         row.cnpj_orgao          = pncpData.orgaoEntidade?.cnpj        || null;
                                                if (!row.nome_unidade_orgao)  row.nome_unidade_orgao  = pncpData.unidadeOrgao?.nomeUnidade  || null;
                                                if (!row.valor_total_estimado) row.valor_total_estimado = pncpData.valorTotalEstimado      || null;
                                        }
                                }
                        } catch (enrichErr: any) {
                                logger.warn("Enriquecimento PNCP falhou (não crítico):", enrichErr.message);
                        }
                }

                return res.status(200).json(row);
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getDetalhesOportunidade", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.query) });
                return res.status(500).json({ message: 'Erro interno ao buscar detalhes.' });
        }
});

app.post('/iniciarBackfill', userAuthMiddleware, async (req, res) => {
        try {
                const { inicio, fim } = req.body;
                const dataInicioStr = (inicio as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                const dataFimStr = (fim as string) || new Date().toISOString().slice(0, 10);
                const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
                const tasksClient = new CloudTasksClient();
                const queuePath = tasksClient.queuePath(GCP_PROJECT_ID, FUNCTIONS_REGION, CLOUD_TASKS_QUEUE_NAME);
                const workerUrl = `https://${FUNCTIONS_REGION}-${GCP_PROJECT_ID}.cloudfunctions.net/coletarPncp`;
                const taskPromises: Promise<any>[] = [];
                let currentDate = new Date(dataInicioStr);
                const endDate = new Date(dataFimStr);
                while (currentDate <= endDate) {
                        const dateString = currentDate.toISOString().slice(0, 10);
                        for (const uf of ufs) {
                                const task = {
                                        httpRequest: {
                                                httpMethod: 'GET' as const,
                                                url: `${workerUrl}?uf=${uf}&data=${dateString}`,
                                        },
                                };
                                taskPromises.push(tasksClient.createTask({ parent: queuePath, task }));
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                }
                await Promise.all(taskPromises);
                res.status(200).send(`${taskPromises.length} tarefas de coleta enfileiradas com sucesso.`);
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "iniciarBackfill", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                res.status(500).send("Falha ao enfileirar tarefas de backfill.");
        }
});

app.post('/generateUploadUrl', adminAuthMiddleware, async (req, res) => {
        try {
                const { fileName, contentType } = req.body;
                if (!fileName || !contentType) {
                        return res.status(400).json({ message: 'fileName e contentType são obrigatórios.' });
                }

                const uid = req.uid!; // uid vem do adminAuthMiddleware

                // Organiza os arquivos em uma pasta "uploads" dentro do bucket.
                // O nome final será algo como: uploads/2bfsnZTOaW.../167...-meu-documento.pdf
                const filePath = `uploads/${uid}/${Date.now()}-${fileName}`;

                const options = {
                        version: 'v4' as const,
                        action: 'write' as const,
                        expires: Date.now() + 15 * 60 * 1000, // URL expira em 15 minutos
                        contentType: contentType,
                };

                // Gera a URL assinada usando a constante KNOWLEDGE_BUCKET
                const [url] = await storage
                        .bucket(KNOWLEDGE_BUCKET)
                        .file(filePath)
                        .getSignedUrl(options);

                return res.status(200).json({ signedUrl: url });

        } catch (error: any) {
                logger.error("Erro ao gerar a URL assinada de upload", { error: error.message, stack: error.stack });
                await logErrorToBigQuery({
                        funcao_ou_componente: "generateUploadUrl",
                        cliente_id: req.uid,
                        mensagem: error.message,
                        stack_trace: error.stack,
                        contexto: JSON.stringify(req.body)
                });
                return res.status(500).json({ message: 'Erro interno ao gerar URL de upload.' });
        }
});

// --- ROTAS DE ADMIN (protegidas individualmente com adminAuthMiddleware) ---
app.post("/assistenteSprint", adminAuthMiddleware, async (req, res) => {
        try {
                let { userPrompt, projectContext } = req.body; // Alterado para 'let' para permitir modificação

                if (!userPrompt || userPrompt.trim() === '') {
                        return res.status(400).json({ message: "O 'userPrompt' não pode ser vazio." });
                }

                // ===== INÍCIO DA LÓGICA DE CONTEXTO DINÂMICO FULL-STACK =====
                try {
                        // Caminho para o index.ts (backend)
                        // __dirname aponta para '.../functions/lib', então voltamos um para 'functions' e entramos em 'src'
                        const backendCodePath = path.join(__dirname, '..', 'src', 'index.ts');
                        const backendCode = fs.readFileSync(backendCodePath, 'utf-8');

                        // Caminho para o index.html (frontend)
                        // A partir de '.../functions/lib', voltamos dois níveis para a raiz do projeto e entramos em 'public'
                        const frontendCodePath = path.join(__dirname, '..', '..', 'public', 'index.html');
                        const frontendCode = fs.readFileSync(frontendCodePath, 'utf-8');

                        // Injetamos AMBOS os arquivos no projectContext
                        projectContext = {
                                ...(projectContext || {}),
                                current_code_files: [
                                        {
                                                file_path: "functions/src/index.ts",
                                                content: backendCode
                                        },
                                        {
                                                file_path: "public/index.html",
                                                content: frontendCode
                                        }
                                ]
                        };
                        logger.info("Códigos-fonte do backend (index.ts) e frontend (index.html) carregados dinamicamente para o contexto.");

                } catch (codeError: any) {
                        logger.error("Falha ao carregar os códigos-fonte dinamicamente.", { error: codeError.message });
                        // A execução continua mesmo se a leitura dos arquivos falhar.
                }
                // ===== FIM DA LÓGICA DE CONTEXTO DINÂMICO =====


                // ===== CARREGAR O DNA DO PROJETO =====
                let projectDnaContext = "O DNA do projeto não foi encontrado ou está vazio.";
                try {
                        const dnaQuery = `SELECT content FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.project_dna\` WHERE id = 'main' LIMIT 1`;
                        const [dnaRows] = await bq.query({ query: dnaQuery });
                        if (dnaRows.length > 0 && dnaRows[0].content) {
                                projectDnaContext = dnaRows[0].content;
                                logger.info("DNA do Projeto carregado com sucesso para o contexto da IA.");
                        }
                } catch (dnaError: any) {
                        logger.error("Falha ao carregar o DNA do projeto para o contexto da IA", { error: dnaError.message });
                        projectDnaContext = "Ocorreu um erro ao tentar carregar o DNA do projeto.";
                }
                // ===== FIM DO CARREGAMENTO DO DNA =====


                // Lógica de busca vetorial (inalterada)
                let knowledgeContext = "Nenhuma informação relevante foi encontrada na base de conhecimento.";
                try {
                        const queryEmbedding = await embedTextREST(userPrompt);
                        const vectorSearchQuery = `SELECT content FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${TABLE_KNOWLEDGE_VECTORS}\` ORDER BY COSINE_DISTANCE(embedding, [${queryEmbedding.join(',')}]) ASC LIMIT 5`;

                        logger.info("Executando Query de Busca Vetorial (ORDER BY COSINE_DISTANCE)...");
                        const [contentRows] = await bq.query({ query: vectorSearchQuery, location: BIGQUERY_LOCATION });

                        if (contentRows && contentRows.length > 0) {
                                knowledgeContext = "Foram encontrados os seguintes trechos relevantes na base de conhecimento:\n" + contentRows.map((row: any) => `- ${row.content}`).join("\n");
                                logger.info("Contexto relevante encontrado via COSINE_DISTANCE.");
                        }
                } catch (searchError: any) {
                        logger.error("--- ERRO NA BUSCA VETORIAL (BIGQUERY) ---", { errorMessage: searchError.message, bigQueryErrors: searchError.errors });
                        knowledgeContext = "Ocorreu um erro ao consultar a base de conhecimento.";
                }

                // --- ETAPA FINAL: CHAMADA SEGURA PARA A VERTEX AI ---
                let responseText: string | undefined;
                try {
                        logger.info("Preparando para chamar a IA Generativa (Gemini)...");
                        const generativeModel = new VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION })
                                .getGenerativeModel({
                                        model: "gemini-2.5-pro",
                                        generationConfig: { responseMimeType: "application/json" }
                                });

                        const prompt = `
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         Você é um Arquiteto de Software Sênior e programador full-stack especialista em Google Cloud, TypeScript, e BigQuery.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         Sua tarefa é analisar uma solicitação e gerar um plano de ação claro e o código necessário.

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         **SUA DIRETRIZ MAIS IMPORTANTE E INEGOCIÁVEL:** Você deve obedecer a TODAS as regras, padrões e "Lições Críticas Aprendidas" documentadas no 'DNA DO PROJETO' abaixo. O DNA DO PROJETO é a sua fonte de verdade absoluta e prevalece sobre qualquer outro conhecimento que você tenha. Se uma solicitação do desenvolvedor violar uma regra do DNA, você deve RECUSAR a solicitação e justificar sua recusa citando a regra específica do DNA.

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         --- DNA DO PROJETO ---
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ${projectDnaContext}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         --- FIM DO DNA DO PROJETO ---

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         Contextos adicionais (subordinados ao DNA):
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         1. CONTEXTO INTERNO (Código-fonte atual e outros dados): 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ${projectContext ? JSON.stringify(projectContext, null, 2) : "Não fornecido."}

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            2. CONTEXTO EXTERNO (Busca Vetorial em documentos):
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ${knowledgeContext}

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               SOLICITAÇÃO DO DESENVOLVEDOR: "${userPrompt}"

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               Com base em TODOS os contextos, tratando o DNA DO PROJETO como sua regra máxima e usando o CONTEXTO INTERNO para entender o código existente (backend em 'functions/src/index.ts' e frontend em 'public/index.html'), gere uma resposta no formato JSON.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               Estrutura de resposta JSON:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 "explicacao": "Uma explicação clara. Se recusar a tarefa, explique o porquê aqui, citando o DNA.",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   "alteracoes": [
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             "arquivo": "O caminho completo do arquivo a ser modificado (ex: 'public/index.html' ou 'functions/src/index.ts').",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   "acao": "A ação a ser tomada (ex: 'ADICIONAR ROTA', 'ADICIONAR LÓGICA JAVASCRIPT').",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         "codigo": "O trecho de código completo e pronto para ser copiado e colado."
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ]
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               Retorne APENAS o objeto JSON válido.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           `;

                        logger.info("Enviando prompt para o Gemini...");
                        const result = await generativeModel.generateContent(prompt);
                        responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
                        logger.info("Recebida resposta do Gemini com sucesso.");

                } catch (geminiError: any) {
                        logger.error("--- ERRO CRÍTICO AO CHAMAR A API VERTEX AI (GEMINI) ---", {
                                errorMessage: geminiError.message,
                                errorDetails: (geminiError as any).details,
                                stack: geminiError.stack,
                        });
                        throw new Error("Falha na comunicação com a API de IA Generativa.");
                }

                if (!responseText) {
                        throw new Error("A IA (Gemini) retornou uma resposta vazia.");
                }

                try {
                        return res.status(200).json(JSON.parse(responseText));
                } catch (e: any) {
                        logger.warn("Falha no parse inicial do JSON da IA. Tentando sanitizar a string...", { errorMessage: e.message, responseText: responseText });
                        const sanitizedResponseText = responseText.replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
                        try {
                                const parsedJson = JSON.parse(sanitizedResponseText);
                                logger.info("Parse do JSON bem-sucedido após sanitização.");
                                return res.status(200).json(parsedJson);
                        } catch (finalError: any) {
                                logger.error("ERRO CRÍTICO: Não foi possível fazer o parse do JSON da IA, mesmo após sanitização.", { originalResponse: responseText, sanitizedResponse: sanitizedResponseText, finalErrorMessage: finalError.message });
                                const fallbackResponse = {
                                        explicacao: "A IA gerou uma resposta, mas em um formato de texto que não pôde ser convertido para JSON. Aqui está a resposta bruta:\n\n" + responseText,
                                        alteracoes: []
                                };
                                return res.status(200).json(fallbackResponse);
                        }
                }

        } catch (error: any) {
                logger.error("Erro CRÍTICO no fluxo do assistenteSprint", { message: error.message, stack: error.stack });
                await logErrorToBigQuery({ funcao_ou_componente: "assistenteSprint", cliente_id: req.uid, mensagem: `Falha no fluxo do assistente: ${error.message}`, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao processar a solicitação do assistente de IA." });
        }
});

app.get('/getProjectStructure', adminAuthMiddleware, async (_req, res) => {
        try {
                const jsonPath = path.join(__dirname, "project-structure.json");
                if (fs.existsSync(jsonPath)) {
                        const raw = fs.readFileSync(jsonPath, "utf8");
                        return res.status(200).json(JSON.parse(raw));
                }
                return res.status(404).json({ message: "project-structure.json não encontrado. Execute o build localmente." });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getProjectStructure", cliente_id: "admin", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao ler a estrutura do projeto." });
        }
});

app.get('/getProjectSchema', adminAuthMiddleware, async (_req, res) => {
        try {
                const datasetsToScan = [DATASET_CORE, DATASET_DIM, DATASET_LOG, DATASET_STG];
                const schemaPromises = datasetsToScan.map(async (datasetId) => {
                        const [tables] = await bq.dataset(datasetId).getTables();
                        const tablePromises = tables.map(async (table) => {
                                const [metadata] = await table.getMetadata();
                                return {
                                        id: table.id,
                                        type: metadata.type,
                                        schema: metadata.schema.fields.map((f: any) => ({ name: f.name, type: f.type, mode: f.mode || 'NULLABLE' })),
                                };
                        });
                        return { id: datasetId, tables: await Promise.all(tablePromises) };
                });
                res.status(200).json({ bigquerySchema: await Promise.all(schemaPromises) });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getProjectSchema", cliente_id: "admin", mensagem: error.message, stack_trace: error.stack });
                res.status(500).json({ message: "Erro ao gerar o schema do projeto." });
        }
});

app.get('/getErros', adminAuthMiddleware, async (req, res) => {
        try {
                const limit = parseInt(req.query.limit as string) || 50;
                const offset = parseInt(req.query.offset as string) || 0;
                const status = (req.query.status as string | undefined)?.toUpperCase();

                const params: Record<string, any> = { limit, offset };

                let query = `
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               WITH t AS (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               SELECT *, ROW_NUMBER() OVER(PARTITION BY error_id ORDER BY COALESCE(last_modified, timestamp) DESC) as rn
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               FROM \`${GCP_PROJECT_ID}.${DATASET_LOG}.${TABLE_ERROS}\`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               WHERE error_id IS NOT NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       SELECT * EXCEPT(rn)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   FROM t
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               WHERE rn = 1 AND (status IS NULL OR status != 'DELETADO')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       `;

                if (status && status !== 'TODOS') {
                        query += " AND status = @status";
                        params.status = status;
                }

                query += " ORDER BY COALESCE(last_modified, timestamp) DESC LIMIT @limit OFFSET @offset";

                const [rows] = await bq.query({ query, params, location: BIGQUERY_LOCATION });
                res.status(200).json({ items: rows.map(serializeBqRow), nextOffset: rows.length === limit ? offset + limit : null });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getErros", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack });
                res.status(500).json({ message: "Erro ao buscar logs de erro." });
        }
});

app.post('/gerarErroDeTeste', adminAuthMiddleware, async (req, res) => {
        try {
                await logErrorToBigQuery({
                        severidade: "TEST",
                        ambiente: "backend",
                        funcao_ou_componente: "gerarErroDeTeste",
                        cliente_id: req.uid,
                        mensagem: "Este é um erro de teste gerado intencionalmente.",
                        stack_trace: "at Object.gerarErro (fake_file.js:10:15)",
                        contexto: JSON.stringify({ info: "Acionado pelo admin." }),
                });
                res.status(200).json({ message: "Erro de teste gerado com sucesso." });
        } catch (error: any) {
                logger.error("Falha ao gerar erro de teste", { error: error.message });
                res.status(500).json({ message: "Falha interna ao gerar o erro de teste." });
        }
});

app.post('/updateErrorStatus', adminAuthMiddleware, async (req, res) => {
        try {
                const { errorId, newStatus } = req.body;
                if (!errorId || !newStatus) return res.status(400).json({ message: "errorId e newStatus são obrigatórios." });

                const newRow = { error_id: errorId, status: newStatus, last_modified: new Date().toISOString() };
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([newRow]);
                return res.status(200).json({ success: true, message: `Status do erro ${errorId} atualizado para ${newStatus}.` });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "updateErrorStatus", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro ao atualizar status.' });
        }
});

app.post('/deleteError', adminAuthMiddleware, async (req, res) => {
        try {
                const { errorId } = req.body;
                if (!errorId) return res.status(400).json({ message: "errorId é obrigatório." });

                const row = { error_id: errorId, status: "DELETADO", last_modified: new Date().toISOString() };
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([row]);

                return res.status(200).json({ success: true, message: `Erro ${errorId} marcado como DELETADO.` });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "deleteError", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro ao marcar erro como deletado.' });
        }
});

app.post('/updateErrorStatusBulk', adminAuthMiddleware, async (req, res) => {
        try {
                const { errorIds, newStatus } = req.body;
                if (!Array.isArray(errorIds) || errorIds.length === 0 || !newStatus) {
                        return res.status(400).json({ message: "errorIds (array) e newStatus são obrigatórios." });
                }
                const now = new Date().toISOString();
                const rows = errorIds.map((id: string) => ({ error_id: id, status: newStatus, last_modified: now }));
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert(rows);
                return res.status(200).json({ success: true, message: `${errorIds.length} erros marcados como ${newStatus}.` });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "updateErrorStatusBulk", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro ao atualizar status em massa.' });
        }
});

app.post('/deleteErrorBulk', adminAuthMiddleware, async (req, res) => {
        try {
                const { errorIds } = req.body;
                if (!Array.isArray(errorIds) || errorIds.length === 0) {
                        return res.status(400).json({ message: "errorIds (array) é obrigatório." });
                }

                const now = new Date().toISOString();
                const rows = errorIds.map((id: string) => ({ error_id: id, status: "DELETADO", last_modified: now }));
                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert(rows);

                return res.status(200).json({ success: true, message: `${errorIds.length} erros marcados como DELETADO.` });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "deleteErrorBulk", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: 'Erro ao marcar erros como deletados.' });
        }
});

app.post('/analisarEstruturaComIA', adminAuthMiddleware, async (req, res) => {
        try {
                const { structure } = req.body;
                if (!structure) return res.status(400).json({ message: "Objeto 'structure' é obrigatório." });

                const vertex_ai = new VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION });
                const model = vertex_ai.getGenerativeModel({
                        model: "gemini-2.5-pro",
                        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
                });

                const prompt = `Analise a estrutura de projeto JSON a seguir e retorne um objeto JSON com as chaves "summary", "keyPoints", e "nextSteps".\n\n${JSON.stringify(structure, null, 2)}`;

                const result: any = await executeWithRetry(() => model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }));

                const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (!responseText) throw new Error("A IA retornou uma resposta vazia.");

                return res.status(200).json(JSON.parse(responseText));
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "analisarEstruturaComIA", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "A IA não conseguiu analisar a estrutura." });
        }
});

app.post('/analisarErroComIA', adminAuthMiddleware, async (req, res) => {
        try {
                const { error: errorObj } = req.body;
                if (!errorObj || !errorObj.error_id) return res.status(400).json({ message: "Objeto de erro inválido." });

                const vertex_ai = new VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION });
                const model = vertex_ai.getGenerativeModel({
                        model: "gemini-2.5-pro",
                        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
                });

                const prompt = `Analise o erro a seguir e retorne um JSON com "explicacao" e "sugestao_codigo".\n\n${JSON.stringify(errorObj)}`;
                const result: any = await executeWithRetry(() => model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }));

                const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (!responseText) throw new Error("A IA retornou uma resposta vazia.");
                const analysis = JSON.parse(responseText);

                await bq.dataset(DATASET_LOG).table(TABLE_ERROS).insert([{ error_id: errorObj.error_id, analise_ia: JSON.stringify(analysis), last_modified: new Date().toISOString() }]);

                return res.status(200).json(analysis);
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "analisarErroComIA", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(req.body) });
                return res.status(500).json({ message: "A IA não conseguiu analisar o erro." });
        }
});

// --- ROTAS DE ADMIN PARA O DNA DO PROJETO ---

// Rota para buscar o conteúdo atual do DNA
app.get('/getProjectDna', adminAuthMiddleware, async (_req, res) => {
        try {
                const query = `SELECT content, last_modified FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.project_dna\` WHERE id = 'main' LIMIT 1`;
                const [rows] = await bq.query({ query });

                if (rows.length === 0) {
                        return res.status(404).json({ message: "Documento DNA do projeto não encontrado." });
                }
                return res.status(200).json(serializeBqRow(rows[0]));
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getProjectDna", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: 'Erro ao buscar o DNA do projeto.' });
        }
});

// Rota para salvar (atualizar) o conteúdo do DNA
app.post('/updateProjectDna', adminAuthMiddleware, async (req, res) => {
        try {
                const { content } = req.body;
                if (typeof content !== 'string') {
                        return res.status(400).json({ message: "'content' é obrigatório e deve ser uma string." });
                }

                const query = `
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           UPDATE \`${GCP_PROJECT_ID}.${DATASET_CORE}.project_dna\`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       SET content = @content, last_modified = CURRENT_TIMESTAMP()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   WHERE id = 'main'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           `;
                await bq.query({ query, params: { content } });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        return res.status(200).json({ success: true, message: "DNA do projeto atualizado com sucesso." });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "updateProjectDna", mensagem: error.message, stack_trace: error.stack });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        return res.status(500).json({ message: 'Erro ao salvar o DNA do projeto.' });
        }
});

// --- ROTAS DE ADMIN: INGESTÃO E TRANSFORMAÇÃO (Cloud Scheduler) ---

// POST /admin/ingest/pncp — dispara coleta de uma UF (para Cloud Scheduler / manual)
app.post('/admin/ingest/pncp', adminAuthMiddleware, async (req, res) => {
        try {
                const uf = ((req.body.uf as string) || "MT").toUpperCase();
                const dataParam = req.body.data as string | undefined;
                let dataColeta: string;
                if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
                        dataColeta = dataParam.replace(/-/g, "");
                } else {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        dataColeta = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
                }
                return await coletar(PNCP_API_URL, uf, dataColeta, res);
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "admin/ingest/pncp", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao iniciar ingestão PNCP.", error: error.message });
        }
});

// POST /admin/transform/merge — executa MERGE idempotente stg → core
app.post('/admin/transform/merge', adminAuthMiddleware, async (req, res) => {
        try {
                const mergeQuery = `
                        MERGE \`${GCP_PROJECT_ID}.${DATASET_CORE}.contratacoes\` AS T
                        USING (
                                SELECT
                                        id_pncp, uf, hash_payload,
                                        CURRENT_TIMESTAMP() AS ingest_time,
                                        JSON_VALUE(payload, '$.orgaoEntidade.cnpj')            AS cnpj_orgao,
                                        JSON_VALUE(payload, '$.orgaoEntidade.razaoSocial')     AS nome_orgao,
                                        JSON_VALUE(payload, '$.unidadeOrgao.nomeUnidade')      AS nome_unidade_orgao,
                                        JSON_VALUE(payload, '$.modalidadeNome')                AS modalidade_nome,
                                        JSON_VALUE(payload, '$.modoDisputaNome')               AS modo_disputa_nome,
                                        JSON_VALUE(payload, '$.situacaoCompraNome')            AS situacao_nome,
                                        JSON_VALUE(payload, '$.objetoCompra')                  AS objeto_compra,
                                        JSON_VALUE(payload, '$.tipoBeneficioNome')             AS tipo_beneficio,
                                        JSON_VALUE(payload, '$.criterioJulgamentoNome')        AS criterio_julgamento,
                                        JSON_VALUE(payload, '$.amparoLegal.descricao')         AS amparo_legal,
                                        JSON_VALUE(payload, '$.categoriaProcessoNome')         AS categoria_processo,
                                        SAFE_CAST(JSON_VALUE(payload, '$.valorTotalEstimado') AS NUMERIC)              AS valor_total_estimado,
                                        DATE(SAFE_CAST(JSON_VALUE(payload, '$.dataPublicacaoPncp')    AS DATETIME))    AS data_publicacao_pncp,
                                        SAFE_CAST(JSON_VALUE(payload, '$.dataAberturaProposta')       AS DATETIME)     AS data_abertura_proposta,
                                        SAFE_CAST(JSON_VALUE(payload, '$.dataEncerramentoProposta')   AS DATETIME)     AS data_encerramento_proposta,
                                        ROW_NUMBER() OVER (PARTITION BY id_pncp ORDER BY ingest_time DESC) AS rn
                                FROM \`${GCP_PROJECT_ID}.${DATASET_STG}.${TABLE_CONTRATACOES_RAW}\`
                                WHERE id_pncp IS NOT NULL
                        ) AS S
                        ON T.id_pncp = S.id_pncp AND S.rn = 1
                        WHEN MATCHED AND T.hash_payload != S.hash_payload THEN UPDATE SET
                                T.hash_payload = S.hash_payload, T.cnpj_orgao = S.cnpj_orgao,
                                T.nome_orgao = S.nome_orgao, T.nome_unidade_orgao = S.nome_unidade_orgao,
                                T.modalidade_nome = S.modalidade_nome, T.modo_disputa_nome = S.modo_disputa_nome,
                                T.situacao_nome = S.situacao_nome, T.objeto_compra = S.objeto_compra,
                                T.tipo_beneficio = S.tipo_beneficio, T.criterio_julgamento = S.criterio_julgamento,
                                T.amparo_legal = S.amparo_legal, T.categoria_processo = S.categoria_processo,
                                T.valor_total_estimado = S.valor_total_estimado,
                                T.data_publicacao_pncp = S.data_publicacao_pncp,
                                T.data_abertura_proposta = S.data_abertura_proposta,
                                T.data_encerramento_proposta = S.data_encerramento_proposta,
                                T.ingest_time = S.ingest_time
                        WHEN NOT MATCHED BY TARGET AND S.rn = 1 THEN INSERT (
                                id_pncp, uf, hash_payload, ingest_time,
                                cnpj_orgao, nome_orgao, nome_unidade_orgao,
                                modalidade_nome, modo_disputa_nome, situacao_nome, objeto_compra,
                                tipo_beneficio, criterio_julgamento, amparo_legal, categoria_processo,
                                valor_total_estimado,
                                data_publicacao_pncp, data_abertura_proposta, data_encerramento_proposta
                        ) VALUES (
                                S.id_pncp, S.uf, S.hash_payload, S.ingest_time,
                                S.cnpj_orgao, S.nome_orgao, S.nome_unidade_orgao,
                                S.modalidade_nome, S.modo_disputa_nome, S.situacao_nome, S.objeto_compra,
                                S.tipo_beneficio, S.criterio_julgamento, S.amparo_legal, S.categoria_processo,
                                S.valor_total_estimado,
                                S.data_publicacao_pncp, S.data_abertura_proposta, S.data_encerramento_proposta
                        )
                `;
                const [job] = await bq.createQueryJob({ query: mergeQuery, location: 'US' });
                const [_rows] = await job.getQueryResults();
                const stats = job.metadata?.statistics?.query;
                return res.status(200).json({
                        success: true,
                        message: "MERGE stg → core executado com sucesso.",
                        rowsAffected: stats?.numDmlAffectedRows ?? null
                });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "admin/transform/merge", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao executar MERGE.", error: error.message });
        }
});

// --- ROTAS DE SCHEDULER (autenticadas por SCHEDULER_SECRET) ---

// POST /scheduler/ingest/pncp — chamado pelo Cloud Scheduler às 03h UTC
// Body opcional: { ufs: ["SP", "MG"] } — se omitido, usa UFS_INGEST_DIARIO
// Body opcional: { data: "2026-03-04" } — se omitido, usa ontem
app.post('/scheduler/ingest/pncp', schedulerAuthMiddleware, async (req, res) => {
        const ufsParam = req.body?.ufs;
        const ufs: string[] = (Array.isArray(ufsParam) && ufsParam.length > 0)
                ? ufsParam.map((u: string) => u.toUpperCase())
                : UFS_INGEST_DIARIO;
        const dataParam = req.body?.data as string | undefined;
        let dataColeta: string;
        if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
                dataColeta = dataParam.replace(/-/g, "");
        } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dataColeta = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
        }
        const results: Array<{ uf: string; status: string; detail?: string }> = [];
        logger.info(`[scheduler/ingest/pncp] Iniciando ingestão de ${ufs.length} UFs para data ${dataColeta}`);
        for (const uf of ufs) {
                try {
                        // fakeRes captura a resposta de coletar() sem enviar HTTP real
                        const fakeRes: any = {
                                _status: 200, _body: null,
                                status(s: number) { this._status = s; return this; },
                                json(b: any) { this._body = b; return this; },
                                send(b: any) { this._body = b; return this; },
                        };
                        await coletar(PNCP_API_URL, uf, dataColeta, fakeRes);
                        const isErr = fakeRes._status >= 400;
                        results.push({ uf, status: isErr ? "error" : "ok", detail: String(fakeRes._body ?? "") });
                } catch (err: any) {
                        logger.error(`[scheduler/ingest/pncp] Erro na UF ${uf}: ${err.message}`);
                        await logErrorToBigQuery({ funcao_ou_componente: `scheduler/ingest/pncp/${uf}`, mensagem: err.message, stack_trace: err.stack });
                        results.push({ uf, status: "error", detail: err.message });
                }
        }
        const errors = results.filter(r => r.status === "error").length;
        return res.status(200).json({
                success: errors === 0,
                dataColeta,
                ufsProcessadas: ufs.length,
                erros: errors,
                results,
        });
});

// POST /scheduler/merge — chamado pelo Cloud Scheduler às 05h UTC
app.post('/scheduler/merge', schedulerAuthMiddleware, async (req, res) => {
        try {
                const mergeQuery = `
                        MERGE \`${GCP_PROJECT_ID}.${DATASET_CORE}.contratacoes\` AS T
                        USING (
                                SELECT
                                        id_pncp, uf, hash_payload,
                                        CURRENT_TIMESTAMP() AS ingest_time,
                                        JSON_VALUE(payload, '$.orgaoEntidade.cnpj')            AS cnpj_orgao,
                                        JSON_VALUE(payload, '$.orgaoEntidade.razaoSocial')     AS nome_orgao,
                                        JSON_VALUE(payload, '$.unidadeOrgao.nomeUnidade')      AS nome_unidade_orgao,
                                        JSON_VALUE(payload, '$.modalidadeNome')                AS modalidade_nome,
                                        JSON_VALUE(payload, '$.modoDisputaNome')               AS modo_disputa_nome,
                                        JSON_VALUE(payload, '$.situacaoCompraNome')            AS situacao_nome,
                                        JSON_VALUE(payload, '$.objetoCompra')                  AS objeto_compra,
                                        JSON_VALUE(payload, '$.tipoBeneficioNome')             AS tipo_beneficio,
                                        JSON_VALUE(payload, '$.criterioJulgamentoNome')        AS criterio_julgamento,
                                        JSON_VALUE(payload, '$.amparoLegal.descricao')         AS amparo_legal,
                                        JSON_VALUE(payload, '$.categoriaProcessoNome')         AS categoria_processo,
                                        SAFE_CAST(JSON_VALUE(payload, '$.valorTotalEstimado') AS NUMERIC)              AS valor_total_estimado,
                                        DATE(SAFE_CAST(JSON_VALUE(payload, '$.dataPublicacaoPncp')    AS DATETIME))    AS data_publicacao_pncp,
                                        SAFE_CAST(JSON_VALUE(payload, '$.dataAberturaProposta')       AS DATETIME)     AS data_abertura_proposta,
                                        SAFE_CAST(JSON_VALUE(payload, '$.dataEncerramentoProposta')   AS DATETIME)     AS data_encerramento_proposta,
                                        ROW_NUMBER() OVER (PARTITION BY id_pncp ORDER BY ingest_time DESC) AS rn
                                FROM \`${GCP_PROJECT_ID}.${DATASET_STG}.${TABLE_CONTRATACOES_RAW}\`
                                WHERE id_pncp IS NOT NULL
                        ) AS S
                        ON T.id_pncp = S.id_pncp AND S.rn = 1
                        WHEN MATCHED AND T.hash_payload != S.hash_payload THEN UPDATE SET
                                T.hash_payload = S.hash_payload, T.cnpj_orgao = S.cnpj_orgao,
                                T.nome_orgao = S.nome_orgao, T.nome_unidade_orgao = S.nome_unidade_orgao,
                                T.modalidade_nome = S.modalidade_nome, T.modo_disputa_nome = S.modo_disputa_nome,
                                T.situacao_nome = S.situacao_nome, T.objeto_compra = S.objeto_compra,
                                T.tipo_beneficio = S.tipo_beneficio, T.criterio_julgamento = S.criterio_julgamento,
                                T.amparo_legal = S.amparo_legal, T.categoria_processo = S.categoria_processo,
                                T.valor_total_estimado = S.valor_total_estimado,
                                T.data_publicacao_pncp = S.data_publicacao_pncp,
                                T.data_abertura_proposta = S.data_abertura_proposta,
                                T.data_encerramento_proposta = S.data_encerramento_proposta,
                                T.ingest_time = S.ingest_time
                        WHEN NOT MATCHED BY TARGET AND S.rn = 1 THEN INSERT (
                                id_pncp, uf, hash_payload, ingest_time,
                                cnpj_orgao, nome_orgao, nome_unidade_orgao,
                                modalidade_nome, modo_disputa_nome, situacao_nome, objeto_compra,
                                tipo_beneficio, criterio_julgamento, amparo_legal, categoria_processo,
                                valor_total_estimado,
                                data_publicacao_pncp, data_abertura_proposta, data_encerramento_proposta
                        ) VALUES (
                                S.id_pncp, S.uf, S.hash_payload, S.ingest_time,
                                S.cnpj_orgao, S.nome_orgao, S.nome_unidade_orgao,
                                S.modalidade_nome, S.modo_disputa_nome, S.situacao_nome, S.objeto_compra,
                                S.tipo_beneficio, S.criterio_julgamento, S.amparo_legal, S.categoria_processo,
                                S.valor_total_estimado,
                                S.data_publicacao_pncp, S.data_abertura_proposta, S.data_encerramento_proposta
                        )
                `;
                const [job] = await bq.createQueryJob({ query: mergeQuery, location: 'US' });
                const [_rows] = await job.getQueryResults();
                const stats = job.metadata?.statistics?.query;
                logger.info(`[scheduler/merge] MERGE concluído. rowsAffected=${stats?.numDmlAffectedRows ?? 'n/a'}`);
                return res.status(200).json({
                        success: true,
                        message: "MERGE stg → core executado com sucesso.",
                        rowsAffected: stats?.numDmlAffectedRows ?? null,
                });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "scheduler/merge", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao executar MERGE.", error: error.message });
        }
});

// =============================================================================
// BILLING — MERCADO PAGO
// Status: STUB — aguardando credenciais (ver LEDGER P-MP-01)
// Para ativar: definir MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, MP_PLAN_ID_PRO,
//              MP_PLAN_ID_ENTERPRISE em .env.uniquex-487718 e redeploy.
// Documentação MP Subscriptions: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/landing
// =============================================================================

// POST /billing/checkout
// Cria uma preferência de assinatura no Mercado Pago e retorna a URL de checkout.
// Body: { plano: "pro" | "enterprise" }
// Response: { checkout_url: string, preference_id: string }
app.post('/billing/checkout', userAuthMiddleware, async (req: any, res) => {
        if (!isMpConfigured()) {
                return res.status(503).json({
                        message: "Pagamentos ainda não configurados. Entre em contato pelo suporte.",
                        pendente: "MP_ACCESS_TOKEN",
                });
        }
        try {
                const uid: string    = req.user?.uid;
                const email: string  = req.user?.email || "";
                const tenantId       = uid;
                const { plano }      = req.body as { plano?: string };
                if (!plano || !["pro", "enterprise"].includes(plano)) {
                        return res.status(400).json({ message: "plano deve ser 'pro' ou 'enterprise'." });
                }
                const planId = plano === "enterprise" ? MP_PLAN_ID_ENTERPRISE : MP_PLAN_ID_PRO;
                if (!planId) return res.status(400).json({ message: `MP_PLAN_ID_${plano.toUpperCase()} não configurado.` });

                const origin = (req.headers.origin as string) || "https://liciai-uniquex-487718.web.app";

                // Cria preferência de assinatura via MP Subscriptions API
                const mpRes = await axios.post(
                        `${MP_BASE_URL}/preapproval_plan`,
                        {
                                reason: `LiciAI ${plano.charAt(0).toUpperCase() + plano.slice(1)}`,
                                auto_recurring: {
                                        frequency: 1,
                                        frequency_type: "months",
                                        transaction_amount: plano === "enterprise" ? 497 : 197,
                                        currency_id: "BRL",
                                },
                                payer_email: email,
                                external_reference: JSON.stringify({ uid, tenantId, plano }),
                                back_url: `${origin}/planos?checkout=success`,
                        },
                        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" } }
                );

                const preferenceId: string = mpRes.data.id;
                const checkoutUrl: string  = mpRes.data.init_point;
                logger.info("[billing/checkout] Preferência MP criada", { uid, plano, preferenceId });
                return res.json({ checkout_url: checkoutUrl, preference_id: preferenceId });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "billing/checkout", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao criar checkout.", error: error.message });
        }
});

// GET /billing/status
// Retorna plano atual, status de pagamento e dias de trial restantes para o usuário.
app.get('/billing/status', userAuthMiddleware, userPlanMiddleware, async (req: any, res) => {
        try {
                const uid = req.user?.uid;
                const [rows] = await bq.query({
                        query: `SELECT plano, status_pagamento, trial_inicio, trial_fim,
                                       mp_customer_id, mp_subscription_id
                                FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\`
                                WHERE cliente_id = @uid LIMIT 1`,
                        params: { uid },
                        location: "US",
                });
                if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado." });
                return res.json({ billing: rows.map(serializeBqRow)[0] });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "billing/status", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao buscar status de billing.", error: error.message });
        }
});

// POST /billing/webhook
// Recebe notificações do Mercado Pago (IPN/webhook).
// MP envia: { type: "payment" | "subscription_preapproval", data: { id: string } }
// Valida assinatura HMAC-SHA256 via header x-signature quando MP_WEBHOOK_SECRET estiver configurado.
app.post('/billing/webhook', express.raw({ type: "application/json" }), async (req, res) => {
        if (!isMpConfigured()) return res.status(503).json({ message: "Mercado Pago não configurado." });
        try {
                // Validação de assinatura (opcional mas recomendado)
                if (MP_WEBHOOK_SECRET) {
                        const xSignature = req.headers["x-signature"] as string ?? "";
                        const xRequestId = req.headers["x-request-id"] as string ?? "";
                        const urlParams  = new URLSearchParams(req.headers["x-query-params"] as string ?? "");
                        const dataId     = urlParams.get("data.id") ?? "";
                        const manifest   = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(";").find(p => p.startsWith("ts="))?.slice(3) ?? ""}` ;
                        const expected   = require("crypto").createHmac("sha256", MP_WEBHOOK_SECRET).update(manifest).digest("hex");
                        const received   = xSignature.split(";").find(p => p.startsWith("v1="))?.slice(3) ?? "";
                        if (expected !== received) {
                                logger.warn("[billing/webhook] Assinatura MP inválida");
                                return res.status(400).json({ message: "Assinatura inválida." });
                        }
                }

                const body: any = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString() : req.body);
                const { type, data } = body as { type: string; data: { id: string } };
                logger.info("[billing/webhook] Evento recebido", { type, id: data?.id });

                // Evento: assinatura aprovada / paga
                if (type === "subscription_preapproval" && data?.id) {
                        const subRes = await axios.get(`${MP_BASE_URL}/preapproval/${data.id}`, {
                                headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
                        });
                        const sub = subRes.data;
                        if (sub.status === "authorized") {
                                let extRef: any = {};
                                try { extRef = JSON.parse(sub.external_reference || "{}"); } catch {}
                                const { uid, tenantId, plano } = extRef;
                                if (tenantId && plano) {
                                        const [job] = await bq.createQueryJob({
                                                query: `UPDATE \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\`
                                                        SET plano = @plano, status_pagamento = 'ativo',
                                                            mp_customer_id = @customerId, mp_subscription_id = @subId
                                                        WHERE tenant_id = @tenantId`,
                                                params: { plano, customerId: String(sub.payer_id ?? ""), subId: data.id, tenantId },
                                                location: "US",
                                        });
                                        await job.getQueryResults();
                                        logger.info(`[billing/webhook] Plano ${plano} ativado para ${tenantId}`);
                                        // Enviar email de boas-vindas ao plano (se SendGrid configurado)
                                        await _sendEmailSafe({
                                                to: sub.payer_email ?? "",
                                                subject: `Bem-vindo ao LiciAI ${plano.charAt(0).toUpperCase() + plano.slice(1)}!`,
                                                text: `Seu plano ${plano} foi ativado com sucesso. Acesse: https://liciai-uniquex-487718.web.app`,
                                        });
                                        void uid;
                                }
                        }
                }

                // Evento: assinatura cancelada
                if (type === "subscription_preapproval") {
                        const subRes = await axios.get(`${MP_BASE_URL}/preapproval/${data.id}`, {
                                headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
                        });
                        const sub = subRes.data;
                        if (["cancelled", "paused"].includes(sub.status)) {
                                let extRef: any = {};
                                try { extRef = JSON.parse(sub.external_reference || "{}"); } catch {}
                                const { tenantId } = extRef;
                                if (tenantId) {
                                        const [job] = await bq.createQueryJob({
                                                query: `UPDATE \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\`
                                                        SET plano = 'free', status_pagamento = 'cancelado'
                                                        WHERE tenant_id = @tenantId`,
                                                params: { tenantId },
                                                location: "US",
                                        });
                                        await job.getQueryResults();
                                        logger.info(`[billing/webhook] Plano cancelado → downgrade free para ${tenantId}`);
                                }
                        }
                }

                return res.json({ received: true });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "billing/webhook", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro no webhook.", error: error.message });
        }
});

// =============================================================================
// EMAIL — SENDGRID
// Status: STUB — aguardando credenciais (ver LEDGER P-SG-01)
// Para ativar: definir SENDGRID_API_KEY e SENDGRID_FROM_EMAIL em .env e redeploy.
// Documentação SendGrid: https://docs.sendgrid.com/api-reference/mail-send
// =============================================================================

// Helper interno para enviar email sem lançar exceção (fire-and-forget seguro)
async function _sendEmailSafe(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
        if (!isSgConfigured() || !opts.to) return;
        try {
                await sgMail.send({ from: SENDGRID_FROM_EMAIL, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html ?? opts.text });
                logger.info("[email] Enviado", { to: opts.to, subject: opts.subject });
        } catch (err: any) {
                logger.error("[email] Falha ao enviar", { to: opts.to, error: err.message });
        }
}

// POST /email/sendBemVindo
// Envia email de boas-vindas para um usuário recém-criado.
// Body: { uid: string } — admin apenas
app.post('/email/sendBemVindo', adminAuthMiddleware, async (req, res) => {
        if (!isSgConfigured()) return res.status(503).json({ message: "SendGrid não configurado.", pendente: "SENDGRID_API_KEY" });
        try {
                const { uid } = req.body as { uid?: string };
                if (!uid) return res.status(400).json({ message: "uid é obrigatório." });
                const [rows] = await bq.query({
                        query: `SELECT email, nome_exibicao FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\` WHERE cliente_id = @uid LIMIT 1`,
                        params: { uid }, location: "US",
                });
                if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado." });
                const { email, nome_exibicao } = rows[0];
                await _sendEmailSafe({
                        to: email,
                        subject: "Bem-vindo ao LiciAI — seu radar de licitações",
                        text: `Olá ${nome_exibicao || ""},\n\nSeu acesso ao LiciAI está ativo. Acesse agora: https://liciai-uniquex-487718.web.app\n\nEquipe LiciAI`,
                });
                return res.json({ sent: true, to: email });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "email/sendBemVindo", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao enviar email.", error: error.message });
        }
});

// POST /email/sendAlertaOportunidades
// Envia email de alerta com as N melhores oportunidades do dia para um usuário.
// Body: { uid: string, limit?: number } — admin apenas
app.post('/email/sendAlertaOportunidades', adminAuthMiddleware, async (req, res) => {
        if (!isSgConfigured()) return res.status(503).json({ message: "SendGrid não configurado.", pendente: "SENDGRID_API_KEY" });
        try {
                const { uid, limit = 5 } = req.body as { uid?: string; limit?: number };
                if (!uid) return res.status(400).json({ message: "uid é obrigatório." });
                // Buscar oportunidades top do dia
                const [opRows] = await bq.query({
                        query: `SELECT objeto_compra, modalidade_nome, valor_total_estimado, data_encerramento_proposta
                                FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${VIEW_OPORTUNIDADES}\`
                                ORDER BY score_oportunidade DESC LIMIT @limit`,
                        params: { limit: Math.min(Number(limit), 10) }, location: "US",
                });
                // Buscar email do usuário
                const [userRows] = await bq.query({
                        query: `SELECT email, nome_exibicao FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.cliente\` WHERE cliente_id = @uid LIMIT 1`,
                        params: { uid }, location: "US",
                });
                if (!userRows.length) return res.status(404).json({ message: "Usuário não encontrado." });
                const { email, nome_exibicao } = userRows[0];
                const lista = opRows.map((op: any, i: number) => `${i+1}. ${op.objeto_compra?.slice(0,80) ?? "—"} — R$ ${op.valor_total_estimado ?? "?"}`).join("\n");
                await _sendEmailSafe({
                        to: email,
                        subject: `LiciAI — ${opRows.length} oportunidades de hoje para você`,
                        text: `Olá ${nome_exibicao || ""},\n\nSuas top oportunidades de hoje:\n\n${lista}\n\nAcesse: https://liciai-uniquex-487718.web.app\n\nEquipe LiciAI`,
                });
                return res.json({ sent: true, to: email, count: opRows.length });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "email/sendAlertaOportunidades", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao enviar alerta.", error: error.message });
        }
});

// =============================================================================
// BILLING — AUTOMAÇÃO DE DOWNGRADE (EXPIRAÇÃO DE TRIALS)
// =============================================================================

// POST /admin/billing/expire-trials
// Processa expiração automática de trials e faz downgrade para plano free.
// Deve ser chamado diariamente pelo Cloud Scheduler (cron: 0 1 * * *)
// Admin/System authentication required
app.post('/admin/billing/expire-trials', adminAuthMiddleware, async (req, res) => {
        try {
                const tableName = await resolveClientTableName();
                
                // Buscar trials expirados
                const query = `
                        SELECT cliente_id, email, tenant_id, nome_exibicao, trial_fim
                        FROM \`${GCP_PROJECT_ID}.${DATASET_DIM}.${tableName}\`
                        WHERE status_pagamento = 'trial'
                          AND trial_fim IS NOT NULL
                          AND trial_fim <= CURRENT_TIMESTAMP()
                `;
                
                const [rows] = await bq.query({ query, location: BIGQUERY_LOCATION });
                
                if (rows.length === 0) {
                        return res.status(200).json({ 
                                expired_count: 0,
                                message: "Nenhum trial expirado encontrado" 
                        });
                }
                
                const freeLimits = LIMITES_PADRAO_POR_PLANO['free'];
                let successCount = 0;
                let errorCount = 0;
                
                for (const row of rows) {
                        try {
                                // Downgrade para free
                                const updateQuery = `
                                        UPDATE \`${GCP_PROJECT_ID}.${DATASET_DIM}.${tableName}\`
                                        SET 
                                                plano = 'free',
                                                status_pagamento = 'ativo',
                                                limite_uf = @limite_uf,
                                                limite_oportunidades = @limite_oportunidades,
                                                limite_docs = @limite_docs,
                                                limite_produtos = @limite_produtos,
                                                data_ultima_modificacao = CURRENT_TIMESTAMP()
                                        WHERE cliente_id = @cliente_id
                                `;
                                
                                await bq.query({ 
                                        query: updateQuery, 
                                        location: BIGQUERY_LOCATION,
                                        params: { 
                                                cliente_id: row.cliente_id,
                                                limite_uf: freeLimits.limite_uf,
                                                limite_oportunidades: freeLimits.limite_oportunidades,
                                                limite_docs: freeLimits.limite_docs,
                                                limite_produtos: freeLimits.limite_produtos,
                                        }
                                });
                                
                                // Registrar evento
                                await bq.dataset(DATASET_LOG).table('billing_events').insert([{
                                        event_id: randomUUID(),
                                        tenant_id: row.tenant_id || row.cliente_id,
                                        evento_tipo: 'trial_expired',
                                        plano_anterior: 'trial',
                                        plano_novo: 'free',
                                        payload: JSON.stringify({
                                                cliente_id: row.cliente_id,
                                                email: row.email,
                                                trial_fim: row.trial_fim,
                                        }),
                                        ocorrido_em: new Date().toISOString(),
                                }]);
                                
                                // Enviar email de notificação (se configurado)
                                if (isSgConfigured() && row.email) {
                                        await _sendEmailSafe({
                                                to: row.email,
                                                subject: "Seu período de trial expirou - LiciAI",
                                                text: `Olá ${row.nome_exibicao || ""},\n\nSeu período de trial de 7 dias expirou.\n\nVocê foi movido para o plano Free com acesso a:\n- 1 UF\n- 20 oportunidades/mês\n- 3 documentos\n\nPara continuar com recursos avançados, faça upgrade:\nhttps://liciai-uniquex-487718.web.app/planos\n\nEquipe LiciAI`,
                                        });
                                }
                                
                                logger.info('Trial expired and downgraded', { 
                                        cliente_id: row.cliente_id, 
                                        email: row.email,
                                        trial_fim: row.trial_fim 
                                });
                                
                                successCount++;
                        } catch (err: any) {
                                logger.error('Error expiring trial', { 
                                        cliente_id: row.cliente_id, 
                                        error: err.message 
                                });
                                errorCount++;
                        }
                }
                
                return res.status(200).json({ 
                        expired_count: rows.length,
                        success_count: successCount,
                        error_count: errorCount,
                        message: `${successCount} trials expirados processados com sucesso, ${errorCount} erros`
                });
                
        } catch (error: any) {
                await logErrorToBigQuery({ 
                        funcao_ou_componente: "admin/billing/expire-trials", 
                        mensagem: error.message, 
                        stack_trace: error.stack 
                });
                return res.status(500).json({ error: error.message });
        }
});

// --- ROTEADOR PRINCIPAL E EXPORTAÇÃO DA API ---

// GET /getItensPNCP — proxy para a API PNCP de itens de uma contratação
// Query: id_pncp (formato CNPJ-XXXXXXXX0001XX-1-SEQANO/YYYY ou numeroControlePNCP direto)
app.get('/getItensPNCP', userAuthMiddleware, async (req, res) => {
        try {
                const idPncp = String(req.query.id_pncp || "").trim();
                if (!idPncp) return res.status(400).json({ message: "id_pncp é obrigatório." });

                // Extrair CNPJ, anual, sequencial e ano do numeroControlePNCP
                // Formato: CNPJ14-ANUAL-SEQUENCIAL/ANO  ex: 00059311000126-1-000001/2024
                const match = idPncp.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/);
                if (!match) {
                        return res.status(400).json({
                                message: "Formato de id_pncp inválido. Esperado: CNPJ14-ANUAL-SEQ/ANO",
                                idPncp,
                        });
                }
                const [, cnpj, , sequencial, ano] = match;
                const seqN = parseInt(sequencial, 10);
                const pncpUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seqN}/itens?pagina=1&tamanhoPagina=500`;

                const response = await fetch(pncpUrl, {
                        headers: { Accept: "application/json" },
                        signal: AbortSignal.timeout(10_000),
                });

                if (response.status === 404) return res.json({ items: [] });
                if (!response.ok) {
                        const body = await response.text().catch(() => "");
                        return res.status(502).json({ message: "Erro ao consultar PNCP", pncpStatus: response.status, body });
                }

                const data: any = await response.json();
                // API PNCP pode retornar array diretamente ou { data: [...] }
                const raw = Array.isArray(data) ? data : (data?.data ?? data?.itens ?? []);
                const items = raw.map((it: any) => ({
                        numeroItem:               it.numeroItem ?? it.numero,
                        descricao:                it.descricao ?? it.descricaoItem ?? "",
                        quantidade:               it.quantidade,
                        unidadeMedida:            it.unidadeMedida,
                        valorUnitarioEstimado:    it.valorUnitarioEstimado,
                        valorTotal:               it.valorTotal,
                        tipoBeneficioNome:        it.tipoBeneficioNome,
                        situacaoCompraItemNome:   it.situacaoCompraItemNome,
                        materialOuServico:        it.materialOuServico,
                        materialOuServicoNome:    it.materialOuServicoNome,
                        criterioJulgamentoNome:   it.criterioJulgamentoNome,
                        orcamentoSigiloso:        it.orcamentoSigiloso ?? false,
                        ncmNbsCodigo:             it.ncmNbsCodigo ?? null,
                        ncmNbsDescricao:          it.ncmNbsDescricao ?? null,
                }));
                return res.json({ items });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getItensPNCP", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao buscar itens PNCP.", error: error.message });
        }
});

// ── Análise de IA para uma oportunidade ──────────────────────────────────────
app.post('/analyzeOportunidade', userAuthMiddleware, async (req, res) => {
        try {
                const uid = req.uid!;
                const idPncp = String(req.body?.id_pncp || "").trim();
                if (!idPncp) return res.status(400).json({ message: "id_pncp é obrigatório." });

                // ── Cache: buscar análise recente (< 24h) ───────────────────
                try {
                        await bq.query({ query: `CREATE TABLE IF NOT EXISTS \`${GCP_PROJECT_ID}.log.analises_ia\` (id STRING, cliente_id STRING NOT NULL, id_pncp STRING NOT NULL, analysis STRING, criado_em TIMESTAMP) OPTIONS(description='Cache de análises geradas pela IA')`, location: BIGQUERY_LOCATION });
                        const [cached] = await bq.query({ query: `SELECT analysis FROM \`${GCP_PROJECT_ID}.log.analises_ia\` WHERE cliente_id = @uid AND id_pncp = @id AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), criado_em, HOUR) < 24 ORDER BY criado_em DESC LIMIT 1`, params: { uid, id: idPncp }, location: BIGQUERY_LOCATION });
                        if (cached?.[0]?.analysis) {
                                return res.json({ analysis: cached[0].analysis, cached: true });
                        }
                } catch { /* ignora erro de cache — gera de qualquer forma */ }

                // Buscar dados da contratação no BQ
                const query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.contratacoes\` WHERE id_pncp = @id LIMIT 1`;
                const [rows] = await bq.query({ query, params: { id: idPncp }, location: BIGQUERY_LOCATION });

                const c = rows?.[0];
                if (!c) return res.status(404).json({ message: "Oportunidade não encontrada." });

                const valor = c.valor_total_estimado
                        ? `R$ ${Number(c.valor_total_estimado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "não informado";
                const prazo = c.data_encerramento_proposta?.value ?? c.data_encerramento_proposta ?? "não informado";

                const prompt = `Você é um especialista em licitações públicas brasileiras. Analise a seguinte oportunidade e forneça uma análise concisa em português.

Dados da licitação:
- Objeto: ${c.objeto_compra ?? ""}
- Modalidade: ${c.modalidade_nome ?? ""}
- Modo de Disputa: ${c.modo_disputa_nome ?? ""}
- Órgão: ${c.nome_orgao ?? ""} (${c.uf ?? ""})
- Valor Estimado: ${valor}
- Score de Oportunidade: ${c.score_oportunidade ?? "não calculado"}/100
- Prazo de Encerramento: ${prazo}
- Situação: ${c.situacao_nome ?? ""}

Forneça uma análise com 3-4 parágrafos curtos cobrindo:
1. Contexto e resumo do que está sendo licitado
2. Avaliação financeira e atratividade
3. Pontos de atenção (prazo, modalidade, riscos)
4. Recomendação objetiva (vale participar? por quê?)

Seja direto, factual e use linguagem técnica adequada. Não invente informações além das fornecidas.`;

                const vertex_ai = new VertexAI({ project: GCP_PROJECT_ID, location: FUNCTIONS_REGION });
                const model = vertex_ai.getGenerativeModel({
                        model: "gemini-2.5-pro",
                        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 } as any,
                });
                const result: any = await executeWithRetry(() =>
                        model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
                );
                const analysis: string = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (!analysis) return res.status(500).json({ message: "IA retornou resposta vazia." });

                // Salvar no cache assíncronamente (não bloqueia resposta)
                bq.query({ query: `INSERT INTO \`${GCP_PROJECT_ID}.log.analises_ia\` VALUES (GENERATE_UUID(), @uid, @id, @analysis, CURRENT_TIMESTAMP())`, params: { uid: req.uid ?? "anon", id: idPncp, analysis }, location: BIGQUERY_LOCATION }).catch(() => {});

                return res.json({ analysis });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "analyzeOportunidade", mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao gerar análise de IA.", error: error.message });
        }
});

// ── Favoritar oportunidades ───────────────────────────────────────────────────
const DDL_FAVORITOS = `CREATE TABLE IF NOT EXISTS \`${GCP_PROJECT_ID}.dim.favoritos\` (cliente_id STRING NOT NULL, id_pncp STRING NOT NULL, criado_em TIMESTAMP) OPTIONS(description='Oportunidades favoritadas por usuário')`;

app.post('/toggleFavorito', userAuthMiddleware, async (req, res) => {
        try {
                const uid = req.uid!;
                const idPncp = String(req.body?.id_pncp || "").trim();
                if (!idPncp) return res.status(400).json({ message: "id_pncp é obrigatório." });
                await bq.query({ query: DDL_FAVORITOS, location: BIGQUERY_LOCATION });
                const [rows] = await bq.query({ query: `SELECT 1 FROM \`${GCP_PROJECT_ID}.dim.favoritos\` WHERE cliente_id = @uid AND id_pncp = @id LIMIT 1`, params: { uid, id: idPncp }, location: BIGQUERY_LOCATION });
                if (rows.length > 0) {
                        await bq.query({ query: `DELETE FROM \`${GCP_PROJECT_ID}.dim.favoritos\` WHERE cliente_id = @uid AND id_pncp = @id`, params: { uid, id: idPncp }, location: BIGQUERY_LOCATION });
                        return res.json({ favorited: false });
                } else {
                        await bq.query({ query: `INSERT INTO \`${GCP_PROJECT_ID}.dim.favoritos\` VALUES (@uid, @id, CURRENT_TIMESTAMP())`, params: { uid, id: idPncp }, location: BIGQUERY_LOCATION });
                        return res.json({ favorited: true });
                }
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "toggleFavorito", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao favoritar.", error: error.message });
        }
});

app.get('/getFavoritos', userAuthMiddleware, async (req, res) => {
        try {
                const uid = req.uid!;
                await bq.query({ query: DDL_FAVORITOS, location: BIGQUERY_LOCATION });
                const [rows] = await bq.query({ query: `SELECT id_pncp FROM \`${GCP_PROJECT_ID}.dim.favoritos\` WHERE cliente_id = @uid ORDER BY criado_em DESC`, params: { uid }, location: BIGQUERY_LOCATION });
                return res.json({ favoritos: rows.map((r: any) => r.id_pncp) });
        } catch (error: any) {
                await logErrorToBigQuery({ funcao_ou_componente: "getFavoritos", cliente_id: req.uid, mensagem: error.message, stack_trace: error.stack });
                return res.status(500).json({ message: "Erro ao buscar favoritos.", error: error.message });
        }
});

// ── Notificações: contagem de novas oportunidades ────────────────────────────
app.get('/countNovas', userAuthMiddleware, async (req, res) => {
        try {
                const since = String(req.query.since || "").trim();
                if (!since) return res.json({ count: 0 });
                const [rows] = await bq.query({ query: `SELECT COUNT(*) AS cnt FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.contratacoes\` WHERE ingest_time > TIMESTAMP(@since)`, params: { since }, location: BIGQUERY_LOCATION });
                return res.json({ count: Number(rows?.[0]?.cnt ?? 0) });
        } catch {
                return res.json({ count: 0 });
        }
});

const root = express();
root.use('/api', app);

export const api = onRequest(
        {
                memory: "2GiB", // <-- AUMENTA A MEMÓRIA E A CPU
                cpu: 1, // Opcional, mas explícito para Cloud Functions v2
                region: FUNCTIONS_REGION,
                invoker: "public",
                timeoutSeconds: 300,
                minInstances: 0
        },
        root
);


// --- DEMAIS TRIGGERS ---
export const processarDocumentoConhecimento = onObjectFinalized(
        {
                bucket: KNOWLEDGE_BUCKET,
                memory: "1GiB",
                timeoutSeconds: 540 // <-- ADICIONE ISSO (540 segundos = 9 minutos)
        },
        async (event) => {
                const { bucket, name } = event.data;
                if (!name) return;
                logger.info(`Arquivo '${name}' detectado. Iniciando processamento para BigQuery.`);

                try {
                        const fileBuffer = (await getStorage().bucket(bucket).file(name).download())[0];
                        let textContent = "";

                        if (name.toLowerCase().endsWith('.pdf')) {
                                const data = await pdf(fileBuffer);
                                textContent = data.text;
                        } else {
                                textContent = fileBuffer.toString('utf-8');
                        }

                        if (!textContent.trim()) {
                                logger.warn(`Nenhum texto extraído do arquivo: ${name}`);
                                return;
                        }

                        const chunks = textContent.match(/[\s\S]{1,1000}/g) || [];
                        if (chunks.length === 0) {
                                logger.warn(`O arquivo ${name} não gerou chunks de texto.`);
                                return;
                        }
                        logger.info(`Arquivo dividido em ${chunks.length} chunks.`);

                        const embeddings = await embedBatchREST(chunks);
                        logger.info(`${embeddings.length} embeddings gerados via REST.`);

                        const rowsToInsert = chunks.map((chunk, i) => ({
                                id: `${name.replace(/[^a-zA-Z0-9]/g, "_")}_${i}`,
                                content: chunk,
                                embedding: embeddings[i],
                                source_file: name,
                                created_at: new Date().toISOString()
                        }));

                        await bq.dataset(DATASET_CORE).table(TABLE_KNOWLEDGE_VECTORS).insert(rowsToInsert);
                        logger.info(`Sucesso! ${rowsToInsert.length} vetores do arquivo '${name}' foram inseridos na tabela ${TABLE_KNOWLEDGE_VECTORS}.`);

                } catch (error: any) {
                        await logErrorToBigQuery({
                                funcao_ou_componente: "processarDocumentoConhecimento",
                                mensagem: `Falha ao salvar vetores no BigQuery: ${error.message}`,
                                stack_trace: error.stack,
                                contexto: JSON.stringify({ bucket, file: name, bqErrors: error.errors })
                        });
                        logger.error(`Falha CRÍTICA ao processar o arquivo '${name}' para o BigQuery`, { message: error.message, stack: error.stack });
                }
        });

export const criarRegistroClienteNovo = auth.beforeUserCreated(async (event) => {
        const user = event.data;
        if (!user?.uid || !user.email) {
                logger.error("Tentativa de criação de usuário com UID ou Email ausentes.", { eventData: user });
                throw new Error("UID ou Email ausentes no evento de criação de usuário.");
        }
        const { uid, email, displayName } = user;
        const now = new Date();
        const trialFim = new Date(now);
        trialFim.setDate(trialFim.getDate() + 7);
        const proLimits = LIMITES_PADRAO_POR_PLANO["pro"];
        const cliente = {
                cliente_id: uid,
                tenant_id: uid,
                email: email,
                nome_exibicao: displayName || email.split('@')[0] || 'Novo Usuário',
                plano: "pro" as PlanoNome,
                status_pagamento: "trial",
                limite_uf: proLimits.limite_uf,
                limite_oportunidades: proLimits.limite_oportunidades,
                limite_docs: proLimits.limite_docs,
                limite_produtos: proLimits.limite_produtos,
                trial_inicio: now.toISOString(),
                trial_fim: trialFim.toISOString(),
                data_cadastro: now.toISOString(),
                data_ultima_modificacao: now.toISOString()
        };
        try {
                const tableName = await resolveClientTableName();
                const columns = await resolveClientTableColumns();
                const rowToInsert = Object.fromEntries(
                        Object.entries(cliente).filter(([key]) => columns.has(key))
                );
                await bq.dataset(DATASET_DIM).table(tableName).insert([rowToInsert]);
                logger.info(`Cliente ${uid} inserido com sucesso no BigQuery.`);
        } catch (error: any) {
                await logErrorToBigQuery({
                        funcao_ou_componente: "criarRegistroClienteNovo",
                        cliente_id: uid,
                        mensagem: `Falha ao inserir novo cliente no BigQuery: ${error.message}`,
                        stack_trace: error.stack,
                        contexto: JSON.stringify({ userEventData: event.data })
                });
                logger.error(`Falha CRÍTICA ao criar registro no BQ para o cliente ${uid}`, { error });
                throw new Error("Não foi possível finalizar seu cadastro. A equipe foi notificada.");
        }
});

const coletar = async (url: string, uf: string, dataColeta: string | null, res: express.Response) => {
        try {
                let pagina = 1, totalInserido = 0;
                const tamanhoPagina = 50;
                while (true) {
                        const params: any = { uf, pagina, tamanhoPagina, codigoModalidadeContratacao: 6 };
                        if (dataColeta) {
                                params.dataInicial = dataColeta;
                                params.dataFinal = dataColeta;
                        } else {
                                params.dataFinal = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                        }
                        const response = await axios.get(url, { params, timeout: 60000 });
                        const contratacoes = response.data?.data || [];
                        if (contratacoes.length > 0) {
                                const rows = contratacoes.map((item: any) => {
                                        const payloadStr = JSON.stringify(item);
                                        return {
                                                ingest_time: new Date(),
                                                uf: uf,
                                                id_pncp: item.numeroControlePNCP || null,
                                                hash_payload: createHash('sha256').update(payloadStr).digest('hex'),
                                                payload: payloadStr
                                        };
                                });
                                await bq.dataset(DATASET_STG).table(TABLE_CONTRATACOES_RAW).insert(rows);
                                totalInserido += rows.length;
                        }
                        if (contratacoes.length < tamanhoPagina) break;
                        pagina++;
                }
                const msg = `Coleta concluída para ${uf}. Total: ${totalInserido}.`;
                logger.info(msg);
                res.status(200).send(msg);
        } catch (error: any) {
                const errorContext = { uf, dataColeta, url, axiosError: axios.isAxiosError(error) ? { status: error.response?.status, data: error.response?.data } : null };
                await logErrorToBigQuery({ funcao_ou_componente: "coletar", mensagem: error.message, stack_trace: error.stack, contexto: JSON.stringify(errorContext) });
                logger.error(`Erro na coleta para ${uf}`, errorContext);
                res.status(500).send(`Erro ao coletar dados para ${uf}.`);
        }
}

export const coletarPncp = onRequest({ timeoutSeconds: 540, memory: "1GiB" }, async (req, res) => {
        const uf = (req.query.uf as string)?.toUpperCase() || "MT";
        let dataColeta: string;
        if (req.query.data && /^\d{4}-\d{2}-\d{2}$/.test(req.query.data as string)) {
                dataColeta = (req.query.data as string).replace(/-/g, "");
        } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dataColeta = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
        }
        await coletar(PNCP_API_URL, uf, dataColeta, res);
});

export const coletarLicitacoesAbertas = onRequest({ timeoutSeconds: 540, memory: "1GiB" }, async (req, res) => {
        const uf = (req.query.uf as string)?.toUpperCase() || "MT";
        await coletar(PNCP_API_URL_ABERTAS, uf, null, res);
});