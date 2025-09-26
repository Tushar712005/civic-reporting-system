import React, { useState, useEffect } from "react";
import db from "./db"; // ✅ added

function ReportIssue() {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [mobile, setMobile] = useState("");
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState("");
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // ✅ new: store the report details for receipt
    const [receiptData, setReceiptData] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) =>
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }),
                (err) => setLocationError(`Error getting location: ${err.message}`)
            );
        } else {
            setLocationError("Geolocation is not supported by this browser.");
        }
    }, []);

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    // ✅ new: download receipt as a text file
    const handleDownloadReceipt = () => {
        if (!receiptData) return;
        const { title, category, mobile, latitude, longitude, timestamp } = receiptData;

        const text = `Civic Report Receipt
--------------------------
Title: ${title}
Category: ${category}
Mobile: ${mobile}
Latitude: ${latitude}
Longitude: ${longitude}
Submitted At: ${timestamp}
--------------------------
Thank you for your submission.`;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ReportReceipt_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!location) {
            setError("Location is required. Please allow location access.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        // Prepare form data
        const formData = new FormData();
        formData.append("title", title);
        formData.append("category", category);
        formData.append("mobile", mobile);
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);
        if (photo) formData.append("photo", photo);

        // Timestamp for receipt
        const timestamp = new Date().toISOString();

        try {
            if (navigator.onLine) {
                // ✅ Online → send to backend immediately
                const response = await fetch("http://localhost:5000/api/issues", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error("Network response was not ok");
                setSuccess(true);
            } else {
                // ✅ Offline → save to IndexedDB
                await db.pendingReports.add({
                    title,
                    category,
                    mobile,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    photo, // just store File object reference
                    createdAt: timestamp,
                });
                setSuccess(true);
                console.log("Saved report locally for later sync.");
            }

            // ✅ Save receipt data
            setReceiptData({
                title,
                category,
                mobile,
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp,
            });

            // Reset form
            setTitle("");
            setCategory("");
            setMobile("");
            setPhoto(null);
            setPhotoPreview("");
            setTimeout(() => setSuccess(false), 5000); // hide after 5 sec
        } catch (err) {
            console.error("Failed to submit report:", err);
            setError("Failed to submit report. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
                {/* Form Heading */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Report a Civic Issue</h1>
                    <p className="text-gray-500 mt-2">
                        Help improve your community by reporting issues.
                    </p>
                    {!navigator.onLine && (
                        <p className="text-red-500 mt-1 text-sm font-medium">
                            Offline Mode: Report will sync later
                        </p>
                    )}
                </div>

                {/* Form */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Issue Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Large Pothole on Main St"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">-- Select a Category --</option>
                            <option value="road">Road</option>
                            <option value="electricity">Electricity</option>
                            <option value="sanitation">Sanitation</option>
                            <option value="water">Water Supply</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    {/* Mobile */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            placeholder="Enter your mobile number"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <div className="flex items-center justify-center w-full p-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                            {location && (
                                <p className="text-green-600 text-sm font-medium">
                                    Location captured successfully!
                                </p>
                            )}
                            {locationError && (
                                <p className="text-red-600 text-sm">{locationError}</p>
                            )}
                            {!location && !locationError && (
                                <p className="text-gray-500 text-sm">Detecting location...</p>
                            )}
                        </div>
                    </div>

                    {/* Photo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Upload Photo
                        </label>
                        <div className="mt-1 flex items-center space-x-4">
                            <div className="flex-shrink-0 h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="h-full w-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <span className="text-gray-400">📷</span>
                                )}
                            </div>
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm"
                            >
                                <span>Select file</span>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </label>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !location}
                            className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </form>

                {success && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-center">
                        Report submitted successfully!
                        {/* ✅ Download receipt button */}
                        {receiptData && (
                            <button
                                onClick={handleDownloadReceipt}
                                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Download Receipt
                            </button>
                        )}
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

export default ReportIssue;
