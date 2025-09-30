import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  submitAnswer,
  setAiSummary,
  setQuestions,
  completeInterview,
  pauseInterview,
  resumeInterview,
  clearResumingFlag,
} from "../features/interviewSlice";
import { updateCandidate } from "../features/candidatesSlice";

export default function InterviewChat() {
  const dispatch = useDispatch();
  const {
    currentQuestionIndex,
    completed,
    answers,
    finalScore,
    aiSummary,
    questions,
    resumeText,
    resumingFromSession,
  } = useSelector((state) => state.interview);

  const selectedCandidateId = useSelector(
    (state) => state.ui.selectedCandidateId
  );
  const candidates = useSelector((state) => state.candidates);

  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [paused, setPaused] = useState(false); // Track pause state
  const [pausedTimeLeft, setPausedTimeLeft] = useState(null); // Track time left when paused
  const [modalOpen, setModalOpen] = useState(false); // Track modal state
  const [isResuming, setIsResuming] = useState(false); // Track if we're resuming from pause

  // Generate questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/generateQuestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText }),
        });
        const data = await res.json();

        const sortedQuestions = [
          ...data.questions.filter((q) => q.difficulty === "easy").slice(0, 2),
          ...data.questions
            .filter((q) => q.difficulty === "medium")
            .slice(0, 2),
          ...data.questions.filter((q) => q.difficulty === "hard").slice(0, 2),
        ];

        dispatch(setQuestions(sortedQuestions));
        setTimeLeft(sortedQuestions[0]?.time || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch questions if we don't have any (new session)
    if (questions.length === 0) {
      fetchQuestions();
    } else {
      setLoading(false);
    }
  }, [dispatch, resumeText, questions.length]);

  // Handle session restoration
  useEffect(() => {
    if (questions.length > 0 && !loading) {
      // If we have questions and we're not loading, this might be a restored session
      const currentQ = questions[currentQuestionIndex];
      if (currentQ) {
        // Set initial time for the current question
        const initialTime = currentQ.time || 0;
        setTimeLeft(initialTime);
        setTimeExpired(false);
      }
    }
  }, [questions, currentQuestionIndex, loading]);

  // Handle resume from pause - restore timer for current question
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= 0) {
      const currentQ = questions[currentQuestionIndex];
      if (currentQ && !paused) {
        // When resuming, start with the full time for the current question
        // unless we have a paused time left (from manual pause)
        const timeForCurrentQuestion =
          pausedTimeLeft !== null ? pausedTimeLeft : currentQ.time || 0;
        setTimeLeft(timeForCurrentQuestion);
        setTimeExpired(false);
        setIsResuming(true); // Mark that we're resuming to trigger timer setup
      }
    }
  }, [questions, currentQuestionIndex, paused, pausedTimeLeft]);

  // Timer
  useEffect(() => {
    if (completed || paused || !questions.length) return;

    // Handle resuming from session restoration
    if (resumingFromSession) {
      const currentQ = questions[currentQuestionIndex];
      if (currentQ) {
        const initialTime = currentQ.time || 0;
        setTimeExpired(false);
        setTimeLeft(initialTime);
        dispatch(clearResumingFlag()); // Clear the resuming flag
      }
      return;
    }

    // Only set initial time if we don't already have timeLeft set from restoration
    if (timeLeft === 0 || isResuming) {
      const initialTime =
        pausedTimeLeft !== null
          ? pausedTimeLeft
          : questions[currentQuestionIndex]?.time || 0;
      setTimeExpired(false);
      setTimeLeft(initialTime);
      if (isResuming) {
        setIsResuming(false); // Reset the resuming flag
      }
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    currentQuestionIndex,
    completed,
    questions,
    paused,
    pausedTimeLeft,
    timeLeft,
    isResuming,
    resumingFromSession,
    dispatch,
  ]);

  // Auto-submit when time expires
  useEffect(() => {
    if (timeLeft === 0 && !timeExpired) {
      setTimeExpired(true);
      handleSubmit();
    }
  }, [timeLeft]);

  const handlePauseInterview = () => {
    setPausedTimeLeft(timeLeft); // Save the current time left when paused
    setPaused(true); // Pause the interview
    setModalOpen(true); // Open the modal
    dispatch(pauseInterview()); // Update Redux state
  };

  const handleResumeInterview = () => {
    setPaused(false); // Resume the interview
    setModalOpen(false); // Close the modal
    setIsResuming(true); // Mark that we're resuming
    dispatch(resumeInterview()); // Update Redux state
    // Keep the pausedTimeLeft as is and resume from there
  };

  const handleSubmit = async () => {
    if (completed || !questions.length || submitting) return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    setSubmitting(true);

    try {
      // Evaluate answer
      const res = await fetch("http://localhost:5000/api/evaluateAnswer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ.q,
          answer: answer || "No Answer",
          resumeContext: resumeText,
        }),
      });

      const { score, feedback } = await res.json();

      // Check if this is the last question BEFORE submitting
      const isLastQuestion = currentQuestionIndex === questions.length - 1;

      // Submit answer to Redux (this will increment currentQuestionIndex)
      dispatch(
        submitAnswer({
          question: currentQ.q,
          answer: answer || "No Answer",
          difficulty: currentQ.difficulty,
          score,
          feedback,
        })
      );

      setAnswer("");

      // If this was the last question, complete the interview
      if (isLastQuestion) {
        // Compute final score
        const allAnswers = [
          ...answers,
          { question: currentQ.q, answer, score, feedback },
        ];
        const totalScore = allAnswers.reduce((sum, a) => sum + a.score, 0);
        const avgScore = Math.round(totalScore / allAnswers.length);

        // Generate summary (can also call backend)
        const summaryRes = await fetch(
          "http://localhost:5000/api/finalSummary",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: allAnswers,
            }),
          }
        );
        const { summary } = await summaryRes.json();
        dispatch(setAiSummary(summary));
        console.log("AI Summary received:", summary);

        // Set AI summary in state
        setAiSummary(summary);

        // Update the interview state with the correct final score
        dispatch(completeInterview({ finalScore: avgScore }));

        console.log("Updating candidate:", selectedCandidateId, {
          score: avgScore,
          summary: summary,
          answers: allAnswers,
        });

        if (selectedCandidateId) {
          // Update Redux state
          dispatch(
            updateCandidate({
              id: selectedCandidateId,
              updates: {
                score: avgScore,
                summary: summary,
                answers: allAnswers,
                status: "completed",
              },
            })
          );

          // Save to MongoDB - check if exists by email first
          const candidate = candidates.byId[selectedCandidateId];
          if (candidate) {
            try {
              // Check if candidate already exists in DB by email
              const checkRes = await fetch(
                `http://localhost:5000/api/candidates?email=${encodeURIComponent(
                  candidate.email
                )}`
              );
              const existingCandidates = await checkRes.json();

              if (existingCandidates && existingCandidates.length > 0) {
                // Update existing candidate in DB
                const dbCandidate = existingCandidates[0];
                await fetch(
                  `http://localhost:5000/api/candidates/${dbCandidate._id}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      updates: {
                        score: avgScore,
                        summary: summary,
                        answers: allAnswers,
                        status: "completed",
                      },
                    }),
                  }
                );
                console.log("Candidate updated in MongoDB");
              } else {
                // Create new candidate in DB
                await fetch("http://localhost:5000/api/candidates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: candidate.name,
                    email: candidate.email,
                    phone: candidate.phone,
                    score: avgScore,
                    summary: summary,
                    answers: allAnswers,
                    status: "completed",
                  }),
                });
                console.log("Candidate saved to MongoDB");
              }
            } catch (err) {
              console.error("Failed to save candidate to MongoDB:", err);
            }
          }
          console.log("Candidate updated successfully!");
        } else {
          console.error("No selectedCandidateId found! Trying fallback...");
          // Try to find the candidate by matching resume text or recent activity
          // This is a fallback for when session restoration doesn't preserve the selected candidate ID
          const allCandidates = candidates.allIds.map(
            (id) => candidates.byId[id]
          );
          const mostRecentCandidate = allCandidates
            .filter(
              (c) => c.status === "not-started" || c.status === "in-progress"
            )
            .sort((a, b) => b.id.localeCompare(a.id))[0]; // Get most recent by ID

          if (mostRecentCandidate) {
            console.log("Found fallback candidate:", mostRecentCandidate.id);
            dispatch(
              updateCandidate({
                id: mostRecentCandidate.id,
                updates: {
                  score: avgScore,
                  summary: summary,
                  answers: allAnswers,
                  status: "completed",
                },
              })
            );
          } else {
            console.error("No fallback candidate found either!");
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <h2 className="text-2xl font-bold text-indigo-800 mt-4">
          🤖 AI is generating questions...
        </h2>
        <p className="text-gray-600 mt-2">
          Please wait while we prepare your personalized interview
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-green-800 mb-2">
            Interview Completed!
          </h2>
          <p className="text-gray-600">
            Great job! Here's your performance summary
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
            <h3 className="text-xl font-bold text-indigo-800 mb-2">
              📊 Final Score
            </h3>
            <div className="text-4xl font-bold text-indigo-600">
              {finalScore}/10
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(finalScore / 10) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
            <h3 className="text-xl font-bold text-purple-800 mb-2">
              📝 AI Summary
            </h3>
            <p className="text-gray-700">{aiSummary}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            📋 Detailed Answers
          </h3>
          <div className="space-y-4">
            {answers.map((a, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800">
                    Question {idx + 1}
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      a.score >= 8
                        ? "bg-green-100 text-green-800"
                        : a.score >= 6
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {a.score}/10
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{a.question}</p>
                <p className="text-gray-600 mb-2">
                  <strong>Your Answer:</strong> {a.answer}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Feedback:</strong> {a.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const difficultyColors = {
    easy: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    hard: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="p-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-800">
            Interview Progress
          </h2>
          <span className="text-lg font-semibold text-indigo-600">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / questions.length) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePauseInterview}
          className="px-6 py-3 bg-yellow-600 text-white rounded-lg"
        >
          Pause Interview
        </button>
      </div>
      {/* Question Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                difficultyColors[currentQ.difficulty]
              }`}
            >
              {currentQ.difficulty.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1}
            </span>
          </div>
          <div className="text-right">
            <div
              className={`text-2xl font-bold ${
                timeExpired ? "text-red-600" : "text-indigo-600"
              }`}
            >
              {timeExpired ? "Time Up!" : `${timeLeft}s`}
            </div>
            <div className="text-sm text-gray-500">
              {timeExpired ? "Your timer has end" : "Time Remaining"}
            </div>
          </div>
        </div>
        {modalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Your interview is paused
              </h2>
              <p className="text-gray-600 mb-6">
                Click the resume button to continue.
              </p>
              <button
                onClick={handleResumeInterview}
                className="px-6 py-3 bg-green-600 text-white rounded-lg"
              >
                Resume Interview
              </button>
            </div>
          </div>
        )}
        <h3 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">
          {currentQ.q}
        </h3>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Your Answer:
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 resize-none"
            rows={6}
            placeholder="Type your answer here... Be specific and detailed in your response."
          />

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {answer.length} characters
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-8 py-3 font-semibold rounded-lg focus:ring-4 focus:ring-indigo-200 transition-all duration-200 shadow-lg ${
                submitting
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : timeExpired
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {submitting ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Evaluating...
                </span>
              ) : timeExpired ? (
                "Submit Answer (Time Expired)"
              ) : (
                "Submit Answer"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Timer Warning */}
      {timeExpired ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⏰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Time's up!</strong> You can still submit your answer,
                but the timer has expired.
              </p>
            </div>
          </div>
        </div>
      ) : timeLeft <= 10 && timeLeft > 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Time running out!</strong> You have {timeLeft} seconds
                left to submit your answer.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
