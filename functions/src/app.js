const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const apiRoutes = require("./routes/api");

const app = express();

// Middleware
app.use(cors({ origin: true }));

app.use((req, res, next) => {
    functions.logger.info(`API Request: ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/', apiRoutes);

module.exports = app;
