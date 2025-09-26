import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from "recharts";

const COLORS = ["#FF4C4C", "#FFB74D", "#4CAF50"];

const DepartmentalAnalysisPage = () => {
    const { deptName } = useParams();
    const navigate = useNavigate();
    const department = localStorage.getItem("department");

    const [statusData, setStatusData] = useState([]);
    const [priorityData, setPriorityData] = useState([]);
    const [monthlyProgress, setMonthlyProgress] = useState([]);
    const [avgResolution, setAvgResolution] = useState(0);

    useEffect(() => {
        if (department !== "ALL") {
            navigate("/dashboard");
            return;
        }

        // TODO: Replace with API fetch
        setStatusData([
            { status: "New", count: 12 },
            { status: "In Progress", count: 8 },
            { status: "Resolved", count: 20 },
        ]);
        setPriorityData([
            { name: "High", value: 10 },
            { name: "Medium", value: 15 },
            { name: "Low", value: 15 },
        ]);
        setMonthlyProgress([
            { month: "Jan", resolved: 5 },
            { month: "Feb", resolved: 10 },
            { month: "Mar", resolved: 8 },
            { month: "Apr", resolved: 15 },
        ]);
        setAvgResolution(36); // example: 36 hours
    }, [department, navigate]);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            {department === "ALL" && (
                <>
                    {/* Navbar */}
                    <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-lg">
                        <h1 className="text-2xl font-bold">Department: {deptName}</h1>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-2">Average Issue Resolve Time</h2>
                            <p className="text-3xl font-bold">{avgResolution} hrs</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-2">Total Issues</h2>
                            <p className="text-3xl font-bold">
                                {statusData.reduce((sum, i) => sum + i.count, 0)}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-2">Resolved This Month</h2>
                            <p className="text-3xl font-bold">
                                {monthlyProgress[monthlyProgress.length - 1]?.resolved || 0}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-4">Report Status Count</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={statusData}>
                                    <XAxis dataKey="status" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-4">Report Priority Distribution</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg md:col-span-2">
                            <h2 className="text-xl font-semibold mb-4">Monthly Resolved Issues</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyProgress}>
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="resolved" stroke="#82ca9d" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DepartmentalAnalysisPage;
