// DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Marker URLs
const ICON_BASE =
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-";
const ICON_SHADOW =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

function makeIcon(url) {
  return new L.Icon({
    iconUrl: url,
    shadowUrl: ICON_SHADOW,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const MARKER_URLS = {
  high: ICON_BASE + "red.png",
  medium: ICON_BASE + "orange.png",
  low: ICON_BASE + "green.png",
};

const priorityIcons = {
  high: makeIcon(MARKER_URLS.high),
  medium: makeIcon(MARKER_URLS.medium),
  low: makeIcon(MARKER_URLS.low),
};

// Status flow mapping
const statusFlow = {
  New: "In Progress",
  "In Progress": "Resolved",
  Resolved: null,
};

// Status colors for text
const statusColors = {
  New: "text-blue-500",
  "In Progress": "text-yellow-500",
  Resolved: "text-green-500",
};

// --- Map Component ---
const MapComponent = ({ issues }) => {
  const validIssues = issues.filter((i) => i.latitude && i.longitude);
  const center =
    validIssues.length > 0
      ? [validIssues[0].latitude, validIssues[0].longitude]
      : [20.5937, 78.9629];

  return (
    <div className="relative rounded-lg">
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={false}
        style={{
          height: "36rem",
          width: "100%",
          borderRadius: "0.5rem",
          zIndex: 0,
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validIssues.map((issue) => {
          const p = (issue.priority || "medium").toLowerCase();
          const icon = priorityIcons[p] || priorityIcons.medium;
          return (
            <Marker
              key={issue.id}
              position={[issue.latitude, issue.longitude]}
              icon={icon}
            >
              <Popup className="z-[1500]">
                <b>{issue.title}</b>
                <br />
                Status: {issue.status}
                <br />
                Priority: {issue.priority || "Medium"}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend Box Inside Map */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[2000]">
        <h4 className="font-semibold mb-2">Priority Legend</h4>
        <div className="flex items-center space-x-2 mb-1">
          <img src={MARKER_URLS.high} alt="High priority" className="w-5 h-8" />
          <span>High</span>
        </div>
        <div className="flex items-center space-x-2 mb-1">
          <img src={MARKER_URLS.medium} alt="Medium priority" className="w-5 h-8" />
          <span>Medium</span>
        </div>
        <div className="flex items-center space-x-2">
          <img src={MARKER_URLS.low} alt="Low priority" className="w-5 h-8" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
};

// --- Stat card component ---
const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

function DashboardPage({ onLogout }) {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    new: 0,
    inProgress: 0,
    resolved: 0,
    total: 0,
    avgResolution: 0,
  });
  const [sortBy, setSortBy] = useState("date");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");

  const navigate = useNavigate();
  const department = localStorage.getItem("department"); // "ALL" for superadmin

  // --- Fetch issues ---
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const token = localStorage.getItem("admin-token");
        if (!token) return onLogout();

        const res = await fetch("http://localhost:5000/api/issues", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) return onLogout();
        const data = await res.json();

        let sorted = data;
        if (sortBy === "date")
          sorted = data.sort(
            (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt)
          );
        else if (sortBy === "priority") {
          const order = { high: 1, medium: 2, low: 3 };
          sorted = data.sort(
            (a, b) =>
              (order[(a.priority || "medium").toLowerCase()] || 4) -
              (order[(b.priority || "medium").toLowerCase()] || 4)
          );
        }

        setIssues(sorted);
      } catch (err) {
        console.error("Failed to fetch issues:", err);
      }
    };
    fetchIssues();
  }, [onLogout, sortBy]);

  // --- Update stats ---
  useEffect(() => {
    setStats({
      new: issues.filter((i) => i.status === "New").length,
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      resolved: issues.filter((i) => i.status === "Resolved").length,
      total: issues.length,
      avgResolution: stats.avgResolution,
    });
  }, [issues, stats.avgResolution]);

  // --- Status change handler ---
  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("admin-token");
      const res = await fetch(`http://localhost:5000/api/issues/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setIssues((prev) =>
        prev.map((it) => (it.id === updated.id ? updated : it))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  // --- Download reports ---
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("admin-token");
      const res = await fetch(
        "http://localhost:5000/api/analytics/reports/download",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reports.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen flex flex-col">
          <div className="p-6 text-2xl font-bold text-center border-b">
            CivicAlert
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button className="w-full flex items-center p-2 text-left text-gray-700 bg-gray-200 rounded-lg">
              <span className="mr-3">📊</span> Dashboard
            </button>
            <button className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">📋</span> All Reports
            </button>

            {/* Superadmin only */}
            {department === "ALL" && (
              <>
                <button
                  onClick={() => navigate("/register-admin")}
                  className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <span className="mr-3">➕</span> Register Admin
                </button>

                <div className="mt-6 p-4 bg-white rounded-xl shadow-lg">
                  <h2 className="text-xl font-bold mb-4">Department Analysis</h2>
                  <select
                    className="w-full border rounded-lg px-4 py-2 mb-4"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    <option value="Public Works Department">Public Works Department</option>
                    <option value="Electricity Department">Electricity Department</option>
                    <option value="Sanitation Department">Sanitation Department</option>
                    <option value="Water Supply Department">Water Supply Department</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                  <button
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    onClick={() => {
                      if (!selectedDept)
                        return alert("Select a department first");
                      navigate(`/departmental-analysis/${selectedDept}`);
                    }}
                  >
                    View Analysis
                  </button>
                </div>
              </>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {/* Header */}
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by AI Priority</option>
              </select>

              {department === "ALL" && (
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  ⬇️ Download Reports
                </button>
              )}

              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="New Reports" value={stats.new} />
            <StatCard title="In Progress" value={stats.inProgress} />
            <StatCard title="Resolved" value={stats.resolved} />
            <StatCard title="Total Reports" value={stats.total} />
            {department === "ALL" && (
              <StatCard
                title="Avg Resolution (hrs)"
                value={Number(stats.avgResolution || 0).toFixed(1)}
              />
            )}
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Map */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Live Issue Map</h2>
              <MapComponent issues={issues} />
            </div>

            {/* Recent Reports */}
            <div className="bg-white p-6 rounded-xl shadow-lg max-h-[42rem] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
              <ul className="space-y-4">
                {issues.length > 0 ? (
                  issues.slice(0, 5).map((issue) => (
                    <li
                      key={issue.id}
                      className="relative border rounded-lg px-6 py-10 flex space-x-4 cursor-pointer"
                      onClick={() => setSelectedIssue(issue)}
                    >
                      {issue.image_url ? (
                        <img
                          src={issue.image_url}
                          alt={issue.title}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">📷</span>
                        </div>
                      )}

                      {/* Badges */}
                      {issue.status === "New" && (
                        <span className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          NEW
                        </span>
                      )}
                      {issue.priority && (
                        <span
                          className={`absolute top-3 right-3 text-xs px-2 py-1 rounded text-white ${
                            issue.priority.toLowerCase() === "high"
                              ? "bg-red-500"
                              : issue.priority.toLowerCase() === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        >
                          {issue.priority.toUpperCase()}
                        </span>
                      )}

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {issue.title}
                        </h3>
                        <p className={`text-sm font-bold ${statusColors[issue.status]}`}>
                          Status: {issue.status}
                        </p>
                        <p className="text-xs text-gray-600">
                          Mobile: <span className="font-semibold">{issue.mobile || "N/A"}</span>
                        </p>
                      </div>

                      {/* Status Button */}
                      {statusFlow[issue.status] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(issue.id, statusFlow[issue.status]);
                          }}
                          className="absolute bottom-3 right-3 text-xs bg-blue-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          Mark as {statusFlow[issue.status]}
                        </button>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No reports found.</p>
                )}
              </ul>
            </div>
          </div>

          {/* Modal for selected issue */}
          {selectedIssue && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl max-w-lg w-full relative">
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✖
                </button>
                {selectedIssue.image_url && (
                  <img
                    src={selectedIssue.image_url}
                    alt={selectedIssue.title}
                    className="w-full rounded-lg mb-4"
                  />
                )}
                <h3 className="text-xl font-bold mb-2">{selectedIssue.title}</h3>
                <p>Status: {selectedIssue.status}</p>
                <p>Priority: {selectedIssue.priority || "Medium"}</p>
                <p>Mobile: {selectedIssue.mobile || "N/A"}</p>
                <p>Description: {selectedIssue.description || "No description"}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
