import TeacherLiveSession from './TeacherLiveSession';
import { useMemo, useState, useEffect } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
  Loader2
} from "lucide-react";

import CreateQuiz from "./CreateQuiz";
import api from "./api";
import "./TeacherDashboard.css";

// CLEANUP 1: Removed Question Bank and Settings from the sidebar
const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Quizzes", icon: BookOpen }
];

function StatusBadge({ status }) {
  return (
    <span className={`td-status td-status-${status.toLowerCase()}`}>
      <span className="td-status-dot" />
      {status}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const formattedDifficulty = difficulty 
    ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() 
    : "Medium";

  return (
    <span className={`td-difficulty td-difficulty-${formattedDifficulty.toLowerCase()}`}>
      {formattedDifficulty}
    </span>
  );
}

export default function TeacherDashboard({ teacher, onLogout }) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [quizzes, setQuizzes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeLiveQuiz, setActiveLiveQuiz] = useState(null);

  useEffect(() => {
    if (teacher?.id) {
      fetchQuizzes();
    }
  }, [teacher]);

  const fetchQuizzes = async () => {
    try {
      const response = await api.get(`/quizzes/teacher/${teacher.id}`);
      
      const fetchedQuizzes = response.data.map(q => ({
        id: q.id,
        title: q.topic, 
        topic: q.topic,
        difficulty: q.difficulty,
        status: q.status,
        roomCode: q.roomCode,
        createdAt: new Date(q.createdAt).toLocaleDateString()
      }));

      setQuizzes(fetchedQuizzes);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
      notify("Failed to load your quizzes from the server.");
    }
  };

  const filteredQuizzes = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return quizzes;

    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(search) ||
        quiz.topic.toLowerCase().includes(search)
    );
  }, [quizzes, searchTerm]);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openCreateQuiz() {
    setShowCreate(true);
    setSelectedQuiz(null);
  }

  function handleSaveQuiz() {
    setShowCreate(false);
    setActiveNav("My Quizzes");
    notify("Quiz saved as a draft!");
    fetchQuizzes(); 
  }

  async function updateQuizStatus(quizId, nextStatus) {
    setStatusUpdating(true);
    try {
      if (nextStatus === "WAITING") {
        await api.post(`/quizzes/${quizId}/start`);
        // Launch Mission Control as a Lobby!
        setActiveLiveQuiz(selectedQuiz); 
      } else if (nextStatus === "FINISHED") {
        await api.post(`/quizzes/${quizId}/finish`);
      }

      await fetchQuizzes();
      setSelectedQuiz(null);
      notify(`Quiz status successfully changed to ${nextStatus}.`);
    } catch (error) {
      console.error("Failed to update status:", error);
      notify(error.response?.data?.message || `Failed to change status to ${nextStatus}.`);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function deleteQuiz(quizId) {
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((current) => current.filter((quiz) => quiz.id !== quizId));
      setSelectedQuiz(null);
      notify("Quiz permanently deleted.");
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      notify("Failed to delete quiz from the server.");
    }
  }

  function renderQuizTable(limit = null) {
    // Slice the array if a limit is provided, otherwise show all
    const displayQuizzes = limit ? filteredQuizzes.slice(0, limit) : filteredQuizzes;

    if (displayQuizzes.length === 0) {
      return (
        <div className="td-empty-state">
          <BookOpen size={28} />
          <h3>No quizzes found</h3>
          <p>Try a different search or create a new quiz.</p>
          <button className="td-primary-btn" onClick={openCreateQuiz}>
            <Plus size={16} />
            Create quiz
          </button>
        </div>
      );
    }

    return (
      <div className="td-table-wrap">
        <table className="td-quiz-table">
          <thead>
            <tr>
              <th>QUIZ</th>
              <th>DIFFICULTY</th>
              <th>ROOM CODE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {/* Map over the new displayQuizzes variable instead of filteredQuizzes */}
            {displayQuizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td>
                  <div className="td-quiz-name">
                    <span className="td-quiz-icon">
                      <BookOpen size={17} />
                    </span>
                    <span>
                      <strong>{quiz.title}</strong>
                      <small>{quiz.createdAt}</small>
                    </span>
                  </div>
                </td>
                <td><DifficultyBadge difficulty={quiz.difficulty} /></td>
                <td>{quiz.roomCode}</td>
                <td><StatusBadge status={quiz.status} /></td>
                <td>
                  <button
                    className="td-icon-btn"
                    aria-label={`Manage ${quiz.title}`}
                    title="Manage quiz"
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (showCreate) {
    return <CreateQuiz teacherId={teacher?.id} onBack={() => setShowCreate(false)} onSave={handleSaveQuiz} />;
  }

  if (activeLiveQuiz) {
    return (
      <TeacherLiveSession 
        quiz={activeLiveQuiz} 
        onExit={() => {
          setActiveLiveQuiz(null);
          setSelectedQuiz(null);
          fetchQuizzes();
        }} 
      />
    );
  }

  return (
    <div className="td-layout">
      <aside className="td-sidebar">
        <div className="td-brand">
          <div className="td-brand-icon"><Sparkles size={20} /></div>
          <span>Quiz<span className="td-brand-accent">Arena</span></span>
        </div>

        <div className="td-workspace">
          <div className="td-workspace-avatar">{teacher?.name?.[0]?.toUpperCase() || 'T'}</div>
          <div>
            <strong>{teacher?.name || 'Teacher'}'s Workspace</strong>
            <small>Quiz management</small>
          </div>
        </div>

        <div className="td-nav-label">WORKSPACE</div>

        <nav className="td-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`td-nav-item ${activeNav === label ? "td-nav-active" : ""}`}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activeNav === label && <span className="td-nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="td-sidebar-bottom">
          {/* CLEANUP 2: Removed "Need a Hand" widget */}
          <button className="td-logout" onClick={() => onLogout?.()}>
            <LogOut size={17} />
            Back to home
          </button>
        </div>
      </aside>

      <main className="td-main">
        <header className="td-topbar">
          <div className="td-breadcrumb">
            <span>Workspace</span>
            <span className="td-breadcrumb-separator">/</span>
            <strong>{activeNav}</strong>
          </div>

          <div className="td-topbar-right">
            <span className="td-demo-label"><span />Live Backend</span>
            <div className="td-profile">
              <div className="td-profile-avatar">{teacher?.name?.[0]?.toUpperCase() || 'T'}</div>
              <div>
                <strong>{teacher?.name || 'Teacher'}</strong>
                <small>{teacher?.email || 'Quiz creator'}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="td-content">
          {activeNav === "Overview" && (
            <>
              <section className="td-welcome">
                <div className="td-welcome-content">
                  <span className="td-eyebrow"><Sparkles size={13} /> YOUR QUIZ WORKSPACE</span>
                  <h1>Make learning<br /><span>more exciting.</span></h1>
                  <p>Create quizzes, challenge students, and bring your classroom to life with QuizArena.</p>
                  <button className="td-primary-btn" onClick={openCreateQuiz}>
                    <Plus size={17} /> Create new quiz <ArrowUpRight size={16} />
                  </button>
                </div>
              </section>

              <section className="td-stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="td-stat-card">
                  <div className="td-stat-icon td-stat-purple"><BookOpen size={19} /></div>
                  <div className="td-stat-label">Total quizzes</div>
                  <div className="td-stat-bottom">
                    <strong>{quizzes.length}</strong>
                    <span className="td-stat-note">Created</span>
                  </div>
                </div>

                <div className="td-stat-card">
                  <div className="td-stat-icon td-stat-green"><Activity size={19} /></div>
                  <div className="td-stat-label">Live quizzes</div>
                  <div className="td-stat-bottom">
                    <strong>{quizzes.filter((quiz) => quiz.status === "LIVE").length}</strong>
                    <span className="td-stat-note">Active now</span>
                  </div>
                </div>
                {/* CLEANUP 3: Removed 0 Participants and 0 Questions stats */}
              </section>

              <section className="td-section">
                <div className="td-section-heading td-quiz-section-heading">
                  <div>
                    <span className="td-eyebrow">CONTENT OVERVIEW</span>
                    <h2>My quizzes</h2>
                  </div>
                  <button className="td-text-btn" onClick={() => setActiveNav("My Quizzes")}>
                    View all <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="td-panel">
                  {renderQuizTable(10)}
                </div>
              </section>
            </>
          )}

          {activeNav === "My Quizzes" && (
            <section className="td-section">
              <div className="td-page-heading">
                <div>
                  <span className="td-eyebrow">CONTENT MANAGEMENT</span>
                  <h1>My quizzes</h1>
                  <p>Manage drafts, waiting rooms, and completed quizzes.</p>
                </div>
                <button className="td-primary-btn" onClick={openCreateQuiz}>
                  <Plus size={17} /> Create quiz
                </button>
              </div>

              <div className="td-panel">
                <div className="td-table-toolbar">
                  <div className="td-table-title">
                    <h3>All quizzes</h3>
                    <span>{quizzes.length} total</span>
                  </div>
                  <div className="td-search">
                    <Search size={15} />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search quizzes..."
                    />
                  </div>
                </div>
                {renderQuizTable()}
              </div>
            </section>
          )}

          <footer className="td-footer">
            <span>QuizArena</span>
            <span>Learn. Play. Win.</span>
          </footer>
        </div>
      </main>

      {selectedQuiz && (
        <div className="td-modal-overlay" onClick={() => setSelectedQuiz(null)}>
          <div className="td-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="td-modal-header">
              <div>
                <span className="td-eyebrow">QUIZ MANAGEMENT</span>
                <h2>{selectedQuiz.title}</h2>
              </div>
              <button className="td-icon-btn" onClick={() => setSelectedQuiz(null)}>
                <X size={19} />
              </button>
            </div>

            <div className="td-manage-details">
              <div><span>Topic</span><strong>{selectedQuiz.topic}</strong></div>
              <div><span>Difficulty</span><strong>{selectedQuiz.difficulty}</strong></div>
              <div><span>Status</span><StatusBadge status={selectedQuiz.status} /></div>
              <div><span>Room Code</span><strong style={{color: '#ffd17a'}}>{selectedQuiz.roomCode}</strong></div>
            </div>

            {/* FIX 4: Resume Button if the quiz is already active */}
            {(selectedQuiz.status === "WAITING" || selectedQuiz.status === "LIVE") && (
              <button 
                className="td-primary-btn" 
                style={{ width: '100%', marginBottom: '20px', justifyContent: 'center' }}
                onClick={() => setActiveLiveQuiz(selectedQuiz)}
              >
                <Sparkles size={16} /> Resume Mission Control
              </button>
            )}

            <p className="td-modal-description">
              Select WAITING to allow students to join the lobby.
            </p>

            <div className="td-status-actions">
              {/* FIX 3: Removed "LIVE" from the array to prevent stranding quizzes */}
              {["DRAFT", "WAITING", "FINISHED"].map((status) => (
                <button
                  key={status}
                  className={`td-status-action ${selectedQuiz.status === status ? "td-status-action-active" : ""}`}
                  onClick={() => updateQuizStatus(selectedQuiz.id, status)}
                  disabled={selectedQuiz.status === status || statusUpdating}
                >
                  {statusUpdating && selectedQuiz.status !== status ? (
                    <Loader2 size={12} className="lucide-spin" />
                  ) : (
                    status
                  )}
                </button>
              ))}
            </div>

            <div className="td-modal-footer">
              <button className="td-danger-btn" onClick={() => deleteQuiz(selectedQuiz.id)}>
                <Trash2 size={15} /> Delete quiz
              </button>
              <button className="td-secondary-btn" onClick={() => setSelectedQuiz(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="td-toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}
    </div>
  );
}