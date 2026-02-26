const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { stripApiPrefix, verifyAuth, optionalAuth, requestLogger, errorHandler } = require('../middleware');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(stripApiPrefix('analisadortr'));
app.use(requestLogger('AnalisadorTR'));

const db = admin.firestore();
const storage = admin.storage();

// ===========================
// ENDPOINTS DO ANALISADOR DE TR
// ===========================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'AnalisadorTR', timestamp: new Date().toISOString() });
});

// Upload de PDF
app.post('/upload', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { fileName, fileData, fileType } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }
    
    // Salvar no Storage
    const bucket = storage.bucket();
    const filePath = `termos-referencia/${userId}/${Date.now()}_${fileName}`;
    const file = bucket.file(filePath);
    
    // Converter base64 para buffer
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    
    await file.save(buffer, {
      contentType: fileType || 'application/pdf',
      metadata: {
        metadata: {
          userId: userId,
          originalName: fileName
        }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
    });
    
    res.json({
      success: true,
      filePath,
      url
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analisar termo de referência
app.post('/analisar', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { filePath, trText, config } = req.body;
    
    // TODO: Implementar análise com Vertex AI
    
    const analise = {
      resumo: 'Análise de TR em implementação',
      objeto: 'A ser extraído do TR',
      itens: [],
      quantidades: {},
      especificacoes: [],
      score: 0,
      alertas: []
    };
    
    // Salvar no Firestore
    const docRef = await db.collection('analises_tr').add({
      userId,
      filePath,
      analise,
      config: config || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      analiseId: docRef.id,
      data: analise
    });
  } catch (error) {
    console.error('Erro ao analisar TR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar análises do usuário
app.get('/analises', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const snapshot = await db.collection('analises_tr')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const analises = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, data: analises });
  } catch (error) {
    console.error('Erro ao listar análises:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter análise específica
app.get('/analises/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('analises_tr').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    
    const data = doc.data();
    
    // Verificar se pertence ao usuário
    if (data.userId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json({
      success: true,
      data: { id: doc.id, ...data }
    });
  } catch (error) {
    console.error('Erro ao buscar análise:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use(errorHandler);

// Exportar como Cloud Function
exports.analisadortrApi = functions.https.onRequest(app);
