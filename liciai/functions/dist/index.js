"use strict";
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
exports.getOportunidades = exports.coletarPncp = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const bigquery_1 = require("@google-cloud/bigquery");
const axios_1 = __importDefault(require("axios"));
// =============================================================================
// --- CONFIGURAÇÃO GLOBAL ---
// =============================================================================
const GCP_PROJECT_ID = "sharp-footing-475513-c7";
const BIGQUERY_LOCATION = "US";
const DATASET_STG = "stg";
const TABLE_CONTRATACOES_RAW = "pncp_contratacoes_raw";
const DATASET_CORE = "core";
const VIEW_OPORTUNIDADES = "v_oportunidades_15d";
const PNCP_API_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";
const bq = new bigquery_1.BigQuery({ projectId: GCP_PROJECT_ID });
// =============================================================================
// --- FUNÇÃO DE COLETA (coletarPncp) ---
// =============================================================================
async function insertToBigQuery(rows) {
    if (rows.length === 0) {
        logger.info("Nenhum registro novo para inserir.");
        return;
    }
    try {
        await bq.dataset(DATASET_STG).table(TABLE_CONTRATACOES_RAW).insert(rows);
        logger.info(`${rows.length} registros inseridos com sucesso.`);
    }
    catch (error) {
        logger.error("Erro ao inserir no BigQuery:", error.errors);
        throw new Error("Falha na inserção do BigQuery.");
    }
}
exports.coletarPncp = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: "256MiB" }, async (req, res) => {
    try {
        const uf = req.query.uf || "MT";
        const mod = parseInt(req.query.modalidade || "6", 10);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const data = req.query.data || yesterday.toISOString().slice(0, 10).replace(/-/g, "");
        let pagina = 1;
        let totalInserido = 0;
        for (;;) {
            const params = {
                dataInicial: data,
                dataFinal: data,
                codigoModalidadeContratacao: mod,
                uf: uf,
                pagina: pagina,
                tamanhoPagina: 500, // Aumentado para mais eficiência
            };
            logger.info(`Buscando no PNCP...`, { params });
            const resp = await axios_1.default.get(PNCP_API_URL, { params, timeout: 60000 });
            const items = resp.data?.data ?? [];
            if (items.length > 0) {
                const rows = items.map((payload) => ({
                    ingest_time: new Date().toISOString(),
                    payload: JSON.stringify(payload),
                }));
                await insertToBigQuery(rows);
                totalInserido += items.length;
            }
            if (resp.data?.pagina === resp.data?.totalPaginas || items.length === 0) {
                logger.info("Loop de paginação concluído.");
                break;
            }
            pagina++;
        }
        const successMessage = `Coleta concluída para UF=${uf}, data=${data}. Total de ${totalInserido} registros.`;
        logger.info(successMessage);
        res.status(200).send(successMessage);
    }
    catch (err) {
        const errorMessage = err?.response?.data?.detail || err.message;
        logger.error("Erro fatal durante a coleta:", errorMessage, { data: err?.response?.data });
        res.status(err?.response?.status || 500).send(`Erro durante a coleta: ${errorMessage}`);
    }
});
// =============================================================================
// --- API PARA O FRONTEND (getOportunidades) ---
// =============================================================================
exports.getOportunidades = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
        return;
    }
    try {
        const uf = req.query.uf || null;
        const q = req.query.q || null;
        let query = `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_CORE}.${VIEW_OPORTUNIDADES}\``;
        const whereClauses = [];
        const queryParams = {};
        if (uf && uf.trim() !== "") {
            whereClauses.push("uf = @uf");
            queryParams.uf = uf.trim().toUpperCase();
        }
        if (q && q.trim() !== "") {
            whereClauses.push("LOWER(objeto_compra) LIKE @q");
            queryParams.q = `%${q.trim().toLowerCase()}%`;
        }
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        query += " ORDER BY data_encerramento_proposta ASC LIMIT 200;";
        const options = {
            query: query,
            location: BIGQUERY_LOCATION,
            params: queryParams,
        };
        logger.info("Executando query parametrizada:", { query, params: queryParams });
        const [rows] = await bq.query(options);
        logger.info(`Encontradas ${rows.length} oportunidades.`);
        res.status(200).json(rows);
    }
    catch (error) {
        logger.error("Erro ao consultar o BigQuery:", error);
        res.status(500).send("Erro interno ao buscar oportunidades.");
    }
});
//# sourceMappingURL=index.js.map