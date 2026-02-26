/**
 * UniqueX - Auth Bridge
 * Script para receber autenticação do Hub e gerenciar token
 * 
 * Uso:
 * 1. Incluir este script nos apps: <script src="uniquex-auth.js"></script>
 * 2. O app pode verificar: if (UniqueXAuth.isAuthenticated()) { ... }
 * 3. O app pode obter token: UniqueXAuth.getToken()
 * 4. O app pode obter user: UniqueXAuth.getUser()
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'uniquex_auth';
  const TOKEN_EXPIRY_KEY = 'uniquex_token_expiry';
  
  class UniqueXAuth {
    constructor() {
      this.token = null;
      this.user = null;
      this.listeners = [];
      this.init();
    }
    
    init() {
      // Carregar do localStorage se existir
      this.loadFromStorage();
      
      // Escutar mensagens do hub
      window.addEventListener('message', (event) => {
        // Verificar origem (aceitar uniquexhub.web.app e localhost)
        const allowedOrigins = [
          'https://uniquexhub.web.app',
          'https://uniquex-487718.firebaseapp.com',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173'
        ];
        
        if (!allowedOrigins.some(origin => event.origin.startsWith(origin))) {
          return;
        }
        
        // Processar mensagem HUB_AUTH
        if (event.data && event.data.type === 'HUB_AUTH') {
          console.log('🔐 [UniqueX Auth] Token recebido do hub');
          this.setAuth(event.data.token, event.data.user);
        }
      });
      
      // Log de inicialização
      if (this.isAuthenticated()) {
        console.log('✅ [UniqueX Auth] Usuário autenticado:', this.user?.email);
      } else {
        console.log('⚠️  [UniqueX Auth] Aguardando autenticação do hub...');
      }
    }
    
    setAuth(token, user) {
      this.token = token;
      this.user = user;
      
      // Salvar no localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      // Token expira em 1 hora
      localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + 3600000);
      
      // Notificar listeners
      this.notifyListeners();
      
      console.log('✅ [UniqueX Auth] Autenticação salva para:', user.email);
    }
    
    loadFromStorage() {
      try {
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (expiry && Date.now() > parseInt(expiry)) {
          console.log('⏰ [UniqueX Auth] Token expirado, limpando...');
          this.clearAuth();
          return;
        }
        
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          this.token = parsed.token;
          this.user = parsed.user;
        }
      } catch (error) {
        console.error('❌ [UniqueX Auth] Erro ao carregar do storage:', error);
        this.clearAuth();
      }
    }
    
    clearAuth() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      this.notifyListeners();
    }
    
    isAuthenticated() {
      return !!this.token && !!this.user;
    }
    
    getToken() {
      return this.token;
    }
    
    getUser() {
      return this.user;
    }
    
    getAuthHeader() {
      return this.token ? `Bearer ${this.token}` : null;
    }
    
    // Registrar callback para ser notificado quando auth mudar
    onAuthChange(callback) {
      this.listeners.push(callback);
      // Chamar imediatamente se já estiver autenticado
      if (this.isAuthenticated()) {
        callback(this.user);
      }
      
      // Retornar função para remover listener
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
      };
    }
    
    notifyListeners() {
      this.listeners.forEach(callback => {
        try {
          callback(this.user);
        } catch (error) {
          console.error('❌ [UniqueX Auth] Erro no listener:', error);
        }
      });
    }
    
    // Helper para fazer fetch com auth
    async fetch(url, options = {}) {
      const authHeader = this.getAuthHeader();
      if (!authHeader) {
        throw new Error('Não autenticado');
      }
      
      const headers = {
        ...options.headers,
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Se 401, limpar auth
      if (response.status === 401 || response.status === 403) {
        console.warn('⚠️  [UniqueX Auth] Token inválido (401/403), limpando...');
        this.clearAuth();
      }
      
      return response;
    }
  }
  
  // Criar instância global
  window.UniqueXAuth = new UniqueXAuth();
  
  console.log('🚀 [UniqueX Auth] Bridge inicializado');
  
})();
