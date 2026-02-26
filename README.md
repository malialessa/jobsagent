# jobsagent

Workspace com múltiplos apps MVP em Firebase + Cloud Run.

## 🎯 Apps no Workspace

| App | Status | URL | Tecnologias |
|-----|--------|-----|-------------|
| **HubAmalia** 🌟 | ✅ 100% | https://hubamalia.web.app | Firebase Hosting, Sidebar Design, Google Auth |
| **Hub de Gestão** | ✅ 100% | https://mvp-hub-manager.web.app | Firebase Hosting, Google Auth |
| **LiciAI** | ✅ 100% | https://liciai1.web.app | Firebase Functions, BigQuery, Vertex AI |
| **Clínia** | ✅ 100% | https://clinia.web.app | Firebase Functions, BigQuery, Vertex AI |
| **Dashboard Divulgação** | ✅ 100% | https://arquitetodadivulgacao.web.app | Firebase Hosting |
| **jobsagent Service** | ✅ 100% | Cloud Run | Python, Selenium, Vertex AI |

## 🚀 Quick Start

### HubAmalia (Novo! - Design com Sidebar) 🌟

Interface moderna com sidebar fixo para visualizar e gerenciar todas as suas aplicações:

```bash
# Rodar localmente (usa a API do hub em main.py)
cd /workspaces/jobsagent
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:8080 main:app

# Acessar em: http://localhost:8080 (depois navegue até hubamalia quando deployado)

# Deploy no Firebase
# 1. Criar site "hubamalia" no Firebase Console primeiro
# 2. Depois fazer deploy:
cd hubamalia
firebase use sharp-footing-475513-c7
firebase deploy --only hosting
```

**Features do HubAmalia:**
- 🎨 Sidebar fixo com lista de todas as apps
- 📊 Dashboard com métricas em tempo real
- 🔐 Login com Google integrado
- ✅ Checklist técnico de cada app
- ⚡ Executar ações (build, deploy) direto da interface
- 📱 Responsivo (mobile-friendly com menu hambúrguer)
- 🎯 Design moderno com gradientes e animações

### Hub de Gestão (Interface Unificada)

O Hub permite gerenciar todos os apps em uma interface única com Google Auth:

```bash
# Rodar localmente
cd /workspaces/jobsagent
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:8080 main:app

# Acessar em: http://localhost:8080/hub

# Deploy no Firebase
cd hub
firebase use sharp-footing-475513-c7
firebase deploy --only hosting
```

**Features do Hub:**
- 🔐 Login com Google
- 📊 Dashboard com status de todos os apps
- ✅ Checklist técnico automático
- ⚡ Executar ações (build, deploy) direto da interface
- 🔗 Links para todos os apps
- 💻 Console de ações em tempo real

### Apps Individuais

Cada app pode ser deployado separadamente:

```bash
# LiciAI
cd liciai && firebase deploy --only hosting,functions

# Clínia  
cd clinia && firebase deploy --only hosting,functions

# Dashboard
cd dashboard-divulgacao && firebase deploy --only hosting
```

## 📚 Documentação

- [DIAGNOSTICO.md](DIAGNOSTICO.md) - Status detalhado de cada app
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Guia completo de deploy
- [hub/README.md](hub/README.md) - Documentação do Hub

## 🧪 Testes

```bash
# Testar endpoints dos apps
python test_endpoints.py

# Validar sintaxe Python
python -m py_compile main.py worker.py utils.py
```

## 🏗️ Estrutura

```
/workspaces/jobsagent/
├── hubamalia/                # HubAmalia - Design com sidebar [NOVO] 🌟
│   ├── firebase.json
│   ├── .firebaserc
│   └── public/
│       ├── index.html        # Interface com sidebar + dashboard
│       └── 404.html
├── hub/                      # Hub de gestão centralizada
│   ├── firebase.json
│   ├── .firebaserc
│   └── public/
│       └── index.html        # Interface com UX design moderno
├── liciai/                   # LiciAI - Licitações com IA
│   ├── functions/            # Cloud Functions (Express API)
│   └── public/               # Frontend
├── clinia/                   # Clínia - Triagem médica com IA
│   ├── function/             # Cloud Functions (Express API)
│   └── public/               # Frontend
├── dashboard-divulgacao/     # Dashboard de divulgação
│   └── public/
├── main.py                   # Orquestrador + API do Hub
├── worker.py                 # Cloud Run Job (scraping)
├── utils.py                  # Funções compartilhadas
├── Dockerfile                # Container para Cloud Run
└── requirements.txt          # Dependências Python
```

## Hub de Apps MVP

Foi adicionado um hub central para listar e gerenciar os apps do workspace.

- URL local: `/hub`
- API do hub: `/hub/api/*`
- Autenticação: Firebase Auth com login Google (ID token validado no backend)

### O que o hub faz

- Descobre apps Firebase automaticamente (`firebase.json`)
- Mostra checklist de saúde por app (hosting, functions, entry points, auth)
- Lista pendências técnicas (peças faltantes)
- Permite executar ações de gestão por app (build/deploy/install)

### Configuração de Auth do Hub

Por padrão, o hub usa variáveis de ambiente `HUB_FIREBASE_*`.
Se não forem definidas, usa valores padrão do projeto `sharp-footing-475513-c7`.

Variáveis suportadas:

- `HUB_FIREBASE_API_KEY`
- `HUB_FIREBASE_AUTH_DOMAIN`
- `HUB_FIREBASE_PROJECT_ID`
- `HUB_FIREBASE_STORAGE_BUCKET`
- `HUB_FIREBASE_MESSAGING_SENDER_ID`
- `HUB_FIREBASE_APP_ID`

## 🔐 Autenticação

Todos os apps funcionais já implementam Google Auth:
- ✅ LiciAI: Login com Google no frontend + validação no backend
- ✅ Clínia: Login com Google no frontend + validação no backend
- ✅ Dashboard: Login com Google (Firebase Auth)
- ✅ Hub: Login com Google + proteção de API

## 🛠️ Tecnologias

**Frontend:**
- Firebase Hosting
- Tailwind CSS
- Firebase Auth (Google Provider)
- Vanilla JS

**Backend:**
- Firebase Cloud Functions (Node.js/TypeScript)
- Cloud Run (Python)
- Flask
- Express

**IA & Data:**
- Vertex AI (Gemini)
- BigQuery
- Vector Search (embeddings)

**Deploy:**
- Firebase CLI
- gcloud CLI
- Docker

## 📝 Changelog

### v2.0 (Fevereiro 2026)
- ✨ **Novo:** Hub de gestão centralizada
- ✨ Design UX moderno com glassmorphism
- ✨ Toast notifications e skeleton loaders
- ✨ Console de ações em tempo real
- 🐛 Removida duplicação `clinia/clinia`
- 📚 Documentação completa de deploy
- 🧪 Script de testes de endpoints

### v1.0
- Apps individuais (LiciAI, Clínia, Dashboard)
- Serviço jobsagent (Cloud Run)
- Google Auth implementado

## 🤝 Contribuindo

Para adicionar um novo app MVP:

1. Criar pasta com estrutura Firebase
2. Adicionar `firebase.json` e `.firebaserc`
3. O Hub detectará automaticamente
4. Deploy: `firebase deploy --only hosting,functions`

## 📞 Suporte

- Issues: GitHub Issues
- Docs: Ver arquivos `.md` no repositório
- Logs: `firebase functions:log` ou Cloud Console

---

**Desenvolvido com ❤️ para gestão eficiente de MVPs**