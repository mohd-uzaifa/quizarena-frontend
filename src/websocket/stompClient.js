import { Client } from '@stomp/stompjs';

let stompClient = null;

export const connectWebSocket = (onConnect, onError) => {
    // Prevent duplicate connections
    if (stompClient && stompClient.connected) {
        if (onConnect) onConnect(stompClient);
        return stompClient;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    
    // 1. Remove '/api' from the base URL
    // 2. Safely map http -> ws and https -> wss
    const wsUrl = baseUrl
        .replace(/\/api$/, '') 
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:') + '/ws';
    stompClient = new Client({
        brokerURL: wsUrl,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
            console.log('Connected to QuizArena WebSocket');
            if (onConnect) onConnect(stompClient);
        },
        onStompError: (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
            if (onError) onError(frame);
        },
        onWebSocketError: (event) => {
            console.error('WebSocket error observed:', event);
            if (onError) onError(event);
        }
    });

    stompClient.activate();
    return stompClient;
};

export const disconnectWebSocket = () => {
    if (stompClient !== null) {
        stompClient.deactivate();
        stompClient = null;
        console.log('Disconnected from QuizArena WebSocket');
    }
};

export const getStompClient = () => stompClient;