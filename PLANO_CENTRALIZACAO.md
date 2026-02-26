# 🎯 Plano de Centralização - Projeto uniquex-487718

## 📊 Visão Geral

**Objetivo**: Centralizar todos os MVPs em um único projeto Firebase com um hub unificado.

**Projeto Central**: `uniquex-487718`  
**Hub Principal**: `uniquexhub` (substitui hubamalia)

---

## 🗂️ Aplicações Mapeadas

### Apps Funcionais:
1. **HubAmalia** → **UniqueXHub** (novo hub central)
2. **LiciAI** - Licitações com IA
3. **Clínia** - Gestão clínica
4. **JobsAgent** - Agente de empregos IA
5. **Dashboard** - Dashboard de divulgação
6. **LiciAI ErrorDash** - Dashboard de erros
7. **AnalisadorEdital** - Análise de editais
8. **AnalisadorTR** - Análise de termos de referência
9. **Eixa** - (a verificar)

---

## 🏗️ Nova Arquitetura

### Firebase Hosting (Multi-site):
```
uniquex-487718
├── uniquexhub (hosting principal)
│   └── Hub com sidebar + todas as apps
├── liciai-app (hosting)
├── clinia-app (hosting)
├── jobsagent-app (hosting)
├── dashboard-app (hosting)
├── analisadoredital-app (hosting)
└── analisadortr-app (hosting)
```

### Cloud Functions (por app):
```
functions/
├── liciai/
│   ├── index.js
│   └── package.json
├── clinia/
│   ├── index.js
│   └── package.json
├── jobsagent/
│   ├── index.js
│   └── package.json
├── analisadoredital/
│   ├── index.js
│   └── package.json
└── analisadortr/
    ├── index.js
    └── package.json
```

---

## 🎯 Estratégia de Implementação

### Fase 1: Setup do Projeto Central ✅
```bash
# 1. Criar pasta do projeto unificado
mkdir -p /workspaces/jobsagent/uniquex-central

# 2. Estrutura básica
uniquex-central/
├── firebase.json           # Config unificado
├── .firebaserc            # Projeto: uniquex-487718
├── functions/             # Todas as Cloud Functions
│   ├── liciai/
│   ├── clinia/
│   ├── jobsagent/
│   ├── analisadoredital/
│   └── analisadortr/
└── hosting/               # Todos os frontends
    ├── hub/               # Hub principal
    ├── liciai/
    ├── clinia/
    ├── jobsagent/
    ├── dashboard/
    ├── analisadoredital/
    └── analisadortr/
```

### Fase 2: Migração dos Frontends
```bash
# Copiar cada public/ para hosting/
cp -r hubamalia/public/ uniquex-central/hosting/hub/
cp -r liciai/public/ uniquex-central/hosting/liciai/
cp -r clinia/clinia/public/ uniquex-central/hosting/clinia/
# ... etc
```

### Fase 3: Criação das Cloud Functions

Para cada app, criar:

#### Template de Function:
```javascript
// functions/liciai/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));

// Inicializar Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Endpoints da LiciAI
app.post('/api/buscar-licitacoes', async (req, res) => {
  try {
    // Lógica aqui
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/oportunidades', async (req, res) => {
  try {
    const snapshot = await db.collection('licitacoes').get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.api = functions.https.onRequest(app);
```

