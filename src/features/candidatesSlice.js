import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const candidatesSlice = createSlice({
  name: "candidates",
  initialState: {
    byId: {},
    allIds: [],
  },
  reducers: {
    addCandidate: (state, action) => {
      const {
        name,
        email,
        phone,
        status,
        score = 0,
        summary = "",
        chatHistory = [],
        answers = [],
      } = action.payload;
      const id = uuidv4();
      state.byId[id] = {
        id,
        name,
        email,
        phone,
        status: status || "not-started",
        score,
        summary,
        chatHistory,
        answers,
      };
      state.allIds.push(id);
      localStorage.setItem("candidates", JSON.stringify(state));
    },
    updateCandidate: (state, action) => {
      const { id, updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
      localStorage.setItem("candidates", JSON.stringify(state));
    },
    setCandidates: (state, action) => {
      const candidates = action.payload;
      state.allIds = candidates.map((candidate) => candidate.id); // assuming each candidate has an 'id'
      state.byId = candidates.reduce((acc, candidate) => {
        acc[candidate.id] = candidate;
        return acc;
      }, {});
    },
    removeCandidate: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter((cid) => cid !== id);
      localStorage.setItem("candidates", JSON.stringify(state));
    },
  },
});

export const { addCandidate, updateCandidate, removeCandidate, setCandidates } = candidatesSlice.actions;
export default candidatesSlice.reducer;
