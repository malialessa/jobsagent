# 🎯 Guia de Deploy Completo - Hub e Apps MVP

## Status Atual dos Apps

### ✅ Apps Prontos para Deploy

1. **LiciAI** (`liciai/`)
   - Status: 100% completo
   - Firebase Project: sharp-footing-475513-c7
   - Site: liciai1
   - Deploy: hosting + functions

2. **Clínia** (`clinia/`)
   - Status: 100% completo  
   - Firebase Project: liciai (usar sharp-footing-475513-c7)
   - Site: clinia
   - Deploy: hosting + functions
   - ✅ Já deployado e funcionando!

3. **Dashboard Divulgação** (`dashboard-divulgacao/`)
   - Status: 100% completo
   - Firebase Project: arquitetodadivulgacao
   - Site: arquitetodadivulgacao
   - Deploy: hosting only

4. **Hub de Gestão** (`hub/`)
   - Status: 100% completo
   - Firebase Project: sharp-footing-475513-c7
   - Site: mvp-hub-manager (precisa criar no Firebase Console)
   - Deploy: hosting only

5. **Serviço jobsagent** (`.`)
   - Status: 100% completo
   - Deploy: Cloud Run (Service + Job)

---

## 🚀 Passo a Passo de Deploy

### 1. Hub de Gestão (NOVO)

```bash
# 1. Criar site no Firebase Console
# Acesse: https://console.firebase.google.com/project/sharp-footing-475513-c7/hosting
# Clique em "Add another site" → Nome: mvp-hub-manager

# 2. Deploy
cd /workspaces/jobsagent/hub
firebase use sharp-footing-475513-c7
firebase deploy --only hosting

# 3. Testar
open https://mvp-hub-manager.web.app
```

### 2. LiciAI

```bash
cd /workspaces/jobsagent/liciai

# Build das Functions
cd functions
npm install
npm run build
cd ..

# Deploy
firebase use sharp-footing-475513-c7
firebase deploy --only hosting,functions

# Testar
open https://liciai1.web.app
```

### 3. Clínia

```bash
cd /workspaces/jobsagent/clinia

# Build das Functions
cd function
npm install
npm run build
cd ..

# Deploy
firebase use sharp-footing-475513-c7  # ou liciai, conforme .firebaserc
firebase deploy --only hosting,functions

# Testar
open https://clinia.web.app
```

### 4. Dashboard Divulgação

```bash
cd /workspaces/jobsagent/dashboard-divulgacao

# Deploy (hosting only)
firebase use arquitetodadivulgacao
firebase deploy --only hosting

# Testar
open https://arquitetodadivulgacao.web.app
```

### 5. Serviço jobsagent (Cloud Run)

```bash
cd /workspaces/jobsagent

# 1. Build e push Docker image
gcloud builds submit --tag gcr.io/arquitetodadivulgacao/jobsagent:latest

# 2. Deploy Cloud Run Service (orquestrador)
gcloud run deploy jobsagent-service \
  --image gcr.io/arquitetodadivulgacao/jobsagent:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT=arquitetodadivulgacao

# 3. Deploy Cloud Run Job (worker)
gcloud run jobs deploy jobsagent-worker \
  --image gcr.io/arquitetodadivulgacao/jobsagent:latest \
  --tasks 1 \
  --max-retries 0 \
  --region us-central1 \
  --set-env-vars GCP_PROJECT=arquitetodadivulgacao \
  --command python,worker.py

# 4. Get Service URL
gcloud run services describe jobsagent-service \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'

# 5. Set Cloud Run Job URL no Service
CLOUD_RUN_JOB_URL="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/arquitetodadivulgacao/jobs/jobsagent-worker:run"
gcloud run services update jobsagent-service \
  --region us-central1 \
  --update-env-vars CLOUD_RUN_JOB_URL=$CLOUD_RUN_JOB_URL
```

---

## 🧪 Validação Pós-Deploy

### Checklist de Testes

#### Hub
- [ ] Acessa https://mvp-hub-manager.web.app
- [ ] Login com Google funciona
- [ ] Lista todos os apps
- [ ] Mostra status correto
- [ ] Botões de ação funcionam
- [ ] Links para apps abrem

#### LiciAI
- [ ] Acessa https://liciai1.web.app
- [ ] Login com Google funciona
- [ ] Lista oportunidades
- [ ] Ranking funciona (com auth)
- [ ] Configurações salvam
- [ ] API responde: `/api/getOportunidades`

