# 🎯 Guia Rápido - Todas as Aplicações

## Status Atual ✅

| Aplicação | URL | Status |
|-----------|-----|--------|
| **HubAmalia** | https://hubamalia.web.app | ✅ Deployado |
| **JobsAgent** | https://jobsagent.web.app | ✅ Deployado |
| **LiciAI** | https://liciai1.web.app | ✅ Deployado |
| **Clínia** | https://clinia.web.app | ✅ Deployado |
| **Dashboard** | https://arquitetodadivulgacao.web.app | ✅ Deployado |

## 🌟 HubAmalia - Portal Unificado

**URL**: https://hubamalia.web.app

### Funcionalidades
- 🔐 Login único com Google Auth
- 📊 Visualização de todas as apps em um só lugar
- 🎨 Sidebar moderna com navegação
- 🔄 Autenticação centralizada (SSO)

### Como Usar
1. Acesse https://hubamalia.web.app
2. Faça login com Google
3. Clique em qualquer aplicação no sidebar
4. A app será carregada com autenticação automática

---

## 💼 JobsAgent - Agente de Empregos IA

**Frontend**: https://jobsagent.web.app  
**Backend**: https://jobagent-760851989407.us-central1.run.app

### O que faz
- 🤖 Scraping automático de vagas de emprego
- 🧠 Análise de relevância com IA (Gemini)
- 📊 Dashboard para visualizar vagas
- ⚙️ Configuração de perfil profissional

### Pastas
```
/workspaces/jobsagent/
├── main.py              # API Flask (Cloud Run Service)
├── worker.py            # Worker de scraping (Cloud Run Job)
├── Dockerfile           # Container para ambos
└── jobsagent/
    ├── public/
    │   └── index.html   # Frontend
    ├── firebase.json
    └── README.md        # Documentação completa
```

### Deploy Frontend
```bash
cd /workspaces/jobsagent/jobsagent
firebase deploy --only hosting:jobsagent
```

### Deploy Backend
Ver [jobsagent/README.md](jobsagent/README.md) para instruções completas do Cloud Run.

---

## 🏥 LiciAI - Licitações com IA

**URL**: https://liciai1.web.app

### Pastas
```
/workspaces/jobsagent/liciai/
├── public/
│   ├── index.html
│   ├── app.html
│   └── errordash.html
├── functions/          # Cloud Functions (se houver)
├── firebase.json
└── auth-snippet.html  # Para integração com hub
```

### Deploy
```bash
cd /workspaces/jobsagent/liciai
firebase deploy --only hosting:liciai1
```

---

## 🏥 Clínia - Gestão Clínica

**URL**: https://clinia.web.app

### Pastas
```
/workspaces/jobsagent/clinia/clinia/
├── public/
├── firebase.json
└── auth-snippet.html
```

### Deploy
```bash
cd /workspaces/jobsagent/clinia/clinia
firebase deploy --only hosting:clinia
```

---

## 📊 Dashboard - Divulgação

**URL**: https://arquitetodadivulgacao.web.app

### Pastas
```
/workspaces/jobsagent/dashboard-divulgacao/
├── public/
├── firebase.json
└── auth-snippet.html
```

### Deploy
```bash
cd /workspaces/jobsagent/dashboard-divulgacao
firebase deploy --only hosting
```

---

## 🔐 Autenticação Centralizada

### Como Funciona

1. **Hub** gerencia o login
2. Usuário faz login UMA VEZ no https://hubamalia.web.app
3. Hub obtém token do Firebase Auth
4. Ao clicar em uma app, hub envia token automaticamente
5. App recebe token e pode fazer requisições autenticadas

### Integração nas Apps

Cada app tem um arquivo `auth-snippet.html` com o código para receber autenticação:

**Para LiciAI**:
```bash
# Copie o conteúdo de liciai/auth-snippet.html
# Cole no final do <body> em:
# - liciai/public/index.html
# - liciai/public/app.html
# - liciai/public/errordash.html
```

**Para Clínia**:
```bash
# Copie o conteúdo de clinia/clinia/auth-snippet.html
# Cole no final do <body> dos HTMLs da Clínia
```

**Para Dashboard**:
```bash
# Copie o conteúdo de dashboard-divulgacao/auth-snippet.html
# Cole no final do <body> dos HTMLs do Dashboard
```

**Para JobsAgent**:
```bash
# Copie o conteúdo de jobsagent/auth-snippet.html
# Cole no final do <body> em jobsagent/public/index.html
```

### Documentação Completa
Ver [hubamalia/AUTH_INTEGRATION.md](hubamalia/AUTH_INTEGRATION.md)

