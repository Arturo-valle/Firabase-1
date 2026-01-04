const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const rateLimit = require("express-rate-limit");
const apiRoutes = require("./routes/api");

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
    'https://centracapital.app', // Dominio principal (ejemplo)
    'https://mvp-nic-market.web.app',
    'https://mvp-nic-market.firebaseapp.com'
];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'El policy de CORS para este sitio no permite acceso desde el origen especificado.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// --- Rate Limiting ---
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 100, // Máximo 100 requests por IP por ventana
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde."
    }
});

app.use(globalLimiter);

// Logger Middleware
app.use((req, res, next) => {
    functions.logger.info(`API Request: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

// Serve OpenAPI Spec
const path = require('path');
app.get('/api-docs.yaml', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'openapi.yaml'));
});

// Routes
app.use('/', apiRoutes);

module.exports = app;
