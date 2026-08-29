import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Corrected file import paths to match actual file names and extensions
import Register from "./components/Register.js";
import Login from "./components/login.js";
import Worker from "./components/worker.js";
import ProtectedRoute from "./components/protectRoute.js";

import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />

        {/* Protected Routes */}
        <Route
          path='/worker'
          element={
            <ProtectedRoute>
              <Worker />
            </ProtectedRoute>
          }
        />

        {/* Fallback Redirects */}
        <Route path='/' element={<Navigate to='/login' replace />} />
        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    </Router>
  );
}

export default App;