---

## 🚀 Deploy de Todas as Apps

```bash
# HubAmalia
cd /workspaces/jobsagent/hubamalia
firebase deploy --only hosting:hubamalia

# JobsAgent
cd /workspaces/jobsagent/jobsagent
firebase deploy --only hosting:jobsagent

# LiciAI
cd /workspaces/jobsagent/liciai
firebase deploy --only hosting:liciai1

# Clínia
cd /workspaces/jobsagent/clinia/clinia
firebase deploy --only hosting:clinia

# Dashboard
cd /workspaces/jobsagent/dashboard-divulgacao
firebase deploy --only hosting
```

---

## 🧪 Testar Localmente

### HubAmalia
```bash
cd /workspaces/jobsagent/hubamalia
python -m http.server 8899 --directory public
# Abra: http://localhost:8899
```

### Qualquer App
```bash
cd /workspaces/jobsagent/<pasta-da-app>
python -m http.server 8000 --directory public
# Abra: http://localhost:8000
```

---

## 📚 Estrutura do Projeto

```
/workspaces/jobsagent/
├── hubamalia/                    # ⭐ Portal principal
│   ├── public/index.html         # Interface com sidebar
│   └── AUTH_INTEGRATION.md       # Guia de autenticação
├── jobsagent/                    # 💼 Agente de empregos
│   ├── public/index.html         # Frontend
│   └── README.md
├── liciai/                       # 🏛️ Licitações
│   └── public/
├── clinia/clinia/                # 🏥 Gestão clínica
│   └── public/
├── dashboard-divulgacao/         # 📊 Dashboard
│   └── public/
├── main.py                       # Backend JobsAgent (Flask)
├── worker.py                     # Worker JobsAgent (Scraping)
├── Dockerfile                    # Container JobsAgent
└── README.md                     # Este arquivo
```

---

## 🎯 Fluxo de Trabalho

```
1. Usuário → https://hubamalia.web.app
2. Login com Google
3. Sidebar mostra: LiciAI, Clínia, Dashboard, JobsAgent
4. Clica em "JobsAgent"
5. Hub carrega https://jobsagent.web.app no iframe
6. Hub envia token automaticamente
7. JobsAgent recebe e está autenticado
8. Usuário usa a aplicação normalmente
```

---

## ⚙️ Projetos Firebase

- **HubAmalia, LiciAI**: sharp-footing-475513-c7
- **JobsAgent, Clínia, Dashboard**: arquitetodadivulgacao

---

## 📞 Comandos Úteis

```bash
# Ver todos os sites Firebase
firebase hosting:sites:list

# Status de um deploy
firebase hosting:channel:list

# Logs de Cloud Functions (se houver)
firebase functions:log

# Ver projetos disponíveis
firebase projects:list

# Mudar de projeto
firebase use <project-id>
```

---

## 🎨 Personalização

### Adicionar Nova App ao Hub

Edite `/workspaces/jobsagent/hubamalia/public/index.html` linha ~455:

```javascript
const apps = [
  // Apps existentes...
  {
    id: 'minha-nova-app',
    name: 'Minha App',
    url: 'https://minha-app.web.app',
    icon: `<path d="M12 2L2 7l10 5 10-5-10-5z..."/>`
  }
];
```

---

## ✅ Checklist Pós-Deploy

- [ ] HubAmalia carrega corretamente
- [ ] Login com Google funciona
- [ ] Todas as apps aparecem no sidebar
- [ ] Clicar em uma app carrega o iframe
- [ ] Console do navegador não mostra erros críticos
- [ ] Integração de autenticação implementada (snippets adicionados)
- [ ] Backend do JobsAgent está rodando (se aplicável)

---

## 🐛 Troubleshooting

### "Page Not Found" ao abrir uma app
```bash
# Fazer deploy novamente
cd /workspaces/jobsagent/<pasta-da-app>
firebase deploy --only hosting
```

### Página branca no HubAmalia
```bash
# Verificar console do navegador (F12)
# Procurar erros JavaScript
# Verificar se Firebase SDK carregou
```

### Autenticação não funciona
```bash
# 1. Verificar se snippet foi adicionado
# 2. Abrir console (F12) e procurar por logs "🔐 Token recebido"
# 3. Verificar origem da mensagem (deve ser hubamalia.web.app)
```

### Cloud Run não responde
```bash
# Ver logs (se gcloud instalado)
gcloud run services logs read jobsagent-service \
  --project=arquitetodadivulgacao \
  --region=us-central1
```

---

## 📧 Contato

Projeto: jobsagent  
Workspace: /workspaces/jobsagent
