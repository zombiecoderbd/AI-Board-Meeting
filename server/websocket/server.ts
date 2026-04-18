import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initializeWebSocket } from './handlers';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.WEBSOCKET_PORT || '3001');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

export const createWebSocketServer = () => {
  const server = createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });
  
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info, cb) => {
      const origin = info.origin || '';
      const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.includes(allowed));
      
      if (isAllowed || process.env.NODE_ENV === 'production') {
        cb(true);
      } else {
        console.log(`Rejected connection from origin: ${origin}`);
        cb(false, 403, 'Forbidden');
      }
    }
  });
  
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  initializeWebSocket(wss);
  
  server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
  
  return { server, wss };
};
