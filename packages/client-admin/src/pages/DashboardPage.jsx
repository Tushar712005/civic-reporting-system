import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Marker image URLs (matching legend)
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

const MapComponent = ({ issues }) => {
  const validIssues = issues.filter((i) => i.latitude && i.longitude);
  const center = validIssues.length > 0 ? [validIssues[0].latitude, validIssues[0].longitude] : [20.5937, 78.9629];

  return (
    <div className="relative">
      <MapContainer center={center} zoom={5} scrollWheelZoom={false} style={{ height: "24rem", width: "100%", borderRadius: "0.5rem" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {validIssues.map((issue) => {
          const p = (issue.priority || "medium").toString().toLowerCase();
          const icon = priorityIcons[p] || priorityIcons.medium;
          return (
            <Marker key={issue.id} position={[issue.latitude, issue.longitude]} icon={icon}>
              <Popup>
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

      {/* Legend fixed on top of map, high z-index, pointer-events-none so it doesn't block interaction */}
      <div className="absolute bottom-4 left-4 bg-white/95 p-3 rounded-lg shadow-lg text-sm z-[10000] pointer-events-none">
        <p className="font-semibold mb-2">Legend</p>
        <div className="flex items-center space-x-2 mb-1">
          <img src={MARKER_URLS.high} alt="High" className="w-4 h-4" />
          <span>High Priority</span>
        </div>
        <div className="flex items-center space-x-2 mb-1">
          <img src={MARKER_URLS.medium} alt="Medium" className="w-4 h-4" />
          <span>Medium Priority</span>
        </div>
        <div className="flex items-center space-x-2">
          <img src={MARKER_URLS.low} alt="Low" className="w-4 h-4" />
          <span>Low Priority</span>
        </div>
      </div>
    </div>
  );
};

function DashboardPage({ onLogout }) {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ new: 0, inProgress: 0, resolved: 0, total: 0, avgResolution: 0 });
  const [sortBy, setSortBy] = useState("date");
  const navigate = useNavigate();
  const department = localStorage.getItem("department");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("admin-token");
        if (!token) return onLogout();

        const res = await fetch("http://localhost:5000/api/issues", { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401 || res.status === 403) return onLogout();
        const data = await res.json();

        let sorted = data;
        if (sortBy === "date") sorted = data.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        else if (sortBy === "priority") {
          const order = { high: 1, medium: 2, low: 3 };
          sorted = data.sort((a, b) => (order[(a.priority || "medium").toLowerCase()] || 4) - (order[(b.priority || "medium").toLowerCase()] || 4));
        }

        setIssues(sorted);

        // fetch analytics for super admin
        if (department === "ALL") {
          const analyticsRes = await fetch("http://localhost:5000/api/analytics/reports", { headers: { Authorization: `Bearer ${token}` } });
          if (analyticsRes.ok) {
            const analytics = await analyticsRes.json();
            setStats((s) => ({ ...s, avgResolution: analytics.avg_resolution_hours ? parseFloat(analytics.avg_resolution_hours) : 0 }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch issues:", err);
      }
    };
    fetchAll();
  }, [onLogout, sortBy, department]);

  useEffect(() => {
    setStats((s) => ({
      ...s,
      new: issues.filter((i) => i.status === "New").length,
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      resolved: issues.filter((i) => i.status === "Resolved").length,
      total: issues.length,
    }));
  }, [issues]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("admin-token");
      const res = await fetch(`http://localhost:5000/api/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setIssues((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    } catch (err) {
      console.error("Error updating:", err);
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("admin-token");
      const res = await fetch("http://localhost:5000/api/analytics/reports/download", { headers: { Authorization: `Bearer ${token}` } });
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
        <aside className="w-64 bg-white shadow-md min-h-screen flex flex-col">
          <div className="p-6 text-2xl font-bold text-center border-b">CivicAlert</div>
          <nav className="flex-1 p-4 space-y-2">
            <button className="w-full flex items-center p-2 text-left text-gray-700 bg-gray-200 rounded-lg">
              <span className="mr-3">📊</span> Dashboard
            </button>
            <button className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">📋</span> All Reports
            </button>
            {department === "ALL" && (
              <button onClick={() => navigate("/register-admin")} className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg">
                <span className="mr-3">➕</span> Register Admin
              </button>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by AI Priority</option>
              </select>

              {department === "ALL" && (
                <button onClick={handleDownload} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                  ⬇️ Download Reports
                </button>
              )}

              <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                Log Out
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="New Reports" value={stats.new} />
            <StatCard title="In Progress" value={stats.inProgress} />
            <StatCard title="Resolved" value={stats.resolved} />
            <StatCard title="Total Reports" value={stats.total} />
            {department === "ALL" && <StatCard title="Avg Resolution (hrs)" value={Number(stats.avgResolution || 0).toFixed(1)} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Live Issue Map</h2>
              <MapComponent issues={issues} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
              <ul className="space-y-4">
                {issues.length > 0 ? (
                  issues.slice(0, 5).map((issue) => (
                    <li key={issue.id} className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {issue.image_url ? (
                            <img src={issue.image_url} alt={issue.title} className="h-16 w-16 rounded-lg object-cover" />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">📷</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{issue.title}</h3>
                          <p className={`text-sm font-bold ${issue.status === "New" ? "text-blue-500" : issue.status === "In Progress" ? "text-yellow-500" : "text-green-500"}`}>{issue.status}</p>
                          <p className="text-xs text-gray-600">AI Priority: <span className={`font-bold ${(issue.priority || "").toString().toLowerCase() === "high" ? "text-red-500" : (issue.priority || "").toString().toLowerCase() === "medium" ? "text-yellow-500" : "text-green-500"}`}>{issue.priority || "Medium"}</span></p>
                          <p className="text-xs text-gray-600">Mobile: <span className="font-semibold">{issue.mobile || "N/A"}</span></p>
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        {issue.status === "New" && <button onClick={() => handleStatusChange(issue.id, "In Progress")} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200">Mark In Progress</button>}
                        {issue.status === "In Progress" && <button onClick={() => handleStatusChange(issue.id, "Resolved")} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">Mark Resolved</button>}
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No reports found.</p>
                )}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export default DashboardPage;
