# Diagnóstico dos Apps MVP

## Resumo Executivo

✅ **Hub centralizado criado** com autenticação Google e gestão de apps via API.

**Status geral:**
- **4 apps Firebase** descobertos
- **1 serviço backend** (jobsagent-service)
- **3 apps prontos** para uso (liciai, clinia principal, dashboard-divulgacao)
- **1 estrutura duplicada** que precisa consolidação (clinia/clinia)

---

## Como acessar o Hub

1. **Rodar localmente:**
   ```bash
   cd /workspaces/jobsagent
   gunicorn --bind 0.0.0.0:8080 main:app
   ```

2. **Acessar interface:**
   - URL: `http://localhost:8080/hub`
   - Login: Clicar em "Entrar com Google"
   - Autenticação: Firebase Auth (projeto `sharp-footing-475513-c7`)

3. **Funcionalidades do hub:**
   - ✅ Visualizar status de todos os apps
   - ✅ Checklist técnico por app
   - ✅ Lista de pendências
   - ✅ Executar ações (build, deploy, install)
   - ✅ Links diretos para os apps publicados

---

## Status detalhado por app

### 1. 🟢 LiciAI (`liciai/`)

**Status:** ✅ Pronto (100%)

**Configuração:**
- Projeto Firebase: `sharp-footing-475513-c7`
- Hosting site: `liciai1`
- URLs:
  - https://liciai1.web.app
  - https://liciai1.firebaseapp.com

**Checklist:**
- ✅ firebase.json presente
- ✅ .firebaserc presente
- ✅ Diretório public presente
- ✅ Página inicial (app.html) presente
- ✅ Google Auth detectado no frontend
- ✅ Diretório de Functions (functions) presente
- ✅ Entry point de Functions detectado (src/index.ts + lib/index.js)
- ✅ tsconfig include=src compatível com estrutura

**Ações disponíveis:**
- Build Functions
- Deploy Firebase (hosting + functions)

**Backend:**
- API Express em Functions
- Rotas: `/api/getOportunidades`, `/api/getScoredOportunidades`, etc.
- BigQuery + Vertex AI integrados
- Autenticação Firebase no backend

---

### 2. 🟢 Clínia (`clinia/`)

**Status:** ✅ Pronto (100%)

**Configuração:**
- Projeto Firebase: `liciai` (nome do projeto diferente da pasta)
- Hosting site: `clinia`
- URLs:
  - https://clinia.web.app
  - https://clinia.firebaseapp.com

**Checklist:**
- ✅ firebase.json presente
- ✅ .firebaserc presente
- ✅ Diretório public presente
- ✅ Página inicial (index.html) presente
- ✅ Google Auth detectado no frontend
- ✅ Diretório de Functions (function) presente
- ✅ Entry point de Functions detectado (src/index.ts + dist/index.js)
- ✅ tsconfig include=src compatível com estrutura

**Ações disponíveis:**
- Build Functions
- Instalar dependências Functions (se node_modules não existir)
- Deploy Firebase (hosting + functions)

**Backend:**
- API Express em Functions
- Rotas: `/api/novaTriagem`, `/api/getHistorico`, `/api/getProtocolos`
- BigQuery + Vertex AI integrados (embeddings + RAG para protocolos médicos)
- Autenticação Firebase no backend

---

### 3. 🟢 Dashboard Divulgação (`dashboard-divulgacao/`)

**Status:** ✅ Pronto (100%)

**Configuração:**
- Projeto Firebase: `arquitetodadivulgacao`
- Hosting site: `arquitetodadivulgacao`
- URLs:
  - https://arquitetodadivulgacao.web.app
  - https://arquitetodadivulgacao.firebaseapp.com

**Checklist:**
- ✅ firebase.json presente
- ✅ .firebaserc presente
- ✅ Diretório public presente
- ✅ Página inicial (index.html) presente
- ✅ Google Auth detectado no frontend

**Ações disponíveis:**
- Deploy Firebase (hosting)

**Observação:** App frontend-only (sem Functions).

---

### 4. 🟡 Clínia Duplicada (`clinia/clinia/`)

**Status:** ⚠️ Com pendências (estrutura duplicada)

