const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const cors = require('cors');

const app = express();
const wsInstance = expressWs(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global state for all widgets
let globalState = {
  ticker: {
    messages: [],
    isActive: false,
    speed: 100,
    color: '#ffffff'
  },
  popup: {
    isVisible: false,
    title: '',
    message: '',
    duration: 5000
  },
  brb: {
    isActive: false,
    message: 'Be Right Back',
    customMessage: ''
  },
  theme: {
    current: 'dark',
    accent: '#00ff88'
  }
};

// WebSocket clients
const clients = new Set();

// Broadcast to all connected clients
function broadcast(event, data) {
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  });
}

// WebSocket endpoint
app.ws('/ws', (ws, req) => {
  clients.add(ws);
  
  // Send current state on connection
  ws.send(JSON.stringify({ event: 'state_sync', data: globalState }));
  
  ws.on('message', (message) => {
    try {
      const { event, data } = JSON.parse(message);
      
      switch (event) {
        case 'ticker_update':
          globalState.ticker = { ...globalState.ticker, ...data };
          broadcast('ticker_update', globalState.ticker);
          break;
          
        case 'popup_show':
          globalState.popup = { ...globalState.popup, ...data, isVisible: true };
          broadcast('popup_show', globalState.popup);
          break;
          
        case 'popup_hide':
          globalState.popup.isVisible = false;
          broadcast('popup_hide', globalState.popup);
          break;
          
        case 'brb_update':
          globalState.brb = { ...globalState.brb, ...data };
          broadcast('brb_update', globalState.brb);
          break;
          
        case 'theme_change':
          globalState.theme = { ...globalState.theme, ...data };
          broadcast('theme_change', globalState.theme);
          break;
          
        case 'state_sync':
          ws.send(JSON.stringify({ event: 'state_sync', data: globalState }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    clients: clients.size,
    state: globalState
  });
});

app.get('/api/state', (req, res) => {
  res.json(globalState);
});

app.post('/api/ticker', (req, res) => {
  globalState.ticker = { ...globalState.ticker, ...req.body };
  broadcast('ticker_update', globalState.ticker);
  res.json(globalState.ticker);
});

app.post('/api/popup', (req, res) => {
  if (req.body.action === 'show') {
    globalState.popup = { ...globalState.popup, ...req.body, isVisible: true };
    broadcast('popup_show', globalState.popup);
  } else if (req.body.action === 'hide') {
    globalState.popup.isVisible = false;
    broadcast('popup_hide', globalState.popup);
  }
  res.json(globalState.popup);
});

app.post('/api/brb', (req, res) => {
  globalState.brb = { ...globalState.brb, ...req.body };
  broadcast('brb_update', globalState.brb);
  res.json(globalState.brb);
});

app.post('/api/theme', (req, res) => {
  globalState.theme = { ...globalState.theme, ...req.body };
  broadcast('theme_change', globalState.theme);
  res.json(globalState.theme);
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 M0 Ticker Server running on port ${PORT}`);
  console.log(`🎛️  Professional Dashboard: http://localhost:${PORT}/dashboard-broadcast.html`);
  console.log(`🎬 Broadcast Output: http://localhost:${PORT}/output-broadcast.html`);
  console.log(`� Legacy Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`�📡 API Status: http://localhost:${PORT}/api/status`);
  console.log(`✨ Broadcast Ready Design System Enabled`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please:`);
    console.error(`   1. Kill the existing process using port ${PORT}`);
    console.error(`   2. Or set a different port: PORT=3001 node server.js`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});