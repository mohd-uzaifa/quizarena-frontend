import { useState, useEffect } from 'react';
import { Users, Trophy, X, Brain, Play } from 'lucide-react';
import api from './api';
import { connectWebSocket } from './websocket/stompClient';
import './TeacherLiveSession.css';

export default function TeacherLiveSession({ quiz, onExit }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // 1. Listen for Live Questions
  useEffect(() => {
    const client = connectWebSocket((stompClient) => {
      stompClient.subscribe(`/topic/quiz/${quiz.id}/question`, (message) => {
        const nextQuestion = JSON.parse(message.body);
        setCurrentQuestion(nextQuestion);
        setTimeLeft(nextQuestion.timeLimitSeconds);
      });
    });
  }, [quiz.id]);

  // 2. Local Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // NEW: Auto-Close the database room when the final question ends naturally!
  useEffect(() => {
    if (
      currentQuestion && 
      timeLeft === 0 && 
      currentQuestion.questionNumber === currentQuestion.totalQuestions && 
      !isFinished
    ) {
      handleFinish(); // This tells the database to change status to FINISHED
    }
  }, [timeLeft, currentQuestion, isFinished]);

  // 3. Poll Leaderboard to see students join and score
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get(`/quizzes/${quiz.id}/leaderboard`);
        setLeaderboard(response.data);
      } catch (error) {
        console.error("Failed to fetch live leaderboard", error);
      }
    };

    fetchLeaderboard();
    const pollId = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(pollId);
  }, [quiz.id]);

  // 4. THIS IS THE MISSING FUNCTION! It switches WAITING to LIVE.
  const handleStartGame = async () => {
    try {
      await api.post(`/quizzes/${quiz.id}/go-live`);
    } catch (error) {
      console.error("Failed to go live", error);
    }
  };

  const handleFinish = async () => {
    try {
      await api.post(`/quizzes/${quiz.id}/finish`);
      setIsFinished(true);
      setTimeLeft(0);
    } catch (error) {
      console.error("Failed to finish quiz early", error);
    }
  };

  const getScore = (player) => player.totalScore ?? player.score ?? 0;
  const getName = (player) => player.name || player.studentName || "Player";

  // Variables to handle Ties accurately on the leaderboard
  let currentRank = 1;
  let previousScore = -1;

  return (
    <div className="tls-container">
      <header className="tls-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Brain color="#9770ff" size={28} />
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>QuizArena Mission Control</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#a4a5bd', letterSpacing: '2px' }}>JOIN AT QUIZARENA WITH CODE</span>
          <div className="tls-room-code">{quiz.roomCode}</div>
        </div>

        <button className="button button-secondary" onClick={onExit} style={{ padding: '8px 16px' }}>
          <X size={16} /> Exit
        </button>
      </header>

      <main className="tls-main">
        <section className="tls-game-board">
          {!currentQuestion ? (
            // LOBBY VIEW
            <div className="tls-waiting">
              <Users size={64} color="#9770ff" style={{ marginBottom: '20px' }} />
              <h2 style={{ fontSize: '36px', marginBottom: '10px' }}>Waiting for students...</h2>
              <p style={{ fontSize: '18px', color: '#a4a5bd', marginBottom: '40px' }}>
                Tell your class to join using Room Code: <strong style={{ color: '#ffd17a' }}>{quiz.roomCode}</strong>
              </p>
              <button 
                className="button button-primary" 
                style={{ fontSize: '20px', padding: '16px 40px' }} 
                onClick={handleStartGame}
              >
                <Play size={20} style={{ marginRight: '10px' }} /> Start First Question
              </button>
            </div>
          ) : isFinished || (timeLeft === 0 && currentQuestion.questionNumber === currentQuestion.totalQuestions) ? (
            // NEW: GAME OVER VIEW (Early or Natural)
            <div className="tls-waiting" style={{ background: 'rgba(151, 112, 255, 0.1)', border: '1px solid rgba(151, 112, 255, 0.3)', borderRadius: '20px', padding: '40px' }}>
              <Trophy size={64} color="#9770ff" style={{ marginBottom: '20px' }} />
              <h2 style={{ color: '#f4f2ff', fontSize: '36px', margin: 0 }}>Quiz Finished!</h2>
              <p style={{ color: '#a4a5bd', marginTop: '10px' }}>The game has ended. Students are viewing the final podium.</p>
            </div>
          ) : (
            // LIVE QUESTION VIEW
            <>
              <div className="tls-question-card">
                <div className={`tls-timer ${timeLeft === 0 ? 'warning' : timeLeft <= 5 ? 'warning' : ''}`}>
                  {timeLeft}
                </div>
                <div style={{ color: '#a4a5bd', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  QUESTION {currentQuestion.questionNumber} OF {currentQuestion.totalQuestions}
                </div>
                <h2 className="tls-question-text">{currentQuestion.questionText}</h2>
              </div>

              {timeLeft === 0 ? (
                // REGULAR TRANSITION VIEW (Between questions)
                <div className="tls-waiting" style={{ background: 'rgba(255, 83, 101, 0.1)', border: '1px solid rgba(255, 83, 101, 0.3)', borderRadius: '20px', padding: '40px' }}>
                  <h2 style={{ color: '#ff5365', fontSize: '36px', margin: 0 }}>Time's Up!</h2>
                  <p style={{ color: '#a4a5bd', marginTop: '10px' }}>Evaluating answers and transitioning...</p>
                </div>
              ) : (
                <div className="tls-options-grid">
                  <div className="tls-option lq-opt-A"><span className="lq-option-letter">A</span> {currentQuestion.optionA}</div>
                  <div className="tls-option lq-opt-B"><span className="lq-option-letter">B</span> {currentQuestion.optionB}</div>
                  <div className="tls-option lq-opt-C"><span className="lq-option-letter">C</span> {currentQuestion.optionC}</div>
                  <div className="tls-option lq-opt-D"><span className="lq-option-letter">D</span> {currentQuestion.optionD}</div>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="tls-leaderboard">
          <h3><Trophy size={24} /> Live Standings</h3>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leaderboard.length === 0 ? (
              <div className="tls-waiting" style={{ height: '100%' }}>
                <Users size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px' }}>No players yet</p>
              </div>
            ) : (
              leaderboard.slice(0, 10).map((player, index) => {
                const score = getScore(player);
                if (score !== previousScore) {
                  currentRank = index + 1; // Correctly handles ties!
                }
                previousScore = score;
                
                return (
                  <div key={player.id || index} className="tls-player-row">
                    <span className="tls-rank">#{currentRank}</span>
                    <span className="tls-name">{getName(player)}</span>
                    <span className="tls-score">{score}</span>
                  </div>
                );
              })
            )}
          </div>
          
          {currentQuestion && !isFinished && (
            <button className="button button-primary" style={{ width: '100%', marginTop: '20px', background: '#ff5365', borderColor: '#ff5365' }} onClick={handleFinish}>
              End Game Early
            </button>
          )}
        </aside>
      </main>
    </div>
  );
}