**Pendências críticas:**
- ❌ Diretório public ausente
- ❌ Página inicial (index.html/app.html) ausente
- ❌ tsconfig inclui `src` mas diretório `src` ausente no path `function/`

**Ação recomendada:**
Esta é uma **estrutura duplicada acidental** dentro da pasta principal `clinia/`.
Deve ser removida ou consolidada para evitar deploy no diretório errado.

```bash
# Opção 1: Remover a pasta duplicada (se não tiver nada único)
rm -rf clinia/clinia

# Opção 2: Se houver arquivos únicos, mover para a pasta principal
# (antes, revisar o que está diferente)
```

---

### 5. 🟢 Serviço jobsagent (`./`)

**Status:** ✅ Pronto (100%)

**Arquivos presentes:**
- ✅ main.py (orquestrador + API do hub)
- ✅ worker.py (Cloud Run Job para scraping)
- ✅ utils.py (funções compartilhadas)
- ✅ requirements.txt
- ✅ Dockerfile

**Ações disponíveis:**
- Rodar API local

**Funcionalidades:**
- Orquestrador de jobs de scraping de vagas
- Hub de gestão de apps (novo)
- APIs do hub em `/hub/api/*`

---

## Recursos implementados no Hub

### Backend (`main.py`)

**Novas rotas:**

1. **GET `/hub`**
   - Serve a interface HTML do hub
   - Público (sem auth)

2. **GET `/hub/api/config`**
   - Retorna configuração Firebase para o cliente
   - Público (sem auth)

3. **GET `/hub/api/apps`**
   - Lista todos os apps com status e diagnóstico
   - 🔒 Requer autenticação Firebase (Bearer token)
   - Retorna: summary (totais) + lista de apps com checks/missing/actions

4. **POST `/hub/api/run`**
   - Executa ação de gestão (build/deploy/install)
   - 🔒 Requer autenticação Firebase (Bearer token)
   - Body: `{"appId": "liciai", "actionId": "build_functions"}`
   - Retorna: stdout/stderr do comando executado

**Funções de diagnóstico:**

- `_discover_firebase_apps()`: Busca automática de apps via `firebase.json`
- `_build_app_health()`: Analisa estrutura de cada app
- `_looks_like_google_auth()`: Detecta Google Auth no frontend
- `_require_firebase_user()`: Middleware de autenticação

### Frontend (`hub/index.html`)

**Interface:**
- Login com Google via Firebase Auth
- KPIs: Total de apps, prontos, com pendências
- Cards por app com:
  - Status visual (verde = pronto, amarelo = pendências)
  - Checklist técnico (expandível)
  - Lista de pendências (expandível, aberto por padrão)
  - Botões de ação (build, deploy, install)
  - Links diretos para URLs publicadas
- Painel de resultado de ações (stdout/stderr)
- Botão "Atualizar" para recarregar inventário

---

## Autenticação Google nos Apps

Todos os 3 apps funcionais já têm **Google Auth implementado**:

### LiciAI
```javascript
// app.html linha ~201
const firebaseConfig = {
    apiKey: "AIzaSyA43C0ZrG7F_hUdue0-uG24WPgLkQkNQc0",
    authDomain: "sharp-footing-475513-c7.firebaseapp.com",
    projectId: "sharp-footing-475513-c7",
    // ...
}
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Botão "Entrar com Google"
await auth.signInWithPopup(provider);
```

### Clínia
```javascript
// public/index.html linha ~139
const firebaseConfig = {
    apiKey: "AIzaSyA43C0ZrG7F_hUdue0-uG24WPgLkQkNQc0",
    authDomain: "sharp-footing-475513-c7.firebaseapp.com",
    projectId: "sharp-footing-475513-c7",
    // ...
}
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Botão "Entrar com Google"
await auth.signInWithPopup(provider);
```

### Dashboard Divulgação
```javascript
// public/index.html linha ~1670
const firebaseConfig = {
    apiKey: "AIzaSyDsTRQQYNMFKCVHKV3UgR6SZc7BnpAkPnk",
    authDomain: "arquitetodadivulgacao.firebaseapp.com",
    projectId: "arquitetodadivulgacao",
    // ...
}
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Login via redirect
await signInWithRedirect(auth, provider);
```

