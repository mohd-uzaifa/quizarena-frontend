import { useState, useEffect } from 'react'
import {
  Brain,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  Sparkles,
  Trophy,
  Users,
  Zap,
  ArrowRight,
  Menu,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserRound,
} from 'lucide-react'
import api from './api'
import TeacherDashboard from './TeacherDashboard'
import StudentLobby from './StudentLobby'
import LiveQuiz from './LiveQuiz'
import './App.css'

function TeacherAuth({ onBack, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorNotice, setErrorNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorNotice('')
    setSubmitting(true)

    try {
      if (isRegister) {
        const response = await api.post('/teachers/register', {
          name: name.trim(),
          email: email.trim(),
          password: password,
        })
        const authData = response.data
        localStorage.setItem('qa_token', authData.token)
        localStorage.setItem(
          'qa_teacher',
          JSON.stringify({
            id: authData.teacherId,
            name: authData.name,
            email: authData.email,
          })
        )
        onLoginSuccess(authData)
      } else {
        const response = await api.post('/teachers/login', {
          email: email.trim(),
          password: password,
        })
        const authData = response.data
        localStorage.setItem('qa_token', authData.token)
        localStorage.setItem(
          'qa_teacher',
          JSON.stringify({
            id: authData.teacherId,
            name: authData.name,
            email: authData.email,
          })
        )
        onLoginSuccess(authData)
      }
   } catch (err) {
      console.error('Authentication error:', err)
      // Ignore the confusing backend 403s and just show the correct friendly message
      if (isRegister) {
        setErrorNotice('This email is already in use. Please log in.');
      } else {
        setErrorNotice('Invalid email or password. Please try again.');
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <button className="auth-back" onClick={onBack}>
        <ArrowLeft size={17} /> Back to home
      </button>

      <div className="auth-card">
        <a
          className="brand auth-brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault()
            onBack()
          }}
        >
          <span className="brand-icon"><Brain size={23} /></span>
          <span>Quiz<span className="brand-accent">Arena</span></span>
        </a>

        <div className="auth-heading">
          <div className="auth-symbol"><UserRound size={24} /></div>
          <span className="section-kicker">TEACHER SPACE</span>
          <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p>
            {isRegister
              ? 'Set up your teacher account and bring your quizzes to life.'
              : 'Sign in to create quizzes and manage your classroom.'}
          </p>
        </div>

        {errorNotice && (
          <div
            style={{
              padding: '10px 14px',
              marginTop: '16px',
              borderRadius: '9px',
              backgroundColor: '#ff526315',
              border: '1px solid #ff526340',
              color: '#ff9ca7',
              fontSize: '11px',
              lineHeight: '1.5',
            }}
          >
            {errorNotice}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-field">
              <label htmlFor="teacher-name">FULL NAME</label>
              <div className="auth-input">
                <UserRound size={17} />
                <input
                  id="teacher-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="teacher-email">EMAIL ADDRESS</label>
            <div className="auth-input">
              <Mail size={17} />
              <input
                id="teacher-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="teacher-password">PASSWORD</label>
            <div className="auth-input">
              <Lock size={17} />
              <input
                id="teacher-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={isRegister ? 8 : 1}
                required
                disabled={submitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister
            ? 'Already have an account?'
            : "Don't have a teacher account?"}
          {' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorNotice('')
            }}
            disabled={submitting}
          >
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </div>

        <p className="auth-security">
          <Lock size={13} /> Your classroom starts here
        </p>
      </div>

      <p className="auth-footer">
        QuizArena · Learn together. Compete together.
      </p>
    </main>
  )
}

function App() {
  const [page, setPage] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [teacher, setTeacher] = useState(null)
  
  // Student join state
  const [roomCode, setRoomCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem('qa_token')
    const savedTeacher = localStorage.getItem('qa_teacher')
    if (savedToken && savedTeacher) {
      try {
        setTeacher(JSON.parse(savedTeacher))
        setPage('teacher-dashboard') 
      } catch (e) {
        localStorage.removeItem('qa_token')
        localStorage.removeItem('qa_teacher')
      }
    }
  }, [])

  const openTeacherAuth = () => {
    if (teacher) {
      setPage('teacher-dashboard')
    } else {
      setPage('teacher-auth')
    }
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = () => {
    localStorage.removeItem('qa_token')
    localStorage.removeItem('qa_teacher')
    setTeacher(null)
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    })
    setMenuOpen(false)
  }

  const joinQuiz = async (event) => {
    event.preventDefault()
    setJoinError('')

    if (!roomCode.trim() || !studentName.trim()) {
      setJoinError('Please enter both a room code and nickname.')
      return
    }

    setJoining(true)
    try {
      const response = await api.post('/students/join', {
        roomCode: roomCode.trim().toUpperCase(),
        studentName: studentName.trim()
      })
      
      setStudentData(response.data)
      setPage('student-lobby')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Join error:', error)
      setJoinError(error.response?.data?.message || 'Could not join. Please check the code.')
    } finally {
      setJoining(false)
    }
  }

  if (page === 'teacher-dashboard') {
    return (
      <TeacherDashboard
        teacher={teacher}
        onLogout={handleLogout}
      />
    )
  }

  if (page === 'teacher-auth') {
    return (
      <TeacherAuth
        onBack={() => setPage('home')}
        onLoginSuccess={(authData) => {
          setTeacher({
            id: authData.teacherId,
            name: authData.name,
            email: authData.email,
          })
          setPage('teacher-dashboard')
        }}
      />
    )
  }

  if (page === 'student-lobby') {
    return (
      <StudentLobby 
        studentData={studentData} 
        onQuizStart={(firstQuestion) => {
          setActiveQuestion(firstQuestion);
          setPage('live-quiz');
        }} 
      />
    )
  }
  
  if (page === 'live-quiz') {
    return (
      <LiveQuiz 
        studentData={studentData}
        initialQuestion={activeQuestion}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="QuizArena home">
          <span className="brand-icon"><Brain size={23} /></span>
          <span>Quiz<span className="brand-accent">Arena</span></span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <button className="nav-login" onClick={openTeacherAuth}>
            {teacher ? `Dashboard (${teacher.name})` : 'Teacher login'}
          </button>
          <button
            className="button button-small button-primary"
            onClick={() => scrollToSection('student')}
          >
            Join a quiz <ArrowRight size={16} />
          </button>
        </nav>
      </header>

      <main id="home">
        <section className="hero-section">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={15} />
              <span>LEARNING, REIMAGINED</span>
            </div>

            <h1>
              Learning is better
              <br />
              when it's <span className="gradient-text">a game.</span>
            </h1>

            <p className="hero-description">
              Create exciting quizzes, challenge your classmates, and
              compete for the top spot. Make every question count.
            </p>

            <div className="hero-actions">
              <button
                className="button button-primary button-large"
                onClick={openTeacherAuth}
              >
                Create a quiz <ChevronRight size={19} />
              </button>
              <button
                className="button button-secondary button-large"
                onClick={() => scrollToSection('student')}
              >
                <Users size={18} /> Join with a code
              </button>
            </div>

            <div className="hero-trust">
              <div className="avatar-stack">
                <span>U</span>
                <span>K</span>
                <span>M</span>
              </div>
              <p><strong>Learn together.</strong> Compete together.</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-tag tag-top">
              <span className="tag-icon purple"><Sparkles size={17} /></span>
              <span>
                <strong>AI-powered</strong>
                <small>Quiz creation</small>
              </span>
            </div>

            <div className="quiz-preview">
              <div className="preview-topbar">
                <div className="preview-brand">
                  <span className="mini-brand"><Brain size={15} /></span>
                  <span>QuizArena</span>
                </div>
                <span className="live-pill"><span /> LIVE PREVIEW</span>
              </div>

              <div className="preview-progress"><span /></div>

              <div className="preview-body">
                <div className="question-meta">
                  <span>QUESTION 03</span>
                  <span className="timer"><Zap size={13} /> 0:18</span>
                </div>

                <h3>Which language powers the QuizArena backend?</h3>

                <div className="answer-grid">
                  <div className="answer-option answer-red">
                    <span>A</span> Python
                  </div>
                  <div className="answer-option answer-blue">
                    <span>B</span> Java
                  </div>
                  <div className="answer-option answer-yellow">
                    <span>C</span> Ruby
                  </div>
                  <div className="answer-option answer-green">
                    <span>D</span> Go
                  </div>
                </div>

                <div className="preview-footer">
                  <span><Users size={14} /> Multiplayer challenge</span>
                  <span>03 / 10</span>
                </div>
              </div>
            </div>

            <div className="floating-tag tag-bottom">
              <span className="tag-icon gold"><Trophy size={19} /></span>
              <span>
                <strong>Climb the ranks</strong>
                <small>Every point matters</small>
              </span>
              <span className="rank-number">#1</span>
            </div>
          </div>

          <div className="hero-bottom-label">
            <span className="status-dot" /> BUILT FOR CURIOUS MINDS
          </div>
        </section>

        <section className="features-section section-wrap" id="features">
          <div className="section-heading">
            <span className="section-kicker">WHY QUIZARENA?</span>
            <h2>More than just <span className="gradient-text">a quiz.</span></h2>
            <p>Everything you need to turn learning into a shared experience.</p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon purple"><Sparkles size={23} /></div>
              <h3>AI-powered quizzes</h3>
              <p>Generate multiple-choice questions from a topic and customize them to fit your class.</p>
              <span className="feature-number">01</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon blue"><Zap size={23} /></div>
              <h3>Real-time competition</h3>
              <p>Answer timed questions, challenge your friends, and watch the action unfold live.</p>
              <span className="feature-number">02</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon gold"><Trophy size={23} /></div>
              <h3>Live leaderboards</h3>
              <p>Earn points for correct answers and speed, then see where you stand.</p>
              <span className="feature-number">03</span>
            </article>
          </div>
        </section>

        <section className="pathways-section section-wrap" id="how-it-works">
          <div className="section-heading">
            <span className="section-kicker">GET IN THE GAME</span>
            <h2>Your arena. <span className="gradient-text">Your move.</span></h2>
            <p>Choose how you want to take part.</p>
          </div>

          <div className="pathway-grid">
            <article className="pathway-card teacher-card" id="teacher">
              <div className="pathway-top">
                <div className="pathway-icon"><GraduationCap size={26} /></div>
                <span className="pathway-label">FOR EDUCATORS</span>
              </div>

              <h3>Bring your classroom to life.</h3>
              <p>Create a quiz, generate questions with AI, and host a live challenge for your students.</p>

              <ul className="pathway-list">
                <li><Sparkles size={16} /> AI-generated questions</li>
                <li><CircleHelp size={16} /> Edit and customize MCQs</li>
                <li><Trophy size={16} /> Track quiz results</li>
              </ul>

              <button
                className="button button-primary button-large pathway-button"
                onClick={openTeacherAuth}
              >
                Enter teacher space <ArrowRight size={18} />
              </button>

              <div className="pathway-decoration decoration-teacher">
                <Brain size={120} />
              </div>
            </article>

            <article className="pathway-card student-card" id="student">
              <div className="pathway-top">
                <div className="pathway-icon"><Users size={25} /></div>
                <span className="pathway-label">FOR STUDENTS</span>
              </div>

              <h3>Ready, set, answer!</h3>
              <p>Join a live quiz with a room code, race against the clock, and climb the leaderboard.</p>

              <form className="join-form" onSubmit={joinQuiz}>
                <label htmlFor="room-code">JOIN A LIVE QUIZ</label>
                {joinError && (
                  <p style={{ color: '#ff9ca7', fontSize: '11px', marginTop: '-4px', marginBottom: '8px' }}>
                    {joinError}
                  </p>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="room-input-wrap" style={{ maxWidth: '100%' }}>
                    <input
                      id="room-code"
                      type="text"
                      placeholder="Room code (e.g. D2FE24)"
                      value={roomCode}
                      onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                      maxLength={6}
                      autoComplete="off"
                      disabled={joining}
                    />
                  </div>
                  <div className="room-input-wrap" style={{ maxWidth: '100%' }}>
                    <input
                      id="student-name"
                      type="text"
                      placeholder="Your nickname"
                      value={studentName}
                      onChange={(event) => setStudentName(event.target.value)}
                      maxLength={50}
                      autoComplete="off"
                      disabled={joining}
                    />
                    <button type="submit" aria-label="Join quiz" disabled={joining}>
                      {joining ? <span style={{ fontSize: '10px', fontWeight: '700' }}>WAIT</span> : <ArrowRight size={20} />}
                    </button>
                  </div>
                </div>
              </form>

              <div className="student-note">
                <span className="status-dot" /> No account needed to join a game
              </div>

              <div className="pathway-decoration decoration-student">
                <Trophy size={118} />
              </div>
            </article>
          </div>
        </section>

        <section className="bottom-cta">
          <div className="cta-glow" />
          <div className="cta-content">
            <span className="section-kicker">THE NEXT QUESTION IS YOURS</span>
            <h2>Ready to enter the arena?</h2>
            <p>Bring curiosity. Bring your friends. Let the game begin.</p>
            <button
              className="button button-primary button-large"
              onClick={openTeacherAuth}
            >
              Let's get started <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon"><Brain size={20} /></span>
          <span>Quiz<span className="brand-accent">Arena</span></span>
        </a>
        <p>Made for curious minds. Built for friendly competition.</p>
        <span className="footer-copy">© 2026 QuizArena</span>
      </footer>
    </div>
  )
}

export default App