const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { stripApiPrefix, verifyAuth, optionalAuth, requestLogger, errorHandler } = require('../middleware'); // eslint-disable-line

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(stripApiPrefix('liciai'));
app.use(requestLogger('LiciAI'));

const db = admin.firestore();

// ===================
// ENDPOINTS DA LICIAI
// ===================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'LiciAI', timestamp: new Date().toISOString() });
});

// Buscar licitações (requer auth)
app.post('/buscar-licitacoes', verifyAuth, async (req, res) => {
  try {
    const { keywords, estado, cidade } = req.body;
    
    // TODO: Implementar lógica de busca
    // Por enquanto, retorna dados mock
    
    const licitacoes = [];
    
    res.json({
      success: true,
      total: licitacoes.length,
      data: licitacoes
    });
  } catch (error) {
    console.error('Erro ao buscar licitações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar oportunidades do usuário
app.get('/oportunidades', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const uf = req.query.uf || null;

    // Busca sem orderBy para evitar exigência de índice composto no Firestore
    let query = db.collection('licitacoes').where('userId', '==', userId);
    if (uf) query = query.where('uf', '==', uf);

    const snapshot = await query.limit(limit + offset + 10).get();

    let oportunidades = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

    const total = oportunidades.length;
    const items = oportunidades.slice(offset, offset + limit);
    const nextOffset = offset + items.length;

    res.json({ success: true, data: oportunidades, items, total, nextOffset, hasMore: nextOffset < total });
  } catch (error) {
    console.error('Erro ao listar oportunidades:', error);
    // Retorna lista vazia em vez de 500 se Firestore não estiver configurado
    res.json({ success: true, data: [], items: [], total: 0, nextOffset: 0, hasMore: false, warning: error.message });
  }
});

// Analisar edital com IA
app.post('/analisar-edital', verifyAuth, async (req, res) => {
  try {
    const { editalUrl, editalText } = req.body;
    const userId = req.userId;
    
    // TODO: Integrar com Vertex AI para análise
    
    const analise = {
      resumo: 'Análise pendente de implementação',
      score: 0,
      requisitos: [],
      prazos: []
    };
    
    // Salvar no Firestore
    const docRef = await db.collection('analises_editais').add({
      userId,
      editalUrl,
      analise,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      analiseId: docRef.id,
      data: analise
    });
  } catch (error) {
    console.error('Erro ao analisar edital:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configurações do cliente (keywords de busca, etc.)
app.get('/config', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const docRef = db.collection('configuracoes_liciai').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Retorna config padrão se não existir
      return res.json({
        success: true,
        data: { palavrasChave: [], estados: [], notificacoesAtivas: false }
      });
    }

    res.json({ success: true, data: doc.data() });
  } catch (error) {
    console.error('Erro ao buscar config:', error);
    // Não falha - retorna vazio
    res.json({ success: true, data: { palavrasChave: [], estados: [], notificacoesAtivas: false } });
  }
});

// Salvar configurações
app.post('/config', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const dados = req.body;
    await db.collection('configuracoes_liciai').doc(userId).set({
      ...dados,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Adicionar palavras-chave
app.post('/keywords/add', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { palavraChave } = req.body;
    await db.collection('configuracoes_liciai').doc(userId).set({
      palavrasChave: admin.firestore.FieldValue.arrayUnion(palavraChave),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover palavras-chave
app.post('/keywords/remove', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { palavraChave } = req.body;
    await db.collection('configuracoes_liciai').doc(userId).set({
      palavrasChave: admin.firestore.FieldValue.arrayRemove(palavraChave),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de logs do frontend
app.post('/logs', optionalAuth, async (req, res) => {
  try {
    const { level = 'error', message, details, url, userId: clientUserId } = req.body;
    const userId = req.userId || clientUserId || 'anonymous';
    console.log(`[LiciAI Frontend Log][${level.toUpperCase()}] user=${userId} | ${message}`, details || '');
    res.json({ success: true });
  } catch (error) {
    res.status(200).json({ success: false });
  }
});

// Listar contratos
app.get('/contratos', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const snapshot = await db.collection('contratos')
      .where('userId', '==', userId)
      .limit(50)
      .get();
    
    const contratos = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    
    res.json({ success: true, data: contratos });
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.json({ success: true, data: [], warning: error.message });
  }
});

// Salvar oportunidade
app.post('/oportunidades', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const dados = req.body;
    
    const docRef = await db.collection('licitacoes').add({
      ...dados,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      id: docRef.id
    });
  } catch (error) {
    console.error('Erro ao salvar oportunidade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use(errorHandler);

// Exportar como Cloud Function
exports.liciaiApi = functions.https.onRequest(app);
