import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import db from "./db"; // ✅ added

const COLORS = ["#FF4C4C", "#FFB74D", "#4CAF50", "#4DB6AC", "#9575CD"];

const DepartmentAnalysis = () => {
    const [departmentData, setDepartmentData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    useEffect(() => {
        const fetchDepartmentData = async () => {
            try {
                if (navigator.onLine) {
                    const res = await fetch("http://localhost:5000/api/analysis/departments");
                    if (!res.ok) throw new Error("Failed to fetch department data");
                    const data = await res.json();
                    setDepartmentData(data.departments || []);
                    setStatusData(data.statusSummary || []);

                    // Save to IndexedDB
                    await db.cachedAnalytics.clear();
                    await db.cachedAnalytics.bulkAdd(data.departments || []);
                } else {
                    // Offline → load from cache
                    const cached = await db.cachedAnalytics.toArray();
                    setDepartmentData(cached);
                    // We don’t have status cached separately yet, so leave it blank or derive from cached
                    setStatusData([]);
                    console.log("Loaded department analysis from local cache.");
                }
            } catch (err) {
                console.error(err);
                setDepartmentData([]);
                setStatusData([]);
            }
        };
        fetchDepartmentData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                Department Analysis
            </h1>

            {!navigator.onLine && (
                <p className="text-red-500 text-center text-sm mb-2">
                    Offline Mode: showing cached data
                </p>
            )}

            {/* Department Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {departmentData.map((dept, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-xl shadow p-4 flex flex-col justify-between"
                    >
                        <h2 className="text-lg font-semibold mb-2">{dept.department}</h2>
                        <p className="text-gray-700 text-sm">Total Issues: {dept.issues}</p>
                        <p className="text-gray-700 text-sm">Resolved: {dept.resolved}</p>
                        <p className="text-gray-700 text-sm">In Progress: {dept.inProgress}</p>
                        <p className="text-gray-700 text-sm">New: {dept.new}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Department-wise Bar Chart */}
                <div className="bg-white p-4 rounded-xl shadow">
                    <h2 className="text-xl font-semibold mb-4 text-center">Issues by Department</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentData}>
                            <XAxis dataKey="department" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="issues" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="bg-white p-4 rounded-xl shadow">
                    <h2 className="text-xl font-semibold mb-4 text-center">Status Distribution</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DepartmentAnalysis;
