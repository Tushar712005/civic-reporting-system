import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- Leaflet Icon Setup ---
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;


// --- SVG Icons for Stat Cards ---
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const InProgressIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ResolvedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TotalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;


// --- Reusable Map Component ---
const MapComponent = ({ issues }) => {
  const validIssues = issues.filter(issue => issue.latitude && issue.longitude);
  const center = validIssues.length > 0 
    ? [validIssues[0].latitude, validIssues[0].longitude] 
    : [20.5937, 78.9629]; // Default to center of India if no issues

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom={false} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validIssues.map(issue => (
        <Marker key={issue.id} position={[issue.latitude, issue.longitude]}>
          <Popup>{issue.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};


function DashboardPage({ onLogout }) {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ new: 0, inProgress: 0, resolved: 0, total: 0 });

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const token = localStorage.getItem('admin-token');
        if (!token) {
          onLogout();
          return;
        }

        const response = await fetch('http://localhost:5000/api/issues', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          onLogout();
          return;
        }
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        setIssues(sortedData);
      } catch (error) {
        console.error("Failed to fetch issues:", error);
      }
    };
    fetchIssues();
  }, [onLogout]);

  useEffect(() => {
    const newCount = issues.filter(issue => issue.status === 'New').length;
    const inProgressCount = issues.filter(issue => issue.status === 'In Progress').length;
    const resolvedCount = issues.filter(issue => issue.status === 'Resolved').length;
    setStats({ new: newCount, inProgress: inProgressCount, resolved: resolvedCount, total: issues.length });
  }, [issues]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`http://localhost:5000/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const updatedIssue = await response.json();

      setIssues(prevIssues => 
        prevIssues.map(issue => 
          issue.id === updatedIssue.id ? updatedIssue : issue
        )
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="flex">
        <aside className="w-64 bg-white shadow-md min-h-screen flex flex-col">
          <div className="p-6 text-2xl font-bold text-center border-b">CivicAlert</div>
          <nav className="flex-1 p-4 space-y-2">
            <button type="button" className="w-full flex items-center p-2 text-left text-gray-700 bg-gray-200 rounded-lg"><span className="mr-3">📊</span> Dashboard</button>
            <button type="button" className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"><span className="mr-3">📋</span> All Reports</button>
            <button type="button" className="w-full flex items-center p-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"><span className="mr-3">⚙️</span> Settings</button>
          </nav>
        </aside>
        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Welcome, Admin!</span>
              <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                Log Out
              </button>
            </div>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="New Reports" value={stats.new} icon={<ReportIcon />} />
            <StatCard title="In Progress" value={stats.inProgress} icon={<InProgressIcon />} />
            <StatCard title="Resolved" value={stats.resolved} icon={<ResolvedIcon />} />
            <StatCard title="Total Reports" value={stats.total} icon={<TotalIcon />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Live Issue Map</h2>
              <div className="h-96 bg-gray-200 rounded-lg">
                <MapComponent issues={issues} />
              </div>
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
                            <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center"><svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{issue.title}</h3>
                          <p className={`text-sm font-bold ${issue.status === 'New' ? 'text-blue-500' : issue.status === 'In Progress' ? 'text-yellow-500' : 'text-green-500'}`}>{issue.status}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        {issue.status === 'New' && (
                          <button onClick={() => handleStatusChange(issue.id, 'In Progress')} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200">Mark In Progress</button>
                        )}
                        {issue.status === 'In Progress' && (
                          <button onClick={() => handleStatusChange(issue.id, 'Resolved')} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">Mark Resolved</button>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No reports found. Submit one from the PWA!</p>
                )}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export default DashboardPage;

