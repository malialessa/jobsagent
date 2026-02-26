# 🎯 UniqueX - Plataforma Centralizada MVP

## ✅ Status: DEPLOYADO E FUNCIONANDO

**Projeto Firebase:** `uniquex-487718`  
**Data de Deployment:** 17/02/2026  
**Hub Principal:** https://uniquexhub.web.app

---

## 🏗️ Arquitetura Implementada

### 📦 Estrutura:
- **1 Projeto Firebase:** uniquex-487718
- **1 Site de Hosting:** uniquexhub.web.app
- **5 Cloud Functions (APIs):** Backend para cada aplicação
- **6 Aplicações Frontend:** Hospedadas dentro do hub

---

## 🌐 URLs e Endpoints

### Hub Principal
- **URL:** https://uniquexhub.web.app
- **Autenticação:** Firebase Auth (Google OAuth)
- **Funcionalidades:** 
  - Login centralizado
  - Navegação entre apps via sidebar
  - Carregamento de apps via iframe
  - Envio de token de autenticação para os apps

### APIs (Cloud Functions)

#### 1️⃣ LiciAI API
**Base URL:** `https://uniquexhub.web.app/api/liciai` ou `https://us-central1-uniquex-487718.cloudfunctions.net/liciaiApi`

**Endpoints:**
- `GET /health` - Health check (público)
- `POST /buscar-licitacoes` - Buscar licitações (autenticado)
- `GET /oportunidades` - Listar oportunidades do usuário (autenticado)
- `POST /oportunidades` - Salvar nova oportunidade (autenticado)
- `POST /analisar-edital` - Análise IA de edital (autenticado)
- `GET /contratos` - Listar contratos do usuário (autenticado)

**Firestore Collections:**
- `licitacoes`
- `analises_editais`
- `contratos`

---

#### 2️⃣ Clínia API
**Base URL:** `https://uniquexhub.web.app/api/clinia` ou `https://us-central1-uniquex-487718.cloudfunctions.net/cliniaApi`

**Endpoints:**
- `GET /health` - Health check (público)
- `GET /pacientes` - Listar pacientes (autenticado, filtro clinicaId)
- `POST /pacientes` - Criar/atualizar paciente (autenticado)
- `GET /consultas?data=YYYY-MM-DD` - Listar consultas (autenticado, filtro opcional por data)
- `POST /consultas` - Agendar consulta (autenticado)
- `GET /dashboard` - Métricas (total pacientes, consultas do dia) (autenticado)

**Firestore Collections:**
- `pacientes`
- `consultas`

---

#### 3️⃣ JobsAgent API
**Base URL:** `https://uniquexhub.web.app/api/jobsagent` ou `https://us-central1-uniquex-487718.cloudfunctions.net/jobsagentApi`

**Endpoints:**
- `GET /health` - Health check (público)
- `POST /scrape` - Executar scraping de vagas (autenticado)
- `GET /vagas` - Listar vagas do usuário (autenticado)
- `POST /analisar-vaga` - Análise IA de vaga (autenticado)
- `GET /settings` - Obter configurações do usuário (autenticado)
- `PUT /settings` - Atualizar configurações (autenticado)
- `PATCH /vagas/:id` - Atualizar status de vaga (autenticado)

**Firestore Collections:**
- `jobapplications`
- `user_settings`
- `agent_logs`

---

#### 4️⃣ Analisador Edital API
**Base URL:** `https://uniquexhub.web.app/api/analisadoredital` ou `https://us-central1-uniquex-487718.cloudfunctions.net/analisadoreditalApi`

**Endpoints:**
- `GET /health` - Health check (público)
- `POST /upload` - Upload de PDF (autenticado, base64)
- `POST /analisar` - Analisar edital (autenticado)
- `GET /analises` - Listar análises do usuário (autenticado)
- `GET /analises/:id` - Obter análise específica (autenticado)

**Firestore Collections:**
- `analises_editais`

**Cloud Storage:**
- `editais/{userId}/{timestamp}_{filename}`

---

#### 5️⃣ Analisador TR API
**Base URL:** `https://uniquexhub.web.app/api/analisadortr` ou `https://us-central1-uniquex-487718.cloudfunctions.net/analisadortrApi`

**Endpoints:**
- `GET /health` - Health check (público)
- `POST /upload` - Upload de PDF (autenticado, base64)
- `POST /analisar` - Analisar termo de referência (autenticado)
- `GET /analises` - Listar análises do usuário (autenticado)
- `GET /analises/:id` - Obter análise específica (autenticado)

**Firestore Collections:**
- `analises_tr`

**Cloud Storage:**
- `termos-referencia/{userId}/{timestamp}_{filename}`

---

## 🔐 Autenticação

### Fluxo de Autenticação:
1. Usuário faz login no hub via Google OAuth
2. Hub obtém Firebase ID Token do usuário
3. Ao carregar um app no iframe, o hub envia mensagem `postMessage`:
   ```javascript
   {
     type: 'HUB_AUTH',
     token: '<firebase-id-token>',
     user: {
       uid: 'xxx',
       email: 'usuario@gmail.com',
       displayName: 'Nome',
       photoURL: 'url'
     }
   }
   ```
4. App recebe o token e usa em todas as chamadas à API
5. API valida o token no middleware `verifyAuth`

### Headers para Chamadas à API:
```javascript
{
  'Authorization': 'Bearer <firebase-id-token>',
  'Content-Type': 'application/json'
}
```

