const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { stripApiPrefix, verifyAuth, optionalAuth, requestLogger, errorHandler } = require('../middleware');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(stripApiPrefix('clinia'));
app.use(requestLogger('Clínia'));

const db = admin.firestore();

// ===================
// ENDPOINTS DA CLÍNIA
// ===================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Clínia', timestamp: new Date().toISOString() });
});

// Listar pacientes
app.get('/pacientes', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const snapshot = await db.collection('pacientes')
      .where('clinicaId', '==', userId)
      .orderBy('nome')
      .get();
    
    const pacientes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, data: pacientes });
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar/atualizar paciente
app.post('/pacientes', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id, ...dados } = req.body;
    
    if (id) {
      // Atualizar
      await db.collection('pacientes').doc(id).update({
        ...dados,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, id, action: 'updated' });
    } else {
      // Criar
      const docRef = await db.collection('pacientes').add({
        ...dados,
        clinicaId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, id: docRef.id, action: 'created' });
    }
  } catch (error) {
    console.error('Erro ao salvar paciente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar consultas
app.get('/consultas', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { data } = req.query;
    
    let query = db.collection('consultas').where('clinicaId', '==', userId);
    
    if (data) {
      const startDate = new Date(data);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(data);
      endDate.setHours(23, 59, 59, 999);
      
      query = query.where('dataHora', '>=', startDate).where('dataHora', '<=', endDate);
    }
    
    const snapshot = await query.orderBy('dataHora').get();
    
    const consultas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, data: consultas });
  } catch (error) {
    console.error('Erro ao listar consultas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agendar consulta
app.post('/consultas', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const dados = req.body;
    
    const docRef = await db.collection('consultas').add({
      ...dados,
      clinicaId: userId,
      status: 'agendada',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard - métricas
app.get('/dashboard', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Contar pacientes
    const pacientesSnapshot = await db.collection('pacientes')
      .where('clinicaId', '==', userId)
      .count()
      .get();
    
    // Consultas hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const consultasHojeSnapshot = await db.collection('consultas')
      .where('clinicaId', '==', userId)
      .where('dataHora', '>=', hoje)
      .count()
      .get();
    
    res.json({
      success: true,
      data: {
        totalPacientes: pacientesSnapshot.data().count,
        consultasHoje: consultasHojeSnapshot.data().count
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use(errorHandler);

// Exportar como Cloud Function
exports.cliniaApi = functions.https.onRequest(app);