**Observação:** Todos usam Firebase Auth do GCP. Os backends (LiciAI e Clínia) validam tokens via `firebase-admin` nas rotas protegidas.

---

## Próximos passos

### Ação imediata
1. **Resolver duplicação do Clínia:**
   ```bash
   cd /workspaces/jobsagent
   rm -rf clinia/clinia  # Após confirmar que não há código único
   ```

### Deploy (quando pronto)
2. **LiciAI:**
   ```bash
   cd liciai
   firebase deploy --only hosting,functions
   ```

3. **Clínia:**
   ```bash
   cd clinia
   firebase deploy --only hosting,functions
   ```

4. **Dashboard Divulgação:**
   ```bash
   cd dashboard-divulgacao
   firebase deploy --only hosting
   ```

5. **Serviço jobsagent:**
   ```bash
   # Build e push Docker image para GCR
   gcloud builds submit --tag gcr.io/arquitetodadivulgacao/jobsagent-service
   
   # Deploy Cloud Run Service (orquestrador)
   gcloud run deploy jobsagent-service \
     --image gcr.io/arquitetodadivulgacao/jobsagent-service \
     --platform managed \
     --region us-central1
   
   # Deploy Cloud Run Job (worker)
   gcloud run jobs deploy jobsagent-worker \
     --image gcr.io/arquitetodadivulgacao/jobsagent-service \
     --command python,worker.py \
     --region us-central1
   ```

### Melhorias futuras
- Adicionar CI/CD automático (GitHub Actions)
- Implementar rate limiting nas APIs
- Adicionar monitoramento (Cloud Logging, Sentry)
- Criar testes automatizados
- Adicionar variáveis de ambiente seguras (Secret Manager)

---

## Checklist de produção

### Segurança
- [ ] Configurar regras de Firestore Security Rules
- [ ] Configurar regras de Storage (se aplicável)
- [ ] Adicionar rate limiting nas APIs
- [ ] Validar todos os inputs do usuário
- [ ] Configurar CORS adequadamente

### Performance
- [ ] Habilitar cache no Firebase Hosting
- [ ] Otimizar queries BigQuery (custos)
- [ ] Implementar paginação em todas as listas
- [ ] Comprimir assets (JS/CSS)

### Monitoramento
- [ ] Configurar alertas Cloud Monitoring
- [ ] Implementar error tracking (Sentry/Cloud Error Reporting)
- [ ] Configurar logs estruturados
- [ ] Dashboard de métricas de negócio

### Backup
- [ ] Configurar backup automático Firestore
- [ ] Documentar processo de restore
- [ ] Backup de schemas BigQuery

---

## Arquivos modificados/criados

### Novos arquivos
- ✅ `hub/index.html` - Interface do hub
- ✅ `DIAGNOSTICO.md` - Este documento

### Arquivos editados
- ✅ `main.py` - Adicionadas rotas do hub + funções de diagnóstico
- ✅ `requirements.txt` - Adicionado `google-auth`
- ✅ `README.md` - Documentação do hub

### Estrutura criada
```
/workspaces/jobsagent/
├── hub/
│   └── index.html          [NOVO]
├── main.py                 [EDITADO]
├── requirements.txt        [EDITADO]
├── README.md              [EDITADO]
└── DIAGNOSTICO.md         [NOVO]
```

---

## Variáveis de ambiente

### Configuração do Hub (opcional)

Se quiser usar projeto Firebase diferente para o hub:

```bash
export HUB_FIREBASE_API_KEY="..."
export HUB_FIREBASE_AUTH_DOMAIN="..."
export HUB_FIREBASE_PROJECT_ID="..."
export HUB_FIREBASE_STORAGE_BUCKET="..."
export HUB_FIREBASE_MESSAGING_SENDER_ID="..."
export HUB_FIREBASE_APP_ID="..."
```

**Valores padrão:** projeto `sharp-footing-475513-c7`

---

## Suporte

Para usar o hub:
1. Instale dependências: `pip install -r requirements.txt`
2. Rode o servidor: `gunicorn --bind 0.0.0.0:8080 main:app`
3. Acesse: `http://localhost:8080/hub`
4. Faça login com Google
5. Visualize status e execute ações

**Fim do diagnóstico.**
