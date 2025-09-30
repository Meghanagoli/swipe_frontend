// interviewSlice.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  completed: false,
  paused: false,
  finalScore: 0,
  timeLeft: 0,
  aiSummary: "",
  pausedTimeLeft: null,
  resumeText: "",
  sessionId: null,
  sessionStartTime: null,
  lastActivityTime: null,
  resumingFromSession: false,
};

const interviewSlice = createSlice({
  name: "interview",
  initialState,
  reducers: {
    setQuestions: (state, action) => {
      state.questions = action.payload;
      state.currentQuestionIndex = 0;
      state.completed = false;
      state.answers = [];
      state.finalScore = 0;
      state.sessionId = Date.now().toString();
      state.sessionStartTime = Date.now();
      state.lastActivityTime = Date.now();
    },
    setAiSummary: (state, action) => {
      state.aiSummary = action.payload;
    },
    setResumeText: (state, action) => {
      state.resumeText = action.payload;
    },
    submitAnswer: (state, action) => {
      state.answers.push(action.payload);
      state.currentQuestionIndex += 1;
      state.lastActivityTime = Date.now();

      if (state.currentQuestionIndex >= state.questions.length) {
        state.completed = true;
        const totalScore = state.answers.reduce(
          (sum, a) => sum + (a.score || 0),
          0
        );
        state.finalScore =
          state.answers.length > 0
            ? Math.round(totalScore / state.answers.length)
            : 0;
        state.summary = `You answered ${state.answers.length} questions.`;
      }
    },
    completeInterview: (state, action) => {
      state.completed = true;
      // If a final score is provided, use it; otherwise calculate from answers
      if (action.payload && typeof action.payload.finalScore === "number") {
        state.finalScore = action.payload.finalScore;
      } else {
        const totalScore = state.answers.reduce(
          (sum, a) => sum + (a.score || 0),
          0
        );
        state.finalScore =
          state.answers.length > 0
            ? Math.round(totalScore / state.answers.length)
            : 0;
      }
      state.summary = `You answered ${state.answers.length} questions.`;
    },
    resetInterview: (state) => {
      state.questions = [];
      state.currentQuestionIndex = 0;
      state.answers = [];
      state.completed = false;
      state.finalScore = 0;
      state.summary = "";
      state.resumeText = "";
      state.sessionId = null;
      state.sessionStartTime = null;
      state.lastActivityTime = null;
      state.paused = false;
      state.pausedTimeLeft = null;
      state.resumingFromSession = false;
    },
    pauseInterview: (state) => {
      state.paused = true;
      state.lastActivityTime = Date.now();
    },
    resumeInterview: (state) => {
      state.paused = false;
      state.lastActivityTime = Date.now();
    },
    resumeFromSession: (state) => {
      state.paused = false;
      state.lastActivityTime = Date.now();
      state.resumingFromSession = true;
      // This action is specifically for resuming from session restoration
    },
    nextQuestion: (state) => {
      if (state.currentQuestionIndex + 1 < state.questions.length) {
        state.currentQuestionIndex += 1;
      } else {
        state.completed = true;
      }
    },
    setPausedTimeLeft: (state, action) => {
      state.pausedTimeLeft = action.payload;
    },
    setTimeLeft: (state, action) => {
      state.timeLeft = action.payload;
    },
    // Define setProgress action
    setProgress: (state, action) => {
      const {
        currentQuestionIndex,
        answers,
        completed,
        finalScore,
        paused,
        timeLeft,
        summary,
      } = action.payload;
      state.currentQuestionIndex = currentQuestionIndex;
      state.answers = answers;
      state.completed = completed;
      state.finalScore = finalScore;
      state.paused = paused;
      state.timeLeft = timeLeft;
      state.summary = summary;
      state.lastActivityTime = Date.now();
    },
    // Check for unfinished session
    checkUnfinishedSession: (state) => {
      // This action doesn't modify state, it's used for checking
      // The logic will be handled in the component
    },
    // Restore session from persisted data
    restoreSession: (state, action) => {
      const sessionData = action.payload;
      if (sessionData) {
        state.questions = sessionData.questions || [];
        state.currentQuestionIndex = sessionData.currentQuestionIndex || 0;
        state.answers = sessionData.answers || [];
        state.completed = sessionData.completed || false;
        state.finalScore = sessionData.finalScore || 0;
        state.summary = sessionData.summary || "";
        state.resumeText = sessionData.resumeText || "";
        state.sessionId = sessionData.sessionId || null;
        state.sessionStartTime = sessionData.sessionStartTime || null;
        state.lastActivityTime = sessionData.lastActivityTime || null;
        state.paused = sessionData.paused || false;
        state.pausedTimeLeft = sessionData.pausedTimeLeft || null;
        state.resumingFromSession = false;
      }
    },
    // Clear resuming flag
    clearResumingFlag: (state) => {
      state.resumingFromSession = false;
    },
  },
});

export const {
  setQuestions,
  setAiSummary,
  setResumeText,
  submitAnswer,
  completeInterview,
  resetInterview,
  nextQuestion,
  pauseInterview,
  resumeInterview,
  resumeFromSession,
  setPausedTimeLeft,
  setTimeLeft,
  setProgress,
  checkUnfinishedSession,
  restoreSession,
  clearResumingFlag,
} = interviewSlice.actions;

export default interviewSlice.reducer;
