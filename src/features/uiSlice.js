import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
    name: "ui",
    initialState: {
        activeTab: "interviewee",
        selectedCandidateId: null,
    },
    reducers: {
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        setSelectedCandidate: (state, action) => {
            state.selectedCandidateId = action.payload;
        },
    },
});

export const { setActiveTab, setSelectedCandidate } = uiSlice.actions;
export default uiSlice.reducer;
