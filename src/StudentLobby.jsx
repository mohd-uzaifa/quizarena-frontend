import { useEffect, useState } from 'react';
import { Users, Loader2, Sparkles } from 'lucide-react';
import { connectWebSocket } from './websocket/stompClient';

export default function StudentLobby({ studentData, onQuizStart }) {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  
  useEffect(() => {
    connectWebSocket(
      (stompClient) => {
        setConnectionStatus('Connected! Waiting for teacher...');
        
        // Listen for the first question to be broadcast
        stompClient.subscribe(`/topic/quiz/${studentData.quizId}/question`, (message) => {
          const liveQuestion = JSON.parse(message.body);
          onQuizStart(liveQuestion);
        });
      },
      () => {
        setConnectionStatus('Connection lost. Reconnecting...');
      }
    );
    // Notice we removed disconnectWebSocket() here so the connection survives the transition!
  }, [studentData, onQuizStart]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#080a16',
      color: '#f4f2ff',
      fontFamily: '"DM Sans", sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px 30px',
        background: 'linear-gradient(145deg, #15172b, #101221)',
        border: '1px solid rgba(151, 112, 255, 0.15)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          margin: '0 auto 20px',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(151, 112, 255, 0.1)',
          color: '#b5a0ff',
          borderRadius: '16px'
        }}>
          <Users size={32} />
        </div>
        
        <h1 style={{ margin: '0 0 10px', fontSize: '28px', fontFamily: '"Space Grotesk", sans-serif' }}>
          You're in!
        </h1>
        
        <p style={{ margin: '0 0 25px', color: '#999bb5', fontSize: '14px' }}>
          Playing as <strong>{studentData.name}</strong>
        </p>

        <div style={{
          padding: '16px',
          background: '#0a0d1a',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#cbbaff'
        }}>
          {connectionStatus.includes('Connecting') ? (
            <Loader2 size={16} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} />
          ) : (
            <Sparkles size={16} />
          )}
          {connectionStatus}
        </div>
      </div>
    </div>
  );
}