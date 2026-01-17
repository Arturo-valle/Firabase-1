const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Middleware para autenticar usuarios mediante Firebase Auth ID Tokens.
 * Verifica si el header 'Authorization' contiene un token 'Bearer' válido.
 */
const rateLimit = require('express-rate-limit');

/**
 * Limitador de peticiones para prevenir abuso de la API.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 peticiones por ventana
    message: {
        success: false,
        error: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Middleware para autenticar usuarios mediante Firebase Auth ID Tokens.
 */
const authMiddleware = async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No se proporcionó token de autenticación.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        return next();
    } catch (error) {
        return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }
};

/**
 * Middleware de autenticación opcional.
 * Si hay token, lo verifica y populates req.user.
 * Si no hay token, continúa sin error (req.user será undefined).
 */
const optionalAuthMiddleware = async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    const authHeader = req.headers.authorization;

    // Si no hay header o no es Bearer, continuamos como invitado (sin req.user)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        return next();
    } catch (error) {
        // Si el token es inválido pero fue enviado, ¿deberíamos rechazar o tratar como invitado?
        // Por seguridad, si envían credenciales malas, mejor avisar (403) para evitar confusiones de debug,
        // o loguear aviso y tratar como invitado. 
        // En este caso, trataremos como invitado pero advertimos.
        console.warn(`OptionalAuth: Invalid token provided. Treating as guest. Error: ${error.message}`);
        return next();
    }
};

/**
 * Middleware para restringir rutas solo a administradores.
 * Verifica si el token contiene la custom claim 'admin: true'.
 */
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.admin === true) {
        return next();
    }

    functions.logger.warn(`Forbidden access attempt: Non-admin user ${req.user.email} tried to access ${req.originalUrl}`);
    return res.status(403).json({
        success: false,
        error: 'Acceso restringido: Se requieren privilegios de administrador.'
    });
};

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware, apiLimiter };
