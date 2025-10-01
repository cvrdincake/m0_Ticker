const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const cors = require('cors');

const app = express();
expressWs(app); // Initialize WebSocket support

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Default route - serve broadcast-ready dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard-broadcast.html'));
});

// Global state for all widgets
let globalState = {
  ticker: {
    messages: [],
    isRunning: false,
    speed: 50,
    textColor: '#ffffff'
  },
  popup: {
    isVisible: false,
    title: '',
    message: ''
  },
  brb: {
    isVisible: false,
    message: 'Be Right Back'
  },
  theme: {
    accentColor: '#00ff88',
    backgroundOpacity: 80
  }
};

// WebSocket clients
const clients = new Set();

// Broadcast to all connected clients
function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
  console.log('📢 Broadcasting:', { event, data });
}

// WebSocket endpoint
app.ws('/ws', (ws) => {
  clients.add(ws);
  console.log(`🔌 Client connected. Total clients: ${clients.size}`);
  
  // Send current state on connection
  ws.send(JSON.stringify({ event: 'state_update', data: globalState }));
  
  ws.on('message', (message) => {
    try {
      const { event, data } = JSON.parse(message);
      console.log('📥 Received message:', { event, data });
      
      switch (event) {
        case 'ticker_start':
          globalState.ticker = { ...globalState.ticker, ...data, isRunning: true };
          broadcast('ticker_state_change', globalState.ticker);
          break;
          
        case 'ticker_stop':
          globalState.ticker.isRunning = false;
          broadcast('ticker_state_change', globalState.ticker);
          break;

        case 'popup_show':
          globalState.popup = { ...globalState.popup, ...data, isVisible: true };
          broadcast('popup_state_change', globalState.popup);
          break;
          
        case 'popup_hide':
          globalState.popup.isVisible = false;
          broadcast('popup_state_change', globalState.popup);
          break;

        case 'brb_show':
          globalState.brb = { ...globalState.brb, ...data, isVisible: true };
          broadcast('brb_state_change', globalState.brb);
          break;
          
        case 'brb_hide':
          globalState.brb.isVisible = false;
          broadcast('brb_state_change', globalState.brb);
          break;

        case 'theme_change':
          globalState.theme = { ...globalState.theme, ...data };
          broadcast('theme_change', globalState.theme);
          break;
          
        case 'state_sync_request':
        case 'state_sync': // Handle old client event for compatibility
          ws.send(JSON.stringify({ event: 'state_update', data: globalState }));
          break;

        default:
            console.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 Client disconnected. Total clients: ${clients.size}`);
  });
});

// API endpoints for status checks
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

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 M0 Ticker Server running on port ${PORT}`);
  console.log(`🎛️  Professional Dashboard: http://localhost:${PORT}/`);
  console.log(`🎬 Broadcast Output: http://localhost:${PORT}/output-pro.html`);
  console.log(`✨ API Status: http://localhost:${PORT}/api/status`);
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