import React, { useState, useEffect } from "react";
import ResumeUpload from "../components/ResumeUpload";
import InterviewChat from "../components/InterviewChat";
import WelcomeBackModal from "../components/WelcomeBackModal";
import { useSelector, useDispatch } from "react-redux";
import {
  resetInterview,
  pauseInterview,
  resumeInterview,
  resumeFromSession,
  checkUnfinishedSession,
} from "../features/interviewSlice";
import { setSelectedCandidate } from "../features/uiSlice";

export default function Interviewee() {
  const dispatch = useDispatch();
  const {
    questions,
    completed,
    resumeText,
    paused,
    currentQuestionIndex,
    answers,
    sessionId,
    sessionStartTime,
    lastActivityTime,
  } = useSelector((state) => state.interview);

  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const candidates = useSelector((state) => state.candidates);
  const selectedCandidateId = useSelector((state) => state.ui.selectedCandidateId);

  // Check for unfinished session on component mount
  useEffect(() => {
    if (!hasCheckedSession) {
      checkForUnfinishedSession();
      setHasCheckedSession(true);
    }
  }, [hasCheckedSession]);

  const checkForUnfinishedSession = () => {
    // Check if there's an unfinished session
    const hasUnfinishedSession =
      questions.length > 0 &&
      !completed &&
      resumeText &&
      sessionId &&
      currentQuestionIndex < questions.length;

    if (hasUnfinishedSession) {
      // Check if session is not too old (e.g., within 24 hours)
      const isRecentSession =
        lastActivityTime && Date.now() - lastActivityTime < 24 * 60 * 60 * 1000; // 24 hours

      if (isRecentSession) {
        setShowWelcomeBack(true);
      } else {
        // Session is too old, reset it
        dispatch(resetInterview());
      }
    }
  };

  const handleContinueInterview = () => {
    dispatch(resumeFromSession()); // Resume the interview from session restoration
    
    // If no selected candidate ID, try to find the most recent candidate
    if (!selectedCandidateId) {
      const allCandidates = candidates.allIds.map(id => candidates.byId[id]);
      const mostRecentCandidate = allCandidates
        .filter(c => c.status === "not-started" || c.status === "in-progress")
        .sort((a, b) => b.id.localeCompare(a.id))[0];
      
      if (mostRecentCandidate) {
        dispatch(setSelectedCandidate(mostRecentCandidate.id));
        console.log("Restored selected candidate:", mostRecentCandidate.id);
      }
    }
    
    setShowWelcomeBack(false);
    // The InterviewChat component will detect the resume and handle timer restoration
  };

  const handleStartNew = () => {
    dispatch(resetInterview());
    setShowWelcomeBack(false);
  };

  // Prepare candidate data for the modal
  const candidateData = {
    resumeText,
    questions,
    currentQuestionIndex,
    answers,
    sessionId,
    sessionStartTime,
    lastActivityTime,
    paused,
    completed,
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Interviewee Tab</h2>

      <WelcomeBackModal
        isVisible={showWelcomeBack}
        onClose={handleStartNew}
        onContinue={handleContinueInterview}
        candidateData={candidateData}
      />

      {questions.length === 0 ? <ResumeUpload /> : <InterviewChat />}
    </div>
  );
}
