// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterAdmin from "./pages/RegisterAdmin";
import DepartmentalAnalysisPage from "./pages/DepartmentalAnalysisPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin-token");
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem("admin-token", token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin-token");
    localStorage.removeItem("department");
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/" />
          }
        />
        <Route
          path="/register-admin"
          element={
            isAuthenticated ? <RegisterAdmin /> : <Navigate to="/" />
          }
        />
        {/* Departmental Analysis */}
        <Route
          path="/departmental-analysis/:deptName"
          element={
            isAuthenticated ? <DepartmentalAnalysisPage /> : <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