#### Clínia
- [ ] Acessa https://clinia.web.app ✅
- [ ] Login com Google funciona
- [ ] Nova triagem funciona
- [ ] Histórico carrega
- [ ] Protocolos listam
- [ ] API responde: `/api/novaTriagem`

#### Dashboard Divulgação
- [ ] Acessa https://arquitetodadivulgacao.web.app
- [ ] Login com Google funciona
- [ ] Dashboard carrega dados
- [ ] Ações de moderação funcionam

#### Serviço jobsagent
- [ ] Endpoint principal responde
- [ ] Hub integrado funciona
- [ ] Job pode ser disparado
- [ ] Logs aparecem no Firestore

### Script de Teste Automatizado

```bash
cd /workspaces/jobsagent
python test_endpoints.py
```

---

## 🔧 Troubleshooting

### Erro: "Site não existe"

```bash
# Criar site no Firebase Console primeiro
# Ou via CLI:
firebase hosting:sites:create mvp-hub-manager --project sharp-footing-475513-c7
```

### Erro: "npm run build falha"

```bash
# Verificar se node_modules existe
cd functions  # ou function
npm install
npm run build

# Se tsconfig.json reclamar de 'src':
# Verificar se pasta src/ existe e contém index.ts
ls -la src/
```

### Erro: "Permission denied no GCP"

```bash
# Re-autenticar
gcloud auth login
gcloud config set project arquitetodadivulgacao

# Verificar IAM roles
gcloud projects get-iam-policy arquitetodadivulgacao
```

### Erro: "Firebase token expirado"

```bash
firebase login --reauth
firebase projects:list
```

### API retorna 404

**LiciAI API:**
- Verificar se Functions foram deployadas: `firebase functions:list`
- URL correta: `https://us-east1-sharp-footing-475513-c7.cloudfunctions.net/api`
- Verificar rewrites no firebase.json

**Clínia API:**
- URL correta: `https://us-east1-sharp-footing-475513-c7.cloudfunctions.net/cliniaApi/api`
  OU
- Via hosting: `https://clinia.web.app/api`

---

## 📊 URLs Finais dos Apps

Após deploy completo:

| App | Hosting | API | Status |
|-----|---------|-----|--------|
| **Hub** | https://mvp-hub-manager.web.app | /hub/api/* (via Cloud Run) | Novo |
| **LiciAI** | https://liciai1.web.app | /api/getOportunidades, etc | Deploy pendente |
| **Clínia** | https://clinia.web.app | /api/novaTriagem, etc | ✅ Deployado |
| **Dashboard** | https://arquitetodadivulgacao.web.app | - | Deploy pendente |
| **jobsagent** | Cloud Run Service URL | /, /hub, /hub/api/* | Deploy pendente |

---

## 🎨 Melhorias Implementadas no Hub

### Design
- ✨ Glassmorphism e gradientes modernos
- 📱 Totalmente responsivo
- 🎭 Animações e transições suaves
- 🌈 Sistema de cores consistente
- 💫 Micro-interações

### UX
- 🔔 Toast notifications
- 💀 Skeleton loaders
- 🎯 Cards interativos
- 📊 KPIs em tempo real
- 💻 Console de ações
- 🔍 Checklist expandível
- ⚡ Feedback visual imediato

### Features
- 🔐 Autenticação Google
- 📋 Inventário automático
- ✅ Diagnóstico técnico
- 🚀 Execução de ações
- 🔗 Links diretos para apps
- 🔄 Refresh manual
- 📱 PWA-ready

---

## 📝 Próximos Passos

### Curto Prazo
1. Deploy do Hub no Firebase Hosting
2. Completar deploy de LiciAI e Dashboard
3. Configurar domínio customizado (opcional)
4. Adicionar CI/CD (GitHub Actions)

### Médio Prazo
1. Implementar monitoramento (Cloud Monitoring)
2. Adicionar testes automatizados (Jest, Pytest)
3. Configurar alertas de erro
4. Otimizar performance (caching, CDN)

### Longo Prazo
1. Implementar rate limiting
2. Adicionar autenticação MFA
3. Dashboard de analytics
4. Versioning e rollback automático

---

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verificar logs: `firebase functions:log`
2. Console do GCP: https://console.cloud.google.com
3. Firebase Console: https://console.firebase.google.com
4. Documentação: `/workspaces/jobsagent/DIAGNOSTICO.md`

---

**Desenvolvido com ❤️ para gestão eficiente de MVPs**

*Última atualização: Fevereiro 2026*
