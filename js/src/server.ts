import 'dd-trace/init'; // Import and initialize Datadog APM before other imports.

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import tracer from 'dd-trace';
import util from "util";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  console.log('Handling request to /health');
  res.status(200).json({ status: 'healthy' });
});

// Index endpoint
app.get('/', (req: Request, res: Response) => {
  console.log('Handling request to /');
  console.log('x-dd-apigw-request-time is', util.inspect(req.headers['x-dd-apigw-request-time']))
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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

export default app; 