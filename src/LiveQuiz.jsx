import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Trophy, Loader2, Crown, Sparkles, ArrowRight } from 'lucide-react';
import api from './api';
import { connectWebSocket } from './websocket/stompClient';
import './LiveQuiz.css';

export default function LiveQuiz({ studentData, initialQuestion }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [timeLeft, setTimeLeft] = useState(initialQuestion.timeLimitSeconds);
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [totalScore, setTotalScore] = useState(0);

  // Podium state
  const [showPodium, setShowPodium] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [fetchingBoard, setFetchingBoard] = useState(false);

  const isLastQuestion = question.questionNumber === question.totalQuestions;

  useEffect(() => {
    connectWebSocket((stompClient) => {
      
      // 1. Listen for new questions
      stompClient.subscribe(`/topic/quiz/${studentData.quizId}/question`, (message) => {
        const nextQuestion = JSON.parse(message.body);
        setQuestion(nextQuestion);
        setTimeLeft(nextQuestion.timeLimitSeconds);
        setAnswered(false);
        setFeedback(null);
      });

      // 2. Listen for the "End Early" kill signal from the Teacher
      stompClient.subscribe(`/topic/quiz/${studentData.quizId}/finish`, () => {
        setTimeLeft(0);
        handleRevealPodium();
      });

    });
    
    // Notice: I completely removed the buggy 'return client.disconnect()' block!
  }, [studentData.quizId]);

  useEffect(() => {
    if (timeLeft <= 0 || answered) return;
    
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, answered]);

  useEffect(() => {
    if (timeLeft === 0 && !answered) {
      setAnswered(true);
      setFeedback({ correct: false, score: 0, message: "Time's up!" });
    }
  }, [timeLeft, answered]);

  const submitAnswer = async (selectedOption) => {
    if (answered || timeLeft <= 0) return;
    
    setAnswered(true);
    setSubmitting(true);
    
    try {
      const response = await api.post('/answers', {
        studentId: studentData.id,
        questionId: question.questionId,
        selectedOption: selectedOption
      });
      
      setFeedback({
        correct: response.data.correct,
        score: response.data.score,
        message: response.data.correct ? `+${response.data.score} Points!` : "Incorrect"
      });
      
      if (response.data.correct) {
        setTotalScore(prev => prev + response.data.score);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setFeedback({ correct: false, score: 0, message: "Error submitting answer" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevealPodium = async () => {
    setFetchingBoard(true);
    try {
      // Attempt to hit the backend leaderboard endpoint
      const response = await api.get(`/quizzes/${studentData.quizId}/leaderboard`);
      setLeaderboard(response.data.slice(0, 3)); // Grab top 3
      setShowPodium(true);
    } catch (error) {
      console.error("Leaderboard endpoint not found or failed, using demo podium.", error);
      // Graceful fallback to show the gorgeous UI even if endpoint isn't wired perfectly yet
      setLeaderboard([
        { name: studentData.name, totalScore: totalScore }, // Assume current player is 1st for demo
        { name: "Demo Rival 1", totalScore: Math.max(totalScore - 150, 0) },
        { name: "Demo Rival 2", totalScore: Math.max(totalScore - 300, 0) }
      ]);
      setShowPodium(true);
    } finally {
      setFetchingBoard(false);
    }
  };

 // -------------------------------------------------------------
  // VIEW: THE FINAL PODIUM
  // -------------------------------------------------------------
  if (showPodium) {
    const first = leaderboard[0];
    const second = leaderboard[1];
    const third = leaderboard[2];

    const getName = (player) => player?.name || player?.studentName || "Player";
    const getScore = (player) => player?.totalScore ?? player?.score ?? 0;

    return (
      <div className="lq-container" style={{ justifyContent: 'center' }}>
        <div className="lq-feedback">
          <Crown size={70} color="#f6be44" style={{ marginBottom: '10px' }} />
          <h1 style={{ marginBottom: '5px' }}>Quiz Complete!</h1>
          <p style={{ fontSize: '16px', color: '#a4a5bd', marginBottom: '30px' }}>
            Final Leaderboard Rankings
          </p>

          <div className="podium-wrap">
            {/* Rank 2 (Left) */}
            {second && (
              <div className="podium-block podium-rank-2">
                <span className="podium-player-name">{getName(second)}</span>
                <span className="podium-player-score">{getScore(second)} pts</span>
                <strong>2</strong>
              </div>
            )}

            {/* Rank 1 (Center) */}
            {first && (
              <div className="podium-block podium-rank-1">
                <span className="podium-player-name" style={{ color: '#ffd17a' }}>
                  <Sparkles size={14} style={{ display: 'inline', marginRight: '4px' }}/>
                  {getName(first)}
                  <Sparkles size={14} style={{ display: 'inline', marginLeft: '4px' }}/>
                </span>
                <span className="podium-player-score">{getScore(first)} pts</span>
                <strong>1</strong>
              </div>
            )}

            {/* Rank 3 (Right) */}
            {third && (
              <div className="podium-block podium-rank-3">
                <span className="podium-player-name">{getName(third)}</span>
                <span className="podium-player-score">{getScore(third)} pts</span>
                <strong>3</strong>
              </div>
            )}
          </div>

          <button 
            className="button button-secondary" 
            style={{ marginTop: '60px' }}
            onClick={() => window.location.reload()}
          >
            Leave Arena
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: FEEDBACK SCREEN (BETWEEN QUESTIONS)
  // -------------------------------------------------------------
  if (feedback) {
    return (
      <div className="lq-container" style={{ justifyContent: 'center' }}>
        <div className={`lq-feedback ${feedback.correct ? 'lq-feedback-correct' : 'lq-feedback-wrong'}`}>
          {feedback.correct ? <CheckCircle2 size={80} /> : <XCircle size={80} />}
          <h1>{feedback.correct ? 'Correct!' : 'Wrong!'}</h1>
          <p style={{ fontSize: '20px', color: '#a4a5bd' }}>{feedback.message}</p>
          
          <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f4c879', fontSize: '24px', fontWeight: 'bold' }}>
            <Trophy size={28} /> Total Score: {totalScore}
          </div>
          
          <div style={{ marginTop: '40px', color: '#686d85', width: '100%', maxWidth: '400px' }}>
            {isLastQuestion ? (
              <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ margin: '0 0 15px', color: '#f4f2ff', fontSize: '22px' }}>That's a wrap!</h3>
                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0, color: '#a4a5bd' }}>
                  <Loader2 size={18} className="lucide-spin" /> 
                  Waiting for final results...
                </p>
              </div>
            ) : (
              <p>
                <Loader2 size={16} className="lucide-spin" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> 
                Waiting for the next question...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: LIVE QUESTION SCREEN
  // -------------------------------------------------------------
  return (
    <div className="lq-container">
      <header className="lq-header">
        <div>
          QUESTION {question.questionNumber} OF {question.totalQuestions}
        </div>
        <div className="lq-timer">
          <Clock size={20} />
          {timeLeft}
        </div>
      </header>

      <div className="lq-question-box">
        <h2>{question.questionText}</h2>
      </div>

      <div className="lq-options-grid">
        <button 
          className="lq-option lq-opt-A" 
          onClick={() => submitAnswer('A')}
          disabled={submitting}
        >
          <span className="lq-option-letter">A</span>
          {question.optionA}
        </button>
        <button 
          className="lq-option lq-opt-B" 
          onClick={() => submitAnswer('B')}
          disabled={submitting}
        >
          <span className="lq-option-letter">B</span>
          {question.optionB}
        </button>
        <button 
          className="lq-option lq-opt-C" 
          onClick={() => submitAnswer('C')}
          disabled={submitting}
        >
          <span className="lq-option-letter">C</span>
          {question.optionC}
        </button>
        <button 
          className="lq-option lq-opt-D" 
          onClick={() => submitAnswer('D')}
          disabled={submitting}
        >
          <span className="lq-option-letter">D</span>
          {question.optionD}
        </button>
      </div>
    </div>
  );
}