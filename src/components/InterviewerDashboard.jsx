import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

export default function InterviewerDashboard() {
  const candidates = useSelector((state) => state.candidates);
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [dbCandidates, setDbCandidates] = useState([]); // State to hold candidates fetched from DB

  // Fetch candidates from the backend
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/candidates");
        if (response.ok) {
          const candidatesFromDb = await response.json();
          // Transform MongoDB _id to id for consistency
          const transformedCandidates = candidatesFromDb.map((candidate) => ({
            ...candidate,
            id: candidate._id || candidate.id,
          }));
          setDbCandidates(transformedCandidates);
        } else {
          console.error("Failed to fetch candidates");
        }
      } catch (error) {
        console.error("Error fetching candidates:", error);
      }
    };

    fetchCandidates();
  }, []); // Run only once when the component mounts
  const saveCandidateToDB = async (candidate) => {
    try {
      const response = await fetch("http://localhost:5000/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          status: candidate.status,
          score: candidate.score,
          answers: candidate.answers,
          summary: candidate.summary,
        }),
      });
      if (response.ok) {
        const savedCandidate = await response.json();
        console.log("Candidate saved successfully:", savedCandidate);
      } else {
        console.error("Failed to save candidate");
      }
    } catch (error) {
      console.error("Error saving candidate:", error);
    }
  };

  // Derive the list of filtered candidates from both Redux and DB
  const filteredCandidates = [
    ...candidates.allIds
      .map((id) => candidates.byId[id])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      ),
    ...dbCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    ),
  ]
    // First, filter out duplicates based on email
    .filter((value, index, self) => {
      return index === self.findIndex((t) => t.email === value.email); // Remove duplicates based on email
    })
    // Then, sort by score in descending order
    .sort((a, b) => b.score - a.score); // Sort by score in descending order

  // Find the selected candidate from both Redux and DB
  const selectedCandidate =
    (selectedCandidateId &&
      (candidates.byId[selectedCandidateId] ||
        dbCandidates.find((c) => c.id === selectedCandidateId))) ||
    null;
  useEffect(() => {
    if (selectedCandidate) {
      saveCandidateToDB(selectedCandidate); // Automatically save candidate when selected
    }
  }, [selectedCandidate]); // This will run whenever selectedCandidate changes

  useEffect(() => {
    // Debugging: Log the selected candidate and selectedCandidateId
    console.log("Selected Candidate ID:", selectedCandidateId);
    console.log("Selected Candidate:", selectedCandidate);
  }, [selectedCandidateId, selectedCandidate]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          📊 Interviewer Dashboard
        </h2>
        <p className="text-gray-600">
          Monitor and evaluate candidate performance
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Candidate List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              👥 Candidates ({filteredCandidates.length})
            </h3>
            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {filteredCandidates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCandidateId(c.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedCandidateId === c.id
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{c.name}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${c.score >= 8
                        ? "bg-green-100 text-green-800"
                        : c.score >= 6
                          ? "bg-yellow-100 text-yellow-800"
                          : c.score > 0
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {c.score || "N/A"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{c.email}</p>
                  <p className="text-sm text-gray-600 mb-2">{c.phone}</p>
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : c.status === "in-progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {c.status || "not-started"}
                    </span>
                    {c.score && (
                      <div className="text-xs text-gray-500">
                        {c.answers?.length || 0} answers
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Candidate Detail */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            {selectedCandidate ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedCandidate.name}
                    </h3>
                    <p className="text-gray-600 mb-1">
                      {selectedCandidate.email}
                    </p>
                    <p className="text-gray-600">{selectedCandidate.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600 mb-1">
                      {selectedCandidate.score || "N/A"}
                    </div>
                    <div className="text-sm text-gray-500">Final Score</div>
                  </div>
                </div>

                {/* Score Visualization */}
                {selectedCandidate.score && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Performance
                      </span>
                      <span className="text-sm text-gray-500">
                        {selectedCandidate.score}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${selectedCandidate.score >= 8
                          ? "bg-green-500"
                          : selectedCandidate.score >= 6
                            ? "bg-yellow-500"
                            : "bg-red-500"
                          }`}
                        style={{
                          width: `${(selectedCandidate.score / 10) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Interview Answers */}
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">
                    📝 Interview Responses
                  </h4>
                  {selectedCandidate.answers &&
                    selectedCandidate.answers.length > 0 ? (
                    <div className="space-y-4">
                      {selectedCandidate.answers.map((answer, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-semibold text-gray-800">
                              Question {idx + 1}
                            </h5>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${answer.score >= 8
                                ? "bg-green-100 text-green-800"
                                : answer.score >= 6
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                                }`}
                            >
                              {answer.score}/10
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3 font-medium">
                            {answer.question}
                          </p>
                          <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                            <p className="text-gray-600">
                              <strong>Answer:</strong> {answer.answer}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            <strong>Feedback:</strong> {answer.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">📝</span>
                      <p>No interview responses available yet.</p>
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-lg font-bold text-purple-800 mb-2">
                    🤖 AI Evaluation Summary
                  </h4>
                  <p className="text-gray-700">
                    {selectedCandidate.summary ||
                      "No summary available yet. Complete the interview to see AI evaluation."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl mb-4 block">👥</span>
                <h3 className="text-xl font-semibold mb-2">
                  Select a Candidate
                </h3>
                <p>
                  Choose a candidate from the list to view their interview
                  details and performance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
