import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Interviewee from "./pages/Interviewee";
import Interviewer from "./pages/Interviewer";
import InterviewChat from "./components/InterviewChat";

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-lg border-b-4 border-indigo-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-center text-indigo-800">
            🤖 AI-Powered Interview Assistant
          </h1>
          <p className="text-center text-indigo-600 mt-2">
            Smart interviews, better decisions
          </p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="bg-white shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-8">
            <Link
              to="/interviewee"
              className={`px-8 py-4 text-lg font-semibold border-b-4 transition-all duration-300 ${
                location.pathname === "/interviewee" ||
                location.pathname === "/"
                  ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                  : "border-transparent text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
              }`}
            >
              👤 Interviewee
            </Link>
            <Link
              to="/interviewer"
              className={`px-8 py-4 text-lg font-semibold border-b-4 transition-all duration-300 ${
                location.pathname === "/interviewer"
                  ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                  : "border-transparent text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
              }`}
            >
              📊 Interviewer Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-full">
          <Routes>
            <Route path="/" element={<Interviewee />} />
            <Route path="/interviewee" element={<Interviewee />} />
            <Route path="/interviewer" element={<Interviewer />} />
            <Route path="/interview" element={<InterviewChat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
