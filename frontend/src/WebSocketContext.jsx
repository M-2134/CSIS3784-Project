import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }) {
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting', 'open', 'closed', 'error'
  const ws = useRef(null);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    // Set up WebSocket connection
    let wsUrl;
    // --- LOCAL TESTING ---
    // Uncomment the following line to force local WebSocket connection for testing:
    // wsUrl = 'ws://localhost:8080';
    // --- END LOCAL TESTING ---
    if (!wsUrl) {
      if (process.env.NODE_ENV === 'production') {
        wsUrl = 'wss://csis3784-project-backend-1.onrender.com/';
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        wsUrl = `${wsProtocol}localhost:8080`;
      }
    }

    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🏠 Current URL:', window.location.href);

    ws.current = new window.WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      setWsStatus('open');
    };

    ws.current.onclose = (event) => {
      console.log('❌ WebSocket closed:', event.code, event.reason);
      setWsStatus('closed');
    };

    ws.current.onerror = (error) => {
      console.error('🚨 WebSocket error:', error);
      console.log('🔍 Backend URL being used:', wsUrl);
      setWsStatus('error');
    };

    ws.current.onmessage = (event) => {
      console.log('📨 WS received:', event.data);
      setLastMessage(event.data);
      // Store userId from welcome message
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'welcome' && msg.userId) {
          localStorage.setItem('userId', msg.userId);
        }
      } catch (e) {
        // Ignore parse errors for non-JSON messages
      }
    };

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  // Send a message helper
  const sendMessage = (msgObj) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msgObj));
    }
  };

  return (
    <WebSocketContext.Provider value={{ ws: ws.current, wsStatus, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}
