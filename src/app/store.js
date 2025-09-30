import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import localforage from "localforage"; // IndexedDB (better for files)
import { combineReducers } from "redux";
import { thunk } from "redux-thunk";

// import slices (to be created later)
import candidatesReducer from "../features/candidatesSlice";
import uiReducer from "../features/uiSlice";
import sessionsReducer from "../features/sessionsSlice";
import interviewReducer from "../features/interviewSlice"; // path may vary

const rootReducer = combineReducers({
  candidates: candidatesReducer,
  ui: uiReducer,
  sessions: sessionsReducer,
  interview: interviewReducer,
});

// Persist config
const persistConfig = {
  key: "root",
  storage: localforage, // IndexedDB for better storage capacity
  blacklist: [], // add slices you don't want persisted
  whitelist: ["interview", "candidates", "ui"], // Persist interview, candidates, and UI state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
        ],
      },
    }),
});

export const persistor = persistStore(store);
