const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { stripApiPrefix, verifyAuth, optionalAuth, requestLogger, errorHandler } = require('../middleware');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(stripApiPrefix('jobsagent'));
app.use(requestLogger('JobsAgent'));

const db = admin.firestore();

// =======================
// ENDPOINTS DO JOBSAGENT
// =======================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'JobsAgent', timestamp: new Date().toISOString() });
});

// Executar scraping de vagas
app.post('/scrape', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { sources } = req.body;
    
    // Criar log de execução
    const logRef = await db.collection('agent_logs').add({
      userId,
      status: 'running',
      sources: sources || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // TODO: Implementar scraping real (pode ser com Cloud Run Job)
    
    res.json({
      success: true,
      logId: logRef.id,
      message: 'Scraping iniciado'
    });
  } catch (error) {
    console.error('Erro ao executar scraping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar vagas
app.get('/vagas', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const snapshot = await db.collection('jobapplications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const vagas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, total: vagas.length, data: vagas });
  } catch (error) {
    console.error('Erro ao listar vagas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analisar vaga com IA
app.post('/analisar-vaga', verifyAuth, async (req, res) => {
  try {
    const { vagaId, description } = req.body;
    const userId = req.userId;
    
    // TODO: Integr ar com Vertex AI
    
    const analise = {
      fitScore: 7.5,
      pontosFavoraveis: [],
      pontosDesfavoraveis: [],
      recomendacao: 'Análise pendente de implementação'
    };
    
    // Atualizar vaga
    if (vagaId) {
      await db.collection('jobapplications').doc(vagaId).update({
        analysis: analise,
        analyzedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({ success: true, data: analise });
  } catch (error) {
    console.error('Erro ao analisar vaga:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter/atualizar configurações do usuário
app.get('/settings', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const doc = await db.collection('user_settings').doc(userId).get();
    
    if (!doc.exists) {
      res.json({ success: true, data: {} });
    } else {
      res.json({ success: true, data: doc.data() });
    }
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/settings', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const settings = req.body;
    
    await db.collection('user_settings').doc(userId).set(settings, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar status de vaga (aplicada, descartada)
app.patch('/vagas/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.collection('jobapplications').doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Erro ao atualizar vaga:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use(errorHandler);

// Exportar como Cloud Function
exports.jobsagentApi = functions.https.onRequest(app);
