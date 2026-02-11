import React, { useState } from "react";
import db from "./db"; // ✅ added

function FeedbackForm({ userReports = [] }) {
    const [selectedReport, setSelectedReport] = useState(null);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedReport) return;

        try {
            if (navigator.onLine) {
                // ✅ Online → send immediately
                const res = await fetch("http://localhost:5000/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reportId: selectedReport, message }),
                });
                if (!res.ok) throw new Error("Failed to submit feedback");
            } else {
                // ✅ Offline → save to IndexedDB for later sync
                await db.pendingFeedback.add({
                    reportId: selectedReport,
                    message,
                    createdAt: new Date().toISOString(),
                });
                console.log("Saved feedback locally for later sync.");
            }

            setSuccess(true);
            setSelectedReport(null);
            setMessage("");
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError("Error submitting feedback. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center p-4">
            <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl p-6 md:p-8 mt-6">
                {/* Heading */}
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Submit Feedback</h1>
                <p className="text-gray-600 mb-6">
                    Provide feedback related to your reported issues. Select an issue first.
                </p>

                {!navigator.onLine && (
                    <p className="text-red-500 text-sm mb-2">
                        Offline Mode: feedback will sync later
                    </p>
                )}

                {/* Report Selection */}
                {userReports.length > 0 ? (
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">
                            Select Report
                        </label>
                        <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                            {userReports.map((r) => (
                                <div
                                    key={r.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition hover:bg-blue-50 ${
                                        selectedReport === r.id
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-gray-300"
                                    }`}
                                    onClick={() => setSelectedReport(r.id)}
                                >
                                    <h3 className="font-semibold text-gray-800">{r.title}</h3>
                                    <p className="text-sm text-gray-500">{r.status}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 mb-4">No reports available to provide feedback.</p>
                )}

                {/* Feedback Textarea */}
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                        Your Feedback
                    </label>
                    <textarea
                        placeholder="Write your feedback here..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
                </div>

                {/* Submit Button */}
                <button
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:bg-gray-400"
                    onClick={handleSubmit}
                    disabled={!selectedReport || !message}
                >
                    Submit Feedback
                </button>

                {/* Success Message */}
                {success && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-center">
                        Feedback submitted successfully!
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FeedbackForm;
