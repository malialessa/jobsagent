# LiciAI ErrorDash

Dashboard de análise de erros e monitoramento para LiciAI.

## 📊 Sobre

Este é o **dashboard de erros** do LiciAI, separado da aplicação principal.

- **Tamanho**: 77KB (1485 linhas)
- **Tema**: Dark mode profissional
- **Recursos**:
  - Visualização de PDFs com PDF.js
  - Interface de código com Fira Code
  - Tema escuro otimizado
  - Sidebar navegável

## 🚀 Deploy

### Criar Site Firebase

```bash
cd /workspaces/jobsagent/liciai-errordash
firebase use sharp-footing-475513-c7
firebase hosting:sites:create liciai-errordash
```

### Deploy

```bash
firebase deploy --only hosting:liciai-errordash
```

### Acessar

Após o deploy, estará disponível em:
```
https://liciai-errordash.web.app
```

## 🔗 Integração com HubAmalia

Para adicionar ao hub, edite `hubamalia/public/index.html`:

```javascript
const apps = [
  // Apps existentes...
  {
    id: 'liciai-errordash',
    name: 'LiciAI Dash',
    url: 'https://liciai-errordash.web.app',
    icon: `<path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`
  }
];
```

## 📁 Estrutura

```
liciai-errordash/
├── public/
│   └── index.html      # Dashboard completo (1485 linhas)
├── firebase.json       # Config Firebase Hosting
└── .firebaserc         # Projeto: sharp-footing-475513-c7
```

## 🎨 Características

### Tema de Cores
```css
--brand-cyan: #22d3ee
--brand-indigo: #818cf8
--bg-darkest: #030712
--bg-dark: #111827
--bg-med: #1f2937
```

### Fontes
- **UI**: Inter
- **Títulos**: Quicksand (700)
- **Código**: Fira Code

### Recursos Técnicos
- PDF.js 2.11.338
- Tailwind CSS CDN
- Scrollbar customizada
- Cards com hover effects
- Sidebar com navegação

## 🔐 Autenticação

Para integrar com autenticação centralizada, adicione antes de `</body>`:

```html
<script src="/auth-hub.js"></script>
```

Ou copie o snippet de `liciai/auth-snippet.html`.

## 🧪 Testar Localmente

```bash
cd /workspaces/jobsagent/liciai-errordash
python -m http.server 8000 --directory public
# Abrir: http://localhost:8000
```

Ou com Firebase:

```bash
firebase serve --only hosting
# http://localhost:5000
```

## 📋 Status

- [x] Código movido de liciai/public/
- [x] Firebase config criado
- [ ] Site Firebase criado
- [ ] Deploy realizado
- [ ] Integrado ao HubAmalia

## 🎯 Uso

Este dashboard foi criado para análise avançada de erros, mas pode ser adaptado para:
- Monitoramento de logs
- Análise de documentos
- Dashboard administrativo
- Visualização de dados em tempo real

## 📞 Comandos

```bash
# Deploy
firebase deploy --only hosting:liciai-errordash

# Ver site
firebase hosting:sites:list

# Logs
firebase hosting:channel:list
```

---

**Origem**: Separado de `liciai/public/errordash.html`  
**Projeto**: sharp-footing-475513-c7  
**Tipo**: Dashboard standalone
