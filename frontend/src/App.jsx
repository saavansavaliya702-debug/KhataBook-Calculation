import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Corrected file import paths to match actual file names and extensions
import Register from "./components/RegisterPage.jsx";
import Login from "./components/LoginPage.jsx";
import Worker from "./components/WorkerPage.jsx";
import RecordDetail from "./components/RecordDetailPage.jsx";
import ProtectedRoute from "./components/ProtectRoute.jsx";

import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/worker"
          element={
            <ProtectedRoute>
              <Worker />
            </ProtectedRoute>
          }
        />

        {/* Grouped detail page — literal path must come BEFORE /worker/:id */}
        <Route
          path="/worker/group"
          element={
            <ProtectedRoute>
              <RecordDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/worker/:id"
          element={
            <ProtectedRoute>
              <RecordDetail />
            </ProtectedRoute>
          }
        />

        {/* Fallback Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;