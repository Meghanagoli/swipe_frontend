import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { resetInterview, setResumeText } from "../features/interviewSlice";
import { addCandidate } from "../features/candidatesSlice";
import { setSelectedCandidate } from "../features/uiSlice";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth/mammoth.browser";

// Safe PDF worker for Vite
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function ResumeUpload() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [missingFields, setMissingFields] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [candidateData, setCandidateData] = useState({});

  // Extract name, email, phone
  const extractFields = (text) => {
    const cleanText = text.replace(/\r\n|\n/g, "\n").replace(/\s+/g, " ");
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{6,10}/;

    const email = cleanText.match(emailRegex)?.[0] || "";
    const phone = cleanText.match(phoneRegex)?.[0] || "";

    // Return name (default is the first line)
    let name = cleanText.split("\n")[0]?.trim();

    return { name, email, phone };
  };

  // Extract name from PDF using font size detection
  const extractNameFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let largestFontSize = 0;
    let name = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Loop through the text items and find the largest font size
      content.items.forEach((item) => {
        const fontSize = item.transform[0]; // Extract font size
        if (fontSize > largestFontSize) {
          largestFontSize = fontSize;
          name = item.str; // Capture the text with the largest font size
        }
      });
    }

    return name.trim(); // Return the name from the largest font size
  };

  // Parse DOCX file and extract the first non-empty line
  const extractNameFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const lines = result.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines[0] || ""; // Return the first non-empty line as name
  };

  // Parse PDF
  const parsePDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  };

  // Parse DOCX
  const parseDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFile = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) {
      console.warn("No file selected");
      return;
    }

    try {
      let text = "";
      let name = "";
      let email = "";
      let phone = "";

      if (file.type === "application/pdf") {
        name = await extractNameFromPDF(file); // Extract name from PDF based on font size
        text = await parsePDF(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        text = await parseDOCX(file);
        name = await extractNameFromDOCX(file); // Extract name from DOCX
      } else {
        alert("Only PDF or DOCX files are allowed");
        return;
      }

      const fields = extractFields(text); // Extract email and phone from the text content
      email = fields.email;
      phone = fields.phone;

      setCandidateData({ name, email, phone });

      // If any required field is missing, show the modal to allow manual input
      if (!name || !email || !phone) {
        setMissingFields({ name, email, phone });
        setModalVisible(true);
      } else {
        const newCandidate = dispatch(
          addCandidate({ name, email, phone, status: "not-started" })
        );
        dispatch(setSelectedCandidate(newCandidate.payload.id));
        dispatch(resetInterview());
        dispatch(setResumeText(text));
        alert("Candidate added successfully!");
        navigate("/interview");
      }
    } catch (err) {
      console.error("File parse error:", err);
      alert("Failed to parse the file: " + err.message);
    }
  };
  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation (digits only, length 6-15)
  const isValidPhone = (phone) => {
    const phoneRegex = /^\d{6,15}$/;
    return phoneRegex.test(phone);
  };

  const handleModalSubmit = () => {
    const finalData = {
      name: missingFields?.name?.trim(),
      email: missingFields?.email?.trim(),
      phone: missingFields?.phone?.trim(),
    };

    if (!finalData.name || !finalData.email || !finalData.phone) {
      alert("Please fill all fields before submitting");
      return;
    }

    if (!isValidEmail(finalData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (!isValidPhone(finalData.phone)) {
      alert("Please enter a valid phone number (digits only)");
      return;
    }

    // Add candidate
    const newCandidate = dispatch(
      addCandidate({ ...finalData, status: "not-started" })
    );
    dispatch(setSelectedCandidate(newCandidate.payload.id));
    dispatch(resetInterview());
    dispatch(setResumeText(candidateData.text || "")); // ensure text is set
    setModalVisible(false);
    alert("Candidate added successfully!");
    navigate("/interview");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <span className="text-3xl">📄</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Upload Your Resume
        </h2>
        <p className="text-gray-600">
          Get started with your AI-powered interview by uploading your resume
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-indigo-300 p-8 text-center hover:border-indigo-400 transition-colors duration-200">
        <div className="mb-4">
          <span className="text-4xl">📁</span>
        </div>
        <label className="block text-lg font-medium text-gray-700 mb-4">
          Choose Resume File (PDF or DOCX)
        </label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFile}
          className="block w-full text-gray-700 border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-indigo-400 transition-colors duration-200"
        />
        <p className="text-sm text-gray-500 mt-2">
          Supported formats: PDF, DOCX (Max size: 10MB)
        </p>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <span className="text-3xl mb-2 block">✏️</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Complete Your Profile
              </h2>
              <p className="text-gray-600">
                Please fill in the missing information
              </p>
            </div>

            <div className="space-y-4">
              {["name", "email", "phone"].map(
                (field) =>
                  missingFields[field] !== undefined && (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input
                        type={
                          field === "email"
                            ? "email"
                            : field === "phone"
                              ? "tel"
                              : "text"
                        }
                        placeholder={`Enter your ${field}`}
                        value={missingFields[field] || ""}
                        onChange={(e) =>
                          setMissingFields({
                            ...missingFields,
                            [field]: e.target.value,
                          })
                        }
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                      />
                    </div>
                  )
              )}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setModalVisible(false)}
                className="px-6 py-3 rounded-lg bg-gray-300 text-gray-700 font-medium hover:bg-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors duration-200 shadow-lg"
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