### Fase 4: Firebase Config Unificado

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "codebase": "default"
  },
  "hosting": [
    {
      "site": "uniquexhub",
      "public": "hosting/hub",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "liciai-app",
      "public": "hosting/liciai",
      "rewrites": [
        { "source": "/api/**", "function": "liciai-api" },
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "clinia-app",
      "public": "hosting/clinia",
      "rewrites": [
        { "source": "/api/**", "function": "clinia-api" },
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "jobsagent-app",
      "public": "hosting/jobsagent",
      "rewrites": [
        { "source": "/api/**", "function": "jobsagent-api" },
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "analisadoredital-app",
      "public": "hosting/analisadoredital",
      "rewrites": [
        { "source": "/api/**", "function": "analisadoredital-api" },
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "site": "analisadortr-app",
      "public": "hosting/analisadortr",
      "rewrites": [
        { "source": "/api/**", "function": "analisadortr-api" },
        { "source": "**", "destination": "/index.html" }
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### Fase 5: Package.json das Functions

```json
{
  "name": "uniquex-functions",
  "version": "1.0.0",
  "engines": {
    "node": "20"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "@google-cloud/firestore": "^7.0.0",
    "@google-cloud/storage": "^7.0.0",
    "axios": "^1.6.0"
  }
}
```

### Fase 6: Index.js Principal

```javascript
// functions/index.js
const liciai = require('./liciai');
const clinia = require('./clinia');
const jobsagent = require('./jobsagent');
const analisadoredital = require('./analisadoredital');
const analisadortr = require('./analisadortr');

// Exportar todas as functions
exports.liciai = liciai;
exports.clinia = clinia;
exports.jobsagent = jobsagent;
exports.analisadoredital = analisadoredital;
exports.analisadortr = analisadortr;
```

---

## 🔄 Processo de Migração

### 1. Preparação
```bash
# Criar estrutura
mkdir -p uniquex-central/{functions,hosting}/{liciai,clinia,jobsagent,analisadoredital,analisadortr}
mkdir -p uniquex-central/hosting/hub

# Configurar Firebase
cd uniquex-central
firebase init
# Selecionar: Firestore, Functions, Hosting, Storage
# Projeto: uniquex-487718
```

### 2. Migração de Cada App

```bash
# Para cada app, executar:

# Copiar frontend
cp -r <app>/public/* uniquex-central/hosting/<app>/

# Criar function básica
cat > uniquex-central/functions/<app>/index.js << 'EOF'
const functions = require('firebase-functions');
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: '<APP_NAME>' });
});

exports.api = functions.https.onRequest(app);
EOF

# Criar package.json
cat > uniquex-central/functions/<app>/package.json << 'EOF'
{
  "name": "<app>-functions",
  "dependencies": {
    "firebase-functions": "^5.0.0",
    "express": "^4.18.0"
  }
}
EOF
```

### 3. Criar Sites no Firebase

```bash
firebase hosting:sites:create uniquexhub
firebase hosting:sites:create liciai-app
firebase hosting:sites:create clinia-app
firebase hosting:sites:create jobsagent-app
firebase hosting:sites:create analisadoredital-app
firebase hosting:sites:create analisadortr-app
```

### 4. Deploy Inicial

```bash
cd uniquex-central

# Deploy functions
firebase deploy --only functions

# Deploy hosting (um por vez para testar)
firebase deploy --only hosting:uniquexhub
firebase deploy --only hosting:liciai-app
# ... etc
```

---

## 📋 APIs a Implementar

### LiciAI APIs:
- `POST /api/buscar-licitacoes` - Buscar licitações
- `GET /api/oportunidades` - Listar oportunidades
- `POST /api/analisar-edital` - Analisar edital com IA
- `GET /api/contratos` - Listar contratos

### Clínia APIs:
- `POST /api/pacientes` - Criar/atualizar paciente
- `GET /api/pacientes` - Listar pacientes
- `POST /api/consultas` - Agendar consulta
- `GET /api/dashboard` - Dashboard de métricas

### JobsAgent APIs:
- `POST /api/scrape` - Executar scraping
- `GET /api/vagas` - Listar vagas
- `POST /api/analisar-vaga` - Analisar vaga com IA
- `PUT /api/settings` - Atualizar configurações

### AnalisadorEdital APIs:
- `POST /api/upload` - Upload de edital (PDF)
- `POST /api/analisar` - Analisar edital
- `GET /api/analises` - Listar análises

### AnalisadorTR APIs:
- `POST /api/upload` - Upload de TR (PDF)
- `POST /api/analisar` - Analisar TR
- `GET /api/analises` - Listar análises

---

## 🔐 Autenticação Centralizada

Todas as functions usarão o mesmo middleware de auth:

```javascript
// functions/middleware/auth.js
const admin = require('firebase-admin');

async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
  }
}

module.exports = verifyAuth;
```

---

## 🎯 URLs Finais

```
Hub:              https://uniquexhub.web.app
LiciAI:           https://liciai-app.web.app
Clínia:           https://clinia-app.web.app
JobsAgent:        https://jobsagent-app.web.app
Dashboard:        https://dashboard-app.web.app
AnalisadorEdital: https://analisadoredital-app.web.app
AnalisadorTR:     https://analisadortr-app.web.app
```

---

## ✅ Checklist de Implementação

### Preparação:
- [ ] Criar estrutura uniquex-central/
- [ ] Configurar Firebase CLI para uniquex-487718
- [ ] Criar todos os sites de hosting
- [ ] Configurar firebase.json unificado

### Por App (repetir para cada):
- [ ] Copiar frontend para hosting/
- [ ] Criar function básica
- [ ] Implementar APIs específicas
- [ ] Adicionar autenticação
- [ ] Testar localmente
- [ ] Deploy

### Finalização:
- [ ] Atualizar hub com novas URLs
- [ ] Testar autenticação centralizada
- [ ] Migrar dados (se necessário)
- [ ] Documentar APIs
- [ ] Deletar projetos antigos

---

## 🚀 Próximos Passos Imediatos

1. **Criar estrutura base** do uniquex-central
2. **Mapear APIs existentes** de cada app
3. **Implementar function template** reutilizável
4. **Migrar app por app** começando pelo mais simples
5. **Validar e documentar** cada etapa

---

**Pronto para começar?** Vou criar a estrutura agora!
