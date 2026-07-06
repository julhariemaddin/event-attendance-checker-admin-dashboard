import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
// Removed: import SockJS from 'sockjs-client';

// Same mixed-content issue as client.js's API_BASE: a secure page
// (https://tauri.localhost) can't open a plain ws:// connection, only wss://.
// Dev keeps ws:// since Vite dev server itself isn't served over https.
// Uses 127.0.0.1 rather than 'localhost' for the same reason as
// client.js's API_BASE — see the comment there.
const WS_URL = import.meta.env.DEV
  ? 'ws://127.0.0.1:8080/ws'
  : 'wss://127.0.0.1:8443/ws';

export function useScannerSocket(onScan) {
  const [wsConnected, setWsConnected] = useState(false);
  const clientRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const client = new Client({
      // Use native WebSockets with an absolute URL pointing to your Spring Boot port
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      
      onConnect: () => {
        console.log("WebSocket connected natively!");
        setWsConnected(true);
        client.subscribe('/topic/scan-result', (message) => {
          try {
            const data = JSON.parse(message.body);
            onScanRef.current && onScanRef.current(data);
          } catch (_) { /* ignore malformed payloads */ }
        });
      },
      onDisconnect: () => setWsConnected(false),
      onWebSocketClose: () => setWsConnected(false),
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        setWsConnected(false);
      },
    });
    
    clientRef.current = client;
    client.activate();
    
    return () => { client.deactivate(); };
  }, []);

  function sendScan(payload) {
    const client = clientRef.current;
    if (!client || !wsConnected) return false;
    client.publish({ destination: '/app/scan', body: JSON.stringify(payload) });
    return true;
  }

  return { wsConnected, sendScan };
}