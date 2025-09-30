import { createSlice } from "@reduxjs/toolkit";

const sessionsSlice = createSlice({
    name: "sessions",
    initialState: {
        timers: {}, // candidateId → { questionIndex, startTimestamp }
    },
    reducers: {
        startQuestion: (state, action) => {
            const { candidateId, questionIndex, startTimestamp } = action.payload;
            state.timers[candidateId] = { questionIndex, startTimestamp };
        },
        clearSession: (state, action) => {
            delete state.timers[action.payload];
        },
    },
});

export const { startQuestion, clearSession } = sessionsSlice.actions;
export default sessionsSlice.reducer;
