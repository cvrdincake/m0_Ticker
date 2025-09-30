const WebSocket = require('ws');
const { randomUUID } = require('crypto');

function setupWebSocketServer(wss, state) {
  function broadcastToAllClients(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(data));
        } catch (err) {
          console.error(`[ticker] WebSocket broadcast error for client ${client.clientId}:`, err);
        }
      }
    });
  }

  async function persistState(state) {
    try {
      await require('fs').promises.writeFile(
        require('path').join(__dirname, 'ticker-state.json'),
        JSON.stringify({ ...state, updatedAt: Date.now() }, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('[ticker] Error persisting state:', err);
    }
  }

  async function handleTickerUpdate(payload, state) {
    if (payload && typeof payload === 'object') {
      state.ticker = {
        ...state.ticker,
        ...payload,
        updatedAt: Date.now()
      };
      broadcastToAllClients({ type: 'ticker', payload: state.ticker });
    }
  }

  async function handleOverlayUpdate(payload, state) {
    if (payload && typeof payload === 'object') {
      state.overlay = {
        ...state.overlay,
        ...payload,
        updatedAt: Date.now()
      };
      broadcastToAllClients({ type: 'overlay', payload: state.overlay });
    }
  }

  async function handleSlateUpdate(payload, state) {
    if (payload && typeof payload === 'object') {
      const sanitizedPayload = {
        text: typeof payload.text === 'string' ? payload.text.trim().slice(0, 2000) : '',
        visible: Boolean(payload.visible),
        rotationSeconds: typeof payload.rotationSeconds === 'number' && payload.rotationSeconds > 0
          ? Math.min(Math.max(5, payload.rotationSeconds), 300) // 5 seconds to 5 minutes
          : 30, // Default rotation time
        updatedAt: Date.now()
      };

      state.slate = {
        ...state.slate,
        ...sanitizedPayload
      };

      broadcastToAllClients({ type: 'slate', payload: state.slate });
    }
  }

  async function handlePopupUpdate(payload, state) {
    if (payload && typeof payload === 'object') {
      // Validate popup payload
      const sanitizedPayload = {
        text: typeof payload.text === 'string' ? payload.text.trim().slice(0, 1000) : '',
        isActive: Boolean(payload.isActive),
        durationSeconds: typeof payload.durationSeconds === 'number' && payload.durationSeconds > 0 
          ? Math.min(Math.max(1, payload.durationSeconds), 3600) // 1 second to 1 hour
          : null,
        countdownEnabled: Boolean(payload.countdownEnabled),
        countdownTarget: payload.countdownEnabled && payload.countdownTarget 
          ? new Date(payload.countdownTarget).toISOString()
          : null,
        updatedAt: Date.now()
      };

      state.popup = {
        ...state.popup,
        ...sanitizedPayload
      };

      // Persist state to disk
      await require('fs').promises.writeFile(
        require('path').join(__dirname, 'ticker-state.json'),
        JSON.stringify({ ...state, updatedAt: Date.now() }, null, 2),
        'utf8'
      );

      broadcastToAllClients({ type: 'popup', payload: state.popup });
    }
  }

  wss.on('connection', (ws) => {
    ws.clientId = randomUUID();
    console.log(`[ticker] WebSocket client ${ws.clientId} connected`);

    // Send initial state
    ws.send(JSON.stringify({ 
      type: 'init', 
      payload: {
        ticker: state.ticker,
        overlay: state.overlay,
        popup: state.popup,
        slate: state.slate,
        brb: state.brb
      }
    }));
    
    // Send new dashboard format messages
    ws.send(JSON.stringify({
      type: 'state-update',
      data: { 
        messages: state.ticker.messages || []
      }
    }));
    
    ws.send(JSON.stringify({
      type: 'ticker-status',
      data: { 
        isRunning: state.ticker.isRunning || false
      }
    }));

    ws.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        const { type, payload, data } = parsedMessage;
        
        // Handle new dashboard message format
        switch (type) {
          case 'ticker_message':
            if (payload && payload.text) {
              if (!state.ticker.messages) state.ticker.messages = [];
              const message = {
                text: payload.text,
                type: payload.type || 'normal',
                priority: payload.priority || 'normal',
                duration: payload.duration || 10,
                id: Date.now(),
                timestamp: Date.now()
              };
              state.ticker.messages.push(message);
              await persistState(state);
              broadcastToAllClients({ 
                type: 'state-update', 
                data: { messages: state.ticker.messages } 
              });
              broadcastToAllClients({ 
                type: 'ticker', 
                payload: state.ticker 
              });
            }
            break;
          case 'popup_message':
            if (payload && payload.message) {
              await handlePopupUpdate({
                text: payload.message,
                title: payload.title || '',
                isActive: true,
                durationSeconds: payload.duration || 5,
                type: payload.type || 'info',
                position: payload.position || 'center',
                animation: payload.animation || 'fade',
                sound: payload.sound || false
              }, state);
            }
            break;
          case 'state_update':
            if (payload) {
              await handleTickerUpdate(payload, state);
            }
            break;
          case 'add-message':
            if (data && data.text) {
              if (!state.ticker.messages) state.ticker.messages = [];
              state.ticker.messages.push({ text: data.text, id: Date.now() });
              await persistState(state);
              broadcastToAllClients({ type: 'state-update', data: { messages: state.ticker.messages } });
            }
            break;
          case 'remove-message':
            if (data && typeof data.index === 'number') {
              if (state.ticker.messages && state.ticker.messages[data.index]) {
                state.ticker.messages.splice(data.index, 1);
                await persistState(state);
                broadcastToAllClients({ type: 'state-update', data: { messages: state.ticker.messages } });
              }
            }
            break;
          case 'clear-messages':
            state.ticker.messages = [];
            await persistState(state);
            broadcastToAllClients({ type: 'state-update', data: { messages: [] } });
            break;
          case 'start-ticker':
            if (data) {
              state.ticker.isRunning = true;
              state.ticker.duration = data.duration || 5;
              state.ticker.interval = data.interval || 0;
              await persistState(state);
              broadcastToAllClients({ type: 'ticker-status', data: { isRunning: true } });
            }
            break;
          case 'stop-ticker':
            state.ticker.isRunning = false;
            await persistState(state);
            broadcastToAllClients({ type: 'ticker-status', data: { isRunning: false } });
            break;
          case 'test-overlay':
            broadcastToAllClients({ type: 'test-overlay', data: {} });
            break;
          case 'show-popup':
            if (data && data.message) {
              await handlePopupUpdate({
                text: data.message,
                isActive: true,
                durationSeconds: (data.duration || 3000) / 1000
              }, state);
            }
            break;
          case 'start-brb':
            if (data && data.message) {
              await handleBrbUpdate({
                text: data.message,
                isActive: true
              }, state);
            }
            break;
          case 'stop-brb':
            await handleBrbUpdate({
              text: '',
              isActive: false
            }, state);
            break;
          case 'set-theme':
            if (data) {
              state.overlay.theme = data.theme || 'default';
              state.overlay.accent = data.accent || '#4a90e2';
              await handleOverlayUpdate(state.overlay, state);
            }
            break;
          // Legacy message format support
          case 'ticker':
            await handleTickerUpdate(payload, state);
            break;
          case 'overlay':
            await handleOverlayUpdate(payload, state);
            break;
          case 'popup':
            await handlePopupUpdate(payload, state);
            break;
          case 'slate':
            await handleSlateUpdate(payload, state);
            break;
          case 'brb':
            await handleBrbUpdate(payload, state);
            break;
          default:
            console.warn(`[ticker] Unknown message type from client ${ws.clientId}:`, type);
        }
      } catch (err) {
        console.error(`[ticker] Error handling message from client ${ws.clientId}:`, err);
      }
    });

    ws.on('close', () => {
      console.log(`[ticker] WebSocket client ${ws.clientId} disconnected`);
    });
  });

  async function handleBrbUpdate(payload, state) {
    if (payload && typeof payload === 'object') {
      // Validate BRB payload
      const sanitizedPayload = {
        text: typeof payload.text === 'string' ? payload.text.trim().slice(0, 500) : '',
        isActive: Boolean(payload.isActive),
        updatedAt: Date.now()
      };

      state.brb = {
        ...state.brb,
        ...sanitizedPayload
      };

      // Persist state to disk
      await require('fs').promises.writeFile(
        require('path').join(__dirname, 'ticker-state.json'),
        JSON.stringify({ ...state, updatedAt: Date.now() }, null, 2),
        'utf8'
      );

      broadcastToAllClients({ type: 'brb', payload: state.brb });
    }
  }

  return {
    broadcastToAllClients,
    handleTickerUpdate,
    handleOverlayUpdate,
    handlePopupUpdate,
    handleSlateUpdate,
    handleBrbUpdate
  };
}

module.exports = setupWebSocketServer;