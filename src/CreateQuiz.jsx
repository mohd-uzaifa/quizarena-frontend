import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Loader2
} from "lucide-react";
import api from "./api";
import "./CreateQuiz.css";

const difficultyMap = {
  Easy: "EASY",
  Medium: "MEDIUM",
  Hard: "HARD",
};

const optionLetters = ["A", "B", "C", "D"];

export default function CreateQuiz({ teacherId, onBack, onSave }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(5);
  
  // Real backend state
  const [quizId, setQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // Map backend QuestionResponse to our frontend shape
  const mapBackendToFrontend = (backendQ) => ({
    id: backendQ.id,
    question: backendQ.questionText,
    options: [backendQ.optionA, backendQ.optionB, backendQ.optionC, backendQ.optionD],
    answer: optionLetters.indexOf(backendQ.correctOption),
    regenerationCount: backendQ.regenerationCount || 0
  });

 async function generateQuestions() {
    if (!title.trim() || !topic.trim()) {
      setNotice("Please provide a quiz title and topic.");
      return;
    }

    setSaving(true);
    setNotice("");
    setLoadingMsg("Creating quiz workspace...");

    let newQuizId = null; // Declare outside the try block so the catch block can access it for cleanup

    try {
      // 1. Create the draft quiz in MySQL
      const quizRes = await api.post("/quizzes", {
        topic: topic.trim(),
        difficulty: difficultyMap[difficulty],
        teacherId: teacherId,
      });
      newQuizId = quizRes.data.id;
      setQuizId(newQuizId);

      // 2. Chunk the AI generation requests dynamically
      let allGeneratedQuestions = [];
      let remainingQuestions = questionCount;
      let coveredConcepts = []; 

      // FIX 1: Enforce a strict max batch size of 5 for ALL difficulties.
      // This guarantees the AI never hits the token limit while generating JSON.
      const BATCH_SIZE = 5;
      let maxRetries = 3;
      let currentRetries = 0;

      while (remainingQuestions > 0) {
        const currentBatchCount = Math.min(remainingQuestions, BATCH_SIZE);
        
        setLoadingMsg(`AI generating questions... (${allGeneratedQuestions.length}/${questionCount} completed)`);
        
        try {
          // Send the 'existingConcepts' to the backend to prevent duplicates
          const qRes = await api.post(`/quizzes/${newQuizId}/questions/generate-questions`, {
            questionCount: currentBatchCount,
            existingConcepts: coveredConcepts
          });

          const generatedBatch = qRes.data;

          // Extract concepts from this batch to avoid in the next loop
          const newConcepts = generatedBatch
            .map(q => q.concept)
            .filter(concept => concept && concept.trim() !== "");
          coveredConcepts = [...coveredConcepts, ...newConcepts];

          allGeneratedQuestions = [...allGeneratedQuestions, ...generatedBatch];
          
          // Only decrease the remaining count if the batch was successful
          remainingQuestions -= currentBatchCount;
          currentRetries = 0; // Reset retries after a successful batch
          
        } catch (batchError) {
          console.warn("AI generation batch failed. Retrying...", batchError);
          currentRetries++;
          
          if (currentRetries > maxRetries) {
             throw new Error("AI struggled to generate unique options for this batch. Rolling back...");
          }
          
          setLoadingMsg(`AI hit a limit. Retrying batch... (Attempt ${currentRetries}/${maxRetries})`);
        }
      }

      // 3. Render the combined questions from the backend
      setQuestions(allGeneratedQuestions.map(mapBackendToFrontend));
      setStep(2);

    } catch (error) {
      console.error("Failed to generate:", error);
      setNotice(
        error.message || error.response?.data?.message || 
        "Failed to generate questions. Cleaning up..."
      );
      
      // FIX 2: Transactional Rollback
      // If the generation fails at any point, delete the orphaned quiz so it doesn't pollute the dashboard
      if (newQuizId) {
        try {
          await api.delete(`/quizzes/${newQuizId}`);
        } catch (cleanupError) {
          console.error("Failed to delete orphaned quiz during cleanup:", cleanupError);
        }
      }
      setQuizId(null);
      setQuestions([]);

    } finally {
      setSaving(false);
      setLoadingMsg("");
    }
  }

  function updateQuestionLocal(id, field, value) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  }

  function updateOptionLocal(id, optionIndex, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const newOpts = [...q.options];
        newOpts[optionIndex] = value;
        return { ...q, options: newOpts };
      })
    );
  }

  async function addCustomQuestion() {
    if (questions.length >= 15) {
      setNotice("A quiz can contain a maximum of 15 questions.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      // Add a blank question directly to the backend
      const res = await api.post(`/quizzes/${quizId}/questions`, {
        questionText: "New custom question",
        optionA: "Option A",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctOption: "A"
      });
      
      setQuestions((prev) => [...prev, mapBackendToFrontend(res.data)]);
    } catch (error) {
      setNotice("Failed to add a custom question.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id) {
    if (questions.length <= 5) {
      setNotice("A quiz must contain at least 5 questions.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      await api.delete(`/quizzes/${quizId}/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      setNotice("Failed to delete question.");
    } finally {
      setSaving(false);
    }
  }

  async function regenerateQuestion(id) {
    const qToRegen = questions.find((q) => q.id === id);
    if (qToRegen.regenerationCount >= 1) {
      setNotice("This question has reached the maximum of 1 regeneration.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const res = await api.post(`/quizzes/${quizId}/questions/${id}/regenerate`);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? mapBackendToFrontend(res.data) : q))
      );
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to regenerate question.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (saving) return;

    const incomplete = questions.some(
      (q) => !q.question.trim() || q.options.some((opt) => !opt.trim())
    );

    if (incomplete) {
      setNotice("Complete the question text and all four options before saving.");
      return;
    }

    setSaving(true);
    setNotice("Saving changes to database...");

    try {
      // Send all local edits back to the database
      for (const q of questions) {
        await api.put(`/quizzes/${quizId}/questions/${q.id}`, {
          questionText: q.question.trim(),
          optionA: q.options[0].trim(),
          optionB: q.options[1].trim(),
          optionC: q.options[2].trim(),
          optionD: q.options[3].trim(),
          correctOption: optionLetters[q.answer],
        });
      }

      // Fetch the final quiz status to return to the dashboard
      const quizRes = await api.get(`/quizzes/${quizId}`);
      const savedQuiz = quizRes.data;

      onSave?.({
        id: savedQuiz.id,
        backendId: savedQuiz.id,
        roomCode: savedQuiz.roomCode,
        title: title.trim(),
        topic: savedQuiz.topic,
        difficulty: savedQuiz.difficulty,
        questions: questions.length,
        status: savedQuiz.status,
      });
    } catch (error) {
      console.error("Failed to save edits:", error);
      setNotice("Failed to save some question edits.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cq-page">
      <div className="cq-top">
        <button className="cq-back" onClick={onBack} disabled={saving}>
          <ArrowLeft size={17} /> Back to dashboard
        </button>
        <span className="cq-demo">
          <span /> Live Backend
        </span>
      </div>

      <div className="cq-heading">
        <span className="cq-eyebrow">
          <Sparkles size={14} /> AI-POWERED QUIZ BUILDER
        </span>
        <h1>
          {step === 1 ? "Create your quiz" : "Review your questions"}
          <span>.</span>
        </h1>
        <p>
          {step === 1
            ? "Set up your quiz details before letting AI generate the questions."
            : "Review the generated text, four answer options, and correct answers."}
        </p>
      </div>

      <div className="cq-progress">
        <div className={step >= 1 ? "cq-progress-active" : ""}>
          <span>1</span> Quiz details
        </div>
        <div className="cq-progress-line" />
        <div className={step >= 2 ? "cq-progress-active" : ""}>
          <span>2</span> Review questions
        </div>
      </div>

      {step === 1 ? (
        <form
          className="cq-details"
          onSubmit={(event) => {
            event.preventDefault();
            generateQuestions();
          }}
        >
          <div className="cq-panel-title">
            <div>
              <h2>Quiz details</h2>
              <p>Choose a clear title, topic, and difficulty.</p>
            </div>
            <span className="cq-step-label">STEP 01</span>
          </div>

          <label className="cq-field">
            Quiz title
            <input
              required
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Java OOPs Fundamentals"
              disabled={saving}
            />
          </label>

          <label className="cq-field">
            Topic (Sent to AI)
            <input
              required
              maxLength={100}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Java inheritance, polymorphism, abstraction"
              disabled={saving}
            />
          </label>

          <div className="cq-field">
            <span>Difficulty level</span>
            <div className="cq-difficulties">
              {["Easy", "Medium", "Hard"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`cq-difficulty ${
                    difficulty === level ? "cq-selected" : ""
                  }`}
                  onClick={() => setDifficulty(level)}
                  disabled={saving}
                >
                  <span
                    className={`cq-difficulty-dot cq-${level.toLowerCase()}`}
                  />
                  <strong>{level}</strong>
                  <small>
                    {level === "Easy"
                      ? "Fundamentals"
                      : level === "Medium"
                        ? "Applied concepts"
                        : "Advanced concepts"}
                  </small>
                  {difficulty === level && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <label className="cq-field">
            Number of questions
            <div className="cq-count-control">
              <input
                type="range"
                min="5"
                max="15"
                value={questionCount}
                onChange={(event) =>
                  setQuestionCount(Number(event.target.value))
                }
                disabled={saving}
              />
              <strong>{questionCount}</strong>
            </div>
            <small className="cq-hint">
              Choose between 5 and 15 questions.
            </small>
          </label>

          <div className="cq-info">
            <Sparkles size={18} />
            <div>
              <strong>AI Generation</strong>
              <p>
                The backend will contact Groq API to generate these questions. This takes about 5-10 seconds.
              </p>
            </div>
          </div>

          {notice && (
            <p className="cq-notice">
              <X size={15} /> {notice}
            </p>
          )}

          <div className="cq-footer">
            <button
              type="button"
              className="cq-secondary"
              onClick={onBack}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="cq-primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={17} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> 
                  {loadingMsg || "Working..."}
                </>
              ) : (
                <>Prepare questions <ArrowRight size={17} /></>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="cq-review">
          <div className="cq-review-summary">
            <div>
              <span className="cq-eyebrow">QUIZ PREVIEW</span>
              <h2>{title}</h2>
              <p>
                {topic} · {difficulty} · {questions.length} questions
              </p>
            </div>
            {/* Disabled going back so we don't orphan the created quiz */}
          </div>

          {questions.map((question, index) => (
            <article className="cq-question" key={question.id}>
              <div className="cq-question-top">
                <span className="cq-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="cq-question-label">MULTIPLE CHOICE</span>
                <div className="cq-question-actions">
                  <button
                    type="button"
                    title={question.regenerationCount >= 1 ? "Regeneration limit reached" : "Regenerate question (1 left)"}                    onClick={() => regenerateQuestion(question.id)}
                    disabled={saving || question.regenerationCount >= 1}
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button"
                    title="Delete question"
                    onClick={() => deleteQuestion(question.id)}
                    disabled={saving}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <label className="cq-field">
                Question
                <textarea
                  rows={2}
                  value={question.question}
                  disabled={saving}
                  onChange={(event) =>
                    updateQuestionLocal(question.id, "question", event.target.value)
                  }
                />
              </label>

              <div className="cq-options-heading">
                <span>ANSWER OPTIONS</span>
                <small>Select the correct answer</small>
              </div>

              <div className="cq-options">
                {question.options.map((option, optionIndex) => (
                  <div
                    className={`cq-option ${
                      question.answer === optionIndex ? "cq-option-correct" : ""
                    }`}
                    key={optionIndex}
                  >
                    <button
                      type="button"
                      className="cq-option-letter"
                      title="Mark as correct answer"
                      disabled={saving}
                      onClick={() =>
                        updateQuestionLocal(question.id, "answer", optionIndex)
                      }
                    >
                      {optionLetters[optionIndex]}
                    </button>
                    <input
                      value={option}
                      disabled={saving}
                      onChange={(event) =>
                        updateOptionLocal(question.id, optionIndex, event.target.value)
                      }
                    />
                    {question.answer === optionIndex && <Check size={16} />}
                  </div>
                ))}
              </div>
            </article>
          ))}

          <button
            className="cq-add-question"
            type="button"
            onClick={addCustomQuestion}
            disabled={saving || questions.length >= 15}
          >
            <Plus size={17} /> Add custom question
          </button>

          {notice && (
            <p className="cq-notice">
              <X size={15} /> {notice}
            </p>
          )}

          <div className="cq-footer cq-sticky-footer">
            <button className="cq-primary" onClick={saveDraft} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={17} style={{ animation: "spin 2s linear infinite" }} /> 
                  Saving...
                </>
              ) : (
                <>Save as draft <Check size={17} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}