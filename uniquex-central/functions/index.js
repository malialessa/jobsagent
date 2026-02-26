const admin = require('firebase-admin');

// Inicializar Firebase Admin uma única vez
admin.initializeApp();

// Importar módulos de cada app
const { liciaiApi } = require('./liciai');
const { cliniaApi } = require('./clinia');
const { jobsagentApi } = require('./jobsagent');
const { analisadoreditalApi } = require('./analisadoredital');
const { analisadortrApi } = require('./analisadortr');

// Exportar todas as Cloud Functions
exports.liciaiApi = liciaiApi;
exports.cliniaApi = cliniaApi;
exports.jobsagentApi = jobsagentApi;
exports.analisadoreditalApi = analisadoreditalApi;
exports.analisadortrApi = analisadortrApi;
