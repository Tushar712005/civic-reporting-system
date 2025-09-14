import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if token exists in localStorage on load
    const token = localStorage.getItem("admin-token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem("admin-token", token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin-token");
    setIsAuthenticated(false);
  };

  return (
    <div>
      {isAuthenticated ? (
        <DashboardPage onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
