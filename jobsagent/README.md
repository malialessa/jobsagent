# JobsAgent - Deploy Completo

## ✅ Status

### Frontend
- **URL**: https://jobsagent.web.app
- **Status**: ✅ Deployado e funcionando
- **Projeto Firebase**: arquitetodadivulgacao
- **Tecnologias**: HTML, Tailwind CSS, Firebase Firestore

### Backend (Cloud Run)
- **URL da API**: https://jobagent-760851989407.us-central1.run.app
- **Arquivo**: `/workspaces/jobsagent/main.py`
- **Worker**: `/workspaces/jobsagent/worker.py`
- **Dockerfile**: `/workspaces/jobsagent/Dockerfile`

### Integração com HubAmalia
- **Status**: ✅ Adicionado ao hub
- **URL do Hub**: https://hubamalia.web.app
- **Ícone**: SVG de maleta (briefcase)

## 🚀 Como Funciona

### Frontend (jobsagent.web.app)
1. Interface web para visualizar vagas coletadas
2. Permite configurar perfil profissional
3. Botão para executar o agente de scraping
4. Usa Firestore para armazenar vagas e configurações

### Backend (Cloud Run)
1. **main.py**: API Flask que orquestra jobs
   - Endpoint `/` (POST): Aciona o worker
   - Endpoint `/hub`: Serve o hub de gestão
   
2. **worker.py**: Job que executa scraping
   - Usa Selenium para coletar vagas
   - Analisa com Vertex AI (Gemini)
   - Filtra por relevância
   - Salva no Firestore

## 📋 Deploy do Backend (se necessário)

### Pré-requisitos
```bash
# Instalar gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Build e Deploy

```bash
cd /workspaces/jobsagent

# 1. Build da imagem Docker
gcloud builds submit --tag gcr.io/arquitetodadivulgacao/jobsagent:latest \
  --project=arquitetodadivulgacao

# 2. Deploy do Service (API)
gcloud run deploy jobsagent-service \
  --image gcr.io/arquitetodadivulgacao/jobsagent:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project=arquitetodadivulgacao \
  --set-env-vars GCP_PROJECT=arquitetodadivulgacao

# 3. Deploy do Job (Worker)
gcloud run jobs deploy jobsagent-worker \
  --image gcr.io/arquitetodadivulgacao/jobsagent:latest \
  --tasks 1 \
  --max-retries 0 \
  --region us-central1 \
  --project=arquitetodadivulgacao \
  --set-env-vars GCP_PROJECT=arquitetodadivulgacao \
  --command python,worker.py

# 4. Obter URL do Service
SERVICE_URL=$(gcloud run services describe jobsagent-service \
  --platform managed \
  --region us-central1 \
  --project=arquitetodadivulgacao \
  --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"

# 5. Configurar URL do Job no Service
JOB_URL="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/arquitetodadivulgacao/jobs/jobsagent-worker:run"

gcloud run services update jobsagent-service \
  --region us-central1 \
  --project=arquitetodadivulgacao \
  --update-env-vars CLOUD_RUN_JOB_URL=$JOB_URL

# 6. Configurar variáveis de ambiente (se necessário)
gcloud run services update jobsagent-service \
  --region us-central1 \
  --project=arquitetodadivulgacao \
  --update-env-vars RAPIDAPI_KEY=your_api_key,APPS_SCRIPT_URL=your_url
```

## 🔐 Autenticação Centralizada

Para integrar com autenticação do HubAmalia:

1. Adicione o conteúdo de [auth-snippet.html](auth-snippet.html) no final do `<body>` em `public/index.html`

2. O hub enviará automaticamente:
   - Token JWT do Firebase Auth
   - Dados do usuário (email, nome, foto)

3. Use `fetchWithAuth()` para requisições autenticadas:
```javascript
// Exemplo de uso
fetchWithAuth('https://jobagent-760851989407.us-central1.run.app', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ log_id: 'test' })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 📊 Estrutura de Dados (Firestore)

### Collection: `jobapplications`
```javascript
{
  title: "Desenvolvedor Python Senior",
  company: "Empresa XYZ",
  location: "São Paulo, SP",
  url: "https://...",
  fit_score: 8.5,
  analysis: "Vaga alinhada com seu perfil...",
  status: "pending", // pending, aplicada, descartada
  created_at: Timestamp
}
```

### Document: `user_settings/config`
```javascript
{
  profile: "Desenvolvedor Python com expertise em...",
  job_sites: ["LinkedIn: python remote", "Indeed: senior python"],
  notif_email: "user@example.com",
  min_fit_score: 7
}
```

## 🧪 Testar

### Frontend
```bash
# Abrir no navegador
open https://jobsagent.web.app

# Ou testar localmente
cd jobsagent
python -m http.server 8000 --directory public
open http://localhost:8000
```

### Backend (local)
```bash
cd /workspaces/jobsagent
pip install -r requirements.txt

# Rodar API
python main.py
# Acesse: http://localhost:8080

# Rodar Worker diretamente
python worker.py
```

### Testar API
```bash
# Acionar job via API
curl -X POST https://jobagent-760851989407.us-central1.run.app \
  -H "Content-Type: application/json" \
  -d '{"log_id": "test-123"}'
```

## 📚 Funcionalidades

### Coleta de Vagas
- ✅ Scraping com Selenium
- ✅ Análise de relevância com Gemini
- ✅ Filtragem por score mínimo
- ✅ Deduplicação automática
- ✅ Logs em tempo real no Firestore

### Interface Web
- ✅ Dashboard com lista de vagas
- ✅ Cards com informações detalhadas
- ✅ Score visual (anel de progresso)
- ✅ Ações: aplicar, descartar, abrir vaga
- ✅ Configurações de perfil
- ✅ Execução manual do agente

## 🎯 Próximos Passos

1. **Autenticação**: Adicionar snippet de auth centralizada
2. **Notificações**: Implementar email quando encontrar vagas
3. **Automação**: Configurar Cloud Scheduler para rodar diariamente
4. **Analytics**: Adicionar métricas de uso

## 📱 Acesso Rápido

- **Frontend**: https://jobsagent.web.app
- **HubAmalia**: https://hubamalia.web.app → JobsAgent
- **Firestore Console**: https://console.firebase.google.com/project/arquitetodadivulgacao/firestore
- **Cloud Run Console**: https://console.cloud.google.com/run?project=arquitetodadivulgacao
