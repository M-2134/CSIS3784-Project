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
        wsUrl = 'wss://hyperblast.onrender.com';
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        wsUrl = `${wsProtocol}localhost:8080`;
      }
    }
    ws.current = new window.WebSocket(wsUrl);

    ws.current.onopen = () => setWsStatus('open');
    ws.current.onclose = () => setWsStatus('closed');
    ws.current.onerror = () => setWsStatus('error');
    ws.current.onmessage = (event) => {
      console.log('WS received:', event.data); // ADDED LOG
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
