import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardMenu from "./pages/DashboardMenu";
import ReportIssuePage from "./pages/ReportIssuePage";
import TrackReportsPage from "./pages/TrackReportsPage";
import NearbyIssuesPage from "./pages/NearbyIssuesPage";
import DepartmentAnalysisPage from "./pages/DepartmentAnalysisPage";
import FeedbackPage from "./pages/FeedbackPage";

function App() {
  const [online, setOnline] = useState(navigator.onLine);

  // Watch online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Router>
      {/* ✅ Offline Banner */}
      {!online && (
        <div className="bg-red-600 text-white text-center text-sm py-2">
          You are offline — data will be saved locally and synced later.
        </div>
      )}

      <Routes>
        <Route path="/" element={<DashboardMenu />} />
        <Route path="/report" element={<ReportIssuePage />} />
        <Route path="/track" element={<TrackReportsPage />} />
        <Route path="/nearby" element={<NearbyIssuesPage />} />
        <Route path="/department" element={<DepartmentAnalysisPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
      </Routes>
    </Router>
  );
}

export default App;
