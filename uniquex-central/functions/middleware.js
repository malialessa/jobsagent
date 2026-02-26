const admin = require('firebase-admin');

/**
 * Remove prefixo /api/{appName} do path para compatibilidade com rewrites
 */
function stripApiPrefix(appName) {
  return (req, res, next) => {
    const prefix = `/api/${appName}`;
    if (req.path.startsWith(prefix)) {
      req.url = req.url.substring(prefix.length) || '/';
      req.path = req.path.substring(prefix.length) || '/';
    }
    next();
  };
}

/**
 * Middleware para verificar autenticação via Firebase Auth
 */
async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autenticação não fornecido',
        code: 'AUTH_REQUIRED' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      req.userId = decodedToken.uid;
      next();
    } catch (error) {
      console.error('Token inválido:', error);
      return res.status(403).json({ 
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN' 
      });
    }
  } catch (error) {
    console.error('Erro no middleware de auth:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar autenticação',
      code: 'AUTH_ERROR' 
    });
  }
}

/**
 * Middleware opcional de autenticação (não bloqueia se não tiver token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        req.userId = decodedToken.uid;
      } catch (error) {
        console.warn('Token opcional inválido:', error.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro no middleware opcional de auth:', error);
    next();
  }
}

/**
 * Middleware para logging de requisições
 */
function requestLogger(appName) {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${appName}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  };
}

/**
 * Handler de erros global
 */
function errorHandler(err, req, res, next) {
  console.error('Erro não tratado:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = {
  stripApiPrefix,
  verifyAuth,
  optionalAuth,
  requestLogger,
  errorHandler
};
