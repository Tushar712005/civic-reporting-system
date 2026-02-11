import React, { useEffect, useState } from "react";
import db from "./db"; // ✅ added

function NearbyIssues() {
    const [issues, setIssues] = useState([]);

    useEffect(() => {
        const fetchNearbyIssues = async () => {
            try {
                if (navigator.onLine) {
                    // ✅ Online → fetch from API
                    const res = await fetch("http://localhost:5000/api/issues/nearby?lat=28.61&lng=77.23");
                    if (!res.ok) throw new Error("Failed to fetch nearby issues");
                    const data = await res.json();
                    setIssues(data);

                    // Save to IndexedDB for offline use
                    await db.cachedIssues.clear();
                    await db.cachedIssues.bulkAdd(data);
                } else {
                    // ✅ Offline → load from IndexedDB
                    const cached = await db.cachedIssues.toArray();
                    setIssues(cached);
                    console.log("Loaded nearby issues from local cache.");
                }
            } catch (err) {
                console.error(err);
                setIssues([]);
            }
        };
        fetchNearbyIssues();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case "New":
                return "bg-blue-100 text-blue-800";
            case "In Progress":
                return "bg-yellow-100 text-yellow-800";
            case "Completed":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
            <div className="w-full max-w-4xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                    Nearby Issues
                </h2>

                {!navigator.onLine && (
                    <p className="text-red-500 text-center text-sm mb-2">
                        Offline Mode: showing cached issues
                    </p>
                )}

                {issues.length === 0 && (
                    <p className="text-gray-500 text-center">No nearby issues found.</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {issues.map((issue) => (
                        <div
                            key={issue.id}
                            className="bg-white rounded-xl shadow p-4 hover:shadow-md transition flex flex-col"
                        >
                            <h3 className="text-lg font-semibold text-gray-800">{issue.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">Category: {issue.category}</p>
                            <p className="text-gray-600 text-sm mt-1">Distance: {issue.distance}</p>
                            <span
                                className={`mt-2 inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                                    issue.status
                                )}`}
                            >
                                {issue.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default NearbyIssues;
