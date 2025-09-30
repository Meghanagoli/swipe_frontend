import React from "react";
import { useDispatch } from "react-redux";
import { setResumeText } from "../features/interviewSlice";

export default function WelcomeBackModal({
  isVisible,
  onClose,
  onContinue,
  candidateData,
}) {
  const dispatch = useDispatch();

  const handleContinue = () => {
    if (candidateData.resumeText) {
      dispatch(setResumeText(candidateData.resumeText));
    }
    onContinue();
  };

  // Calculate session info
  const sessionStartTime = candidateData.sessionStartTime;
  const currentQuestionIndex = candidateData.currentQuestionIndex || 0;
  const totalQuestions = candidateData.questions?.length || 0;
  const answersCount = candidateData.answers?.length || 0;

  const getSessionDuration = () => {
    if (!sessionStartTime) return "Unknown";
    const now = Date.now();
    const duration = Math.floor((now - sessionStartTime) / 1000 / 60); // minutes
    if (duration < 1) return "Less than 1 minute";
    if (duration === 1) return "1 minute";
    return `${duration} minutes`;
  };

  const getProgressPercentage = () => {
    if (totalQuestions === 0) return 0;
    return Math.round((currentQuestionIndex / totalQuestions) * 100);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome Back!
          </h2>
          <p className="text-gray-600">
            You have an unfinished interview session. Here's where you left off:
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Progress:</span>
              <p className="text-gray-600">
                {currentQuestionIndex + 1} of {totalQuestions} questions
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Session Duration:
              </span>
              <p className="text-gray-600">{getSessionDuration()}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Answers Completed:
              </span>
              <p className="text-gray-600">{answersCount} answers</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Status:</span>
              <p className="text-gray-600">
                {candidateData.paused ? "Paused" : "In Progress"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-700 mb-6 text-center">
          Would you like to continue where you left off, or start a fresh
          interview?
        </p>

        <div className="flex justify-center space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 font-medium"
          >
            Start New Interview
          </button>
          <button
            onClick={handleContinue}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Continue Interview
          </button>
        </div>
      </div>
    </div>
  );
}
