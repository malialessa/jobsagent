#!/usr/bin/env node

const axios = require("axios");
const { BigQuery } = require("@google-cloud/bigquery");
const { execSync } = require("child_process");

const DEFAULT_PROJECT_ID = "uniquex-487718";
const DEFAULT_REGION = process.env.FUNCTIONS_REGION || "us-east1";

function getProjectFromGcloud() {
  try {
    const value = execSync("gcloud config get-value project 2>/dev/null", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();

    if (!value || value === "(unset)") {
      return "";
    }

    return value;
  } catch (_error) {
    return "";
  }
}

const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || getProjectFromGcloud() || DEFAULT_PROJECT_ID;
const datasetDimEnv = process.env.DATASET_DIM || "";
function getApiBaseUrl() {
  if (process.env.LICIAI_API_BASE_URL) {
    return process.env.LICIAI_API_BASE_URL.replace(/\/$/, "");
  }

  try {
    const serviceUri = execSync(
      `gcloud functions describe api --gen2 --region ${DEFAULT_REGION} --project ${projectId} --format='value(serviceConfig.uri)' 2>/dev/null`,
      { stdio: ["ignore", "pipe", "ignore"] }
    )
      .toString()
      .trim();

    if (serviceUri) {
      return `${serviceUri.replace(/\/$/, "")}/api`;
    }
  } catch (_error) {
    // fallback abaixo
  }

  return `https://${DEFAULT_REGION}-${projectId}.cloudfunctions.net/api`;
}

const apiBaseUrl = getApiBaseUrl();
const strictMode = process.argv.includes("--strict");

const firebaseApiKey = process.env.FIREBASE_API_KEY || "";
const firebaseEmail = process.env.FIREBASE_EMAIL || "";
const firebasePassword = process.env.FIREBASE_PASSWORD || "";
const firebaseEmailFree = process.env.FIREBASE_EMAIL_FREE || "";
const firebasePasswordFree = process.env.FIREBASE_PASSWORD_FREE || "";
const firebaseEmailPro = process.env.FIREBASE_EMAIL_PRO || "";
const firebasePasswordPro = process.env.FIREBASE_PASSWORD_PRO || "";
const expectedTrialDays = Number(process.env.TRIAL_DAYS || "7");
const requireTrial = ["1", "true", "yes", "sim"].includes(String(process.env.REQUIRE_TRIAL || "").toLowerCase());
let explicitToken = process.env.LICIAI_ID_TOKEN || "";

const requiredClienteColumns = [
  "cliente_id",
  "tenant_id",
  "email",
  "nome_exibicao",
  "plano",
  "status_pagamento",
  "limite_uf",
  "limite_oportunidades",
  "limite_docs",
  "limite_produtos",
  "data_cadastro",
  "data_ultima_modificacao",
];

function section(title) {
  console.log(`\n${"=".repeat(76)}`);
  console.log(title);
  console.log(`${"=".repeat(76)}`);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

function warn(message) {
  console.log(`⚠️  ${message}`);
}

function fail(message) {
  console.log(`❌ ${message}`);
}

async function signInWithFirebase(email, password) {
  if (!firebaseApiKey || !email || !password) {
    return "";
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
  const response = await axios.post(
    url,
    {
      email,
      password,
      returnSecureToken: true,
    },
    { timeout: 20000 }
  );

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("Firebase Auth não retornou idToken.");
  }

  return idToken;
}

async function getAuthProfiles() {
  const profiles = [];

  if (explicitToken) {
    ok("Token encontrado em LICIAI_ID_TOKEN.");
    profiles.push({ label: "token_explicito", token: explicitToken, expectedPlan: "" });
    return profiles;
  }

  if (!firebaseApiKey) {
    warn("FIREBASE_API_KEY ausente. Testes autenticados serão pulados.");
    return profiles;
  }

  if (firebaseEmail && firebasePassword) {
    const token = await signInWithFirebase(firebaseEmail, firebasePassword);
    if (token) {
      ok("Token obtido via Firebase Auth (conta única). ");
      profiles.push({ label: "conta_principal", token, expectedPlan: "" });
    }
  }

  if (firebaseEmailFree && firebasePasswordFree) {
    const tokenFree = await signInWithFirebase(firebaseEmailFree, firebasePasswordFree);
    if (tokenFree) {
      ok("Token obtido para conta Free.");
      profiles.push({ label: "free", token: tokenFree, expectedPlan: "free" });
    }
  }

  if (firebaseEmailPro && firebasePasswordPro) {
    const tokenPro = await signInWithFirebase(firebaseEmailPro, firebasePasswordPro);
    if (tokenPro) {
      ok("Token obtido para conta Pro.");
      profiles.push({ label: "pro", token: tokenPro, expectedPlan: "pro" });
    }
  }

  if (profiles.length === 0) {
    warn("Credenciais Firebase ausentes/incompletas. Testes autenticados serão pulados.");
  }

  return profiles;
}

async function validateHealth() {
  const response = await axios.get(`${apiBaseUrl}/healthz`, {
    timeout: 20000,
    validateStatus: () => true,
  });

  if (response.status !== 200) {
    throw new Error(`healthz retornou ${response.status} em ${apiBaseUrl}/healthz`);
  }

  ok("healthz OK.");
}

async function validatePlanAndQuota(token, label = "conta", expectedPlan = "") {
  if (!token) {
    warn("Sem token; validação de plano/quota foi pulada.");
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  const plano = await axios.get(`${apiBaseUrl}/getPlanoAtual`, {
    headers,
    timeout: 20000,
    validateStatus: () => true,
  });

  if (plano.status !== 200) {
    throw new Error(`/getPlanoAtual falhou com ${plano.status}: ${JSON.stringify(plano.data)}`);
  }

  const actualPlan = plano.data?.plano || "plano_indefinido";
  ok(`[${label}] /getPlanoAtual OK (${actualPlan}).`);

  if (expectedPlan && actualPlan !== expectedPlan) {
    throw new Error(`[${label}] plano esperado=${expectedPlan}, recebido=${actualPlan}`);
  }

  if (requireTrial) {
    const statusPagamento = String(plano.data?.status_pagamento || "").toLowerCase();
    if (!statusPagamento.includes("trial")) {
      throw new Error(`[${label}] REQUIRE_TRIAL ativo, mas status_pagamento não indica trial.`);
    }
    ok(`[${label}] trial identificado no status_pagamento.`);

    if (expectedTrialDays !== 7) {
      warn(`[${label}] TRIAL_DAYS=${expectedTrialDays}. Atualmente a API não expõe dias restantes para assert exato.`);
    }
  }

  const ufTest = await axios.get(`${apiBaseUrl}/getScoredOportunidades?uf=SP,RJ&limit=10&offset=0`, {
    headers,
    timeout: 20000,
    validateStatus: () => true,
  });

  if (plano.data?.plano === "free") {
    if (ufTest.status !== 403 || ufTest.data?.error?.code !== "UF_LIMIT_EXCEEDED") {
      throw new Error(`Esperado UF_LIMIT_EXCEEDED para free; recebido status=${ufTest.status} body=${JSON.stringify(ufTest.data)}`);
    }
    ok(`[${label}] Regra de limite de UF (free) validada.`);
  } else {
    if (ufTest.status >= 400) {
      throw new Error(`[${label}] teste UF falhou para plano ${actualPlan}: status=${ufTest.status} body=${JSON.stringify(ufTest.data)}`);
    }
    ok(`[${label}] Teste de UF validado para plano ${actualPlan}.`);
  }

  const quotaTest = await axios.get(`${apiBaseUrl}/getScoredOportunidades?uf=SP&limit=10&offset=999`, {
    headers,
    timeout: 20000,
    validateStatus: () => true,
  });

  if (plano.data?.plano === "free") {
    if (quotaTest.status !== 403 || quotaTest.data?.error?.code !== "QUOTA_EXCEEDED") {
      throw new Error(`Esperado QUOTA_EXCEEDED para free; recebido status=${quotaTest.status} body=${JSON.stringify(quotaTest.data)}`);
    }
    ok(`[${label}] Regra de quota de oportunidades (free) validada.`);
  } else {
    if (quotaTest.status >= 400) {
      throw new Error(`[${label}] teste de quota falhou para plano ${actualPlan}: status=${quotaTest.status} body=${JSON.stringify(quotaTest.data)}`);
    }
    ok(`[${label}] Teste de quota validado para plano ${actualPlan}.`);
  }
}

async function resolveClienteTable(bigquery) {
  const datasetDim = await resolveDatasetDim(bigquery);
  const query = `
    SELECT table_name
    FROM \`${projectId}.${datasetDim}.INFORMATION_SCHEMA.TABLES\`
    WHERE table_name IN ('cliente', 'clientes')
    ORDER BY CASE WHEN table_name = 'cliente' THEN 0 ELSE 1 END
    LIMIT 1
  `;

  const [rows] = await bigquery.query({ query, location: "US" });
  if (!rows.length) {
    throw new Error(`Tabela cliente/clientes não encontrada em ${projectId}.${datasetDim}`);
  }
  return String(rows[0].table_name);
}

async function resolveDatasetDim(bigquery) {
  if (datasetDimEnv) return datasetDimEnv;

  const preferred = ["dim", "core", "public", "analytics"];

  for (const datasetId of preferred) {
    try {
      const query = `
        SELECT table_name
        FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLES\`
        WHERE table_name IN ('cliente', 'clientes')
        LIMIT 1
      `;

      const [rows] = await bigquery.query({ query, location: "US" });
      if (rows.length > 0) {
        return datasetId;
      }
    } catch (_error) {
      // dataset não existe/sem permissão: tenta próximo
    }
  }

  throw new Error("Não foi possível localizar dataset com tabela cliente/clientes. Defina DATASET_DIM se necessário.");
}

async function validateBigQuerySchema() {
  try {
    const bigquery = new BigQuery({ projectId });
    const datasetDim = await resolveDatasetDim(bigquery);
    const tableName = await resolveClienteTable(bigquery);

    const query = `
      SELECT column_name
      FROM \`${projectId}.${datasetDim}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableName
    `;

    const [rows] = await bigquery.query({
      query,
      location: "US",
      params: { tableName },
    });

    const cols = new Set(rows.map((r) => String(r.column_name)));
    const missing = requiredClienteColumns.filter((c) => !cols.has(c));

    if (missing.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes em ${datasetDim}.${tableName}: ${missing.join(", ")}`);
    }

    ok(`Schema de ${datasetDim}.${tableName} validado.`);
    return { optionalFailure: false };
  } catch (error) {
    if (strictMode) {
      throw error;
    }

    warn(`Validação BigQuery pulada/pendente no ambiente atual: ${error.message}`);
    return { optionalFailure: true };
  }
}

async function run() {
  section("LiciAI :: Teste único contínuo (all-in-one)");
  console.log(`Projeto: ${projectId}`);
  console.log(`API: ${apiBaseUrl}`);
  console.log(`Modo estrito: ${strictMode ? "ON" : "OFF"}`);

  let hasFatal = false;

  try {
    await validateHealth();
  } catch (error) {
    fail(`Falha no healthcheck: ${error.message}`);
    hasFatal = true;
  }

  let profiles = [];
  try {
    profiles = await getAuthProfiles();
  } catch (error) {
    fail(`Falha ao obter token: ${error.message}`);
    hasFatal = true;
  }

  if (!hasFatal) {
    if (profiles.length === 0) {
      warn("Sem perfis autenticados; validação de plano/quota foi pulada.");
    } else {
      for (const profile of profiles) {
        try {
          await validatePlanAndQuota(profile.token, profile.label, profile.expectedPlan);
        } catch (error) {
          fail(`Falha na validação de plano/quota (${profile.label}): ${error.message}`);
          hasFatal = true;
        }
      }
    }
  }

  try {
    await validateBigQuerySchema();
  } catch (error) {
    fail(`Falha na validação BigQuery: ${error.message}`);
    hasFatal = true;
  }

  section("Resumo");
  if (hasFatal) {
    fail("Teste único finalizou com falhas.");
    process.exit(1);
  }

  ok("Teste único finalizou com sucesso.");
}

run().catch((error) => {
  fail(`Erro inesperado: ${error.message}`);
  process.exit(1);
});
