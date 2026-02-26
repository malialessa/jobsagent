# ⚙️ Configuração Firebase Authentication - UniqueX

## 🔐 Habilitar Google Sign-In

### Passo a Passo:

1. **Acesse o Firebase Console:**
   https://console.firebase.google.com/project/uniquex-487718/authentication/providers

2. **Ative o Google Provider:**
   - Clique em **"Google"**
   - Toggle para **"Ativar"**
   - Preencha o **Email de suporte do projeto** (seu email)
   - Clique em **"Salvar"**

3. **Configure Domínios Autorizados:**
   - Vá para: https://console.firebase.google.com/project/uniquex-487718/authentication/settings
   - Na seção **"Domínios autorizados"**, adicione:
     - `uniquexhub.web.app`
     - `uniquex-487718.firebaseapp.com`
     - `localhost` (para desenvolvimento)

4. **Teste o Login:**
   - Acesse: https://uniquexhub.web.app
   - Clique em **"Entrar com Google"**
   - Autorize a aplicação
   - Você deve ser redirecionado para o hub

---

## 🔑 Credenciais do Projeto

**Projeto ID:** `uniquex-487718`
**App ID:** `1:1050359786854:web:6b9c09acbbd637ed5a6ca7`
**API Key:** `AIzaSyDqRoRHQU-3XwUmNrV5MwVW6o_PwbxywVA`

---

## 🐛 Troubleshooting

### Erro: "api-key-not-valid"
✅ **Resolvido!** As credenciais foram atualizadas no hub.

### Erro: "auth/unauthorized-domain"
**Solução:** Adicione o domínio aos domínios autorizados (passo 3 acima)

### Erro: "auth/popup-blocked"
**Solução:** Permita popups no navegador para uniquexhub.web.app

### Login não funciona
**Checklist:**
- [ ] Google Sign-In está habilitado no console?
- [ ] Domínio está autorizado?
- [ ] Credenciais estão corretas no index.html?
- [ ] Cache do navegador foi limpo? (Ctrl+Shift+R)

---

## 📋 Próximos Passos (Opcional)

### Adicionar outros métodos de autenticação:
- Email/Password
- GitHub
- Microsoft
- Apple

### Configurar regras de segurança:
- Firestore Rules já configuradas em `firestore.rules`
- Storage Rules já configuradas em `storage.rules`

---

## 🔗 Links Úteis

- **Console do Projeto:** https://console.firebase.google.com/project/uniquex-487718
- **Authentication:** https://console.firebase.google.com/project/uniquex-487718/authentication
- **Hub UniqueX:** https://uniquexhub.web.app
- **Documentação Firebase Auth:** https://firebase.google.com/docs/auth

---

**Status:** ✅ Credenciais atualizadas - Aguardando habilitação do Google Sign-In no console