---

## 📂 Estrutura do Projeto

```
uniquex-central/
├── .firebaserc                    # Projeto: uniquex-487718
├── firebase.json                  # Config de hosting + functions
├── firestore.rules                # Regras de segurança Firestore
├── firestore.indexes.json         # Índices do Firestore
├── storage.rules                  # Regras de segurança Storage
│
├── functions/                     # Cloud Functions (Node.js 20)
│   ├── package.json
│   ├── index.js                   # Entry point (exporta todas as functions)
│   ├── middleware.js              # Auth, logging, error handling
│   ├── liciai/index.js            # LiciAI API
│   ├── clinia/index.js            # Clínia API
│   ├── jobsagent/index.js         # JobsAgent API
│   ├── analisadoredital/index.js  # Analisador Edital API
│   └── analisadortr/index.js      # Analisador TR API
│
└── hosting/
    └── hub/                       # Site principal (uniquexhub)
        ├── index.html             # Hub com sidebar e auth
        ├── test-auth.html         # Página de teste de auth
        └── apps/                  # Apps integrados
            ├── liciai/
            ├── clinia/
            ├── jobsagent/
            ├── analisadoredital/
            ├── analisadortr/
            └── dashboard/
```

---

## 🔧 Configuração do Firebase

### Firebase Config (Frontend):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDqRoRHQU-3XwUmNrV5MwVW6o_PwbxywVA",
  authDomain: "uniquex-487718.firebaseapp.com",
  projectId: "uniquex-487718",
  storageBucket: "uniquex-487718.firebasestorage.app",
  messagingSenderId: "1050359786854",
  appId: "1:1050359786854:web:6b9c09acbbd637ed5a6ca7"
};
```

---

## 🚀 Deploy

### Deploy Completo:
```bash
cd uniquex-central
firebase deploy
```

### Deploy Seletivo:
```bash
# Apenas Functions
firebase deploy --only functions

# Apenas Hosting
firebase deploy --only hosting

# Function Específica
firebase deploy --only functions:liciaiApi

# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules
firebase deploy --only storage
```

---

## 📊 Firestore Security Rules

**Princípio:** Cada usuário só acessa seus próprios dados.

- **LiciAI:** Dados filtrados por `userId`
- **Clínia:** Dados filtrados por `clinicaId` (que é o `userId`)
- **JobsAgent:** Dados filtrados por `userId`
- **Analisadores:** Dados filtrados por `userId`

---

## 🧪 Testes

### Testar Health Check das APIs:
```bash
curl https://uniquexhub.web.app/api/liciai/health
curl https://uniquexhub.web.app/api/clinia/health
curl https://uniquexhub.web.app/api/jobsagent/health
curl https://uniquexhub.web.app/api/analisadoredital/health
curl https://uniquexhub.web.app/api/analisadortr/health
```

### Testar Hub:
```bash
curl -I https://uniquexhub.web.app
```

### Testar Autenticação:
1. Acesse https://uniquexhub.web.app
2. Faça login com Google
3. Abra o console (F12)
4. Verifique logs: `🔐 Token enviado para [app]`

---

## 📋 Próximos Passos

### Implementações Pendentes:

#### 1. Integração com Vertex AI:
- [ ] LiciAI: Análise de editais com IA
- [ ] JobsAgent: Análise de fit de vagas
- [ ] Analisadores: Extração de dados de PDFs

#### 2. BigQuery (LiciAI):
- [ ] Consultas ao dataset PNCP
- [ ] Views materializadas
- [ ] Integração com Firestore

#### 3. JobsAgent Worker:
- [ ] Scraping automatizado (Cloud Run)
- [ ] Scheduler (Cloud Scheduler)
- [ ] Integração com API

#### 4. Melhorias nos Frontends:
- [ ] Atualizar calls da API para usar `https://uniquexhub.web.app/api/*`
- [ ] Implementar recepção do token via `postMessage`
- [ ] Adicionar loading states
- [ ] Tratamento de erros unificado

#### 5. Python Apps (Analisadores):
- [ ] Criar wrapper Node.js → Python
- [ ] OU migrar para Cloud Run
- [ ] Integração com PDF processing

---

## 🐛 Troubleshooting

### APIs retornando 401 Unauthorized:
- Verificar se o token está sendo enviado no header `Authorization: Bearer <token>`
- Verificar se o token não expirou (renovar com `user.getIdToken(true)`)

### Apps não carregam no iframe:
- Verificar CORS no navegador (F12 > Console)
- Verificar URLs no array `apps` do hub

### Firestore Permission Denied:
- Verificar regras em `firestore.rules`
- Verificar se `userId` / `clinicaId` está sendo enviado corretamente

### Cloud Functions Timeout:
- Aumentar timeout no `firebase.json`:
  ```json
  "functions": {
    "source": "functions",
    "timeout": "60s"
  }
  ```

---

## 📞 Suporte

**Console Firebase:** https://console.firebase.google.com/project/uniquex-487718  
**Logs Functions:** https://console.cloud.google.com/logs/query?project=uniquex-487718  
**Hosting:** https://console.firebase.google.com/project/uniquex-487718/hosting

---

## 🎉 Conclusão

Plataforma **UniqueX** deployada com sucesso! Todos os 6 MVPs agora estão centralizados em:

**🏠 https://uniquexhub.web.app**

Com autenticação unificada e 5 APIs backend funcionando via Cloud Functions.
