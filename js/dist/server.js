"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dd-trace/init"); // Import and initialize Datadog APM before other imports.
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const util_1 = __importDefault(require("util"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)()); // Enable CORS
app.use(express_1.default.json()); // Parse JSON bodies
// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Handling request to /health');
    res.status(200).json({ status: 'healthy' });
});
// Index endpoint
app.get('/', (req, res) => {
    console.log('Handling request to /');
    console.log('x-dd-apigw-request-time is', util_1.default.inspect(req.headers['x-dd-apigw-request-time']));
    res.status(200).json({
        message: 'Welcome to the Express.js API',
        version: '1.0.0',
        endpoints: {
            '/': 'This documentation',
            '/health': 'Health check endpoint'
        }
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
exports.default = app;
