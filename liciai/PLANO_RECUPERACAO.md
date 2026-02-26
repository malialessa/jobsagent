# 🔧 Plano de Recuperação - LiciAI

## 📊 Diagnóstico Atual

### Estrutura Encontrada:
```
liciai/public/
├── index.html       (50 linhas)  - Landing page básica
├── app.html         (899 linhas) - Aplicação principal (dashboard)
├── errordash.html   (?)          - Dashboard de erros (separar)
└── project-structure.json        - Metadata
```

### Problema Identificado:
```json
"rewrites": [{
  "source": "**",
  "destination": "/index.html"  ← Todas as rotas vão para index.html
}]
```

Quando usuário clica em "Acessar a Plataforma" → `/app.html`, o Firebase redireciona para `/index.html` por causa do rewrite global.

---

## 🎯 Estratégia de Recuperação

### Opção 1: App.html como Index (RECOMENDADO) ⭐
**Usar app.html diretamente como página principal**

**Pros:**
- ✅ Simples e direto
- ✅ Sem rewrites complexos
- ✅ Landing page pode virar modal interno ou rota separada
- ✅ Usuário já entra direto na aplicação

**Cons:**
- ❌ Perde landing page inicial (mas pode adicionar depois)

**Passos:**
1. Renomear `app.html` → `index.html`
2. Mover landing atual para `landing.html` (backup)
3. Separar errordash.html
4. Deploy

---

### Opção 2: Rewrites Específicos (INTERMEDIÁRIO)
**Configurar rewrites específicos para cada rota**

**Pros:**
- ✅ Mantém landing page
- ✅ Mantém estrutura atual
- ✅ SEO melhor (landing page em `/`)

**Cons:**
- ❌ Mais complexo
- ❌ Pode ter conflitos de rota

**Passos:**
1. Modificar firebase.json para rewrites específicos
2. Configurar `/app` → `app.html`
3. Configurar `/` → `index.html`
4. Separar errordash

---

### Opção 3: SPA com Hash Router (AVANÇADO)
**Transformar em Single Page Application**

**Pros:**
- ✅ Navegação fluida
- ✅ Sem recarregamento de página
- ✅ Mais moderno

**Cons:**
- ❌ Requer refatoração do código
- ❌ Mais trabalho
- ❌ Não vale a pena agora

**Não recomendado neste momento.**

---

## ✅ Plano Escolhido: Opção 1 (App.html como Index)

### Fase 1: Backup e Separação
```bash
# 1. Criar pasta para errordash separado
mkdir -p /workspaces/jobsagent/liciai-errordash/public

# 2. Mover errordash.html
mv /workspaces/jobsagent/liciai/public/errordash.html \
   /workspaces/jobsagent/liciai-errordash/public/index.html

# 3. Backup da landing page atual
mv /workspaces/jobsagent/liciai/public/index.html \
   /workspaces/jobsagent/liciai/public/landing-backup.html
```

### Fase 2: Reorganização Principal
```bash
# 4. App.html vira o novo index.html
cp /workspaces/jobsagent/liciai/public/app.html \
   /workspaces/jobsagent/liciai/public/index.html
```

### Fase 3: Ajustes no Código
```javascript
// No novo index.html, remover lógica de redirecionamento se houver
// Adicionar snippet de autenticação centralizada (hub)
```

### Fase 4: Firebase Config
```json
// firebase.json permanece simples:
{
  "hosting": {
    "site": "liciai1",
    "public": "public",
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"  // Agora index.html É o app
    }]
  }
}
```

### Fase 5: Deploy
```bash
cd /workspaces/jobsagent/liciai
firebase deploy --only hosting:liciai1
```

---

## 🎨 Estrutura Final (Opção 1)

```
liciai/
├── public/
│   ├── index.html           ← App principal (ex-app.html)
│   ├── landing-backup.html  ← Landing antiga (backup)
│   └── project-structure.json
└── firebase.json

liciai-errordash/            ← Novo projeto separado
├── public/
│   └── index.html           ← Dashboard de erros
└── firebase.json
```

---

## 🔄 Alternativa: Opção 2 (Rewrites Específicos)

Se preferir manter landing page:

### firebase.json modificado:
```json
{
  "hosting": {
    "site": "liciai1",
    "public": "public",
    "rewrites": [
      {
        "source": "/app",
        "destination": "/app.html"
      },
      {
        "source": "/app/**",
        "destination": "/app.html"
      },
      {
        "source": "/",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Ajuste no index.html:
```html
<!-- Trocar de -->
<a href="/app.html" ...>

<!-- Para -->
<a href="/app" ...>
```

---

## 📋 Checklist de Execução

### Pré-Deploy:
- [ ] Decidir entre Opção 1 ou Opção 2
- [ ] Fazer backup dos arquivos atuais
- [ ] Criar pasta liciai-errordash (se separar)
- [ ] Modificar código conforme escolha

### Deploy:
- [ ] Testar localmente primeiro (`firebase serve`)
- [ ] Deploy em staging (se possível)
- [ ] Deploy em produção
- [ ] Validar que app.html funciona
- [ ] Validar autenticação

### Pós-Deploy:
- [ ] Adicionar snippet de auth centralizada
- [ ] Redeploy com auth integrada
- [ ] Testar no HubAmalia
- [ ] Configurar errordash separado (se aplicável)

---

## 🆘 Rollback Plan

Se algo der errado:

```bash
# Voltar landing antiga como index
cp /workspaces/jobsagent/liciai/public/landing-backup.html \
   /workspaces/jobsagent/liciai/public/index.html

# Voltar app.html original
# (já está lá, não foi deletado)

# Deploy
firebase deploy --only hosting:liciai1
```

---

## 🎯 Recomendação Final

**Use Opção 1** porque:
1. ✅ Mais simples
2. ✅ Resolve imediatamente
3. ✅ Landing page pode ser adicionada depois como modal
4. ✅ Usuário quer usar o app, não ficar na landing
5. ✅ HubAmalia já funciona como "landing" de certa forma

**Próximos passos:**
1. Executar Fase 1 (backup)
2. Executar Fase 2 (reorganização)
3. Executar Fase 5 (deploy)
4. Testar
5. Adicionar auth centralizada

---

## 📞 Comandos Prontos

### Para Opção 1 (Rápido):
```bash
cd /workspaces/jobsagent/liciai/public
mv index.html landing-backup.html
cp app.html index.html
cd ..
firebase deploy --only hosting:liciai1
```

### Para Opção 2 (Com Landing):
```bash
# Editar firebase.json manualmente
# Ajustar links em index.html
cd /workspaces/jobsagent/liciai
firebase deploy --only hosting:liciai1
```

---

**Qual opção você prefere? 1 (app direto) ou 2 (manter landing)?**
