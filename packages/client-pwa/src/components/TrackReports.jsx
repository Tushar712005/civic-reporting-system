import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import db from "./db"; // ✅ added

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

// Subscribe user for push
async function subscribeUser(mobile) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("Push not supported in this browser");
        return;
    }

    try {
        // Register service worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service worker registered");

        // Get VAPID key from backend
        const res = await fetch("http://localhost:5000/api/vapidPublicKey");
        const vapidPublicKey = await res.text();

        // Ask user permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.log("❌ Notification permission denied");
            return;
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Send subscription to backend
        await fetch("http://localhost:5000/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobile, subscription }),
        });

        console.log("✅ Push subscription sent to backend");
    } catch (err) {
        console.error("Push subscription failed:", err);
    }
}

function TrackReports() {
    const [mobile, setMobile] = useState("");
    const [reports, setReports] = useState([]);
    const [error, setError] = useState("");
    const socketRef = useRef(null);

    // ✅ Setup socket once (online only)
    useEffect(() => {
        if (navigator.onLine) {
            socketRef.current = io("http://localhost:5000", { transports: ["websocket"] });

            socketRef.current.on("connect", () => {
                console.log("Connected to socket:", socketRef.current.id);
            });

            socketRef.current.on("statusUpdate", (data) => {
                console.log("Status update received:", data);
                setReports((prev) =>
                    prev.map((r) => (r.id === data.id ? { ...r, status: data.status } : r))
                );

                toast.info(`📢 "${data.title}" is now ${data.status}`, {
                    position: "top-right",
                    autoClose: 4000,
                    newestOnTop: true,
                });
            });
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // ✅ Register mobile with socket + push (online only)
    useEffect(() => {
        if (navigator.onLine && socketRef.current && mobile) {
            socketRef.current.emit("register", mobile);
            subscribeUser(mobile); // 🔔 Push setup
            console.log("Registered mobile:", mobile);
        }
    }, [mobile]);

    // ✅ Manual fetch with offline support
    const handleTrack = async () => {
        if (!mobile) {
            setError("Please enter your mobile number to track reports.");
            setReports([]);
            return;
        }
        setError("");

        try {
            if (navigator.onLine) {
                const res = await fetch(
                    `http://localhost:5000/api/issues/track?mobile=${mobile}`
                );
                if (!res.ok) throw new Error("Failed to fetch reports");
                const data = await res.json();
                setReports(data);

                // Save to IndexedDB for offline use
                await db.cachedIssues.clear();
                await db.cachedIssues.bulkAdd(data);
            } else {
                // Offline → load cached reports
                const cached = await db.cachedIssues.toArray();
                setReports(cached);
                console.log("Loaded tracked reports from local cache.");
            }
        } catch (err) {
            console.error(err);
            setError("Error fetching reports. Please try again.");
            setReports([]);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Pending":
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
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                    Track Your Reports
                </h2>

                {!navigator.onLine && (
                    <p className="text-red-500 text-sm mb-2 text-center">
                        Offline Mode: showing cached reports
                    </p>
                )}

                <input
                    type="tel"
                    placeholder="Enter Mobile Number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                />
                <button
                    onClick={handleTrack}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mb-4"
                >
                    Track Reports
                </button>
                {error && <p className="text-red-600 mb-4">{error}</p>}

                <div className="space-y-4">
                    {reports.length === 0 && !error && (
                        <p className="text-gray-500 text-center">
                            No reports found. Submit a report first.
                        </p>
                    )}

                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
                        >
                            <h3 className="text-lg font-semibold text-gray-800">
                                {report.title}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Department: {report.department}
                            </p>
                            <span
                                className={`mt-2 inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                                    report.status
                                )}`}
                            >
                                {report.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <ToastContainer />
        </div>
    );
}

export default TrackReports;
