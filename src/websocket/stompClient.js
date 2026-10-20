import { Client } from '@stomp/stompjs';

let stompClient = null;

export const connectWebSocket = (onConnect, onError) => {
    // Prevent duplicate connections
    if (stompClient && stompClient.connected) {
        if (onConnect) onConnect(stompClient);
        return stompClient;
    }

    // Convert http://localhost:8080 to ws://localhost:8080/ws
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';

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